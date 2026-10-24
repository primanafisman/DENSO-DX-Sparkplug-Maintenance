import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support-db.js';
import {context,profile} from './support.js';
import {createInstrumentService} from '../src/services/instrumentService.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {createReportService} from '../src/services/reportService.js';

const actor={id:'admin',role:'Admin'},limits={minimum:.35,maximum:.45};
const instrumentBody={name:'Lowering pressure',condition:'working',profile,maintenance_check_ids:[]};
const checkBody={name:'Pressure test',standard_text:'Reviewed inspection standard',method_text:'Photo and confirm',tool:'Gauge',kind:'numeric',input_method:'photo',unit:'MPa',limits:{minimum:.1,maximum:.9},intervals:['per_shift'],triggers:['routine'],shifts:['day','night'],samples:[{id:'n1',label:'Sample1'}],review_reason:'Test configuration'};
async function prepare(patch={}){
  const databaseHandle=await database(),{repo}=databaseHandle;
  const maintenance=createMaintenanceService({repositories:repo,clock:()=>Date.now()});
  const definition=await maintenance.createDefinition({...checkBody,...patch},actor);
  const instrument=await repo.instruments.create({id:'pressure',...instrumentBody,active:true,revision:1,acceptance_limits:limits,maintenance_check_ids:[definition.id]});
  const input={definition_id:definition.id,context,interval:'per_shift',trigger:'routine',checked_at:'2026-10-14T01:00:00Z'};
  async function reading(id,value,snapshot=instrument){
    const observations=[];
    for(const [index,sample] of definition.samples.entries()){
      const key=id+'-'+index;
      await repo.readings.createConfirmed({id:key,analysis_id:key,confirmation_id:key,evidence_key:key,instrument_id:instrument.id,instrument_snapshot:structuredClone(snapshot),profile_snapshot:profile,final_value:String(Array.isArray(value)?value[index]:value),context,check_id:definition.id,sample_key:sample.id,confirmed_at:'2026-10-14T01:00:00Z',evidence:{source_hash:key}});
      observations.push({sample_id:sample.id,reading_id:key});
    }
    return maintenance.createRecord({...input,observations},actor);
  }
  return {...databaseHandle,maintenance,instrument,definition,input,reading};
}

test('equipment-specific acceptance is inclusive and overrides the inspection standard',async()=>{
  const {reading,close}=await prepare();
  try{
    for(const [value,status] of [[.349,'NG'],[.350,'OK'],[.450,'OK'],[.451,'NG']]){
      const saved=await reading('reading-'+value,value);
      assert.equal(saved.overall_status,status);
      assert.deepEqual(saved.outcomes[0].acceptance_limits,limits);
      assert.equal(saved.outcomes[0].acceptance_source,'equipment');
    }
  }finally{await close();}
});

test('SPC uses frozen equipment criteria, separates changed criteria and keeps one-sided capability open',async()=>{
  const {repo,instrument,definition,reading,close}=await prepare({samples:[1,2,3,4].map(n=>({id:'n'+n,label:'Sample'+n}))});
  try{
    await reading('both',[.38,.39,.4,.41]);
    await reading('one-sided',[.4,.42,.43,.44],{...instrument,acceptance_limits:{minimum:null,maximum:.45}});
    const report=await createReportService({repositories:repo,clock:()=>Date.now()}).spc({production_date_from:'2026-10-01',production_date_to:'2026-10-21',definition_id:definition.id});
    assert.equal(report.cohorts.length,2);
    const both=report.cohorts.find(cohort=>cohort.acceptance_limits?.minimum===.35);
    assert.ok(both);assert.equal(both.acceptance_source,'equipment');
    assert.deepEqual(both.definition_snapshot.limits,{minimum:.1,maximum:.9});
    assert.ok(Math.abs(both.capability.cp-.1/(6*both.statistics.s_overall))<1e-10);
    const one=report.cohorts.find(cohort=>cohort.acceptance_limits?.minimum===null);
    assert.ok(one);assert.equal(one.capability.cp,null);assert.equal(one.capability.reason,'ONE_SIDED_SPECIFICATION');
    const sheet=await createReportService({repositories:repo,clock:()=>Date.now()}).checksheet({production_date_from:'2026-10-01',production_date_to:'2026-10-21',definition_id:definition.id});
    assert.ok(sheet.rows.some(row=>row.standard.minimum===.35&&row.standard.maximum===.45));
  }finally{await close();}
});

test('difference checks judge the derived value and reject changed criteria between before and after',async()=>{
  const {repo,maintenance,instrument,definition,input,close}=await prepare({kind:'difference',input_method:'photo_difference'});
  try{
    const observation={sample_id:'n1',before_reading_id:'before',after_reading_id:'after'};
    for(const [id,value,stage] of [['before',.1,'before'],['after',.5,'after']])
      await repo.readings.createConfirmed({id,analysis_id:id,confirmation_id:id,evidence_key:id,instrument_id:instrument.id,instrument_snapshot:instrument,profile_snapshot:profile,final_value:String(value),context,check_id:definition.id,sample_key:'n1:'+stage,confirmed_at:'2026-10-14T01:00:00Z',evidence:{source_hash:id}});
    assert.equal((await maintenance.createRecord({...input,observations:[observation]},actor)).overall_status,'OK');
    await repo.readings.createConfirmed({id:'changed-after',analysis_id:'changed-after',confirmation_id:'changed-after',evidence_key:'changed-after',instrument_id:instrument.id,instrument_snapshot:{...instrument,acceptance_limits:{minimum:.4,maximum:.6}},profile_snapshot:profile,final_value:'.5',context,check_id:definition.id,sample_key:'n1:after',confirmed_at:'2026-10-14T01:00:00Z',evidence:{source_hash:'changed-after'}});
    await assert.rejects(maintenance.createRecord({...input,observations:[{...observation,after_reading_id:'changed-after'}]},actor),error=>error.code==='ACCEPTANCE_SNAPSHOT_CONFLICT');
  }finally{await close();}
});

test('confirmed equipment acceptance remains frozen when the master is edited before maintenance save',async()=>{
  const {repo,instrument,reading,close}=await prepare();
  try{
    await repo.instruments.update(instrument.id,{acceptance_limits:{minimum:.5,maximum:.6},revision:2});
    const saved=await reading('snapshot',.4);
    assert.equal(saved.overall_status,'OK');
    assert.deepEqual(saved.outcomes[0].acceptance_limits,limits);
    assert.deepEqual(saved.instrument_snapshot.acceptance_limits,limits);
    assert.deepEqual(saved.definition_snapshot.limits,{minimum:.1,maximum:.9});
    await repo.instruments.update(instrument.id,{acceptance_limits:{minimum:.7,maximum:.8},revision:3});
    assert.deepEqual((await repo.maintenance.getRecord(saved.id)).outcomes[0].acceptance_limits,limits);
  }finally{await close();}
});

test('legacy confirmed snapshots fall back to the inspection limits instead of the current tool limits',async()=>{
  const {instrument,reading,close}=await prepare();
  try{
    const legacy=structuredClone(instrument);delete legacy.acceptance_limits;
    const saved=await reading('legacy',.2,legacy);
    assert.equal(saved.overall_status,'OK');
    assert.deepEqual(saved.outcomes[0].acceptance_limits,{minimum:.1,maximum:.9});
    assert.equal(saved.outcomes[0].acceptance_source,'inspection');
  }finally{await close();}
});

test('a one-sided equipment limit preserves the open bound',async()=>{
  const {instrument,reading,close}=await prepare();
  try{
    const snapshot={...instrument,acceptance_limits:{minimum:null,maximum:.45}};
    assert.equal((await reading('open-low',.2,snapshot)).overall_status,'OK');
    assert.equal((await reading('open-high',.451,snapshot)).overall_status,'NG');
  }finally{await close();}
});

test('equipment acceptance validates finite ordered bounds within the physical profile and rejects visual criteria',async()=>{
  const {repo,close}=await database(),service=createInstrumentService({repositories:repo,clock:()=>Date.now()});
  try{
    const saved=await service.create({...instrumentBody,acceptance_limits:limits},actor);
    assert.deepEqual(saved.acceptance_limits,limits);
    for(const acceptance_limits of [{minimum:null,maximum:null},{minimum:.5,maximum:.4},{minimum:-.1,maximum:.4},{minimum:.2,maximum:1.1},{minimum:Infinity,maximum:1}])
      await assert.rejects(service.create({...instrumentBody,acceptance_limits},actor),error=>error.code==='VALIDATION_ERROR');
    await assert.rejects(service.create({...instrumentBody,measurement_mode:'visual',profile:null,acceptance_limits:limits},actor),error=>error.code==='VALIDATION_ERROR');
    await assert.rejects(service.update(saved.id,{...instrumentBody,profile:{...profile,maximum:.4}},actor),error=>error.code==='VALIDATION_ERROR');
    assert.equal((await service.update(saved.id,{...instrumentBody,acceptance_limits:null},actor)).acceptance_limits,null);
  }finally{await close();}
});
