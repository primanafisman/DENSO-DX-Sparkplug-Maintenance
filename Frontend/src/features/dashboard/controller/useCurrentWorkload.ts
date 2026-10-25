import { useEffect } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { inspectionApi } from '../../maintenance/model/api';
import type { MaintenanceDue, ServerSchedule } from '../../../shared/lib/contracts';
export function useCurrentWorkload(line: string, lines: string[], serverSchedule?: ServerSchedule) {
  const activeLine = line || (lines.length === 1 ? lines[0] : '');
  const selectedLines = [...new Set(activeLine ? [activeLine] : lines)];
  const client = useQueryClient();
  const queries = useQueries({
    queries: selectedLines.map((currentLine) => ({
      queryKey: ['maintenance-due', currentLine, ''],
      queryFn: () => inspectionApi.due(currentLine),
      refetchOnWindowFocus: true,
      refetchInterval: (query: Query<MaintenanceDue>) => {
        const schedule = query.state.data?.schedule;
        return schedule
          ? Math.max(
              1000,
              Math.min(
                60000,
                Date.parse(schedule.next_starts_at) - Date.parse(schedule.server_time),
              ),
            )
          : 60000;
      },
    })),
  });
  const schedule = queries.reduce((latest, query) => {
    const next = query.data?.schedule;
    return next && (!latest || Date.parse(next.server_time) > Date.parse(latest.server_time))
      ? next
      : latest;
  }, serverSchedule);
  const perLine = queries.map((query, index) => ({
    line: selectedLines[index],
    completed: query.data?.completed_count ?? 0,
    pending: query.data?.pending_count ?? 0,
    unavailable: query.isError,
    ready:
      !!query.data &&
      !query.isError &&
      !query.isFetching &&
      query.data.schedule.starts_at === schedule?.starts_at,
  }));
  const staleLines = selectedLines
    .filter((_, index) => {
      const dueSchedule = queries[index].data?.schedule;
      return dueSchedule && schedule && dueSchedule.starts_at !== schedule.starts_at;
    })
    .join('\0');
  useEffect(() => {
    if (staleLines)
      for (const staleLine of staleLines.split('\0')) {
        void client.refetchQueries({ queryKey: ['maintenance-due', staleLine, ''], exact: true });
      }
  }, [staleLines, client]);
  const countsReady = perLine.length > 0 && perLine.every((item) => item.ready);
  return {
    activeLine,
    schedule,
    perLine,
    data: countsReady
      ? {
          completed_count: perLine.reduce((sum, item) => sum + item.completed, 0),
          pending_count: perLine.reduce((sum, item) => sum + item.pending, 0),
        }
      : undefined,
    staleOccurrence: !!staleLines,
    isFetching: queries.some((query) => query.isFetching),
    isError: queries.some((query) => query.isError),
    error: queries.find((query) => query.isError)?.error,
    refetch: () => Promise.allSettled(queries.map((query) => query.refetch())),
    countsReady,
  };
}
