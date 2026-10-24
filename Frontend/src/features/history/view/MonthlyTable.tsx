import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChecksheetRow, Occurrence, ReportScope } from '../../../shared/lib/contracts';
import { Status } from '../../../shared/components/ui';
import { number } from '../../../shared/lib/format';
import { OccurrenceDrawer } from './OccurrenceDrawer';
export function MonthlyTable({
  rows,
  scope,
  mode,
  demo = false,
}: {
  rows: ChecksheetRow[];
  scope: ReportScope;
  mode: 'status' | 'value';
  demo?: boolean;
}) {
  const [selected, setSelected] = useState<Occurrence[] | null>(null),
    dates: string[] = [];
  for (
    let day = scope.production_date_from;
    day <= scope.production_date_to;
    day = new Date(new Date(day + 'T12:00:00Z').valueOf() + 86400000).toISOString().slice(0, 10)
  )
    dates.push(day);
  return (
    <>
      <div className="table-scroll monthly-scroll">
        <table className="monthly-table">
          <caption className="sr-only">Catatan pemeriksaan bulanan</caption>
          <thead>
            <tr>
              <th className="frozen-col">No. Pemeriksaan</th>
              <th>Shift</th>
              {dates.map((d) => (
                <th key={d}>{d.slice(8)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.row_id} data-check-number={row.check_number}>
                <th className="frozen-col">
                  <span className="history-check-number">{row.check_number ?? '—'}</span>
                  <Link
                    to={
                      '/riwayat/' +
                      encodeURIComponent(row.definition_id) +
                      '?' +
                      new URLSearchParams({
                        month: scope.production_date_from.slice(0, 7),
                        ...(demo
                          ? {
                              demo: '1',
                              from: scope.production_date_from,
                              to: scope.production_date_to,
                            }
                          : {}),
                        ...(scope.line ? { line: scope.line } : {}),
                        ...(scope.shift ? { shift: scope.shift } : {}),
                      })
                    }
                  >
                    {row.name}
                  </Link>
                </th>
                <td>{row.shift === 'day' ? '1' : '2'}</td>
                {dates.map((d) => {
                  const cell = row.cells.find((c) => c.date === d);
                  return (
                    <td key={d} data-testid={'day-' + d}>
                      {cell?.count ? (
                        <button
                          className="cell-button"
                          aria-label={cell.count + ' pemeriksaan'}
                          onClick={() => setSelected(cell.occurrences)}
                        >
                          <span className={'cell-statuses ' + (cell.count > 1 ? 'two-rows' : '')}>
                            {cell.occurrences.map((o) => (
                              <span className="cell-result" key={o.id}>
                                {mode === 'value' && row.input_method !== 'ok_ng' && (
                                  <span>
                                    {number(o.numeric_summary?.xbar)} <small>{row.unit}</small>
                                  </span>
                                )}
                                <Status value={o.overall_status} />
                              </span>
                            ))}
                          </span>
                        </button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <OccurrenceDrawer demo={demo} items={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
