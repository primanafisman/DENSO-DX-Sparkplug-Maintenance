import type { MaintenanceDefinition, MaintenanceDueItem } from '../../../shared/lib/contracts';
import type { InspectionDraft } from './inspectionStore';

export function inspectionSampleProgress(
  definition: MaintenanceDefinition,
  draft: InspectionDraft | null,
  selection: { line: string; product_type_id?: string },
  due: MaintenanceDueItem,
) {
  const total = definition.sample_count;
  const saved = due.state === 'completed';
  const checkedAt = Date.parse(draft?.checked_at ?? '');
  const matchingDraft =
    draft?.definition?.id === definition.id &&
    draft.definition.definition_version === definition.definition_version &&
    draft.context.line === selection.line &&
    (definition.inspection_target !== 'product' ||
      (draft.context.product_type_id ?? '') === (selection.product_type_id ?? '')) &&
    checkedAt >= Date.parse(due.starts_at) &&
    checkedAt < Date.parse(due.next_starts_at);
  const filled = saved
    ? total
    : matchingDraft
      ? definition.samples.filter((sample) => {
          const observation = draft.observations.find((item) => item.sample_id === sample.id);
          if (!observation) return false;
          if (definition.kind === 'difference')
            return (
              'before_reading_id' in observation &&
              !!observation.before_reading_id &&
              !!observation.after_reading_id
            );
          if (definition.input_method === 'ok_ng')
            return (
              'status' in observation &&
              (observation.status === 'OK' || observation.status === 'NG')
            );
          return 'reading_id' in observation && !!observation.reading_id;
        }).length
      : 0;
  const equipment = due.equipment ?? [];
  const partlySaved = equipment.some((item) => item.state === 'completed');
  const multiplePending =
    equipment.length > 1 && equipment.some((item) => item.state === 'pending');
  const state =
    saved || (filled === total && total > 0 && !multiplePending)
      ? 'complete'
      : filled > 0 || partlySaved
        ? 'partial'
        : 'empty';
  return { filled, total, saved, state };
}
