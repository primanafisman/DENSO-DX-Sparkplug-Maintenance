import { afterEach, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderApp } from '../../../test/render';
import { fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
import { useInspectionStore } from '../model/inspectionStore';
import { InspectionGuidance } from '../view/InspectionGuidance';
import { CaptureLayout } from '../../capture/view/CaptureLayout';
import { ConfirmPage } from '../../capture/view/ConfirmPage';
import { captureStore } from '../../capture/model/captureStore';
import { CaptureWorkspaceProvider } from '../../capture/controller/captureWorkspace';
const input = {
  definition: fixtureDefinition(),
  context: { line: '17', production_date: '2026-10-21', shift: 'day' as const, sampler: 'Ldr' },
  checked_at: '2026-10-21T01:00:00Z',
  interval: 'per_shift' as const,
  trigger: 'routine',
};
const accept = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Saya mengerti, mulai pemeriksaan' }));
afterEach(() => {
  useInspectionStore.getState().reset();
});
it('briefing presents canonical numeric standards, method, samples and review notes before input', () => {
  const definition = fixtureDefinition({
    check_number: 8,
    review_notes: ['Verifikasi fixture sebelum dipakai.'],
  });
  useInspectionStore.getState().start({ ...input, definition });
  renderApp(
    <InspectionGuidance>
      <button data-testid="input-action">Mulai mengisi</button>
    </InspectionGuidance>,
  );
  const modal = within(screen.getByRole('dialog', { name: 'Pahami standar sebelum mulai' }));
  expect(modal.getByRole('heading', { name: '8 · EE Cutting' })).toBeVisible();
  const table = within(modal.getByRole('table', { name: 'Standar dan metode pemeriksaan' }));
  expect(table.getByText(definition.standard_text)).toBeVisible();
  expect(table.getByText(definition.method_text)).toBeVisible();
  expect(table.getByText('Minimum')).toHaveTextContent('4,4 mm');
  expect(table.getByText('Maksimum')).toHaveTextContent('4,6 mm');
  expect(modal.getByText('Verifikasi fixture sebelum dipakai.')).toBeVisible();
  expect(modal.getByText('Sampel 4')).toBeVisible();
  expect(screen.getByTestId('input-action')).toBeDisabled();
  accept();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mulai mengisi' })).toBeEnabled();
  expect(screen.getByRole('table')).toBeVisible();
  expect(screen.getByText('8 · EE Cutting')).toBeVisible();
});
it('acknowledgement survives remount and additional samples but resets for another version or session', () => {
  useInspectionStore.getState().start(input);
  const first = renderApp(
    <InspectionGuidance>
      <input aria-label="Angka foto" defaultValue="0.425" />
    </InspectionGuidance>,
  );
  accept();
  const oldKey = useInspectionStore.getState().guidanceAcknowledgement!;
  first.unmount();
  renderApp(
    <InspectionGuidance>
      <input aria-label="Angka foto" defaultValue="0.426" />
    </InspectionGuidance>,
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Baca panduan lagi' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Tutup panduan' }));
  expect(screen.getByLabelText('Angka foto')).toHaveValue('0.426');
  act(() =>
    useInspectionStore.getState().setDefinition({ ...input.definition, definition_version: 2 }),
  );
  expect(screen.getByRole('dialog')).toBeVisible();
  act(() => useInspectionStore.getState().acknowledgeGuidance(oldKey));
  expect(screen.getByRole('dialog')).toBeVisible();
  accept();
  act(() => useInspectionStore.getState().start(input));
  expect(screen.getByRole('dialog')).toBeVisible();
});
it('quick photo can start without an identified check; its later briefing preserves the existing input', () => {
  useInspectionStore.getState().start({ ...input, definition: null });
  renderApp(
    <InspectionGuidance>
      <input aria-label="Hasil foto" defaultValue="0.427" />
    </InspectionGuidance>,
  );
  const field = screen.getByLabelText('Hasil foto');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.change(field, { target: { value: '0.428' } });
  act(() => useInspectionStore.getState().setDefinition(input.definition));
  const popup = screen.getByRole('dialog');
  expect(popup).toBeVisible();
  const content = within(popup).getByRole('region', { name: 'Standar dan metode pemeriksaan' });
  expect(content).toContainElement(
    within(popup).getByRole('heading', { name: 'Pahami standar sebelum mulai' }),
  );
  expect(
    within(content).getByRole('table', { name: 'Standar dan metode pemeriksaan' }),
  ).toBeVisible();
  expect(content).not.toContainElement(
    within(popup).getByRole('button', { name: 'Saya mengerti, mulai pemeriksaan' }),
  );
  accept();
  expect(screen.getByLabelText('Hasil foto')).toBe(field);
  expect(field).toHaveValue('0.428');
});
it('functional master dimensions and expected NG-master response are displayed without numeric judgement', () => {
  const standard = 'Zero 8.25 ± 0.02; Plus 9.25 ± 0.02; Minus 7.25 ± 0.02. Semua display CMPLT On.';
  const outcome =
    'OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan.';
  useInspectionStore.getState().start({
    ...input,
    definition: fixtureDefinition({
      kind: 'functional',
      input_method: 'ok_ng',
      standard_text: standard,
      unit: null,
      limits: null,
      outcome_guide: outcome,
      samples: [
        { id: 'zero', label: 'Zero' },
        { id: 'plus', label: 'Plus (+)' },
        { id: 'minus', label: 'Minus (-)' },
      ],
      sample_count: 3,
    }),
  });
  renderApp(
    <InspectionGuidance>
      <button>Pilih hasil</button>
    </InspectionGuidance>,
  );
  const modal = within(screen.getByRole('dialog'));
  expect(modal.getByText(standard)).toBeVisible();
  expect(modal.getByText(outcome)).toBeVisible();
  expect(modal.queryByLabelText('Batas penerimaan')).not.toBeInTheDocument();
});
it('opening confirmation directly still requires the inspection briefing', () => {
  useInspectionStore.getState().start({
    ...input,
    definition: fixtureDefinition({ check_number: 8 }),
  });
  captureStore.setState({
    instrument: fixtureInstrument(),
    profile: fixtureInstrument().profile,
    result: {
      analysis_id: 'a',
      client_id: 'i',
      candidate: { readable: true, value: 4.5, unit: 'mm', kind: 'digital' },
      validated_prediction: 4.5,
      confidence: { valid: true, level: 'medium' },
    },
    stage: 'ready',
  });
  renderApp(
    <CaptureWorkspaceProvider>
      <Routes>
        <Route element={<CaptureLayout />}>
          <Route path="/pemeriksaan/konfirmasi" element={<ConfirmPage />} />
        </Route>
      </Routes>
    </CaptureWorkspaceProvider>,
    '/pemeriksaan/konfirmasi',
  );
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.queryByRole('textbox', { name: /Nilai akhir/ })).not.toBeInTheDocument();
  accept();
  expect(screen.getByLabelText(/Nilai akhir/)).toHaveValue('4.5');
  expect(
    screen.getByRole('heading', { name: 'Konfirmasi hasil' }).closest('header'),
  ).toHaveTextContent('8 · EE Cutting');
});
