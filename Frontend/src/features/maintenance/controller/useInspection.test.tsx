import { it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { fixtureDefinition, envelope, schedule } from '../../../test/fixtures';
import { useInspectionStore } from '../model/inspectionStore';
import { VisualCheckPage } from '../view/VisualCheckPage';
import { InspectionHub } from '../view/InspectionHub';
beforeEach(() => useInspectionStore.getState().reset());
it('catalog exposes 44 options with requirement filters and Viewer cannot start a mutation', async () => {
  const defs = Array.from({ length: 44 }, (_, i) =>
    fixtureDefinition({ id: 'check' + i, name: 'Check ' + i }),
  );
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'v', username: 'Viewer', role: 'Viewer' })),
    ),
    http.get('/api/v1/maintenance/due', () =>
      HttpResponse.json(
        envelope({
          schedule,
          line: '17',
          items: defs.map((d) => ({ definition_id: d.id, state: 'pending' })),
          pending_count: 44,
          completed_count: 0,
        }),
      ),
    ),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 12 }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({ items: defs, count: 44, source_gaps: { missing_rows: [17], clipped_row: 45 } }),
      ),
    ),
  );
  renderApp(<InspectionHub />);
  expect(
    await screen.findByRole('status', { name: '44 Tersisa' }, { timeout: 5000 }),
  ).toBeVisible();
  fireEvent.click(screen.getByText('Filter', { selector: 'summary' }));
  expect(screen.getByLabelText('Persyaratan')).toBeVisible();
  expect(screen.getAllByRole('button', { name: /Mulai Check/ })[0]).toBeDisabled();
});
it('visual samples must all be chosen and explicit save uses the frozen server context', async () => {
  const definition = fixtureDefinition({
    id: 'packing_depth_tool',
    name: 'Packing Depth Tool',
    kind: 'visual',
    input_method: 'ok_ng',
    unit: null,
    limits: null,
    samples: [
      { id: 'one', label: 'Sampel 1' },
      { id: 'two', label: 'Sampel 2' },
    ],
    sample_count: 2,
  });
  const context = {
    line: '17',
    production_date: '2026-10-21',
    shift: 'day' as const,
    sampler: 'Ldr',
  };
  const saved = vi.fn();
  useInspectionStore.getState().start({
    definition,
    context,
    checked_at: schedule.server_time,
    interval: 'per_shift',
    trigger: 'routine',
  });
  server.use(
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'signed' }))),
    http.post('/api/v1/maintenance/records', async ({ request }) => {
      saved(await request.json());
      return HttpResponse.json(envelope({ id: 'saved', overall_status: 'NG', outcomes: [] }), {
        status: 201,
      });
    }),
  );
  renderApp(<VisualCheckPage />);
  expect(screen.getByRole('dialog', { name: 'Pahami standar sebelum mulai' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Sampel 1 OK' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Saya mengerti, mulai pemeriksaan' }));
  expect(screen.getByRole('button', { name: 'Simpan pemeriksaan' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Sampel 1 OK' }));
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Sampel 2 NG' }));
  fireEvent.click(screen.getByLabelText('Saya telah memeriksa seluruh hasil'));
  fireEvent.click(screen.getByRole('button', { name: 'Simpan pemeriksaan' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].context).toEqual(context);
  expect(saved.mock.calls[0][0].checked_at).toBe(schedule.server_time);
  expect(saved.mock.calls[0][0].observations).toEqual([
    { sample_id: 'one', status: 'OK' },
    { sample_id: 'two', status: 'NG' },
  ]);
});

it('inspection list hides completed checks for the selected line and refreshes from server', async () => {
  const defs = [
    fixtureDefinition({ id: 'done', name: 'Packing Depth Tool' }),
    fixtureDefinition({ id: 'todo', name: 'Talc Tool' }),
  ];
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'u', username: 'Operator', role: 'Operator' })),
    ),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['1', '2'], allowed_samplers: ['Ldr'], night_rollover_hour: 12 }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({ items: defs, count: 2, source_gaps: { missing_rows: [], clipped_row: 45 } }),
      ),
    ),
    http.get('/api/v1/maintenance/due', ({ request }) => {
      const line = new URL(request.url).searchParams.get('line');
      return HttpResponse.json(
        envelope({
          schedule,
          line,
          items: defs.map((d) => ({
            definition_id: d.id,
            state: line === '1' && d.id === 'done' ? 'completed' : 'pending',
          })),
          pending_count: line === '1' ? 1 : 2,
          completed_count: line === '1' ? 1 : 0,
        }),
      );
    }),
  );
  renderApp(<InspectionHub />);
  fireEvent.change(await screen.findByLabelText('Line'), { target: { value: '1' } });
  expect(await screen.findByRole('button', { name: 'Mulai Talc Tool' })).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Mulai Packing Depth Tool' }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Line'), { target: { value: '2' } });
  expect(await screen.findByRole('button', { name: 'Mulai Packing Depth Tool' })).toBeVisible();
});
