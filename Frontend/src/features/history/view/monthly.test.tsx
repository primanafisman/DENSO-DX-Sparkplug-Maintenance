import { it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, meta, schedule, fixtureDefinition } from '../../../test/fixtures';
import { SummaryPage } from '../../dashboard/view/SummaryPage';
import { HistoryPage } from './HistoryPage';
import { chartLayout } from '../../../test/chartLayout';
chartLayout();
const scope = { production_date_from: '2026-10-01', production_date_to: '2026-10-31' };
function setup() {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'admin', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/due', () =>
      HttpResponse.json(
        envelope({ schedule, line: '17', items: [], completed_count: 2, pending_count: 3 }),
      ),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 7 }),
      ),
    ),
    http.get('/api/v1/maintenance/summary', () =>
      HttpResponse.json(
        envelope({
          meta: { ...meta, scanned_records: 501 },
          total: 501,
          ok: 500,
          ng: 1,
          ok_ratio: 500 / 501,
          daily: [],
          groups: [],
        }),
      ),
    ),
  );
}
it('summary uses server aggregate501 and labels the OK percentage', async () => {
  setup();
  renderApp(<SummaryPage />);
  expect(await screen.findByText('501')).toBeVisible();
  expect(screen.getByText('OK %')).toBeVisible();
  expect(screen.queryByText(/persentase selesai/i)).not.toBeInTheDocument();
});
it('monthly history is table-only, preserves blank cells and opens both occurrences', async () => {
  setup();
  const occurrence = (id: string) => ({
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
  });
  server.use(
    http.get('/api/v1/maintenance/report', ({ request }) => {
      const q = new URL(request.url).searchParams;
      return HttpResponse.json(
        envelope({
          meta: { ...meta, scope },
          next_cursor: null,
          rows:
            q.get('production_date_from') === '2026-09-01'
              ? []
              : [
                  {
                    row_id: 'row',
                    definition_id: 'chart_ee_length',
                    definition_version: 1,
                    name: 'EE Cutting',
                    equipment_id: null,
                    equipment_name: null,
                    shift: 'day',
                    unit: 'mm',
                    standard: { text: '4.4–4.6', minimum: 4.4, maximum: 4.6 },
                    input_method: 'photo',
                    cells: [
                      {
                        date: '2026-10-21',
                        count: 2,
                        occurrences: [occurrence('one'), occurrence('two')],
                      },
                    ],
                  },
                ],
        }),
      );
    }),
  );
  renderApp(<HistoryPage />);
  expect(await screen.findByRole('columnheader', { name: 'No. Pemeriksaan' })).toBeVisible();
  expect(screen.queryByText('2 catatan')).not.toBeInTheDocument();
  expect(screen.queryByText('Alat tidak tercatat')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '2 pemeriksaan' })).toHaveTextContent(/OK.*OK/);
  fireEvent.click(await screen.findByRole('button', { name: '2 pemeriksaan' }));
  expect(screen.getAllByText(/day-0745/)).toHaveLength(2);
  expect(screen.queryByRole('img', { name: /grafik/i })).not.toBeInTheDocument();
  expect(screen.getByTestId('day-2026-10-01')).toHaveTextContent('');
  fireEvent.click(screen.getByRole('button', { name: 'Tutup rincian' }));
  fireEvent.change(screen.getByLabelText('Bulan'), { target: { value: '2026-09' } });
  expect(await screen.findByText('Belum ada catatan bulan ini')).toBeVisible();
  expect(screen.queryByRole('button', { name: '2 pemeriksaan' })).not.toBeInTheDocument();
});
it('empty summary shows a dash for the ratio', async () => {
  setup();
  server.use(
    http.get('/api/v1/maintenance/summary', () =>
      HttpResponse.json(
        envelope({ meta, total: 0, ok: 0, ng: 0, ok_ratio: null, daily: [], groups: [] }),
      ),
    ),
  );
  renderApp(<SummaryPage />);
  expect(await screen.findByText('—')).toBeVisible();
  expect(screen.getByText('Belum ada catatan bulan ini')).toBeVisible();
});
it('an old month response cannot replace the newly selected month', async () => {
  setup();
  let finish!: (response: Response) => void;
  server.use(
    http.get('/api/v1/maintenance/report', ({ request }) => {
      if (new URL(request.url).searchParams.get('production_date_from') === '2026-10-01')
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      return HttpResponse.json(
        envelope({
          meta: {
            ...meta,
            scope: {
              ...scope,
              production_date_from: '2026-09-01',
              production_date_to: '2026-09-30',
            },
          },
          rows: [],
          next_cursor: null,
        }),
      );
    }),
  );
  renderApp(<HistoryPage />);
  await screen.findByLabelText('Bulan');
  await import('@testing-library/react').then(({ waitFor }) =>
    waitFor(() => expect(finish).toBeTypeOf('function')),
  );
  fireEvent.change(screen.getByLabelText('Bulan'), { target: { value: '2026-09' } });
  expect(await screen.findByText('Belum ada catatan bulan ini')).toBeVisible();
  finish(HttpResponse.json(envelope({ meta: { ...meta, scope }, rows: [], next_cursor: null })));
  expect(screen.getByLabelText('Bulan')).toHaveValue('2026-09');
});
