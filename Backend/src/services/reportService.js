import {createDefinitionService} from './definitionService.js';
import {AppError} from '../errors/AppError.js';
import {summaryQuery} from '../validations/reportValidation.js';
import {normalizeScope,page} from './reporting/reportScope.js';
import {hydrateRecord} from './reporting/subgroups.js';
import {buildChecksheet} from './reporting/checksheet.js';
import {buildSummary} from './reporting/summary.js';
import {calculateSpc} from './spcService.js';
import {scheduleAt} from './productionContextService.js';

export function createReportService({repositories,clock}){
  async function load(input,cursor){
    const normalized=normalizeScope(input,clock,cursor),{scope,as_of}=normalized;
    const {product_type_id,instrument_id,...sqlScope}=scope;
    return repositories.transaction(async tx=>{
      const records=[];let next;
      do{const part=await tx.maintenance.listRecordsRange({scope:sqlScope,as_of,limit:500,cursor:next});records.push(...part.items);next=part.next_cursor;if(records.length>100000)throw new AppError(422,'REPORT_TOO_LARGE','Narrow the date range; report exceeds 100000 records.');}while(next);
      const activeRecords=records.filter(record=>!record.deleted_at);
      const ids=[...new Set(activeRecords.flatMap(r=>(r.outcomes??[]).flatMap(o=>[o.reading_id,o.before_reading_id,o.after_reading_id].filter(Boolean))))];
      if(ids.length>200000)throw new AppError(422,'REPORT_TOO_LARGE','Narrow the range; too many evidence references.');
      const readings=new Map((await tx.readings.getMany(ids)).map(r=>[r.id,r]));
      const entries=activeRecords.map(record=>hydrateRecord(record,readings)).filter(e=>(!product_type_id||e.occurrence.context?.product_type_id===product_type_id)&&(!instrument_id||e.occurrence.instruments.some(a=>a.id===instrument_id)));
      entries.sort((a,b)=>a.occurrence.checked_at.localeCompare(b.occurrence.checked_at)||a.occurrence.id.localeCompare(b.occurrence.id));
      return {entries,normalized,meta:{report_version:'1',as_of,scope,scanned_records:activeRecords.length,count_unit:'maintenance_record',warnings:[]}};
    });
  }
  async function spc(input,{method='paper_stdev_s'}={}){
    const {entries,meta}=await load(input),cohorts=new Map();
    if(entries.filter(e=>e.numeric).length>5000)throw new AppError(422,'REPORT_TOO_LARGE','Narrow the date range; report exceeds 5000 subgroups.');
    for(const entry of entries.filter(e=>e.numeric)){
      if(!cohorts.has(entry.cohort_id))cohorts.set(entry.cohort_id,{cohort_id:entry.cohort_id,cohort_key:entry.cohort_key,definition_snapshot:entry.occurrence.definition_snapshot,product_snapshot:entry.occurrence.product_snapshot,instruments:entry.occurrence.instruments,unit:entry.occurrence.definition_snapshot.unit,n:entry.occurrence.definition_snapshot.sample_count,groups:[],incomplete:[]});
      const cohort=cohorts.get(entry.cohort_id);
      if(entry.complete)cohort.groups.push({occurrence:entry.occurrence,values:entry.values,xbar:entry.xbar,r:entry.r});else cohort.incomplete.push({occurrence:entry.occurrence,reasons:entry.reasons});
    }
    const result=[];
    for(const c of cohorts.values()){
      const statistics=calculateSpc({groups:c.groups.map(g=>g.values),lsl:c.definition_snapshot.limits?.minimum??null,usl:c.definition_snapshot.limits?.maximum??null,method});
      const {groups,...details}=c;
      result.push({...details,counts:{complete:groups.length,incomplete:c.incomplete.length,excluded:c.incomplete.length,observations:statistics.N},series:groups.map(g=>({occurrence_id:g.occurrence.id,checked_at:g.occurrence.checked_at,xbar:g.xbar,r:g.r})),statistics,control_limits:statistics.control_limits,capability:statistics.capability,baseline:{id:null,source:'selected_period',as_of:meta.as_of,scope:meta.scope},warnings:[...statistics.reasons,...c.definition_snapshot.review_notes],_groups:groups});
    }
    if(entries.some(e=>!e.numeric))meta.warnings.push('ATTRIBUTE_DATA_HAS_NO_SPC');
    return {meta,cohorts:result};
  }
  return {
    async summary(raw){
      const parsed=summaryQuery.safeParse(raw);if(!parsed.success)throw new AppError(422,'REPORT_SCOPE','Invalid summary month/filter.');
      const {month,...filters}=parsed.data,[year,m]=month.split('-').map(Number);
      const input={production_date_from:month+'-01',production_date_to:new Date(Date.UTC(year,m,0)).toISOString().slice(0,10),...filters};
      const {entries,meta}=await load(input),options=(await repositories.settings.get('maintenance-settings'))?.value??{};
      return buildSummary(entries,meta,scheduleAt(clock(),options).production_date);
    },
    async checksheet(input,options={}){const {entries,meta,normalized}=await load(input,options.cursor),numbers=new Map((await createDefinitionService({repositories,clock}).all()).map(d=>[d.id,d.check_number])),rows=page(buildChecksheet(entries,numbers),normalized,options);return {meta,rows:rows.items,next_cursor:rows.next_cursor};},
    async spc(input,options){const report=await spc(input,options);return {...report,cohorts:report.cohorts.map(({_groups,...c})=>c)};},
    async subgroups(input,{cohort_id,limit=50,cursor,method}={}){const normalized=normalizeScope(input,clock,cursor);const report=await spc({...normalized.scope,as_of:normalized.as_of},{method});const cohort=report.cohorts.find(c=>c.cohort_id===cohort_id);if(!cohort)throw new AppError(404,'COHORT_NOT_FOUND','Report cohort not found.');const result=page([...cohort._groups,...cohort.incomplete.map(g=>({...g,values:[],xbar:null,r:null}))],{scope:{...normalized.scope,cohort_id},as_of:normalized.as_of},{limit,cursor});return {meta:report.meta,...result};},
  };
}
