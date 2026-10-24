import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Occurrence, EvidenceRef } from '../../../shared/lib/contracts';
import { dateTime, number } from '../../../shared/lib/format';
import { Button, Status, ErrorMessage } from '../../../shared/components/ui';
import { EvidenceDialog } from './EvidenceDialog';
import { useDeleteRecord } from '../controller/useDeleteRecord';
import { useSession } from '../../auth/controller/useSession';
import { statusOnlyReport } from '../model/reportMode';
import { measurementUnit, occurrenceAcceptance } from '../model/measurementFacts';
function Acceptance({ occurrence, unit }: { occurrence: Occurrence; unit?: string | null }) {
  const limits = occurrenceAcceptance(occurrence, unit),
    labels = [...new Set(limits.map((item) => item.label))];
  if (!labels.length) return null;
  return labels.length === 1 ? (
    <p>
      <strong>Batas OK:</strong> {labels[0]}
    </p>
  ) : (
    <details>
      <summary>Batas OK per sampel</summary>
      {limits.map((item) => (
        <p key={item.sample_id}>
          {item.sample_id}: {item.label}
        </p>
      ))}
    </details>
  );
}
export function OccurrenceDrawer({
  items,
  onClose,
  demo = false,
  units,
  showStatistics = true,
}: {
  items: Occurrence[];
  onClose: () => void;
  demo?: boolean;
  units?: Record<string, string | null>;
  showStatistics?: boolean;
}) {
  const [evidence, setEvidence] = useState<EvidenceRef | null>(null),
    [confirming, setConfirming] = useState<string | null>(null),
    deletion = useDeleteRecord(),
    { user } = useSession();
  return (
    <>
      <div className="modal-backdrop">
        <section
          className="modal occurrence-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Rincian pemeriksaan"
        >
          <div className="row between">
            <h2>Rincian pemeriksaan</h2>
            <Button variant="secondary" onClick={onClose} disabled={deletion.isPending}>
              Tutup rincian
            </Button>
          </div>
          {items.map((o) => (
            <article className="occurrence" key={o.id}>
              <div className="row between">
                <h3>{dateTime(o.checked_at)}</h3>
                <Status value={o.overall_status} />
              </div>
              <p>
                Line {o.context.line} · Shift {o.context.shift === 'day' ? '1' : '2'} ·{' '}
                {o.slot_id ?? 'Slot tidak tercatat'} · {o.context.sampler}
              </p>
              {o.product_snapshot?.name && <p>Type: {o.product_snapshot.name}</p>}
              {!!o.instruments.length && <p>Alat: {o.instruments.map((i) => i.name).join(', ')}</p>}
              {o.outcomes.map((s, i) => (
                <p key={i}>
                  {s.sample_id}:{' '}
                  {'value' in s
                    ? number(s.value) + ' ' + (measurementUnit(o, s, units?.[o.id]) ?? '')
                    : s.status}{' '}
                  <Status value={s.status} />
                </p>
              ))}
              <Acceptance occurrence={o} unit={units?.[o.id]} />
              {showStatistics &&
                o.numeric_summary?.complete &&
                (o.definition_snapshot?.sample_count ?? 0) >= 2 &&
                !statusOnlyReport(o.definition_snapshot) && (
                  <p>
                    X̄ {number(o.numeric_summary.xbar)}{' '}
                    {o.definition_snapshot?.unit ?? units?.[o.id]} · R {number(o.numeric_summary.r)}{' '}
                    {o.definition_snapshot?.unit ?? units?.[o.id]}
                  </p>
                )}
              {o.definition_snapshot?.standard_text && (
                <details>
                  <summary>Detail pemeriksaan</summary>
                  <p>Standar saat diperiksa: {o.definition_snapshot.standard_text}</p>
                </details>
              )}
              <div className="actions">
                {!demo &&
                  o.evidence.map((e, i) => (
                    <Button
                      variant="secondary"
                      key={e.reading_id + e.variant}
                      onClick={() => setEvidence(e)}
                    >
                      Foto {i + 1} · {e.variant}
                    </Button>
                  ))}
              </div>
              {!demo &&
                user?.role === 'Admin' &&
                (confirming === o.id ? (
                  <section
                    className="availability-confirm"
                    role="group"
                    aria-label="Konfirmasi hapus catatan"
                  >
                    <h3>Hapus catatan pemeriksaan ini?</h3>
                    <p>
                      Catatan tidak lagi ditampilkan; pemeriksaan pada jadwal yang sama dapat diisi
                      kembali.
                    </p>
                    <ErrorMessage error={deletion.error} />
                    <div className="actions">
                      <Button
                        variant="secondary"
                        disabled={deletion.isPending}
                        onClick={() => {
                          setConfirming(null);
                          deletion.reset();
                        }}
                      >
                        Batal hapus
                      </Button>
                      <Button
                        variant="danger"
                        disabled={deletion.isPending}
                        onClick={() => deletion.mutate(o.id, { onSuccess: onClose })}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                        {deletion.isPending ? 'Menghapus catatan…' : 'Ya, hapus catatan'}
                      </Button>
                    </div>
                  </section>
                ) : (
                  <Button
                    variant="danger"
                    aria-label="Hapus catatan pemeriksaan"
                    disabled={deletion.isPending}
                    onClick={() => {
                      deletion.reset();
                      setConfirming(o.id);
                    }}
                  >
                    <Trash2 size={18} aria-hidden="true" /> Hapus catatan
                  </Button>
                ))}
            </article>
          ))}
        </section>
      </div>
      {!demo && evidence && (
        <EvidenceDialog
          id={evidence.reading_id}
          variant={evidence.variant}
          onClose={() => setEvidence(null)}
        />
      )}
    </>
  );
}
