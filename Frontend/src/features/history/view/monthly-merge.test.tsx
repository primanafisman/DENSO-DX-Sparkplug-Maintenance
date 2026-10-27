import { expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureDefinition, meta, schedule } from '../../../test/fixtures';
import { dateTime } from '../../../shared/lib/format';
import { historyRow, historyOccurrence } from '../test/monthlyFixtures';
import { HistoryPage } from './HistoryPage';
const reportMeta = {
  ...meta,
  scope: { production_date_from: '2026-10-01', production_date_to: '2026-10-31' },
};
function setup() {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'v', username: 'Viewer', role: 'Viewer' })),
    ),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 12 }),
      ),
    ),
  );
}
it('waits for every page then renders one numbered row with both shifts, units and detail records', async () => {
  setup();
  let finish!: (response: Response) => void,
    pages = 0;
  const night = historyOccurrence('night', {
    checked_at: '2026-10-21T14:15:00Z',
    overall_status: 'NG',
    slot_id: 'night-2115',
    context: { line: '17', production_date: '2026-10-21', shift: 'night', sampler: 'Other' },
    definition_snapshot: fixtureDefinition({ definition_version: 2, unit: 'MPa' }),
    numeric_summary: { complete: true, xbar: 0.425, r: 0.01 },
  });
  server.use(
    http.get('/api/v1/maintenance/report', ({ request }) => {
      pages++;
      const params = new URL(request.url).searchParams;
      expect(params.get('limit')).toBe('100');
      if (params.has('cursor'))
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      return HttpResponse.json(
        envelope({ meta: reportMeta, rows: [historyRow()], next_cursor: 'second' }),
      );
    }),
  );
  renderApp(<HistoryPage />, '/riwayat?month=2026-10');
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  expect(screen.getByText('Memuat seluruh hasil bulan…')).toBeVisible();
  expect(
    screen.queryByRole('table', { name: 'Catatan pemeriksaan bulanan' }),
  ).not.toBeInTheDocument();
  await act(async () =>
    finish(
      HttpResponse.json(
        envelope({
          meta: reportMeta,
          rows: [
            historyRow({
              row_id: 'night',
              shift: 'night',
              definition_version: 2,
              equipment_id: 'g2',
              unit: 'bar',
              cells: [{ date: '2026-10-21', count: 1, occurrences: [night] }],
            }),
          ],
          next_cursor: null,
        }),
      ),
    ),
  );
  const table = await screen.findByRole('table', { name: 'Catatan pemeriksaan bulanan' });
  expect(within(table).getAllByRole('row')).toHaveLength(2);
  expect(within(table).queryByRole('columnheader', { name: 'Shift' })).not.toBeInTheDocument();
  expect(within(table).getAllByRole('link', { name: 'EE Cutting' })).toHaveLength(1);
  const cell = screen.getByRole('button', { name: '2 pemeriksaan' });
  expect(cell).toHaveTextContent(/OK.*NG/);
  expect(within(cell).getByRole('group', { name: 'Shift 1' })).toHaveTextContent(/Line 17:.*OK/);
  expect(within(cell).getByRole('group', { name: 'Shift 2' })).toHaveTextContent(/Line 17:.*NG/);
  expect(screen.queryByText(/Snapshot|Tampilkan baris berikutnya/)).not.toBeInTheDocument();
  fireEvent.click(cell);
  const drawer = within(screen.getByRole('dialog', { name: 'Rincian pemeriksaan' }));
  expect(drawer.getByText(/Shift 1 · day-0745/)).toBeVisible();
  expect(drawer.getByText(/Shift 2 · night-2115/)).toBeVisible();
  expect(
    drawer.getByRole('heading', { name: dateTime(historyOccurrence('day').checked_at) }),
  ).toBeVisible();
  expect(drawer.getByRole('heading', { name: dateTime(night.checked_at) })).toBeVisible();
  fireEvent.click(drawer.getByRole('button', { name: 'Tutup rincian' }));
  fireEvent.change(screen.getByLabelText('Isi sel tabel'), { target: { value: 'all' } });
  expect(within(cell).getByText('mm')).toBeVisible();
  expect(within(cell).getByText('MPa')).toBeVisible();
  expect(within(cell).queryByText('bar')).not.toBeInTheDocument();
  expect(pages).toBe(2);
});

it('a failed later page shows an error instead of a partial numbered month', async () => {
  setup();
  server.use(
    http.get('/api/v1/maintenance/report', ({ request }) =>
      new URL(request.url).searchParams.has('cursor')
        ? HttpResponse.json(
            { success: false, message: 'Halaman lanjutan gagal.', code: 'REPORT_FAILED' },
            { status: 503 },
          )
        : HttpResponse.json(
            envelope({ meta: reportMeta, rows: [historyRow()], next_cursor: 'second' }),
          ),
    ),
  );
  renderApp(<HistoryPage />, '/riwayat?month=2026-10');
  expect(await screen.findByText('Server belum dapat memproses permintaan.')).toBeVisible();
  expect(
    screen.queryByRole('table', { name: 'Catatan pemeriksaan bulanan' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Muat ulang riwayat' })).toBeEnabled();
});

it('the three cell modes separate all results, statuses and genuine sample X R without pressure statistics', async () => {
  setup();
  const pressure = fixtureDefinition({
    id: 'pressure',
    name: 'Pressure Machine',
    inspection_target: 'machine',
    kind: 'numeric',
    unit: 'MPa',
    sample_count: 1,
    samples: [{ id: 'n1', label: 'n1' }],
  });
  const visual = fixtureDefinition({
    id: 'packing',
    name: 'Packing Tool',
    inspection_target: 'machine',
    kind: 'visual',
    input_method: 'ok_ng',
    unit: null,
  });
  server.use(
    http.get('/api/v1/maintenance/report', () =>
      HttpResponse.json(
        envelope({
          meta: reportMeta,
          next_cursor: null,
          rows: [
            historyRow(),
            historyRow({
              row_id: 'pressure',
              definition_id: pressure.id,
              check_number: 45,
              name: pressure.name,
              unit: 'MPa',
              cells: [
                {
                  date: '2026-10-21',
                  count: 1,
                  occurrences: [
                    historyOccurrence('pressure', {
                      definition_snapshot: pressure,
                      outcomes: [
                        { sample_id: 'n1', reading_id: 'reading', value: 0.417, status: 'OK' },
                      ],
                      numeric_summary: { complete: true, xbar: 0.417, r: 0 },
                    }),
                  ],
                },
              ],
            }),
            historyRow({
              row_id: 'packing',
              definition_id: visual.id,
              check_number: 1,
              name: visual.name,
              input_method: 'ok_ng',
              unit: null,
              cells: [
                {
                  date: '2026-10-21',
                  count: 1,
                  occurrences: [
                    historyOccurrence('packing', {
                      definition_snapshot: visual,
                      numeric_summary: null,
                    }),
                  ],
                },
              ],
            }),
          ],
        }),
      ),
    ),
  );
  renderApp(<HistoryPage />, '/riwayat?month=2026-10');
  const table = await screen.findByRole('table', { name: 'Catatan pemeriksaan bulanan' });
  const mode = screen.getByLabelText('Isi sel tabel');
  expect(
    within(mode)
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['Semua Data', 'Hasil NG / OK', 'Rata-rata sampel X dan R']);
  expect(mode).toHaveValue('all');
  const sample = screen.getByRole('link', { name: 'EE Cutting' }).closest('tr')!,
    gauge = screen.getByRole('link', { name: pressure.name }).closest('tr')!;
  expect(sample).toHaveTextContent(/X̄ 4,500 · R 0,020.*mm.*OK/);
  expect(gauge).toHaveTextContent(/0,417.*MPa.*OK/);
  expect(gauge).not.toHaveTextContent(/X̄|R 0,/);
  fireEvent.change(mode, { target: { value: 'status' } });
  expect(table).not.toHaveTextContent(/4,500|0,417|X̄/);
  expect(within(table).getAllByText('✓ OK')).toHaveLength(3);
  fireEvent.change(mode, { target: { value: 'measurement' } });
  expect(within(table).getAllByRole('row')).toHaveLength(2);
  expect(within(table).queryByRole('link', { name: pressure.name })).not.toBeInTheDocument();
  expect(within(table).queryByRole('link', { name: visual.name })).not.toBeInTheDocument();
  expect(table).toHaveTextContent(/X̄ 4,500 · R 0,020.*mm/);
  expect(within(table).queryByText('✓ OK')).not.toBeInTheDocument();
});

it('X R mode explains when a month contains no numeric sample subgroups', async () => {
  setup();
  const pressure = fixtureDefinition({
    inspection_target: 'machine',
    unit: 'MPa',
    sample_count: 1,
  });
  server.use(
    http.get('/api/v1/maintenance/report', () =>
      HttpResponse.json(
        envelope({
          meta: reportMeta,
          next_cursor: null,
          rows: [
            historyRow({
              cells: [
                {
                  date: '2026-10-21',
                  count: 1,
                  occurrences: [
                    historyOccurrence('only-pressure', { definition_snapshot: pressure }),
                  ],
                },
              ],
            }),
          ],
        }),
      ),
    ),
  );
  renderApp(<HistoryPage />, '/riwayat?month=2026-10');
  await screen.findByRole('table', { name: 'Catatan pemeriksaan bulanan' });
  fireEvent.change(screen.getByLabelText('Isi sel tabel'), { target: { value: 'measurement' } });
  expect(screen.getByText('Tidak ada sampel X/R')).toBeVisible();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
