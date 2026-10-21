import test from 'node:test';import assert from 'node:assert/strict';
import {createAnalysisService} from '../src/services/analysisService.js';
test('unscoped registered labels are shared with the selected line without mutating saved equipment',async()=>{
 const assets=[{id:'shared',active:true,area:'',profile:{kind:'auto',unit:'MPa'}},{id:'other',active:true,area:'2',profile:{kind:'auto',unit:'MPa'}}],calls=[];
 const service=createAnalysisService({config:{maxJobs:2,ttlSeconds:60},repositories:{instruments:{list:async()=>({items:assets,next_cursor:null})}},clock:()=>Date.now(),cvClient:{discover:async v=>{calls.push(v);return {instruments:[]};},submit:async v=>{calls.push(v);return {job_id:'j',status:'queued'};}}},{get:()=>({private_id:'photo',context:{line:'1'}})});
 await service.discover('p',{area:'1'},{id:'u'});await service.submit({image_id:'p',items:[],area:'1'},{id:'u'});
 assert.ok(calls.every(c=>c.instruments[0].area==='1'&&c.instruments[1].area==='2'));assert.equal(assets[0].area,'');service.close();
});
