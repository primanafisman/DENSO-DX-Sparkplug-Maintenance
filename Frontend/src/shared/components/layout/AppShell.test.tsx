import { it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { envelope } from '../../../test/fixtures';
import { renderApp } from '../../../test/render';
import { AppShell } from './AppShell';
it('icon navigation retains accessible names, tooltips and active page status', async () => {
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'u', username: 'Ldr', role: 'Admin' })),
    ),
  );
  renderApp(
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/riwayat" element={<h1>Riwayat maintenance</h1>} />
      </Route>
    </Routes>,
    '/riwayat',
  );
  const nav = screen.getByRole('navigation', { name: 'Navigasi utama' });
  const history = within(nav).getByRole('link', { name: 'Riwayat' });
  expect(history).toHaveAttribute('title', 'Riwayat');
  expect(history).toHaveAttribute('aria-current', 'page');
  expect(within(history).getByText('Riwayat')).toHaveClass('sr-only');
  expect(within(nav).getAllByRole('link')).toHaveLength(5);
  expect(await screen.findByText('Ldr')).toBeVisible();
  expect(screen.getByRole('status', { name: 'Mode pembacaan' })).toHaveTextContent('CV lokal');
});
