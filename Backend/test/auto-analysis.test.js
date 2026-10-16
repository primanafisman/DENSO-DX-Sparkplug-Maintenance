import test from 'node:test';
import assert from 'node:assert/strict';
const profile={kind:'digital',unit:'mm',minimum:0,maximum:25,decimals:3,tolerance:.01};
const roi={x:.1,y:.1,width:.8,height:.4},label_roi={x:.2,y:.7,width:.6,height:.15};
const proposal={roi,label_roi,suggested_profile:profile,profile_source:'registered-equipment',instrument:{id:'gasket'},label:{raw_text:'GASKET'}};
const context={line:'17',production_date:'2026-10-14',shift:'day',sampler:'Ldr'};
function transport(instruments=[proposal]){
  const calls=[];
  return {calls,upload:async(file,context)=>({image_id:file,context}),
    request:async(path,options)=>{calls.push({path,options});if(path.endsWith('/discovery'))return {instruments};return {job_id:'job',status:'completed',results:[{analysis_id:'a',candidate:{value:2.248,unit:'mm'}}]};},
    submit:async(image_id,items,area)=>{calls.push({image_id,items,area});return {job_id:'job',status:'queued'};}};
}
test('upload automatically reads registered proposal with both ROIs, area and visible stages; never saves',async()=>{
  const {createAutoAnalysis}=await import('../smoke_ui/auto-analysis.js');
  const api=transport([{...proposal,instrument:null,profile_source:'display-default'},proposal]);
  const stages=[],prepared=[];
  const flow=createAutoAnalysis({api,onProgress:stage=>stages.push(stage),onPrepared:value=>prepared.push(value),sleep:async()=>{}});
  const result=await flow.upload('image-1',context);
  assert.equal(result.result.candidate.value,2.248);
  assert.equal(result.capture.instrument_id,'gasket');
  assert.deepEqual(result.capture.label_roi,label_roi);
  assert.deepEqual(api.calls.find(call=>call.items),{image_id:'image-1',items:[{client_id:'indicator-1',roi,label_roi,profile,instrument_id:'gasket'}],area:'17'});
  assert.equal(prepared.length,1);
  assert.deepEqual(stages,['uploading','discovering','submitting','queued','complete']);
  assert.ok(!api.calls.some(call=>call.path?.includes('confirm')));
});
test('a replacement photo prevents late old discovery from submitting or changing the result',async()=>{
  const {createAutoAnalysis}=await import('../smoke_ui/auto-analysis.js');
  let release;
  const api=transport();api.upload=(file,context)=>file==='old'?new Promise(resolve=>{release=()=>resolve({image_id:file,context});}):Promise.resolve({image_id:file,context});
  const flow=createAutoAnalysis({api,sleep:async()=>{}});
  const old=flow.upload('old',context);
  const current=await flow.upload('new',context);release();
  assert.equal(await old,null);assert.equal(current.capture.photo.image_id,'new');
  assert.equal(api.calls.filter(c=>c.items).length,1);
});
test('missing crop/profile requests adjustment and clears stale label from next photo',async()=>{
  const {createAutoAnalysis}=await import('../smoke_ui/auto-analysis.js');
  const api=transport([]),flow=createAutoAnalysis({api,sleep:async()=>{}});
  const result=await flow.upload('image-1',context);
  assert.equal(result.needsAdjustment,true);assert.equal(result.capture.label_roi,null);
  assert.equal(api.calls.filter(c=>c.items).length,0);
});
test('cancelled polling and server failures do not yield a confirmable result',async()=>{
  const {createAutoAnalysis}=await import('../smoke_ui/auto-analysis.js');
  const api=transport();let flow;
  flow=createAutoAnalysis({api,sleep:async()=>flow.cancel()});
  assert.equal(await flow.upload('image',context),null);
  api.submit=async()=>({job_id:'bad',status:'failed'});
  await assert.rejects(flow.upload('image',context),/Analisis/);
});
