import { useEffect } from 'react';
import type { ReportInput } from '../../../shared/lib/contracts';
import { useChecksheet } from './useChecksheet';
import { dailyStatuses } from '../model/dailyStatuses';
const PAGE_LIMIT_ERROR = new Error('Pilih periode lebih singkat; batas grafik 5000 baris laporan.');
export function useDailyStatusReport(scope: ReportInput | null) {
  const query = useChecksheet(scope);
  const tooLarge = !!query.hasNextPage && (query.data?.pages.length ?? 0) >= 200;
  const error = query.error ?? (tooLarge ? PAGE_LIMIT_ERROR : null);
  const { hasNextPage, isFetching, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetching && !error) void fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage, error]);
  const complete = !!scope && !query.isPending && !hasNextPage && !error;
  return {
    error,
    complete,
    days: complete ? dailyStatuses(query.data?.pages.flatMap((p) => p.rows) ?? []) : [],
  };
}
