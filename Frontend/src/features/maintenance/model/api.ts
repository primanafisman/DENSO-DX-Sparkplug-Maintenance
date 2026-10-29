import { read, write } from '../../../shared/lib/api';
import type { TimedDue } from './dueFreshness';
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
  due: async (line: string, product_type_id?: string): Promise<TimedDue> => {
    const client_requested_at = Date.now();
    const data = await read<MaintenanceDue>('/maintenance/due', {
      params: { line, product_type_id },
    });
    return { ...data, client_requested_at };
  },
  schedule: () => read<ServerSchedule>('/maintenance/schedule'),
  save: (body: RecordInput) => write<MaintenanceRecord>('/maintenance/records', body),
};
