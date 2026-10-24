import { useEffect, useRef } from 'react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { AlertCircle, LoaderCircle, Inbox, X } from 'lucide-react';
import { ApiError } from '../../lib/api';
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'card ' + className}>{children}</section>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'ok' | 'ng' | 'warning' | 'neutral';
}) {
  return <span className={'badge badge-' + tone}>{children}</span>;
}
export function Status({ value }: { value: string }) {
  return (
    <Badge tone={value === 'OK' ? 'ok' : value === 'NG' ? 'ng' : 'warning'}>
      {value === 'OK' ? '✓ OK' : value === 'NG' ? '× NG' : value}
    </Badge>
  );
}
export function Loading({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  title = 'Belum ada data',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="error-message" role="alert">
      <AlertCircle size={20} />
      <div>
        {error instanceof Error ? error.message : 'Permintaan belum berhasil.'}
        {error instanceof ApiError && error.request_id && (
          <details>
            <summary>Detail bantuan</summary>
            <code>
              {error.code} · {error.request_id}
            </code>
          </details>
        )}
      </div>
    </div>
  );
}
export function ErrorDialog({ error, onClose }: { error: unknown; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (error) close.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div
      className="modal-backdrop"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="error-title">
        <div className="row between">
          <h2 id="error-title">Perlu diperiksa</h2>
          <button ref={close} className="icon-button" aria-label="Tutup pesan" onClick={onClose}>
            <X />
          </button>
        </div>
        <ErrorMessage error={error} />
        <Button onClick={onClose}>Mengerti</Button>
      </section>
    </div>
  );
}
