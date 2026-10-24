import type { ChecksheetRow, Occurrence } from '../../../shared/lib/contracts';
export function dailyStatuses(rows: ChecksheetRow[]) {
  const dates = new Map<string, { date: string; ok: number; ng: number; items: Occurrence[] }>();
  const seen = new Set<string>();
  for (const row of rows)
    for (const cell of row.cells)
      for (const item of cell.occurrences) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        const day = dates.get(cell.date) ?? { date: cell.date, ok: 0, ng: 0, items: [] };
        if (item.overall_status === 'OK') day.ok++;
        else day.ng++;
        day.items.push(item);
        dates.set(cell.date, day);
      }
  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
}
