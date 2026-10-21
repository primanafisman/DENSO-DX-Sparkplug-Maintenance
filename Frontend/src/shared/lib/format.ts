export const number=(value:number|null|undefined,decimals=3)=>value===null||value===undefined?'—':new Intl.NumberFormat('id-ID',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);
export const dateTime=(value:string)=>new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(value));
export const monthLabel=(value:string)=>new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(value+'-01T00:00:00+07:00'));
export const monthRange=(month:string)=>{const [y,m]=month.split('-').map(Number);return {production_date_from:month+'-01',production_date_to:new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)};};
