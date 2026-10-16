import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {config} from './helpers.js';
test('camera capabilities expose only opt-in HTTPS port and never certificate/key paths',async()=>{
  const app=createApp({config:{...config,https:{enabled:true,port:8443,certFile:'private-cert',keyFile:'private-key',caFile:'private-ca'}},repositories:{}});
  const response=await request(app).get('/api/v1/capabilities').expect(200);
  assert.deepEqual(response.body.data.local_https,{enabled:true,port:8443,ca_download:'/local-camera-ca.cer'});
  assert.ok(!JSON.stringify(response.body).includes('private-'));
});
test('CA download is absent when local HTTPS is disabled or production is configured',async()=>{
  for(const selected of [{...config,environment:'development',https:{enabled:false}},{...config,environment:'production',https:{enabled:true,caFile:'absent'}}]){
    const app=createApp({config:selected,repositories:{}});
    await request(app).get('/local-camera-ca.cer').expect(404);
    await request(app).get('/runtime/tls/ca-key.pem').expect(404);
  }
});
