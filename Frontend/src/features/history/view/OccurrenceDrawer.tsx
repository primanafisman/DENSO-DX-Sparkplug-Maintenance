import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Occurrence, EvidenceRef } from '../../../shared/lib/contracts';
import { dateTime, number } from '../../../shared/lib/format';
import { Button, Status } from '../../../shared/components/ui';
import { ConfirmationDialog } from '../../../shared/components/ui/ConfirmationDialog';
import { EvidenceDialog } from './EvidenceDialog';
import { useDeleteRecord } from '../controller/useDeleteRecord';
import { useSession } from '../../auth/controller/useSession';
import { statusOnlyReport } from '../model/reportMode';
import { measurementUnit, occurrenceAcceptance } from '../model/measurementFacts';
import { illustrativeOrigin } from '../model/reportOrigin';
import { OriginBadge } from './OriginBadge';
import { inspectionLabel } from '../../../shared/lib/inspectionIdentity';
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
  units,
  showStatistics = true,
}: {
  items: Occurrence[];
  onClose: () => void;
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
              {o.definition_snapshot && <h3>{inspectionLabel(o.definition_snapshot)}</h3>}
              <div className="row between">
                <h3>{dateTime(o.checked_at)}</h3>
                <OriginBadge origin={o.origin} />
                <div className="occurrence-status">
                  <Status value={o.overall_status} />
                  {user?.role === 'Admin' &&
                    (confirming === o.id ? (
                      <ConfirmationDialog
                        title="Hapus catatan pemeriksaan ini?"
                        description="Catatan tidak lagi ditampilkan; pemeriksaan pada jadwal yang sama dapat diisi kembali."
                        danger
                        pending={deletion.isPending}
                        error={deletion.error}
                        confirmLabel="Ya, hapus catatan"
                        cancelLabel="Batal hapus"
                        onCancel={() => {
                          setConfirming(null);
                          deletion.reset();
                        }}
                        onConfirm={() => deletion.mutate(o.id, { onSuccess: onClose })}
                      />
                    ) : (
                      <Button
                        variant="danger"
                        className="icon-button"
                        aria-label="Hapus catatan pemeriksaan"
                        disabled={deletion.isPending}
                        onClick={() => {
                          deletion.reset();
                          setConfirming(o.id);
                        }}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </Button>
                    ))}
                </div>
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
                {!illustrativeOrigin(o.origin) &&
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
            </article>
          ))}
        </section>
      </div>
      {evidence &&
        items.some(
          (o) =>
            !illustrativeOrigin(o.origin) &&
            o.evidence.some(
              (e) => e.reading_id === evidence.reading_id && e.variant === evidence.variant,
            ),
        ) && (
          <EvidenceDialog
            id={evidence.reading_id}
            variant={evidence.variant}
            onClose={() => setEvidence(null)}
          />
        )}
    </>
  );
}
