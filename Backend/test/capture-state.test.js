import test from 'node:test';
import assert from 'node:assert/strict';
test('editing a capture while polling prevents stale result delivery and preserves original crop snapshot',async()=>{
  const {createCaptureState}=await import('../smoke_ui/capture-state.js');const state=createCaptureState();const input={photo:{image_id:'p1'},roi:{x:0,y:0,width:1,height:1},profile:{unit:'MPa',decimals:3},instrument_id:'g1'};const token=state.begin(input);input.roi.x=.5;assert.equal(token.capture.roi.x,0);
  let release;const waiting=new Promise(resolve=>release=resolve);const pending=(async()=>{await waiting;return state.finish(token,{candidate:{value:.438}});})();state.invalidate();release();assert.equal(await pending,null);const newToken=state.begin({...input,roi:{x:.5,y:0,width:.5,height:1}});const result=state.finish(newToken,{candidate:{value:.41}});assert.equal(result.capture.roi.x,.5);assert.equal(result.result.candidate.value,.41);
});
