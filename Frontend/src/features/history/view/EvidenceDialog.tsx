import { useEvidence } from '../controller/useEvidence';
import { Button, ErrorMessage, Loading } from '../../../shared/components/ui';
export function EvidenceDialog({
  id,
  variant,
  onClose,
}: {
  id: string;
  variant: 'original' | 'crop';
  onClose: () => void;
}) {
  const q = useEvidence(id, variant);
  return (
    <div className="modal-backdrop">
      <section
        className="modal evidence-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Foto bukti"
      >
        <div className="row between">
          <h2>Foto bukti · {variant}</h2>
          <Button variant="secondary" onClick={onClose}>
            Tutup foto
          </Button>
        </div>
        <ErrorMessage error={q.error} />
        {q.url ? <img src={q.url} alt="Foto bukti pengukuran" /> : !q.error && <Loading />}
      </section>
    </div>
  );
}
