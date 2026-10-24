import type { ChecksheetRow, Occurrence } from '../../../shared/lib/contracts';
import { statusOnlyReport } from './reportMode';
export type MonthlyMode = 'all' | 'status' | 'measurement';
export type MonthlyOccurrence = {
  occurrence: Occurrence;
  unit: string | null;
  input_method: ChecksheetRow['input_method'];
};
export type MonthlyRow = {
  row_id: string;
  check_number: number | null;
  definition_id: string;
  name: string;
  cells: { date: string; count: number; items: MonthlyOccurrence[] }[];
};
export function sampleMeasurement(item: MonthlyOccurrence) {
  const definition = item.occurrence.definition_snapshot,
    summary = item.occurrence.numeric_summary;
  return (
    !!definition &&
    definition.sample_count >= 2 &&
    definition.input_method !== 'ok_ng' &&
    !statusOnlyReport(definition) &&
    !!summary?.complete &&
    summary.xbar !== null &&
    summary.r !== null
  );
}
export function monthlyModeRows(rows: MonthlyRow[], mode: MonthlyMode) {
  if (mode !== 'measurement') return rows;
  return rows
    .map((row) => ({
      ...row,
      cells: row.cells
        .map((cell) => {
          const items = cell.items.filter(sampleMeasurement);
          return { ...cell, items, count: items.length };
        })
        .filter((cell) => cell.count > 0),
    }))
    .filter((row) => row.cells.length > 0);
}

// No. Pemeriksaan keeps its definition ID when shifts, equipment or standards change.
// This is a display projection only; original occurrences and SPC cohorts stay separate.
export function monthlyRows(rows: ChecksheetRow[]): MonthlyRow[] {
  const groups = new Map<
    string,
    {
      row: MonthlyRow;
      version: number;
      dates: Map<string, MonthlyOccurrence[]>;
      seen: Set<string>;
    }
  >();
  for (const source of rows) {
    const key = source.definition_id || source.row_id;
    let group = groups.get(key);
    if (!group) {
      group = {
        row: {
          row_id: 'check-' + key,
          check_number: source.check_number ?? null,
          definition_id: source.definition_id,
          name: source.name,
          cells: [],
        },
        version: source.definition_version,
        dates: new Map(),
        seen: new Set(),
      };
      groups.set(key, group);
    }
    if (group.row.check_number === null && source.check_number != null)
      group.row.check_number = source.check_number;
    if (source.definition_version > group.version) {
      group.version = source.definition_version;
      group.row.name = source.name;
    }
    for (const cell of source.cells) {
      for (const occurrence of cell.occurrences) {
        if (group.seen.has(occurrence.id)) continue;
        group.seen.add(occurrence.id);
        const items = group.dates.get(cell.date) ?? [];
        items.push({
          occurrence,
          unit: occurrence.definition_snapshot ? occurrence.definition_snapshot.unit : source.unit,
          input_method: occurrence.definition_snapshot?.input_method ?? source.input_method,
        });
        group.dates.set(cell.date, items);
      }
    }
  }
  return [...groups.values()]
    .map((group) => ({
      ...group.row,
      cells: [...group.dates]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, items]) => ({
          date,
          count: items.length,
          items: items.sort(
            (a, b) =>
              a.occurrence.checked_at.localeCompare(b.occurrence.checked_at) ||
              a.occurrence.id.localeCompare(b.occurrence.id),
          ),
        })),
    }))
    .sort(
      (a, b) =>
        (a.check_number ?? Number.MAX_SAFE_INTEGER) - (b.check_number ?? Number.MAX_SAFE_INTEGER) ||
        a.definition_id.localeCompare(b.definition_id),
    );
}
