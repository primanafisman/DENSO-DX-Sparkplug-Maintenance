import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorDialog, ErrorMessage } from './index';
import { ApiError } from '../../lib/api';

const original = 'Photo/crop evidence already used; capture a new measurement sample.';
it('explains reused photo evidence in Indonesian without changing the machine error', () => {
  const error = new ApiError(original, 409, 'EVIDENCE_ALREADY_CONFIRMED', 'request-123');
  render(<ErrorMessage error={error} />);
  expect(screen.getByText('Foto ini sudah digunakan.')).toBeVisible();
  expect(
    screen.getByText('Ambil foto baru atau periksa hasil sebelumnya di Riwayat.'),
  ).toBeVisible();
  expect(screen.queryByText(original)).not.toBeInTheDocument();
  const details = screen.getByText('Detail bantuan').closest('details');
  expect(details).not.toHaveAttribute('open');
  expect(details).toHaveTextContent('EVIDENCE_ALREADY_CONFIRMED');
  expect(details).toHaveTextContent('request-123');
  expect(error.message).toBe(original);
});

it('keeps the machine code in collapsed help even when no request ID is available', () => {
  render(<ErrorMessage error={new ApiError(original, 409, 'EVIDENCE_ALREADY_CONFIRMED')} />);
  expect(screen.getByText('Detail bantuan').closest('details')).toHaveTextContent(
    'EVIDENCE_ALREADY_CONFIRMED',
  );
});

it('uses an Indonesian fallback for unknown API errors while preserving local form instructions', () => {
  const view = render(
    <ErrorMessage error={new ApiError('Unhandled remote failure', 503, 'REMOTE_FAILURE')} />,
  );
  expect(screen.queryByText('Unhandled remote failure')).not.toBeInTheDocument();
  expect(screen.getByText('Server belum dapat memproses permintaan.')).toBeVisible();
  view.rerender(<ErrorMessage error={new Error('Pilih nama alat terlebih dahulu.')} />);
  expect(screen.getByText('Pilih nama alat terlebih dahulu.')).toBeVisible();
});

it('the existing error dialog uses the same translation and still closes accessibly', async () => {
  let closed = false;
  render(
    <ErrorDialog
      error={new ApiError(original, 409, 'EVIDENCE_ALREADY_CONFIRMED')}
      onClose={() => {
        closed = true;
      }}
    />,
  );
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Foto ini sudah digunakan.');
  expect(screen.getByRole('button', { name: 'Tutup pesan' })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Mengerti' }));
  expect(closed).toBe(true);
});
