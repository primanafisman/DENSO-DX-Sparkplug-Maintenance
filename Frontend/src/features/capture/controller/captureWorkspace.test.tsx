import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { renderApp } from '../../../test/render';
import { fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
import { captureStore } from '../model/captureStore';
import { captureApi } from '../model/api';
import { CaptureWorkspaceProvider, captureResumePath } from './captureWorkspace';
import { useCapture } from './captureContext';
import { ConfirmPage } from '../view/ConfirmPage';
import type { ConfirmedReading, Job, MaintenanceRecord } from '../../../shared/lib/contracts';

const input = {
  definition: fixtureDefinition(),
  context: { line: '17', production_date: '2026-10-21', shift: 'day' as const, sampler: 'Ldr' },
  checked_at: '2026-10-21T01:00:00Z',
  interval: 'per_shift' as const,
  trigger: 'routine',
};
const instrument = fixtureInstrument();
const roi = { x: 0.2, y: 0.1, width: 0.6, height: 0.5 };
const job: Job = {
  job_id: 'j',
  status: 'completed',
  processed: 1,
  total: 1,
  expires_at: 99999999999,
  results: [
    {
      analysis_id: 'a',
      client_id: 'indicator',
      candidate: { readable: true, value: 4.5, unit: 'mm', kind: 'digital' },
      validated_prediction: 4.5,
      confidence: { valid: true, level: 'medium' },
    },
  ],
};
function Probe() {
  const { engine, state } = useCapture();
  return (
    <>
      <button onClick={() => void engine.upload(new File(['x'], 'gauge.jpg'))}>Upload</button>
      <button
        onClick={() => engine.setReviewDraft({ value: '4.510', identity: true, verified: false })}
      >
        Edit value
      </button>
      <output data-testid="capture-value">{state.reviewDraft?.value ?? ''}</output>
    </>
  );
}
function Workspace({ confirmation = false }: { confirmation?: boolean }) {
  const location = useLocation();
  return (
    <CaptureWorkspaceProvider>
      <Link to="/riwayat">History</Link>
      <Link to={confirmation ? '/pemeriksaan/konfirmasi' : '/pemeriksaan/hasil'}>Resume</Link>
      <output data-testid="location">{location.pathname}</output>
      <Routes>
        <Route path="/pemeriksaan/foto" element={<Probe />} />
        <Route path="/pemeriksaan/hasil" element={<Probe />} />
        <Route path="/pemeriksaan/konfirmasi" element={<ConfirmPage />} />
        <Route path="/riwayat" element={<p>History menu</p>} />
      </Routes>
    </CaptureWorkspaceProvider>
  );
}
beforeEach(() => {
  captureStore.setState(captureStore.getInitialState(), true);
  useInspectionStore.getState().start(input);
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(captureApi, 'upload').mockResolvedValue({
    image_id: 'p',
    source_hash: 'hash',
    source_width: 800,
    source_height: 1200,
    preview_width: 800,
    preview_height: 1200,
    expires_at: 99999999999,
    context: input.context,
  });
  vi.spyOn(captureApi, 'discover').mockResolvedValue({
    instruments: [
      {
        client_id: 'indicator',
        roi,
        label_roi: null,
        instrument,
        suggested_profile: instrument.profile!,
        profile_source: 'registered-equipment',
        requires_confirmation: true,
        requires_profile_confirmation: true,
        kind_hint: 'digital',
      },
    ],
    warnings: [],
    confidence_calibrated: false,
  });
  vi.spyOn(captureApi, 'instruments').mockResolvedValue([instrument]);
  vi.spyOn(captureApi, 'submit').mockResolvedValue(job);
  vi.spyOn(captureApi, 'crop').mockResolvedValue(new Blob(['crop']));
});

it('the actual confirmation page restores its edited value and identity after menu navigation', async () => {
  captureStore.setState({
    instrument,
    profile: instrument.profile,
    result: job.results[0],
    stage: 'ready',
  });
  renderApp(<Workspace confirmation />, '/pemeriksaan/konfirmasi');
  fireEvent.change(screen.getByLabelText(/Nilai akhir/), { target: { value: '4.510' } });
  fireEvent.click(screen.getByLabelText('Identitas alat dan pemeriksaan sudah benar'));
  fireEvent.click(screen.getByLabelText('Nilai sesuai foto dan sudah saya periksa'));
  fireEvent.click(screen.getByRole('link', { name: 'History' }));
  expect(screen.getByText('History menu')).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Resume' }));
  expect(screen.getByLabelText(/Nilai akhir/)).toHaveValue('4.510');
  expect(screen.getByLabelText('Identitas alat dan pemeriksaan sudah benar')).toBeChecked();
  expect(screen.getByLabelText('Nilai sesuai foto dan sudah saya periksa')).toBeChecked();
  fireEvent.change(screen.getByLabelText(/Nilai akhir/), { target: { value: '4.520' } });
  fireEvent.click(screen.getByRole('link', { name: 'History' }));
  fireEvent.click(screen.getByRole('link', { name: 'Resume' }));
  expect(screen.getByLabelText(/Nilai akhir/)).toHaveValue('4.520');
  expect(screen.getByLabelText('Nilai sesuai foto dan sudah saya periksa')).not.toBeChecked();
  expect(screen.queryByLabelText(/alasan/i)).not.toBeInTheDocument();
  expect(captureApi.submit).not.toHaveBeenCalled();
});
afterEach(() => {
  useInspectionStore.getState().reset();
  captureStore.setState(captureStore.getInitialState(), true);
  vi.restoreAllMocks();
});

it('retains the photo, ROI, analysis, confirmed samples and typed value while switching menus', async () => {
  const view = renderApp(<Workspace />, '/pemeriksaan/foto');
  fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
  await waitFor(() => expect(captureStore.getState().result?.analysis_id).toBe('a'));
  fireEvent.click(screen.getByRole('button', { name: 'Edit value' }));
  const before = captureStore.getState();
  act(() =>
    useInspectionStore.getState().addReading('n1', undefined, { id: 'r1' } as ConfirmedReading),
  );
  fireEvent.click(screen.getByRole('link', { name: 'History' }));
  expect(screen.getByText('History menu')).toBeVisible();
  expect(captureStore.getState().file).toBe(before.file);
  expect(captureStore.getState().roi).toEqual(roi);
  expect(captureStore.getState().sourceUrl).toBe('blob:photo');
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  expect(captureResumePath(captureStore.getState())).toBe('/pemeriksaan/konfirmasi');
  fireEvent.click(screen.getByRole('link', { name: 'Resume' }));
  expect(screen.getByTestId('capture-value')).toHaveTextContent('4.510');
  expect(useInspectionStore.getState().draft?.observations).toEqual([
    { sample_id: 'n1', reading_id: 'r1' },
  ]);
  expect(captureApi.submit).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(captureStore.getState().file).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});

it('finishes background analysis without taking the operator away from another menu', async () => {
  let finish!: (value: Job) => void;
  vi.mocked(captureApi.submit).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  renderApp(<Workspace />, '/pemeriksaan/foto');
  fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
  await waitFor(() => expect(captureApi.submit).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole('link', { name: 'History' }));
  await act(async () => {
    finish(job);
  });
  await waitFor(() => expect(captureStore.getState().result?.analysis_id).toBe('a'));
  expect(screen.getByTestId('location')).toHaveTextContent('/riwayat');
  expect(captureResumePath(captureStore.getState())).toBe('/pemeriksaan/hasil');
});

it('new sessions cancel old work synchronously and late responses cannot restore old evidence', async () => {
  let finish!: (value: Job) => void;
  vi.mocked(captureApi.submit).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  renderApp(<Workspace />, '/pemeriksaan/foto');
  fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
  await waitFor(() => expect(captureApi.submit).toHaveBeenCalledOnce());
  act(() => useInspectionStore.getState().start(input));
  expect(captureStore.getState().file).toBeNull();
  await act(async () => {
    finish(job);
  });
  expect(captureStore.getState().result).toBeNull();
  expect(captureStore.getState().reviewDraft).toBeNull();
});

it.each(['spm:logout', 'spm:session-expired', 'complete'])(
  'clears private evidence on %s',
  async (event) => {
    renderApp(<Workspace />, '/pemeriksaan/foto');
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(captureStore.getState().result?.analysis_id).toBe('a'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit value' }));
    act(() => {
      if (event === 'complete')
        useInspectionStore.getState().complete({ id: 'record' } as MaintenanceRecord);
      else window.dispatchEvent(new Event(event));
    });
    expect(captureStore.getState().file).toBeNull();
    expect(captureStore.getState().result).toBeNull();
    expect(captureStore.getState().reviewDraft).toBeNull();
    expect(useInspectionStore.getState().draft).toBeNull();
  },
);
