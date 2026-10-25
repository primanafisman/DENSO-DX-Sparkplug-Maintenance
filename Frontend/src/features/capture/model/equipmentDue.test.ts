import { expect, it } from 'vitest';
import { schedule } from '../../../test/fixtures';
import type { MaintenanceDue } from '../../../shared/lib/contracts';
import { machineDueState } from './equipmentDue';
const context = {
  line: '17',
  production_date: schedule.production_date,
  shift: schedule.shift,
  sampler: 'Ldr',
};
const due = {
  schedule,
  line: '17',
  items: [
    {
      definition_id: 'machine',
      equipment: [
        { instrument_id: 'mc1', state: 'completed', completed_record_id: 'r1' },
        { instrument_id: 'mc2', state: 'pending', completed_record_id: null },
      ],
    },
  ],
} as MaintenanceDue;
it('distinguishes two tools sharing the same inspection without making the second completed', () => {
  expect(machineDueState(due, 'machine', context, schedule.server_time, 'mc1')).toBe('completed');
  expect(machineDueState(due, 'machine', context, schedule.server_time, 'mc2')).toBe('pending');
  expect(machineDueState(due, 'other', context, schedule.server_time, 'mc2')).toBeUndefined();
});
it('never applies another line, shift or occurrence status to an older retained photo', () => {
  expect(
    machineDueState(due, 'machine', { ...context, line: '1' }, schedule.server_time, 'mc1'),
  ).toBeUndefined();
  expect(machineDueState(due, 'machine', context, '2026-10-20T01:00:00Z', 'mc1')).toBeUndefined();
  expect(
    machineDueState(due, 'machine', { ...context, shift: 'night' }, schedule.server_time, 'mc1'),
  ).toBeUndefined();
});
