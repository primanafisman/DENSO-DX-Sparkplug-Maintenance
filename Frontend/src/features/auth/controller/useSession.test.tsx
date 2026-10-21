import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../view/LoginPage';
import { api, read, write } from '../../../shared/lib/api';
import { renderApp } from '../../../test/render';
import { AppShell } from '../../../shared/components/layout/AppShell';
const envelope = (data: unknown) => ({ success: true, message: 'OK', data, request_id: 'test' });
describe('cookie sessions', () => {
  it('uses credentialed requests, signed csrf and no auth localStorage', async () => {
    server.use(
      http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'signed' }))),
      http.post('/api/v1/test', ({ request }) => {
        expect(request.headers.get('X-CSRF-Token')).toBe('signed');
        return HttpResponse.json(envelope({ ok: true }));
      }),
    );
    expect(api.defaults.withCredentials).toBe(true);
    expect(await write('/test', { hello: true })).toEqual({ ok: true });
    expect(localStorage.length).toBe(0);
  });
  it('maps 401 and 403 into safe actionable API errors', async () => {
    server.use(
      http.get('/api/v1/private', () =>
        HttpResponse.json(
          { success: false, message: 'Sign in', code: 'AUTH_REQUIRED', request_id: 'r' },
          { status: 401 },
        ),
      ),
    );
    await expect(read('/private')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_REQUIRED',
      request_id: 'r',
    });
  });
  it('failed login preserves the entered user ID and displays the error', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { success: false, message: 'Sign in', code: 'AUTH_REQUIRED' },
          { status: 401 },
        ),
      ),
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          { success: false, message: 'Login gagal', code: 'INVALID_LOGIN' },
          { status: 401 },
        ),
      ),
    );
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Kata sandi'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Login gagal'));
    expect(screen.getByLabelText('User ID')).toHaveValue('operator');
  });
  it('Viewer has clear responsive navigation without gaining mutation permission', async () => {
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(envelope({ id: 'v', username: 'Viewer', role: 'Viewer' })),
      ),
    );
    renderApp(<AppShell />);
    expect(await screen.findByText('Viewer', { selector: '.user-name' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigasi HP' })).toBeInTheDocument();
    expect(screen.getAllByText('Riwayat')).toHaveLength(2);
  });
  it('returns the server permission failure without retrying the write', async () => {
    server.use(
      http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'signed' }))),
      http.post('/api/v1/forbidden', () =>
        HttpResponse.json(
          { success: false, code: 'ROLE_FORBIDDEN', message: 'Akses terbatas', request_id: 'r' },
          { status: 403 },
        ),
      ),
    );
    await expect(write('/forbidden', {})).rejects.toMatchObject({
      status: 403,
      code: 'ROLE_FORBIDDEN',
    });
  });
});
