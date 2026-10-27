import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { MaintenanceSettings, ProductType } from '../../../shared/lib/contracts';
import { GeneralSettings } from './GeneralSettings';

type SettingsSave = MaintenanceSettings & { review_reason: string };

function product(overrides: Partial<ProductType> = {}): ProductType {
  return {
    id: 'a',
    code: 'Sparkplug A',
    name: 'Sparkplug A',
    active: true,
    version: 1,
    ...overrides,
  };
}
function settings(overrides: Partial<MaintenanceSettings> = {}): MaintenanceSettings {
  return {
    lines: ['17'],
    allowed_samplers: ['Ldr'],
    night_rollover_hour: 9,
    shift_schedule: { day: ['08:00', '13:00'], night: ['22:00', '02:00'] },
    product_types: [product()],
    ...overrides,
  };
}
function setup(initial = settings(), onSave?: (body: SettingsSave) => Promise<unknown>) {
  const saved: SettingsSave[] = [];
  render(
    <GeneralSettings
      initial={initial}
      admin
      pending={false}
      onSave={
        onSave ??
        (async (body) => {
          saved.push(body);
        })
      }
    />,
  );
  return saved;
}
function edit(name: string) {
  fireEvent.click(screen.getByLabelText(`Edit ${name}`, { selector: 'button' }));
  return screen.getByRole('alertdialog', { name: `Edit ${name}` });
}
async function save(popup: HTMLElement) {
  fireEvent.click(within(popup).getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(popup).not.toBeInTheDocument());
}

it('adds a trimmed product through the single categorized popup and saves it immediately', async () => {
  const saved = setup();
  expect(screen.getAllByRole('button', { name: /^Tambah/ })).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Simpan pengaturan' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Nama')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Tambah line', { selector: 'button' }));
  const popup = screen.getByRole('alertdialog', { name: 'Tambah pengaturan' });
  expect(
    within(popup)
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['Line', 'Sampler', 'Tipe produk']);
  fireEvent.change(within(popup).getByLabelText('Kategori'), { target: { value: 'product' } });
  fireEvent.change(within(popup).getByLabelText('Nama'), { target: { value: ' Sparkplug Baru ' } });
  expect(within(popup).getByLabelText('Aktif')).toBeChecked();
  expect(saved).toHaveLength(0);
  await save(popup);
  expect(saved).toHaveLength(1);
  expect(saved[0].product_types).toEqual([
    product(),
    expect.objectContaining({
      id: expect.any(String),
      code: 'Sparkplug Baru',
      name: 'Sparkplug Baru',
      active: true,
      version: 1,
    }),
  ]);
  expect(screen.getByRole('button', { name: 'Edit tipe Sparkplug Baru' })).toBeVisible();
});

it('retains the failed draft and error until a successful retry commits the renamed inactive line', async () => {
  const saved: SettingsSave[] = [];
  let rejectFirst!: (reason: unknown) => void;
  let resolveSecond!: () => void;
  const first = new Promise<void>((_resolve, reject) => {
    rejectFirst = reject;
  });
  const second = new Promise<void>((resolve) => {
    resolveSecond = resolve;
  });
  setup(settings(), async (body) => {
    saved.push(body);
    await (saved.length === 1 ? first : second);
  });
  const popup = edit('line 17');
  fireEvent.change(within(popup).getByLabelText('Nama'), { target: { value: '18' } });
  fireEvent.click(within(popup).getByLabelText('Aktif'));
  fireEvent.click(within(popup).getByRole('button', { name: 'Simpan' }));
  expect(screen.getByRole('alertdialog', { name: 'Edit line 17' })).toBeVisible();
  await act(async () => {
    rejectFirst(new Error('Connection lost'));
  });
  const retained = screen.getByRole('alertdialog', { name: 'Edit line 17' });
  expect(within(retained).getByLabelText('Nama')).toHaveValue('18');
  expect(within(retained).getByLabelText('Aktif')).not.toBeChecked();
  expect(within(retained).getByRole('alert')).toBeVisible();
  fireEvent.click(within(retained).getByRole('button', { name: 'Simpan' }));
  expect(saved).toHaveLength(2);
  expect(saved[1]).toMatchObject({ lines: [], inactive_lines: ['18'] });
  await act(async () => {
    resolveSecond();
  });
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(
    within(screen.getByRole('region', { name: 'Line produksi' })).getByText('Nonaktif'),
  ).toBeVisible();
  const reactivate = edit('line 18');
  fireEvent.click(within(reactivate).getByLabelText('Aktif'));
  // The retry promise is already resolved, so the next save completes normally.
  await save(reactivate);
  expect(saved[2]).toMatchObject({ lines: ['18'], inactive_lines: [] });
  expect(
    within(screen.getByRole('region', { name: 'Line produksi' })).queryByText('Nonaktif'),
  ).not.toBeInTheDocument();
});

it('returns from deletion confirmation to the draft and removes the saved identity only when confirmed', async () => {
  const saved = setup();
  const popup = edit('line 17');
  fireEvent.change(within(popup).getByLabelText('Nama'), { target: { value: '99' } });
  fireEvent.click(within(popup).getByLabelText('Aktif'));
  fireEvent.click(within(popup).getByRole('button', { name: 'Hapus line 17' }));
  expect(saved).toHaveLength(0);
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Hapus line 17?' })).getByRole('button', {
      name: 'Batal',
    }),
  );
  const retained = screen.getByRole('alertdialog', { name: 'Edit line 17' });
  expect(within(retained).getByLabelText('Nama')).toHaveValue('99');
  expect(within(retained).getByLabelText('Aktif')).not.toBeChecked();
  fireEvent.click(within(retained).getByRole('button', { name: 'Hapus line 17' }));
  fireEvent.click(
    within(screen.getByRole('alertdialog', { name: 'Hapus line 17?' })).getByRole('button', {
      name: 'Ya, hapus',
    }),
  );
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ lines: [], allowed_samplers: ['Ldr'] });
  expect(saved[0].inactive_lines ?? []).toEqual([]);
  expect(screen.queryByRole('button', { name: 'Edit line 17' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit line 99' })).not.toBeInTheDocument();
});

it('preserves hidden settings and distinct legacy codes across intermediate saved names', async () => {
  const initial = {
    ...settings({
      product_types: [
        product({ code: 'SP-A' }),
        product({ id: 'empty', code: '', name: 'Empty code' }),
      ],
    }),
    inactive_lines: ['Cadangan'],
    inactive_samplers: ['Cadangan sampler'],
    server_metadata: { revision: 41, source: 'import' },
  };
  const saved = setup(initial);
  const legacy = edit('tipe Sparkplug A');
  expect(within(legacy).queryByLabelText(/Kode/)).not.toBeInTheDocument();
  fireEvent.change(within(legacy).getByLabelText('Nama'), { target: { value: 'SP-A' } });
  await save(legacy);
  const legacyAgain = edit('tipe SP-A');
  fireEvent.change(within(legacyAgain).getByLabelText('Nama'), {
    target: { value: 'Sparkplug A revisi' },
  });
  await save(legacyAgain);
  const emptyCode = edit('tipe Empty code');
  fireEvent.change(within(emptyCode).getByLabelText('Nama'), {
    target: { value: 'Sparkplug Baru' },
  });
  await save(emptyCode);
  expect(saved[2]).toMatchObject({
    lines: ['17'],
    inactive_lines: ['Cadangan'],
    allowed_samplers: ['Ldr'],
    inactive_samplers: ['Cadangan sampler'],
    night_rollover_hour: 9,
    shift_schedule: { day: ['08:00', '13:00'], night: ['22:00', '02:00'] },
    server_metadata: { revision: 41, source: 'import' },
    review_reason: expect.any(String),
    product_types: [
      { id: 'a', name: 'Sparkplug A revisi', code: 'SP-A', version: 1 },
      { id: 'empty', name: 'Sparkplug Baru', code: 'Sparkplug Baru', version: 1 },
    ],
  });
});

it.each(['line', 'sampler', 'product'] as const)(
  'counts inactive entries toward the %s category limit',
  (category) => {
    const atLimit = {
      line: {
        lines: Array.from({ length: 199 }, (_, i) => String(i + 1)),
        inactive_lines: ['Cadangan'],
      },
      sampler: {
        allowed_samplers: Array.from({ length: 99 }, (_, i) => `Sampler ${i}`),
        inactive_samplers: ['Leader'],
      },
      product: {
        product_types: Array.from({ length: 200 }, (_, i) =>
          product({ id: `p-${i}`, code: `P ${i}`, name: `P ${i}`, active: i !== 199 }),
        ),
      },
    };
    const saved = setup(settings(atLimit[category]));
    fireEvent.click(screen.getByText('Tambah line', { selector: 'button' }));
    const popup = within(screen.getByRole('alertdialog', { name: 'Tambah pengaturan' }));
    fireEvent.change(popup.getByLabelText('Kategori'), { target: { value: category } });
    fireEvent.change(popup.getByLabelText('Nama'), { target: { value: 'Additional' } });
    expect(popup.getByRole('button', { name: 'Simpan' })).toBeDisabled();
    expect(saved).toHaveLength(0);
  },
);

it('rejects duplicate names across active and inactive choices without preventing valid renames', async () => {
  const saved = setup(settings({ lines: ['1'], inactive_lines: ['Cadangan'] }));
  const editor = edit('line 1');
  expect(within(editor).getByRole('button', { name: 'Simpan' })).toBeEnabled();
  fireEvent.change(within(editor).getByLabelText('Nama'), { target: { value: ' cadangan ' } });
  expect(within(editor).getByRole('button', { name: 'Simpan' })).toBeDisabled();
  fireEvent.change(within(editor).getByLabelText('Nama'), { target: { value: 'A'.repeat(65) } });
  expect(within(editor).getByRole('button', { name: 'Simpan' })).toBeDisabled();
  fireEvent.change(within(editor).getByLabelText('Nama'), { target: { value: 'A'.repeat(64) } });
  await save(editor);
  expect(saved).toHaveLength(1);
});

it('shows saved active and inactive choices without editing controls to read-only users', () => {
  render(
    <GeneralSettings
      initial={settings({ inactive_lines: ['18'], inactive_samplers: ['Cadangan'] })}
      admin={false}
      pending={false}
      onSave={async () => {
        throw new Error('Read-only settings cannot save');
      }}
    />,
  );
  expect(
    within(screen.getByRole('region', { name: 'Line produksi' })).getByText('Line 17'),
  ).toBeVisible();
  expect(
    within(screen.getByRole('region', { name: 'Line produksi' })).getByText('Line 18'),
  ).toBeVisible();
  expect(within(screen.getByRole('region', { name: 'Sampler' })).getByText('Ldr')).toBeVisible();
  expect(
    within(screen.getByRole('region', { name: 'Tipe produk' })).getByText('Sparkplug A'),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: /Tambah|Edit|Simpan/ })).not.toBeInTheDocument();
});
