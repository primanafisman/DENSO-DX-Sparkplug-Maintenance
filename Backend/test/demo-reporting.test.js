import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {config,password,userRepo} from './helpers.js';
import {cvDouble} from './support.js';
import {database} from './support-db.js';
import {reportClock} from './fixtures/reporting.js';

const scope={production_date_from:'2026-10-01',production_date_to:'2026-10-07',line:'18'};
test('demo reports calculate seven charts and U/V subgroups in memory with explicit synthetic markers',async()=>{
  const {createDemoReportService}=await import('../src/services/demoReportService.js');
  const poison=new Proxy({},{get:()=>{throw new Error('Demo must not access operational repositories');}});
  const reports=createDemoReportService({repositories:poison,clock:reportClock});
  const result=await reports.checksheet(scope,{limit:100});
  assert.ok(result.meta.warnings.includes('DEMO_DATA'));assert.equal(result.rows.length,8);
  assert.ok(result.rows.every(r=>r.cells.every(c=>c.occurrences.every(o=>o.context.line==='18'))));
  const spc=await reports.spc(scope);assert.equal(spc.cohorts.length,14);
  assert.deepEqual([...new Set(spc.cohorts.map(c=>c.product_snapshot.code))].sort(),['U','V']);
  assert.ok(spc.cohorts.every(c=>c.counts.complete===7&&c.counts.incomplete===0&&c.statistics.capability.cp>0));
  assert.equal(spc.cohorts.find(c=>c.definition_snapshot.id==='chart_talc_load').n,8);
  const first=spc.cohorts[0],groups=await reports.subgroups(scope,{cohort_id:first.cohort_id,limit:2});
  assert.equal(groups.items.length,2);assert.ok(groups.next_cursor);assert.ok(groups.items.every(g=>g.values.length===first.n));
  assert.equal((await reports.subgroups(scope,{cohort_id:first.cohort_id,limit:2,cursor:groups.next_cursor})).items.length,2);
  assert.deepEqual((await reports.spc(scope)).cohorts,spc.cohorts);
  assert.ok((await reports.checksheet({...scope,definition_id:'packing_depth_tool'})).rows[0].cells.some(c=>c.occurrences.some(o=>o.overall_status==='NG')));
});

test('demo routes require authentication, are development only, validate scope and cannot write a baseline',async()=>{
  const {repo,close}=await database();
  try{
    const repositories={...repo,...await userRepo('Admin')};
    const login=async environment=>{const app=createApp({config:{...config,environment},repositories,cvClient:cvDouble(),clock:reportClock}),auth=await request(app).post('/api/v1/auth/token').send({username:'001',password});return {app,token:auth.body.data.access_token};};
    const {app,token}=await login('development');
    await request(app).get('/api/v1/maintenance/demo/report').query(scope).expect(401);
    const headers={Authorization:'Bearer '+token};
    const report=await request(app).get('/api/v1/maintenance/demo/report').set(headers).query(scope).expect(200);assert.ok(report.body.data.meta.warnings.includes('DEMO_DATA'));
    await request(app).get('/api/v1/maintenance/demo/report').set(headers).query({...scope,production_date_from:'nonsense'}).expect(422);
    const spc=await request(app).get('/api/v1/maintenance/demo/spc').set(headers).query(scope).expect(200);
    await request(app).get('/api/v1/maintenance/demo/spc/subgroups').set(headers).query({...scope,cohort_id:spc.body.data.cohorts[0].cohort_id}).expect(200);
    await request(app).get('/api/v1/maintenance/demo/spc').set(headers).query({...scope,baseline_id:'real-baseline'}).expect(422);
    const production=await login('production');await request(production.app).get('/api/v1/maintenance/demo/report').set('Authorization','Bearer '+production.token).query(scope).expect(404);
    assert.equal((await repo.maintenance.listRecords()).items.length,0);assert.equal((await repo.readings.list()).items.length,0);
  }finally{await close();}
});
