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
  expect(screen.getByText('Catatan OK')).toBeVisible();
  expect(screen.getByText('Catatan NG')).toBeVisible();
});
it('a multi-line summary requires an explicit line before displaying due counts', async () => {
  setup(['17', '18']);
  let calls = 0;
  server.use(
    http.get('/api/v1/maintenance/due', () => {
      calls++;
      return HttpResponse.json(envelope(due('17')));
    }),
  );
  renderApp(<SummaryPage />);
  expect(await screen.findByText(/Pilih line untuk melihat pemeriksaan/)).toBeVisible();
  await screen.findByRole('option', { name: '17' });
  expect(calls).toBe(0);
  fireEvent.change(screen.getByLabelText('Line'), { target: { value: '17' } });
  const active = screen.getByRole('region', { name: 'Jadwal aktif' });
  expect(await within(active).findByText('3')).toBeVisible();
  expect(calls).toBe(1);
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
  expect(await within(active).findByText('Jadwal tidak tersedia')).toBeVisible();
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
