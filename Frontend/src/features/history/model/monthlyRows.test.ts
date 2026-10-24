import { expect, it } from 'vitest';
import { fixtureDefinition } from '../../../test/fixtures';
import { monthlyRows } from './monthlyRows';
import { historyRow, historyOccurrence } from '../test/monthlyFixtures';

it('merges shifts, equipment and versions into one numbered row without mutating evidence', () => {
  const night = historyOccurrence('night', {
    checked_at: '2026-10-21T14:15:00Z',
    overall_status: 'NG',
    slot_id: 'night-2115',
    context: { line: '17', production_date: '2026-10-21', shift: 'night', sampler: 'Other' },
  });
  const rows = [
    historyRow(),
    historyRow({
      row_id: 'row-night',
      definition_version: 2,
      name: 'EE Cutting baru',
      equipment_id: 'g2',
      equipment_name: 'Kaliper 2',
      shift: 'night',
      cells: [{ date: '2026-10-21', count: 1, occurrences: [night] }],
    }),
  ];
  const before = structuredClone(rows),
    result = monthlyRows(rows);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    check_number: 44,
    definition_id: 'chart_ee_length',
    name: 'EE Cutting baru',
  });
  expect(result[0].cells[0].items.map(({ occurrence }) => occurrence.id)).toEqual(['day', 'night']);
  expect(result[0].cells[0].count).toBe(2);
  expect(result[0].cells[0].items[1].occurrence).toBe(night);
  expect(rows).toEqual(before);
});

it('sorts stable check numbers and removes only duplicate record IDs across fetched rows', () => {
  const rows = [
    historyRow({ check_number: null }),
    historyRow({ row_id: 'duplicate' }),
    historyRow({
      row_id: 'first',
      check_number: 1,
      definition_id: 'packing',
      name: 'Packing',
      cells: [{ date: '2026-10-22', count: 1, occurrences: [historyOccurrence('packing')] }],
    }),
  ];
  const result = monthlyRows(rows);
  expect(result.map((row) => row.check_number)).toEqual([1, 44]);
  expect(result[1].cells[0].count).toBe(1);
});

it('keeps each historical occurrence unit and method instead of relabelling merged values', () => {
  const pressure = historyOccurrence('pressure', {
    definition_snapshot: fixtureDefinition({ unit: 'MPa' }),
    numeric_summary: { complete: true, xbar: 0.425, r: 0.01 },
  });
  const legacy = historyOccurrence('legacy', { definition_snapshot: null });
  const visual = historyOccurrence('visual', {
    definition_snapshot: fixtureDefinition({ unit: null, input_method: 'ok_ng' }),
    numeric_summary: null,
  });
  const result = monthlyRows([
    historyRow(),
    historyRow({
      row_id: 'pressure',
      unit: 'MPa',
      definition_version: 2,
      cells: [{ date: '2026-10-21', count: 3, occurrences: [pressure, legacy, visual] }],
    }),
  ]);
  expect(
    result[0].cells[0].items.map((item) => [item.occurrence.id, item.unit, item.input_method]),
  ).toEqual([
    ['day', 'mm', 'photo'],
    ['legacy', 'MPa', 'photo'],
    ['pressure', 'MPa', 'photo'],
    ['visual', null, 'ok_ng'],
  ]);
});
