import {digest} from './reportScope.js';
export function buildChecksheet(entries){
  const rows=new Map();
  for(const {occurrence:o} of entries){
    const def=o.definition_snapshot,equipment=o.instruments.map(a=>a.id+':'+(a.revision??0)).sort();
    const row_id=digest({id:def?.id??'unknown',version:def?.definition_version??0,equipment,shift:o.context?.shift,unit:def?.unit});
    if(!rows.has(row_id))rows.set(row_id,{row_id,definition_id:def?.id??'',definition_version:def?.definition_version??0,name:def?.name??'Definisi tidak tercatat',equipment_id:o.instruments[0]?.id??null,equipment_name:o.instruments.map(a=>a.name).join(', ')||null,shift:o.context?.shift,unit:def?.unit??null,standard:{text:def?.standard_text??'',minimum:def?.limits?.minimum??null,maximum:def?.limits?.maximum??null},input_method:def?.input_method??'ok_ng',cells:[]});
    const row=rows.get(row_id),date=o.context?.production_date;let cell=row.cells.find(c=>c.date===date);
    if(!cell){cell={date,occurrences:[],count:0};row.cells.push(cell);}cell.occurrences.push(o);cell.count++;
  }
  return [...rows.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.row_id.localeCompare(b.row_id));
}
