import { useStore } from 'zustand';
import { it, expect, vi, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { renderApp } from '../../../test/render';
import { server } from '../../../test/server';
import { envelope, fixtureDefinition } from '../../../test/fixtures';
import { createCaptureStore } from '../model/captureStore';
import { createCaptureFlow } from '../controller/useCaptureFlow';
import { CaptureContext } from '../controller/captureContext';
import { CapturePage } from './CapturePage';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
import { CaptureLayout } from './CaptureLayout';
afterEach(() => useInspectionStore.getState().reset());
it('a known inspection shows its briefing before automatically requesting the camera', async () => {
  useInspectionStore.getState().start({
    definition: fixtureDefinition(),
    context: { line: '17', production_date: '2026-10-21', shift: 'day', sampler: 'Ldr' },
    checked_at: '2026-10-21T01:00:00Z',
    interval: 'per_shift',
    trigger: 'routine',
  });
  renderApp(
    <Routes>
      <Route element={<CaptureLayout />}>
        <Route path="/pemeriksaan/foto" element={<CapturePage />} />
      </Route>
    </Routes>,
    '/pemeriksaan/foto?source=camera',
  );
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Pahami standar sebelum mulai' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Saya mengerti, mulai pemeriksaan' }));
  expect(await screen.findByRole('alertdialog')).toHaveTextContent(
    'Pratinjau kamera membutuhkan HTTPS',
  );
});
it('an upload error is dismissible after returning to the photo step', () => {
  const store = createCaptureStore();
  store.setState({ error: new Error('Upload interrupted') });
  const d = fixtureDefinition();
  useInspectionStore.getState().start({
    definition: d,
    context: { line: '17', production_date: '2026-10-21', shift: 'day', sampler: 'Ldr' },
    checked_at: '2026-10-21T01:00:00Z',
    interval: 'per_shift',
    trigger: 'routine',
  });
  const engine = createCaptureFlow({
    store,
    getInput: () => {
      throw new Error('No request expected');
    },
  });
  server.use(
    http.get('/api/v1/maintenance/catalog', () => HttpResponse.json(envelope({ items: [d] }))),
  );
  function Probe() {
    const state = useStore(store);
    return (
      <CaptureContext value={{ state, engine }}>
        <CapturePage />
      </CaptureContext>
    );
  }
  renderApp(<Probe />);
  expect(screen.getByRole('alertdialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Mengerti' }));
  expect(store.getState().error).toBeNull();
  engine.dispose();
  useInspectionStore.getState().reset();
  vi.restoreAllMocks();
});
