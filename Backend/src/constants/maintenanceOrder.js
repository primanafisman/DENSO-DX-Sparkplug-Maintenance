import {CATALOG} from './maintenanceCatalog.js';
// Application numbers remain independent of clipped/missing row numbers on source sheets.
const numbers=new Map([...CATALOG].sort((a,b)=>a.display_order-b.display_order).map((d,index)=>[d.id,index+1]));
export function checkNumber(definition){return numbers.get(definition?.id)??(Number.isInteger(definition?.check_number)&&definition.check_number>44?definition.check_number:null);}
