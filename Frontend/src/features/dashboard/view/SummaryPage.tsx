import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, ArrowRight, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMonthlySummary } from '../controller/useMonthlySummary';
import { useCurrentWorkload } from '../controller/useCurrentWorkload';
import { useReportFilters } from '../../../shared/controller/useReportFilters';
import { ReportFilters } from '../../../shared/components/layout/ReportFilters';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Loading, ErrorMessage, Empty, Button } from '../../../shared/components/ui';
import { number } from '../../../shared/lib/format';
export function SummaryPage() {
  const filters = useReportFilters(),
    query = useMonthlySummary(filters),
    current = useCurrentWorkload(filters.line, filters.lines, filters.serverSchedule),
    schedule = current.schedule,
    d = query.data;
  return (
    <div className="summary-page">
      <PageHeader
        title="Ringkasan"
        actions={
          <Link className="button button-primary" to="/pemeriksaan">
            Mulai pemeriksaan
          </Link>
        }
      />
      <ReportFilters filters={filters} />
      <section className="current-workload" aria-label="Jadwal aktif">
        <div className="current-shift">
          <small>Jadwal aktif</small>
          <strong>{schedule?.slot_label ?? 'Memuat shift…'}</strong>
          <span>{current.activeLine ? 'Line ' + current.activeLine : 'Semua line'}</span>
        </div>
        {!current.activeLine ? (
          <p className="muted">Pilih line</p>
        ) : (
          <>
            <div className="workload-count">
              <strong className="text-ok">
                {current.countsReady ? current.data!.completed_count : '—'}
              </strong>
              <span>
                <CheckCircle2 size={17} /> Selesai
              </span>
            </div>
            <div className="workload-count">
              <strong className="text-ng">
                {current.countsReady ? current.data!.pending_count : '—'}
              </strong>
              <span>
                <Clock3 size={17} /> Tersisa
              </span>
            </div>
            {(current.isFetching || current.staleOccurrence) && (
              <span className="muted" role="status">
                Memperbarui jadwal…
              </span>
            )}
            {current.isError && (
              <div>
                <ErrorMessage error={current.error} />
                <Button variant="secondary" onClick={() => current.refetch()}>
                  Coba lagi
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      <ErrorMessage error={filters.error ?? query.error} />
      {query.isLoading && <Loading />}
      {d && (
        <>
          <div className="kpi-grid">
            <Card>
              <p>Total</p>
              <strong>{d.total}</strong>
            </Card>
            <Card>
              <p>
                <Check size={18} /> OK
              </p>
              <strong className="text-ok">{d.ok}</strong>
            </Card>
            <Card>
              <p>
                <X size={18} /> NG
              </p>
              <strong className="text-ng">{d.ng}</strong>
            </Card>
            <Card>
              <p>OK %</p>
              <strong>{d.ok_ratio === null ? '—' : number(d.ok_ratio * 100, 1) + '%'}</strong>
            </Card>
          </div>
          <div className="summary-detail-grid">
            <Card>
              <div className="row between">
                <h2>Hasil per hari</h2>
                <span className="summary-legend">
                  <i className="legend-ok" />
                  OK <i className="legend-ng" />
                  NG
                </span>
              </div>
              {d.total ? (
                <div className="chart-box" role="img" aria-label="Grafik OK dan NG per hari">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.daily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(s) => String(s).slice(8)} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar name="OK" dataKey="ok" fill="#15803D" stackId="status" />
                      <Bar name="NG" dataKey="ng" fill="#E60012" stackId="status" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Empty title="Belum ada catatan bulan ini" />
              )}
            </Card>
            <Card>
              <h2>Ringkasan pemeriksaan</h2>
              <div className="table-scroll summary-group-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Pemeriksaan</th>
                      <th>Total</th>
                      <th>OK</th>
                      <th>NG</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.groups.map((g) => (
                      <tr key={g.definition_id}>
                        <th>{g.name}</th>
                        <td>{g.total}</td>
                        <td>{g.ok}</td>
                        <td>{g.ng}</td>
                        <td>
                          <Link
                            to={
                              '/riwayat/' +
                              encodeURIComponent(g.definition_id) +
                              '?' +
                              new URLSearchParams({
                                month: filters.month,
                                ...(filters.line ? { line: filters.line } : {}),
                              })
                            }
                          >
                            Detail <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          {d.meta.warnings.length > 0 && (
            <details className="data-details">
              <summary>Detail data</summary>
              {d.meta.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </details>
          )}
        </>
      )}
    </div>
  );
}
