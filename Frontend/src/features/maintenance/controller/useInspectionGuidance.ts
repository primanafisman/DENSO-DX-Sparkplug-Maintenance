import { useInspectionStore } from '../model/inspectionStore';
import { inspectionGuidanceKey } from '../model/guidance';
export function useInspectionGuidance() {
  const state = useInspectionStore(),
    draft = state.draft;
  const key = draft ? inspectionGuidanceKey(draft.session_id, draft.definition) : null;
  return {
    definition: draft?.definition ?? null,
    key,
    understood: !key || state.guidanceAcknowledgement === key,
    acknowledge: () => {
      if (key) state.acknowledgeGuidance(key);
    },
  };
}
