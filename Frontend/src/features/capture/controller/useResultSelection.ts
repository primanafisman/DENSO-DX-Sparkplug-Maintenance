import { useEffect } from 'react';
import { useCapture } from './captureContext';
import { useCatalog } from '../../settings/controller/useSettings';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
export function useResultSelection() {
  const { state, engine } = useCapture(),
    catalog = useCatalog(),
    store = useInspectionStore();
  const checks = catalog.data?.items.filter((d) => d.input_method !== 'ok_ng') ?? [];
  const candidates = state.instruments;
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
    if (locked) return;
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
    const linked = candidates.filter((a) => a.maintenance_check_ids.includes(definition.id));
    await engine.selectInstrument(linked.length === 1 ? linked[0] : null);
  }
  return { checks, candidates, locked, selectInstrument, selectCheck };
}
