import { expect, it } from 'vitest';
import { fixtureDefinition } from '../../../test/fixtures';
import { statusOnlyReport } from './reportMode';
it.each([undefined, null, 'machine', 'product'] as const)(
  'pressureMPa stays status-only with target %s',
  (inspection_target) => {
    expect(
      statusOnlyReport(
        fixtureDefinition({
          unit: 'MPa',
          inspection_target,
          input_method: 'photo',
          kind: 'numeric',
        }),
      ),
    ).toBe(true);
  },
);
it('dimensional product sampling keeps numeric statistics and visual checks stay status-only', () => {
  expect(statusOnlyReport(fixtureDefinition({ unit: 'mm', inspection_target: 'product' }))).toBe(
    false,
  );
  expect(statusOnlyReport(fixtureDefinition({ input_method: 'ok_ng', kind: 'visual' }))).toBe(true);
});
