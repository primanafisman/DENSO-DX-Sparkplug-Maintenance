import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {database} from './support-db.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {createReportService} from '../src/services/reportService.js';
import {createApp} from '../src/app.js';
import {config,password,userRepo} from './helpers.js';
import {cvDouble} from './support.js';
import {addReportRecord,reportScope,reportClock} from './fixtures/reporting.js';

test('soft-deleted records disappear from history report summary and SPC without removing evidence or snapshots',async()=>{
  const {repo,close}=await database(),actor={id:'admin'};
  try{
    const original=await addReportRecord(repo,{id:'delete-me'});await addReportRecord(repo,{id:'keep-me'});
    await repo.calibrations.create({id:'calibration',instrument_id:'g1',engine_snapshot:{marker:'preserved'}});
    const service=createMaintenanceService({repositories:repo,clock:reportClock}),reports=createReportService({repositories:repo,clock:reportClock});
    assert.deepEqual(await service.deleteRecord(original.id,actor),{id:original.id,deleted:true});
    const stored=await repo.maintenance.getRecord(original.id);
    assert.equal(stored.deleted_by,actor.id);assert.equal(stored.deleted_at,new Date(reportClock()).toISOString());
    assert.deepEqual(stored.definition_snapshot,original.definition_snapshot);assert.deepEqual(stored.outcomes,original.outcomes);
    assert.ok(await repo.readings.get('delete-me-0'));assert.equal((await repo.calibrations.get('calibration')).engine_snapshot.marker,'preserved');
    assert.deepEqual((await service.list({limit:1})).items.map(r=>r.id),['keep-me']);
    assert.equal((await reports.summary({month:'2026-10'})).total,1);
    assert.equal((await reports.checksheet(reportScope)).rows[0].cells[0].count,1);
    assert.equal((await reports.spc(reportScope)).cohorts[0].counts.complete,1);
    assert.deepEqual(await service.deleteRecord(original.id,{id:'other-admin'}),{id:original.id,deleted:true});
    assert.equal((await repo.maintenance.getRecord(original.id)).deleted_by,actor.id);
    await assert.rejects(service.deleteRecord('missing',actor),e=>e.code==='MAINTENANCE_NOT_FOUND');
  }finally{await close();}
});

test('deleted completion returns the current check to the pending queue and history fills pages past deleted rows',async()=>{
  const {repo,close}=await database(),clock=()=>Date.parse('2026-10-21T01:00:00Z'),service=createMaintenanceService({repositories:repo,clock}),actor={id:'admin'};
  try{
    const schedule=await service.schedule(),context={line:'1',sampler:'Ldr',shift:schedule.shift,production_date:schedule.production_date};
    const record=await service.createRecord({definition_id:'packing_depth_tool',definition_version:1,context,checked_at:new Date(clock()).toISOString(),interval:'per_shift',trigger:'start_process',observations:[{sample_id:'check',status:'OK'}]},actor);
    const state=async()=>(await service.due({line:'1'})).items.find(d=>d.definition_id==='packing_depth_tool').state;
    assert.equal(await state(),'completed');await service.deleteRecord(record.id,actor);assert.equal(await state(),'pending');
    for(let n=0;n<5;n++)await repo.maintenance.createRecord({id:'r'+n,created_at:'2026-10-20T00:00:0'+n+'Z',...(n%2?{}:{deleted_at:new Date(clock()).toISOString()})});
    const first=await service.list({limit:1});assert.equal(first.items[0].id,'r3');assert.ok(first.next_cursor);
    const second=await service.list({limit:1,cursor:first.next_cursor});assert.equal(second.items[0].id,'r1');assert.equal(second.next_cursor,null);
  }finally{await close();}
});

test('maintenance delete endpoint requires Admin and cookie CSRF; repeated deletion is safe',async()=>{
  const {repo,close}=await database();
  try{
    await addReportRecord(repo,{id:'delete-me'});
    const make=async role=>{const app=createApp({config,repositories:{...repo,...await userRepo(role)},cvClient:cvDouble()});const auth=await request(app).post('/api/v1/auth/token').send({username:'001',password});return {app,token:auth.body.data.access_token};};
    const {app,token}=await make('Admin');
    await request(app).delete('/api/v1/maintenance/records/delete-me').expect(401);
    const operator=await make('Operator');await request(operator.app).delete('/api/v1/maintenance/records/delete-me').set('Authorization','Bearer '+operator.token).expect(403);
    const session=request.agent(app);await session.post('/api/v1/auth/login').send({username:'001',password}).expect(200);await session.delete('/api/v1/maintenance/records/delete-me').expect(403);
    for(let n=0;n<2;n++){const result=await request(app).delete('/api/v1/maintenance/records/delete-me').set('Authorization','Bearer '+token).expect(200);assert.deepEqual(result.body.data,{id:'delete-me',deleted:true});}
  }finally{await close();}
});
