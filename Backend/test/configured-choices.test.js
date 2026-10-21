import test from 'node:test';import assert from 'node:assert/strict';
import {database} from './support-db.js';import {context} from './support.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
test('fresh settings offer lines1 through17 and Ldr, and explicit empty selections never mean unrestricted entry',async()=>{
 const {repo,close}=await database();const service=createMaintenanceService({repositories:repo,clock:()=>Date.now()});
 try {
  const initial=await service.getSettings();assert.deepEqual(initial.lines,Array.from({length:17},(_,i)=>String(i+1)));assert.deepEqual(initial.allowed_samplers,['Ldr']);
  await assert.rejects(service.updateSettings({lines:['18'],allowed_samplers:['Ldr'],night_rollover_hour:12},{id:'admin'}),e=>e.code==='MAINTENANCE_FIELDS');
  await service.updateSettings({lines:[],allowed_samplers:[],night_rollover_hour:12},{id:'admin'});
  assert.deepEqual((await service.getSettings()).lines,[]);
  await assert.rejects(service.createRecord({definition_id:'packing_depth_tool',context,interval:'per_shift',trigger:'start_process',checked_at:'2026-10-14T01:00:00Z',observations:[{sample_id:'check',status:'OK'}]},{id:'operator'}),e=>e.code==='LINE_INVALID');
 }finally{await close();}
});
