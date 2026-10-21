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
