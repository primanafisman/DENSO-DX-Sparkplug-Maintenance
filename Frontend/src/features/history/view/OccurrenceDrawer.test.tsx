import { it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureDefinition } from '../../../test/fixtures';
import type { Occurrence } from '../../../shared/lib/contracts';
import { OccurrenceDrawer } from './OccurrenceDrawer';

const occurrence: Occurrence = {
  id: 'record-one',
  checked_at: '2026-10-21T01:00:00Z',
  context: { line: '17', production_date: '2026-10-21', shift: 'day', sampler: 'Ldr' },
  slot_id: 'day-0745',
  overall_status: 'OK',
  outcomes: [],
  definition_snapshot: fixtureDefinition(),
  product_snapshot: null,
  instruments: [],
  evidence: [{ reading_id: 'reading-one', variant: 'crop' }],
  numeric_summary: null,
};
function session(role = 'Admin') {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'admin', username: 'Admin', role })),
    ),
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'csrf-test' }))),
  );
}
function renderDrawer(onClose: () => void, role = 'Admin', items = [occurrence]) {
  const result = renderApp(<OccurrenceDrawer items={items} onClose={onClose} />);
  // The real drawer opens inside an already authenticated page.
  act(() => result.client.setQueryData(['session'], { id: 'admin', username: 'Admin', role }));
  return result;
}

it('Admin confirms deletion without a reason, uses CSRF, closes and invalidates history summary and due', async () => {
  session();
  let calls = 0;
  server.use(
    http.delete('/api/v1/maintenance/records/record-one', async ({ request }) => {
      calls++;
      expect(request.headers.get('X-CSRF-Token')).toBe('csrf-test');
      expect(await request.text()).toBe('');
      return HttpResponse.json(envelope({ id: 'record-one', deleted: true }));
    }),
  );
  const close = vi.fn(),
    { client } = renderDrawer(close),
    invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(await screen.findByRole('button', { name: 'Hapus catatan pemeriksaan' }));
  expect(calls).toBe(0);
  expect(screen.queryByLabelText(/alasan/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Batal hapus' }));
  expect(calls).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Hapus catatan pemeriksaan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus catatan' }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(calls).toBe(1);
  for (const key of ['history', 'summary', 'maintenance-due'])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
});

it('failed deletion preserves details behind a confirmation popup for retry', async () => {
  session();
  server.use(
    http.delete('/api/v1/maintenance/records/record-one', () =>
      HttpResponse.json(
        {
          success: false,
          message: 'Catatan belum dapat dihapus.',
          code: 'DELETE_FAILED',
          request_id: 'request-one',
        },
        { status: 503 },
      ),
    ),
  );
  const close = vi.fn();
  renderDrawer(close);
  fireEvent.click(await screen.findByRole('button', { name: 'Hapus catatan pemeriksaan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus catatan' }));
  expect(await screen.findByText('Server belum dapat memproses permintaan.')).toBeVisible();
  expect(close).not.toHaveBeenCalled();
  expect(
    screen.getByRole('dialog', { name: 'Rincian pemeriksaan', hidden: true }),
  ).toBeInTheDocument();
  expect(screen.getByRole('alertdialog', { name: 'Hapus catatan pemeriksaan ini?' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Ya, hapus catatan' })).toBeEnabled();
});

it('Viewer cannot delete, while imported ordinary records show provenance without fabricated photo actions', async () => {
  session('Viewer');
  const { unmount } = renderDrawer(() => {}, 'Viewer');
  expect(await screen.findByRole('button', { name: 'Foto 1 · crop' })).toBeVisible();
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Hapus catatan pemeriksaan' }),
    ).not.toBeInTheDocument(),
  );
  unmount();
  session('Admin');
  renderDrawer(() => {}, 'Admin', [
    {
      ...occurrence,
      origin: {
        kind: 'illustrative_local_import',
        label: 'Data uji X/R',
        batch_id: 'test-import',
        version: 1,
        source: 'local-xr-formula-v1',
      },
    },
  ]);
  expect(screen.getByText('Data uji X/R')).toHaveClass('origin-badge');
  expect(screen.queryByRole('button', { name: 'Foto 1 · crop' })).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Hapus catatan pemeriksaan' })).toBeEnabled();
});
