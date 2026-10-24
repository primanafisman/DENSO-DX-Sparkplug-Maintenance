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
import { useChecksheet } from '../controller/useChecksheet';
import { downloadReport } from '../controller/useEvidence';
import { MonthlyTable } from './MonthlyTable';
import { dateTime } from '../../../shared/lib/format';
import { useCapabilities } from '../../../shared/controller/useCapabilities';
export function HistoryPage() {
  const f = useReportFilters(),
    capabilities = useCapabilities(),
    demoAvailable = capabilities.data?.demo_reports === true,
    q = useChecksheet(f.demo && !demoAvailable ? null : f.scope),
    [mode, setMode] = useState<'status' | 'value'>('status'),
    [error, setError] = useState<unknown>(null);
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [],
    meta = q.data?.pages[0].meta;
  return (
    <>
      <PageHeader
        title="Riwayat pemeriksaan"
        description="Pilih bulan, lalu buka pemeriksaan untuk rincian dan grafik."
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
          <strong>Data contoh — bukan catatan produksi.</strong> Nilai ilustrasi mengikuti struktur
          lembar maintenance. Buka EE Cutting atau pemeriksaan angka lain untuk melihat grafik X̄ /
          R.
        </div>
      )}
      <ReportFilters filters={f} />
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
      <Field label="Isi sel tabel">
        <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="status">Hasil OK / NG</option>
          <option value="value">Rata-rata sampel (X̄)</option>
        </select>
      </Field>
      <ErrorMessage error={f.error ?? q.error} />
      {q.isLoading && <Loading />}
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
          {q.hasNextPage && (
            <Button
              variant="secondary"
              disabled={q.isFetchingNextPage}
              onClick={() => q.fetchNextPage()}
            >
              Tampilkan baris berikutnya
            </Button>
          )}
        </Card>
      )}
      {meta && (
        <p className="muted">
          Snapshot {dateTime(meta.as_of)}. Sel kosong berarti belum ada catatan; beberapa catatan
          tetap ditampilkan terpisah. {meta.warnings.join(' ')}
        </p>
      )}
      <ErrorDialog error={error} onClose={() => setError(null)} />
    </>
  );
}
