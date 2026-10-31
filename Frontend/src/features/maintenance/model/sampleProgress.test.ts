import { describe, expect, it } from 'vitest';
import { fixtureDefinition, schedule } from '../../../test/fixtures';
import type { InspectionDraft } from './inspectionStore';
import type { MaintenanceDueItem, MaintenanceObservation } from '../../../shared/lib/contracts';
import { inspectionSampleProgress } from './sampleProgress';

const definition = fixtureDefinition();
const selection = { line: '17', sampler: 'Ldr', product_type_id: 'type-a' };
const item: MaintenanceDueItem = {
  definition_id: definition.id,
  definition_version: 1,
  state: 'pending',
  completed_record_id: null,
  equipment: [],
  occurrence_key: 'current',
  starts_at: schedule.starts_at,
  next_starts_at: schedule.next_starts_at,
  basis: 'per_shift',
};
const draft = (observations: MaintenanceObservation[]): InspectionDraft => ({
  definition,
  context: { ...selection, shift: 'day', production_date: schedule.production_date },
  checked_at: schedule.server_time,
  interval: 'per_shift',
  trigger: 'routine',
  session_id: 'draft',
  observations,
});
const progress = (d: InspectionDraft | null, due = item) =>
  inspectionSampleProgress(definition, d, selection, due);

describe('sample progress from the supplied frontend archive', () => {
  it('separates empty, partially filled, ready and saved states', () => {
    expect(progress(null)).toMatchObject({ filled: 0, state: 'empty', saved: false });
    expect(progress(draft([{ sample_id: 'n1', reading_id: 'one' }]))).toMatchObject({
      filled: 1,
      state: 'partial',
    });
    const full = draft(definition.samples.map((s) => ({ sample_id: s.id, reading_id: s.id })));
    expect(progress(full)).toMatchObject({ filled: 4, state: 'complete', saved: false });
    expect(progress(null, { ...item, state: 'completed' })).toMatchObject({
      filled: 4,
      state: 'complete',
      saved: true,
    });
  });

  it.each(['line', 'product', 'version', 'old-window', 'future-window'])(
    'does not show stale green for %s',
    (reason) => {
      const full = draft(definition.samples.map((s) => ({ sample_id: s.id, reading_id: s.id })));
      if (reason === 'line') full.context.line = '1';
      if (reason === 'product') full.context.product_type_id = 'other';
      if (reason === 'version') full.definition = { ...definition, definition_version: 2 };
      if (reason === 'old-window') full.checked_at = '2026-10-20T01:00:00Z';
      if (reason === 'future-window') full.checked_at = schedule.next_starts_at;
      expect(progress(full)).toMatchObject({ filled: 0, state: 'empty' });
    },
  );

  it('counts each defined visual sample once, including NG', () => {
    const visual = fixtureDefinition({ input_method: 'ok_ng', kind: 'visual' });
    const d = {
      ...draft([
        { sample_id: 'n1', status: 'NG' },
        { sample_id: 'n1', status: 'OK' },
        { sample_id: 'unknown', status: 'OK' },
      ]),
      definition: visual,
    };
    expect(inspectionSampleProgress(visual, d, selection, item).filled).toBe(1);
  });

  it('requires both readings for before/after and ignores blank numeric readings', () => {
    const difference = fixtureDefinition({ input_method: 'photo_difference', kind: 'difference' });
    const d = {
      ...draft([{ sample_id: 'n1', before_reading_id: 'before', after_reading_id: '' }]),
      definition: difference,
    };
    expect(inspectionSampleProgress(difference, d, selection, item).filled).toBe(0);
    d.observations = [{ sample_id: 'n1', before_reading_id: 'before', after_reading_id: 'after' }];
    expect(inspectionSampleProgress(difference, d, selection, item).filled).toBe(1);
    expect(progress(draft([{ sample_id: 'n1', reading_id: '' }])).filled).toBe(0);
  });

  it('keeps a partly completed multi-equipment check yellow', () => {
    const equipment = [
      { instrument_id: 'a', state: 'completed' as const, completed_record_id: 'saved' },
      { instrument_id: 'b', state: 'pending' as const, completed_record_id: null },
    ];
    expect(progress(null, { ...item, equipment })).toMatchObject({
      state: 'partial',
      saved: false,
    });
    expect(
      progress(draft(definition.samples.map((s) => ({ sample_id: s.id, reading_id: s.id }))), {
        ...item,
        equipment,
      }),
    ).toMatchObject({ state: 'partial', saved: false });
  });
});
