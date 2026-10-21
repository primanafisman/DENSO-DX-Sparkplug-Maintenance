import test from 'node:test';import assert from 'node:assert/strict';
import {database} from './support-db.js';import {profile,context} from './support.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
const body={name:'Pressure B3601',standard_text:'0.40–0.50 MPa',method_text:'Foto gauge lalu verifikasi angka.',tool:'Gauge MPa',kind:'numeric',input_method:'photo',unit:'MPa',limits:{minimum:.4,maximum:.5},intervals:['per_shift'],triggers:['routine'],shifts:['day','night'],samples:[{id:'n1',label:'Sampel1'}],review_reason:'Pemeriksaan tambahan yang ditinjau admin.'};
test('admin creates a custom check linked to equipment and archived checks keep history without reappearing',async()=>{
 const {repo,close}=await database(),service=createMaintenanceService({repositories:repo,clock:()=>Date.now()}),actor={id:'admin'};
 try {
  await repo.instruments.create({id:'g',name:'B3601',revision:1,active:true,profile,maintenance_check_ids:[]});
  const custom=await service.createDefinition({...body,instrument_ids:['g']},actor);
  assert.equal(custom.definition_version,1);assert.equal(custom.active,true);assert.equal((await service.catalog()).count,45);
  assert.ok((await repo.instruments.get('g')).maintenance_check_ids.includes(custom.id));
  await repo.readings.createConfirmed({id:'r',analysis_id:'a',confirmation_id:'c',evidence_key:'e',instrument_id:'g',profile_snapshot:profile,final_value:'0.415',context,check_id:custom.id,sample_key:'n1',confirmed_at:'2026-10-14T01:00:00Z',evidence:{source_hash:'hash'}});
  const input={definition_id:custom.id,definition_version:1,context,interval:'per_shift',trigger:'routine',checked_at:'2026-10-14T01:00:00Z',observations:[{sample_id:'n1',reading_id:'r'}]};
  const saved=await service.createRecord(input,actor);assert.equal(saved.overall_status,'OK');
  await service.setDefinitionStatus(custom.id,{active:false,review_reason:'Tidak lagi dipakai.'},actor);
  assert.equal((await service.catalog()).count,44);assert.equal((await service.catalog({include_inactive:true})).count,45);
  assert.equal((await repo.maintenance.getRecord(saved.id)).definition_snapshot.name,'Pressure B3601');
  await assert.rejects(service.createRecord(input,actor),e=>e.code==='MAINTENANCE_INACTIVE');
  await service.setDefinitionStatus(custom.id,{active:true,review_reason:'Aktifkan kembali.'},actor);
  assert.equal((await service.catalog()).count,45);
 }finally{await close();}
});
test('archiving a built-in overrides its fallback and invalid equipment links roll back custom creation',async()=>{
 const {repo,close}=await database(),service=createMaintenanceService({repositories:repo,clock:()=>Date.now()}),actor={id:'admin'};
 try{
  await service.setDefinitionStatus('packing_depth_tool',{active:false,review_reason:'Tidak aktif.'},actor);
  assert.equal((await service.catalog()).count,43);
  assert.ok(!(await service.catalog()).items.some(d=>d.id==='packing_depth_tool'));
  await assert.rejects(service.createDefinition({...body,instrument_ids:['missing']},actor));
  await assert.rejects(service.createDefinition({...body,shifts:['night'],occurrence_rule:{slot_ids:['day-0745']}},actor),e=>e.code==='SCHEDULE_RULE');
  assert.equal((await service.catalog({include_inactive:true})).count,44);
 }finally{await close();}
});
