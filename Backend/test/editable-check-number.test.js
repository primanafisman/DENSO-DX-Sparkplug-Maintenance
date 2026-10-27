import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../src/constants/maintenanceCatalog.js';
import {checkNumber} from '../src/constants/maintenanceOrder.js';
import {definitionCreate,definitionUpdate} from '../src/validations/maintenanceValidation.js';
import {createDefinitionService} from '../src/services/definitionService.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {createReportService} from '../src/services/reportService.js';
import {database} from './support-db.js';
import {context} from './support.js';

const actor={id:'admin'},clock=()=>Date.parse('2026-10-14T02:00:00Z');
const fields=(d=CATALOG[0])=>({name:d.name,standard_text:d.standard_text,method_text:d.method_text,tool:d.tool,unit:d.unit,limits:d.limits,intervals:d.intervals,triggers:d.triggers,review_reason:'Nomor diperbarui admin'});
const createFields=()=>({...fields(),name:'Pemeriksaan tambahan',kind:'visual',input_method:'ok_ng',samples:[{id:'sample',label:'Sampel'}],shifts:['day','night']});

test('configured positive numbers override baseline numbers and invalid number inputs are rejected',()=>{
  assert.equal(checkNumber({...CATALOG[0],check_number:80}),80);
  assert.equal(checkNumber({id:'custom',check_number:3}),3);
  for(const value of [0,-1,1.5,10001,'50',null]){
    assert.equal(definitionCreate.safeParse({...createFields(),check_number:value}).success,false);
    assert.equal(definitionUpdate.safeParse({...fields(),check_number:value}).success,false);
  }
  assert.equal(definitionCreate.safeParse({...createFields(),check_number:10000}).success,true);
  assert.equal(definitionUpdate.safeParse(fields()).success,true);
});

test('admin renumbers baseline definitions and new checks, keeping links and old snapshots',async()=>{
  const {repo,close}=await database();
  try{
    const maintenance=createMaintenanceService({repositories:repo,clock}),definitions=createDefinitionService({repositories:repo,clock}),original=await definitions.get(CATALOG[0].id);
    await repo.instruments.create({id:'equipment',name:'Tool',active:true,maintenance_check_ids:[original.id]});
    const record=await maintenance.createRecord({definition_id:original.id,definition_version:1,context,interval:original.intervals[0],trigger:original.triggers[0],checked_at:'2026-10-14T01:00:00Z',observations:original.samples.map(s=>({sample_id:s.id,status:'OK'}))},actor);
    const updated=await definitions.update(original.id,{...fields(original),check_number:50},actor);
    assert.equal(updated.id,original.id);assert.equal(updated.check_number,50);assert.equal(updated.definition_version,2);
    assert.deepEqual((await repo.instruments.get('equipment')).maintenance_check_ids,[original.id]);
    assert.equal((await definitions.get(original.id)).check_number,50);
    const added=await definitions.create({...createFields(),check_number:1},actor);
    assert.equal(added.check_number,1);
    const automatic=await definitions.create(createFields(),actor);assert.equal(automatic.check_number,51);
    assert.equal((await definitions.update(original.id,fields(updated),actor)).check_number,50);
    const catalog=await definitions.all();assert.equal(new Set(catalog.map(d=>d.check_number)).size,catalog.length);
    assert.deepEqual(catalog.map(d=>d.check_number),catalog.map(d=>d.check_number).sort((a,b)=>a-b));
    const reports=createReportService({repositories:repo,clock}),summary=await reports.summary({month:'2026-10'}),sheet=await reports.checksheet({production_date_from:'2026-10-14',production_date_to:'2026-10-14'});
    assert.equal(summary.groups[0].check_number,50);assert.equal(sheet.rows[0].check_number,50);
    assert.equal(sheet.rows[0].cells[0].occurrences[0].definition_snapshot.check_number,1);
    assert.deepEqual((await repo.maintenance.getRecord(record.id)).definition_snapshot,record.definition_snapshot);
    assert.equal((await definitions.revisions(original.id,{limit:20})).items.find(r=>r.version===1).value.check_number,undefined);
  }finally{await close();}
});

test('numbers already used by active or archived checks fail atomically with useful conflicts',async()=>{
  const {repo,close}=await database();
  try{
    const definitions=createDefinitionService({repositories:repo,clock});
    const existing=await definitions.create({...createFields(),check_number:77},actor);
    await definitions.status(existing.id,{active:false,review_reason:'Diarsipkan'},actor);
    const conflict=error=>error.status===409&&error.code==='CHECK_NUMBER_CONFLICT'&&/77/.test(error.message)&&/Pemeriksaan tambahan/.test(error.message);
    await assert.rejects(definitions.create({...createFields(),check_number:77},actor),conflict);
    await assert.rejects(definitions.update(CATALOG[0].id,{...fields(),check_number:77},actor),conflict);
    await assert.rejects(definitions.create({...createFields(),check_number:2},actor),error=>error.status===409&&error.code==='CHECK_NUMBER_CONFLICT');
    assert.equal((await definitions.get(CATALOG[0].id)).definition_version,1);
    assert.equal(await repo.maintenance.getDefinition(CATALOG[0].id),null);
    assert.equal((await definitions.all()).length,CATALOG.length+1);
  }finally{await close();}
});

test('legacy fallback numbers are protected from new assignments and survive baseline edits',async()=>{
  const {repo,close}=await database();
  try{
    const legacy={...structuredClone(CATALOG[0]),id:'custom-legacy-number',created_at:'2026-10-01T00:00:00Z'};
    await repo.maintenance.createDefinition(legacy);
    await repo.maintenance.createDefinition({...legacy,id:'custom-legacy-second',created_at:'2026-10-02T00:00:00Z'});
    const definitions=createDefinitionService({repositories:repo,clock});
    assert.equal((await definitions.get(legacy.id)).check_number,45);
    await assert.rejects(definitions.update(CATALOG[0].id,{...fields(),check_number:45},actor),error=>error.code==='CHECK_NUMBER_CONFLICT');
    await assert.rejects(definitions.create({...createFields(),check_number:45},actor),error=>error.code==='CHECK_NUMBER_CONFLICT');
    await definitions.update(CATALOG[0].id,{...fields(),check_number:60},actor);
    assert.equal((await definitions.get(legacy.id)).check_number,45);
    const updated=await definitions.update(legacy.id,{...fields(legacy),check_number:1},actor);
    assert.equal(updated.check_number,1);
    assert.equal((await definitions.get('custom-legacy-second')).check_number,46);
    const automatic=await definitions.create(createFields(),actor);assert.equal(automatic.check_number,61);
  }finally{await close();}
});

test('concurrent administrators cannot claim the same inspection number',async()=>{
  const {repo,close}=await database();
  try{
    const first=createDefinitionService({repositories:repo,clock}),second=createDefinitionService({repositories:repo,clock});
    const outcomes=await Promise.allSettled([first.create({...createFields(),check_number:70},actor),second.create({...createFields(),check_number:70},actor)]);
    assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(outcomes.find(result=>result.status==='rejected').reason.code,'CHECK_NUMBER_CONFLICT');
    assert.equal((await first.all()).filter(d=>d.check_number===70).length,1);
  }finally{await close();}
});

test('maximum configured number remains valid and automatic allocation stays in range',async()=>{
  const {repo,close}=await database();
  try{
    const definitions=createDefinitionService({repositories:repo,clock});
    assert.equal((await definitions.create({...createFields(),check_number:10000},actor)).check_number,10000);
    assert.equal((await definitions.create(createFields(),actor)).check_number,45);
    await assert.rejects(definitions.create({...createFields(),check_number:0},actor),error=>error.status===422&&error.code==='CHECK_NUMBER_INVALID');
  }finally{await close();}
});

test('renumbering invalidates checksheet cursors before their offsets can omit or duplicate rows',async()=>{
  const {repo,close}=await database();
  try{
    for(const definition_snapshot of CATALOG.slice(0,2))await repo.maintenance.createRecord({id:'row-'+definition_snapshot.id,definition_snapshot,definition_id:definition_snapshot.id,context,overall_status:'OK',outcomes:[],checked_at:'2026-10-14T01:00:00Z',created_at:new Date(clock()).toISOString()});
    const reports=createReportService({repositories:repo,clock}),scope={production_date_from:'2026-10-14',production_date_to:'2026-10-14'},first=await reports.checksheet(scope,{limit:1});
    assert.ok(first.next_cursor);assert.equal(first.rows[0].check_number,1);
    await createDefinitionService({repositories:repo,clock}).update(CATALOG[0].id,{...fields(),check_number:50},actor);
    await assert.rejects(reports.checksheet(scope,{limit:1,cursor:first.next_cursor}),error=>error.code==='INVALID_CURSOR');
    const refreshed=await reports.checksheet(scope);assert.deepEqual(refreshed.rows.map(row=>row.check_number),[2,50]);
  }finally{await close();}
});
