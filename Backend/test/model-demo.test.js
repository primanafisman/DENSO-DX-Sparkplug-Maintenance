import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import {database} from './support-db.js';
import {config as apiConfig} from './helpers.js';
test('model verification rejects altered offline weights',async()=>{
  const {verifyModels}=await import('../scripts/verify-models.js');
  const db=await database();
  const directory=path.dirname(db.config.database.storage);
  try {
    const manifest={artifacts:[{name:'model.onnx',bytes:3,sha256:'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'}]};
    await fs.writeFile(path.join(directory,'model.onnx'),'abc');
    await verifyModels(directory,manifest);
    await fs.writeFile(path.join(directory,'model.onnx'),'abd');
    await assert.rejects(verifyModels(directory,manifest),/integrity/i);
  }finally{await db.close();}
});
test('local demo setup creates a working login and preserves credentials on rerun',async()=>{
  const {seedDemo}=await import('../scripts/seed-demo.js');
  const {createApp}=await import('../src/app.js');
  const db=await database();
  const config={...apiConfig,...db.config,environment:'development',runtimeDir:path.dirname(db.config.database.storage)};
  try {
    await seedDemo(config);
    const credential=JSON.parse(await fs.readFile(path.join(config.runtimeDir,'test-access.json'),'utf8'));
    assert.equal(credential.username,'SPM-TEST');
    const app=createApp({config,repositories:db.repo});
    const login=await request(app).post('/api/v1/auth/login').send({username:credential.username,password:credential.password});
    assert.equal(login.status,200);
    assert.equal(login.body.data.role,'Admin');
    await seedDemo(config);
    assert.equal((await fs.readFile(path.join(config.runtimeDir,'test-access.json'),'utf8')),JSON.stringify(credential,null,2)+'\n');
    await assert.rejects(seedDemo({...config,environment:'production'}),/development/i);
  }finally{await db.close();}
});
