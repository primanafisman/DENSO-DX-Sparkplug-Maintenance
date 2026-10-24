import { afterEach, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from 'zustand';
import { http, HttpResponse } from 'msw';
import { CaptureContext } from './captureContext';
import { createCaptureFlow } from './useCaptureFlow';
import { createCaptureStore } from '../model/captureStore';
import { captureApi } from '../model/api';
import { ResultPage } from '../view/ResultPage';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
import { renderApp } from '../../../test/render';
import { server } from '../../../test/server';
import { envelope, fixtureDefinition, fixtureInstrument } from '../../../test/fixtures';
import type { Instrument, MaintenanceDefinition } from '../../../shared/lib/contracts';
const ee = fixtureDefinition({ id: 'ee', name: 'EE Cutting' });
const gasket = fixtureDefinition({ id: 'gasket', name: 'Check Gasket' });
const a = fixtureInstrument({ id: 'a', name: 'Kaliper A', maintenance_check_ids: ['ee'] });
const b = fixtureInstrument({ id: 'b', name: 'Gauge B', maintenance_check_ids: ['gasket'] });
function setup(
  instruments = [a, b],
  selected: Instrument | null = a,
  sourceProfile = a.profile!,
  definition: MaintenanceDefinition | null = ee,
  catalog: MaintenanceDefinition[] = [ee, gasket],
) {
  useInspectionStore.getState().start({
    definition,
    context: { line: '17', production_date: '2026-10-21', shift: 'day', sampler: 'Ldr' },
    checked_at: '2026-10-21T01:00:00Z',
    interval: 'per_shift',
    trigger: 'routine',
  });
  const store = createCaptureStore();
  store.setState({
    file: new File(['x'], 'gauge.jpg'),
    stage: 'ready',
    instrument: selected,
    instruments,
    profile: sourceProfile,
    analysisProfile: sourceProfile,
    analysisInstrumentId: selected?.id ?? null,
    result: {
      analysis_id: 'source-analysis',
      client_id: 'indicator',
      candidate: { readable: true, value: 0.415, unit: sourceProfile.unit, kind: 'digital' },
      validated_prediction: 0.415,
      confidence: { valid: true, level: 'medium' },
    },
  });
  const api = { ...captureApi, submit: vi.fn() };
  const engine = createCaptureFlow({
    store,
    api,
    getInput: () => {
      throw new Error('selection must not analyze');
    },
  });
  server.use(
    http.get('/api/v1/maintenance/catalog', () =>
      HttpResponse.json(envelope({ items: catalog, count: catalog.length })),
    ),
  );
  function Host() {
    const state = useStore(store);
    return (
      <CaptureContext value={{ state, engine }}>
        <ResultPage />
      </CaptureContext>
    );
  }
  renderApp(<Host />);
  return { store, api };
}
afterEach(() => useInspectionStore.getState().reset());
it('clearing the inspection offers all equipment, and choosing an inspection filters equipment without rereading', async () => {
  const user = userEvent.setup(),
    { api } = setup();
  await screen.findByRole('option', { name: 'Check Gasket' });
  await user.selectOptions(screen.getByLabelText('Pemeriksaan'), '');
  await user.selectOptions(screen.getByLabelText(/Nama alat/), 'b');
  expect(screen.getByLabelText('Pemeriksaan')).toHaveValue('gasket');
  expect(screen.getByLabelText(/Nama alat/)).toHaveValue('b');
  await user.selectOptions(screen.getByLabelText('Pemeriksaan'), 'ee');
  expect(screen.getByLabelText(/Nama alat/)).toHaveValue('');
  expect(screen.getByLabelText(/Nama alat/).querySelector('option[value="b"]')).toBeNull();
  await user.selectOptions(screen.getByLabelText(/Nama alat/), 'a');
  expect(screen.getByLabelText(/Nama alat/)).toHaveValue('a');
  expect(screen.getByText('0,415 mm')).toBeVisible();
  expect(api.submit).not.toHaveBeenCalled();
});
it('an ambiguous linked check keeps identity empty and asks the operator to choose instead of guessing', async () => {
  const c = fixtureInstrument({ id: 'c', name: 'Gauge C', maintenance_check_ids: ['gasket'] });
  const user = userEvent.setup();
  setup([a, b, c]);
  await screen.findByRole('option', { name: 'Check Gasket' });
  await user.selectOptions(screen.getByLabelText('Pemeriksaan'), 'gasket');
  expect(screen.getByLabelText('Pemeriksaan')).toHaveValue('gasket');
  expect(screen.getByLabelText(/Nama alat/)).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Lanjut · konfirmasi' })).toBeDisabled();
});
it('a detected equipment with one linked check replaces an incompatible default check', async () => {
  setup([a, b], b);
  await screen.findByRole('option', { name: 'Check Gasket' });
  expect(screen.getByLabelText('Pemeriksaan')).toHaveValue('gasket');
});
it('recognized MC Lowering 1 selects its registered inspection and keeps the detected identity visible', async () => {
  const loweringCheck = fixtureDefinition({
    id: 'machine-lowering',
    name: 'Machine Lowering',
    unit: 'MPa',
    inspection_target: 'machine',
  });
  const lowering = fixtureInstrument({
    id: 'lowering-1',
    name: 'MC Lowering 1',
    code: '',
    aliases: [],
    area: '17',
    profile: { ...a.profile!, unit: 'MPa', maximum: 1, tolerance: 0.01 },
    maintenance_check_ids: [loweringCheck.id],
  });
  const { api } = setup([a, lowering], lowering, lowering.profile!, ee, [ee, loweringCheck]);
  await screen.findByRole('option', { name: 'Machine Lowering' });
  expect(screen.getByLabelText('Pemeriksaan')).toHaveValue(loweringCheck.id);
  expect(screen.getByLabelText(/Nama alat/)).toHaveValue('lowering-1');
  expect(api.submit).not.toHaveBeenCalled();
});
it('a selected length profile cannot relabel an existing pressure result and rereading is explicit', async () => {
  const user = userEvent.setup();
  const source = { ...a.profile!, unit: 'MPa' as const, maximum: 1, tolerance: 0.01 };
  setup([a, b], a, source);
  await screen.findByRole('option', { name: 'Check Gasket' });
  await user.selectOptions(screen.getByLabelText('Pemeriksaan'), '');
  await user.selectOptions(screen.getByLabelText(/Nama alat/), 'b');
  expect(screen.getByText('0,415 MPa')).toBeVisible();
  expect(screen.getByRole('button', { name: /Baca ulang dengan profil alat/ })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Lanjut · konfirmasi' })).toBeDisabled();
});
it('inspection-first offers only its registered equipment and leaves identity for the operator', async () => {
  const user = userEvent.setup(),
    one = fixtureInstrument({ id: 'mc1', name: 'MC Lowering 1', maintenance_check_ids: ['ee'] }),
    two = fixtureInstrument({ id: 'mc2', name: 'MC Lowering 2', maintenance_check_ids: ['ee'] });
  const { api } = setup([one, two, b], null, a.profile!, null);
  await screen.findByRole('option', { name: 'EE Cutting' });
  const names = screen.getByLabelText(/Nama alat/);
  expect(names.querySelectorAll('option')).toHaveLength(4);
  await user.selectOptions(screen.getByLabelText('Pemeriksaan'), 'ee');
  expect(names.querySelectorAll('option')).toHaveLength(3);
  expect(names.querySelector('option[value="b"]')).toBeNull();
  expect(names).toHaveValue('');
  await user.selectOptions(names, 'mc2');
  expect(screen.getByLabelText('Pemeriksaan')).toHaveValue('ee');
  expect(names).toHaveValue('mc2');
  expect(api.submit).not.toHaveBeenCalled();
});
it('inspection appears before equipment in keyboard and page order', async () => {
  setup();
  await screen.findByRole('option', { name: 'EE Cutting' });
  const fields = screen.getAllByRole('combobox');
  expect(fields[0]).toHaveAccessibleName('Pemeriksaan');
  expect(fields[1]).toHaveAccessibleName(/Nama alat/);
});
