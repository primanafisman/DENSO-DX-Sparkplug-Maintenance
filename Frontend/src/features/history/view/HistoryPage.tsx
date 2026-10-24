import { useState } from 'react';
import { useReportFilters } from '../../../shared/controller/useReportFilters';
import { ReportFilters } from '../../../shared/components/layout/ReportFilters';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import {
  Card,
  Button,
  Loading,
  ErrorMessage,
  Empty,
  Field,
  ErrorDialog,
} from '../../../shared/components/ui';
import { useMonthlyChecksheet } from '../controller/useMonthlyChecksheet';
import { downloadReport } from '../controller/useEvidence';
import { MonthlyTable } from './MonthlyTable';
import { useCapabilities } from '../../../shared/controller/useCapabilities';
import './history.css';
import type { MonthlyMode } from '../model/monthlyRows';
export function HistoryPage() {
  const f = useReportFilters(),
    capabilities = useCapabilities(),
    demoAvailable = capabilities.data?.demo_reports === true,
    q = useMonthlyChecksheet(f.demo && !demoAvailable ? null : f.scope),
    [mode, setMode] = useState<MonthlyMode>('all'),
    [error, setError] = useState<unknown>(null);
  const rows = q.data?.rows ?? [],
    meta = q.data?.meta,
    warnings = meta?.warnings.filter((warning) => warning !== 'DEMO_DATA') ?? [];
  return (
    <>
      <PageHeader
        title="Riwayat pemeriksaan"
        actions={
          <>
            {(demoAvailable || f.demo) && (
              <Button variant="secondary" onClick={() => f.change('demo', f.demo ? '' : '1')}>
                {f.demo ? 'Kembali ke data produksi' : 'Lihat data contoh'}
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={!meta || f.demo}
              onClick={() =>
                meta &&
                downloadReport({ ...meta.scope, as_of: meta.as_of }, 'checksheet').catch(setError)
              }
            >
              Unduh CSV
            </Button>
          </>
        }
      />
      {f.demo && (
        <div className="demo-banner" role="status">
          <strong>Data contoh — bukan catatan produksi.</strong> Simulasi tabel dan grafik.
        </div>
      )}
      <div className="sm-history-toolbar no-print">
        <ReportFilters filters={f} />
        <Field label="Isi sel tabel">
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="all">Semua Data</option>
            <option value="status">Hasil NG / OK</option>
            <option value="measurement">Rata-rata sampel X dan R</option>
          </select>
        </Field>
      </div>
      {f.demo &&
        !demoAvailable &&
        (capabilities.isPending ? (
          <Loading />
        ) : (
          <Empty
            title="Data contoh tidak tersedia pada server ini"
            description="Kembali ke data produksi untuk melihat catatan pemeriksaan."
          />
        ))}
      <ErrorMessage error={f.error ?? q.error} />
      {q.error && (
        <Button variant="secondary" onClick={() => q.refetch()}>
          Muat ulang riwayat
        </Button>
      )}
      {q.isLoading && <Loading label="Memuat seluruh hasil bulan…" />}
      {!q.isLoading && !q.error && meta && (
        <Card>
          {rows.length ? (
            <MonthlyTable
              key={JSON.stringify(f.scope)}
              rows={rows}
              scope={meta.scope}
              mode={mode}
              demo={f.demo}
            />
          ) : (
            <Empty title="Belum ada catatan bulan ini" />
          )}
        </Card>
      )}
      {!!warnings.length && (
        <details className="info-note">
          <summary>Catatan laporan</summary>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </details>
      )}
      <ErrorDialog error={error} onClose={() => setError(null)} />
    </>
  );
}
