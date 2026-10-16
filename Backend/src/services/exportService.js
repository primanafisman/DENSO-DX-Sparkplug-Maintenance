function cell(value,numeric=false){let text=value===undefined||value===null?'':String(value);if(!numeric&&/^[\s]*[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function createExportService(readingService){return {
  async *readings(input){yield '\uFEFFid,confirmed_at,equipment,value,unit,line,date,shift,sampler,actor\r\n';let cursor;do{const page=await readingService.list({...input,limit:100,cursor});for(const row of page.items){const values=[row.id,row.confirmed_at,row.instrument_snapshot?.name,row.final_value,row.profile_snapshot?.unit,row.context?.line,row.context?.production_date,row.context?.shift,row.context?.sampler,row.actor_id];yield values.map((v,i)=>cell(v,i===3)).join(',')+'\r\n';}cursor=page.next_cursor;}while(cursor);},
};}
