import { read, write } from '../../../shared/lib/api';
import type {
  MaintenanceDue,
  MaintenanceRecord,
  ServerSchedule,
  Context,
  Interval,
  MaintenanceObservation,
} from '../../../shared/lib/contracts';
export type RecordInput = {
  definition_id: string;
  definition_version: number;
  context: Context;
  interval: Interval;
  trigger: string;
  checked_at: string;
  observations: MaintenanceObservation[];
  instrument_id?: string;
};
export const inspectionApi = {
  due: (line: string, product_type_id?: string) =>
    read<MaintenanceDue>('/maintenance/due', { params: { line, product_type_id } }),
  schedule: () => read<ServerSchedule>('/maintenance/schedule'),
  save: (body: RecordInput) => write<MaintenanceRecord>('/maintenance/records', body),
};
