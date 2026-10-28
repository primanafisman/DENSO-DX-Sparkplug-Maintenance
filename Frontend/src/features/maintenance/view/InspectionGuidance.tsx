import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCheck, ShieldCheck } from 'lucide-react';
import type { MaintenanceDefinition } from '../../../shared/lib/contracts';
import { inspectionLabel } from '../../../shared/lib/inspectionIdentity';
import { Card, Button, Badge } from '../../../shared/components/ui';
import { useInspectionGuidance } from '../controller/useInspectionGuidance';
import { InspectionStandardTable } from './InspectionStandardTable';

function BriefingDialog({
  definition,
  required,
  onAccept,
  onClose,
}: {
  definition: MaintenanceDefinition;
  required: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    title = useId(),
    description = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    heading.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop guide-backdrop">
      <section
        ref={dialog}
        className="modal guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title}
        aria-describedby={description}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            if (!required) onClose();
          }
          if (e.key === 'Tab') {
            const items = dialog.current?.querySelectorAll<HTMLElement>(
              'a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]',
            );
            if (!items?.length) return;
            const first = items[0],
              last = items[items.length - 1];
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === heading.current)
            ) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div
          className="guide-dialog-scroll"
          role="region"
          aria-label="Standar dan metode pemeriksaan"
          tabIndex={0}
        >
          <header className="guide-dialog-heading">
            <span className="guide-icon">
              <ShieldCheck size={27} />
            </span>
            <div>
              <span className="guide-eyebrow">SEBELUM MULAI PEMERIKSAAN</span>
              <h2 ref={heading} tabIndex={-1} id={title}>
                Pahami standar sebelum mulai
              </h2>
              <p id={description}>
                Baca batas penerimaan dan metode di bawah, lalu pastikan Anda memahaminya.
              </p>
            </div>
          </header>
          <div className="guide-dialog-body">
            <div className="guide-definition-name">
              <h3>{inspectionLabel(definition)}</h3>
              <Badge>{definition.input_method === 'ok_ng' ? 'OK / NG' : 'Pengukuran foto'}</Badge>
            </div>
            <InspectionStandardTable definition={definition} />
          </div>
        </div>
        <footer className="guide-dialog-footer">
          <p>Gunakan standar ini saat memeriksa. Konfirmasi hasil setelah pengisian selesai.</p>
          <div className="actions">
            <Link className="button button-secondary" to="/pemeriksaan">
              Kembali ke daftar
            </Link>
            <Button onClick={onAccept}>
              <CheckCheck size={19} />
              {required ? 'Saya mengerti, mulai pemeriksaan' : 'Tutup panduan'}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export function InspectionGuidance({ children }: { children: ReactNode }) {
  const guide = useInspectionGuidance(),
    [reviewKey, setReviewKey] = useState<string | null>(null);
  const open =
    !!guide.definition && (!guide.understood || (!!guide.key && reviewKey === guide.key));
  return (
    <>
      <div inert={open} aria-hidden={open ? true : undefined}>
        {guide.definition && (
          <Card className="inspection-guidance">
            <div className="guide-inline-heading">
              <div className="row">
                <span className="guide-icon">
                  <BookOpen size={23} />
                </span>
                <div>
                  <span className="guide-eyebrow">ACUAN PEMERIKSAAN</span>
                  <h2>Standar & metode</h2>
                  <p>{inspectionLabel(guide.definition)}</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setReviewKey(guide.key)}>
                Baca panduan lagi
              </Button>
            </div>
            <InspectionStandardTable definition={guide.definition} />
            {guide.understood && (
              <p className="guide-understood">
                <CheckCheck size={16} />
                Panduan sudah dipahami untuk sesi ini
              </p>
            )}
          </Card>
        )}
      </div>
      <fieldset
        className="guide-inputs"
        aria-label="Pengisian pemeriksaan"
        disabled={open}
        inert={open}
        aria-hidden={open ? true : undefined}
      >
        {children}
      </fieldset>
      {open && guide.definition && (
        <BriefingDialog
          key={guide.key}
          definition={guide.definition}
          required={!guide.understood}
          onClose={() => setReviewKey(null)}
          onAccept={() => {
            guide.acknowledge();
            setReviewKey(null);
          }}
        />
      )}
    </>
  );
}
