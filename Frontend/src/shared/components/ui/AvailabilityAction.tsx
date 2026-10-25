import { Trash2, RotateCcw } from 'lucide-react';
import { Button } from './index';
import { ConfirmationDialog } from './ConfirmationDialog';
export function AvailabilityAction({
  name,
  active,
  confirming,
  onPrompt,
  onConfirm,
  pending,
  error,
}: {
  name: string;
  active: boolean;
  confirming: boolean;
  onPrompt: (open: boolean) => void;
  onConfirm: (active: boolean) => void;
  pending: boolean;
  error: unknown;
}) {
  const Icon = active ? Trash2 : RotateCcw;
  return (
    <section className="availability-action" aria-label="Status pilihan operator">
      {!confirming ? (
        <Button
          type="button"
          variant={active ? 'danger' : 'secondary'}
          onClick={() => onPrompt(true)}
          disabled={pending}
        >
          <Icon size={18} />
          {active ? 'Hapus dari pilihan' : 'Aktifkan kembali'}
        </Button>
      ) : (
        <ConfirmationDialog
          title={(active ? 'Hapus dari pilihan' : 'Aktifkan kembali') + ' · ' + name}
          description="Data dan riwayat tetap tersimpan. Draf tidak ikut disimpan."
          confirmLabel={active ? 'Ya, hapus dari pilihan' : 'Ya, aktifkan kembali'}
          cancelLabel={active ? 'Batal hapus' : 'Batal aktivasi'}
          danger={active}
          pending={pending}
          error={error}
          onCancel={() => onPrompt(false)}
          onConfirm={() => onConfirm(!active)}
        />
      )}
    </section>
  );
}
