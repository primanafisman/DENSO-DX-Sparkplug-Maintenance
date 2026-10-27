import {CATALOG} from './maintenanceCatalog.js';
// Paper row numbers remain separate from the Admin-configured application number.
const numbers=new Map([...CATALOG].sort((a,b)=>a.display_order-b.display_order).map((d,index)=>[d.id,index+1]));
export const validCheckNumber=number=>Number.isInteger(number)&&number>=1&&number<=10000;
export function checkNumber(definition){return validCheckNumber(definition?.check_number)?definition.check_number:numbers.get(definition?.id)??null;}
