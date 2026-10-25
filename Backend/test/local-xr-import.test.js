import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {database} from './support-db.js';
import {createApp} from '../src/app.js';
import {createReportService} from '../src/services/reportService.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {config,password,userRepo} from './helpers.js';
import {cvDouble} from './support.js';
import {addReportRecord,reportScope,reportClock} from './fixtures/reporting.js';
import fs from 'node:fs/promises';
import {addReportSchemas} from '../scripts/report-response-schemas.js';

async function importer(repo,clock=reportClock){const {createLocalXrImportService}=await import('../src/services/localXrImportService.js');return createLocalXrImportService({config:{environment:'development',database:{dialect:'sqlite'}},repositories:repo,clock});}
function jsonSchema(value){
  if(Array.isArray(value))return value.map(jsonSchema);if(!value||typeof value!=='object')return value;
  const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,jsonSchema(item)]));
  for(const bound of ['Minimum','Maximum'])if(typeof result['exclusive'+bound]==='boolean'){if(result['exclusive'+bound])result['exclusive'+bound]=result[bound.toLowerCase()];else delete result['exclusive'+bound];}
  return result;
}
test('local X/R import reaches normal authenticated reporting without photos or operational master changes',async()=>{
  const {repo,close}=await database();
  try{
    await addReportRecord(repo,{id:'actual-record'});
    const settings={lines:['17','18'],allowed_samplers:['Ldr'],night_rollover_hour:7,product_types:[{id:'real-u',code:'U',name:'Actual U',active:true,version:1}]};
    await repo.settings.update('maintenance-settings',{value:settings,version:4});
    const service=await importer(repo),plan=await service.plan();
    assert.equal(plan.record_count,56);assert.equal(plan.line,'17');assert.equal(plan.production_date_from,'2026-10-15');assert.equal(plan.production_date_to,'2026-10-21');
    assert.equal((await repo.maintenance.listRecords({limit:100})).items.length,1);
    const result=await service.apply();assert.equal(result.created,56);
    assert.deepEqual((await repo.settings.get('maintenance-settings')).value,settings);assert.equal((await repo.instruments.list()).items.length,0);assert.equal((await repo.readings.list()).items.length,4);
    const app=createApp({config,repositories:{...repo,...await userRepo()},cvClient:cvDouble(),clock:reportClock}),auth=await request(app).post('/api/v1/auth/token').send({username:'001',password}),headers={Authorization:'Bearer '+auth.body.data.access_token};
    const spc=await request(app).get('/api/v1/maintenance/spc').set(headers).query(reportScope).expect(200);
    assert.equal(spc.body.data.cohorts.length,9);assert.ok(spc.body.data.meta.warnings.includes('ILLUSTRATIVE_DATA'));
    const imported=spc.body.data.cohorts.filter(c=>c.origin?.kind==='illustrative_local_import');assert.equal(imported.length,8);
    assert.deepEqual([...new Set(imported.map(c=>c.product_snapshot.name))].sort(),['Type uji U','Type uji V']);
    assert.ok(imported.every(c=>c.counts.complete===7&&c.counts.incomplete===0&&c.n===4&&c.capability.cp>0));
    const groups=await request(app).get('/api/v1/maintenance/spc/subgroups').set(headers).query({...reportScope,cohort_id:imported[0].cohort_id}).expect(200);
    assert.ok(groups.body.data.items.every(g=>g.values.length===4&&g.occurrence.evidence.length===0&&g.occurrence.origin.label==='Data uji X/R'));
    assert.doesNotMatch(JSON.stringify(groups.body.data),/checksum|manifest|source_hash|reading_id/);
    const baseline=await request(app).post('/api/v1/maintenance/spc-baselines').set(headers).send({scope:reportScope,cohort_id:imported[0].cohort_id,method:'paper_stdev_s',review_reason:'Test data'}).expect(422);assert.equal(baseline.body.code,'BASELINE_ILLUSTRATIVE_DATA');
    const exported=await request(app).get('/api/v1/maintenance/export.csv').set(headers).query(reportScope).expect(200);assert.ok(exported.text.includes('"data_origin"'));assert.ok(exported.text.includes('"Data uji X/R"'));
    await request(app).post('/api/v1/maintenance/records').set(headers).send({definition_id:'chart_ee_length',origin:{kind:'illustrative_local_import'},outcomes:[{sample_id:'n1',value:4.5}]}).expect(422);
    const sheet=await request(app).get('/api/v1/maintenance/report').set(headers).query({...reportScope,limit:100}).expect(200);assert.ok(sheet.body.data.rows.some(r=>r.cells.some(c=>c.occurrences.some(o=>o.origin?.label==='Data uji X/R'))));
    const document=JSON.parse(await fs.readFile(new URL('../contracts/openapi.yaml',import.meta.url),'utf8'));addReportSchemas(document.components.schemas);
    const {default:Ajv}=await import('ajv'),ajv=new Ajv({strict:false,validateFormats:false});ajv.addSchema(jsonSchema(document),'xr-report');
    for(const [name,body] of [['SpcReport',spc.body.data],['SubgroupPage',groups.body.data],['ChecksheetPage',sheet.body.data]]){const validate=ajv.compile({$ref:'xr-report#/components/schemas/'+name});assert.ok(validate(body),name+JSON.stringify(validate.errors));}
    assert.equal((await createMaintenanceService({repositories:repo,clock:reportClock}).due({line:'17'})).items.find(i=>i.definition_id==='chart_ee_length').state,'pending');
  }finally{await close();}
});

test('import is idempotent and rollback touches only its own tagged records',async()=>{
  const {repo,close}=await database();
  try{
    const actual=await addReportRecord(repo,{id:'actual-record'}),service=await importer(repo),applied=await service.apply();
    const again=await service.apply();assert.equal(again.created,0);assert.equal(again.skipped,56);assert.equal(again.batch_id,applied.batch_id);
    const listed=await createMaintenanceService({repositories:repo,clock:reportClock}).list({limit:100}),trial=listed.items.find(r=>r.origin);
    await createMaintenanceService({repositories:repo,clock:reportClock}).deleteRecord(trial.id,{id:'admin'});
    assert.equal((await service.rollback(applied.batch_id,{apply:false})).deleted,55);assert.equal((await createMaintenanceService({repositories:repo,clock:reportClock}).list({limit:100})).items.length,56);
    const rollback=await service.rollback(applied.batch_id);assert.equal(rollback.deleted,55);
    assert.equal((await service.rollback(applied.batch_id)).deleted,0);
    assert.deepEqual(await repo.maintenance.getRecord(actual.id),actual);assert.equal((await repo.maintenance.getRecord(trial.id)).deleted_by,'admin');
    assert.equal((await createReportService({repositories:repo,clock:reportClock}).spc(reportScope)).cohorts.length,1);
    assert.equal((await service.apply()).created,0);
  }finally{await close();}
});

test('CLI defaults to dry-run and requires an explicit apply flag for import or rollback',async()=>{
  const {importOptions}=await import('../scripts/import-local-xr-test-data.js');
  assert.deepEqual(importOptions([]),{apply:false,rollback:undefined});
  assert.deepEqual(importOptions(['--apply']),{apply:true,rollback:undefined});
  assert.deepEqual(importOptions(['--rollback','xr-v1-'+'a'.repeat(32)]),{apply:false,rollback:'xr-v1-'+'a'.repeat(32)});
  assert.throws(()=>importOptions(['--rollback']),/Usage/);assert.throws(()=>importOptions(['--production']),/Usage/);
});

test('untrusted or altered illustrative tags cannot bypass confirmed-evidence checks',async()=>{
  const {repo,close}=await database();
  try{
    const service=await importer(repo);await service.apply();
    const records=(await createMaintenanceService({repositories:repo,clock:reportClock}).list({limit:100})).items,original=records[0];
    await repo.maintenance.createRecord({...original,id:'forged-import'});
    const changed=structuredClone(original.outcomes);changed[0].value+=.1;await repo.maintenance.updateRecord(original.id,{outcomes:changed});
    const report=await createReportService({repositories:repo,clock:reportClock}).spc(reportScope);
    assert.equal(report.cohorts.reduce((n,c)=>n+c.counts.complete,0),55);
    assert.equal(report.cohorts.reduce((n,c)=>n+c.counts.incomplete,0),2);
    assert.ok(report.cohorts.flatMap(c=>c.incomplete).every(i=>i.reasons.includes('UNTRUSTED_ILLUSTRATIVE_IMPORT')));
  }finally{await close();}
});

test('seed uses server production date and configured line, and refuses production or external databases',async()=>{
  const {repo,close}=await database();
  try{
    await repo.settings.update('maintenance-settings',{value:{lines:['Assembly A'],allowed_samplers:['Ldr'],night_rollover_hour:7}});
    const service=await importer(repo,()=>Date.parse('2026-10-25T01:15:00+07:00')),plan=await service.plan();assert.equal(plan.line,'Assembly A');assert.equal(plan.production_date_to,'2026-10-24');
    const {createLocalXrImportService}=await import('../src/services/localXrImportService.js');
    for(const options of [{environment:'production',database:{dialect:'sqlite'}},{environment:'development',database:{dialect:'mysql'}}])assert.throws(()=>createLocalXrImportService({config:options,repositories:repo,clock:reportClock}),/development.*SQLite/i);
  }finally{await close();}
});
