import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {database} from './support-db.js';
import {createInstrumentService} from '../src/services/instrumentService.js';
import {createApp} from '../src/app.js';
import {config,password,userRepo} from './helpers.js';
import {profile,cvDouble} from './support.js';

test('status-only equipment archive preserves current identity links calibration and history, and can reactivate',async()=>{
 const {repo,close}=await database(),service=createInstrumentService({repositories:repo,clock:()=>Date.now()}),actor={id:'admin'};
 try{
  const asset=await repo.instruments.create({id:'g',name:'Persisted name',code:'Code',aliases:['Alias'],area:'17',active:true,condition:'working',profile,maintenance_check_ids:['archived-check'],revision:3});
  await repo.instruments.update('g',{name:'Updated in another editor',profile:{...profile,decimals:2},revision:4});
  await repo.calibrations.create({id:'c',instrument_id:'g',version:1,engine_snapshot:{marker:'retained'}});
  await repo.maintenance.createRecord({id:'r',definition_id:'check',definition_snapshot:{name:'Historical standard'},instrument_snapshot:asset});
  const removed=await service.setStatus('g',{active:false},actor);
  assert.equal(removed.active,false);assert.equal(removed.name,'Updated in another editor');assert.equal(removed.profile.decimals,2);assert.equal(removed.revision,5);
  assert.deepEqual(removed.aliases,['Alias']);assert.deepEqual(removed.maintenance_check_ids,['archived-check']);
  assert.equal((await repo.calibrations.get('c')).engine_snapshot.marker,'retained');assert.equal((await repo.maintenance.getRecord('r')).instrument_snapshot.name,'Persisted name');
  assert.equal((await service.setStatus('g',{active:false},actor)).revision,5);
  assert.equal((await service.setStatus('g',{active:true},actor)).active,true);
  await assert.rejects(service.setStatus('missing',{active:false},actor),e=>e.code==='INSTRUMENT_NOT_FOUND');
 }finally{await close();}
});

test('equipment status endpoint requires Admin and CSRF and rejects unrelated form fields',async()=>{
 const {repo,close}=await database();
 try{
  await repo.instruments.create({id:'g',name:'Gauge',active:true,profile,revision:1});
  const make=async role=>{const users=await userRepo(role),app=createApp({config,repositories:{...repo,...users},cvClient:cvDouble()});const auth=await request(app).post('/api/v1/auth/token').send({username:'001',password});return {app,token:auth.body.data.access_token};};
  const {app,token}=await make('Admin');
  await request(app).put('/api/v1/instruments/g/status').send({active:false}).expect(401);
  await request(app).put('/api/v1/instruments/g/status').set('Authorization','Bearer '+token).send({active:false,name:'Unsaved'}).expect(422);
  const denied=await make('Operator');await request(denied.app).put('/api/v1/instruments/g/status').set('Authorization','Bearer '+denied.token).send({active:false}).expect(403);
  const agent=request.agent(app);await agent.post('/api/v1/auth/login').send({username:'001',password}).expect(200);await agent.put('/api/v1/instruments/g/status').send({active:false}).expect(403);
  const response=await request(app).put('/api/v1/instruments/g/status').set('Authorization','Bearer '+token).send({active:false}).expect(200);
  assert.equal(response.body.data.active,false);assert.equal(response.body.data.name,'Gauge');
 }finally{await close();}
});
