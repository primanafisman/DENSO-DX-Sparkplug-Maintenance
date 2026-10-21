import test from 'node:test';import assert from 'node:assert/strict';
import {buildChecksheet} from '../src/services/reporting/checksheet.js';import {CATALOG} from '../src/constants/maintenanceCatalog.js';
import {database} from './support-db.js';
import {createMaintenanceService} from '../src/services/maintenanceService.js';
import {createDefinitionService} from '../src/services/definitionService.js';
import {createReportService} from '../src/services/reportService.js';
import {archiveRevision,revisionKey} from '../src/utils/revision.js';
import {context} from './support.js';
const entry=id=>({occurrence:{id:'r-'+id,definition_snapshot:CATALOG.find(d=>d.id===id),instruments:[],context:{shift:'day',production_date:'2026-10-21'}}});
test('history numbers are stable1 to44 and are sorted before pagination, independent of name and selected rows',()=>{
 const rows=buildChecksheet([entry('chart_ee_length'),entry('master_packing'),entry('packing_depth_tool')]);
 assert.deepEqual(rows.map(r=>[r.definition_id,r.check_number]),[['packing_depth_tool',1],['master_packing',2],['chart_ee_length',44]]);
 assert.equal(buildChecksheet([entry('chart_ee_length')])[0].check_number,44);
});

test('legacy custom checks keep one catalog, record and history number without changing archived standards',async()=>{
 const {repo,close}=await database(),clock=()=>Date.parse('2026-10-14T02:00:00Z'),actor={id:'admin'};
 try{
  const legacy={...structuredClone(CATALOG[0]),id:'custom-legacy',name:'Legacy visual',source_number:null,display_order:10001,definition_version:1,created_at:'2026-10-10T00:00:00Z'};
  await repo.maintenance.createDefinition(legacy);
  await archiveRevision(repo,{entity_id:'definition:'+legacy.id,version:1,value:legacy,actor_id:actor.id,reason:'Original standard',archived_at:'2026-10-10T00:00:00Z'});
  const service=createMaintenanceService({repositories:repo,clock}),definitions=createDefinitionService({repositories:repo,clock});
  assert.equal((await service.catalog()).items.find(d=>d.id===legacy.id).check_number,45);
  assert.equal((await definitions.get(legacy.id)).check_number,45);
  const record=await service.createRecord({definition_id:legacy.id,definition_version:1,context,interval:legacy.intervals[0],trigger:legacy.triggers[0],checked_at:'2026-10-14T01:00:00Z',observations:legacy.samples.map(s=>({sample_id:s.id,status:'OK'}))},actor);
  assert.equal(record.definition_snapshot.check_number,45);
  await repo.maintenance.createRecord({...record,id:'historical-legacy',definition_snapshot:legacy});
  const report=await createReportService({repositories:repo,clock}).checksheet({production_date_from:'2026-10-14',production_date_to:'2026-10-14'});
  assert.equal(report.rows.length,1);assert.equal(report.rows[0].check_number,45);
  const fields={name:'Legacy renamed',standard_text:legacy.standard_text,method_text:legacy.method_text,tool:legacy.tool,unit:null,limits:null,intervals:legacy.intervals,triggers:legacy.triggers,review_reason:'Automatic configuration update'};
  await service.updateDefinition(legacy.id,fields,actor);
  const second=await service.createDefinition({...fields,name:'New visual',kind:'visual',input_method:'ok_ng',shifts:['day','night'],samples:[{id:'n1',label:'Sample'}]},actor);
  assert.equal(second.check_number,46);
  assert.equal((await service.catalog()).items.find(d=>d.id===legacy.id).check_number,45);
  assert.deepEqual((await repo.revisions.get(revisionKey('definition:'+legacy.id,1))).value,legacy);
 }finally{await close();}
});
