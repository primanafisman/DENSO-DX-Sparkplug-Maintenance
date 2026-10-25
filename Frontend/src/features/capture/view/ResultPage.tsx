import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCapture } from '../controller/captureContext';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
import { useResultSelection } from '../controller/useResultSelection';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Field, Badge, Loading, ErrorMessage, Button } from '../../../shared/components/ui';
import { number } from '../../../shared/lib/format';
export function ResultPage() {
  const { state, engine } = useCapture(),
    store = useInspectionStore(),
    selection = useResultSelection(),
    navigate = useNavigate();
  if (!state.file) return <Navigate to="/pemeriksaan/foto" replace />;
  const busy =
      state.manualPreparing || ['queued', 'reading', 'locating', 'uploading'].includes(state.stage),
    result = state.result,
    valid =
      result?.confidence.valid &&
      result.validated_prediction !== null &&
      result.validated_prediction !== undefined;
  const { candidates, checks } = selection;
  const resultProfile = state.analysisProfile ?? state.profile;
  const label = result?.label ?? state.discovery?.instruments[state.proposalIndex]?.label;
  const raw =
    label && typeof label.raw_text === 'string'
      ? label.raw_text
      : label && typeof label.text === 'string'
        ? label.text
        : '';
  return (
    <>
      <PageHeader title="Hasil pembacaan" />
      <Card>
        {state.manualPreparing ? (
          <Loading label="Menyiapkan input manual…" />
        ) : busy ? null : (
          <>
            <div className={'reading-value ' + (!valid ? 'unread' : '')}>
              {valid
                ? number(result!.validated_prediction, resultProfile?.decimals ?? 3) +
                  ' ' +
                  (resultProfile?.unit ?? '')
                : 'Belum terbaca'}
            </div>
            <div className="row wrap">
              <Badge tone={valid ? 'ok' : 'warning'}>
                {valid ? 'Hasil tersedia' : 'Periksa crop / foto ulang'}
              </Badge>
              <span className="muted">Confidence {result?.confidence.level ?? 'rendah'}</span>
            </div>
            {!valid &&
              result?.candidate.value !== null &&
              result?.candidate.value !== undefined && (
                <p className="source-note">
                  Estimasi belum terverifikasi: {number(result.candidate.value)}{' '}
                  {result.candidate.unit}
                </p>
              )}
            <ErrorMessage error={state.error} />
            <div className="result-images">
              <section>
                <h3>Crop gauge / display</h3>
                <img
                  src={state.gaugeUrl || state.sourceUrl || undefined}
                  alt="Gauge yang dianalisis"
                />
                <Button
                  variant="secondary"
                  onClick={() => navigate('/pemeriksaan/crop?region=gauge')}
                >
                  Atur crop indikator
                </Button>
              </section>
              <section>
                <h3>Label nama alat / test</h3>
                {state.labelUrl ? (
                  <img src={state.labelUrl} alt="Crop label nama alat" />
                ) : (
                  <p className="info-note">Pilih nama alat.</p>
                )}
                {raw && <p className="muted">Teks terbaca: {raw}</p>}
                <Button
                  variant="secondary"
                  onClick={() => navigate('/pemeriksaan/crop?region=label')}
                >
                  Atur crop label
                </Button>
              </section>
            </div>
            {(state.discovery?.instruments.length ?? 0) > 1 && (
              <Field label="Indikator pada foto">
                <select
                  value={state.proposalIndex}
                  onChange={(e) => engine.proposal(Number(e.target.value))}
                >
                  {state.discovery!.instruments.map((p, i) => (
                    <option key={p.client_id ?? i} value={i}>
                      Indikator {i + 1} · {p.kind_hint}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="field-row">
              <Field label="Pemeriksaan">
                <select
                  disabled={selection.locked}
                  value={store.draft?.definition?.id ?? ''}
                  onChange={(e) => void selection.selectCheck(e.target.value)}
                >
                  <option value="">Pilih pemeriksaan</option>
                  {checks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nama alat">
                <select
                  disabled={selection.locked}
                  value={state.instrument?.id ?? ''}
                  onChange={(e) => void selection.selectInstrument(e.target.value)}
                >
                  <option value="">Pilih nama alat</option>
                  {candidates.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {store.draft?.definition && !candidates.length && (
              <p className="info-note">Alat belum terhubung. Atur di Pengaturan.</p>
            )}
            {state.requiresReanalysis && (
              <p className="info-note">Profil berbeda. Baca ulang atau isi manual.</p>
            )}
            {state.instrument && (state.requiresReanalysis || !result) && (
              <Button variant="secondary" onClick={() => void engine.reanalyse()}>
                Baca ulang dengan profil alat
              </Button>
            )}
            {state.instrument &&
              !checks.some((d) => state.instrument!.maintenance_check_ids.includes(d.id)) && (
                <p className="info-note">
                  Alat ini belum ditautkan ke pemeriksaan angka yang aktif. Admin dapat mengatur
                  hubungan alat di Peralatan.
                </p>
              )}
            {state.instrument?.condition === 'unknown' && (
              <p className="info-note">Kondisi alat belum diisi.</p>
            )}
            {selection.completed && (
              <p className="status-chip status-chip-ok" role="status">
                ✓ Alat ini sudah diperiksa
              </p>
            )}
            <details className="info-note">
              <summary>Detail pembacaan</summary>
              <p>Metode: {result?.method ?? 'CV lokal'}</p>
              {result?.confidence.reasons?.map((r) => (
                <p key={r}>{r}</p>
              ))}
              <p>
                Ketelitian fisik mengikuti alat. Jumlah desimal tidak menyatakan akurasi pengukuran.
              </p>
            </details>
            <div className="actions result-footer workflow-actions">
              <Link className="button button-secondary" to="/pemeriksaan/foto">
                Foto ulang
              </Link>
              <Button
                variant="secondary"
                disabled={
                  !state.photo ||
                  !state.instrument ||
                  !store.draft?.definition ||
                  selection.locked ||
                  selection.completed
                }
                onClick={async () => {
                  const result = await engine.manual();
                  if (result) navigate('/pemeriksaan/konfirmasi');
                }}
              >
                Isi angka manual
              </Button>
              <Button
                disabled={
                  !result ||
                  !state.instrument ||
                  !store.draft?.definition ||
                  selection.completed ||
                  state.requiresReanalysis
                }
                onClick={() => navigate('/pemeriksaan/konfirmasi')}
              >
                Lanjut · konfirmasi
              </Button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
