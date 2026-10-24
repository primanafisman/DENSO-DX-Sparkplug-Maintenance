import { expect, it } from 'vitest';
import { equipmentSchema } from './schemas';
import { equipmentBody } from './api';

const base = {
  name: 'B3601',
  code: 'B3601',
  aliases: 'B3601',
  area: '17',
  instrument_type: 'pressure_gauge',
  active: true,
  measurement_mode: 'numeric',
  condition: 'working',
  condition_reason: '',
  kind: 'auto',
  unit: 'MPa',
  minimum: 0,
  maximum: 1,
  decimals: 3,
  tolerance: 0.01,
  check_ids: [],
  use_acceptance_limits: false,
  acceptance_minimum: null,
  acceptance_maximum: null,
};

it.each([
  { minimum: 0, maximum: 0.5 },
  { minimum: 0.4, maximum: null },
  { minimum: null, maximum: 0.5 },
])('sends enabled OK bounds separately from the physical profile: %j', (limits) => {
  const form = equipmentSchema.parse({
    ...base,
    use_acceptance_limits: true,
    acceptance_minimum: limits.minimum,
    acceptance_maximum: limits.maximum,
  });
  expect(equipmentBody(form)).toMatchObject({
    acceptance_limits: limits,
    profile: { minimum: 0, maximum: 1, unit: 'MPa' },
  });
});

it('sends explicit null for disabled and visual acceptance limits', () => {
  const form = equipmentSchema.parse({ ...base, acceptance_minimum: 0.4, acceptance_maximum: 0.5 });
  expect(equipmentBody(form).acceptance_limits).toBeNull();
  const visual = equipmentBody({
    ...form,
    measurement_mode: 'visual',
    use_acceptance_limits: true,
  });
  expect(visual.acceptance_limits).toBeNull();
  expect(visual.profile).toBeNull();
});

it.each([
  { acceptance_minimum: null, acceptance_maximum: null },
  { acceptance_minimum: 0.5, acceptance_maximum: 0.4 },
  { acceptance_minimum: -0.1, acceptance_maximum: 0.5 },
  { acceptance_minimum: 0.4, acceptance_maximum: 1.1 },
])('rejects empty, inverted and physically invalid OK bounds: %j', (bounds) => {
  expect(
    equipmentSchema.safeParse({ ...base, ...bounds, use_acceptance_limits: true }).success,
  ).toBe(false);
});
