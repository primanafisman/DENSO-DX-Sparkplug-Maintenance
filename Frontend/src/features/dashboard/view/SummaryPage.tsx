import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMonthlySummary } from '../controller/useMonthlySummary';
import { useCurrentWorkload } from '../controller/useCurrentWorkload';
import { useReportFilters } from '../../../shared/controller/useReportFilters';
import { ReportFilters } from '../../../shared/components/layout/ReportFilters';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Loading, ErrorMessage, Empty, Button } from '../../../shared/components/ui';
import { dateTime, number, monthLabel } from '../../../shared/lib/format';
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
        description={
          filters.month
            ? monthLabel(filters.month) + ' · hasil pemeriksaan tersimpan'
            : 'Memuat bulan produksi…'
        }
        actions={
          <Link className="button button-primary" to="/pemeriksaan">
            Mulai pemeriksaan
          </Link>
        }
      />
      <ReportFilters filters={filters} />
      <section className="current-workload" aria-label="Jadwal aktif">
        <div className="current-shift">
          <small>Jadwal aktif · waktu server</small>
          <strong>{schedule?.slot_label ?? 'Memuat shift…'}</strong>
          <span>
            {current.activeLine ? 'Line ' + current.activeLine : 'Seluruh line · ringkasan bulanan'}
          </span>
        </div>
        {!current.activeLine ? (
          <p className="muted">
            Pilih line untuk melihat pemeriksaan yang sudah dan belum diperiksa pada jadwal aktif.
          </p>
        ) : (
          <>
            <div className="workload-count">
              <strong className="text-ok">
                {current.countsReady ? current.data!.completed_count : '—'}
              </strong>
              <span>Sudah diperiksa</span>
            </div>
            <div className="workload-count">
              <strong className="text-ng">
                {current.countsReady ? current.data!.pending_count : '—'}
              </strong>
              <span>Belum diperiksa</span>
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
              <p>Total catatan</p>
              <strong>{d.total}</strong>
              <small>Seluruh hasil pada periode terpilih</small>
            </Card>
            <Card>
              <p>Catatan OK</p>
              <strong className="text-ok">{d.ok}</strong>
            </Card>
            <Card>
              <p>Catatan NG</p>
              <strong className="text-ng">{d.ng}</strong>
            </Card>
            <Card>
              <p>Rasio catatan OK</p>
              <strong>{d.ok_ratio === null ? '—' : number(d.ok_ratio * 100, 1) + '%'}</strong>
              <small>OK ÷ total catatan tersimpan</small>
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
                <div
                  className="chart-box"
                  role="img"
                  aria-label="Grafik jumlah catatan OK dan NG per hari"
                >
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
                            Lihat laporan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <p className="muted summary-note">
            Snapshot {dateTime(d.meta.as_of)} · satu catatan dapat memuat beberapa sampel.{' '}
            {d.meta.warnings.join(' ')}
          </p>
        </>
      )}
    </div>
  );
}
