import { useInfiniteQuery } from '@tanstack/react-query';
import { historyApi } from '../model/api';
import type { ReportInput } from '../../../shared/lib/contracts';
export function useChecksheet(scope: ReportInput | null) {
  return useInfiniteQuery({
    queryKey: ['history', 'checksheet', scope],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      historyApi.checksheet(
        { ...scope!, ...(pageParam ? { as_of: undefined } : {}) },
        pageParam,
        signal,
      ),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: !!scope,
  });
}
