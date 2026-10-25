import type { Context, MaintenanceDefinition, MaintenanceDue } from '../../../shared/lib/contracts';

export function usesMachineTools(definition: MaintenanceDefinition | null | undefined) {
  return (
    definition?.kind === 'numeric' &&
    definition.input_method === 'photo' &&
    definition.sample_count === 1 &&
    (definition.inspection_target === 'machine' ||
      (!definition.inspection_target && definition.unit === 'MPa'))
  );
}

export function machineDueState(
  due: MaintenanceDue | undefined,
  definitionId: string,
  context: Context,
  checkedAt: string,
  instrumentId: string,
) {
  if (
    !due ||
    due.line !== context.line ||
    due.schedule.production_date !== context.production_date ||
    due.schedule.shift !== context.shift
  )
    return undefined;
  const time = Date.parse(checkedAt);
  if (
    !Number.isFinite(time) ||
    time < Date.parse(due.schedule.starts_at) ||
    time >= Date.parse(due.schedule.next_starts_at)
  )
    return undefined;
  return due.items
    .find((item) => item.definition_id === definitionId)
    ?.equipment?.find((item) => item.instrument_id === instrumentId)?.state;
}
