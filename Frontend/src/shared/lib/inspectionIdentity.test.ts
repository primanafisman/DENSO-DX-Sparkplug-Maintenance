import { expect, it } from 'vitest';
import {
  compareInspections,
  inspectionLabel,
  inspectionNumber,
  nextInspectionNumber,
} from './inspectionIdentity';

it('uses the configured inspection number before the sheet source number', () => {
  expect(inspectionNumber({ check_number: 12, source_number: 3 })).toBe(12);
  expect(inspectionLabel({ check_number: 12, source_number: 3, name: 'Packing' })).toBe(
    '12 · Packing',
  );
  expect(inspectionLabel({ source_number: 2, name: 'Lowering' })).toBe('2 · Lowering');
});
it('sorts numerically and leaves legacy unknown numbers after numbered checks', () => {
  const rows = [{ name: 'Z', check_number: 10 }, { name: 'A' }, { name: 'B', check_number: 2 }];
  expect([...rows].sort(compareInspections).map(inspectionLabel)).toEqual(['2 · B', '10 · Z', 'A']);
  expect(rows[0].check_number).toBe(10);
});
it('suggests a free valid number even when 10000 is already used', () => {
  expect(
    nextInspectionNumber([
      { name: 'High', check_number: 10000 },
      { name: 'Used', check_number: 45 },
    ]),
  ).toBe(46);
  expect(
    nextInspectionNumber(
      Array.from({ length: 10000 }, (_, i) => ({ name: String(i), check_number: i + 1 })),
    ),
  ).toBeNull();
});
