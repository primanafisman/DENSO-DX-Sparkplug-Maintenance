import { useEffect } from 'react';
import { useMaintenanceDue } from '../../maintenance/controller/useInspection';
import type { ServerSchedule } from '../../../shared/lib/contracts';
export function useCurrentWorkload(line: string, lines: string[], serverSchedule?: ServerSchedule) {
  const activeLine = line || (lines.length === 1 ? lines[0] : '');
  const query = useMaintenanceDue(activeLine),
    dueSchedule = query.data?.schedule;
  const schedule =
    dueSchedule &&
    (!serverSchedule ||
      Date.parse(dueSchedule.server_time) > Date.parse(serverSchedule.server_time))
      ? dueSchedule
      : serverSchedule;
  const staleOccurrence =
    !!dueSchedule && !!schedule && dueSchedule.starts_at !== schedule.starts_at;
  const { refetch } = query;
  useEffect(() => {
    if (staleOccurrence) void refetch();
  }, [staleOccurrence, activeLine, refetch]);
  return {
    ...query,
    activeLine,
    schedule,
    staleOccurrence,
    countsReady: !!query.data && !query.isError && !query.isFetching && !staleOccurrence,
  };
}
