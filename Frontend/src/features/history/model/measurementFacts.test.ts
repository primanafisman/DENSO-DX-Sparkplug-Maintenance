import { expect, it } from 'vitest';
import { acceptanceLabel, occurrenceAcceptance } from './measurementFacts';
import { historyOccurrence } from '../test/monthlyFixtures';
it.each([
  [{ minimum: 0.35, maximum: 0.45 }, '0,350–0,450 MPa'],
  [{ minimum: 0.35, maximum: null }, '≥ 0,350 MPa'],
  [{ minimum: null, maximum: 0.45 }, '≤ 0,450 MPa'],
  [{ minimum: null, maximum: null }, null],
  [null, null],
] as const)('formats only known acceptance bounds %o', (limits, label) => {
  expect(acceptanceLabel(limits, 'MPa')).toBe(label);
});
it('uses outcome criteria frozen with a reading instead of substituting another standard', () => {
  const occurrence = historyOccurrence('frozen', {
    outcomes: [
      {
        sample_id: 'n1',
        reading_id: 'r',
        value: 0.417,
        status: 'OK',
        ...{ acceptance_limits: { minimum: 0.35, maximum: 0.45 }, unit: 'MPa' },
      },
    ],
  });
  expect(occurrenceAcceptance(occurrence)).toEqual([{ sample_id: 'n1', label: '0,350–0,450 MPa' }]);
});
