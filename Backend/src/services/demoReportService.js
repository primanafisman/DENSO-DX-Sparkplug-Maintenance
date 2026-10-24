import {CATALOG} from '../constants/maintenanceCatalog.js';
import {AppError} from '../errors/AppError.js';
import {createReportService} from './reportService.js';
import {normalizeScope} from './reporting/reportScope.js';

// Synthetic examples use the reviewed paper definitions, not transcribed readings.
// The isolated ports intentionally have no connection to operational storage.
function demoRepositories(scope,as_of){
  const records=[],readings=new Map(),line=scope.line??'17';
  const definitions=CATALOG.filter(d=>d.id.startsWith('chart_')||d.id==='packing_depth_tool');
  for(let time=Date.parse(scope.production_date_from+'T00:00:00Z');time<=Date.parse(scope.production_date_to+'T00:00:00Z');time+=86400000){
    const date=new Date(time).toISOString().slice(0,10),day=Math.floor(time/86400000);
    for(const source of definitions){
      const def=structuredClone(source),numeric=def.input_method!=='ok_ng';
      for(const type of numeric?['U','V']:['U']){
        const product_snapshot={id:'demo-'+type.toLowerCase(),code:type,name:'Data contoh · '+type+'-Type',version:1};
        const context={line,production_date:date,shift:scope.shift??'day',sampler:'Ldr',product_type_id:product_snapshot.id};
        const checked_at=date+(context.shift==='night'?'T21:15:00+07:00':'T07:45:00+07:00');
        const id=['demo',date,def.id,type,line,context.shift].join(':'),outcomes=[];
        const instrument=numeric?{id:'demo-tool-'+def.id,name:'Data contoh · '+def.name,code:'DEMO-'+def.display_order,active:true,condition:'working',revision:1,measurement_mode:'numeric',maintenance_check_ids:[def.id],profile:{kind:'digital',unit:def.unit,minimum:0,maximum:600,decimals:3,tolerance:.02}}:null;
        for(const [i,sample] of def.samples.entries()){
          if(!numeric){outcomes.push({sample_id:sample.id,status:day%4===0?'NG':'OK'});continue;}
          const width=def.limits.maximum-def.limits.minimum,center=(def.limits.minimum+def.limits.maximum)/2;
          const offset=(type==='U'?-.04:.04)+.025*Math.sin(day*.7)+.018*(i-(def.samples.length-1)/2);
          const value=Number((center+width*offset).toFixed(3)),reading_id=id+':'+sample.id;
          readings.set(reading_id,{id:reading_id,instrument_id:instrument.id,instrument_snapshot:instrument,profile_snapshot:instrument.profile,product_snapshot,context,final_value:String(value),check_id:def.id,sample_key:sample.id,confirmed_at:as_of,evidence:{synthetic:true,label:'Data contoh'}});
          outcomes.push({sample_id:sample.id,reading_id,value,status:'OK'});
        }
        records.push({id,definition_id:def.id,definition_version:def.definition_version,definition_snapshot:def,product_snapshot,instrument_snapshot:instrument,context,checked_at,created_at:as_of,saved_at:as_of,outcomes,overall_status:outcomes.every(o=>o.status==='OK')?'OK':'NG'});
      }
    }
  }
  const ports={
    maintenance:{
      getDefinition:async()=>null,
      listDefinitions:async()=>({items:[],next_cursor:null}),
      listRecordsRange:async({scope:filter,limit=500,cursor})=>{
        const matches=records.filter(r=>r.context.production_date>=filter.production_date_from&&r.context.production_date<=filter.production_date_to&&(!filter.line||r.context.line===filter.line)&&(!filter.shift||r.context.shift===filter.shift)&&(!filter.definition_id||r.definition_id===filter.definition_id));
        const start=Number(cursor??0),items=matches.slice(start,start+limit);
        return {items,next_cursor:start+limit<matches.length?String(start+limit):null};
      },
    },
    readings:{getMany:async ids=>ids.map(id=>readings.get(id)).filter(Boolean)},
    settings:{get:async()=>null},
  };
  return {...ports,transaction:callback=>callback(ports)};
}

function markDemo(report){
  report.meta.warnings.push('DEMO_DATA','DEMO_SYNTHETIC_NO_PHOTO');
  // Synthetic observations support the same completeness/statistics pipeline, but
  // must never offer operational photo URLs for evidence that was not captured.
  for(const row of report.rows??[])for(const cell of row.cells)for(const occurrence of cell.occurrences)occurrence.evidence=[];
  for(const group of report.items??[])group.occurrence.evidence=[];
  return report;
}

export function createDemoReportService({clock}){
  function service(input,cursor){const normalized=normalizeScope(input,clock,cursor);return {normalized,reports:createReportService({repositories:demoRepositories(normalized.scope,normalized.as_of),clock})};}
  return {
    async checksheet(input,options={}){const {reports,normalized}=service(input,options.cursor);return markDemo(await reports.checksheet({...normalized.scope,as_of:normalized.as_of},options));},
    async spc(input,options={}){const {reports,normalized}=service(input);return markDemo(await reports.spc({...normalized.scope,as_of:normalized.as_of},options));},
    async subgroups(input,options={}){const {reports,normalized}=service(input,options.cursor);return markDemo(await reports.subgroups({...normalized.scope,as_of:normalized.as_of},options));},
  };
}

export function assertDemoRequest(config,baseline_id){
  if(config.environment!=='development')throw new AppError(404,'NOT_FOUND','Route not found.');
  if(baseline_id)throw new AppError(422,'DEMO_BASELINE_UNSUPPORTED','Data contoh cannot use an operational baseline.');
}
