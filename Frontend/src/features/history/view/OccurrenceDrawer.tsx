import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Occurrence, EvidenceRef } from '../../../shared/lib/contracts';
import { dateTime, number } from '../../../shared/lib/format';
import { Button, Status, ErrorMessage } from '../../../shared/components/ui';
import { EvidenceDialog } from './EvidenceDialog';
import { useDeleteRecord } from '../controller/useDeleteRecord';
import { useSession } from '../../auth/controller/useSession';
export function OccurrenceDrawer({
  items,
  onClose,
  demo = false,
}: {
  items: Occurrence[];
  onClose: () => void;
  demo?: boolean;
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
