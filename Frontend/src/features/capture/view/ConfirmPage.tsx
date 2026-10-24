import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useCapture } from '../controller/captureContext';
import { useInspection } from '../../maintenance/controller/useInspection';
import { nextCapture } from '../../maintenance/model/inspectionStore';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Field, Button, ErrorDialog, Badge } from '../../../shared/components/ui';
import { number } from '../../../shared/lib/format';
export function ConfirmPage() {
  const { state, engine } = useCapture(),
    inspection = useInspection({ scheduleEnabled: false }),
    navigate = useNavigate(),
    [value, setValue] = useState(
      state.pending
        ? String(state.pending.final_value)
        : state.reviewDraft
          ? state.reviewDraft.value
          : state.result?.confidence.valid &&
              state.result.validated_prediction !== null &&
              state.result.validated_prediction !== undefined
            ? String(state.result.validated_prediction)
            : '',
    ),
    [identity, setIdentity] = useState(state.reviewDraft?.identity ?? false),
    [verified, setVerified] = useState(state.reviewDraft?.verified ?? false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<unknown>(null);
  const d = inspection.draft;
  if (!state.result || !d?.definition || !state.instrument)
    return <Navigate to="/pemeriksaan/hasil" replace />;
  const sample = nextCapture(d);
  const confirm = async () => {
    setSaving(true);
    try {
      const reading = await engine.confirm({
        final_value: value,
        reason: '',
        identity_verified: identity,
        verified,
      });
      if (reading && sample) inspection.addReading(sample.sample_id, sample.stage, reading);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Konfirmasi hasil"
        description={d.definition.name + ' · Line ' + d.context.line}
      />
      <Card>
        <Badge>{state.instrument.name}</Badge>
        <div className="reading-value">
          {state.reading
            ? state.reading.final_value + ' ' + state.profile?.unit
            : number(state.result.validated_prediction, state.profile?.decimals ?? 3) +
              ' ' +
              state.profile?.unit}
        </div>
        {!state.result.confidence.valid && (
          <p className="info-note">
            Input manual berdasarkan foto. Isi nilai, lalu konfirmasi identitas dan hasil.
          </p>
        )}
        <p className="muted">
          {sample
            ? `${sample.sample_id}${sample.stage ? ' · ' + sample.stage : ''}`
            : 'Seluruh sampel lengkap'}{' '}
          · {d.context.production_date} · {d.context.shift === 'day' ? 'Shift 1' : 'Shift 2'}
        </p>
        {!state.reading ? (
          <>
            <Field label="Nilai akhir" hint={'Satuan ' + state.profile?.unit}>
              <input
                inputMode="decimal"
                value={value}
                disabled={saving || !!state.pending}
                onChange={(e) => {
                  setValue(e.target.value);
                  setVerified(false);
                  engine.setReviewDraft({ value: e.target.value, identity, verified: false });
                }}
              />
            </Field>
            <label className="check-label">
              <input
                type="checkbox"
                checked={identity}
                onChange={(e) => {
                  setIdentity(e.target.checked);
                  engine.setReviewDraft({ value, identity: e.target.checked, verified });
                }}
              />
              Identitas alat dan pemeriksaan sudah benar
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => {
                  setVerified(e.target.checked);
                  engine.setReviewDraft({ value, identity, verified: e.target.checked });
                }}
              />
              Nilai sesuai foto dan sudah saya periksa
            </label>
            {state.pending && (
              <p className="info-note">
                Konfirmasi sebelumnya belum pasti. Coba lagi dengan ID dan isi permintaan yang sama.
              </p>
            )}
            <div className="actions">
              <Link className="button button-secondary" to="/pemeriksaan/hasil">
                Kembali
              </Link>
              <Button onClick={confirm} disabled={!identity || !verified || !value || saving}>
                {saving
                  ? 'Menyimpan bacaan…'
                  : state.pending
                    ? 'Coba ulang konfirmasi'
                    : 'Konfirmasi hasil'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="info-note">
              Bacaan terkonfirmasi.{' '}
              {sample
                ? 'Ambil foto baru untuk sampel berikutnya.'
                : 'Semua sampel lengkap; simpan pemeriksaan agar masuk ke laporan maintenance.'}
            </p>
            <div className="actions">
              {sample ? (
                <Button
                  onClick={() => {
                    engine.dispose();
                    navigate('/pemeriksaan/foto');
                  }}
                >
                  Foto sampel berikutnya
                </Button>
              ) : (
                <Button
                  disabled={inspection.save.isPending || inspection.uncertain}
                  onClick={() => inspection.save.mutate()}
                >
                  {inspection.save.isPending ? 'Menyimpan…' : 'Simpan pemeriksaan'}
                </Button>
              )}
            </div>
          </>
        )}
        <div>
          {inspection.uncertain && (
            <p className="info-note">
              Respons simpan belum diterima. Periksa{' '}
              <Link to="/riwayat" target="_blank">
                riwayat
              </Link>{' '}
              sebelum mencoba lagi.{' '}
              <Button variant="secondary" onClick={inspection.allowAfterReview}>
                Sudah memeriksa riwayat
              </Button>
            </p>
          )}
        </div>
        <p className="info-note">
          Batas standar: {d.definition.standard_text}. Status OK/NG ditentukan server saat
          pemeriksaan disimpan.
        </p>
      </Card>
      <ErrorDialog
        error={error ?? inspection.error}
        onClose={() => {
          setError(null);
          inspection.clearError();
        }}
      />
    </>
  );
}
