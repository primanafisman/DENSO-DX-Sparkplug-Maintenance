import { useEffect, useId, useRef } from 'react';
import { ScanLine } from 'lucide-react';
import { Loading } from '../../../shared/components/ui';
import { analysisStages } from '../model/analysisStage';

export function AnalysisProgressDialog({
  stage,
  onCancel,
}: {
  stage: keyof typeof analysisStages;
  onCancel: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null),
    previous = useRef<HTMLElement | null>(null),
    title = useId();
  useEffect(() => {
    previous.current ??= document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancel.current?.focus();
    const keepFocus = (event: FocusEvent) => {
      if (event.target !== cancel.current) cancel.current?.focus();
    };
    document.addEventListener('focusin', keepFocus);
    return () => {
      document.removeEventListener('focusin', keepFocus);
      document.body.style.overflow = overflow;
      if (previous.current?.isConnected) previous.current.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop analysis-backdrop"
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          event.preventDefault();
          cancel.current?.focus();
        }
      }}
    >
      <section
        className="modal analysis-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title}
      >
        <span className="analysis-symbol" aria-hidden="true">
          <ScanLine size={30} />
        </span>
        <h2 id={title}>Analisis foto</h2>
        <Loading label={analysisStages[stage]} />
        <button ref={cancel} className="button button-secondary" onClick={onCancel}>
          Batalkan analisis
        </button>
      </section>
    </div>
  );
}
