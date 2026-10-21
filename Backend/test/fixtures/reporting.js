import {CATALOG} from '../../src/constants/maintenanceCatalog.js';
export const reportScope={production_date_from:'2026-10-01',production_date_to:'2026-10-21'};
export const reportClock=()=>Date.parse('2026-10-21T10:00:00.000Z');
export async function addReportRecord(repo,{id,definition_id='chart_ee_length',values=[4.49,4.50,4.51,4.50],date='2026-10-01',version=1,missing=false,type='u',instrument_id='g1',status='OK'}={}){
  const def=structuredClone(CATALOG.find(d=>d.id===definition_id));def.definition_version=version;
  const context={line:'17',production_date:date,shift:'day',sampler:'Ldr',...(type?{product_type_id:type}:{})};
  const product_snapshot=type?{id:type,name:'U-Type',code:'U',version:1}:null;
  const instrument={id:instrument_id,name:'Original tool',code:'G1',active:true,profile:{kind:'digital',unit:def.unit,minimum:0,maximum:600,decimals:3,tolerance:.02},revision:1};
  const observations=[];
  for(const [i,sample] of def.samples.entries()){
    if(def.input_method==='ok_ng'){observations.push({sample_id:sample.id,status});continue;}
    if(def.kind==='difference'){
      const before_reading_id=id+'-'+i+'-before',after_reading_id=id+'-'+i+'-after';
      for(const [reading_id,value,stage] of [[before_reading_id,10,'before'],[after_reading_id,10+values[i%values.length],'after']])await repo.readings.createConfirmed({id:reading_id,instrument_id,analysis_id:reading_id,evidence_key:reading_id,confirmation_id:reading_id,instrument_snapshot:instrument,profile_snapshot:instrument.profile,product_snapshot,context,final_value:String(value),check_id:def.id,sample_key:sample.id+':'+stage,confirmed_at:'2026-10-20T00:00:00.000Z',evidence:{}});
      observations.push({sample_id:sample.id,before_reading_id,after_reading_id,value:values[i%values.length],status});continue;
    }
    const reading_id=id+'-'+i;
    if(!(missing&&i===0))await repo.readings.createConfirmed({id:reading_id,instrument_id,analysis_id:reading_id,evidence_key:reading_id,confirmation_id:reading_id,instrument_snapshot:instrument,profile_snapshot:instrument.profile,product_snapshot,context,final_value:String(values[i%values.length]),check_id:def.id,sample_key:sample.id,confirmed_at:'2026-10-20T00:00:00.000Z',created_at:'2026-10-20T00:00:00.000Z',evidence:{source_hash:'hash'}});
    observations.push({sample_id:sample.id,reading_id,value:values[i%values.length],status});
  }
  return repo.maintenance.createRecord({id,definition_id,definition_snapshot:def,product_snapshot,context,observations,outcomes:observations,overall_status:status,checked_at:date+'T08:00:00+07:00',created_at:'2026-10-20T00:00:00.000Z',saved_at:'2026-10-20T00:00:00.000Z'});
}
