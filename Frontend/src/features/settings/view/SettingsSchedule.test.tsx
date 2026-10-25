import { it, expect } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope } from '../../../test/fixtures';
import { SettingsPage } from './SettingsPage';

function setup() {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [], count: 0 })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({
          lines: ['1', '2', '3'],
          allowed_samplers: ['A', 'B', 'C', 'D', 'E'],
          night_rollover_hour: 12,
        }),
      ),
    ),
  );
}
it('aligns active choice counts beside add controls and edits four collapsed operational times', async () => {
  setup();
  let saved: Record<string, unknown> | undefined;
  server.use(
    http.put('/api/v1/maintenance/settings', async ({ request }) => {
      saved = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(envelope({ value: saved }));
    }),
  );
  const { client } = renderApp(<SettingsPage />, '/pengaturan?tab=general');
  client.setQueryData(['schedule'], { old: true });
  const lines = await screen.findByRole('region', { name: 'Line aktif' });
  expect(within(lines).getByText('3 line')).toBeVisible();
  expect(
    within(lines).getByRole('button', { name: 'Tambah line' }).closest('.section-heading'),
  ).toContainElement(within(lines).getByText('3 line'));
  const samplers = screen.getByRole('region', { name: 'Sampler aktif' });
  expect(within(samplers).getByText('5 orang')).toBeVisible();
  expect(
    within(samplers).getByRole('button', { name: 'Tambah sampler' }).closest('.section-heading'),
  ).toContainElement(within(samplers).getByText('5 orang'));
  expect(screen.queryByLabelText(/Batas pergantian tanggal/)).not.toBeInTheDocument();
  const detail = screen.getByText('Detail jadwal shift').closest('details')!;
  expect(detail).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText('Detail jadwal shift'));
  fireEvent.change(screen.getByLabelText('Shift 1 · Sesi 1'), { target: { value: '08:10' } });
  fireEvent.change(screen.getByLabelText('Shift 1 · Sesi 2'), { target: { value: '13:10' } });
  fireEvent.change(screen.getByLabelText('Shift 2 · Sesi 1'), { target: { value: '22:10' } });
  fireEvent.change(screen.getByLabelText('Shift 2 · Sesi 2'), { target: { value: '02:10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan pengaturan' }));
  expect(saved).toBeUndefined();
  const confirm = screen.getByRole('alertdialog', { name: 'Simpan pengaturan?' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Ya, simpan' }));
  await waitFor(() =>
    expect(saved?.shift_schedule).toEqual({ day: ['08:10', '13:10'], night: ['22:10', '02:10'] }),
  );
  await waitFor(() => expect(client.getQueryState(['schedule'])?.isInvalidated).toBe(true));
});

it('requires popup confirmation before removing a configured choice', async () => {
  setup();
  renderApp(<SettingsPage />, '/pengaturan?tab=general');
  fireEvent.click(await screen.findByRole('button', { name: 'Hapus line 2' }));
  const popup = screen.getByRole('alertdialog', { name: 'Hapus line 2?' });
  fireEvent.click(within(popup).getByRole('button', { name: 'Batal' }));
  expect(screen.getByText('Line 2')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Hapus line 2' }));
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ya, hapus' }),
  );
  expect(screen.queryByText('Line 2')).not.toBeInTheDocument();
});
