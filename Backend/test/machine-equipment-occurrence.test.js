import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {database} from './support-db.js';
import {profile,item,cvDouble} from './support.js';
import {CATALOG} from '../src/constants/maintenanceCatalog.js';
import {createPhotoService} from '../src/services/photoService.js';
import {createReadingService} from '../src/services/readingService.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';

const actor={id:'operator',role:'Operator'},at=stamp=>Date.parse(stamp+'+07:00');
async function fixture(patch={}){
  const {repo,close}=await database(),directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-machine-occurrence-'));
  let now=at('2026-10-21T08:00:00'),sequence=0;
  const definition={...structuredClone(CATALOG.find(d=>d.id==='chart_ee_length')),id:'machine-pressure',definition_version:1,inspection_target:'machine',kind:'numeric',input_method:'photo',unit:'MPa',limits:{minimum:.35,maximum:.45},intervals:['per_shift'],triggers:['routine'],samples:[{id:'n1',label:'Reading'}],sample_count:1,...patch};
  await repo.maintenance.createDefinition(definition);
  await repo.settings.update('maintenance-settings',{value:{lines:['17'],allowed_samplers:['Ldr'],night_rollover_hour:7,product_types:[]}});
  for(const id of ['g1','g2'])await repo.instruments.create({id,name:'MC Lowering '+id.slice(1),instrument_type:'pressure_gauge',active:true,condition:'working',measurement_mode:'numeric',revision:1,profile,maintenance_check_ids:[definition.id]});
  const dependencies={repositories:repo,clock:()=>now,config:{runtimeDir:directory,ttlSeconds:3600},cvClient:cvDouble()},photos=createPhotoService(dependencies),maintenance=createMaintenanceService(dependencies),analyses=new Map();
  const readings=createReadingService(dependencies,{getResult:id=>analyses.get(id)},photos);
  const context=()=>({line:'17',production_date:'2026-10-21',shift:now>=at('2026-10-21T21:15:00')?'night':'day',sampler:'Ldr'});
  async function capture({instrument_id='g1',bytes=Buffer.from('same gauge photo'),source,final_value=.438,sample_key='n1'}={}){
    if(!source){const uploaded=await photos.upload({bytes,mimeType:'image/jpeg',context:context(),actor});source=photos.get(uploaded.image_id,actor);}
    const asset=await repo.instruments.get(instrument_id),analysis_id='analysis-'+(++sequence);
    analyses.set(analysis_id,{submitted:{...item,instrument_id},instrument_snapshot:asset,context:source.context,photo:source,result:{candidate:{value:final_value,unit:'MPa',kind:'digital'},confidence:{valid:true},validated_prediction:final_value}});
    return {input:{analysis_id,instrument_id,instrument_revision:1,final_value,verified:true,identity_verified:true,context:source.context,check_id:definition.id,sample_key,confirmation_id:'confirm-'+sequence},source};
  }
  const confirm=async options=>{const captured=await capture(options);return {...captured,reading:await readings.confirm(captured.input,actor)};};
  const save=(reading,checked_at=new Date(now).toISOString())=>maintenance.createRecord({definition_id:definition.id,definition_version:1,instrument_id:reading.instrument_id,context:reading.context,checked_at,interval:definition.intervals[0],trigger:'routine',observations:[{sample_id:'n1',reading_id:reading.id}]},actor);
  return {repo,definition,photos,readings,maintenance,capture,confirm,save,now:()=>now,setTime:stamp=>{now=at(stamp);},close:async()=>{photos.close();await close();await fs.rm(directory,{recursive:true,force:true});}};
}

test('a reanalyzed machine photo recovers the same orphan reading but a changed review remains a conflict',async()=>{
  const f=await fixture();try{
    const first=await f.confirm(),retry=await f.capture({source:first.source});
    assert.equal((await f.readings.confirm(retry.input,actor)).id,first.reading.id);
    const reuploaded=await f.confirm();assert.equal(reuploaded.reading.id,first.reading.id);
    const changed=await f.capture({source:first.source,final_value:.439});
    await assert.rejects(f.readings.confirm(changed.input,actor),error=>error.code==='EVIDENCE_REVIEW_CONFLICT');
    assert.equal((await f.repo.readings.list({limit:25})).items.length,1);
    assert.equal((await f.repo.maintenance.listRecords({limit:25})).items.length,0);
  }finally{await f.close();}
});

test('legacy globally keyed machine orphans recover within their shift without blocking the next shift',async()=>{
  const f=await fixture();try{
    const captured=await f.capture(),instrument=await f.repo.instruments.get('g1');
    const evidence_key=createHash('sha256').update(JSON.stringify({source_hash:captured.source.source_hash,instrument_id:'g1'})).digest('hex');
    await f.repo.readings.createConfirmed({id:'legacy',analysis_id:'legacy-analysis',confirmation_id:'legacy-confirmation',evidence_key,instrument_id:'g1',instrument_snapshot:instrument,profile_snapshot:profile,final_value:'0.438',context:captured.input.context,check_id:f.definition.id,sample_key:'n1',confirmed_at:new Date(f.now()).toISOString(),evidence:{source_hash:captured.source.source_hash}});
    assert.equal((await f.readings.confirm(captured.input,actor)).id,'legacy');
    f.setTime('2026-10-21T21:15:00');assert.notEqual((await f.confirm()).reading.id,'legacy');
  }finally{await f.close();}
});

test('two machine tools sharing a check complete independently and both return in the next shift',async()=>{
  const f=await fixture();try{
    const due=async()=>(await f.maintenance.due({line:'17'})).items.find(item=>item.definition_id===f.definition.id);
    assert.equal((await due()).equipment.length,2);
    const a=await f.confirm(),saved=await f.save(a.reading),partial=await due();
    assert.equal(partial.state,'pending');
    assert.deepEqual(partial.equipment.find(e=>e.instrument_id==='g1'),{instrument_id:'g1',state:'completed',completed_record_id:saved.id});
    assert.equal(partial.equipment.find(e=>e.instrument_id==='g2').state,'pending');
    const b=await f.confirm({instrument_id:'g2'});await f.save(b.reading);
    assert.equal((await due()).state,'completed');
    f.setTime('2026-10-21T21:15:00');
    assert.equal((await due()).state,'pending');assert.ok((await due()).equipment.every(e=>e.state==='pending'));
    const next=await f.confirm();assert.notEqual(next.reading.id,a.reading.id);await f.save(next.reading);
    assert.equal((await due()).equipment.find(e=>e.instrument_id==='g1').state,'completed');
  }finally{await f.close();}
});

test('required tools follow explicit line assignments and shared tools, with legacy unassigned-line fallback',async()=>{
  const f=await fixture();try{
    await f.repo.settings.update('maintenance-settings',{value:{lines:['1','17','18'],allowed_samplers:['Ldr'],night_rollover_hour:7,product_types:[]}});
    await f.repo.instruments.update('g1',{area:'17'});
    await f.repo.instruments.update('g2',{area:'18'});
    await f.repo.instruments.create({...await f.repo.instruments.get('g1'),id:'shared',name:'Shared gauge',area:''});
    const ids=async line=>(await f.maintenance.due({line})).items.find(item=>item.definition_id===f.definition.id).equipment.map(item=>item.instrument_id).sort();
    assert.deepEqual(await ids('17'),['g1','shared']);
    assert.deepEqual(await ids('18'),['g2','shared']);
    assert.deepEqual(await ids('1'),['shared']);
    const foreign=await f.confirm({instrument_id:'g2'});await f.save(foreign.reading);
    assert.equal((await f.maintenance.due({line:'17'})).items.find(item=>item.definition_id===f.definition.id).equipment.find(item=>item.instrument_id==='g1').state,'pending');
    await f.repo.instruments.update('shared',{active:false});
    assert.deepEqual(await ids('1'),['g1','g2']);
  }finally{await f.close();}
});

test('an exact recovered machine save is idempotent while another photo cannot duplicate the completed tool occurrence',async()=>{
  const f=await fixture();try{
    const a=await f.confirm(),first=await f.save(a.reading),recovered=await f.confirm();
    assert.equal((await f.save(recovered.reading)).id,first.id);
    const other=await f.confirm({bytes:Buffer.from('a genuinely new photo')});
    await assert.rejects(f.save(other.reading),error=>error.code==='MAINTENANCE_OCCURRENCE_COMPLETED');
    assert.equal((await f.repo.maintenance.listRecords({limit:25})).items.length,1);
  }finally{await f.close();}
});

test('concurrent retries save one machine occurrence and return the same completed record',async()=>{
  const f=await fixture();try{
    const captured=await f.confirm();
    const responses=await Promise.allSettled([f.save(captured.reading),f.save(captured.reading)]);
    for(const response of responses)assert.equal(response.status,'fulfilled',response.reason?.message);
    assert.equal(responses[0].value.id,responses[1].value.id);
    assert.equal((await f.repo.maintenance.listRecords({limit:25})).items.length,1);
  }finally{await f.close();}
});

test('concurrent machine confirmation of reanalyzed identical evidence recovers one immutable reading',async()=>{
  const f=await fixture();try{
    const a=await f.capture(),b=await f.capture({source:a.source});
    const readings=await Promise.all([f.readings.confirm(a.input,actor),f.readings.confirm(b.input,actor)]);
    assert.equal(readings[0].id,readings[1].id);
    assert.equal((await f.repo.readings.list({limit:25})).items.length,1);
  }finally{await f.close();}
});

test('legacy unclassified MPa machine checks also track each linked pressure tool',async()=>{
  const f=await fixture({inspection_target:null});try{
    const a=await f.confirm();await f.save(a.reading);
    const result=(await f.maintenance.due({line:'17'})).items.find(item=>item.definition_id===f.definition.id);
    assert.equal(result.state,'pending');assert.equal(result.equipment.find(e=>e.instrument_id==='g2').state,'pending');
    assert.equal((await f.confirm()).reading.id,a.reading.id);
  }finally{await f.close();}
});

test('machine evidence keeps its server capture occurrence while analysis crosses a session boundary',async()=>{
  const f=await fixture({intervals:['every_4_hours']});try{
    f.setTime('2026-10-21T12:44:59');const captured=await f.capture();f.setTime('2026-10-21T12:46:00');
    const reading=await f.readings.confirm(captured.input,actor);
    await assert.rejects(f.save(reading),error=>error.code==='EVIDENCE_OCCURRENCE');
    await f.save(reading,'2026-10-21T12:44:59+07:00');
    const next=await f.confirm();assert.notEqual(next.reading.id,reading.id);await f.save(next.reading);
    const result=(await f.maintenance.due({line:'17'})).items.find(item=>item.definition_id===f.definition.id);
    assert.equal(result.equipment.find(e=>e.instrument_id==='g1').state,'completed');
  }finally{await f.close();}
});

test('illustrative local imports cannot complete or hide operational checks',async()=>{
  const f=await fixture();try{
    await f.repo.maintenance.createRecord({definition_id:f.definition.id,definition_version:1,definition_snapshot:f.definition,instrument_id:'g1',context:{line:'17',production_date:'2026-10-21',shift:'day',sampler:'Ldr'},checked_at:'2026-10-21T08:00:00+07:00',saved_at:new Date(f.now()).toISOString(),created_at:new Date(f.now()).toISOString(),overall_status:'OK',outcomes:[{sample_id:'n1',status:'OK',value:.438}],origin:{kind:'illustrative_local_import'}});
    const result=(await f.maintenance.due({line:'17'})).items.find(item=>item.definition_id===f.definition.id);
    assert.equal(result.state,'pending');assert.ok(result.equipment.every(e=>e.state==='pending'));
  }finally{await f.close();}
});

test('maintenance history exposes illustrative provenance without its private verification checksum',async()=>{
  const f=await fixture();try{
    const origin={kind:'illustrative_local_import',label:'Data uji X/R',batch_id:'xr-v1-'+'1'.repeat(32),version:1,source:'local-xr-formula-v1',checksum:'2'.repeat(64)};
    const saved=await f.repo.maintenance.createRecord({definition_id:f.definition.id,context:{line:'17',production_date:'2026-10-21',shift:'day'},origin});
    const visible=(await f.maintenance.list()).items.find(record=>record.id===saved.id);
    assert.equal(visible.origin.label,'Data uji X/R');assert.equal(visible.origin.checksum,undefined);
    assert.equal((await f.repo.maintenance.getRecord(saved.id)).origin.checksum,'2'.repeat(64));
  }finally{await f.close();}
});

for(const [label,patch,nextSample] of [
  ['explicit product',{inspection_target:'product'},'n1'],
  ['multiple required samples',{samples:[{id:'n1',label:'1'},{id:'n2',label:'2'}],sample_count:2},'n2'],
  ['before and after stages',{kind:'difference',input_method:'photo_difference'},'n1:after'],
])test(label+' still requires a new source photo rather than reusing evidence',async()=>{
  const f=await fixture(patch);try{
    await f.confirm({sample_key:patch.kind==='difference'?'n1:before':'n1'});
    f.setTime('2026-10-21T21:15:00');const other=await f.capture({sample_key:nextSample});
    await assert.rejects(f.readings.confirm(other.input,actor),error=>error.code==='EVIDENCE_ALREADY_CONFIRMED');
    const due=(await f.maintenance.due({line:'17'})).items.find(item=>item.definition_id===f.definition.id);
    assert.deepEqual(due.equipment,[]);
  }finally{await f.close();}
});
