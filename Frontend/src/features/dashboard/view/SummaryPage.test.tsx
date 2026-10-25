import { it, expect } from 'vitest';
import { screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, meta, schedule } from '../../../test/fixtures';
import { SummaryPage } from './SummaryPage';
import { chartLayout } from '../../../test/chartLayout';
chartLayout();

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
        envelope({ meta, total: 501, ok: 500, ng: 1, ok_ratio: 500 / 501, daily: [], groups: [] }),
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
  expect(screen.getByLabelText('Shift')).toHaveValue('day');
  expect(screen.getByLabelText('Bulan')).toHaveValue('2026-09');
  expect(
    screen.queryByText(/hasil pemeriksaan tersimpan|Snapshot|OK ÷ total catatan/),
  ).not.toBeInTheDocument();
  expect(screen.getByText('OK', { selector: '.kpi-grid p' })).toBeVisible();
  expect(screen.getByText('NG', { selector: '.kpi-grid p' })).toBeVisible();
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
  expect(within(active).getByText('Belum selesai: Line 2, 3, 4, 5')).toBeVisible();
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
  expect(await within(active).findByText('Belum selesai: Line 17, 18')).toBeVisible();
  await act(async () => {
    client.setQueryData(['settings'], { lines: ['18', '20'], allowed_samplers: ['Ldr'] });
  });
  expect(await within(active).findByText('Belum selesai: Line 18, 20')).toBeVisible();
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
  expect(await within(active).findByText('Semua line selesai')).toBeVisible();
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
  await waitFor(() => expect(within(active).getAllByText('0')).toHaveLength(2));
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
  expect(within(active).getByText('Belum selesai: Line 18')).toBeVisible();
});
