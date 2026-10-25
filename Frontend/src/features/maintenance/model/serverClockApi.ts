import { read } from '../../../shared/lib/api';
import type { ServerSchedule } from '../../../shared/lib/contracts';

export const serverClockApi = {
  schedule: (signal: AbortSignal) =>
    read<ServerSchedule>('/maintenance/schedule', { signal, timeout: 10000 }),
};
