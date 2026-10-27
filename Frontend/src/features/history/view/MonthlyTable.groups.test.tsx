import { expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '../../../test/render';
import { fixtureDefinition } from '../../../test/fixtures';
import type { MonthlyOccurrence, MonthlyRow } from '../model/monthlyRows';
import { MonthlyTable } from './MonthlyTable';

const scope = { production_date_from: '2026-10-21', production_date_to: '2026-10-21' };
function sample(
  id: string,
  line: string,
  shift: 'day' | 'night',
  checked_at: string,
): MonthlyOccurrence {
  return {
    unit: 'mm',
    input_method: 'photo',
    occurrence: {
      id,
      checked_at,
      context: { line, shift, production_date: '2026-10-21', sampler: 'Ldr' },
      slot_id: shift === 'day' ? 'day-0745' : 'night-2115',
      overall_status: 'OK',
      outcomes: [],
      definition_snapshot: fixtureDefinition({
        id: 'chart_ee_length',
        name: 'EE Cutting',
        sample_count: 4,
        unit: 'mm',
        input_method: 'photo',
      }),
      product_snapshot: null,
      instruments: [],
      evidence: [],
      numeric_summary: { complete: true, xbar: 15.872, r: 0.015 },
    },
  };
}
const rows: MonthlyRow[] = [
  {
    row_id: 'ee',
    check_number: 44,
    definition_id: 'chart_ee_length',
    name: 'EE Cutting',
    cells: [
      {
        date: '2026-10-21',
        count: 4,
        items: [
          sample('night', '2', 'night', '2026-10-21T14:15:00Z'),
          sample('line-2', '2', 'day', '2026-10-21T00:45:00Z'),
          sample('late', '1', 'day', '2026-10-21T05:45:00Z'),
          sample('early', '1', 'day', '2026-10-21T00:45:00Z'),
        ],
      },
    ],
  },
];

it('shows both shifts and every line/session with complete sample readings', () => {
  renderApp(<MonthlyTable rows={rows} scope={scope} mode="all" />);
  const cell = screen.getByRole('button', { name: '4 pemeriksaan' });
  const groups = within(cell).getAllByRole('group');
  expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Shift 1', 'Shift 2']);
  expect(
    within(groups[0])
      .getAllByText(/^Line/)
      .map((label) => label.textContent),
  ).toEqual(['Line 1:', 'Line 1:', 'Line 2:']);
  expect(within(groups[1]).getByText('Line 2:')).toBeVisible();
  expect(within(cell).getAllByText('mm')).toHaveLength(4);
  expect(cell).toHaveTextContent(/X̄ 15,872 · R 0,015 mm/);
  expect(within(cell).getAllByText(/OK/)).toHaveLength(4);
});

it('retains shift and line labels for filtered status-only and sample modes', () => {
  const filtered = { ...scope, line: '2', shift: 'night' as const };
  const view = renderApp(<MonthlyTable rows={rows} scope={filtered} mode="status" />);
  const cell = screen.getByRole('button', { name: '1 pemeriksaan' });
  expect(within(cell).getByText('Shift 2:')).toBeVisible();
  expect(within(cell).getByText('Line 2:')).toBeVisible();
  expect(within(cell).queryByText('Shift 1:')).not.toBeInTheDocument();
  expect(within(cell).queryByText('Line 1:')).not.toBeInTheDocument();
  expect(within(cell).queryByText('mm')).not.toBeInTheDocument();
  view.unmount();
  renderApp(<MonthlyTable rows={rows} scope={filtered} mode="measurement" />);
  expect(screen.getByRole('group', { name: 'Shift 2' })).toHaveTextContent(/Line 2:.*X̄.*mm/);
  expect(screen.queryByText(/OK/)).not.toBeInTheDocument();
});
