export function buildSummary(entries,meta,cutoff){
  const daily=new Map(),groups=new Map();let ok=0,ng=0;
  for(const {occurrence:o} of entries){
    const date=o.context?.production_date;if(date>cutoff)continue;
    if(o.overall_status==='OK')ok++;else ng++;
    if(!daily.has(date))daily.set(date,{date,ok:0,ng:0});daily.get(date)[o.overall_status==='OK'?'ok':'ng']++;
    const id=o.definition_snapshot?.id??'unknown';if(!groups.has(id))groups.set(id,{definition_id:id,name:o.definition_snapshot?.name??'Definisi tidak tercatat',total:0,ok:0,ng:0});
    const group=groups.get(id);group.total++;group[o.overall_status==='OK'?'ok':'ng']++;
  }
  return {meta,total:ok+ng,ok,ng,ok_ratio:ok+ng?ok/(ok+ng):null,daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),groups:[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name))};
}
