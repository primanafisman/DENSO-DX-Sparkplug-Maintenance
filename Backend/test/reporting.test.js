import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './support-db.js';
import {addReportRecord,reportScope,reportClock} from './fixtures/reporting.js';
import {CATALOG} from '../src/constants/maintenanceCatalog.js';

test('whole-period summary counts all 501 records rather than one repository page',async()=>{
  const {createReportService}=await import('../src/services/reportService.js');const {repo,close}=await database();
  try{
    await repo.transaction(async tx=>{for(let i=0;i<501;i++)await addReportRecord(tx,{id:'v'+i,definition_id:'packing_depth_tool',status:i%2?'NG':'OK'});});
    const service=createReportService({repositories:repo,clock:reportClock}),summary=await service.summary({month:'2026-10'});
    assert.equal(summary.total,501);assert.equal(summary.ok+summary.ng,501);assert.equal(summary.meta.count_unit,'maintenance_record');assert.equal(summary.daily.length,1);
    assert.equal((await service.summary({month:'2026-09'})).ok_ratio,null);
  }finally{await close();}
});

test('summary latest inspection times respect month, line, shift, snapshot, deletion and production cutoff',async()=>{
  const {createReportService}=await import('../src/services/reportService.js');const {repo,close}=await database();
  try{
    const definition_snapshot=structuredClone(CATALOG.find(d=>d.id==='packing_depth_tool'));
    const record={definition_id:definition_snapshot.id,definition_snapshot,overall_status:'OK',outcomes:[],created_at:'2026-10-20T00:00:00.000Z',context:{line:'17',shift:'night',sampler:'Ldr',production_date:'2026-10-20'}};
    await repo.maintenance.createRecord({...record,id:'included',checked_at:'2026-10-21T01:25:00+07:00'});
    await repo.maintenance.createRecord({...record,id:'other-line',checked_at:'2026-10-21T02:00:00+07:00',context:{...record.context,line:'18'}});
    await repo.maintenance.createRecord({...record,id:'other-shift',checked_at:'2026-10-21T03:00:00+07:00',context:{...record.context,shift:'day'}});
    await repo.maintenance.createRecord({...record,id:'other-month',checked_at:'2026-10-21T04:00:00+07:00',context:{...record.context,production_date:'2026-09-30'}});
    await repo.maintenance.createRecord({...record,id:'after-snapshot',checked_at:'2026-10-21T05:00:00+07:00',created_at:'2026-10-21T09:00:00.000Z'});
    await repo.maintenance.createRecord({...record,id:'deleted',checked_at:'2026-10-21T06:00:00+07:00',deleted_at:'2026-10-21T07:00:00.000Z'});
    await repo.maintenance.createRecord({...record,id:'after-cutoff',checked_at:'2026-10-22T08:00:00+07:00',context:{...record.context,production_date:'2026-10-22'}});

    const service=createReportService({repositories:repo,clock:reportClock});
    const summary=await service.summary({month:'2026-10',line:'17',shift:'night',as_of:'2026-10-21T08:00:00.000Z'});
    assert.equal(summary.total,1);
    assert.equal(summary.groups[0].latest_checked_at,'2026-10-21T01:25:00+07:00');
    assert.deepEqual(summary.daily,[{date:'2026-10-20',ok:1,ng:0}]);
    assert.deepEqual(await repo.maintenance.getRecord('included'),{...record,id:'included',checked_at:'2026-10-21T01:25:00+07:00'});
  }finally{await close();}
});

test('summary retains legacy records without valid inspection times and reports their time as unknown',async()=>{
  const {createReportService}=await import('../src/services/reportService.js');const {repo,close}=await database();
  try{
    const definition_snapshot=structuredClone(CATALOG.find(d=>d.id==='packing_depth_tool'));
    const record={definition_id:definition_snapshot.id,definition_snapshot,overall_status:'OK',outcomes:[],created_at:'2026-10-20T00:00:00.000Z',context:{line:'17',shift:'day',sampler:'Ldr',production_date:'2026-10-20'}};
    await repo.maintenance.createRecord({...record,id:'legacy-missing'});
    await repo.maintenance.createRecord({...record,id:'legacy-null',checked_at:null});
    await repo.maintenance.createRecord({...record,id:'legacy-invalid',checked_at:'unknown'});

    const summary=await createReportService({repositories:repo,clock:reportClock}).summary({month:'2026-10'});
    assert.equal(summary.total,3);
    assert.equal(summary.groups[0].latest_checked_at,null);
  }finally{await close();}
});

test('monthly cells retain multiple occurrences, blanks and immutable standards and equipment',async()=>{
  const {createReportService}=await import('../src/services/reportService.js');const {repo,close}=await database();
  try{
    await addReportRecord(repo,{id:'a',type:null});await addReportRecord(repo,{id:'b',type:null});
    await repo.instruments.create({id:'g1',name:'Renamed now',active:false});
    const service=createReportService({repositories:repo,clock:reportClock}),page=await service.checksheet(reportScope,{limit:1});
    assert.equal(page.rows.length,1);const row=page.rows[0];assert.equal(row.cells[0].count,2);assert.equal(row.cells[0].occurrences.length,2);
    assert.equal(row.cells.find(c=>c.date==='2026-10-02'),undefined);assert.equal(row.standard.maximum,4.6);assert.equal(row.equipment_name,'Original tool');
    assert.equal(row.cells[0].occurrences[0].product_snapshot,null);assert.equal(row.cells[0].occurrences[0].slot_id,null);
    assert.equal(row.cells[0].occurrences[0].evidence[0].variant,'original');
  }finally{await close();}
});

test('SPC splits incompatible standards, retains incomplete groups and supports each paper profile',async()=>{
  const {createReportService}=await import('../src/services/reportService.js');const {repo,close}=await database();
  try{
    await addReportRecord(repo,{id:'a'});await addReportRecord(repo,{id:'b',version:2});await addReportRecord(repo,{id:'bad',missing:true});
    const service=createReportService({repositories:repo,clock:reportClock}),spc=await service.spc({...reportScope,definition_id:'chart_ee_length'});
    assert.equal(spc.cohorts.length,2);assert.equal(spc.cohorts.reduce((n,c)=>n+c.counts.excluded,0),1);
    assert.equal(spc.cohorts.reduce((n,c)=>n+c.counts.complete,0),2);
    for(const def of CATALOG.filter(d=>d.id.startsWith('chart_')&&d.id!=='chart_ee_length'))await addReportRecord(repo,{id:def.id,definition_id:def.id,values:[(def.limits.minimum+def.limits.maximum)/2]});
    for(const def of CATALOG.filter(d=>d.id.startsWith('chart_'))){const report=await service.spc({...reportScope,definition_id:def.id});assert.equal(report.cohorts[0].definition_snapshot.limits.maximum,def.limits.maximum);assert.equal(report.cohorts[0].n,def.sample_count);}
    await addReportRecord(repo,{id:'visual',definition_id:'packing_depth_tool'});
    assert.equal((await service.spc({...reportScope,definition_id:'packing_depth_tool'})).cohorts.length,0);
  }finally{await close();}
});

test('report range and cursor validation is calendar-based and snapshot-bound',async()=>{
  const {createReportService}=await import('../src/services/reportService.js');const {repo,close}=await database();
  try{
    const service=createReportService({repositories:repo,clock:reportClock});
    await addReportRecord(repo,{id:'a'});await addReportRecord(repo,{id:'b',version:2});
    const first=await service.checksheet(reportScope,{limit:1});assert.ok(first.next_cursor);
    const second=await service.checksheet(reportScope,{limit:1,cursor:first.next_cursor});assert.equal(second.rows.length,1);
    await assert.rejects(service.checksheet({...reportScope,line:'other'},{limit:1,cursor:first.next_cursor}),/cursor/i);
    for(const dates of [['2026-02-30','2026-03-01'],['2026-10-21','2026-10-01'],['2026-01-01','2026-07-01']])await assert.rejects(service.checksheet({production_date_from:dates[0],production_date_to:dates[1]}),/range|date|months/i);
    assert.equal((await service.checksheet({production_date_from:'2024-02-29',production_date_to:'2024-08-28'})).rows.length,0);
    await assert.rejects(service.checksheet({...reportScope,as_of:'2099-01-01T00:00:00Z'}),/snapshot|future/i);
    assert.equal((await service.checksheet({...reportScope,instrument_id:'g1'})).rows.length,2);
  }finally{await close();}
});

test('difference report retains before and after evidence and scans are explicitly bounded',async()=>{
  const {createReportService}=await import('../src/services/reportService.js');const {repo,close}=await database();
  try{
    const def=CATALOG.find(d=>d.kind==='difference');await addReportRecord(repo,{id:'difference',definition_id:def.id,values:[.1,.12,.11,.13]});
    const report=await createReportService({repositories:repo,clock:reportClock}).spc({...reportScope,definition_id:def.id});
    assert.equal(report.cohorts[0].counts.complete,1);assert.ok(Math.abs(report.cohorts[0].series[0].xbar-.115)<1e-10);
    const raw=await createReportService({repositories:repo,clock:reportClock}).subgroups({...reportScope,definition_id:def.id},{cohort_id:report.cohorts[0].cohort_id});assert.equal(raw.items[0].occurrence.evidence.length,16);
    let i=0;const fake={transaction:fn=>fn({maintenance:{listRecordsRange:async()=>({items:Array.from({length:500},()=>({id:String(i++)})),next_cursor:'next'})}})};
    await assert.rejects(createReportService({repositories:fake,clock:reportClock}).checksheet(reportScope),e=>e.code==='REPORT_TOO_LARGE');
  }finally{await close();}
});
