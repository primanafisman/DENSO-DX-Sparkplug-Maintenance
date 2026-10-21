import { it, expect, beforeEach } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../../test/render';
import { server } from '../../../test/server';
import { fixtureDefinition, envelope } from '../../../test/fixtures';
import { useInspection } from './useInspection';
import { useInspectionStore } from '../model/inspectionStore';
function Probe() {
  const q = useInspection({ scheduleEnabled: false });
  return (
    <>
      <p>{q.uncertain ? 'uncertain' : 'editable'}</p>
      <button onClick={() => q.save.mutate()}>Save draft</button>
      <button onClick={q.allowAfterReview}>Reconciled</button>
    </>
  );
}
beforeEach(() => {
  useInspectionStore.getState().reset();
  const def = fixtureDefinition({
    id: 'packing_depth_tool',
    kind: 'visual',
    input_method: 'ok_ng',
    samples: [{ id: 'n1', label: 'Sample' }],
  });
  useInspectionStore.getState().start({
    definition: def,
    context: { line: '17', production_date: '2026-10-21', shift: 'day', sampler: 'Ldr' },
    checked_at: '2026-10-21T01:00:00Z',
    interval: 'per_shift',
    trigger: 'routine',
  });
  useInspectionStore.getState().setStatus('n1', 'OK');
});
it('uncertain save remains locked after route remount and submits reviewed definition version', async () => {
  let count = 0,
    body: Record<string, unknown> | undefined;
  server.use(
    http.get('/api/v1/auth/csrf', () => HttpResponse.json(envelope({ csrf_token: 'token' }))),
    http.post('/api/v1/maintenance/records', async ({ request }) => {
      count++;
      body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.error();
    }),
  );
  function Host() {
    const [key, setKey] = useState(0);
    return (
      <>
        <button onClick={() => setKey(key + 1)}>Change route</button>
        <Probe key={key} />
      </>
    );
  }
  renderApp(<Host />);
  fireEvent.click(screen.getByText('Save draft'));
  expect(await screen.findByText('uncertain')).toBeVisible();
  fireEvent.click(screen.getByText('Change route'));
  expect(screen.getByText('uncertain')).toBeVisible();
  fireEvent.click(screen.getByText('Save draft'));
  await waitFor(() => expect(count).toBe(1));
  expect(body?.definition_version).toBe(1);
  fireEvent.click(screen.getByText('Reconciled'));
  expect(screen.getByText('editable')).toBeVisible();
});
