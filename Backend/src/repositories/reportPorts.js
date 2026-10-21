import {Op} from 'sequelize';
import {createHash,randomUUID} from 'node:crypto';
import {AppError} from '../errors/AppError.js';
const dto=row=>row?JSON.parse(row.payload):null;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invalid=(message,code='INVALID_CURSOR')=>new AppError(422,code,message);

export function reportPorts(models,transaction,settings){
  async function listRecordsRange({scope,limit=500,cursor,as_of}){
    const allowed=['production_date_from','production_date_to','line','shift','definition_id'];
    if(!scope||Object.keys(scope).some(k=>!allowed.includes(k))||Object.values(scope).some(v=>typeof v!=='string'))throw invalid('Report scope filter not supported.','INVALID_FILTER');
    if(!Number.isInteger(limit)||limit<1||limit>500)throw invalid('Report page limit must be 1–500.','INVALID_PAGE');
    if(!Number.isFinite(Date.parse(as_of)))throw invalid('Report snapshot is invalid.','INVALID_SNAPSHOT');
    const fingerprint=hash({scope:Object.fromEntries(Object.entries(scope).sort()),as_of});
    const where={production_date:{[Op.gte]:scope.production_date_from,[Op.lte]:scope.production_date_to},created_at:{[Op.lte]:as_of}};
    for(const key of ['line','shift','definition_id'])if(scope[key]!==undefined)where[key]=scope[key];
    if(cursor){let anchor;try{anchor=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw invalid('Report cursor is invalid.');}
      if(anchor?.fingerprint!==fingerprint||typeof anchor.id!=='string'||typeof anchor.date!=='string')throw invalid('Report cursor belongs to another scope or snapshot.');
      where[Op.or]=[{production_date:{[Op.gt]:anchor.date}},{production_date:anchor.date,id:{[Op.gt]:anchor.id}}];
    }
    const rows=await models.maintenanceRecords.findAll({where,order:[['production_date','ASC'],['id','ASC']],limit:limit+1,transaction});
    const items=rows.slice(0,limit).map(dto),last=items.at(-1);
    return {items,next_cursor:rows.length>limit?Buffer.from(JSON.stringify({id:last.id,date:last.context?.production_date??last.production_date,fingerprint})).toString('base64url'):null};
  }
  async function getMany(ids){
    if(!Array.isArray(ids)||ids.length>200000||ids.some(id=>typeof id!=='string'))throw invalid('Reading IDs invalid.','INVALID_FILTER');
    const result=[],unique=[...new Set(ids)];
    for(let i=0;i<unique.length;i+=500)result.push(...(await models.readings.findAll({where:{id:{[Op.in]:unique.slice(i,i+500)}},transaction})).map(dto));
    return result;
  }
  const prefix=entity=>'rev:'+hash(entity).slice(0,16)+':';
  const revisions={
    async create(value){if(typeof value.entity_id!=='string')throw invalid('Revision entity required.','INVALID_FILTER');return settings.create({...value,id:value.id??prefix(value.entity_id)+randomUUID()});},
    async get(id){const value=await settings.get(id);return value?.entity_id?value:null;},
    async list({entity_id,limit=25,cursor}={}){
      if(typeof entity_id!=='string'||!Number.isInteger(limit)||limit<1||limit>100)throw invalid('Revision scope invalid.','INVALID_PAGE');
      const where={id:{[Op.like]:prefix(entity_id)+'%'}};
      if(cursor){let anchor;try{anchor=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw invalid('Revision cursor invalid.');}
        if(anchor.entity_id!==entity_id||typeof anchor.id!=='string'||typeof anchor.created_at!=='string')throw invalid('Revision cursor belongs to another entity.');
        where[Op.or]=[{created_at:{[Op.lt]:anchor.created_at}},{created_at:anchor.created_at,id:{[Op.lt]:anchor.id}}];
      }
      const rows=await models.settings.findAll({where,order:[['created_at','DESC'],['id','DESC']],limit:limit+1,transaction});
      const items=rows.slice(0,limit).map(dto),last=items.at(-1);
      return {items,next_cursor:rows.length>limit?Buffer.from(JSON.stringify({id:last.id,created_at:last.created_at,entity_id})).toString('base64url'):null};
    },
  };
  return {listRecordsRange,getMany,revisions};
}
