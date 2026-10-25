import { it, expect } from 'vitest';
import { DEFAULT_SHIFT_SCHEDULE, validateShiftSchedule, shiftSlots } from './shiftSchedule';
it('validates cyclic minutes and retains stable identities with customized labels', () => {
  expect(validateShiftSchedule(DEFAULT_SHIFT_SCHEDULE)).toBeNull();
  expect(validateShiftSchedule({ day: ['08:10', '13:10'], night: ['22:10', '02:10'] })).toBeNull();
  expect(validateShiftSchedule({ day: ['23:00', '04:00'], night: ['07:00', '15:00'] })).toBeNull();
  expect(validateShiftSchedule({ day: ['08:10', '08:10'], night: ['22:10', '02:10'] })).toMatch(
    /Urutan/,
  );
  expect(validateShiftSchedule({ day: ['08:10', '13:10'], night: ['02:10', '22:10'] })).toMatch(
    /Urutan/,
  );
  expect(validateShiftSchedule({ day: ['', '13:10'], night: ['22:10', '02:10'] })).toMatch(
    /keempat/,
  );
  expect(shiftSlots({ day: ['08:10', '13:10'], night: ['22:10', '02:10'] })[0]).toEqual([
    'day-0745',
    'Shift 1 · 08:10',
  ]);
});
