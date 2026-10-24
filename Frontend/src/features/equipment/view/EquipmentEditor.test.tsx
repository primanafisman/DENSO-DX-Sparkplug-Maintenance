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
  expect(screen.getByLabelText('Nomor / kode alat').closest('details')).not.toHaveAttribute('open');
  expect(screen.queryByLabelText('Alasan perubahan kondisi')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Nama alat'), { target: { value: 'MC Lowering 2' } });
  expect(screen.getByLabelText('Nomor / kode alat')).toHaveValue('MC Lowering 2');
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
it('details allow distinct identity fields without overwriting them on later name changes', async () => {
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
  fireEvent.click(screen.getByText('Detail identitas alat'));
  fireEvent.change(screen.getByLabelText('Nomor / kode alat'), { target: { value: 'PG-01' } });
  fireEvent.change(screen.getByLabelText('Alias pada label'), {
    target: { value: 'Pressure Test' },
  });
  fireEvent.change(screen.getByLabelText('Nama alat'), { target: { value: 'B3601 Baru' } });
  fireEvent.change(screen.getByLabelText('Kondisi alat'), { target: { value: 'not_working' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toMatchObject({
    name: 'B3601 Baru',
    code: 'PG-01',
    aliases: 'Pressure Test',
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
