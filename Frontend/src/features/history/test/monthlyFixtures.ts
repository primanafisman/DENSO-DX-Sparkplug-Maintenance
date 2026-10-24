import type { ChecksheetRow, Occurrence } from '../../../shared/lib/contracts';
import { fixtureDefinition } from '../../../test/fixtures';
export function historyOccurrence(id: string, patch: Partial<Occurrence> = {}): Occurrence {
  return {
    id,
    checked_at: '2026-10-21T01:00:00Z',
    context: { line: '17', production_date: '2026-10-21', shift: 'day', sampler: 'Ldr' },
    slot_id: 'day-0745',
    overall_status: 'OK',
    outcomes: [],
    definition_snapshot: fixtureDefinition(),
    product_snapshot: null,
    instruments: [],
    evidence: [],
    numeric_summary: { complete: true, xbar: 4.5, r: 0.02 },
    ...patch,
  };
}
export function historyRow(patch: Partial<ChecksheetRow> = {}): ChecksheetRow {
  return {
    row_id: 'row-day',
    check_number: 44,
    definition_id: 'chart_ee_length',
    definition_version: 1,
    name: 'EE Cutting',
    equipment_id: 'g1',
    equipment_name: 'Kaliper 1',
    shift: 'day',
    unit: 'mm',
    input_method: 'photo',
    standard: { text: '4.4–4.6 mm', minimum: 4.4, maximum: 4.6 },
    cells: [{ date: '2026-10-21', count: 1, occurrences: [historyOccurrence('day')] }],
    ...patch,
  };
}
