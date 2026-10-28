import { it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    check_number: 4,
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
  expect(screen.getByRole('heading', { level: 1, name: '4 · Packing Depth Tool' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Simpan pemeriksaan' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Sampel 1 OK' }));
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Sampel 2 NG' }));
  fireEvent.click(screen.getByLabelText('Saya telah memeriksa seluruh hasil'));
  fireEvent.click(screen.getByRole('button', { name: 'Simpan pemeriksaan' }));
  expect(saved).not.toHaveBeenCalled();
  expect(screen.getByRole('alertdialog', { name: 'Simpan hasil pemeriksaan?' })).toBeVisible();
  expect(screen.getByRole('alertdialog')).toHaveTextContent('4 · Packing Depth Tool');
  fireEvent.click(screen.getByRole('button', { name: 'Ya, simpan' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0].context).toEqual(context);
  expect(saved.mock.calls[0][0].checked_at).toBe(schedule.server_time);
  expect(saved.mock.calls[0][0].observations).toEqual([
    { sample_id: 'one', status: 'OK' },
    { sample_id: 'two', status: 'NG' },
  ]);
});

it('orders pending inspections by number and finds a check by its number or name', async () => {
  const definitions = [
    fixtureDefinition({ id: 'ten', name: 'Alpha', check_number: 10, display_order: 1 }),
    fixtureDefinition({ id: 'three', name: 'Gamma', source_number: 3, display_order: 2 }),
    fixtureDefinition({
      id: 'two',
      name: 'Zulu',
      check_number: 2,
      source_number: 99,
      display_order: 3,
    }),
  ];
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'u', username: 'Operator', role: 'Operator' })),
    ),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17'], allowed_samplers: ['Ldr'], night_rollover_hour: 12 }),
      ),
    ),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: definitions,
          count: 3,
          source_gaps: { missing_rows: [], clipped_row: 45 },
        }),
      ),
    ),
    http.get('/api/v1/maintenance/due', () =>
      HttpResponse.json(
        envelope({
          schedule,
          line: '17',
          items: definitions.map((definition) => ({
            definition_id: definition.id,
            state: 'pending',
          })),
          pending_count: 3,
          completed_count: 0,
        }),
      ),
    ),
  );
  renderApp(<InspectionHub />);
  await screen.findByRole('button', { name: 'Mulai Zulu' });
  expect(
    screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
  ).toEqual(['Zulu', 'Gamma', 'Alpha']);
  fireEvent.change(screen.getByLabelText('Cari pemeriksaan'), { target: { value: '2' } });
  expect(screen.getByRole('button', { name: 'Mulai Zulu' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Mulai Alpha' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Cari pemeriksaan'), { target: { value: 'gamma' } });
  expect(screen.getByRole('button', { name: 'Mulai Gamma' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Mulai Zulu' })).not.toBeInTheDocument();
});

it('keeps completed checks visible with a completed status and restores pending actions for another line', async () => {
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
            equipment:
              d.id === 'todo'
                ? [
                    { instrument_id: 'one', state: 'completed' },
                    { instrument_id: 'two', state: 'pending' },
                  ]
                : [],
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
  const completed = screen.getByRole('heading', { name: 'Packing Depth Tool' }).closest('article')!;
  expect(within(completed).getByRole('status')).toHaveTextContent('Selesai');
  expect(completed).toHaveClass('inspection-option-completed');
  expect(
    within(completed).getByRole('button', { name: 'Selesai Packing Depth Tool' }),
  ).toBeDisabled();
  fireEvent.click(within(completed).getByText('Standar & metode', { selector: 'summary' }));
  expect(within(completed).getByText('Dalam batas standar')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Mulai Talc Tool' })).toBeEnabled();
  expect(screen.getByText('1/2 alat')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Line'), { target: { value: '2' } });
  expect(await screen.findByRole('button', { name: 'Mulai Packing Depth Tool' })).toBeEnabled();
  expect(
    screen.getByRole('heading', { name: 'Packing Depth Tool' }).closest('article'),
  ).not.toHaveClass('inspection-option-completed');
});
