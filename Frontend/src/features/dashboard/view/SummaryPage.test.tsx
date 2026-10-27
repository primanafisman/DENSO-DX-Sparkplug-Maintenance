import { it, expect } from 'vitest';
import { screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, meta, schedule } from '../../../test/fixtures';
import { SummaryPage } from './SummaryPage';
import { chartLayout } from '../../../test/chartLayout';
import { Routes, Route } from 'react-router-dom';
chartLayout();

it('shows inspection numbers in numeric order even when the summary arrives newest first', async () => {
  setup();
  server.use(
    http.get('/api/v1/maintenance/summary', () =>
      HttpResponse.json(
        envelope({
          meta,
          total: 2,
          ok: 2,
          ng: 0,
          ok_ratio: 1,
          daily: [],
          groups: [
            {
              definition_id: 'ten',
              name: 'A check',
              check_number: 10,
              total: 1,
              ok: 1,
              ng: 0,
              latest_checked_at: '2026-10-25T09:00:00Z',
            },
            {
              definition_id: 'two',
              name: 'Z check',
              check_number: 2,
              total: 1,
              ok: 1,
              ng: 0,
              latest_checked_at: '2026-10-25T08:00:00Z',
            },
          ],
        }),
      ),
    ),
  );
  renderApp(<SummaryPage />, '/?month=2026-10');
  const table = await screen.findByRole('table', { name: 'Ringkasan pemeriksaan bulanan' });
  expect(
    within(table)
      .getAllByRole('link')
      .map((a) => a.textContent),
  ).toEqual(['2 · Z check', '10 · A check']);
});

it('shows latest check times in WIB and opens that inspection from the row without a Detail column', async () => {
  setup();
  server.use(
    http.get('/api/v1/maintenance/summary', () =>
      HttpResponse.json(
        envelope({
          meta,
          total: 3,
          ok: 3,
          ng: 0,
          ok_ratio: 1,
          daily: [],
          groups: [
            {
              definition_id: 'newest',
              name: 'Pemeriksaan terbaru',
              total: 1,
              ok: 1,
              ng: 0,
              latest_checked_at: '2026-10-25T17:15:00Z',
            },
            {
              definition_id: 'older',
              name: 'Pemeriksaan sebelumnya',
              total: 1,
              ok: 1,
              ng: 0,
              latest_checked_at: '2026-10-25T06:04:00Z',
            },
            {
              definition_id: 'legacy',
              name: 'Pemeriksaan lama',
              total: 1,
              ok: 1,
              ng: 0,
              latest_checked_at: null,
            },
          ],
        }),
      ),
    ),
  );
  renderApp(
    <Routes>
      <Route path="/" element={<SummaryPage />} />
      <Route path="/riwayat/:id" element={<h1>Riwayat terpilih</h1>} />
    </Routes>,
    '/?month=2026-10&line=17&shift=day',
  );
  const table = await screen.findByRole('table', { name: 'Ringkasan pemeriksaan bulanan' });
  expect(within(table).queryByRole('columnheader', { name: 'Detail' })).not.toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: /Waktu/ })).toBeVisible();
  const latest = within(table).getByRole('row', { name: /Pemeriksaan terbaru/ });
  expect(within(latest).getByText('00:15')).toHaveAttribute('datetime', '2026-10-25T17:15:00Z');
  expect(within(table).getByText('13:04')).toBeVisible();
  expect(within(table).getByRole('row', { name: /Pemeriksaan lama/ })).toHaveTextContent('—');
  expect(within(latest).getByRole('link')).toHaveAttribute(
    'href',
    '/riwayat/newest?month=2026-10&line=17&shift=day',
  );
  fireEvent.click(within(latest).getByText('00:15'));
  expect(screen.getByRole('heading', { name: 'Riwayat terpilih' })).toBeVisible();
});

const current = {
  ...schedule,
  shift: 'night',
  shift_label: 'Shift 2',
  slot_id: 'night-2115',
  slot_label: 'Shift 2 · 21:15 WIB',
};
const due = (line: string, completed_count = 2, pending_count = 3) => ({
  schedule: current,
  line,
  completed_count,
  pending_count,
  items: [],
});
function setup(lines = ['17']) {
  server.use(
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(current))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(envelope({ lines, allowed_samplers: ['Ldr'], night_rollover_hour: 7 })),
    ),
    http.get('/api/v1/maintenance/summary', () =>
      HttpResponse.json(
        envelope({
          meta: { ...meta, warnings: ['ILLUSTRATIVE_DATA'] },
          total: 501,
          ok: 500,
          ng: 1,
          ok_ratio: 500 / 501,
          daily: [],
          groups: [],
        }),
      ),
    ),
    http.get('/api/v1/maintenance/due', ({ request }) =>
      HttpResponse.json(envelope(due(new URL(request.url).searchParams.get('line')!))),
    ),
  );
}
it('current server shift and due checks stay separate from historical monthly record totals', async () => {
  setup();
  renderApp(<SummaryPage />, '/?month=2026-09&shift=day');
  const active = await screen.findByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByText('Shift 2 · 21:15 WIB')).toBeVisible();
  expect(await within(active).findByText('2')).toBeVisible();
  expect(within(active).getByText('3')).toBeVisible();
  expect(within(active).getByText('Line 17')).toBeVisible();
  expect(await screen.findByText('501')).toBeVisible();
  expect(screen.getByText('501').closest('.kpi-total')).toHaveTextContent('September 2026');
  expect(screen.queryByText('Detail data')).not.toBeInTheDocument();
  expect(screen.queryByText('ILLUSTRATIVE_DATA')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Shift')).toHaveValue('day');
  expect(screen.getByLabelText('Bulan')).toHaveValue('2026-09');
  expect(
    screen.queryByText(/hasil pemeriksaan tersimpan|Snapshot|OK ÷ total catatan/),
  ).not.toBeInTheDocument();
  expect(screen.getByText('OK', { selector: '.kpi-grid p' })).toBeVisible();
  expect(screen.getByText('NG', { selector: '.kpi-grid p' })).toBeVisible();
});

it('uses Indonesian month choices and a pending-line metric rather than a long line-name note', async () => {
  setup(['1', '2', '3']);
  renderApp(<SummaryPage />, '/?month=2026-10');
  const month = await screen.findByRole('combobox', { name: 'Bulan' });
  expect(within(month).getByRole('option', { name: 'Oktober 2026' })).toHaveValue('2026-10');
  const active = screen.getByRole('region', { name: 'Jadwal aktif' });
  const lines = await within(active).findByRole('group', { name: 'Line pemeriksaan tersisa' });
  expect(await within(lines).findByText('3')).toBeVisible();
  expect(within(lines).getByText('Line pemeriksaan tersisa')).toBeVisible();
  expect(within(active).queryByText(/^Belum selesai:/)).not.toBeInTheDocument();
});

it('retains access to older months using Indonesian month and year choices', async () => {
  setup();
  renderApp(<SummaryPage />, '/?month=2026-10');
  const month = await screen.findByRole('combobox', { name: 'Bulan' });
  fireEvent.change(month, { target: { value: 'custom' } });
  const picker = screen.getByRole('alertdialog', { name: 'Pilih bulan' });
  fireEvent.change(within(picker).getByLabelText('Nama bulan'), { target: { value: '01' } });
  fireEvent.change(within(picker).getByLabelText('Tahun'), { target: { value: '2024' } });
  fireEvent.click(within(picker).getByRole('button', { name: 'Terapkan' }));
  expect(screen.getByRole('combobox', { name: 'Bulan' })).toHaveValue('2024-01');
  expect(screen.getByRole('option', { name: 'Januari 2024' })).toBeInTheDocument();
});
it('all configured lines have adaptive rings and weighted total progress with pending lines', async () => {
  setup(['1', '2', '3', '4', '5']);
  const calls = new Set<string>();
  server.use(
    http.get('/api/v1/maintenance/due', ({ request }) => {
      const line = new URL(request.url).searchParams.get('line')!;
      calls.add(line);
      return HttpResponse.json(envelope(line === '1' ? due(line, 8, 0) : due(line, 0, 1)));
    }),
  );
  renderApp(<SummaryPage />);
  const active = screen.getByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByRole('img', { name: 'Progres pemeriksaan 67%' })).toBeVisible();
  const lines = within(active).getByRole('list', { name: 'Progres per line' });
  expect(within(lines).getAllByRole('listitem')).toHaveLength(5);
  expect(within(lines).getByRole('button', { name: 'Lihat Line 1' })).toHaveTextContent('100%');
  expect(
    within(within(active).getByRole('group', { name: 'Line pemeriksaan tersisa' })).getByText('4'),
  ).toBeVisible();
  expect(calls).toEqual(new Set(['1', '2', '3', '4', '5']));
  expect(screen.queryByText(/^Pilih line$/)).not.toBeInTheDocument();
  fireEvent.click(within(lines).getByRole('button', { name: 'Lihat Line 1' }));
  expect(await within(active).findByText('Line 1')).toBeVisible();
  expect(within(active).queryByRole('list', { name: 'Progres per line' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Line')).toHaveValue('1');
});

it('all-line progress follows added and removed configured lines without hardcoded line numbers', async () => {
  setup(['17', '18']);
  const { client } = renderApp(<SummaryPage />);
  const active = screen.getByRole('region', { name: 'Jadwal aktif' });
  await waitFor(() =>
    expect(
      within(within(active).getByRole('group', { name: 'Line pemeriksaan tersisa' })).getByText(
        '2',
      ),
    ).toBeVisible(),
  );
  await act(async () => {
    client.setQueryData(['settings'], { lines: ['18', '20'], allowed_samplers: ['Ldr'] });
  });
  expect(await within(active).findByRole('button', { name: 'Lihat Line 20' })).toBeVisible();
  expect(within(active).queryByRole('button', { name: 'Lihat Line 17' })).not.toBeInTheDocument();
});

it('an unavailable line cannot produce a misleading partial all-line percentage', async () => {
  setup(['17', '18']);
  server.use(
    http.get('/api/v1/maintenance/due', ({ request }) =>
      new URL(request.url).searchParams.get('line') === '18'
        ? HttpResponse.json({ success: false, code: 'TEMPORARY' }, { status: 503 })
        : HttpResponse.json(envelope(due('17', 5, 0))),
    ),
  );
  renderApp(<SummaryPage />);
  const active = screen.getByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByRole('button', { name: 'Coba lagi' })).toBeVisible();
  expect(
    within(active).getByRole('img', { name: 'Progres pemeriksaan belum tersedia' }),
  ).toBeVisible();
  expect(within(active).queryByText(/^Belum selesai:/)).not.toBeInTheDocument();
  server.use(
    http.get('/api/v1/maintenance/due', ({ request }) =>
      HttpResponse.json(envelope(due(new URL(request.url).searchParams.get('line')!, 5, 0))),
    ),
  );
  fireEvent.click(within(active).getByRole('button', { name: 'Coba lagi' }));
  await waitFor(() =>
    expect(
      within(within(active).getByRole('group', { name: 'Line pemeriksaan tersisa' })).getByText(
        '0',
      ),
    ).toBeVisible(),
  );
});
it('changing line hides old counts while waiting and accepts real zero counts', async () => {
  setup(['17', '18']);
  let finish!: (response: Response) => void;
  server.use(
    http.get('/api/v1/maintenance/due', ({ request }) =>
      new URL(request.url).searchParams.get('line') === '18'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : HttpResponse.json(envelope(due('17'))),
    ),
  );
  renderApp(<SummaryPage />, '/?line=17');
  const active = await screen.findByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByText('3')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Line'), { target: { value: '18' } });
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  expect(within(active).queryByText('3')).not.toBeInTheDocument();
  finish(HttpResponse.json(envelope(due('18', 0, 0))));
  expect(await within(active).findByText('Line 18')).toBeVisible();
  await waitFor(() => expect(within(active).getAllByText('0')).toHaveLength(3));
});
it('failed due requests show retry instead of fabricated completion counts', async () => {
  setup();
  server.use(
    http.get('/api/v1/maintenance/due', () =>
      HttpResponse.json(
        { success: false, message: 'Jadwal tidak tersedia', code: 'TEMPORARY' },
        { status: 503 },
      ),
    ),
  );
  renderApp(<SummaryPage />);
  const active = await screen.findByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByText('Server belum dapat memproses permintaan.')).toBeVisible();
  expect(within(active).queryByText('0')).not.toBeInTheDocument();
  server.use(http.get('/api/v1/maintenance/due', () => HttpResponse.json(envelope(due('17')))));
  fireEvent.click(within(active).getByRole('button', { name: 'Coba lagi' }));
  expect(await within(active).findByText('3')).toBeVisible();
});
it('a new server occurrence hides old due counts even when the slot ID repeats next day', async () => {
  setup();
  const { client } = renderApp(<SummaryPage />);
  const active = await screen.findByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByText('3')).toBeVisible();
  let finish!: (response: Response) => void;
  server.use(
    http.get(
      '/api/v1/maintenance/due',
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const next = {
    ...current,
    server_time: '2026-10-22T14:16:00Z',
    starts_at: '2026-10-22T14:15:00Z',
    next_starts_at: '2026-10-22T18:15:00Z',
  };
  await act(async () => {
    client.setQueryData(['schedule'], next);
  });
  await waitFor(() => expect(within(active).queryByText('3')).not.toBeInTheDocument());
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  finish(HttpResponse.json(envelope({ ...due('17', 0, 5), schedule: next })));
  expect(await within(active).findByText('5')).toBeVisible();
});

it('all-line totals never mix old and new occurrences while lines refresh separately', async () => {
  setup(['17', '18']);
  const { client } = renderApp(<SummaryPage />);
  const active = screen.getByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByRole('img', { name: 'Progres pemeriksaan 40%' })).toBeVisible();
  const finishes = new Map<string, (response: Response) => void>();
  server.use(
    http.get(
      '/api/v1/maintenance/due',
      ({ request }) =>
        new Promise<Response>((resolve) => {
          finishes.set(new URL(request.url).searchParams.get('line')!, resolve);
        }),
    ),
  );
  const next = {
    ...current,
    server_time: '2026-10-22T14:16:00Z',
    starts_at: '2026-10-22T14:15:00Z',
    next_starts_at: '2026-10-22T18:15:00Z',
  };
  await act(async () => {
    client.setQueryData(['schedule'], next);
  });
  await waitFor(() => expect(finishes.size).toBe(2));
  finishes.get('17')!(HttpResponse.json(envelope({ ...due('17', 5, 0), schedule: next })));
  expect(await within(active).findByRole('img', { name: 'Progres Line 17 100%' })).toBeVisible();
  expect(
    within(active).getByRole('img', { name: 'Progres pemeriksaan belum tersedia' }),
  ).toBeVisible();
  expect(within(active).queryByText(/^Belum selesai:/)).not.toBeInTheDocument();
  finishes.get('18')!(HttpResponse.json(envelope({ ...due('18', 0, 5), schedule: next })));
  expect(await within(active).findByRole('img', { name: 'Progres pemeriksaan 50%' })).toBeVisible();
  expect(
    within(within(active).getByRole('group', { name: 'Line pemeriksaan tersisa' })).getByText('1'),
  ).toBeVisible();
});
