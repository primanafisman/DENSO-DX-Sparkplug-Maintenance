export const CHECK_TIMEZONE='Asia/Jakarta';
export const DEFAULT_SHIFT_SCHEDULE=Object.freeze({day:Object.freeze(['07:45','12:45']),night:Object.freeze(['21:15','01:15'])});
// These identities are retained when an administrator changes the start times.
const SLOTS=Object.freeze([
  {slot_id:'day-0745',shift:'day',index:0},
  {slot_id:'day-1245',shift:'day',index:1},
  {slot_id:'night-2115',shift:'night',index:0},
  {slot_id:'night-0115',shift:'night',index:1},
]);
export function resolveCheckSchedule(settings={}){
  const times=settings.shift_schedule??DEFAULT_SHIFT_SCHEDULE;
  return SLOTS.map(({slot_id,shift,index})=>{
    const start_time=times[shift][index],shift_label=shift==='day'?'Shift 1':'Shift 2';
    return Object.freeze({slot_id,shift,shift_label,slot_label:`${shift_label} · ${start_time} WIB`,start_time});
  }).sort((a,b)=>a.start_time.localeCompare(b.start_time));
}
export const CHECK_SCHEDULE=Object.freeze(resolveCheckSchedule());
