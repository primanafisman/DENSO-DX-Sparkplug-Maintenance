import { useRef, useState } from 'react';
import { Plus, Pencil, Clock3, Trash2 } from 'lucide-react';
import type { MaintenanceSettings, ProductType } from '../../../shared/lib/contracts';
import { Card, Field, Badge, Button } from '../../../shared/components/ui';
import { ConfirmationDialog } from '../../../shared/components/ui/ConfirmationDialog';
import { newId } from '../../../shared/lib/id';
import { DEFAULT_SHIFT_SCHEDULE, validateShiftSchedule } from '../model/shiftSchedule';
import type { ShiftSchedule } from '../model/shiftSchedule';
import '../../../styles/settings-management.css';

type Category = 'line' | 'sampler' | 'product';
type Choice = { id: string; name: string; active: boolean };
type ChoiceDraft = Choice & { category: Category; creating: boolean };
const labels = { line: 'line', sampler: 'sampler', product: 'tipe' };
const limits = { line: 200, sampler: 100, product: 200 };
const compareNames = (a: string, b: string) =>
  a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
const normalized = (name: string) => name.trim().toLocaleLowerCase('id-ID');

function choices(settings: MaintenanceSettings, category: Category): Choice[] {
  if (category === 'product') return settings.product_types ?? [];
  const active = category === 'line' ? settings.lines : settings.allowed_samplers;
  const inactive =
    category === 'line' ? (settings.inactive_lines ?? []) : (settings.inactive_samplers ?? []);
  return [
    ...active.map((name) => ({ id: name, name, active: true })),
    ...inactive.map((name) => ({ id: name, name, active: false })),
  ];
}

export function GeneralSettings({
  initial,
  admin,
  onSave,
  pending,
}: {
  initial: MaintenanceSettings;
  admin: boolean;
  onSave: (body: MaintenanceSettings & { review_reason: string }) => Promise<unknown>;
  pending: boolean;
}) {
  const [committed, setCommitted] = useState({ base: initial, value: initial }),
    [editor, setEditor] = useState<ChoiceDraft | null>(null),
    [removePrompt, setRemovePrompt] = useState(false),
    [saving, setSaving] = useState(false),
    [operationError, setOperationError] = useState<unknown>(null),
    [shiftSchedule, setShiftSchedule] = useState<ShiftSchedule>(() =>
      structuredClone(initial.shift_schedule ?? DEFAULT_SHIFT_SCHEDULE),
    ),
    [scheduleError, setScheduleError] = useState<string | null>(null),
    [schedulePrompt, setSchedulePrompt] = useState<ShiftSchedule | null>(null);
  const settings = committed.base === initial ? committed.value : initial;
  const busy = pending || saving;
  const productCodeFollowsName = useRef(
    new Map(
      (initial.product_types ?? []).map((product) => [
        product.id,
        !product.code || product.code === product.name,
      ]),
    ),
  );
  const openEditor = (category: Category, choice?: Choice) => {
    setOperationError(null);
    setRemovePrompt(false);
    if (category === 'product' && choice && !productCodeFollowsName.current.has(choice.id)) {
      const product = settings.product_types?.find((item) => item.id === choice.id);
      if (product)
        productCodeFollowsName.current.set(
          product.id,
          !product.code || product.code === product.name,
        );
    }
    setEditor({
      category,
      creating: !choice,
      id: choice?.id ?? 'product-' + newId(),
      name: choice?.name ?? '',
      active: choice?.active ?? true,
    });
  };
  const maxNameLength =
    editor?.category === 'product' &&
    !editor.creating &&
    productCodeFollowsName.current.get(editor.id) === false
      ? 100
      : 64;
  const editorItems = editor ? choices(settings, editor.category) : [];
  const editorIssue = !editor
    ? null
    : editor.creating && editorItems.length >= limits[editor.category]
      ? `Batas ${limits[editor.category]} ${labels[editor.category]} tercapai, termasuk yang nonaktif.`
      : editor.name.trim().length > maxNameLength
        ? `Nama maksimal ${maxNameLength} karakter.`
        : editorItems.some(
              (item) =>
                (editor.creating || item.id !== editor.id) &&
                normalized(item.name) === normalized(editor.name),
            )
          ? 'Nama sudah digunakan, termasuk pada pilihan nonaktif.'
          : null;
  const persist = async (next: MaintenanceSettings, reason: string) => {
    if (!admin || busy) return false;
    setSaving(true);
    setOperationError(null);
    try {
      const result = await onSave({ ...next, review_reason: reason });
      const response = result as { value?: MaintenanceSettings } | null | undefined;
      const value = response?.value;
      setCommitted({
        base: initial,
        value:
          value && Array.isArray(value.lines) && Array.isArray(value.allowed_samplers)
            ? value
            : next,
      });
      return true;
    } catch (error) {
      setOperationError(error);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const changedSettings = (draft: ChoiceDraft, remove = false): MaintenanceSettings => {
    const name = draft.name.trim();
    if (draft.category === 'product') {
      const products = settings.product_types ?? [];
      if (remove)
        return {
          ...settings,
          product_types: products.filter((product) => product.id !== draft.id),
        };
      const previous = products.find((product) => product.id === draft.id);
      const follows = draft.creating || productCodeFollowsName.current.get(draft.id) !== false;
      const product: ProductType = {
        ...(previous ?? { id: draft.id, version: 1 }),
        name,
        code: follows ? name : previous!.code,
        active: draft.active,
      };
      return {
        ...settings,
        product_types: previous
          ? products.map((item) => (item.id === draft.id ? product : item))
          : [...products, product],
      };
    }
    const items = choices(settings, draft.category).filter((item) => item.id !== draft.id);
    if (!remove) items.push({ id: name, name, active: draft.active });
    const active = items
      .filter((item) => item.active)
      .map((item) => item.name)
      .sort(compareNames);
    const inactive = items
      .filter((item) => !item.active)
      .map((item) => item.name)
      .sort(compareNames);
    return draft.category === 'line'
      ? { ...settings, lines: active, inactive_lines: inactive }
      : { ...settings, allowed_samplers: active, inactive_samplers: inactive };
  };
  const saveChoice = async () => {
    if (!editor || !editor.name.trim() || editorIssue) return;
    if (await persist(changedSettings(editor), 'Pembaruan pilihan operasional.')) {
      if (editor.category === 'product' && editor.creating)
        productCodeFollowsName.current.set(editor.id, true);
      setEditor(null);
    }
  };
  const originalName = editorItems.find((item) => item.id === editor?.id)?.name ?? '';
  const editorLabel = editor ? labels[editor.category] + ' ' + originalName : '';
  return (
    <Card className="settings-management">
      <div className="section-heading settings-management-heading">
        <h2>Line produksi</h2>
        {admin && (
          <Button variant="secondary" disabled={busy} onClick={() => openEditor('line')}>
            <Plus size={17} aria-hidden="true" /> Tambah line
          </Button>
        )}
      </div>
      <div className="settings-management-lists">
        {(['line', 'sampler', 'product'] as const).map((category) => {
          const items = choices(settings, category)
            .slice()
            .sort((a, b) => compareNames(a.name, b.name));
          const title =
            category === 'line'
              ? 'Line produksi'
              : category === 'sampler'
                ? 'Sampler'
                : 'Tipe produk';
          return (
            <section className="settings-choice-list" aria-label={title} key={category}>
              <div className="section-heading">
                <h3>{title}</h3>
                <Badge>
                  {items.length} {category === 'sampler' ? 'orang' : labels[category]}
                </Badge>
              </div>
              {items.length ? (
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <span className="settings-choice-name">
                        {category === 'line' ? 'Line ' + item.name : item.name}
                      </span>
                      {!item.active && (
                        <span className="badge badge-neutral settings-choice-inactive">
                          Nonaktif
                        </span>
                      )}
                      {admin && (
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={'Edit ' + labels[category] + ' ' + item.name}
                          onClick={() => openEditor(category, item)}
                          disabled={busy}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Belum ada {labels[category]}.</p>
              )}
            </section>
          );
        })}
      </div>
      <details className="settings-details settings-schedule-details">
        <summary>Detail jadwal shift</summary>
        <div className="shift-time-grid">
          {(['day', 'night'] as const).map((shift, i) => (
            <fieldset key={shift} disabled={!admin || busy}>
              <legend>
                <Clock3 size={17} /> Shift {i + 1}
              </legend>
              {shiftSchedule[shift].map((time, index) => (
                <Field key={index} label={'Sesi ' + (index + 1)}>
                  <input
                    aria-label={`Shift ${i + 1} · Sesi ${index + 1}`}
                    type="time"
                    value={time}
                    required
                    onChange={(event) => {
                      const next = structuredClone(shiftSchedule);
                      next[shift][index] = event.target.value;
                      setShiftSchedule(next);
                      setScheduleError(null);
                    }}
                  />
                </Field>
              ))}
            </fieldset>
          ))}
        </div>
        <small className="muted">WIB · Jadwal maintenance mengikuti waktu mulai sesi.</small>
        {scheduleError && (
          <p role="alert" className="source-note">
            {scheduleError}
          </p>
        )}
        {admin && (
          <div className="actions settings-schedule-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                const invalid = validateShiftSchedule(shiftSchedule);
                setScheduleError(invalid);
                if (invalid) return;
                setOperationError(null);
                setSchedulePrompt(structuredClone(shiftSchedule));
              }}
            >
              Simpan jadwal
            </Button>
          </div>
        )}
      </details>
      {editor && !removePrompt && (
        <ConfirmationDialog
          title={editor.creating ? 'Tambah pengaturan' : 'Edit ' + editorLabel}
          confirmLabel="Simpan"
          pending={busy}
          error={operationError}
          confirmDisabled={!editor.name.trim() || !!editorIssue}
          footerLeading={
            !editor.creating && (
              <button
                type="button"
                className="icon-button settings-delete-choice"
                aria-label={'Hapus ' + editorLabel}
                disabled={busy}
                onClick={() => {
                  setOperationError(null);
                  setRemovePrompt(true);
                }}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            )
          }
          onCancel={() => setEditor(null)}
          onConfirm={() => void saveChoice()}
        >
          <fieldset className="settings-editor-fields" disabled={busy}>
            {editor.creating && (
              <Field label="Kategori">
                <select
                  value={editor.category}
                  onChange={(event) =>
                    setEditor({ ...editor, category: event.target.value as Category })
                  }
                >
                  <option value="line">Line</option>
                  <option value="sampler">Sampler</option>
                  <option value="product">Tipe produk</option>
                </select>
              </Field>
            )}
            <Field label="Nama">
              <input
                value={editor.name}
                maxLength={maxNameLength}
                required
                onChange={(event) => setEditor({ ...editor, name: event.target.value })}
              />
            </Field>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editor.active}
                onChange={(event) => setEditor({ ...editor, active: event.target.checked })}
              />
              Aktif
            </label>
            {editorIssue && (
              <p role="alert" className="source-note">
                {editorIssue}
              </p>
            )}
          </fieldset>
        </ConfirmationDialog>
      )}
      {editor && removePrompt && (
        <ConfirmationDialog
          title={'Hapus ' + editorLabel + '?'}
          description="Pilihan dihapus dari pengaturan. Riwayat yang sudah tersimpan tetap ada."
          confirmLabel="Ya, hapus"
          danger
          pending={busy}
          error={operationError}
          onCancel={() => {
            setOperationError(null);
            setRemovePrompt(false);
          }}
          onConfirm={() => {
            void persist(changedSettings(editor, true), 'Penghapusan pilihan operasional.').then(
              (saved) => {
                if (saved) {
                  setRemovePrompt(false);
                  setEditor(null);
                }
              },
            );
          }}
        />
      )}
      {schedulePrompt && (
        <ConfirmationDialog
          title="Simpan jadwal shift?"
          description="Perubahan jadwal berlaku untuk pemeriksaan berikutnya."
          pending={busy}
          error={operationError}
          onCancel={() => setSchedulePrompt(null)}
          onConfirm={() => {
            void persist(
              { ...settings, shift_schedule: schedulePrompt },
              'Pembaruan jadwal shift.',
            ).then((saved) => {
              if (saved) setSchedulePrompt(null);
            });
          }}
        />
      )}
    </Card>
  );
}
