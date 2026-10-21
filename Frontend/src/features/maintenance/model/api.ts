import { read, write } from '../../../shared/lib/api';
import type {
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
  schedule: () => read<ServerSchedule>('/maintenance/schedule'),
  save: (body: RecordInput) => write<MaintenanceRecord>('/maintenance/records', body),
};
