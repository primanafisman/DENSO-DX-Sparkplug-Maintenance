import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'node:fs/promises';
import bcrypt from 'bcrypt';
import {database} from './support-db.js';
import {config,password} from './helpers.js';
import {cvDouble} from './support.js';
import {addReportRecord,reportScope,reportClock} from './fixtures/reporting.js';
import {createApp} from '../src/app.js';
const params=new URLSearchParams(reportScope).toString();
test('report APIs authenticate, enforce roles/CSRF, validate DTOs and export every row safely',async()=>{
  const {repo,close}=await database();
  try{
    await repo.users.create({id:'admin',username:'001',role:'Admin',active:true,password_hash:await bcrypt.hash(password,4)});
    await repo.transaction(async tx=>{for(let i=0;i<101;i++)await addReportRecord(tx,{id:'r'+i,definition_id:'packing_depth_tool'});});
    await addReportRecord(repo,{id:'numeric'});
    // Saved source text is data, not an executable spreadsheet expression.
    const hostile=await repo.maintenance.getRecord('r0');hostile.definition_snapshot.name='=HYPERLINK("x")';
    // A separate immutable record contains the source snapshot; do not edit a confirmed record.
    await repo.maintenance.createRecord({...hostile,id:'hostile'});
    const app=createApp({config,repositories:repo,cvClient:cvDouble(),clock:reportClock});
    await request(app).get('/api/v1/maintenance/summary?month=2026-10').expect(401);
    const agent=request.agent(app);await agent.post('/api/v1/auth/login').send({username:'001',password}).expect(200);
    const csrf=(await agent.get('/api/v1/auth/csrf')).body.data.csrf_token;
    const summary=await agent.get('/api/v1/maintenance/summary?month=2026-10').expect(200);assert.equal(summary.body.data.total,103);
    const sheet=await agent.get('/api/v1/maintenance/report?'+params+'&limit=1').expect(200);assert.ok(sheet.body.data.next_cursor);
    const spc=await agent.get('/api/v1/maintenance/spc?'+params+'&definition_id=chart_ee_length').expect(200);
    const cohort=spc.body.data.cohorts[0];
    const input={scope:{...reportScope,definition_id:'chart_ee_length'},cohort_id:cohort.cohort_id,method:'paper_stdev_s',review_reason:'Checked'};
    await agent.post('/api/v1/maintenance/spc-baselines').send(input).expect(403);
    const baseline=await agent.post('/api/v1/maintenance/spc-baselines').set('X-CSRF-Token',csrf).send(input).expect(201);
    await agent.get('/api/v1/maintenance/spc-baselines/'+baseline.body.data.id).expect(200);
    const groups=await agent.get('/api/v1/maintenance/spc/subgroups?'+params+'&definition_id=chart_ee_length&cohort_id='+cohort.cohort_id).expect(200);
    const csv=await agent.get('/api/v1/maintenance/export.csv?'+params).expect(200);
    assert.equal(csv.text.trim().split('\r\n').length,103+4); // 102 visual rows + 4 numeric samples + header
    assert.ok(csv.text.includes("'=HYPERLINK"));assert.doesNotMatch(JSON.stringify(sheet.body),/original_file|runtimeDir|password_hash/);
    const doc=JSON.parse(await fs.readFile(new URL('../contracts/openapi.yaml',import.meta.url),'utf8'));
    const {default:Ajv}=await import('ajv');const ajv=new Ajv({strict:false,validateFormats:false});
    const schemaDoc=JSON.parse(JSON.stringify(doc).replace(/"exclusiveMinimum":true,"minimum":0/g,'"exclusiveMinimum":0'));
    function draft(v){if(Array.isArray(v))return v.map(draft);if(!v||typeof v!=='object')return v;const r=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,draft(x)]));for(const name of ['Minimum','Maximum'])if(typeof r['exclusive'+name]==='boolean'){if(r['exclusive'+name])r['exclusive'+name]=r[name.toLowerCase()];else delete r['exclusive'+name];}return r;}
    ajv.addSchema(draft(schemaDoc),'report');
    for(const [name,body] of [['MaintenanceSummary',summary.body.data],['ChecksheetPage',sheet.body.data],['SpcReport',spc.body.data],['SubgroupPage',groups.body.data],['SpcBaseline',baseline.body.data]]){const valid=ajv.compile({$ref:'report#/components/schemas/'+name});assert.ok(valid(body),name+JSON.stringify(valid.errors));}
    const auth=(await request(app).post('/api/v1/auth/token').send({username:'001',password})).body.data.access_token;
    await repo.users.update('admin',{role:'Viewer'});
    await request(app).post('/api/v1/maintenance/spc-baselines').set('Authorization','Bearer '+auth).send(input).expect(403);
    const unknown=await request(app).get('/api/v1/not-a-route').set('Authorization','Bearer '+auth);assert.equal(unknown.body.code,'NOT_FOUND');
  }finally{await close();}
});
