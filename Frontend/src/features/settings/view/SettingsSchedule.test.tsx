import { it, expect } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope } from '../../../test/fixtures';
import type { MaintenanceSettings } from '../../../shared/lib/contracts';
import { SettingsPage } from './SettingsPage';

type SettingsSave = MaintenanceSettings & { review_reason: string };
function setup() {
  const saved: SettingsSave[] = [];
  let settings: MaintenanceSettings = {
    lines: ['17'],
    allowed_samplers: ['Ldr'],
    night_rollover_hour: 9,
    shift_schedule: { day: ['07:45', '12:45'], night: ['21:15', '01:15'] },
    product_types: [],
  };
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [], count: 0 })),
    ),
    http.get('/api/v1/maintenance/settings', () => HttpResponse.json(envelope(settings))),
    http.put('/api/v1/maintenance/settings', async ({ request }) => {
      const body = (await request.json()) as SettingsSave;
      saved.push(body);
      settings = body;
      return HttpResponse.json(envelope({ value: body, version: saved.length + 1 }));
    }),
  );
  return saved;
}

it('saves the four collapsed shift times only after explicit schedule confirmation', async () => {
  const saved = setup();
  const { client } = renderApp(<SettingsPage />, '/pengaturan?tab=general');
  client.setQueryData(['schedule'], { old: true });
  await screen.findByRole('button', { name: 'Edit line 17' });
  expect(screen.queryByLabelText(/Batas pergantian tanggal/)).not.toBeInTheDocument();
  const detail = screen.getByText('Detail jadwal shift').closest('details')!;
  expect(detail).not.toHaveAttribute('open');
  fireEvent.click(screen.getByText('Detail jadwal shift'));
  fireEvent.change(screen.getByLabelText('Shift 1 · Sesi 1'), { target: { value: '08:10' } });
  fireEvent.change(screen.getByLabelText('Shift 1 · Sesi 2'), { target: { value: '13:10' } });
  fireEvent.change(screen.getByLabelText('Shift 2 · Sesi 1'), { target: { value: '22:10' } });
  fireEvent.change(screen.getByLabelText('Shift 2 · Sesi 2'), { target: { value: '02:10' } });
  expect(saved).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Simpan jadwal' }));
  expect(saved).toHaveLength(0);
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Simpan jadwal shift?' })).getByRole('button', {
      name: 'Batal',
    }),
  );
  expect(saved).toHaveLength(0);
  expect(screen.getByLabelText('Shift 1 · Sesi 1')).toHaveValue('08:10');
  fireEvent.click(screen.getByRole('button', { name: 'Simpan jadwal' }));
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Simpan jadwal shift?' })).getByRole('button', {
      name: 'Ya, simpan',
    }),
  );
  await waitFor(() => expect(saved).toHaveLength(1));
  expect(saved[0]).toMatchObject({
    lines: ['17'],
    allowed_samplers: ['Ldr'],
    night_rollover_hour: 9,
    shift_schedule: { day: ['08:10', '13:10'], night: ['22:10', '02:10'] },
    review_reason: expect.any(String),
  });
  await waitFor(() => expect(client.getQueryState(['schedule'])?.isInvalidated).toBe(true));
});

it('rejects invalid schedule drafts and saves item edits without leaking those draft times', async () => {
  const saved = setup();
  renderApp(<SettingsPage />, '/pengaturan?tab=general');
  await screen.findByRole('button', { name: 'Edit line 17' });
  fireEvent.click(screen.getByText('Detail jadwal shift'));
  const first = screen.getByLabelText('Shift 1 · Sesi 1');
  for (const invalid of ['', '12:45', '14:00']) {
    fireEvent.change(first, { target: { value: invalid } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan jadwal' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(saved).toHaveLength(0);
  }
  fireEvent.change(first, { target: { value: '08:10' } });
  fireEvent.change(screen.getByLabelText('Shift 1 · Sesi 2'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Edit line 17' }));
  const edit = screen.getByRole('alertdialog', { name: 'Edit line 17' });
  fireEvent.change(within(edit).getByLabelText('Nama'), { target: { value: '18' } });
  fireEvent.click(within(edit).getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(saved).toHaveLength(1));
  expect(saved[0]).toMatchObject({
    lines: ['18'],
    night_rollover_hour: 9,
    shift_schedule: { day: ['07:45', '12:45'], night: ['21:15', '01:15'] },
  });
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Shift 1 · Sesi 1')).toHaveValue('08:10');
  expect(screen.getByLabelText('Shift 1 · Sesi 2')).toHaveValue('');
});
