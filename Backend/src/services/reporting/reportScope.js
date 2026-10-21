import {createHash} from 'node:crypto';
import {AppError} from '../../errors/AppError.js';
import {reportInput} from '../../validations/reportValidation.js';
export const stable=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export const digest=value=>createHash('sha256').update(stable(value)).digest('hex');
export function normalizeScope(raw,clock,cursor){
  const parsed=reportInput.safeParse(raw);if(!parsed.success)throw new AppError(422,'REPORT_SCOPE','Invalid report date or filter.');
  const {as_of:requested,...scope}=parsed.data;
  const start=new Date(scope.production_date_from+'T00:00:00Z');
  const anniversary=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+6,1));
  anniversary.setUTCDate(Math.min(start.getUTCDate(),new Date(Date.UTC(anniversary.getUTCFullYear(),anniversary.getUTCMonth()+1,0)).getUTCDate()));
  if(scope.production_date_to<scope.production_date_from||scope.production_date_to>=anniversary.toISOString().slice(0,10))throw new AppError(422,'REPORT_RANGE','Date range must be ordered and shorter than six calendar months.');
  let anchor;if(cursor){try{anchor=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw new AppError(422,'INVALID_CURSOR','Report cursor invalid.');}}
  const as_of=requested??anchor?.as_of??new Date(clock()).toISOString();
  if(!Number.isFinite(Date.parse(as_of))||Date.parse(as_of)>clock())throw new AppError(422,'REPORT_SNAPSHOT','Report snapshot is invalid or in the future.');
  return {scope,as_of:new Date(as_of).toISOString()};
}
export function page(items,{scope,as_of},{limit=25,cursor}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new AppError(422,'INVALID_PAGE','Limit must be 1–100.');
  const fingerprint=digest(scope);let start=0;
  if(cursor){let anchor;try{anchor=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw new AppError(422,'INVALID_CURSOR','Report cursor invalid.');}
    if(anchor.fingerprint!==fingerprint||anchor.as_of!==as_of||!Number.isInteger(anchor.index)||anchor.index<0)throw new AppError(422,'INVALID_CURSOR','Report cursor belongs to another scope or snapshot.');start=anchor.index;
  }
  return {items:items.slice(start,start+limit),next_cursor:start+limit<items.length?Buffer.from(JSON.stringify({index:start+limit,fingerprint,as_of})).toString('base64url'):null};
}
