import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useInspection } from '../controller/useInspection';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Button, Badge, ErrorDialog } from '../../../shared/components/ui';
import { InspectionGuidance } from './InspectionGuidance';
import { ConfirmationDialog } from '../../../shared/components/ui/ConfirmationDialog';
export function VisualCheckPage() {
  const state = useInspection({ scheduleEnabled: false }),
    [verified, setVerified] = useState(false),
    [savePrompt, setSavePrompt] = useState(false);
  const d = state.draft;
  if (!d?.definition) return <Navigate to="/pemeriksaan" replace />;
  if (d.definition.input_method !== 'ok_ng') return <Navigate to="/pemeriksaan/foto" replace />;
  const complete = d.definition.samples.every((s) =>
    d.observations.some((o) => o.sample_id === s.id && 'status' in o),
  );
  return (
    <>
      <PageHeader title={d.definition.name} />
      <InspectionGuidance>
        <Card>
          <Badge>Visual / fungsi · OK–NG</Badge>
          <h2 className="section-title">Hasil pemeriksaan</h2>
          <div className="visual-samples">
            {d.definition.samples.map((sample) => {
              const o = d.observations.find((o) => o.sample_id === sample.id),
                status = o && 'status' in o ? o.status : null;
              return (
                <div className="visual-sample" key={sample.id}>
                  <strong>{sample.label}</strong>
                  <div className="actions">
                    {(['OK', 'NG'] as const).map((s) => (
                      <button
                        key={s}
                        className={
                          'result-choice ' + (status === s ? 'selected-' + s.toLowerCase() : '')
                        }
                        aria-label={sample.label + ' ' + s}
                        aria-pressed={status === s}
                        onClick={() => {
                          state.setStatus(sample.id, s);
                          setVerified(false);
                        }}
                      >
                        {s === 'OK' ? '✓' : '×'} {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            Saya telah memeriksa seluruh hasil
          </label>
          {state.uncertain && (
            <p className="source-note">
              Respons penyimpanan belum pasti. Periksa Riwayat sebelum mengirim ulang.{' '}
              <button className="link-button" onClick={state.allowAfterReview}>
                Saya sudah memeriksa riwayat
              </button>
            </p>
          )}
          <div className="actions workflow-actions">
            <Link className="button button-secondary" to="/pemeriksaan">
              Kembali
            </Link>
            <Button
              disabled={!complete || !verified || state.save.isPending || state.uncertain}
              onClick={() => setSavePrompt(true)}
            >
              {state.save.isPending ? 'Menyimpan…' : 'Simpan pemeriksaan'}
            </Button>
          </div>
        </Card>
      </InspectionGuidance>
      {savePrompt && (
        <ConfirmationDialog
          title="Simpan hasil pemeriksaan?"
          description={d.definition.name}
          onCancel={() => setSavePrompt(false)}
          onConfirm={() => {
            state.save.mutate();
            setSavePrompt(false);
          }}
        />
      )}
      <ErrorDialog error={state.error} onClose={state.clearError} />
    </>
  );
}
