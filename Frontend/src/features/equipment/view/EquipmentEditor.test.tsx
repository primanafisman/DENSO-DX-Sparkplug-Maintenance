import { expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp } from '../../../test/render';
import { fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
import { EquipmentEditor } from './EquipmentEditor';
it('only asks the name and mirrors its code and alias, while sorting linked inspections alphabetically', async () => {
  const save = vi.fn();
  renderApp(
    <EquipmentEditor
      definitions={[
        fixtureDefinition({ id: 'z', name: 'Talc' }),
        fixtureDefinition({ id: 'a', name: 'Caulking' }),
        fixtureDefinition({ id: 'b', name: 'EE Cutting' }),
      ]}
      onSave={save}
      onClose={() => {}}
      saving={false}
      error={null}
    />,
  );
  expect(screen.queryByLabelText(/Nomor \/ kode alat/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Alasan perubahan kondisi')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nama alat'), { target: { value: 'MC Lowering 2' } });
  expect(screen.getByLabelText('Alias pada label')).toHaveValue('MC Lowering 2');
  const checks = within(screen.getByTestId('linked-checks')).getAllByRole('checkbox');
  expect(checks.map((c) => c.getAttribute('value'))).toEqual(['a', 'b', 'z']);
  fireEvent.change(screen.getByLabelText('Kondisi alat'), { target: { value: 'working' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toMatchObject({
    name: 'MC Lowering 2',
    code: 'MC Lowering 2',
    aliases: 'MC Lowering 2',
    area: '',
  });
});
it('preserves existing private codes and distinct aliases when the visible name changes', async () => {
  const save = vi.fn();
  renderApp(
    <EquipmentEditor
      equipment={fixtureInstrument({ name: 'B3601', code: 'PG-01', aliases: ['Pressure Test'] })}
      definitions={[]}
      onSave={save}
      onClose={() => {}}
      saving={false}
      error={null}
    />,
  );
  fireEvent.click(screen.getByText('Detail identitas alat'));
  expect(screen.queryByLabelText(/Nomor \/ kode alat/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Alias pada label'), {
    target: { value: 'Pressure Test manual' },
  });
  fireEvent.change(screen.getByLabelText('Nama alat'), { target: { value: 'B3601 Baru' } });
  fireEvent.change(screen.getByLabelText('Kondisi alat'), { target: { value: 'not_working' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toMatchObject({
    name: 'B3601 Baru',
    code: 'PG-01',
    aliases: 'Pressure Test manual',
  });
});

it('requires an explicit working condition and does not request calibration history for editing', async () => {
  const save = vi.fn();
  renderApp(
    <EquipmentEditor
      equipment={fixtureInstrument({ condition: 'unknown' })}
      definitions={[]}
      onSave={save}
      onClose={() => {}}
      saving={false}
      error={null}
    />,
  );
  const condition = screen.getByLabelText('Kondisi alat');
  const options = within(condition).getAllByRole('option');
  expect(
    options
      .filter((option) => !option.hasAttribute('disabled'))
      .map((option) => option.textContent),
  ).toEqual(['Berfungsi', 'Tidak berfungsi']);
  expect(screen.queryByText(/Versi kalibrasi/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  expect(
    await screen.findByText(/Pilih kondisi alat: Berfungsi atau Tidak berfungsi/),
  ).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(condition, { target: { value: 'working' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].condition).toBe('working');
});

it('validates enabled OK limits and saves a one-sided bound separately from the physical range', async () => {
  const save = vi.fn();
  renderApp(
    <EquipmentEditor
      definitions={[]}
      onSave={save}
      onClose={() => {}}
      saving={false}
      error={null}
    />,
  );
  fireEvent.change(screen.getByLabelText('Nama alat'), { target: { value: 'B3601' } });
  fireEvent.change(screen.getByLabelText('Kondisi alat'), { target: { value: 'working' } });
  expect(screen.queryByLabelText('Minimum OK')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Gunakan batas OK alat'));
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  expect(await screen.findByText(/Isi minimal satu batas OK/)).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Minimum OK'), { target: { value: '0.4' } });
  fireEvent.change(screen.getByLabelText('Maksimum OK'), { target: { value: '0.3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  expect(await screen.findByText(/Maksimum OK harus/)).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Maksimum OK'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({
    use_acceptance_limits: true,
    acceptance_minimum: 0.4,
    acceptance_maximum: null,
    minimum: 0,
    maximum: 1,
  });
  expect(screen.getByLabelText('Rentang fisik minimum').closest('details')).not.toHaveAttribute(
    'open',
  );
});

it('restores a zero OK bound, allows falling back to inspection limits and hides numeric bounds for visual tools', async () => {
  const save = vi.fn();
  renderApp(
    <EquipmentEditor
      equipment={fixtureInstrument({ acceptance_limits: { minimum: 0, maximum: 0.5 } })}
      definitions={[]}
      onSave={save}
      onClose={() => {}}
      saving={false}
      error={null}
    />,
  );
  expect(screen.getByLabelText('Gunakan batas OK alat')).toBeChecked();
  expect(screen.getByLabelText('Minimum OK')).toHaveValue(0);
  expect(screen.getByLabelText('Maksimum OK')).toHaveValue(0.5);
  fireEvent.click(screen.getByLabelText('Gunakan batas OK alat'));
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].use_acceptance_limits).toBe(false);
  fireEvent.change(screen.getByLabelText('Metode input alat'), { target: { value: 'visual' } });
  expect(screen.queryByLabelText('Gunakan batas OK alat')).not.toBeInTheDocument();
});
