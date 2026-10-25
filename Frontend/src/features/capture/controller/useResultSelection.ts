import { useEffect } from 'react';
import { useCapture } from './captureContext';
import { useCatalog } from '../../settings/controller/useSettings';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
import { useMaintenanceDue } from '../../maintenance/controller/useInspection';
import { machineDueState, usesMachineTools } from '../model/equipmentDue';
export function useResultSelection() {
  const { state, engine } = useCapture(),
    catalog = useCatalog(),
    store = useInspectionStore();
  const checks = catalog.data?.items.filter((d) => d.input_method !== 'ok_ng') ?? [];
  const equipment = state.instruments.filter(
    (a) =>
      a.active && a.profile && a.measurement_mode !== 'visual' && a.condition !== 'not_working',
  );
  const selectedCheck = store.draft?.definition;
  const due = useMaintenanceDue(
    state.photo && usesMachineTools(selectedCheck) ? state.photo.context.line : '',
  );
  const isCompleted = (instrumentId: string) =>
    !!store.draft &&
    !!selectedCheck &&
    !!state.photo &&
    machineDueState(
      due.data,
      selectedCheck.id,
      state.photo.context,
      store.draft.checked_at,
      instrumentId,
    ) === 'completed';
  const candidates = selectedCheck
    ? equipment.filter(
        (a) =>
          a.maintenance_check_ids.includes(selectedCheck.id) &&
          (!isCompleted(a.id) || a.id === state.instrument?.id),
      )
    : equipment;
  const locked = !!state.pending || !!state.reading || store.saveState !== 'editing';
  useEffect(() => {
    if (!state.instrument || !catalog.data || locked) return;
    const draft = useInspectionStore.getState().draft;
    if (draft?.definition && state.instrument.maintenance_check_ids.includes(draft.definition.id))
      return;
    const linked = catalog.data.items.filter(
      (d) => d.input_method !== 'ok_ng' && state.instrument!.maintenance_check_ids.includes(d.id),
    );
    useInspectionStore.getState().setDefinition(linked.length === 1 ? linked[0] : null);
  }, [state.instrument, catalog.data, locked]);
  async function selectInstrument(id: string) {
    if (locked || (id && isCompleted(id))) return;
    const asset = candidates.find((a) => a.id === id) ?? null;
    await engine.selectInstrument(asset);
    if (!asset) return;
    const current = useInspectionStore.getState().draft?.definition;
    if (current && asset.maintenance_check_ids.includes(current.id)) return;
    const linked = checks.filter((d) => asset.maintenance_check_ids.includes(d.id));
    store.setDefinition(linked.length === 1 ? linked[0] : null);
  }
  async function selectCheck(id: string) {
    if (locked) return;
    const definition = checks.find((d) => d.id === id) ?? null;
    store.setDefinition(definition);
    if (!definition || state.instrument?.maintenance_check_ids.includes(definition.id)) return;
    await engine.selectInstrument(null);
  }
  return {
    checks,
    candidates,
    locked,
    completed: !!state.instrument && isCompleted(state.instrument.id),
    selectInstrument,
    selectCheck,
  };
}
