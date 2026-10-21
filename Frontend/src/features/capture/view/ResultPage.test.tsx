import { it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { CaptureContext } from '../controller/captureContext';
import { createCaptureFlow } from '../controller/useCaptureFlow';
import { createCaptureStore } from '../model/captureStore';
import { ResultPage } from './ResultPage';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
import { renderApp } from '../../../test/render';
import { server } from '../../../test/server';
import { envelope, fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
function renderResult(valid: boolean) {
  const definition = fixtureDefinition(),
    instrument = fixtureInstrument({
      profile: { kind: 'auto', unit: 'MPa', minimum: 0, maximum: 1, decimals: 3, tolerance: 0.01 },
    });
  useInspectionStore.getState().start({
    definition,
    context: { line: '17', production_date: '2026-10-21', shift: 'day', sampler: 'Ldr' },
    checked_at: '2026-10-21T01:00:00Z',
    interval: 'per_shift',
    trigger: 'routine',
  });
  const store = createCaptureStore();
  store.setState({
    file: new File(['x'], 'x.jpg'),
    sourceUrl: 'data:image/png;base64,AA==',
    stage: 'ready',
    instrument,
    instruments: [instrument],
    profile: instrument.profile,
    result: {
      analysis_id: 'a',
      client_id: 'x',
      candidate: { readable: true, value: 0.41, unit: 'MPa', kind: 'analog' },
      validated_prediction: valid ? 0 : null,
      confidence: { valid, level: valid ? 'medium' : 'low' },
    },
  });
  server.use(
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: [definition], count: 1 })),
    ),
  );
  const engine = createCaptureFlow({
    store,
    getInput: () => {
      throw new Error('No request expected');
    },
  });
  renderApp(
    <CaptureContext value={{ state: store.getState(), engine }}>
      <ResultPage />
    </CaptureContext>,
  );
  return engine;
}
afterEach(() => useInspectionStore.getState().reset());
it('prominently displays accepted zero and never submits confirmation while viewing results', async () => {
  const engine = renderResult(true),
    confirm = vi.spyOn(engine, 'confirm');
  expect(screen.getByText('0,000 MPa')).toBeVisible();
  expect(await screen.findByText('Hasil tersedia')).toBeVisible();
  expect(confirm).not.toHaveBeenCalled();
});
it('separates rejected estimate from accepted value', () => {
  renderResult(false);
  expect(screen.getByText('Belum terbaca')).toBeVisible();
  expect(screen.getByText(/Estimasi belum terverifikasi: 0,410 MPa/)).toBeVisible();
  expect(screen.queryByText('0,410 MPa', { selector: '.reading-value' })).not.toBeInTheDocument();
});
