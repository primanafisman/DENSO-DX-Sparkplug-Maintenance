import test from 'node:test';import assert from 'node:assert/strict';
import {database} from './support-db.js';import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {maintenanceOccurrence,createMaintenanceDueService} from '../src/services/maintenanceDueService.js';
const at=s=>Date.parse(s+'+07:00'),actor={id:'u'};
test('machine checks are due by line while product sample checks are due separately for each Type',async()=>{
 const now=at('2026-10-21T08:00:00'),base={definition_version:1,intervals:['per_shift'],shifts:['day','night'],samples:[{id:'check'}],input_method:'ok_ng'};
 const defs=[{...base,id:'machine',inspection_target:'machine'},{...base,id:'product',inspection_target:'product'}];
 const records=defs.map(d=>({definition_id:d.id,definition_version:1,context:{product_type_id:'u'},checked_at:new Date(now).toISOString(),saved_at:new Date(now).toISOString(),overall_status:'OK',outcomes:[{sample_id:'check',status:'OK'}]}));
 const due=createMaintenanceDueService({repositories:{maintenance:{listRecordsRange:async()=>({items:records,next_cursor:null})}},clock:()=>now},{all:async()=>defs},async()=>({lines:['1'],night_rollover_hour:7,product_types:[{id:'u',active:true},{id:'v',active:true}]}));
 assert.deepEqual((await due({line:'1',product_type_id:'v'})).items.map(d=>d.state),['completed','pending']);
 assert.deepEqual((await due({line:'1',product_type_id:'u'})).items.map(d=>d.state),['completed','completed']);
});
test('completed per-shift checks hide by line, include NG, survive midday/midnight and return next shift',async()=>{
 const {repo,close}=await database();let now=at('2026-10-21T08:00:00');const service=createMaintenanceService({repositories:repo,clock:()=>now});
 const state=async(line='1')=>(await service.due({line})).items.find(i=>i.definition_id==='packing_depth_tool');
 async function save(){const schedule=await service.schedule();return service.createRecord({definition_id:'packing_depth_tool',definition_version:1,context:{line:'1',sampler:'Ldr',shift:schedule.shift,production_date:schedule.production_date},interval:'per_shift',trigger:'start_process',checked_at:new Date(now).toISOString(),observations:[{sample_id:'check',status:'NG'}]},actor);}
 try{assert.equal((await state()).state,'pending');const record=await save();assert.equal((await state()).completed_record_id,record.id);assert.equal((await state('2')).state,'pending');now=at('2026-10-21T12:45:00');assert.equal((await state()).state,'completed');now=at('2026-10-21T21:15:00');assert.equal((await state()).state,'pending');await save();now=at('2026-10-22T01:15:00');assert.equal((await state()).state,'completed');now=at('2026-10-22T07:45:00');assert.equal((await state()).state,'pending');}finally{await close();}
});
test('photos alone, incomplete/future records and old definition versions cannot mark a check complete',async()=>{
 const {repo,close}=await database(),now=at('2026-10-21T08:00:00'),service=createMaintenanceService({repositories:repo,clock:()=>now});
 try{const def=(await service.catalog()).items.find(d=>d.id==='packing_depth_tool'),base={definition_id:def.id,definition_version:1,definition_snapshot:def,context:{line:'1',sampler:'Other',shift:'day',production_date:'2026-10-21'},interval:'per_shift',trigger:'start_process',checked_at:new Date(now).toISOString(),saved_at:new Date(now).toISOString(),created_at:new Date(now).toISOString(),overall_status:'OK'};
 await repo.maintenance.createRecord({...base,outcomes:[]});await repo.maintenance.createRecord({...base,outcomes:[{sample_id:'check',status:'OK'}],checked_at:new Date(now+3600000).toISOString()});
 const state=async()=>(await service.due({line:'1'})).items.find(i=>i.definition_id===def.id);assert.equal((await state()).state,'pending');
 await repo.maintenance.createRecord({...base,outcomes:[{sample_id:'check',status:'OK'}]});assert.equal((await state()).state,'completed');
 await repo.maintenance.createDefinition({...def,definition_version:2});assert.equal((await state()).state,'pending');
 }finally{await close();}
});
test('occurrences honor explicit slots/weekdays, daily dates, weekly year boundaries and scheduled-session defaults',()=>{
 const base={id:'d',definition_version:1,intervals:['per_shift'],shifts:['day','night']},o=(d,t)=>maintenanceOccurrence({...base,...d},at(t),{});
 assert.equal(o({occurrence_rule:{slot_ids:['day-0745','day-1245']}},'2026-10-21T12:44:59').key,o({occurrence_rule:{slot_ids:['day-0745','day-1245']}},'2026-10-21T08:00:00').key);
 assert.notEqual(o({occurrence_rule:{slot_ids:['day-0745','day-1245']}},'2026-10-21T12:45:00').key,o({occurrence_rule:{slot_ids:['day-0745','day-1245']}},'2026-10-21T08:00:00').key);
 assert.equal(o({intervals:['weekly']},'2026-12-31T08:00:00').key,o({intervals:['weekly']},'2027-01-01T08:00:00').key);
 assert.notEqual(o({intervals:['weekly']},'2027-01-04T08:00:00').key,o({intervals:['weekly']},'2027-01-01T08:00:00').key);
 const weekly=o({intervals:['weekly'],occurrence_rule:{slot_ids:['day-0745'],weekdays:[1]}},'2026-10-21T08:00:00');assert.equal(weekly.starts_at,'2026-10-19T00:45:00.000Z');
 assert.equal(o({intervals:['daily']},'2026-10-22T01:15:00').key,o({intervals:['daily']},'2026-10-21T08:00:00').key);
 assert.notEqual(o({intervals:['every_4_hours']},'2026-10-21T12:45:00').key,o({intervals:['every_4_hours']},'2026-10-21T08:00:00').key);
});
