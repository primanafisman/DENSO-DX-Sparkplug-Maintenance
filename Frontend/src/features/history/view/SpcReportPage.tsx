import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import type { Occurrence, Subgroup } from '../../../shared/lib/contracts';
import { useCatalog } from '../../settings/controller/useSettings';
import { useSession } from '../../auth/controller/useSession';
import { useReportFilters } from '../../../shared/controller/useReportFilters';
import { ReportFilters } from '../../../shared/components/layout/ReportFilters';
import { useSpcReport, useBaselines } from '../controller/useSpcReport';
import { downloadReport } from '../controller/useEvidence';
import { SpcCharts } from './SpcCharts';
import { CalculationPanel } from './CalculationPanel';
import { MeasurementMatrix } from './MeasurementMatrix';
import { BaselineDialog } from './BaselineDialog';
import { OccurrenceDrawer } from './OccurrenceDrawer';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import {
  Card,
  Field,
  Button,
  Loading,
  Empty,
  ErrorMessage,
  ErrorDialog,
} from '../../../shared/components/ui';
import { dateTime, monthRange } from '../../../shared/lib/format';
import { StatusReportPage } from './StatusReportPage';
import { useCapabilities } from '../../../shared/controller/useCapabilities';
import { statusOnlyReport } from '../model/reportMode';
import { cohortAcceptance } from '../model/measurementFacts';
export function SpcReportPage() {
  const { definitionId } = useParams(),
    catalog = useCatalog(true),
    [params] = useSearchParams(),
    capabilities = useCapabilities();
  const definition = catalog.data?.items.find((d) => d.id === definitionId);
  if (params.get('demo') === '1' && capabilities.isPending) return <Loading />;
  if (params.get('demo') === '1' && !capabilities.data?.demo_reports)
    return (
      <Card>
        <Empty title="Data contoh tidak tersedia pada server ini" />
        <Link to="/riwayat">Kembali ke data produksi</Link>
      </Card>
    );
  if (catalog.isPending) return <Loading />;
  if (catalog.error) return <ErrorMessage error={catalog.error} />;
  if (definition && statusOnlyReport(definition))
    return <StatusReportPage definition={definition} />;
  return <NumericReportPage />;
}
function NumericReportPage() {
  const { definitionId } = useParams(),
    f = useReportFilters(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    catalog = useCatalog(true),
    session = useSession(),
    [showSettings, setShowSettings] = useState(false),
    baselines = useBaselines(showSettings && !f.demo),
    [chosen, setChosen] = useState(''),
    [occurrence, setOccurrence] = useState<Occurrence | null>(null),
    [saveBaseline, setSaveBaseline] = useState(false),
    [error, setError] = useState<unknown>(null),
    [printing, setPrinting] = useState(false),
    [printGroups, setPrintGroups] = useState<Subgroup[] | null>(null),
    abort = useRef<AbortController | null>(null);
  const definition = catalog.data?.items.find((d) => d.id === definitionId),
    end =
      params.get('to') ??
      (f.productionDate?.startsWith(f.month) ? f.productionDate : f.scope?.production_date_to) ??
      '',
    start =
      params.get('from') ??
      (end
        ? new Date(new Date(end + 'T12:00:00Z').valueOf() - 6 * 86400000).toISOString().slice(0, 10)
        : ''),
    scope =
      f.scope && start && end
        ? {
            ...f.scope,
            definition_id: definitionId,
            production_date_from: start,
            production_date_to: end,
          }
        : null,
    baseline = f.demo ? undefined : (params.get('baseline') ?? undefined),
    q = useSpcReport(scope, chosen, baseline),
    c = q.cohort,
    report = q.report.data;
  useEffect(() => {
    abort.current?.abort();
    setPrintGroups(null);
    setPrinting(false);
    return () => abort.current?.abort();
  }, [
    start,
    end,
    definitionId,
    f.line,
    f.shift,
    baseline,
    chosen,
    report?.meta.as_of,
    c?.cohort_id,
  ]);
  const change = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };
  const selectOccurrence = async (id: string) => {
    const local =
      q.groups.find((g) => g.occurrence.id === id)?.occurrence ??
      c?.incomplete.find((g) => g.occurrence.id === id)?.occurrence;
    if (local) setOccurrence(local);
    else
      try {
        const all = await q.preparePrint();
        const selected = all.find((g) => g.occurrence.id === id);
        if (selected) setOccurrence(selected.occurrence);
      } catch (e) {
        setError(e);
      }
  };
  const print = async () => {
    abort.current?.abort();
    const token = new AbortController();
    abort.current = token;
    setPrinting(true);
    try {
      const all = await q.preparePrint(token.signal);
      if (token.signal.aborted) return;
      setPrintGroups(all);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!token.signal.aborted) window.print();
        }),
      );
    } catch (e) {
      if (!token.signal.aborted) setError(e);
    } finally {
      if (!token.signal.aborted) setPrinting(false);
    }
  };
  return (
    <>
      <div className="no-print">
        <PageHeader
          title={definition?.name ?? 'Laporan pemeriksaan'}
          actions={
            <Link
              className="button button-secondary"
              to={
                '/riwayat?' +
                new URLSearchParams({
                  month: f.month,
                  ...(f.line ? { line: f.line } : {}),
                  ...(f.shift ? { shift: f.shift } : {}),
                  ...(f.demo ? { demo: '1' } : {}),
                })
              }
            >
              Kembali ke tabel
            </Link>
          }
        />
        {f.demo && (
          <div className="demo-banner" role="status">
            <strong>Data contoh — bukan catatan produksi.</strong>
          </div>
        )}
        <ReportFilters filters={f} />
        <div className="filter-bar">
          <Field label="Pemeriksaan">
            <select
              value={definitionId}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                next.delete('baseline');
                navigate('/riwayat/' + encodeURIComponent(e.target.value) + '?' + next);
              }}
            >
              {catalog.data?.items.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal awal">
            <input type="date" value={start} onChange={(e) => change({ from: e.target.value })} />
          </Field>
          <Field label="Tanggal akhir">
            <input type="date" value={end} onChange={(e) => change({ to: e.target.value })} />
          </Field>
          <div className="actions">
            <Button
              variant="secondary"
              onClick={() =>
                change({
                  from: new Date(new Date(end + 'T12:00:00Z').valueOf() - 6 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                  to: end,
                })
              }
            >
              1 minggu
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                f.month &&
                change({
                  from: monthRange(f.month).production_date_from,
                  to: monthRange(f.month).production_date_to,
                })
              }
            >
              1 bulan
            </Button>
          </div>
        </div>
      </div>
      <ErrorMessage error={q.report.error ?? f.error ?? catalog.error} />
      {baseline && q.report.isError && (
        <details className="no-print">
          <summary>Pengaturan grafik</summary>
          <Button variant="secondary" onClick={() => change({ baseline: '' })}>
            Gunakan periode dipilih
          </Button>
        </details>
      )}
      {q.report.isLoading && <Loading />}
      {report && !q.report.error && (
        <>
          {!report.cohorts.length ? (
            <Card>
              <Empty
                title={
                  definition?.input_method === 'ok_ng'
                    ? 'Pemeriksaan OK / NG tidak memiliki grafik X̄ / R'
                    : 'Belum ada data angka pada periode ini'
                }
              />
            </Card>
          ) : (
            <>
              {report.cohorts.length > 1 && (
                <div className="no-print">
                  <Field label="Kelompok pengukuran">
                    <select value={c?.cohort_id ?? ''} onChange={(e) => setChosen(e.target.value)}>
                      <option value="">Pilih kelompok</option>
                      {report.cohorts.map((cohort, index) => (
                        <option key={cohort.cohort_id} value={cohort.cohort_id}>
                          {index + 1} ·{' '}
                          {[
                            cohort.product_snapshot?.name,
                            cohort.instruments.map((i) => i.name).join(', '),
                            cohort.unit,
                            'n' + cohort.n,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              {c ? (
                <>
                  <Card className="report-header">
                    <div className="row wrap">
                      {c.product_snapshot?.name && <strong>Type {c.product_snapshot.name}</strong>}
                      <span>{c.unit}</span>
                      <span>n = {c.n}</span>
                      {cohortAcceptance(c) && (
                        <span>
                          <strong>Batas OK:</strong> {cohortAcceptance(c)}
                        </span>
                      )}
                    </div>
                    <div className="no-print">
                      <details onToggle={(event) => setShowSettings(event.currentTarget.open)}>
                        <summary>Pengaturan grafik</summary>
                        {!f.demo && (
                          <Field label="Batas kontrol">
                            <select
                              disabled={report.cohorts.length > 1}
                              value={baseline ?? ''}
                              onChange={(e) => change({ baseline: e.target.value })}
                            >
                              <option value="">Periode dipilih</option>
                              {baselines.data
                                ?.filter((b) => b.cohort_key === c.cohort_key)
                                .map((b) => (
                                  <option key={b.id} value={b.id}>
                                    Tersimpan · {dateTime(b.created_at)}
                                  </option>
                                ))}
                            </select>
                          </Field>
                        )}
                        {report.cohorts.length > 1 && (
                          <p className="info-note">
                            Pilih satu kelompok pengukuran untuk memakai batas kontrol tersimpan.
                          </p>
                        )}
                        <ErrorMessage error={baselines.error} />
                        {baseline && (
                          <Button variant="secondary" onClick={() => change({ baseline: '' })}>
                            Gunakan periode dipilih
                          </Button>
                        )}
                        {!f.demo &&
                          session.user?.role === 'Admin' &&
                          report.cohorts.length === 1 && (
                            <Button
                              variant="secondary"
                              disabled={c.control_limits.ucl_x === null}
                              onClick={() => setSaveBaseline(true)}
                            >
                              Simpan batas kontrol
                            </Button>
                          )}
                      </details>
                      <div className="actions">
                        <Button onClick={print} disabled={printing}>
                          {printing ? 'Menyiapkan seluruh data…' : 'Cetak laporan A4'}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={f.demo}
                          onClick={() =>
                            downloadReport(
                              { ...report.meta.scope, as_of: report.meta.as_of },
                              'spc',
                              baseline,
                            ).catch(setError)
                          }
                        >
                          Unduh CSV
                        </Button>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <SpcCharts cohort={c} onPoint={(id) => void selectOccurrence(id)} />
                  </Card>
                  <Card>
                    <CalculationPanel cohort={c} />
                  </Card>
                  <Card className="no-print">
                    <h2>Data mentah, X̄, R dan Type</h2>
                    <ErrorMessage error={q.raw.error} />
                    {q.raw.isLoading ? (
                      <Loading />
                    ) : (
                      <MeasurementMatrix cohort={c} groups={q.groups} onSelect={setOccurrence} />
                    )}
                    <p>
                      {q.groups.length} subgroup dimuat · {c.counts.complete} lengkap +{' '}
                      {c.counts.incomplete} belum lengkap
                    </p>
                    {q.raw.hasNextPage && (
                      <Button
                        variant="secondary"
                        disabled={q.raw.isFetchingNextPage}
                        onClick={() => q.raw.fetchNextPage()}
                      >
                        Muat data berikutnya
                      </Button>
                    )}
                  </Card>
                  {!printGroups && (
                    <p className="print-only">
                      Data mentah belum disiapkan. Gunakan tombol Cetak laporan A4 untuk mencetak
                      seluruh data.
                    </p>
                  )}
                  {printGroups && (
                    <div className="print-only">
                      {Array.from({ length: Math.ceil(printGroups.length / 8) }, (_, i) => (
                        <section className="print-sheet" key={i}>
                          <h2>
                            {c.definition_snapshot.name} · data {i * 8 + 1}–
                            {Math.min(printGroups.length, (i + 1) * 8)}
                          </h2>
                          <p>
                            {start} – {end}
                          </p>
                          <MeasurementMatrix
                            cohort={c}
                            groups={printGroups.slice(i * 8, (i + 1) * 8)}
                            onSelect={() => {}}
                          />
                        </section>
                      ))}
                    </div>
                  )}
                  {saveBaseline && (
                    <BaselineDialog
                      scope={{ ...report.meta.scope, as_of: report.meta.as_of }}
                      cohort={c}
                      onClose={() => setSaveBaseline(false)}
                    />
                  )}
                </>
              ) : (
                <Card>
                  <Empty title="Pilih kelompok pengukuran" description="" />
                </Card>
              )}
            </>
          )}
          {report.meta.warnings.some((warning) => warning !== 'DEMO_DATA') && (
            <details className="info-note">
              <summary>Detail laporan</summary>
              {report.meta.warnings
                .filter((warning) => warning !== 'DEMO_DATA')
                .map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
            </details>
          )}
        </>
      )}
      <ErrorDialog error={error} onClose={() => setError(null)} />
      {occurrence && (
        <OccurrenceDrawer demo={f.demo} items={[occurrence]} onClose={() => setOccurrence(null)} />
      )}
    </>
  );
}
