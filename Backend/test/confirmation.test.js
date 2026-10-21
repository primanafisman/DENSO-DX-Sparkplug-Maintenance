import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {database} from './support-db.js';
import {context,profile,item} from './support.js';
test('confirmation requires identity, context binding and reason, and duplicate retries stay idempotent',async()=>{
  const {createReadingService}=await import('../src/services/readingService.js');const {repo,close}=await database();const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-evidence-'));const bytes=Buffer.from('original');const source_hash=createHash('sha256').update(bytes).digest('hex');
  const asset={id:'g1',name:'Gauge',active:true,profile,maintenance_check_ids:['check1']};await repo.instruments.create(asset);
  const snapshot={submitted:{...item,instrument_id:'g1',calibration_id:'cal-v1',calibration:{template_hash:'template'}},instrument_snapshot:asset,context,photo:{bytes,mimeType:'image/jpeg',source_hash},result:{candidate:{value:.438,unit:'MPa'},confidence:{valid:true},validated_prediction:.438,method:'local'}};
  const service=createReadingService({config:{runtimeDir:directory},repositories:repo,clock:()=>Date.now()}, {getResult:()=>snapshot},{crop:async()=>({bytes,mimeType:'image/jpeg'})});const actor={id:'u1',role:'Operator'};
  const input={analysis_id:'a1',instrument_id:'g1',final_value:.438,verified:true,identity_verified:true,context,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'confirm1'};
  try{
    await assert.rejects(service.confirm({...input,identity_verified:false},actor),/identity/i);
    await assert.rejects(service.confirm({...input,context:{...context,line:'99'}},actor),/context/i);
    await assert.rejects(service.confirm({...input,final_value:.43},actor),/reason/i);
    const saved=await service.confirm(input,actor);assert.equal(saved.final_value,'0.438');assert.deepEqual(saved.calibration_snapshot,{id:'cal-v1',template_hash:'template'});
    assert.equal((await service.confirm(input,actor)).id,saved.id);
    await assert.rejects(service.confirm({...input,final_value:.43,reason:'corrected'},actor),/conflict|different/i);
    await assert.rejects(service.confirm({...input,confirmation_id:'rebound',sample_key:'n2'},actor),/analysis|sample|already/i);
    snapshot.submitted={...snapshot.submitted,roi:{x:.01,y:0,width:.99,height:1}};
    await assert.rejects(service.confirm({...input,analysis_id:'reanalyzed',confirmation_id:'replayed-photo',sample_key:'n2'},actor),/evidence|photo|already/i);
    assert.equal((await service.evidence(saved.id,'original',actor)).bytes.toString(),'original');
    assert.equal((await repo.readings.list({limit:10})).items.length,1);
  }finally{await close();await fs.rm(directory,{recursive:true,force:true});}
});
test('concurrent confirmation binds one analysis to only one required sample',async()=>{
  const {createReadingService}=await import('../src/services/readingService.js');const {repo,close}=await database();const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-concurrent-'));const bytes=Buffer.from('photo');const source_hash=createHash('sha256').update(bytes).digest('hex');const asset={id:'g',name:'Gauge',active:true,profile,maintenance_check_ids:['check1']};await repo.instruments.create(asset);const snapshot={submitted:{...item,instrument_id:'g'},instrument_snapshot:asset,context,photo:{bytes,mimeType:'image/jpeg',source_hash},result:{candidate:{value:.438},confidence:{valid:true},validated_prediction:.438}};const service=createReadingService({config:{runtimeDir:directory},repositories:repo,clock:()=>Date.now()},{getResult:()=>snapshot},{crop:async()=>({bytes,mimeType:'image/jpeg'})});const input={analysis_id:'shared-analysis',instrument_id:'g',final_value:.438,verified:true,identity_verified:true,context,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'c1'};
  try{const responses=await Promise.allSettled([service.confirm(input,{id:'u'}),service.confirm({...input,sample_key:'n2',confirmation_id:'c2'},{id:'u'})]);assert.equal(responses.filter(r=>r.status==='fulfilled').length,1);assert.equal((await repo.readings.list({limit:25})).items.length,1);}finally{await close();await fs.rm(directory,{recursive:true,force:true});}
});

test('explicit same-profile equipment selection reuses analysis and preserves provenance without a new reading job',async()=>{
  const {createReadingService}=await import('../src/services/readingService.js');const {repo,close}=await database();const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-reassign-'));const bytes=Buffer.from('selected-photo'),source_hash=createHash('sha256').update(bytes).digest('hex');
  const original=await repo.instruments.create({id:'old',name:'Original',revision:1,active:true,profile,maintenance_check_ids:['check1']});
  const selected=await repo.instruments.create({id:'new',name:'Selected',revision:7,active:true,profile,maintenance_check_ids:['check1']});
  const snapshot={submitted:{...item,instrument_id:'old'},instrument_snapshot:original,context,photo:{bytes,mimeType:'image/jpeg',source_hash},result:{candidate:{value:.438},confidence:{valid:true},validated_prediction:.438}};
  const service=createReadingService({config:{runtimeDir:directory},repositories:repo,clock:()=>Date.now()},{getResult:()=>snapshot},{crop:async()=>({bytes,mimeType:'image/jpeg'})});
  const input={analysis_id:'selected-analysis',instrument_id:'new',instrument_revision:selected.revision,equipment_reassigned:true,final_value:.438,verified:true,identity_verified:true,context,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'selection-confirm'};
  try {
    const saved=await service.confirm(input,{id:'u'});assert.equal(saved.instrument_id,'new');assert.equal(saved.final_value,'0.438');
    const stored=await repo.readings.get(saved.id);assert.equal(stored.analysis.equipment_selection.original_instrument_id,'old');assert.deepEqual(stored.analysis.equipment_selection.original_profile,profile);assert.equal(stored.corrected,false);
    assert.equal((await service.confirm(input,{id:'u'})).id,saved.id);
  }finally{await close();await fs.rm(directory,{recursive:true,force:true});}
});
test('equipment reassignment still rejects incompatible profiles, transferred calibration and stale target revisions',async()=>{
  const {createReadingService}=await import('../src/services/readingService.js');const {repo,close}=await database();const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-selection-guards-'));const bytes=Buffer.from('photo');
  const original=await repo.instruments.create({id:'old',name:'Original',revision:1,active:true,profile,maintenance_check_ids:['check1']});
  const target=await repo.instruments.create({id:'new',name:'Selected',revision:7,active:true,profile,maintenance_check_ids:['check1']});
  const incompatible=await repo.instruments.create({id:'mm',name:'Length',revision:1,active:true,profile:{...profile,unit:'mm'},maintenance_check_ids:['check1']});
  const snapshot={submitted:{...item,instrument_id:'old'},instrument_snapshot:original,context,photo:{bytes,mimeType:'image/jpeg',source_hash:createHash('sha256').update(bytes).digest('hex')},result:{candidate:{value:.438},confidence:{valid:true},validated_prediction:.438}};
  const service=createReadingService({config:{runtimeDir:directory},repositories:repo,clock:()=>Date.now()},{getResult:()=>snapshot},{crop:async()=>({bytes,mimeType:'image/jpeg'})});
  const input={analysis_id:'selection-guards',instrument_id:'new',instrument_revision:target.revision,equipment_reassigned:true,final_value:.438,verified:true,identity_verified:true,context,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'guard-confirm'};
  try {
    await assert.rejects(service.confirm({...input,equipment_reassigned:undefined}, {id:'u'}),e=>e.code==='IDENTITY_CONFLICT');
    await assert.rejects(service.confirm({...input,instrument_id:'mm',instrument_revision:incompatible.revision},{id:'u'}),e=>e.code==='PROFILE_CHANGED');
    await assert.rejects(service.confirm({...input,instrument_revision:target.revision+1},{id:'u'}),e=>e.code==='PROFILE_CHANGED');
    snapshot.submitted.calibration_id='owned-by-old';
    await assert.rejects(service.confirm(input,{id:'u'}),e=>e.code==='IDENTITY_CONFLICT');
    assert.equal((await repo.readings.list({limit:10})).items.length,0);
  }finally{await close();await fs.rm(directory,{recursive:true,force:true});}
});

 test('auto mode can bind a proven digital result without changing physical profile, but cannot bind analog',async()=>{
 const {createReadingService}=await import('../src/services/readingService.js'),{repo,close}=await database(),directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-mode-')),bytes=Buffer.from('mode-photo');
 const selected=await repo.instruments.create({id:'digital',revision:1,active:true,profile:{...profile,kind:'digital'},maintenance_check_ids:['check1']});
 const snapshot={submitted:{...item,profile:{...profile,kind:'auto'}},context,photo:{bytes,mimeType:'image/jpeg',source_hash:createHash('sha256').update(bytes).digest('hex')},result:{candidate:{kind:'digital',value:.438},confidence:{valid:true},validated_prediction:.438}};
 const service=createReadingService({config:{runtimeDir:directory},repositories:repo,clock:()=>Date.now()},{getResult:()=>snapshot},{crop:async()=>({bytes,mimeType:'image/jpeg'})}),input={analysis_id:'mode-analysis',instrument_id:selected.id,instrument_revision:1,equipment_reassigned:true,final_value:.438,verified:true,identity_verified:true,context,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'mode-confirm'};
 try{snapshot.result.candidate.kind='analog';await assert.rejects(service.confirm(input,{id:'u'}),e=>e.code==='PROFILE_CHANGED');snapshot.result.candidate.kind='digital';const saved=await service.confirm(input,{id:'u'});assert.equal(saved.final_value,'0.438');assert.equal((await repo.readings.get(saved.id)).analysis.equipment_selection.original_profile.kind,'auto');}finally{await close();await fs.rm(directory,{recursive:true,force:true});}
 });
