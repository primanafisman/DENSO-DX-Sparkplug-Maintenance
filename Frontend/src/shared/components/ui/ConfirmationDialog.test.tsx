import { useState } from 'react';
import { it, expect, vi } from 'vitest';
import { screen, fireEvent, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from './ConfirmationDialog';
import { ApiError } from '../../lib/api';

it('uses a blocking popup, keeps focus inside and restores background and scroll after cancel', async () => {
  const user = userEvent.setup();
  const confirm = vi.fn();
  function Probe() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Hapus</button>
        {open && (
          <ConfirmationDialog
            title="Hapus pilihan?"
            onCancel={() => setOpen(false)}
            onConfirm={confirm}
            confirmLabel="Ya, hapus"
          />
        )}
      </>
    );
  }
  const view = render(<Probe />);
  const trigger = screen.getByRole('button', { name: 'Hapus' });
  trigger.focus();
  fireEvent.click(trigger);
  const popup = screen.getByRole('alertdialog', { name: 'Hapus pilihan?' });
  const cancel = screen.getByRole('button', { name: 'Batal' });
  expect(cancel).toHaveFocus();
  expect(view.container).toHaveAttribute('aria-hidden', 'true');
  expect(view.container.inert).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  await user.tab({ shift: true });
  expect(screen.getByRole('region', { name: 'Hapus pilihan?' })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Ya, hapus' })).toHaveFocus();
  fireEvent.keyDown(popup, { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(view.container).not.toHaveAttribute('aria-hidden');
  expect(trigger).toHaveFocus();
  expect(confirm).not.toHaveBeenCalled();
});

it('pending confirmation cannot be cancelled accidentally', () => {
  const cancel = vi.fn();
  render(<ConfirmationDialog title="Memproses" pending onCancel={cancel} onConfirm={() => {}} />);
  fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
  expect(cancel).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
});

it('includes the error detail summary in the keyboard focus cycle', () => {
  render(
    <ConfirmationDialog
      title="Coba lagi?"
      error={new ApiError('Error', 503, 'TEMPORARY')}
      onCancel={() => {}}
      onConfirm={() => {}}
    />,
  );
  const confirm = screen.getByRole('button', { name: 'Ya, simpan' });
  confirm.focus();
  fireEvent.keyDown(confirm, { key: 'Tab' });
  const content = screen.getByRole('region', { name: 'Coba lagi?' });
  expect(content).toHaveFocus();
  const details = within(content).getByText('Detail bantuan');
  details.focus();
  expect(details).toHaveFocus();
  content.focus();
  fireEvent.keyDown(content, { key: 'Tab', shiftKey: true });
  expect(confirm).toHaveFocus();
});

it('keeps confirmation actions outside long content so only the content needs to scroll', () => {
  const confirm = vi.fn();
  render(
    <ConfirmationDialog
      title="Konfirmasi hasil?"
      description="Periksa seluruh hasil sebelum menyimpan."
      error={new ApiError('Reader belum tersedia', 503, 'TEMPORARY')}
      onCancel={() => {}}
      onConfirm={confirm}
    >
      {Array.from({ length: 40 }, (_, i) => (
        <p key={i}>Sampel {i + 1}</p>
      ))}
    </ConfirmationDialog>,
  );
  const content = screen.getByRole('region', { name: 'Konfirmasi hasil?' });
  const actions = screen.getByRole('group', { name: 'Tindakan konfirmasi' });
  expect(within(content).getByText('Sampel 40')).toBeInTheDocument();
  expect(within(content).getByRole('alert')).toHaveTextContent('TEMPORARY');
  expect(content).not.toContainElement(actions);
  expect(within(actions).getByRole('button', { name: 'Batal' })).toHaveFocus();
  fireEvent.click(within(actions).getByRole('button', { name: 'Ya, simpan' }));
  expect(confirm).toHaveBeenCalledOnce();
});
