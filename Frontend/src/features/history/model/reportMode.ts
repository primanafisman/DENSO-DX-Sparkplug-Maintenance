import type { MaintenanceDefinition } from '../../../shared/lib/contracts';
export function statusOnlyReport(definition: MaintenanceDefinition | null | undefined) {
  return (
    definition?.input_method === 'ok_ng' ||
    (definition?.unit === 'MPa' &&
      definition.kind === 'numeric' &&
      definition.input_method === 'photo')
  );
}
