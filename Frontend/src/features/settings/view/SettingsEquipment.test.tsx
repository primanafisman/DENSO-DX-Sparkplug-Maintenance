import { it, expect } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
import { SettingsPage } from './SettingsPage';
function setup(role = 'Admin') {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: role, role })),
    ),
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 7 }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [fixtureDefinition()], count: 1 })),
    ),
    http.get('/api/v1/instruments/g1/calibrations', () =>
      HttpResponse.json(envelope({ items: [], next_cursor: null })),
    ),
  );
}
it('equipment tab archives only persisted availability, keeps failed drafts and supports reactivation', async () => {
  setup();
  let asset = fixtureInstrument(),
    fail = true;
  const writes: unknown[] = [];
  server.use(
    http.get('/api/v1/instruments', () =>
      HttpResponse.json(envelope({ items: [asset], next_cursor: null })),
    ),
    http.put('/api/v1/instruments/g1/status', async ({ request }) => {
      const body = (await request.json()) as { active: boolean };
      writes.push(body);
      if (fail)
        return HttpResponse.json(
          { success: false, message: 'Status gagal disimpan', code: 'TEMPORARY' },
          { status: 503 },
        );
      asset = { ...asset, active: body.active };
      return HttpResponse.json(envelope(asset));
    }),
  );
  renderApp(<SettingsPage />, '/pengaturan?tab=equipment');
  expect(screen.getByRole('tab', { name: 'Peralatan' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Kaliper' }));
  const edit = within(screen.getByRole('dialog'));
  fireEvent.change(edit.getByLabelText('Nama alat'), {
    target: { value: 'Draft yang belum disimpan' },
  });
  fireEvent.click(edit.getByRole('button', { name: 'Hapus dari pilihan' }));
  expect(writes).toEqual([]);
  fireEvent.click(edit.getByRole('button', { name: 'Batal hapus' }));
  expect(edit.getByLabelText('Nama alat')).toHaveValue('Draft yang belum disimpan');
  fireEvent.click(edit.getByRole('button', { name: 'Hapus dari pilihan' }));
  fireEvent.click(edit.getByRole('button', { name: 'Ya, hapus dari pilihan' }));
  expect(await edit.findByText('Server belum dapat memproses permintaan.')).toBeVisible();
  expect(edit.getByLabelText('Nama alat')).toHaveValue('Draft yang belum disimpan');
  fail = false;
  fireEvent.click(edit.getByRole('button', { name: 'Ya, hapus dari pilihan' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(writes).toEqual([{ active: false }, { active: false }]);
  expect(await screen.findByText('Nonaktif')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Kaliper' }));
  const archived = within(screen.getByRole('dialog'));
  fireEvent.click(archived.getByRole('button', { name: 'Aktifkan kembali' }));
  fireEvent.click(archived.getByRole('button', { name: 'Ya, aktifkan kembali' }));
  await waitFor(() => expect(writes.at(-1)).toEqual({ active: true }));
  expect(asset.name).toBe('Kaliper');
}, 10000);
it('read-only users can view the merged equipment list without editing or archive controls', async () => {
  setup('Viewer');
  server.use(
    http.get('/api/v1/instruments', () =>
      HttpResponse.json(envelope({ items: [fixtureInstrument()], next_cursor: null })),
    ),
  );
  renderApp(<SettingsPage />, '/pengaturan?tab=equipment');
  expect(await screen.findByText('Kaliper')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Edit Kaliper' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Tambah alat' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Line Produksi' }));
  expect(await screen.findByText('Line 17')).toBeVisible();
  expect(screen.queryByLabelText('Tambah line')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hapus line 17' })).not.toBeInTheDocument();
});
