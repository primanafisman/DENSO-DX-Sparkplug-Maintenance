import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {database} from './support-db.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {CATALOG} from '../src/constants/maintenanceCatalog.js';
import {session} from './support.js';
const actor={id:'admin',role:'Admin'},serverNow='2026-10-21T01:00:00.000Z';
function update(id,patch={}){const d=CATALOG.find(d=>d.id===id);return {name:d.name,standard_text:d.standard_text,method_text:d.method_text,tool:d.tool,unit:d.unit,limits:d.limits,intervals:d.intervals,triggers:d.triggers,review_reason:'Metode direvisi',...patch};}

test('definition changes validate numeric requirements, samples and cadence together',async()=>{
  const {repo,close}=await database(),service=createMaintenanceService({repositories:repo,clock:()=>Date.parse(serverNow)});
  try{
    await assert.rejects(service.updateDefinition('packing_depth_tool',update('packing_depth_tool',{kind:'numeric',input_method:'photo'}),actor),e=>e.code==='STANDARD_REQUIRED');
    await assert.rejects(service.updateDefinition('chart_ee_length',update('chart_ee_length',{samples:[{id:'n1',label:'one'},{id:'n1',label:'two'}]}),actor),/fields|sample/i);
    await assert.rejects(service.updateDefinition('master_packing',update('master_packing',{occurrence_rule:{slot_ids:['day-0745']}}),actor),/week|fields/i);
    await assert.rejects(service.updateDefinition('chart_ee_length',update('chart_ee_length',{occurrence_rule:{slot_ids:['unknown']}}),actor),/fields|slot/i);
    const changed=await service.updateDefinition('chart_ee_length',update('chart_ee_length',{samples:[{id:'n1',label:'Satu'}],kind:'numeric',input_method:'photo'}),actor);
    assert.equal(changed.sample_count,1);assert.equal(changed.definition_version,2);
    assert.deepEqual(changed.interval_guide,CATALOG.find(d=>d.id==='chart_ee_length').interval_guide);
    const difference=CATALOG.find(d=>d.kind==='difference');
    assert.equal((await service.updateDefinition(difference.id,update(difference.id),actor)).input_method,'photo_difference');
  }finally{await close();}
});

test('unused definition versions and settings changes have immutable revisions with effective time',async()=>{
  const {repo,close}=await database(),service=createMaintenanceService({repositories:repo,clock:()=>Date.parse(serverNow)});
  try{
    await service.updateDefinition('chart_ee_length',update('chart_ee_length',{limits:{minimum:4.3,maximum:4.7}}),actor);
    await service.updateDefinition('chart_ee_length',update('chart_ee_length',{limits:{minimum:4.2,maximum:4.8}}),actor);
    const revisions=await service.definitionRevisions('chart_ee_length',{limit:25});
    assert.deepEqual(revisions.items.map(r=>r.version).sort(),[1,2,3]);
    assert.equal(revisions.items.find(r=>r.version===1).value.limits.minimum,4.4);
    assert.equal(revisions.items.find(r=>r.version===3).effective_at,serverNow);
    const settings={lines:['17'],allowed_samplers:['Ldr'],night_rollover_hour:12,product_types:[{id:'u',code:'U',name:'U-Type',active:true}]};
    await service.updateSettings(settings,actor);await service.updateSettings({lines:['18'],allowed_samplers:['Ldr'],night_rollover_hour:12},actor);
    assert.equal((await service.getSettings()).product_types[0].name,'U-Type');
    assert.equal((await repo.revisions.list({entity_id:'maintenance-settings',limit:25})).items.length,2);
  }finally{await close();}
});

test('definition revision endpoints require Admin role',async()=>{
  const {app,token}=await session();
  // The minimal session repository has no revisions; permission is checked before service access.
  const {userRepo}=await import('./helpers.js');const {createApp}=await import('../src/app.js');const {config}=await import('./helpers.js');const {cvDouble}=await import('./support.js');
  for(const role of ['Viewer','Operator']){
    const repos=await userRepo(role);const other=createApp({config,repositories:repos,cvClient:cvDouble()});
    const {password}=await import('./helpers.js');const login=await request(other).post('/api/v1/auth/token').send({username:'001',password});
    const auth='Bearer '+login.body.data.access_token;
    assert.equal((await request(other).get('/api/v1/maintenance/definitions/chart_ee_length/revisions').set('Authorization',auth)).status,403);
    assert.equal((await request(other).put('/api/v1/maintenance/definitions/chart_ee_length').set('Authorization',auth).send(update('chart_ee_length'))).status,403);
  }
  assert.ok(app&&token);
});
