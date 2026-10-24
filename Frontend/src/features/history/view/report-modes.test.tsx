import { it, expect } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureDefinition, meta, schedule } from '../../../test/fixtures';
import { chartLayout } from '../../../test/chartLayout';
import { HistoryPage } from './HistoryPage';
import { SpcReportPage } from './SpcReportPage';
chartLayout();
const definition = fixtureDefinition({
  id: 'packing_depth_tool',
  name: 'Packing Depth Tool',
  kind: 'visual',
  input_method: 'ok_ng',
  inspection_target: 'machine',
  sample_count: 1,
  unit: null,
  limits: null,
});
function setup() {
  server.use(
    http.get('/api/v1/capabilities', () => HttpResponse.json(envelope({ demo_reports: true }))),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 7 }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: [definition],
          count: 1,
          source_gaps: { missing_rows: [], clipped_row: 45 },
        }),
      ),
    ),
  );
}
it('OK NG detail requests only selected inspection and displays daily status graph', async () => {
  setup();
  let selected = '';
  server.use(
    http.get('/api/v1/maintenance/report', ({ request }) => {
      selected = new URL(request.url).searchParams.get('definition_id') ?? '';
      return HttpResponse.json(
        envelope({
          meta,
          rows: [
            {
              row_id: 'row',
              definition_id: definition.id,
              definition_version: 1,
              check_number: 1,
              name: definition.name,
              input_method: 'ok_ng',
              shift: 'day',
              unit: null,
              standard: { text: 'Tidak luka' },
              equipment_name: null,
              cells: [
                {
                  date: '2026-10-21',
                  count: 1,
                  occurrences: [
                    new URL(request.url).searchParams.has('cursor')
                      ? { id: 'ng', overall_status: 'NG' }
                      : { id: 'ok', overall_status: 'OK' },
                  ],
                },
              ],
            },
          ],
          next_cursor: new URL(request.url).searchParams.has('cursor') ? null : 'more',
        }),
      );
    }),
  );
  renderApp(
    <Routes>
      <Route path="/riwayat/:definitionId" element={<SpcReportPage />} />
    </Routes>,
    '/riwayat/packing_depth_tool?month=2026-10',
  );
  expect(await screen.findByRole('img', { name: 'Grafik OK NG per tanggal' })).toBeVisible();
  expect(selected).toBe('packing_depth_tool');
  const table = screen.getByRole('table', { name: 'Hasil harian Packing Depth Tool' });
  expect(within(table).getByText('2026-10-21')).toBeVisible();
  expect(within(table).getAllByText('1')).toHaveLength(2);
  expect(
    screen.queryByText('Pemeriksaan OK / NG tidak memiliki grafik X̄ / R'),
  ).not.toBeInTheDocument();
});
it('demo toggle loads isolated endpoint and prevents production export', async () => {
  setup();
  let demoRequests = 0;
  server.use(
    http.get('/api/v1/maintenance/report', () =>
      HttpResponse.json(envelope({ meta, rows: [], next_cursor: null })),
    ),
    http.get('/api/v1/maintenance/demo/report', ({ request }) => {
      expect(new URL(request.url).searchParams.has('demo')).toBe(false);
      demoRequests++;
      return HttpResponse.json(
        envelope({ meta: { ...meta, warnings: ['DEMO_DATA'] }, rows: [], next_cursor: null }),
      );
    }),
  );
  renderApp(<HistoryPage />, '/riwayat?month=2026-10');
  fireEvent.click(await screen.findByRole('button', { name: 'Lihat data contoh' }));
  expect(await screen.findByText('Data contoh — bukan catatan produksi.')).toBeVisible();
  await screen.findByText(/DEMO_DATA/);
  expect(demoRequests).toBe(1);
  expect(screen.getByRole('button', { name: 'Unduh CSV' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Kembali ke data produksi' }));
  expect(screen.queryByText('Data contoh — bukan catatan produksi.')).not.toBeInTheDocument();
});
