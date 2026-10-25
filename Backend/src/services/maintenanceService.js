import {createMaintenanceDueService,maintenanceOccurrence,recordCompletesOccurrence} from './maintenanceDueService.js';
import {machineEquipmentCheck,recordEquipmentId} from './machineEquipmentOccurrence.js';
import {isDeepStrictEqual} from 'node:util';
import {AppError} from '../errors/AppError.js';
import {productionDate,scheduleAt,snapshotOccurrence,resolveProduct} from './productionContextService.js';
import {assertNumericEquipment} from './equipmentPolicy.js';
import {snapshotAcceptance,acceptanceStatus} from './acceptancePolicy.js';
import {createDefinitionService} from './definitionService.js';
import {archiveRevision} from '../utils/revision.js';
import {DEFAULT_MAINTENANCE_SETTINGS} from '../constants/maintenanceSettings.js';
import {publicXrOrigin,isPrivateXrOrigin} from './illustrativeXrOrigin.js';
export {productionDate} from './productionContextService.js';
import {maintenanceInput,settingsInput} from '../validations/maintenanceValidation.js';
function validate(schema,input){const parsed=schema.safeParse(input);if(!parsed.success)throw new AppError(422,'MAINTENANCE_FIELDS','Check maintenance fields.');return parsed.data;}
export function createMaintenanceService({repositories,clock}){
  const definitions=createDefinitionService({repositories,clock});
  // The application runs one API writer. Serialize same-line/check saves so
  // concurrent retry transactions observe the first committed occurrence.
  const recordWrites=new Map();
  async function serializeRecord(input,write){
    const key=JSON.stringify([input.context.line,input.definition_id]),previous=recordWrites.get(key)??Promise.resolve(),pending=previous.catch(()=>{}).then(write);
    recordWrites.set(key,pending);
    try{return await pending;}finally{if(recordWrites.get(key)===pending)recordWrites.delete(key);}
  }
  async function settings(){return (await repositories.settings.get('maintenance-settings'))?.value||structuredClone(DEFAULT_MAINTENANCE_SETTINGS);}
  const definition=definitions.get;
  async function priorMachineRecord(tx,def,input,options,instrument_id){
    const occurrence=maintenanceOccurrence(def,input.checked_at,options),date=stamp=>new Date(Date.parse(stamp)+7*3600000).toISOString().slice(0,10),scope={line:input.context.line,definition_id:def.id,production_date_from:date(new Date(Date.parse(occurrence.starts_at)-86400000).toISOString()),production_date_to:date(occurrence.next_starts_at)};
    let cursor,scanned=0;
    do{const page=await tx.maintenance.listRecordsRange({scope,cursor,limit:500,as_of:new Date(clock()).toISOString()});
      const found=page.items.find(record=>recordEquipmentId(record)===instrument_id&&recordCompletesOccurrence(def,record,occurrence,clock(),options));if(found)return found;
      cursor=page.next_cursor;scanned+=page.items.length;if(cursor&&scanned>=50000)throw new AppError(503,'DUE_CAPACITY','Too many records in the current schedule window.');
    }while(cursor);
    return null;
  }
  return {
    due:createMaintenanceDueService({repositories,clock},definitions,settings),
    async schedule(){
      return scheduleAt(clock(),await settings());
    },
    async catalog(filters={}){const items=(await definitions.all()).filter(def=>(filters.include_inactive||def.active!==false)&&(!filters.group||def.group===filters.group)&&(!filters.kind||def.kind===filters.kind)&&(!filters.requirement||def.requirement_tags.includes(filters.requirement)));return {items,source_gaps:{missing_rows:[17,18,19,20,21,22,23],clipped_row:45},count:items.length};},
    getSettings:settings,
    async updateSettings(input,actor){const parsed=validate(settingsInput,input);const {review_reason,...data}=parsed;return repositories.transaction(async tx=>{const previous=await tx.settings.get('maintenance-settings'),value={...previous?.value,...data};if(data.product_types)value.product_types=data.product_types.map(product=>{const old=previous?.value?.product_types?.find(p=>p.id===product.id);const unchanged=old&&old.code===product.code&&old.name===product.name&&old.active===product.active;return {...product,version:unchanged?old.version:(old?.version??0)+1};});const effective_at=new Date(clock()).toISOString();if(previous?.version)await archiveRevision(tx,{entity_id:'maintenance-settings',version:previous.version,value:previous.value,actor_id:actor.id,reason:'Preserved before revision',effective_at:previous.effective_at??null,archived_at:effective_at});const saved=await tx.settings.update('maintenance-settings',{value,version:(previous?.version||0)+1,effective_at});await archiveRevision(tx,{entity_id:'maintenance-settings',version:saved.version,value,actor_id:actor.id,reason:review_reason||'Settings updated (legacy client)',effective_at,archived_at:effective_at});await tx.audit.append({actor_id:actor.id,action:'maintenance_settings_updated',version:saved.version});return saved;});},
    createDefinition:definitions.create,setDefinitionStatus:definitions.status,updateDefinition:definitions.update, definitionRevisions:definitions.revisions,
    async createRecord(raw,actor){const input=validate(maintenanceInput,raw),options=await settings();if(!options.lines.includes(input.context.line))throw new AppError(422,'LINE_INVALID','Choose a configured line.');if(!options.allowed_samplers.includes(input.context.sampler))throw new AppError(422,'SAMPLER_INVALID','Choose a configured sampler.');if(productionDate(input.checked_at,input.context.shift,options.night_rollover_hour)!==input.context.production_date)throw new AppError(422,'PRODUCTION_DATE','Timestamp differs from WIB production date/shift.');
      return serializeRecord(input,()=>repositories.transaction(async tx=>{const def=await definition(input.definition_id,tx);if(def.active===false)throw new AppError(422,'MAINTENANCE_INACTIVE','Inspection is inactive; choose an active check.');if(input.definition_version!==undefined&&input.definition_version!==def.definition_version)throw new AppError(409,'DEFINITION_VERSION_CONFLICT','Standar pemeriksaan berubah. Tinjau versi terbaru dan mulai pemeriksaan baru.');if(!def.intervals.includes(input.interval)||!def.triggers.includes(input.trigger)||!def.shifts.includes(input.context.shift))throw new AppError(422,'METHOD_OPTIONS','Select allowed interval, trigger and shift.');const required=def.samples.map(s=>s.id);if(input.observations.length!==required.length||new Set(input.observations.map(o=>o.sample_id)).size!==required.length||input.observations.some(o=>!required.includes(o.sample_id)))throw new AppError(422,'SAMPLES_REQUIRED','Fill each required sample exactly once.');const used=new Set(),outcomes=[];let product_snapshot;let instrument_snapshot=null;if(def.input_method==='ok_ng'&&input.instrument_id){instrument_snapshot=await tx.instruments.get(input.instrument_id);if(!instrument_snapshot?.active||!instrument_snapshot.maintenance_check_ids?.includes(def.id))throw new AppError(422,'EVIDENCE_EQUIPMENT','Select enabled equipment linked to this check.');}
        async function number(readingId,sample,stage){if(used.has(readingId))throw new AppError(422,'DUPLICATE_EVIDENCE','Each sample/stage needs its own photo reading.');used.add(readingId);const reading=await tx.readings.get(readingId);if(!reading?.evidence||!reading.confirmed_at)throw new AppError(422,'CONFIRMED_PHOTO_REQUIRED','Confirm photo evidence before maintenance save.');if(reading.check_id!==def.id||reading.sample_key!==(stage?sample+':'+stage:sample))throw new AppError(422,'CHECK_SAMPLE_CONFLICT','Reading belongs to another check/sample/stage.');if(!isDeepStrictEqual(reading.context,input.context))throw new AppError(422,'EVIDENCE_CONTEXT','Photo line/date/shift/sampler context differs.');if(machineEquipmentCheck(def)&&reading.machine_occurrence&&reading.machine_occurrence.key!==maintenanceOccurrence(def,input.checked_at,options).key)throw new AppError(422,'EVIDENCE_OCCURRENCE','Photo belongs to another inspection occurrence; capture a new measurement.');if(reading.profile_snapshot?.unit?.toLowerCase()!==def.unit?.toLowerCase())throw new AppError(422,'EVIDENCE_UNIT','Reading unit differs from specification.');const current=await tx.instruments.get(reading.instrument_id);assertNumericEquipment(current,{requireProfile:false});if(!current?.maintenance_check_ids?.includes(def.id))throw new AppError(422,'EVIDENCE_EQUIPMENT','Equipment is not linked to this check.');if(input.instrument_id&&input.instrument_id!==reading.instrument_id)throw new AppError(422,'EVIDENCE_EQUIPMENT','Selected equipment differs from evidence.');if(reading.product_snapshot){if(product_snapshot&&!isDeepStrictEqual(product_snapshot,reading.product_snapshot))throw new AppError(422,'PRODUCT_SNAPSHOT_CONFLICT','Samples have different product Type versions.');product_snapshot=reading.product_snapshot;}instrument_snapshot??=reading.instrument_snapshot?structuredClone(reading.instrument_snapshot):null;return {value:Number(reading.final_value),acceptance:snapshotAcceptance(reading.instrument_snapshot,def)};}
        for(const observation of input.observations){let value,status,acceptance;if(def.input_method==='ok_ng'){if(!['OK','NG'].includes(observation.status))throw new AppError(422,'STATUS_REQUIRED','Choose OK or NG.');status=observation.status;}else{if(def.kind==='difference'){if(!observation.before_reading_id||!observation.after_reading_id)throw new AppError(422,'DIFFERENCE_PHOTOS','Provide before and after photo readings.');const after=await number(observation.after_reading_id,observation.sample_id,'after'),before=await number(observation.before_reading_id,observation.sample_id,'before');if(!isDeepStrictEqual(after.acceptance,before.acceptance))throw new AppError(422,'ACCEPTANCE_SNAPSHOT_CONFLICT','Before and after evidence use different acceptance criteria.');value=after.value-before.value;acceptance=after.acceptance;}else{if(!observation.reading_id)throw new AppError(422,'READING_REQUIRED','Provide confirmed photo reading.');const measured=await number(observation.reading_id,observation.sample_id);value=measured.value;acceptance=measured.acceptance;}if(!Number.isFinite(value))throw new AppError(422,'READING_INVALID','Confirmed number invalid.');status=acceptanceStatus(value,acceptance.acceptance_limits);}outcomes.push({...observation,value:value===undefined?undefined:Number(value.toFixed(6)),status,...acceptance});}
        if(machineEquipmentCheck(def)&&instrument_snapshot?.id){const previous=await priorMachineRecord(tx,def,input,options,instrument_snapshot.id);if(previous){if(isDeepStrictEqual(previous.observations,input.observations)&&isDeepStrictEqual(previous.context,input.context)&&previous.interval===input.interval&&previous.trigger===input.trigger)return previous;throw new AppError(409,'MAINTENANCE_OCCURRENCE_COMPLETED','This equipment was already inspected in the current occurrence.');}}
        product_snapshot??=resolveProduct(input.context.product_type_id,options);const record=await tx.maintenance.createRecord({...input,product_snapshot,instrument_snapshot,schedule_snapshot:snapshotOccurrence(input.checked_at,options),actor_id:actor.id,definition_snapshot:def,settings_snapshot:options,outcomes,overall_status:outcomes.every(o=>o.status==='OK')?'OK':'NG',saved_at:new Date(clock()).toISOString(),created_at:new Date(clock()).toISOString()});await tx.audit.append({actor_id:actor.id,action:'maintenance_record_created',entity_id:record.id,overall_status:record.overall_status});return record;
      }));
    },
    async deleteRecord(id,actor){return repositories.transaction(async tx=>{
      const record=await tx.maintenance.getRecord(id);
      if(!record)throw new AppError(404,'MAINTENANCE_NOT_FOUND','Maintenance record not found.');
      if(!record.deleted_at){
        const deleted_at=new Date(clock()).toISOString();
        await tx.maintenance.updateRecord(id,{deleted_at,deleted_by:actor.id});
        await tx.audit.append({actor_id:actor.id,action:'maintenance_record_deleted',entity_id:id,deleted_at});
      }
      return {id,deleted:true};
    });},
    async list(input={}){
      const {limit=25,cursor,sort,...filters}=input;
      if(!Number.isInteger(limit)||limit<1||limit>100)throw new AppError(422,'INVALID_PAGE','Limit must be 1–100.');
      const items=[];let next=cursor,scanned=0;
      do{
        const part=await repositories.maintenance.listRecords({limit:100,cursor:next,sort,filters});
        scanned+=part.items.length;
        for(const record of part.items)if(!record.deleted_at){
          if(items.length===limit){const last=items.at(-1);return {items,next_cursor:Buffer.from(JSON.stringify({id:last.id,created_at:last.created_at})).toString('base64url')};}
          items.push(isPrivateXrOrigin(record.origin)?{...record,origin:publicXrOrigin(record.origin)}:record);
        }
        next=part.next_cursor;
        if(next&&scanned>100000)throw new AppError(422,'HISTORY_TOO_LARGE','Narrow history filters.');
      }while(next);
      return {items,next_cursor:null};
    },
  };
}

