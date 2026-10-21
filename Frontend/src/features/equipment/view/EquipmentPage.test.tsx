import { it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureInstrument, fixtureDefinition } from '../../../test/fixtures';
import { EquipmentPage } from './EquipmentPage';
it('orders the complete registry by code by default and allows sorting by equipment name', async () => {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [], count: 0 })),
    ),
    http.get('/api/v1/instruments', ({ request }) =>
      HttpResponse.json(
        envelope(
          new URL(request.url).searchParams.get('cursor')
            ? {
                items: [
                  fixtureInstrument({ id: 'a', code: 'A1', name: 'Beta' }),
                  fixtureInstrument({ id: 'b', code: 'B10', name: 'Alpha' }),
                ],
                next_cursor: null,
              }
            : {
                items: [fixtureInstrument({ id: 'z', code: 'B2', name: 'Zeta' })],
                next_cursor: 'next-page',
              },
        ),
      ),
    ),
  );
  renderApp(<EquipmentPage />);
  await screen.findByText('B10');
  const codes = () =>
    [...document.querySelectorAll('tbody tr')].map((row) => row.querySelector('td')?.textContent);
  expect(codes()).toEqual(['A1', 'B2', 'B10']);
  fireEvent.click(screen.getByRole('button', { name: 'Urutkan berdasarkan Peralatan' }));
  expect(codes()).toEqual(['B10', 'A1', 'B2']);
  fireEvent.click(screen.getByRole('button', { name: 'Urutkan berdasarkan Peralatan' }));
  expect(codes()).toEqual(['B2', 'A1', 'B10']);
});
it('visual tools hide numeric fields, unknown condition is honest and registry search reaches server', async () => {
  const queries: string[] = [];
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/instruments', ({ request }) => {
      queries.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json(
        envelope({ items: [fixtureInstrument({ condition: 'unknown' })], next_cursor: null }),
      );
    }),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: [fixtureDefinition()],
          count: 1,
          source_gaps: { missing_rows: [], clipped_row: 45 },
        }),
      ),
    ),
  );
  renderApp(<EquipmentPage />);
  expect(await screen.findByText('Kondisi belum tercatat')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Cari peralatan'), { target: { value: 'EE-CUT' } });
  await waitFor(() => expect(queries).toContain('EE-CUT'));
  fireEvent.click(screen.getByRole('button', { name: 'Tambah alat' }));
  fireEvent.change(screen.getByLabelText('Metode input alat'), { target: { value: 'visual' } });
  expect(screen.queryByLabelText('Rentang fisik minimum')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Dapat dipilih operator')).toBeInTheDocument();
});
it('a denied update preserves the draft equipment name and condition fields', async () => {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'a', username: 'Admin', role: 'Admin' })),
    ),
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'signed' }))),
    http.get('/api/v1/instruments', () =>
      HttpResponse.json(envelope({ items: [fixtureInstrument()], next_cursor: null })),
    ),
    http.get('/api/v1/instruments/g1/calibrations', () =>
      HttpResponse.json(envelope({ items: [], next_cursor: null })),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [fixtureDefinition()], count: 1 })),
    ),
    http.put('/api/v1/instruments/g1', () =>
      HttpResponse.json(
        { success: false, code: 'ROLE_FORBIDDEN', message: 'Izin berubah; masuk ulang.' },
        { status: 403 },
      ),
    ),
  );
  renderApp(<EquipmentPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Kaliper' }));
  fireEvent.change(screen.getByLabelText('Nama alat'), { target: { value: 'Draft alat' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan peralatan' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Izin berubah');
  expect(screen.getByLabelText('Nama alat')).toHaveValue('Draft alat');
});
