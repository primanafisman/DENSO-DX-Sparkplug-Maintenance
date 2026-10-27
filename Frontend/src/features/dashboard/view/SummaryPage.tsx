import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  ArrowRight,
  Check,
  X,
  LayoutDashboard,
  CalendarDays,
  Gauge,
  TrendingUp,
  ScanLine,
  Factory,
  Layers3,
  BarChart3,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useMonthlySummary } from '../controller/useMonthlySummary';
import { useCurrentWorkload } from '../controller/useCurrentWorkload';
import { useReportFilters } from '../../../shared/controller/useReportFilters';
import { ReportFilters } from '../../../shared/components/layout/ReportFilters';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Loading, ErrorMessage, Empty, Button } from '../../../shared/components/ui';
import { dateTime, monthLabel, number } from '../../../shared/lib/format';
import { ProgressRing } from '../../../shared/components/ui/ProgressRing';
import { compareInspections, inspectionLabel } from '../../../shared/lib/inspectionIdentity';
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Jakarta',
});
export function SummaryPage() {
  const navigate = useNavigate();
  const filters = useReportFilters(),
    query = useMonthlySummary(filters),
    current = useCurrentWorkload(filters.line, filters.lines, filters.serverSchedule),
    schedule = current.schedule,
    d = query.data;
  return (
    <div className="summary-page">
      <PageHeader
        title="Ringkasan"
        icon={<LayoutDashboard size={23} />}
        actions={
          <>
            <ReportFilters filters={filters} />
            <Link className="button button-primary" to="/pemeriksaan">
              <ScanLine size={19} /> Mulai pemeriksaan <ArrowRight size={16} />
            </Link>
          </>
        }
      />
      <section className="current-workload" aria-label="Jadwal aktif">
        <div className="current-shift">
          <span className="shift-orbit" aria-hidden="true">
            <Layers3 size={28} />
          </span>
          <small>Jadwal aktif</small>
          <strong>{schedule?.slot_label ?? 'Memuat shift…'}</strong>
          <span>{current.activeLine ? 'Line ' + current.activeLine : 'Semua line'}</span>
        </div>
        {
          <>
            <ProgressRing
              completed={current.data?.completed_count ?? 0}
              pending={current.data?.pending_count ?? 0}
              ready={current.countsReady}
            />
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
            <div
              className="workload-count workload-lines"
              role="group"
              aria-label="Line pemeriksaan tersisa"
            >
              <strong>
                {current.countsReady
                  ? current.perLine.filter((item) => item.pending > 0).length
                  : '—'}
              </strong>
              <span>
                <Factory size={17} /> Line pemeriksaan tersisa
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
        }
        {!current.activeLine && current.perLine.length > 0 && (
          <div className="line-workload">
            <ul className="line-progress-grid" aria-label="Progres per line">
              {current.perLine.map((item) => (
                <li key={item.line}>
                  <button
                    aria-label={'Lihat Line ' + item.line}
                    onClick={() => filters.change('line', item.line)}
                  >
                    <ProgressRing
                      completed={item.completed}
                      pending={item.pending}
                      ready={item.ready}
                      label={'Progres Line ' + item.line}
                    />
                    <strong>Line {item.line}</strong>
                    <small>
                      {item.unavailable
                        ? 'Tidak tersedia'
                        : item.ready
                          ? item.pending
                            ? item.pending + ' tersisa'
                            : item.completed
                              ? 'Selesai'
                              : 'Tidak ada jadwal'
                          : 'Memuat…'}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <ErrorMessage error={filters.error ?? query.error} />
      {query.isLoading && <Loading />}
      {d && (
        <>
          <div className="kpi-grid">
            <Card className="kpi-card kpi-total">
              <span className="metric-symbol" aria-hidden="true">
                <CalendarDays size={24} />
              </span>
              <p>Total</p>
              <strong>{d.total}</strong>
              {filters.month && (
                <span className="total-month">
                  <span>Bulan</span>
                  <b>{monthLabel(filters.month)}</b>
                </span>
              )}
            </Card>
            <Card className="kpi-card kpi-ok">
              <span className="metric-symbol" aria-hidden="true">
                <CheckCircle2 size={24} />
              </span>
              <p>
                <Check size={18} /> OK
              </p>
              <strong className="text-ok">{d.ok}</strong>
            </Card>
            <Card className="kpi-card kpi-ng">
              <span className="metric-symbol" aria-hidden="true">
                <Gauge size={24} />
              </span>
              <p>
                <X size={18} /> NG
              </p>
              <strong className="text-ng">{d.ng}</strong>
            </Card>
            <Card className="kpi-card kpi-ratio">
              <span className="metric-symbol" aria-hidden="true">
                <TrendingUp size={24} />
              </span>
              <p>% OK</p>
              <strong>{d.ok_ratio === null ? '—' : number(d.ok_ratio * 100, 1) + '%'}</strong>
            </Card>
          </div>
          <div className="summary-detail-grid">
            <Card className="summary-chart-card">
              <div className="row between">
                <h2 className="section-icon-title">
                  <BarChart3 size={20} /> Hasil per hari
                </h2>
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
            <Card className="summary-table-card">
              <h2>Ringkasan pemeriksaan</h2>
              <div className="summary-results">
                <table aria-label="Ringkasan pemeriksaan bulanan">
                  <thead>
                    <tr>
                      <th>Pemeriksaan</th>
                      <th>Total</th>
                      <th>OK</th>
                      <th>NG</th>
                      <th>
                        Waktu <span className="sr-only">pemeriksaan terbaru WIB</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...d.groups].sort(compareInspections).map((g) => {
                      const href =
                        '/riwayat/' +
                        encodeURIComponent(g.definition_id) +
                        '?' +
                        new URLSearchParams({
                          month: filters.month,
                          ...(filters.line ? { line: filters.line } : {}),
                          ...(filters.shift ? { shift: filters.shift } : {}),
                        });
                      const checked =
                        g.latest_checked_at && Number.isFinite(Date.parse(g.latest_checked_at))
                          ? g.latest_checked_at
                          : null;
                      return (
                        <tr
                          key={g.definition_id}
                          onClick={(event) => {
                            if (
                              !event.ctrlKey &&
                              !event.metaKey &&
                              !event.shiftKey &&
                              !(event.target as HTMLElement).closest('a')
                            )
                              navigate(href);
                          }}
                        >
                          <th title={inspectionLabel(g)}>
                            <Link className="summary-inspection-link" to={href}>
                              {inspectionLabel(g)}
                            </Link>
                          </th>
                          <td>{g.total}</td>
                          <td>{g.ok}</td>
                          <td>{g.ng}</td>
                          <td>
                            {checked ? (
                              <time dateTime={checked} title={dateTime(checked) + ' WIB'}>
                                {timeFormat.format(new Date(checked))}
                              </time>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
