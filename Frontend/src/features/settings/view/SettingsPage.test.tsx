import { it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
import { SettingsPage } from './SettingsPage';
import { DefinitionEditor } from './DefinitionEditor';
it('settings preserve source guidance without requesting a revision reason', async () => {
  server.use(
    http.get('/api/v1/instruments', () =>
      HttpResponse.json(envelope({ items: [], next_cursor: null })),
    ),
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({
          lines: ['17'],
          allowed_samplers: ['Ldr'],
          night_rollover_hour: 12,
          product_types: [],
        }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: [fixtureDefinition({ review_notes: ['Periksa jadwal dari sumber'] })],
          count: 1,
          source_gaps: { missing_rows: [17], clipped_row: 45 },
        }),
      ),
    ),
  );
  renderApp(<SettingsPage />);
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
    'Daftar Pemeriksaan',
    'Peralatan',
    'Line Produksi',
  ]);
  expect(await screen.findByText('Periksa jadwal dari sumber')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Hapus dari pilihan' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit EE Cutting' }));
  expect(screen.queryByLabelText('Alasan revisi')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('1 kali per shift')).toBeVisible();
});

it('admin adds a linked inspection and removes it from active options while retaining its row', async () => {
  let rows = [fixtureDefinition()],
    created: Record<string, unknown> | null = null,
    status: Record<string, unknown> | null = null;
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({
          lines: ['17'],
          allowed_samplers: ['Ldr'],
          night_rollover_hour: 12,
          product_types: [],
        }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: rows,
          count: rows.length,
          source_gaps: { missing_rows: [], clipped_row: 45 },
        }),
      ),
    ),
    http.get('/api/v1/instruments', () =>
      HttpResponse.json(envelope({ items: [fixtureInstrument()], next_cursor: null })),
    ),
    http.post('/api/v1/maintenance/definitions', async ({ request }) => {
      created = (await request.json()) as Record<string, unknown>;
      const d = fixtureDefinition({
        ...created,
        id: 'custom-check',
        name: 'Packing tambahan',
        kind: 'visual',
        input_method: 'ok_ng',
        unit: null,
        limits: null,
        active: true,
      });
      rows = [...rows, d];
      return HttpResponse.json(envelope(d), { status: 201 });
    }),
    http.put('/api/v1/maintenance/definitions/custom-check/status', async ({ request }) => {
      status = (await request.json()) as Record<string, unknown>;
      rows = rows.map((d) => (d.id === 'custom-check' ? { ...d, active: false } : d));
      return HttpResponse.json(envelope(rows[1]));
    }),
  );
  renderApp(<SettingsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tambah pemeriksaan' }));
  const dialog = within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Nama pemeriksaan'), {
    target: { value: 'Packing tambahan' },
  });
  fireEvent.change(dialog.getByLabelText('Persyaratan / standar'), {
    target: { value: 'Tidak rusak' },
  });
  fireEvent.change(dialog.getByLabelText('Metode pemeriksaan'), {
    target: { value: 'Lihat dan raba' },
  });
  fireEvent.click(await dialog.findByLabelText('Kaliper'));
  fireEvent.click(dialog.getByRole('button', { name: 'Tambah pemeriksaan' }));
  await waitFor(() =>
    expect(created).toMatchObject({
      name: 'Packing tambahan',
      input_method: 'ok_ng',
      instrument_ids: ['g1'],
    }),
  );
  const row = (await screen.findByText('Packing tambahan')).closest('tr')!;
  expect(within(row).queryByRole('button', { name: 'Hapus dari pilihan' })).not.toBeInTheDocument();
  fireEvent.click(within(row).getByRole('button', { name: 'Edit Packing tambahan' }));
  const editor = within(screen.getByRole('dialog'));
  fireEvent.change(editor.getByLabelText('Nama pemeriksaan'), {
    target: { value: 'Unsaved definition' },
  });
  fireEvent.click(editor.getByRole('button', { name: 'Hapus dari pilihan' }));
  expect(status).toBeNull();
  fireEvent.click(editor.getByRole('button', { name: 'Batal hapus' }));
  expect(editor.getByLabelText('Nama pemeriksaan')).toHaveValue('Unsaved definition');
  fireEvent.click(editor.getByRole('button', { name: 'Hapus dari pilihan' }));
  fireEvent.click(editor.getByRole('button', { name: 'Ya, hapus dari pilihan' }));
  await waitFor(() => expect(status).toEqual({ active: false, review_reason: expect.any(String) }));
  expect(await screen.findByText('Nonaktif')).toBeVisible();
});
it('weekly edit sends explicit weekdays and retains original paper time guidance', async () => {
  const d = fixtureDefinition({ intervals: ['weekly'] });
  d.interval_guide.day.times = [{ time: '09:45', day_offset: 0 }];
  const save = vi.fn();
  renderApp(
    <DefinitionEditor
      definition={d}
      onClose={() => {}}
      onSave={save}
      saving={false}
      error={null}
    />,
  );
  fireEvent.click(screen.getByText('Waktu pemeriksaan dan sumber'));
  fireEvent.click(screen.getByLabelText('Shift 1 · 07:45'));
  fireEvent.click(screen.getByLabelText('Sen'));
  fireEvent.click(screen.getByRole('button', { name: 'Simpan revisi' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const body = save.mock.calls[0][0];
  expect(body.occurrence_rule).toEqual({ slot_ids: ['day-0745'], weekdays: [1] });
  expect(body.interval_guide.day.times).toEqual([{ time: '09:45', day_offset: 0 }]);
  expect(body.review_reason).toEqual(expect.any(String));
});
it('clearing all occurrence slots explicitly resets the saved rule', async () => {
  const save = vi.fn();
  renderApp(
    <DefinitionEditor
      definition={fixtureDefinition({ occurrence_rule: { slot_ids: ['day-0745'] } })}
      onClose={() => {}}
      onSave={save}
      saving={false}
      error={null}
    />,
  );
  fireEvent.click(screen.getByText('Waktu pemeriksaan dan sumber'));
  fireEvent.click(screen.getByLabelText('Shift 1 · 07:45'));
  fireEvent.click(screen.getByRole('button', { name: 'Simpan revisi' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0].occurrence_rule).toBeNull();
});

it('settings add or remove active lines1 to17 and sampler options through controls', async () => {
  let saved: { lines: string[]; allowed_samplers: string[] } | undefined;
  server.use(
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({
          lines: ['17'],
          allowed_samplers: ['Ldr'],
          night_rollover_hour: 12,
          product_types: [],
        }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({ items: [], count: 0, source_gaps: { missing_rows: [], clipped_row: null } }),
      ),
    ),
    http.put('/api/v1/maintenance/settings', async ({ request }) => {
      saved = (await request.json()) as typeof saved;
      return HttpResponse.json(envelope({ value: saved, version: 2 }));
    }),
  );
  renderApp(<SettingsPage />);
  fireEvent.click(await screen.findByRole('tab', { name: 'Line Produksi' }));
  const first = await screen.findByLabelText('Line 1');
  expect(screen.queryByLabelText('Line 18')).not.toBeInTheDocument();
  fireEvent.click(first);
  fireEvent.click(screen.getByLabelText('Line 17'));
  fireEvent.change(screen.getByLabelText('Tambah sampler'), { target: { value: 'Leader 2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tambah sampler' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hapus sampler Ldr' }));
  fireEvent.click(screen.getByRole('button', { name: /Simpan pengaturan/ }));
  await waitFor(() => expect(saved?.lines).toEqual(['1']));
  expect(saved?.allowed_samplers).toEqual(['Leader 2']);
});
