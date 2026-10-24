import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {database} from './support-db.js';
import {context,profile,item} from './support.js';
import {createAnalysisService} from '../src/services/analysisService.js';
import {createReadingService} from '../src/services/readingService.js';
test('manual entry keeps photo evidence and explicit verification without requiring a written reason',async()=>{
 const {repo,close}=await database(),directory=await fs.mkdtemp(path.join(os.tmpdir(),'spm-manual-'));
 const actor={id:'operator'},bytes=Buffer.from('manual-photo');
 const asset=await repo.instruments.create({id:'g',name:'Gauge',active:true,profile,maintenance_check_ids:['check1']});
 const photo={image_id:'photo',owner_id:actor.id,bytes,mimeType:'image/jpeg',source_hash:createHash('sha256').update(bytes).digest('hex'),context,expires_at:Date.now()/1000+600};
 const photos={get:(_id,user)=>{if(user.id!==actor.id)throw new Error('forbidden');return photo;},crop:async()=>({bytes,mimeType:'image/jpeg'})};
 const cvClient={submit:()=>{throw new Error('Manual entry must not run CV.');}};
 const analyses=createAnalysisService({config:{ttlSeconds:600},repositories:repo,cvClient,clock:()=>Date.now()},photos);
 try {
  const result=await analyses.manual({image_id:'photo',instrument_id:asset.id,roi:item.roi},actor);
  assert.equal(result.confidence.valid,false);assert.equal(result.validated_prediction,null);assert.equal(result.candidate.value,null);
  const reading=createReadingService({config:{runtimeDir:directory},repositories:repo,clock:()=>Date.now()},analyses,photos);
  const input={analysis_id:result.analysis_id,instrument_id:asset.id,instrument_revision:asset.revision,final_value:.427,verified:true,identity_verified:true,context,check_id:'check1',sample_key:'n1',reason:'',confirmation_id:'manual-confirm'};
  await assert.rejects(reading.confirm({...input,verified:false},actor),e=>e.code==='VERIFICATION_REQUIRED');
  const saved=await reading.confirm(input,actor);
  assert.equal(saved.reason,'');
  assert.equal(saved.final_value,'0.427');assert.equal(saved.corrected,true);assert.equal(saved.confidence.valid,false);assert.equal(saved.evidence_available,true);
  await assert.rejects(analyses.manual({image_id:'photo',instrument_id:asset.id,roi:item.roi},{id:'other'}),/forbidden/);
 }finally{await close();await fs.rm(directory,{recursive:true,force:true});}
});
