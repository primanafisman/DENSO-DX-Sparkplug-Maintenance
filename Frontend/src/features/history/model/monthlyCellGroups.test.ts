import { expect, it } from 'vitest';
import type { MonthlyOccurrence } from './monthlyRows';
import { monthlyCellGroups } from './monthlyCellGroups';
const item = (id: string, line: string, shift: 'day' | 'night', checked_at: string) =>
  ({
    unit: 'mm',
    input_method: 'photo',
    occurrence: { id, checked_at, context: { line, shift } },
  }) as MonthlyOccurrence;
const items = [
  item('ten', '10', 'day', '2026-10-21T05:45:00Z'),
  item('night', '2', 'night', '2026-10-21T14:15:00Z'),
  item('late', '2', 'day', '2026-10-21T05:45:00Z'),
  item('early', '2', 'day', '2026-10-21T00:45:00Z'),
];
it('groups Shift1 then Shift2 with numeric lines and chronological rows for each session', () => {
  expect(
    monthlyCellGroups(items, {}).map((g) => [g.shift, g.items.map((i) => i.occurrence.id)]),
  ).toEqual([
    ['day', ['early', 'late', 'ten']],
    ['night', ['night']],
  ]);
  expect(items[0].occurrence.id).toBe('ten');
});
it('keeps only the selected line and shift without dropping their group labels', () => {
  const groups = monthlyCellGroups(items, { line: '2', shift: 'night' });
  expect(groups).toHaveLength(1);
  expect(groups[0].shift).toBe('night');
  expect(groups[0].items.map((i) => i.occurrence.id)).toEqual(['night']);
  expect(monthlyCellGroups(items, { line: 'missing' })).toEqual([]);
});
