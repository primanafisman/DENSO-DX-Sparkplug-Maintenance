import {Op} from 'sequelize';
import {randomUUID} from 'node:crypto';
import {connectDatabase} from '../config/db.js';
import {defineModels,definitions} from '../models/index.js';
import {AppError} from '../errors/AppError.js';
import {SCHEMA_VERSION} from '../constants/schemaVersion.js';
import {reportPorts} from './reportPorts.js';
import {instrumentSearch} from './instrumentSearch.js';
const dto=row=>row?JSON.parse(row.payload):null;
export async function createRepositories(config){
  const db=connectDatabase(config),models=defineModels(db);let closing;
  try{await db.authenticate();const version=await models.schema.findByPk('schema-version',{attributes:['payload']});if(dto(version)?.version!==SCHEMA_VERSION)throw new Error('version');}catch{await db.close();throw new AppError(503,'SCHEMA_REQUIRED','Database schema missing or incompatible; run setup to verify/migrate the reviewed schema.');}
  function ports(transaction){
    function store(name){const model=models[name],selected=Object.keys(model.getAttributes());
      async function get(id){return dto(await model.findByPk(id,{attributes:selected,transaction}));}
      function row(input){const data=structuredClone(input);data.id??=randomUUID();data.created_at??=new Date().toISOString();const result={id:data.id,payload:JSON.stringify(data),created_at:data.created_at};for(const field of Object.keys(definitions[name].fields))result[field]=data[field]??data.context?.[field]??'';return {data,result};}
      async function create(input){const {data,result}=row(input);await model.create(result,{transaction});return data;}
      async function update(id,input){const previous=await get(id);if(!previous)return null;const {data,result}=row({...previous,...input,id,created_at:previous.created_at});await model.update(result,{where:{id},transaction});return data;}
      async function list({limit=25,cursor,filters={},sort='created_at_desc'}={}){
        if(!Number.isInteger(limit)||limit<1||limit>100)throw new AppError(422,'INVALID_PAGE','Limit must be 1â€“100.');
        if(!['created_at_desc','created_at_asc'].includes(sort))throw new AppError(422,'INVALID_SORT','Sort field not supported.');
        const direction=sort==='created_at_desc'?'DESC':'ASC',comparison=direction==='DESC'?Op.lt:Op.gt;const where={};
        for(const [key,value] of Object.entries(filters)){if(!selected.includes(key)||['payload','created_at'].includes(key)||typeof value!=='string')throw new AppError(422,'INVALID_FILTER','Filter not supported.');where[key]=value;}
        if(cursor){let anchor;try{anchor=JSON.parse(Buffer.from(cursor,'base64url').toString());if(typeof anchor.id!=='string'||typeof anchor.created_at!=='string')throw new Error();}catch{throw new AppError(422,'INVALID_CURSOR','Cursor not valid.');}where[Op.or]=[{created_at:{[comparison]:anchor.created_at}},{created_at:anchor.created_at,id:{[comparison]:anchor.id}}];}
        const rows=await model.findAll({attributes:selected,where,order:[['created_at',direction],['id',direction]],limit:limit+1,transaction});const more=rows.length>limit;const items=rows.slice(0,limit).map(dto),last=items.at(-1);return {items,next_cursor:more?Buffer.from(JSON.stringify({id:last.id,created_at:last.created_at})).toString('base64url'):null};
      }
      return {get,create,update,list};
    }
    const users=store('users');users.findByUsername=async username=>dto(await models.users.findOne({attributes:Object.keys(models.users.getAttributes()),where:{username},transaction}));users.getById=users.get;
    const instruments=store('instruments'),calibrations=store('calibrations');delete calibrations.update;
    instruments.search=instrumentSearch(models.instruments,transaction);
    const readings=store('readings');readings.createConfirmed=readings.create;delete readings.create;delete readings.update;
    readings.getByConfirmation=async confirmation_id=>dto(await models.readings.findOne({attributes:Object.keys(models.readings.getAttributes()),where:{confirmation_id},transaction}));
    readings.getByAnalysis=async analysis_id=>dto(await models.readings.findOne({attributes:Object.keys(models.readings.getAttributes()),where:{analysis_id},transaction}));
    readings.getByEvidence=async evidence_key=>dto(await models.readings.findOne({attributes:Object.keys(models.readings.getAttributes()),where:{evidence_key},transaction}));
    const defs=store('maintenanceDefinitions'),records=store('maintenanceRecords');
    const maintenance={getDefinition:defs.get,listDefinitions:defs.list,createDefinition:defs.create,updateDefinition:defs.update,createRecord:records.create,getRecord:records.get,updateRecord:records.update,listRecords:records.list};
    const settings=store('settings');const originalUpdate=settings.update;settings.update=async(id,input)=>await settings.get(id)?originalUpdate(id,input):settings.create({id,...input});
    const reporting=reportPorts(models,transaction,settings);maintenance.listRecordsRange=reporting.listRecordsRange;readings.getMany=reporting.getMany;
    const auditStore=store('audit');const audit={append:auditStore.create};
    return {users,instruments,calibrations,readings,maintenance,settings,audit,revisions:reporting.revisions,transaction:callback=>db.transaction(tx=>callback(ports(tx))),close:()=>closing??=db.close()};
  }
  return ports();
}
