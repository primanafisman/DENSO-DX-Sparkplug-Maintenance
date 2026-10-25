import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { serverClockApi } from '../model/serverClockApi';
import { anchorServerClock, serverClockAt } from '../model/serverClock';

export function useServerClock() {
  const [monotonic, setMonotonic] = useState(() => performance.now());
  const query = useQuery({
    queryKey: ['server-clock'],
    queryFn: async ({ signal }) => {
      const schedule = await serverClockApi.schedule(signal);
      return anchorServerClock(schedule.server_time, performance.now());
    },
    retry: false,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  });
  const refetch = query.refetch;
  useEffect(() => {
    const timer = window.setInterval(() => setMonotonic(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'hidden') void refetch();
    };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [refetch]);
  return {
    clock: query.data && !query.isError ? serverClockAt(query.data, monotonic) : null,
    loading: query.isPending,
  };
}
