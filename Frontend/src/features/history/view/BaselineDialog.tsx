import type { SpcCohort, ReportInput } from '../../../shared/lib/contracts';
import { useSaveBaseline } from '../controller/useSaveBaseline';
import { Button, ErrorMessage } from '../../../shared/components/ui';
export function BaselineDialog({
  scope,
  cohort,
  onClose,
}: {
  scope: ReportInput;
  cohort: SpcCohort;
  onClose: () => void;
}) {
  const save = useSaveBaseline();
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-label="Simpan batas kontrol">
        <h2>Simpan batas kontrol</h2>
        <ErrorMessage error={save.error} />
        {save.isSuccess ? <p role="status">Batas kontrol tersimpan.</p> : null}
        <div className="actions">
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button
            disabled={save.isPending || save.isSuccess}
            onClick={() =>
              save.mutate({
                scope,
                cohort_id: cohort.cohort_id,
                method: cohort.capability.method,
                review_reason: 'Baseline ditinjau dan disimpan oleh admin',
              })
            }
          >
            {save.isPending ? 'Menyimpan…' : 'Simpan batas kontrol'}
          </Button>
        </div>
      </section>
    </div>
  );
}
