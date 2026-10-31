import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { renderApp } from '../../../test/render';
import { envelope, fixtureDefinition, schedule } from '../../../test/fixtures';
import { useInspectionStore } from '../model/inspectionStore';
import { InspectionHub } from '../view/InspectionHub';

beforeEach(() => useInspectionStore.getState().reset());

it('renders archive sample colors without confusing a ready draft with a saved inspection', async () => {
  const definition = fixtureDefinition({ name: 'EE Cutting', check_number: 44 });
  useInspectionStore.getState().start({
    definition,
    context: {
      line: '17',
      sampler: 'Ldr',
      shift: 'day',
      production_date: schedule.production_date,
    },
    checked_at: schedule.server_time,
    interval: 'per_shift',
    trigger: 'routine',
  });
  server.use(
    http.get('/api/v1/auth/me', () =>
      HttpResponse.json(envelope({ id: 'u', username: 'Operator', role: 'Operator' })),
    ),
    http.get('/api/v1/maintenance/schedule', () => HttpResponse.json(envelope(schedule))),
    http.get('/api/v1/maintenance/settings', () =>
      HttpResponse.json(
        envelope({ lines: ['17', '18'], allowed_samplers: ['Ldr'], night_rollover_hour: 12 }),
      ),
    ),
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(
        envelope({
          items: [definition],
          count: 1,
          source_gaps: { missing_rows: [], clipped_row: null },
        }),
      ),
    ),
    http.get('/api/v1/maintenance/due', ({ request }) =>
      HttpResponse.json(
        envelope({
          schedule,
          line: new URL(request.url).searchParams.get('line'),
          completed_count: 0,
          pending_count: 1,
          items: [
            {
              definition_id: definition.id,
              state: 'pending',
              equipment: [],
              starts_at: schedule.starts_at,
              next_starts_at: schedule.next_starts_at,
            },
          ],
        }),
      ),
    ),
  );
  renderApp(<InspectionHub />);
  const heading = await screen.findByRole('heading', { name: 'EE Cutting', level: 3 });
  const card = () =>
    screen.getByRole('heading', { name: heading.textContent!, level: 3 }).closest('article')!;
  expect(card().querySelector('.check-number')).toHaveClass('check-number--empty');
  act(() =>
    useInspectionStore.setState((state) => ({
      draft: { ...state.draft!, observations: [{ sample_id: 'n1', reading_id: 'r1' }] },
    })),
  );
  expect(card().querySelector('.check-number')).toHaveClass('check-number--partial');
  expect(within(card()).getByText('1/4 sampel terisi')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Line'), { target: { value: '18' } });
  await waitFor(() =>
    expect(card().querySelector('.check-number')).toHaveClass('check-number--empty'),
  );
  expect(within(card()).queryByText('1/4 sampel terisi')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Line'), { target: { value: '17' } });
  await waitFor(() =>
    expect(card().querySelector('.check-number')).toHaveClass('check-number--partial'),
  );
  act(() =>
    useInspectionStore.setState((state) => ({
      draft: {
        ...state.draft!,
        observations: definition.samples.map((sample) => ({
          sample_id: sample.id,
          reading_id: sample.id,
        })),
      },
    })),
  );
  expect(card().querySelector('.check-number')).toHaveClass('check-number--complete');
  expect(within(card()).getByText('4/4 sampel terisi · Belum disimpan')).toBeVisible();
  expect(within(card()).queryByText('Selesai')).not.toBeInTheDocument();
  expect(within(card()).getByRole('button', { name: 'Mulai EE Cutting' })).toBeEnabled();
});
