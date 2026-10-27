import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import type { MaintenanceSettings } from '../../../shared/lib/contracts';
import { renderApp } from '../../../test/render';
import { envelope } from '../../../test/fixtures';
import { server } from '../../../test/server';
import { useSettings } from './useSettings';

it('publishes saved settings before a blocked refresh can leave the next edit using old values', async () => {
  const initial: MaintenanceSettings = {
    lines: ['17'],
    allowed_samplers: ['Ldr'],
    night_rollover_hour: 9,
    inactive_lines: ['Cadangan'],
  };
  const saved: MaintenanceSettings = { ...initial, lines: ['18'] };
  let requests = 0;
  let release!: () => void;
  const refreshGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [], count: 0 })),
    ),
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'test-csrf' }))),
    http.get('/api/v1/maintenance/settings', async () => {
      requests++;
      if (requests > 1) await refreshGate;
      return HttpResponse.json(envelope(requests === 1 ? initial : saved));
    }),
    http.put('/api/v1/maintenance/settings', () =>
      HttpResponse.json(envelope({ value: saved, version: 2 })),
    ),
  );
  function Host() {
    const state = useSettings();
    return (
      <>
        <output data-testid="configured-lines">{state.settings.data?.lines.join(', ')}</output>
        <button onClick={() => state.save.mutate({ ...saved, review_reason: 'Rename line.' })}>
          Save settings
        </button>
        <output data-testid="save-state">{state.save.status}</output>
      </>
    );
  }
  const { client } = renderApp(<Host />);
  try {
    await waitFor(() => expect(screen.getByTestId('configured-lines')).toHaveTextContent('17'));
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(screen.getByTestId('save-state')).toHaveTextContent('success'));
    await waitFor(() => expect(requests).toBe(2));
    expect(client.getQueryData(['settings'])).toEqual(saved);
    expect(screen.getByTestId('configured-lines')).toHaveTextContent('18');
  } finally {
    await act(async () => {
      release();
    });
  }
});
