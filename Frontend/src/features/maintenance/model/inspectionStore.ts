import { create } from 'zustand';
import type {
  Context,
  MaintenanceDefinition,
  MaintenanceObservation,
  MaintenanceRecord,
  Interval,
  ConfirmedReading,
} from '../../../shared/lib/contracts';
import { newId } from '../../../shared/lib/id';
import { inspectionGuidanceKey } from './guidance';
export type InspectionDraft = {
  definition: MaintenanceDefinition | null;
  context: Context;
  checked_at: string;
  interval: Interval;
  trigger: string;
  observations: MaintenanceObservation[];
  session_id: string;
};
type StartInput = Omit<InspectionDraft, 'observations' | 'session_id'>;
export type CaptureInput = {
  definition: MaintenanceDefinition | null;
  sample_id: string;
  stage?: 'before' | 'after';
  context: Context;
  checked_at: string;
};
export const useInspectionStore = create<{
  draft: InspectionDraft | null;
  lastRecord: MaintenanceRecord | null;
  saveState: 'editing' | 'saving' | 'uncertain';
  guidanceAcknowledgement: string | null;
  acknowledgeGuidance: (key: string) => void;
  setSaveState: (state: 'editing' | 'saving' | 'uncertain') => void;
  start: (input: StartInput) => void;
  setDefinition: (definition: MaintenanceDefinition | null) => void;
  setStatus: (id: string, status: 'OK' | 'NG') => void;
  addReading: (
    sample: string,
    stage: 'before' | 'after' | undefined,
    reading: ConfirmedReading,
  ) => void;
  complete: (record: MaintenanceRecord) => void;
  reset: () => void;
}>((set, get) => ({
  draft: null,
  lastRecord: null,
  saveState: 'editing',
  guidanceAcknowledgement: null,
  acknowledgeGuidance: (key) => {
    const draft = get().draft;
    if (draft && inspectionGuidanceKey(draft.session_id, draft.definition) === key)
      set({ guidanceAcknowledgement: key });
  },
  setSaveState: (saveState) => set({ saveState }),
  start: (input) =>
    set({
      draft: { ...structuredClone(input), observations: [], session_id: newId() },
      lastRecord: null,
      saveState: 'editing',
      guidanceAcknowledgement: null,
    }),
  setDefinition: (definition) => {
    const d = get().draft;
    if (d)
      set({
        guidanceAcknowledgement:
          d.definition?.id === definition?.id &&
          d.definition?.definition_version === definition?.definition_version
            ? get().guidanceAcknowledgement
            : null,
        draft: {
          ...d,
          definition,
          interval: definition?.intervals[0] ?? d.interval,
          trigger: definition?.triggers[0] ?? d.trigger,
          observations: d.definition?.id === definition?.id ? d.observations : [],
        },
      });
  },
  setStatus: (id, status) => {
    const d = get().draft;
    if (!d || d.definition?.input_method !== 'ok_ng')
      throw new Error('Angka membutuhkan foto terkonfirmasi.');
    set({
      draft: {
        ...d,
        observations: [
          ...d.observations.filter((o) => o.sample_id !== id),
          { sample_id: id, status },
        ],
      },
    });
  },
  addReading: (sample, stage, reading) => {
    const d = get().draft;
    if (!d || !d.definition) throw new Error('Pilih pemeriksaan terlebih dahulu.');
    const old = d.observations.find((o) => o.sample_id === sample);
    const observation: MaintenanceObservation = stage
      ? {
          sample_id: sample,
          before_reading_id:
            stage === 'before'
              ? reading.id
              : old && 'before_reading_id' in old
                ? old.before_reading_id
                : '',
          after_reading_id:
            stage === 'after'
              ? reading.id
              : old && 'after_reading_id' in old
                ? old.after_reading_id
                : '',
        }
      : { sample_id: sample, reading_id: reading.id };
    set({
      draft: {
        ...d,
        observations: [...d.observations.filter((o) => o.sample_id !== sample), observation],
      },
    });
  },
  complete: (lastRecord) =>
    set({ lastRecord, draft: null, saveState: 'editing', guidanceAcknowledgement: null }),
  reset: () =>
    set({ draft: null, lastRecord: null, saveState: 'editing', guidanceAcknowledgement: null }),
}));
export function nextCapture(d: InspectionDraft): CaptureInput | null {
  if (!d.definition)
    return { definition: null, sample_id: 'n1', context: d.context, checked_at: d.checked_at };
  for (const sample of d.definition.samples) {
    const o = d.observations.find((o) => o.sample_id === sample.id);
    if (d.definition.kind === 'difference') {
      if (!o || !('before_reading_id' in o) || !o.before_reading_id)
        return {
          definition: d.definition,
          sample_id: sample.id,
          stage: 'before',
          context: d.context,
          checked_at: d.checked_at,
        };
      if (!o.after_reading_id)
        return {
          definition: d.definition,
          sample_id: sample.id,
          stage: 'after',
          context: d.context,
          checked_at: d.checked_at,
        };
    } else if (!o)
      return {
        definition: d.definition,
        sample_id: sample.id,
        context: d.context,
        checked_at: d.checked_at,
      };
  }
  return null;
}
window.addEventListener('spm:logout', () => useInspectionStore.getState().reset());
window.addEventListener('spm:session-expired', () => useInspectionStore.getState().reset());
