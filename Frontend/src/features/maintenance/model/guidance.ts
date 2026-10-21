import type { MaintenanceDefinition } from '../../../shared/lib/contracts';
export function inspectionGuidanceKey(session: string, definition: MaintenanceDefinition | null) {
  return definition
    ? JSON.stringify([session, definition.id, definition.definition_version])
    : null;
}
