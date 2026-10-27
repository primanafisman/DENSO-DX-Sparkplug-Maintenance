import { useState } from 'react';
import { Activity } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MaintenanceDefinition, Occurrence } from '../../../shared/lib/contracts';
import { useReportFilters } from '../../../shared/controller/useReportFilters';
import { ReportFilters } from '../../../shared/components/layout/ReportFilters';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Field, Loading, ErrorMessage, Empty, Status } from '../../../shared/components/ui';
import { useDailyStatusReport } from '../controller/useDailyStatusReport';
import { OccurrenceDrawer } from './OccurrenceDrawer';
import { inspectionLabel } from '../../../shared/lib/inspectionIdentity';
export function StatusReportPage({ definition }: { definition: MaintenanceDefinition }) {
  const f = useReportFilters(),
    [params, setParams] = useSearchParams(),
    [selected, setSelected] = useState<Occurrence[] | null>(null);
  const from = params.get('from') ?? f.scope?.production_date_from ?? '',
    to = params.get('to') ?? f.scope?.production_date_to ?? '';
  const scope =
    f.scope && from && to
      ? {
          ...f.scope,
          definition_id: definition.id,
          production_date_from: from,
          production_date_to: to,
        }
      : null;
  const q = useDailyStatusReport(scope),
    days = q.days;
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };
  return (
    <>
      <PageHeader
        title={inspectionLabel(definition)}
        icon={<Activity />}
        actions={
          <Link
            className="button button-secondary"
            to={
              '/riwayat?' +
              new URLSearchParams({
                month: f.month,
                ...(f.line ? { line: f.line } : {}),
                ...(f.shift ? { shift: f.shift } : {}),
              })
            }
          >
            Kembali ke tabel
          </Link>
        }
      />
      <ReportFilters filters={f} />
      <div className="filter-bar">
        <Field label="Tanggal awal">
          <input type="date" value={from} onChange={(e) => change('from', e.target.value)} />
        </Field>
        <Field label="Tanggal akhir">
          <input type="date" value={to} onChange={(e) => change('to', e.target.value)} />
        </Field>
      </div>
      <ErrorMessage error={f.error ?? q.error} />
      {!q.error && !q.complete && <Loading label="Memuat seluruh hasil OK / NG…" />}
      {!q.error && q.complete && (
        <Card>
          {days.length ? (
            <>
              <section role="img" aria-label="Grafik OK NG per tanggal">
                <h2>OK / NG per tanggal</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ok" name="OK" stackId="result" fill="#15803d" />
                    <Bar dataKey="ng" name="NG" stackId="result" fill="#e60012" />
                  </BarChart>
                </ResponsiveContainer>
              </section>
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">Hasil harian {inspectionLabel(definition)}</caption>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>✓ OK</th>
                      <th>× NG</th>
                      <th>Hasil pemeriksaan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => (
                      <tr key={day.date}>
                        <th>{day.date}</th>
                        <td>{day.ok}</td>
                        <td>{day.ng}</td>
                        <td>
                          <button
                            className="cell-button"
                            onClick={() => setSelected(day.items)}
                            aria-label={'Rincian ' + day.date}
                          >
                            <span className="cell-statuses two-rows">
                              {day.items.map((o) => (
                                <Status key={o.id} value={o.overall_status} />
                              ))}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <Empty title="Belum ada hasil OK / NG pada periode ini" />
          )}
        </Card>
      )}
      {selected && (
        <OccurrenceDrawer
          showStatistics={false}
          items={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
