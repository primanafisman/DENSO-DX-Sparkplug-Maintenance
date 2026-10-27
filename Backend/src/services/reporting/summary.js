import {checkNumber} from '../../constants/maintenanceOrder.js';
export function buildSummary(entries,meta,cutoff,numbers=new Map()){
  const daily=new Map(),groups=new Map();let ok=0,ng=0;
  for(const {occurrence:o} of entries){
    const date=o.context?.production_date;if(date>cutoff)continue;
    if(o.overall_status==='OK')ok++;else ng++;
    if(!daily.has(date))daily.set(date,{date,ok:0,ng:0});daily.get(date)[o.overall_status==='OK'?'ok':'ng']++;
    const id=o.definition_snapshot?.id??'unknown';if(!groups.has(id))groups.set(id,{definition_id:id,check_number:numbers.get(id)??checkNumber(o.definition_snapshot),name:o.definition_snapshot?.name??'Definisi tidak tercatat',total:0,ok:0,ng:0,latest_checked_at:null});
    const group=groups.get(id);group.total++;group[o.overall_status==='OK'?'ok':'ng']++;
    const checkedAt=typeof o.checked_at==='string'?Date.parse(o.checked_at):NaN;
    if(Number.isFinite(checkedAt)&&(group.latest_checked_at===null||checkedAt>Date.parse(group.latest_checked_at)))group.latest_checked_at=o.checked_at;
  }
  const sortedGroups=[...groups.values()].sort((a,b)=>(a.check_number??Number.MAX_SAFE_INTEGER)-(b.check_number??Number.MAX_SAFE_INTEGER)||a.name.localeCompare(b.name)||a.definition_id.localeCompare(b.definition_id));
  return {meta,total:ok+ng,ok,ng,ok_ratio:ok+ng?ok/(ok+ng):null,daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),groups:sortedGroups};
}
