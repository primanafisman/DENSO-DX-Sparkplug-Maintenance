import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import request from 'supertest';
import {session} from './support.js';
test('frontend contract describes protected workflow and same-origin smoke files',async()=>{
  const contract=JSON.parse(await fs.readFile(new URL('../contracts/openapi.yaml',import.meta.url),'utf8'));
  for(const path of ['/api/v1/photos','/api/v1/analysis-jobs','/api/v1/readings/confirm','/api/v1/maintenance/records','/api/v1/auth/csrf','/api/v1/maintenance/schedule'])assert.ok(contract.paths[path]);
  assert.equal(contract.components.schemas.Profile.properties.unit.enum.includes('mm'),true);
  const {app}=await session();const page=await request(app).get('/').expect(200);assert.ok(page.text.includes('Sparkplug Maintenance'));await request(app).get('/smoke/app.js').expect(200);await request(app).get('/contracts/openapi.yaml').expect(200);
  const policy=page.headers['content-security-policy'];assert.match(policy,/img-src[^;]*blob:/);assert.match(policy,/media-src[^;]*blob:/);assert.ok(!policy.includes('upgrade-insecure-requests'));
});
