import {AppError} from '../errors/AppError.js';
import {resolveCheckSchedule,CHECK_TIMEZONE} from '../constants/checkSchedule.js';

export function resolveProduct(product_type_id,settings){
  if(product_type_id===undefined)return null;
  const product=settings.product_types?.find(p=>p.id===product_type_id&&p.active);
  if(!product)throw new AppError(422,'PRODUCT_INVALID','Choose an active configured product Type.');
  return {id:product.id,code:product.code,name:product.name,version:product.version};
}
export function productionDate(timestamp,shift,rollover=12){
  const date=new Date(timestamp);if(!Number.isFinite(date.valueOf()))throw new AppError(422,'INVALID_TIME','Timestamp not valid.');
  const wib=new Date(date.valueOf()+7*3600000),settings=typeof rollover==='object'&&rollover!==null?rollover:null;
  if(settings?.shift_schedule){
    const [hour,minute]=settings.shift_schedule.day[0].split(':').map(Number);
    if(wib.getUTCHours()*60+wib.getUTCMinutes()<hour*60+minute)wib.setUTCDate(wib.getUTCDate()-1);
  }else if(shift==='night'&&wib.getUTCHours()<(settings?(settings.night_rollover_hour??12):rollover))wib.setUTCDate(wib.getUTCDate()-1);
  return wib.toISOString().slice(0,10);
}
export function scheduleAt(timestamp,settings={}){
  const serverTime=new Date(timestamp),calendarDate=productionDate(serverTime,'day'),schedule=resolveCheckSchedule(settings);
  const starts=schedule.map(slot=>Date.parse(`${calendarDate}T${slot.start_time}:00+07:00`));
  const index=starts.findLastIndex(start=>start<=serverTime.valueOf()),slotIndex=index<0?schedule.length-1:index;
  const startsAt=index<0?starts[slotIndex]-86400000:starts[slotIndex],nextStartsAt=starts.find(start=>start>serverTime.valueOf())??starts[0]+86400000;
  const {start_time,...slot}=schedule[slotIndex];
  return {server_time:serverTime.toISOString(),timezone:CHECK_TIMEZONE,calendar_date:calendarDate,production_date:productionDate(serverTime,slot.shift,settings.shift_schedule?settings:settings.night_rollover_hour??12),...slot,starts_at:new Date(startsAt).toISOString(),next_starts_at:new Date(nextStartsAt).toISOString(),schedule};
}
export function snapshotOccurrence(timestamp,settings){const {slot_id,starts_at,timezone}=scheduleAt(timestamp,settings);return {slot_id,starts_at,schedule_version:1,timezone};}
export async function captureProduct(repositories,context){
  const settings=(await repositories?.settings?.get('maintenance-settings'))?.value??{};
  return resolveProduct(context.product_type_id,settings);
}
