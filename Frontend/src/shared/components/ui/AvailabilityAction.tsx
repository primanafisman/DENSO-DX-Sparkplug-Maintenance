import { Trash2, RotateCcw } from 'lucide-react';
import { Button, ErrorMessage } from './index';
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
        <div className="availability-confirm" role="group" aria-label="Konfirmasi status pilihan">
          <h3>
            {active ? 'Hapus dari pilihan' : 'Aktifkan kembali'} · {name}
          </h3>
          <p>Data dan riwayat tetap tersimpan. Draf tidak ikut disimpan.</p>
          <ErrorMessage error={error} />
          <div className="actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onPrompt(false)}
              disabled={pending}
            >
              {active ? 'Batal hapus' : 'Batal aktivasi'}
            </Button>
            <Button
              type="button"
              variant={active ? 'danger' : 'primary'}
              onClick={() => onConfirm(!active)}
              disabled={pending}
            >
              <Icon size={18} />
              {pending
                ? 'Menyimpan status…'
                : active
                  ? 'Ya, hapus dari pilihan'
                  : 'Ya, aktifkan kembali'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
