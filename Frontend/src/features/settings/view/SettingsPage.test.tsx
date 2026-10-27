import { it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
import { SettingsPage } from './SettingsPage';
import { DefinitionEditor } from './DefinitionEditor';

it('shows permanent inspection numbers with the source fallback instead of row positions', async () => {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 12 }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: [
            fixtureDefinition({
              id: 'permanent',
              name: 'Pemeriksaan tetap',
              check_number: 42,
              source_number: 8,
            }),
            fixtureDefinition({ id: 'legacy', name: 'Pemeriksaan sumber', source_number: 7 }),
            fixtureDefinition({ id: 'unnumbered', name: 'Pemeriksaan tanpa nomor' }),
            fixtureDefinition({
              id: 'inactive',
              name: 'Pemeriksaan nonaktif',
              check_number: 99,
              active: false,
            }),
          ],
          count: 4,
          source_gaps: { missing_rows: [], clipped_row: null },
        }),
      ),
    ),
  );
  renderApp(<SettingsPage />);
  const first = (await screen.findByText('Pemeriksaan tetap')).closest('tr')!;
  expect(screen.getByRole('columnheader', { name: 'No. Pemeriksaan' })).toBeVisible();
  expect(screen.queryByRole('columnheader', { name: 'PEMERIKSAAN' })).not.toBeInTheDocument();
  expect(within(first).getByRole('rowheader')).toHaveTextContent(/42\s*Pemeriksaan tetap/);
  expect(within(first).getByRole('link')).toHaveAttribute('href', '/riwayat/permanent');
  expect(
    within(screen.getByText('Pemeriksaan sumber').closest('tr')!).getByRole('rowheader'),
  ).toHaveTextContent(/7\s*Pemeriksaan sumber/);
  expect(
    within(screen.getByText('Pemeriksaan tanpa nomor').closest('tr')!).getByRole('rowheader'),
  ).toHaveTextContent(/—\s*Pemeriksaan tanpa nomor/);
  expect(screen.queryByText('Pemeriksaan nonaktif')).not.toBeInTheDocument();
});

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
    'Line produksi',
  ]);
  expect(await screen.findByText('Periksa jadwal dari sumber')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Hapus dari pilihan' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit EE Cutting' }));
  expect(screen.queryByLabelText('Alasan revisi')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Riwayat revisi' })).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('1 kali per shift')).toBeVisible();
});

it('lists source standard clauses, requirements and named master samples without inventing limits', async () => {
  const master = fixtureDefinition({
    name: 'Pengecekan Master Packing Check',
    kind: 'functional',
    input_method: 'ok_ng',
    limits: null,
    unit: null,
    standard_text: 'Zero 8.25 ± 0.02; Plus 9.25 ± 0.02; Minus 7.25 ± 0.02. Semua display CMPLT On.',
    requirements: [{ id: 'complete', label: 'Display CMPLT On' }],
    samples: [
      { id: 'zero', label: 'Zero' },
      { id: 'plus', label: 'Plus (+)' },
      { id: 'minus', label: 'Minus (-)' },
    ],
    sample_count: 3,
  });
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 12 }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: [master],
          count: 1,
          source_gaps: { missing_rows: [], clipped_row: null },
        }),
      ),
    ),
  );
  renderApp(<SettingsPage />);
  const row = (await screen.findByText(master.name)).closest('tr')!;
  const standards = within(row).getByRole('list', {
    name: 'Standar Pengecekan Master Packing Check',
  });
  expect(
    within(standards)
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual(['Zero 8.25 ± 0.02', 'Plus 9.25 ± 0.02', 'Minus 7.25 ± 0.02. Semua display CMPLT On.']);
  expect(within(row).getByText('Zero', { exact: true })).toBeVisible();
  expect(within(row).getByText('Plus (+)', { exact: true })).toBeVisible();
  expect(within(row).getByText('Minus (-)', { exact: true })).toBeVisible();
  expect(within(row).queryByLabelText('Batas penerimaan')).not.toBeInTheDocument();
});

it('admin confirms adding a linked inspection and removes its row without deleting history', async () => {
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
  fireEvent.click(await screen.findByRole('button', { name: 'Ya, simpan' }));
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
  fireEvent.click(screen.getByRole('button', { name: 'Batal hapus' }));
  expect(editor.getByLabelText('Nama pemeriksaan')).toHaveValue('Unsaved definition');
  fireEvent.click(editor.getByRole('button', { name: 'Hapus dari pilihan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus dari pilihan' }));
  await waitFor(() => expect(status).toEqual({ active: false, review_reason: expect.any(String) }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Edit Packing tambahan' })).not.toBeInTheDocument(),
  );
  expect(rows.find((d) => d.id === 'custom-check')?.active).toBe(false);
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
  fireEvent.click(screen.getByRole('button', { name: 'Simpan pemeriksaan' }));
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
  fireEvent.click(screen.getByRole('button', { name: 'Simpan pemeriksaan' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0].occurrence_rule).toBeNull();
});

it('settings accept manually named lines beyond17, reject duplicates and remove lines and samplers', async () => {
  let saved = {
    lines: ['17'],
    allowed_samplers: ['Ldr'],
    night_rollover_hour: 12,
    product_types: [],
  };
  server.use(
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/settings', () => HttpResponse.json(envelope(saved))),
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
  fireEvent.click(await screen.findByRole('tab', { name: 'Line produksi' }));
  const add = async (name: string, category = 'line') => {
    fireEvent.click(await screen.findByRole('button', { name: 'Tambah line' }));
    const popup = within(screen.getByRole('alertdialog', { name: 'Tambah pengaturan' }));
    fireEvent.change(popup.getByLabelText('Kategori'), { target: { value: category } });
    fireEvent.change(popup.getByLabelText('Nama'), { target: { value: name } });
    fireEvent.click(popup.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  };
  const remove = async (label: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit ' + label }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus ' + label }));
    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  };
  await add('18');
  await add('Line A');
  fireEvent.click(screen.getByRole('button', { name: 'Tambah line' }));
  fireEvent.change(screen.getByLabelText('Nama'), { target: { value: ' line a ' } });
  expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
  await remove('line 17');
  await add('Leader 2', 'sampler');
  await remove('sampler Ldr');
  await waitFor(() => expect(saved?.lines).toEqual(['18', 'Line A']));
  expect(saved?.allowed_samplers).toEqual(['Leader 2']);
});

it('shows product names alone, mirrors new names internally and preserves distinct legacy product codes', async () => {
  let saved = {
    lines: ['17'],
    allowed_samplers: ['Ldr'],
    night_rollover_hour: 12,
    product_types: [{ id: 'legacy', code: 'SP-A', name: 'Sparkplug A', active: true, version: 1 }],
  };
  server.use(
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/settings', () => HttpResponse.json(envelope(saved))),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [], count: 0 })),
    ),
    http.put('/api/v1/maintenance/settings', async ({ request }) => {
      saved = (await request.json()) as typeof saved;
      return HttpResponse.json(envelope({ value: saved, version: 2 }));
    }),
  );
  renderApp(<SettingsPage />, '/pengaturan?tab=general');
  fireEvent.click(await screen.findByRole('button', { name: 'Edit tipe Sparkplug A' }));
  const legacy = screen.getByLabelText('Nama');
  fireEvent.change(legacy, { target: { value: 'SP-A' } });
  fireEvent.change(legacy, { target: { value: 'Sparkplug A revisi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Tambah line' }));
  fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'product' } });
  fireEvent.change(screen.getByLabelText('Nama'), { target: { value: 'Sparkplug Baru' } });
  expect(screen.queryByRole('columnheader', { name: 'KODE' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Kode /)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() =>
    expect(saved?.product_types).toEqual([
      expect.objectContaining({ id: 'legacy', name: 'Sparkplug A revisi', code: 'SP-A' }),
      expect.objectContaining({ name: 'Sparkplug Baru', code: 'Sparkplug Baru' }),
    ]),
  );
});

it('requires classifying a legacy inspection before saving and sends the selected target', async () => {
  const save = vi.fn();
  renderApp(
    <DefinitionEditor
      definition={fixtureDefinition({ inspection_target: undefined })}
      onClose={() => {}}
      onSave={save}
      saving={false}
      error={null}
    />,
  );
  const field = screen.getByLabelText('Sasaran pemeriksaan');
  expect(field).toBeRequired();
  expect(field).toHaveValue('');
  fireEvent.submit(screen.getByRole('button', { name: 'Simpan pemeriksaan' }).closest('form')!);
  expect(await screen.findByText('Pilih sasaran pemeriksaan.')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: 'machine' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan pemeriksaan' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].inspection_target).toBe('machine');
});

it('keeps all configured lines up to the supported200-line limit without a fixed numeric range', async () => {
  const lines = Array.from({ length: 200 }, (_, index) => String(index + 1));
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(envelope({ lines, allowed_samplers: ['Ldr'], night_rollover_hour: 12 })),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [], count: 0 })),
    ),
  );
  renderApp(<SettingsPage />, '/pengaturan?tab=general');
  fireEvent.click(await screen.findByText('Tambah line', { selector: 'button' }));
  const popup = within(screen.getByRole('alertdialog', { name: 'Tambah pengaturan' }));
  expect(screen.getByText('Line 200')).toBeVisible();
  fireEvent.change(popup.getByLabelText('Nama'), { target: { value: '201' } });
  expect(popup.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  fireEvent.change(popup.getByLabelText('Kategori'), { target: { value: 'sampler' } });
  expect(popup.getByRole('button', { name: 'Simpan' })).toBeEnabled();
});
