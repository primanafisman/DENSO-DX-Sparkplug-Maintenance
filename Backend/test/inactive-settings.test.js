import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {settingsInput} from '../src/validations/maintenanceValidation.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {database} from './support-db.js';
import {context} from './support.js';

const actor={id:'admin'},base={lines:['17'],allowed_samplers:['Ldr'],night_rollover_hour:12};
const recordInput={definition_id:'packing_depth_tool',context,interval:'per_shift',trigger:'start_process',checked_at:'2026-10-14T01:00:00Z',observations:[{sample_id:'check',status:'OK'}]};
const names=(prefix,count)=>Array.from({length:count},(_,index)=>prefix+index);

test('settings accept trimmed inactive choices and empty active lists without changing legacy inputs',()=>{
  assert.equal(settingsInput.safeParse(base).success,true);
  const parsed=settingsInput.parse({...base,lines:[],allowed_samplers:[],inactive_lines:[' Assembly A '],inactive_samplers:[' Supervisor ']});
  assert.deepEqual(parsed.inactive_lines,['Assembly A']);assert.deepEqual(parsed.inactive_samplers,['Supervisor']);
  assert.deepEqual(parsed.lines,[]);assert.deepEqual(parsed.allowed_samplers,[]);
  assert.equal(settingsInput.safeParse({...base,unexpected:[]}).success,false);
});

test('active and inactive category names are case-insensitively unique within combined limits',()=>{
  for(const [active,inactive,maximum] of [['lines','inactive_lines',200],['allowed_samplers','inactive_samplers',100]]){
    assert.equal(settingsInput.safeParse({...base,[active]:names('A',maximum-1),[inactive]:['Inactive']}).success,true);
    assert.equal(settingsInput.safeParse({...base,[active]:names('A',maximum),[inactive]:['Inactive']}).success,false);
    assert.equal(settingsInput.safeParse({...base,[active]:[],[inactive]:names('A',maximum)}).success,true);
    assert.equal(settingsInput.safeParse({...base,[active]:[],[inactive]:names('A',maximum+1)}).success,false);
    for(const choices of [{[active]:['Assembly A','assembly a'],[inactive]:[]},{[active]:['Assembly A'],[inactive]:[' assembly a ']},{[active]:[],[inactive]:['Assembly A','assembly a']},{[active]:[],[inactive]:['']},{[active]:[],[inactive]:['x'.repeat(65)]}])assert.equal(settingsInput.safeParse({...base,...choices}).success,false);
  }
});

test('legacy settings updates preserve inactive choices and validate them before any write',async()=>{
  const {repo,close}=await database();
  try{
    const service=createMaintenanceService({repositories:repo,clock:()=>Date.parse('2026-10-14T02:00:00Z')});
    await service.updateSettings({...base,inactive_lines:['Assembly A'],inactive_samplers:['Supervisor'],product_types:[{id:'old',code:'Old',name:'Old Type',active:false}]},actor);
    const saved=await service.updateSettings({...base,lines:['18']},actor);
    assert.deepEqual(saved.value.inactive_lines,['Assembly A']);assert.deepEqual(saved.value.inactive_samplers,['Supervisor']);
    assert.equal(saved.value.product_types[0].active,false);
    await assert.rejects(service.updateSettings({...base,lines:['assembly a']},actor),error=>error.status===422);
    await assert.rejects(service.updateSettings({...base,allowed_samplers:['SUPERVISOR']},actor),error=>error.status===422);
    assert.equal((await repo.settings.get('maintenance-settings')).version,saved.version);
    await service.updateSettings({...base,lines:[],inactive_lines:names('Line ',200)},actor);
    await assert.rejects(service.updateSettings({...base,lines:['New']},actor),error=>error.status===422);
    const cleared=await service.updateSettings({...base,inactive_lines:[],inactive_samplers:[]},actor);
    assert.deepEqual(cleared.value.inactive_lines,[]);assert.deepEqual(cleared.value.inactive_samplers,[]);
  }finally{await close();}
});

test('inactive Line and Sampler remain settings data but cannot be selected for a new record',async()=>{
  const {repo,close}=await database();
  try{
    const service=createMaintenanceService({repositories:repo,clock:()=>Date.parse('2026-10-14T02:00:00Z')});
    await service.updateSettings(base,actor);
    const record=await service.createRecord(recordInput,actor);
    await service.updateSettings({...base,lines:['Assembly'],allowed_samplers:['Operator'],inactive_lines:['17'],inactive_samplers:['Ldr']},actor);
    const current=await service.getSettings();assert.deepEqual(current.lines,['Assembly']);assert.deepEqual(current.allowed_samplers,['Operator']);
    assert.deepEqual(current.inactive_lines,['17']);assert.deepEqual(current.inactive_samplers,['Ldr']);
    await assert.rejects(service.createRecord(recordInput,actor),error=>error.code==='LINE_INVALID');
    await assert.rejects(service.createRecord({...recordInput,context:{...context,line:'Assembly'}},actor),error=>error.code==='SAMPLER_INVALID');
    assert.deepEqual((await repo.maintenance.getRecord(record.id)).settings_snapshot,record.settings_snapshot);
  }finally{await close();}
});

test('settings OpenAPI exposes optional inactive choice arrays in input and output',async()=>{
  const {components:{schemas}}=JSON.parse(await fs.readFile(new URL('../contracts/openapi.yaml',import.meta.url),'utf8'));
  for(const name of ['SettingsInput','MaintenanceSettings'])for(const [field,limit] of [['inactive_lines',200],['inactive_samplers',100]]){
    assert.equal(schemas[name].properties[field].type,'array');assert.equal(schemas[name].properties[field].maxItems,limit);
    assert.equal(schemas[name].required.includes(field),false);
  }
});
