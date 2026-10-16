import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {database} from './support-db.js';
test('repositories require explicit schema lifecycle and persist exact decimal snapshots',async()=>{
  const {createRepositories}=await import('../src/repositories/index.js');
  const {repo,config,close}=await database();
  try{await repo.readings.createConfirmed({id:'r1',analysis_id:'a1',evidence_key:'e1',confirmation_id:'c1',instrument_id:'g1',final_value:'0.410',context:{line:'17'},confirmed_at:'2026-10-14T01:00:00Z'});assert.equal((await repo.readings.get('r1')).final_value,'0.410');await repo.close();const reopened=await createRepositories(config);assert.equal((await reopened.readings.get('r1')).final_value,'0.410');await reopened.close();}finally{await close();}
});
test('repository transactions roll back all writes and immutable calibration versions stay unchanged',async()=>{
  const {repo,close}=await database();try{
    await assert.rejects(repo.transaction(async tx=>{await tx.instruments.create({id:'g1',name:'Gauge',active:true});throw new Error('cancel');}));assert.equal(await repo.instruments.get('g1'),null);
    await repo.calibrations.create({id:'v1',instrument_id:'g1',version:1,template_hash:'old'});
    await assert.rejects(repo.calibrations.create({id:'v1',instrument_id:'g1',version:2,template_hash:'changed'}));assert.equal((await repo.calibrations.get('v1')).template_hash,'old');
    await repo.users.create({id:'u1',username:'001',role:'Admin',active:true,password_hash:'hashed'});await assert.rejects(repo.users.create({id:'u2',username:'001',role:'Viewer',active:true,password_hash:'hashed'}));
  }finally{await close();}
});
