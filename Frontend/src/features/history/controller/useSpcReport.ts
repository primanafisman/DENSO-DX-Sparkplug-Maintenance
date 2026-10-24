import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { historyApi } from '../model/api';
import type { ReportInput, Subgroup, SubgroupPage } from '../../../shared/lib/contracts';
export async function collectSubgroups(
  read: (
    scope: ReportInput,
    id: string,
    cursor?: string,
    baseline?: string,
    signal?: AbortSignal,
  ) => Promise<SubgroupPage>,
  scope: ReportInput,
  id: string,
  baseline?: string,
  signal?: AbortSignal,
) {
  const groups: Subgroup[] = [],
    seen = new Set<string>();
  let cursor: string | undefined;
  do {
    if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
    const page = await read(scope, id, cursor, baseline, signal);
    if (page.meta.as_of !== scope.as_of)
      throw new Error('Laporan berubah; muat ulang sebelum mencetak.');
    groups.push(...page.items);
    if (groups.length > 5000) throw new Error('Persempit periode; batas cetak 5000 subgroup.');
    cursor = page.next_cursor ?? undefined;
    if (cursor && seen.has(cursor)) throw new Error('Cursor cetak berulang; muat ulang laporan.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return groups;
}
export function useSpcReport(scope: ReportInput | null, chosen: string, baseline?: string) {
  const report = useQuery({
      queryKey: ['history', 'spc', scope, baseline],
      queryFn: ({ signal }) => historyApi.spc(scope!, baseline, signal),
      enabled: !!scope,
    }),
    cohort =
      report.data?.cohorts.find((c) => c.cohort_id === chosen) ??
      (report.data?.cohorts.length === 1 || scope?.demo ? report.data?.cohorts[0] : undefined),
    frozen = report.data
      ? {
          ...report.data.meta.scope,
          ...(scope?.demo ? { demo: true } : {}),
          as_of: report.data.meta.as_of,
        }
      : null;
  const raw = useInfiniteQuery({
    queryKey: ['history', 'subgroups', frozen, cohort?.cohort_id, baseline],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      historyApi.subgroups(frozen!, cohort!.cohort_id, pageParam, baseline, signal),
    getNextPageParam: (p) => p.next_cursor ?? undefined,
    enabled: !!frozen && !!cohort,
  });
  return {
    report,
    cohort,
    raw,
    groups: raw.data?.pages.flatMap((p) => p.items) ?? [],
    preparePrint: (signal?: AbortSignal) => {
      if (!cohort || !frozen) throw new Error('Pilih kelompok data dahulu.');
      return collectSubgroups(historyApi.subgroups, frozen, cohort.cohort_id, baseline, signal);
    },
  };
}
export function useBaselines(enabled = true) {
  return useQuery({
    queryKey: ['spc-baselines'],
    enabled,
    queryFn: async () => {
      const rows = [];
      let cursor: string | undefined;
      do {
        const page = await historyApi.baselines(cursor);
        rows.push(...page.items);
        cursor = page.next_cursor ?? undefined;
        if (rows.length > 10000) throw new Error('Daftar baseline terlalu besar.');
      } while (cursor);
      return rows;
    },
  });
}
