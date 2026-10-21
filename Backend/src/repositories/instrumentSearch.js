import {createHash} from 'node:crypto';
import {AppError} from '../errors/AppError.js';
export function instrumentSearch(model,transaction){return async({q='',active,condition,measurement_mode,limit=25,cursor,sort='created_at_desc'}={})=>{
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new AppError(422,'INVALID_PAGE','Limit must be 1–100.');
  const fingerprint=createHash('sha256').update(JSON.stringify({q,active,condition,measurement_mode,sort})).digest('hex');
  const where={};
  const rows=await model.findAll({where,limit:10001,order:[['created_at',sort==='created_at_asc'?'ASC':'DESC'],['id',sort==='created_at_asc'?'ASC':'DESC']],transaction});
  if(rows.length>10000)throw new AppError(422,'REGISTRY_TOO_LARGE','Narrow the equipment search.');
  const items=rows.map(row=>JSON.parse(row.payload)).filter(a=>(!q||[a.name,a.code,...a.aliases??[]].some(s=>s?.toLocaleLowerCase().includes(q.toLocaleLowerCase())))&&(active===undefined||(a.active!==false)===active)&&(!condition||(a.condition??'unknown')===condition)&&(!measurement_mode||(a.measurement_mode??'numeric')===measurement_mode));
  let start=0;
  if(cursor){let anchor;try{anchor=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw new AppError(422,'INVALID_CURSOR','Equipment cursor invalid.');}const index=items.findIndex(a=>a.id===anchor.id);if(anchor.fingerprint!==fingerprint||index<0)throw new AppError(422,'INVALID_CURSOR','Equipment search changed; reload.');start=index+1;}
  const page=items.slice(start,start+limit),last=page.at(-1);
  return {items:page,next_cursor:start+limit<items.length?Buffer.from(JSON.stringify({id:last.id,fingerprint})).toString('base64url'):null};
};}
