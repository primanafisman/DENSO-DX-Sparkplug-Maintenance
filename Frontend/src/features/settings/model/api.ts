import { read, write, update } from '../../../shared/lib/api';
import type {
  MaintenanceSettings,
  MaintenanceCatalog,
  MaintenanceDefinition,
  DefinitionRevision,
  Page,
} from '../../../shared/lib/contracts';
import { settingsSchema } from './schemas';
import type { DefinitionUpdate } from './types';
export const settingsApi = {
  settings: async () => {
    const data = await read<MaintenanceSettings>('/maintenance/settings');
    settingsSchema.parse(data);
    return data;
  },
  catalog: (includeInactive = false) =>
    read<MaintenanceCatalog>('/maintenance/catalog', {
      params: includeInactive ? { include_inactive: 'true' } : {},
    }),
  createDefinition: (body: DefinitionUpdate) =>
    write<MaintenanceDefinition>('/maintenance/definitions', body),
  setDefinitionStatus: ({
    id,
    active,
    review_reason,
  }: {
    id: string;
    active: boolean;
    review_reason: string;
  }) =>
    update<MaintenanceDefinition>(
      '/maintenance/definitions/' + encodeURIComponent(id) + '/status',
      { active, review_reason },
    ),
  save: (body: MaintenanceSettings & { review_reason?: string }) =>
    update<{ value: MaintenanceSettings; version: number }>('/maintenance/settings', body),
  saveDefinition: ({ id, body }: { id: string; body: DefinitionUpdate }) =>
    update<MaintenanceDefinition>('/maintenance/definitions/' + encodeURIComponent(id), body),
  revisions: (id: string) =>
    read<Page<DefinitionRevision>>(
      '/maintenance/definitions/' + encodeURIComponent(id) + '/revisions',
    ),
};
