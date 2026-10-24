import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportScope } from '../../../shared/lib/contracts';
import type { MonthlyMode, MonthlyOccurrence, MonthlyRow } from '../model/monthlyRows';
import { monthlyModeRows, sampleMeasurement } from '../model/monthlyRows';
import { Empty, Status } from '../../../shared/components/ui';
import { dateTime, number } from '../../../shared/lib/format';
import { OccurrenceDrawer } from './OccurrenceDrawer';
export function MonthlyTable({
  rows,
  scope,
  mode,
  demo = false,
}: {
  rows: MonthlyRow[];
  scope: ReportScope;
  mode: MonthlyMode;
  demo?: boolean;
}) {
  const [selected, setSelected] = useState<MonthlyOccurrence[] | null>(null),
    dates: string[] = [];
  for (
    let day = scope.production_date_from;
    day <= scope.production_date_to;
    day = new Date(new Date(day + 'T12:00:00Z').valueOf() + 86400000).toISOString().slice(0, 10)
  )
    dates.push(day);
  const displayed = monthlyModeRows(rows, mode);
  if (!displayed.length && mode === 'measurement')
    return <Empty title="Tidak ada sampel X/R" description="" />;
  return (
    <>
      <div className="table-scroll monthly-scroll">
        <table className="monthly-table">
          <caption className="sr-only">Catatan pemeriksaan bulanan</caption>
          <thead>
            <tr>
              <th className="frozen-col">No. Pemeriksaan</th>
              {dates.map((d) => (
                <th key={d}>{d.slice(8)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row) => (
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
                {dates.map((d) => {
                  const cell = row.cells.find((c) => c.date === d);
                  return (
                    <td key={d} data-testid={'day-' + d}>
                      {cell?.count ? (
                        <button
                          className="cell-button"
                          aria-label={cell.count + ' pemeriksaan'}
                          onClick={() => setSelected(cell.items)}
                        >
                          <span className={'cell-statuses ' + (cell.count > 1 ? 'two-rows' : '')}>
                            {cell.items.map((item) => {
                              const { occurrence: o, unit, input_method } = item,
                                singleValue =
                                  o.outcomes.length === 1 && typeof o.outcomes[0].value === 'number'
                                    ? o.outcomes[0].value
                                    : o.numeric_summary?.xbar;
                              return (
                                <span
                                  className="cell-result"
                                  key={o.id}
                                  title={
                                    'Shift ' +
                                    (o.context.shift === 'day' ? '1' : '2') +
                                    ' · ' +
                                    dateTime(o.checked_at)
                                  }
                                >
                                  {mode !== 'status' && input_method !== 'ok_ng' && (
                                    <span>
                                      {sampleMeasurement(item) ? (
                                        <>
                                          X̄ {number(o.numeric_summary?.xbar)} · R{' '}
                                          {number(o.numeric_summary?.r)}
                                        </>
                                      ) : (
                                        number(singleValue)
                                      )}{' '}
                                      <small>{unit}</small>
                                    </span>
                                  )}
                                  {mode !== 'measurement' && <Status value={o.overall_status} />}
                                </span>
                              );
                            })}
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
        <OccurrenceDrawer
          demo={demo}
          items={selected.map((item) => item.occurrence)}
          units={Object.fromEntries(selected.map((item) => [item.occurrence.id, item.unit]))}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
