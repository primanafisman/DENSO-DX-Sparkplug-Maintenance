import { useState } from 'react';
import type { Occurrence, EvidenceRef } from '../../../shared/lib/contracts';
import { dateTime, number } from '../../../shared/lib/format';
import { Button, Status } from '../../../shared/components/ui';
import { EvidenceDialog } from './EvidenceDialog';
export function OccurrenceDrawer({ items, onClose }: { items: Occurrence[]; onClose: () => void }) {
  const [evidence, setEvidence] = useState<EvidenceRef | null>(null);
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
            <Button variant="secondary" onClick={onClose}>
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
                Line {o.context.line} · {o.slot_id ?? 'Slot tidak tercatat'} · {o.context.sampler}
              </p>
              <p>Type: {o.product_snapshot?.name ?? 'Tidak tercatat'}</p>
              <p>Alat: {o.instruments.map((i) => i.name).join(', ') || 'Tidak tercatat'}</p>
              {o.outcomes.map((s, i) => (
                <p key={i}>
                  {s.sample_id}: {'value' in s ? number(s.value) : s.status}{' '}
                  <Status value={s.status} />
                </p>
              ))}
              {o.numeric_summary && (
                <p>
                  X̄ {number(o.numeric_summary.xbar)} · R {number(o.numeric_summary.r)}
                </p>
              )}
              <p className="muted">
                Standar saat diperiksa: {o.definition_snapshot?.standard_text ?? 'Tidak tercatat'}
              </p>
              <div className="actions">
                {o.evidence.map((e, i) => (
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
      {evidence && (
        <EvidenceDialog
          id={evidence.reading_id}
          variant={evidence.variant}
          onClose={() => setEvidence(null)}
        />
      )}
    </>
  );
}
