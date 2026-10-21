import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support-db.js';
import {addReportRecord,reportScope,reportClock} from './fixtures/reporting.js';
import {createReportService} from '../src/services/reportService.js';
test('frozen baseline limits stay fixed across viewing dates and reject incompatible cohorts',async()=>{
  const {createBaselineService}=await import('../src/services/baselineService.js');const {repo,close}=await database();
  try{
    await addReportRecord(repo,{id:'a'});await addReportRecord(repo,{id:'b',date:'2026-10-02',values:[4.54,4.55,4.56,4.55]});
    const reports=createReportService({repositories:repo,clock:reportClock}),service=createBaselineService({repositories:repo,clock:reportClock},reports);
    const scope={...reportScope,definition_id:'chart_ee_length',production_date_to:'2026-10-01'};
    const initial=await reports.spc(scope),saved=await service.create({scope,cohort_id:initial.cohorts[0].cohort_id,method:'paper_stdev_s',review_reason:'Local quality review'}, {id:'admin'});
    const later=await reports.spc({...scope,production_date_from:'2026-10-02',production_date_to:'2026-10-02'});
    const applied=await service.apply(later,saved.id);assert.deepEqual(applied.cohorts[0].control_limits,saved.control_limits);
    assert.notEqual(applied.cohorts[0].statistics.grand_mean,saved.control_limits.center_x);assert.equal(applied.cohorts[0].baseline.source,'frozen');
    await addReportRecord(repo,{id:'c',version:2});const mixed=await reports.spc({...reportScope,definition_id:'chart_ee_length'});
    await assert.rejects(service.apply(mixed,saved.id),e=>e.code==='BASELINE_COHORT_CONFLICT');
    await assert.rejects(service.get('missing'),e=>e.status===404);
    assert.equal((await service.get(saved.id)).review_reason,'Local quality review');
    assert.equal(repo.revisions.update,undefined);
  }finally{await close();}
});
