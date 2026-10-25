import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { Button, ErrorMessage } from './index';

export function ConfirmationDialog({
  title,
  description,
  confirmLabel = 'Ya, simpan',
  cancelLabel = 'Batal',
  danger = false,
  pending = false,
  error,
  children,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  error?: unknown;
  children?: ReactNode;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const backdrop = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    previous = useRef<HTMLElement | null>(null),
    heading = useId();
  useEffect(() => {
    previous.current ??= document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node !== backdrop.current,
    );
    const original = background.map((node) => ({
      node,
      inert: node.inert,
      hidden: node.getAttribute('aria-hidden'),
    }));
    for (const node of background) {
      node.inert = true;
      node.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';
    cancel.current?.focus();
    const trap = (event: FocusEvent) => {
      if (!dialog.current?.contains(event.target as Node)) cancel.current?.focus();
    };
    document.addEventListener('focusin', trap);
    return () => {
      document.removeEventListener('focusin', trap);
      for (const item of original) {
        item.node.inert = item.inert;
        if (item.hidden === null) item.node.removeAttribute('aria-hidden');
        else item.node.setAttribute('aria-hidden', item.hidden);
      }
      document.body.style.overflow = overflow;
      if (previous.current?.isConnected) previous.current.focus();
    };
  }, []);
  return createPortal(
    <div
      ref={backdrop}
      className="modal-backdrop confirmation-backdrop"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (!pending) onCancel();
        }
        if (event.key === 'Tab') {
          const controls = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>('*') ?? [],
          ).filter((node) =>
            node.matches(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]',
            ),
          );
          if (!controls?.length) {
            event.preventDefault();
            return;
          }
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <section
        ref={dialog}
        className="modal confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={heading}
      >
        <span className={'confirmation-symbol ' + (danger ? 'danger' : '')} aria-hidden="true">
          <CircleHelp size={28} />
        </span>
        <h2 id={heading}>{title}</h2>
        {description && <p>{description}</p>}
        {children}
        <ErrorMessage error={error} />
        <div className="actions">
          <button
            ref={cancel}
            type="button"
            className="button button-secondary"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
          >
            {pending ? 'Memproses…' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
