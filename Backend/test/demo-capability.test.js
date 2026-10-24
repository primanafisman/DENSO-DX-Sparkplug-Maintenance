import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {config} from './helpers.js';
import {cvDouble} from './support.js';

test('demo report capability is explicit and available only in development',async()=>{
  for(const [environment,expected] of [['development',true],['test',false],['production',false]]){
    const app=createApp({config:{...config,environment},repositories:{},cvClient:cvDouble()});
    const result=await request(app).get('/api/v1/capabilities').expect(200);
    assert.equal(result.body.data.demo_reports,expected);
    assert.match(result.headers['cache-control'],/no-store/);
  }
});
