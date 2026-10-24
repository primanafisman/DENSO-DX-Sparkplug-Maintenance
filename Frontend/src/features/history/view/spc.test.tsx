import { it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp } from '../../../test/render';
import { fixtureDefinition, meta } from '../../../test/fixtures';
import type { SpcCohort, Subgroup } from '../../../shared/lib/contracts';
import { CalculationPanel } from './CalculationPanel';
import { MeasurementMatrix } from './MeasurementMatrix';
import { collectSubgroups } from '../controller/useSpcReport';
const cohort = {
  cohort_id: 'cohort',
  cohort_key: 'key',
  definition_snapshot: fixtureDefinition(),
  product_snapshot: null,
  instruments: [],
  unit: 'mm',
  n: 4,
  counts: { complete: 7, incomplete: 0, excluded: 0, observations: 28 },
  series: [],
  incomplete: [],
  baseline: { source: 'selected_period', id: null, as_of: meta.as_of, scope: meta.scope },
  control_limits: {
    center_x: 4.49857142857,
    center_r: 0.022857142857,
    ucl_x: 4.5152342857,
    lcl_x: 4.4819085714,
    ucl_r: 0.05216,
    lcl_r: 0,
  },
  statistics: {
    k: 7,
    n: 4,
    N: 28,
    sum_raw: 125.96,
    sum_xbar: 31.49,
    sum_r: 0.16,
    grand_mean: 4.49857142857,
    rbar: 0.022857142857,
    s_overall: 0.012971274735,
    sigma_within: 0.01110108929,
    three_sigma: 0.038913824205,
    six_sigma: 0.07782764841,
    r_max: 0.03,
    constants_version: 'test',
    reasons: [],
  },
  capability: {
    method: 'paper_stdev_s',
    sigma: 0.012971274735,
    cp: 2.56978084,
    cpk: 2.53306969,
    reason: null,
    provisional: true,
  },
  warnings: [],
} as unknown as SpcCohort;
it('paper panel renders server Cp/Cpk, separate sigma estimates, all limits and unknown Type', () => {
  renderApp(
    <>
      <CalculationPanel cohort={cohort} />
      <MeasurementMatrix
        cohort={cohort}
        groups={[
          {
            occurrence: {
              id: 'o',
              checked_at: '2026-10-21T01:00:00Z',
              context: { line: '17', shift: 'day', sampler: 'Ldr' },
              product_snapshot: null,
              overall_status: 'OK',
            },
            values: [4.49, 4.5, 4.51, 4.5],
            xbar: 4.5,
            r: 0.02,
          } as Subgroup,
        ]}
        onSelect={() => {}}
      />
    </>,
  );
  expect(screen.getByText('Cp (lembar)')).toBeVisible();
  expect(screen.getByText('STDEV.S')).toBeVisible();
  expect(screen.getByText('2,569781')).toBeVisible();
  expect(screen.getByText('2,533070')).toBeVisible();
  expect(screen.getByText('σwithin')).toBeVisible();
  expect(screen.queryByText('Tidak tercatat')).not.toBeInTheDocument();
  expect(screen.getByText('UCLx')).toBeVisible();
});
it('print loads all 101 groups at one fixed snapshot', async () => {
  const row = { occurrence: { id: 'o' } } as Subgroup;
  const read = vi.fn(async (_scope: unknown, _id: string, cursor?: string) => ({
    meta,
    items: Array.from({ length: cursor ? 1 : 100 }, () => row),
    next_cursor: cursor ? null : 'next',
  }));
  const groups = await collectSubgroups(read, { ...meta.scope, as_of: meta.as_of }, 'cohort');
  expect(groups).toHaveLength(101);
  expect(read.mock.calls.every((c) => (c[0] as { as_of: string }).as_of === meta.as_of)).toBe(true);
});
it('print refuses a changing snapshot or repeating cursor', async () => {
  const read = vi.fn(async () => ({
    meta: { ...meta, as_of: '2026-10-22T01:00:00Z' },
    items: [],
    next_cursor: null,
  }));
  await expect(
    collectSubgroups(read, { ...meta.scope, as_of: meta.as_of }, 'cohort'),
  ).rejects.toThrow(/berubah/i);
});
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { fireEvent } from '@testing-library/react';
import { server } from '../../../test/server';
import { envelope, schedule } from '../../../test/fixtures';
import { SpcReportPage } from './SpcReportPage';
function reportHandlers(cohorts: SpcCohort[], visual = false) {
  server.use(
    http.get('/api/v1/capabilities', () => HttpResponse.json(envelope({ demo_reports: true }))),
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'v', username: 'Viewer', role: 'Viewer' })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 7 }),
      ),
    ),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: [fixtureDefinition(visual ? { input_method: 'ok_ng', kind: 'visual' } : {})],
          count: 1,
        }),
      ),
    ),
    http.get('/api/v1/maintenance/spc-baselines', () =>
      HttpResponse.json(envelope({ items: [], next_cursor: null })),
    ),
    http.get('/api/v1/maintenance/spc', () => HttpResponse.json(envelope({ meta, cohorts }))),
    http.get('/api/v1/maintenance/report', () =>
      HttpResponse.json(envelope({ meta, rows: [], next_cursor: null })),
    ),
    http.get('/api/v1/maintenance/spc/subgroups', () =>
      HttpResponse.json(envelope({ meta, items: [], next_cursor: null })),
    ),
  );
}
it('multiple cohorts require explicit selection and Viewer cannot save a baseline', async () => {
  reportHandlers([cohort, { ...cohort, cohort_id: 'different' }]);
  renderApp(
    <Routes>
      <Route path="/riwayat/:definitionId" element={<SpcReportPage />} />
    </Routes>,
    '/riwayat/chart_ee_length',
  );
  expect(await screen.findByRole('heading', { name: 'Pilih kelompok pengukuran' })).toBeVisible();
  expect(screen.queryByText('Cp (lembar)')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Kelompok pengukuran'), {
    target: { value: 'cohort' },
  });
  expect(await screen.findByText('Cp (lembar)')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Simpan batas kontrol' })).not.toBeInTheDocument();
});
it('empty visual check has no fabricated status charts or numeric capability', async () => {
  reportHandlers([], true);
  renderApp(
    <Routes>
      <Route path="/riwayat/:definitionId" element={<SpcReportPage />} />
    </Routes>,
    '/riwayat/chart_ee_length',
  );
  expect(await screen.findByText('Belum ada hasil OK / NG pada periode ini')).toBeVisible();
  expect(screen.queryByText('Cp (lembar)')).not.toBeInTheDocument();
});
import { act, waitFor } from '@testing-library/react';
it('prepared print rows are cleared when a refreshed report changes as_of', async () => {
  reportHandlers([cohort]);
  let currentMeta = meta;
  server.use(
    http.get('/api/v1/maintenance/spc', () =>
      HttpResponse.json(envelope({ meta: currentMeta, cohorts: [cohort] })),
    ),
    http.get('/api/v1/maintenance/spc/subgroups', () =>
      HttpResponse.json(envelope({ meta: currentMeta, items: [], next_cursor: null })),
    ),
  );
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const app = renderApp(
    <Routes>
      <Route path="/riwayat/:definitionId" element={<SpcReportPage />} />
    </Routes>,
    '/riwayat/chart_ee_length',
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Cetak laporan A4' }));
  await waitFor(() => expect(print).toHaveBeenCalled());
  expect(screen.queryByText(/Data mentah belum disiapkan/)).not.toBeInTheDocument();
  currentMeta = { ...meta, as_of: '2026-10-21T02:00:00Z' };
  await act(() => app.client.invalidateQueries({ queryKey: ['history', 'spc'] }));
  await waitFor(() => expect(screen.getByText(/Data mentah belum disiapkan/)).toBeInTheDocument());
  print.mockRestore();
});
it('a baseline conflict can be cleared without leaving the page', async () => {
  reportHandlers([cohort]);
  server.use(
    http.get('/api/v1/maintenance/spc', ({ request }) =>
      new URL(request.url).searchParams.has('baseline_id')
        ? HttpResponse.json(
            { success: false, message: 'Baseline conflict', code: 'BASELINE_COHORT_CONFLICT' },
            { status: 422 },
          )
        : HttpResponse.json(envelope({ meta, cohorts: [cohort] })),
    ),
  );
  renderApp(
    <Routes>
      <Route path="/riwayat/:definitionId" element={<SpcReportPage />} />
    </Routes>,
    '/riwayat/chart_ee_length?baseline=old',
  );
  expect(await screen.findByText('Baseline conflict')).toBeVisible();
  fireEvent.click(screen.getByText('Pengaturan grafik'));
  fireEvent.click(screen.getByRole('button', { name: 'Gunakan periode dipilih' }));
  expect(await screen.findByText('Cp (lembar)')).toBeVisible();
});

it('product sampling retains X R math with one title, short facts and collapsed graph settings', async () => {
  reportHandlers([cohort]);
  let baselineRequests = 0;
  server.use(
    http.get('/api/v1/maintenance/spc-baselines', () => {
      baselineRequests++;
      return HttpResponse.json(envelope({ items: [], next_cursor: null }));
    }),
  );
  renderApp(
    <Routes>
      <Route path="/riwayat/:definitionId" element={<SpcReportPage />} />
    </Routes>,
    '/riwayat/chart_ee_length?month=2026-10',
  );
  expect(await screen.findByRole('img', { name: 'Grafik X bar' })).toBeVisible();
  expect(screen.getByRole('img', { name: 'Grafik R' })).toBeVisible();
  expect(screen.getAllByRole('heading', { name: 'EE Cutting' })).toHaveLength(1);
  expect(
    screen.queryByText(/Snapshot|Line Semua|resolusi|Type tidak tercatat|Alat tidak tercatat/i),
  ).not.toBeInTheDocument();
  const settings = screen.getByText('Pengaturan grafik').closest('details')!;
  expect(settings).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Batas kontrol')).not.toBeVisible();
  expect(baselineRequests).toBe(0);
  fireEvent.click(screen.getByText('Pengaturan grafik'));
  await waitFor(() => expect(baselineRequests).toBe(1));
  expect(screen.getByLabelText('Batas kontrol')).toBeVisible();
  expect(screen.getByText('2,569781')).toBeVisible();
});
