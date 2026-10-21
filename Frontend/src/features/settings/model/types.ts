import type { MaintenanceDefinition } from '../../../shared/lib/contracts';
export type DefinitionUpdate = Pick<
  MaintenanceDefinition,
  'name' | 'standard_text' | 'method_text' | 'tool' | 'unit' | 'limits' | 'intervals' | 'triggers'
> &
  Partial<
    Pick<
      MaintenanceDefinition,
      'kind' | 'input_method' | 'samples' | 'shifts' | 'interval_guide' | 'occurrence_rule'
    >
  > & { review_reason: string; instrument_ids?: string[] };
