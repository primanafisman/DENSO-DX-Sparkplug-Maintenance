import { useQuery } from '@tanstack/react-query';
import type {
  ChecksheetRow,
  ReportInput,
  ReportScope,
  ReportMeta,
} from '../../../shared/lib/contracts';
import { historyApi } from '../model/api';
import { monthlyRows } from '../model/monthlyRows';
const scopeKeys: (keyof ReportScope)[] = [
  'production_date_from',
  'production_date_to',
  'line',
  'shift',
  'definition_id',
  'product_type_id',
  'instrument_id',
];
export async function loadMonthlyChecksheet(
  scope: ReportInput,
  {
    signal,
    read = historyApi.checksheet,
    maxPages = 200,
  }: {
    signal?: AbortSignal;
    read?: typeof historyApi.checksheet;
    maxPages?: number;
  } = {},
) {
  const rows: ChecksheetRow[] = [],
    seen = new Set<string>();
  let cursor: string | undefined,
    meta: ReportMeta | undefined,
    occurrences = 0;
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
    if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
    const page = await read(cursor ? { ...scope, as_of: undefined } : scope, cursor, signal, 100);
    if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
    if (
      meta &&
      (page.meta.as_of !== meta.as_of ||
        scopeKeys.some((key) => page.meta.scope[key] !== meta!.scope[key]))
    )
      throw new Error('Laporan berubah saat dimuat. Muat ulang periode ini.');
    meta ??= page.meta;
    rows.push(...page.rows);
    occurrences += page.rows.reduce(
      (total, row) => total + row.cells.reduce((count, cell) => count + cell.occurrences.length, 0),
      0,
    );
    if (occurrences > 100000)
      throw new Error('Persempit periode atau pilih line; laporan terlalu besar.');
    cursor = page.next_cursor ?? undefined;
    if (!cursor) return { meta, rows: monthlyRows(rows) };
    if (seen.has(cursor)) throw new Error('Halaman laporan berulang. Muat ulang periode ini.');
    seen.add(cursor);
  }
  throw new Error('Persempit periode atau pilih line untuk memuat seluruh laporan.');
}
export function useMonthlyChecksheet(scope: ReportInput | null) {
  return useQuery({
    queryKey: ['history', 'monthly', scope],
    queryFn: ({ signal }) => loadMonthlyChecksheet(scope!, { signal }),
    enabled: !!scope,
    retry: false,
  });
}
