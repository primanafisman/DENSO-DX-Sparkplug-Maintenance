import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../../test/render';
import { server } from '../../../test/server';
import { envelope, schedule } from '../../../test/fixtures';
import { ServerClock } from './ServerClock';

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] }));
afterEach(() => vi.useRealTimers());

it('ticks locally from server time without requesting the API every second and resyncs every minute', async () => {
  let calls = 0;
  server.use(
    http.get('/api/v1/maintenance/schedule', () => {
      calls++;
      return HttpResponse.json(
        envelope({
          ...schedule,
          server_time: calls === 1 ? '2026-10-25T00:45:00Z' : '2026-10-25T00:46:00Z',
        }),
      );
    }),
  );
  const view = renderApp(<ServerClock />);
  expect(screen.getByText('Memuat waktu server…')).toBeVisible();
  expect(await screen.findByRole('timer', { name: 'Waktu server' })).toHaveTextContent(
    '07:45:00 WIB',
  );
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByRole('timer')).toHaveTextContent('07:45:03 WIB');
  expect(calls).toBe(1);
  await act(() => vi.advanceTimersByTimeAsync(57000));
  await waitFor(() => expect(calls).toBe(2));
  expect(screen.getByRole('timer')).toHaveTextContent('07:46:00 WIB');
  view.unmount();
  await act(() => vi.advanceTimersByTimeAsync(120000));
  expect(calls).toBe(2);
});

it('resynchronizes when the app window receives focus', async () => {
  let calls = 0;
  server.use(
    http.get('/api/v1/maintenance/schedule', () => {
      calls++;
      return HttpResponse.json(
        envelope({
          ...schedule,
          server_time: calls === 1 ? '2026-10-25T00:45:00Z' : '2026-10-25T02:00:00Z',
        }),
      );
    }),
  );
  renderApp(<ServerClock />);
  await screen.findByRole('timer');
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('09:00:00 WIB'));
  expect(calls).toBe(2);
});

it('shows unavailable state on failure instead of presenting local time as server time', async () => {
  server.use(
    http.get('/api/v1/maintenance/schedule', () =>
      HttpResponse.json({ success: false, message: 'Offline', code: 'OFFLINE' }, { status: 503 }),
    ),
  );
  renderApp(<ServerClock />);
  expect(await screen.findByText('Waktu server tidak tersedia')).toBeVisible();
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  expect(screen.getByText('--:--:-- WIB')).toBeVisible();
});

it('does not present a stale successful anchor as synchronized after a failed resync and recovers on focus', async () => {
  let calls = 0;
  server.use(
    http.get('/api/v1/maintenance/schedule', () => {
      calls++;
      if (calls === 2)
        return HttpResponse.json(
          { success: false, message: 'Offline', code: 'OFFLINE' },
          { status: 503 },
        );
      return HttpResponse.json(
        envelope({
          ...schedule,
          server_time: calls === 1 ? '2026-10-25T00:45:00Z' : '2026-10-25T02:00:00Z',
        }),
      );
    }),
  );
  renderApp(<ServerClock />);
  await screen.findByRole('timer');
  fireEvent(window, new Event('focus'));
  expect(await screen.findByText('Waktu server tidak tersedia')).toBeVisible();
  expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  fireEvent(window, new Event('focus'));
  expect(await screen.findByRole('timer')).toHaveTextContent('09:00:00 WIB');
  expect(calls).toBe(3);
});
