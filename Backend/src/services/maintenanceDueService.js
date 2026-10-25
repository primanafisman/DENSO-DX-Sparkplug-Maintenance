import {AppError} from '../errors/AppError.js';
import {resolveCheckSchedule,DEFAULT_SHIFT_SCHEDULE} from '../constants/checkSchedule.js';
import {DEFAULT_MAINTENANCE_SETTINGS} from '../constants/maintenanceSettings.js';
import {scheduleAt} from './productionContextService.js';
import {eligibleMachineEquipment,recordEquipmentId,operationalRecord} from './machineEquipmentOccurrence.js';
const DAY=86400000;
const dateAt=ms=>new Date(ms).toISOString().slice(0,10);
const start=(date,time)=>Date.parse(date+'T'+time+':00+07:00');
export function maintenanceOccurrence(def,timestamp,settings){
  const now=new Date(timestamp).valueOf(),schedule=scheduleAt(now,settings),interval=def.intervals[0],times=settings?.shift_schedule??DEFAULT_SHIFT_SCHEDULE;
  const version=def.definition_version??1,prefix=def.id+':v'+version+':';
  if(def.occurrence_rule?.slot_ids?.length){
    const events=[],slots=resolveCheckSchedule(settings);for(let offset=-8;offset<=8;offset++){const date=dateAt(Date.parse(schedule.calendar_date+'T12:00:00Z')+offset*DAY);for(const slot of slots){if(!def.occurrence_rule.slot_ids.includes(slot.slot_id)||!def.shifts.includes(slot.shift))continue;const ms=start(date,slot.start_time),s=scheduleAt(ms,settings),weekday=new Date(s.production_date+'T12:00:00Z').getUTCDay()||7;if(interval==='weekly'&&def.occurrence_rule.weekdays?.length&&!def.occurrence_rule.weekdays.includes(weekday))continue;events.push(ms);}}
    events.sort((a,b)=>a-b);const begin=events.findLast(ms=>ms<=now),end=events.find(ms=>ms>now);if(begin===undefined||end===undefined)throw new AppError(422,'SCHEDULE_RULE','No valid inspection slot for the selected shift and weekday.');
    return {key:prefix+'slot:'+new Date(begin).toISOString(),starts_at:new Date(begin).toISOString(),next_starts_at:new Date(end).toISOString(),basis:'configured_slots'};
  }
  let begin,end,basis=interval;
  if(interval==='per_shift'){
    // A shift spans both of its inspection slots, including midnight.
    const boundaries=[-DAY,0,DAY].flatMap(offset=>[start(schedule.calendar_date,times.day[0])+offset,start(schedule.calendar_date,times.night[0])+offset]).sort((a,b)=>a-b);
    begin=boundaries.findLast(ms=>ms<=now);end=boundaries.find(ms=>ms>now);
  }else if(interval==='daily'||interval==='weekly'){
    begin=start(schedule.production_date,times.day[0]);if(interval==='weekly'){const weekday=new Date(schedule.production_date+'T12:00:00Z').getUTCDay()||7;begin-=(weekday-1)*DAY;}end=begin+(interval==='weekly'?7:1)*DAY;
  }else{
    // Legacy paper times are guidance. Until reviewed slots are configured,
    // repeated checks follow the four server sessions requested for this pilot.
    begin=Date.parse(schedule.starts_at);end=Date.parse(schedule.next_starts_at);basis='server_sessions';
  }
  return {key:prefix+basis+':'+new Date(begin).toISOString(),starts_at:new Date(begin).toISOString(),next_starts_at:new Date(end).toISOString(),basis};
}
export function recordCompletesOccurrence(d,record,occurrence,now,settings,product_type_id){
  if(!operationalRecord(record)||record.definition_id!==d.id||(record.definition_snapshot?.definition_version??record.definition_version)!==d.definition_version||d.inspection_target!=='machine'&&product_type_id&&record.context?.product_type_id!==product_type_id||!Number.isFinite(Date.parse(record.checked_at))||Date.parse(record.checked_at)>now||Date.parse(record.saved_at)>now||!['OK','NG'].includes(record.overall_status))return false;
  const outcomes=record.outcomes??[],required=d.samples.map(s=>s.id);
  if(outcomes.length!==required.length||new Set(outcomes.map(o=>o.sample_id)).size!==required.length||outcomes.some(o=>!required.includes(o.sample_id)||!['OK','NG'].includes(o.status)||d.input_method!=='ok_ng'&&!Number.isFinite(o.value)))return false;
  const historical=record.occurrence_snapshot??maintenanceOccurrence(record.definition_snapshot??d,record.checked_at,record.settings_snapshot??DEFAULT_MAINTENANCE_SETTINGS);
  return historical.key===occurrence.key;
}
export function createMaintenanceDueService({repositories,clock},definitions,getSettings){
  return async function due({line,product_type_id}){
    const now=clock(),settings=await getSettings();if(!settings.lines.includes(line))throw new AppError(422,'LINE_INVALID','Choose a configured line.');if(product_type_id&&!settings.product_types?.some(p=>p.id===product_type_id&&p.active))throw new AppError(422,'PRODUCT_INVALID','Choose an active product Type.');
    const schedule=scheduleAt(now,settings),defs=(await definitions.all()).filter(d=>d.active!==false),records=[];
    const scope={line,production_date_from:dateAt(Date.parse(schedule.calendar_date+'T12:00:00Z')-10*DAY),production_date_to:schedule.calendar_date};let cursor;
    do{const page=await repositories.maintenance.listRecordsRange({scope,limit:500,cursor,as_of:new Date(now).toISOString()});records.push(...page.items);cursor=page.next_cursor;if(cursor&&records.length>=50000)throw new AppError(503,'DUE_CAPACITY','Too many records in the current schedule window.');}while(cursor);
    const instruments=[];let instrumentCursor;
    if(repositories.instruments?.list)do{const page=await repositories.instruments.list({limit:100,cursor:instrumentCursor});instruments.push(...page.items);instrumentCursor=page.next_cursor;if(instrumentCursor&&instruments.length>=10000)throw new AppError(503,'REGISTRY_CAPACITY','Equipment registry exceeds supported capacity.');}while(instrumentCursor);
    const items=defs.map(d=>{
      const occurrence=maintenanceOccurrence(d,now,settings),eligible=instruments.filter(asset=>eligibleMachineEquipment(asset,d));
      const assigned=eligible.filter(asset=>!asset.area||asset.area===line),assets=assigned.length?assigned:eligible;
      // Machine checks are line scoped even when a legacy definition has not
      // yet been classified or a product Type happens to be selected.
      const matches=records.filter(record=>recordCompletesOccurrence(d,record,occurrence,now,settings,assets.length?undefined:product_type_id));
      const equipment=assets.map(asset=>{const completed=matches.find(record=>recordEquipmentId(record)===asset.id);return {instrument_id:asset.id,state:completed?'completed':'pending',completed_record_id:completed?.id??null};});
      const completed=equipment.length?(equipment.every(item=>item.state==='completed')?matches[0]:null):matches[0];
      return {definition_id:d.id,definition_version:d.definition_version,state:!d.shifts.includes(schedule.shift)?'not_scheduled':completed?'completed':'pending',completed_record_id:completed?.id??null,equipment,occurrence_key:occurrence.key,starts_at:occurrence.starts_at,next_starts_at:occurrence.next_starts_at,basis:occurrence.basis};
    });
    return {schedule,line,...(product_type_id?{product_type_id}:{}),items,pending_count:items.filter(i=>i.state==='pending').length,completed_count:items.filter(i=>i.state==='completed').length};
  };
}
