import { expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderApp } from '../../../test/render';
import { fixtureDefinition } from '../../../test/fixtures';
import { DefinitionEditor } from './DefinitionEditor';
import { newDefinition } from '../model/newDefinition';

it('edits and submits the inspection number with the existing definition', async () => {
  const save = vi.fn();
  renderApp(
    <DefinitionEditor
      definition={fixtureDefinition({ check_number: 4 })}
      onClose={() => {}}
      onSave={save}
      saving={false}
      error={null}
    />,
  );
  const input = screen.getByLabelText('Nomor pemeriksaan');
  expect(input).toHaveValue(4);
  fireEvent.change(input, { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan pemeriksaan' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ check_number: 12 })),
  );
});
it('suggests the next number for a new inspection', () => {
  expect(newDefinition(48).check_number).toBe(48);
});
it('blocks a missing or non-positive inspection number before saving', async () => {
  const save = vi.fn();
  renderApp(
    <DefinitionEditor
      definition={fixtureDefinition({ check_number: 4 })}
      onClose={() => {}}
      onSave={save}
      saving={false}
      error={null}
    />,
  );
  fireEvent.change(screen.getByLabelText('Nomor pemeriksaan'), { target: { value: '0' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Simpan pemeriksaan' }).closest('form')!);
  expect(await screen.findByText('Nomor pemeriksaan minimal 1.')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
});
