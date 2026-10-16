import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {userRepo} from './helpers.js';
import {context,profile,item,cvDouble,session} from './support.js';
test('photos and jobs route through the owned local workflow without saving readings',async()=>{
  const {app,token}=await session();const auth={Authorization:`Bearer ${token}`};
  const photo=(await request(app).post('/api/v1/photos').set(auth).field('context',JSON.stringify(context)).attach('image',Buffer.from('test-image'),{filename:'photo.jpg',contentType:'image/jpeg'}).expect(201)).body.data;
  assert.notEqual(photo.image_id,'internal');
  await request(app).post('/api/v1/photos').set(auth).field('context',JSON.stringify({...context,production_date:'2026-99-99'})).attach('image',Buffer.from('image'),{filename:'photo.jpg',contentType:'image/jpeg'}).expect(422);
  await request(app).post(`/api/v1/photos/${photo.image_id}/discovery`).set(auth).send({}).expect(200);
  const job=(await request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:photo.image_id,items:[item]}).expect(202)).body.data;
  const complete=(await request(app).get(`/api/v1/analysis-jobs/${job.job_id}`).set(auth).expect(200)).body.data;
  assert.equal(complete.status,'completed');assert.equal(complete.results[0].candidate.value,.438);assert.notEqual(complete.results[0].analysis_id,'private-result');
  await request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:photo.image_id,items:[item,item]}).expect(422);
  await request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:photo.image_id,items:Array.from({length:13},(_,i)=>({...item,client_id:String(i)}))}).expect(422);
  await request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:photo.image_id,items:[item],use_ai:true}).expect(422);
});
test('expired worker states become terminal and invalid private IDs are never exposed',async()=>{
  let now=Date.now();const cv=cvDouble();cv.getJob=async()=>{const {AppError}=await import('../src/errors/AppError.js');throw new AppError(410,'ENGINE_EXPIRED','Expired');};
  const {app,token}=await session({cvClient:cv,clock:()=>now});const auth={Authorization:`Bearer ${token}`};const image=(await request(app).post('/api/v1/photos').set(auth).field('context',JSON.stringify(context)).attach('image',Buffer.from('image'),{filename:'photo.jpg',contentType:'image/jpeg'})).body.data;
  const job=(await request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:image.image_id,items:[item]})).body.data;
  const result=(await request(app).get(`/api/v1/analysis-jobs/${job.job_id}`).set(auth).expect(200)).body.data;assert.equal(result.status,'expired');
  now+=901000;await request(app).post(`/api/v1/photos/${image.image_id}/discovery`).set(auth).send({}).expect(410);
});
test('queue admission remains bounded when six submissions race concurrently',async()=>{
  const repositories=await userRepo();repositories.instruments={list:async()=>{await new Promise(resolve=>setTimeout(resolve,20));return {items:[],next_cursor:null};}};
  const cv=cvDouble();cv.getJob=async()=>({job_id:'private-job',status:'queued',processed:0,total:1,results:[],expires_at:Date.now()/1000+900});
  const {app,token}=await session({repositories,cvClient:cv});const auth={Authorization:`Bearer ${token}`};const photo=(await request(app).post('/api/v1/photos').set(auth).field('context',JSON.stringify(context)).attach('image',Buffer.from('image'),{filename:'photo.jpg',contentType:'image/jpeg'})).body.data;
  const responses=await Promise.all(Array.from({length:6},()=>request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:photo.image_id,items:[item]})));
  assert.equal(responses.filter(r=>r.status===202).length,5);assert.equal(responses.filter(r=>r.status===429).length,1);
});
test('completed private jobs release admission even when old browser clients never poll',async()=>{
  const {app,token}=await session();const auth={Authorization:`Bearer ${token}`};const photo=(await request(app).post('/api/v1/photos').set(auth).field('context',JSON.stringify(context)).attach('image',Buffer.from('image'),{filename:'photo.jpg',contentType:'image/jpeg'})).body.data;
  for(let i=0;i<6;i++)await request(app).post('/api/v1/analysis-jobs').set(auth).send({image_id:photo.image_id,items:[item]}).expect(202);
});
