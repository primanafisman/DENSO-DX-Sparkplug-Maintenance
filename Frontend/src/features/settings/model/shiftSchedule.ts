export type ShiftSchedule = { day: [string, string]; night: [string, string] };
export const DEFAULT_SHIFT_SCHEDULE: ShiftSchedule = {
  day: ['07:45', '12:45'],
  night: ['21:15', '01:15'],
};
export function validateShiftSchedule(schedule: ShiftSchedule) {
  const times = [...schedule.day, ...schedule.night];
  if (times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))
    return 'Isi keempat waktu mulai dengan format jam dan menit.';
  const minutes = times.map((time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3)));
  const offsets = minutes.map((value) => (value - minutes[0] + 1440) % 1440);
  return offsets.slice(1).some((offset, i) => offset <= offsets[i])
    ? 'Urutan sesi harus Shift 1 sesi 1 → sesi 2 → Shift 2 sesi 1 → sesi 2. Waktu tidak boleh sama.'
    : null;
}
export function shiftSlots(schedule = DEFAULT_SHIFT_SCHEDULE) {
  return [
    ['day-0745', 'day', 0],
    ['day-1245', 'day', 1],
    ['night-2115', 'night', 0],
    ['night-0115', 'night', 1],
  ].map(([id, shift, index]) => [
    String(id),
    `Shift ${shift === 'day' ? 1 : 2} · ${schedule[shift as 'day' | 'night'][Number(index)]}`,
  ]);
}
