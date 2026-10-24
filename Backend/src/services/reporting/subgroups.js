import {publicInstrument} from '../equipmentPolicy.js';
import {digest,stable} from './reportScope.js';
export function hydrateRecord(record,readingMap){
  const outcomes=record.outcomes??[],ids=[...new Set(outcomes.flatMap(o=>[o.reading_id,o.before_reading_id,o.after_reading_id].filter(Boolean)))];
  const readings=ids.map(id=>readingMap.get(id)).filter(Boolean),instruments=[];
  for(const asset of [record.instrument_snapshot,...readings.map(r=>r.instrument_snapshot)].filter(Boolean))if(!instruments.some(a=>a.id===asset.id&&a.revision===asset.revision))instruments.push(publicInstrument(asset));
  const def=record.definition_snapshot??null;
  const occurrence={id:record.id,checked_at:record.checked_at,context:record.context,slot_id:record.schedule_snapshot?.slot_id??null,overall_status:record.overall_status,outcomes,definition_snapshot:def,product_snapshot:record.product_snapshot??null,instruments,evidence:readings.filter(r=>r.evidence).flatMap(r=>[{reading_id:r.id,variant:'original'},{reading_id:r.id,variant:'crop'}])};
  const values=[],reasons=[];
  const numeric=def&&['numeric','difference'].includes(def.kind);
  const criteria=outcomes.filter(outcome=>outcome.acceptance_limits).map(outcome=>({acceptance_limits:outcome.acceptance_limits,acceptance_source:outcome.acceptance_source??'equipment'}));
  const acceptance=numeric?(criteria[0]??{acceptance_limits:def.limits??{minimum:null,maximum:null},acceptance_source:'inspection'}):null;
  if(numeric){
    if(criteria.length&&(criteria.length!==outcomes.length||criteria.some(item=>stable(item)!==stable(acceptance))))reasons.push('MIXED_ACCEPTANCE_CRITERIA');
    if(instruments.length>1)reasons.push('MIXED_EQUIPMENT_SUBGROUP');
    if(!def.samples?.length||outcomes.length!==def.samples.length||new Set(outcomes.map(o=>o.sample_id)).size!==outcomes.length)reasons.push('INCOMPLETE_SAMPLES');
    for(const sample of def.samples??[]){
      const outcome=outcomes.find(o=>o.sample_id===sample.id);
      const sampleIds=def.kind==='difference'?[outcome?.before_reading_id,outcome?.after_reading_id]:[outcome?.reading_id];
      const source=sampleIds.map(id=>readingMap.get(id));
      if(source.some(r=>!r?.confirmed_at||!r.evidence)){reasons.push('MISSING_CONFIRMED_EVIDENCE');continue;}
      if(source.some((r,i)=>r.profile_snapshot?.unit!==def.unit||stable(r.context)!==stable(record.context)||r.check_id!==def.id||r.sample_key!==(def.kind==='difference'?sample.id+':'+(i===0?'before':'after'):sample.id))){reasons.push('INCOMPATIBLE_EVIDENCE');continue;}
      const numbers=source.map(r=>typeof r.final_value==='string'&&r.final_value.trim()===''?NaN:Number(r.final_value));
      const value=def.kind==='difference'?numbers[1]-numbers[0]:numbers[0];
      if(!Number.isFinite(value)){reasons.push('INVALID_VALUE');continue;}
      if(outcome.value!==undefined&&Math.abs(outcome.value-value)>1e-6){reasons.push('OUTCOME_MISMATCH');continue;}
      values.push(value);
    }
  }
  const complete=!!numeric&&reasons.length===0&&values.length===def.samples.length;
  const xbar=complete?values.reduce((a,b)=>a+b,0)/values.length:null,r=complete&&values.length>1?Math.max(...values)-Math.min(...values):null;
  occurrence.numeric_summary=numeric?{complete,xbar,r}:null;
  const profiles=[...new Set(readings.map(reading=>stable({instrument_id:reading.instrument_id,profile:reading.profile_snapshot,calibration:reading.calibration_snapshot?.id??'unknown'})))].sort();
  const key={definition_id:record.definition_id,definition_version:def?.definition_version??0,line:record.context?.line,process:def?.process,product:record.product_snapshot??{id:null,version:null},unit:def?.unit,instruments:instruments.map(a=>({id:a.id,revision:a.revision??null})).sort((a,b)=>a.id.localeCompare(b.id)),profiles,n:def?.sample_count??def?.samples?.length??0,...(criteria.some(item=>item.acceptance_source==='equipment')?{acceptance}:{})};
  return {occurrence,readings,numeric,values,complete,xbar,r,acceptance,reasons:[...new Set(reasons)],cohort_key:stable(key),cohort_id:digest(key)};
}
