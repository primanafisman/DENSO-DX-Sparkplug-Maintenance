export const CHECK_TIMEZONE='Asia/Jakarta';
export const CHECK_SCHEDULE=Object.freeze([
  {shift:'night',start_time:'01:15'},
  {shift:'day',start_time:'07:45'},
  {shift:'day',start_time:'12:45'},
  {shift:'night',start_time:'21:15'},
].map(({shift,start_time})=>Object.freeze({
  slot_id:`${shift}-${start_time.replace(':','')}`,
  shift,
  shift_label:shift==='day'?'Shift 1':'Shift 2',
  slot_label:`${shift==='day'?'Shift 1':'Shift 2'} · ${start_time} WIB`,
  start_time,
})));
