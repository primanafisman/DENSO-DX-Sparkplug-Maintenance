import { read } from '../../../shared/lib/api';
import type { MaintenanceSummary } from '../../../shared/lib/contracts';
import { summarySchema } from './schemas';
export const dashboardApi = {
  summary: async (month: string, line?: string, shift?: string, signal?: AbortSignal) => {
    const result = await read<MaintenanceSummary>('/maintenance/summary', {
      params: { month, line: line || undefined, shift },
      signal,
    });
    summarySchema.parse(result);
    return result;
  },
};
