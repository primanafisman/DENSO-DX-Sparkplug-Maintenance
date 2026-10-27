import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { MaintenanceDefinition, Profile } from '../../../shared/lib/contracts';
import type { DefinitionUpdate } from '../model/types';
import { definitionFormSchema } from '../model/schemas';
import type { DefinitionForm } from '../model/schemas';
import { useDefinitionEquipment } from '../controller/useSettings';
import { Button, Field, ErrorMessage } from '../../../shared/components/ui';
import { AvailabilityAction } from '../../../shared/components/ui/AvailabilityAction';
import { shiftSlots } from '../model/shiftSchedule';
import { inspectionLabel, inspectionNumber } from '../../../shared/lib/inspectionIdentity';
const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
export function DefinitionEditor({
  definition: d,
  onClose,
  onSave,
  saving,
  error,
  creating = false,
  manageEquipment = false,
  onSetActive,
  statusPending = false,
  statusError,
  slots = shiftSlots(),
}: {
  definition: MaintenanceDefinition;
  onClose: () => void;
  onSave: (body: DefinitionUpdate) => void;
  saving: boolean;
  error: unknown;
  creating?: boolean;
  manageEquipment?: boolean;
  onSetActive?: (active: boolean) => void;
  statusPending?: boolean;
  statusError?: unknown;
  slots?: string[][];
}) {
  const form = useForm<DefinitionForm>({
    resolver: zodResolver(definitionFormSchema),
    defaultValues: {
      check_number: inspectionNumber(d) ?? 1,
      name: d.name,
      standard_text: d.standard_text,
      method_text: d.method_text,
      tool: d.tool,
      kind: d.kind,
      inspection_target: d.inspection_target ?? undefined,
      unit: (d.unit ?? 'mm') as Profile['unit'],
      minimum: d.limits?.minimum ?? 0,
      maximum: d.limits?.maximum ?? 1,
      sample_count: d.sample_count,
      interval: d.intervals[0],
      description: d.interval_guide.description,
    },
  });
  const kind = form.watch('kind'),
    interval = form.watch('interval'),
    numeric = kind === 'numeric' || kind === 'difference';
  const [slotIds, setSlots] = useState(d.occurrence_rule?.slot_ids ?? []),
    [weekdays, setDays] = useState(d.occurrence_rule?.weekdays ?? []),
    [shifts, setShifts] = useState(d.shifts),
    [statusPrompt, setStatusPrompt] = useState(false);
  const equipment = useDefinitionEquipment(manageEquipment);
  const [equipmentIds, setEquipmentIds] = useState<string[] | null>(creating ? [] : null);
  const submit = (v: DefinitionForm) => {
    if (statusPrompt || statusPending) return;
    if (!shifts.length) {
      form.setError('root', { message: 'Pilih minimal satu shift.' });
      return;
    }
    if (slotIds.some((id) => !shifts.includes(id.startsWith('day-') ? 'day' : 'night'))) {
      form.setError('root', {
        message: 'Slot waktu harus sesuai dengan shift yang dipilih.',
      });
      return;
    }
    if (v.interval === 'weekly' && slotIds.length && !weekdays.length) {
      form.setError('root', { message: 'Pilih hari pemeriksaan mingguan.' });
      return;
    }
    onSave({
      check_number: v.check_number,
      ...(equipmentIds !== null ? { instrument_ids: equipmentIds } : {}),
      name: v.name,
      standard_text: v.standard_text,
      method_text: v.method_text,
      tool: v.tool,
      kind: v.kind,
      inspection_target: v.inspection_target,
      input_method: v.kind === 'difference' ? 'photo_difference' : numeric ? 'photo' : 'ok_ng',
      unit: numeric ? v.unit : null,
      limits: numeric ? { minimum: v.minimum, maximum: v.maximum } : null,
      intervals: [v.interval],
      triggers: d.triggers,
      shifts,
      samples: Array.from(
        { length: v.sample_count },
        (_, i) => d.samples[i] ?? { id: 'n' + (i + 1), label: 'Sampel ' + (i + 1) },
      ),
      interval_guide: { ...d.interval_guide, interval: v.interval, description: v.description },
      occurrence_rule: slotIds.length
        ? { slot_ids: slotIds, ...(weekdays.length ? { weekdays } : {}) }
        : null,
      review_reason: creating
        ? 'Pembuatan pemeriksaan melalui Pengaturan.'
        : 'Pembaruan standar dan metode melalui Pengaturan.',
    });
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="definition-title"
      >
        <div className="section-heading modal-heading">
          <h2 id="definition-title">
            {creating ? 'Tambah pemeriksaan' : 'Standar · ' + inspectionLabel(d)}
          </h2>
          <div className="header-actions">
            <Button variant="ghost" onClick={onClose} disabled={statusPending}>
              Tutup
            </Button>
          </div>
        </div>
        <form onSubmit={form.handleSubmit(submit)}>
          <fieldset className="editor-fields" disabled={statusPrompt || statusPending}>
            <div className="field-row">
              <Field label="Nomor pemeriksaan">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  required
                  {...form.register('check_number', { valueAsNumber: true })}
                />
              </Field>
              <Field label="Nama pemeriksaan">
                <input {...form.register('name')} required />
              </Field>
              <Field label="Jenis pemeriksaan">
                <select {...form.register('kind')}>
                  <option value="visual">Visual OK / NG</option>
                  <option value="functional">Fungsi OK / NG</option>
                  <option value="numeric">Angka dari foto</option>
                  <option value="difference">Selisih before / after</option>
                </select>
              </Field>
              <Field label="Sasaran pemeriksaan">
                <select
                  {...form.register('inspection_target')}
                  required
                  defaultValue={d.inspection_target ?? ''}
                >
                  <option value="" disabled>
                    Pilih sasaran pemeriksaan
                  </option>
                  <option value="machine">Mesin / line</option>
                  <option value="product">Sampling produk sparkplug</option>
                </select>
              </Field>
            </div>
            <Field label="Persyaratan / standar">
              <textarea {...form.register('standard_text')} required />
            </Field>
            <Field label="Metode pemeriksaan">
              <textarea {...form.register('method_text')} required />
            </Field>
            <Field label="Alat yang digunakan">
              <input {...form.register('tool')} required />
            </Field>
            {numeric && (
              <div className="field-row">
                <Field label="Batas minimum proses">
                  <input
                    type="number"
                    step="any"
                    {...form.register('minimum', { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Batas maksimum proses">
                  <input
                    type="number"
                    step="any"
                    {...form.register('maximum', { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Satuan hasil">
                  <select {...form.register('unit')}>
                    {['MPa', 'mm', 'kN', 'N', 'bar'].map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
            <div className="field-row">
              <Field label="Jumlah sampel">
                <input
                  type="number"
                  min="1"
                  max="20"
                  {...form.register('sample_count', { valueAsNumber: true })}
                />
              </Field>
              <Field label="Frekuensi">
                <select {...form.register('interval')}>
                  <option value="per_shift">Per shift</option>
                  <option value="every_4_hours">Setiap 4 jam</option>
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                </select>
              </Field>
            </div>
            <Field label="Panduan interval">
              <input {...form.register('description')} required />
            </Field>
            <div className="row wrap">
              {(['day', 'night'] as const).map((s) => (
                <label key={s} className="check-label">
                  <input
                    type="checkbox"
                    checked={shifts.includes(s)}
                    onChange={(e) =>
                      setShifts(e.target.checked ? [...shifts, s] : shifts.filter((x) => x !== s))
                    }
                  />
                  {s === 'day' ? 'Shift 1' : 'Shift 2'}
                </label>
              ))}
            </div>
            <details className="info-note">
              <summary>Waktu pemeriksaan dan sumber</summary>
              <p>
                Waktu pada lembar dipertahankan:{' '}
                {d.interval_guide.day.times.map((t) => t.time).join(', ') || 'belum ditetapkan'}{' '}
                (siang);{' '}
                {d.interval_guide.night.times.map((t) => t.time).join(', ') || 'belum ditetapkan'}{' '}
                (malam).
              </p>
              <p>Pilih slot hanya setelah aturan pemeriksaan ditinjau.</p>
              <div className="row wrap">
                {slots.map(([id, label]) => (
                  <label className="check-label" key={id}>
                    <input
                      type="checkbox"
                      checked={slotIds.includes(id)}
                      onChange={(e) =>
                        setSlots(
                          e.target.checked ? [...slotIds, id] : slotIds.filter((x) => x !== id),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              {interval === 'weekly' && (
                <div className="row wrap">
                  {days.map((name, i) => (
                    <label className="check-label" key={name}>
                      <input
                        type="checkbox"
                        checked={weekdays.includes(i + 1)}
                        onChange={(e) =>
                          setDays(
                            e.target.checked
                              ? [...weekdays, i + 1]
                              : weekdays.filter((x) => x !== i + 1),
                          )
                        }
                      />
                      {name}
                    </label>
                  ))}
                </div>
              )}
              <p>{d.interval_guide.note}</p>
            </details>
            {d.review_notes.map((note) => (
              <p className="source-note" key={note}>
                {note}
              </p>
            ))}
            {manageEquipment && (
              <fieldset>
                <legend>Alat terhubung</legend>
                <ErrorMessage error={equipment.error} />
                {equipment.isPending && <p>Memuat daftar alat…</p>}
                {equipment.data
                  ?.filter(
                    (a) =>
                      a.active &&
                      (!numeric ||
                        (a.measurement_mode !== 'visual' &&
                          a.profile?.unit === form.watch('unit'))),
                  )
                  .map((a) => (
                    <label className="check-label" key={a.id}>
                      <input
                        type="checkbox"
                        checked={(
                          equipmentIds ??
                          equipment.data
                            ?.filter((x) => x.maintenance_check_ids.includes(d.id))
                            .map((x) => x.id) ??
                          []
                        ).includes(a.id)}
                        onChange={(e) => {
                          const current =
                            equipmentIds ??
                            equipment.data
                              ?.filter((x) => x.maintenance_check_ids.includes(d.id))
                              .map((x) => x.id) ??
                            [];
                          setEquipmentIds(
                            e.target.checked
                              ? [...current, a.id]
                              : current.filter((id) => id !== a.id),
                          );
                        }}
                      />
                      {a.name}
                    </label>
                  ))}
              </fieldset>
            )}
            {Object.values(form.formState.errors).map((e, i) => (
              <p className="source-note" key={i}>
                {e.message}
              </p>
            ))}
            <ErrorMessage error={error} />
          </fieldset>
          <div className="actions">
            {!creating && onSetActive && (
              <AvailabilityAction
                name={inspectionLabel(d)}
                active={d.active !== false}
                confirming={statusPrompt}
                onPrompt={setStatusPrompt}
                onConfirm={onSetActive}
                pending={statusPending || saving}
                error={statusError}
              />
            )}
            <Button variant="secondary" type="button" onClick={onClose} disabled={statusPending}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || statusPrompt || statusPending}>
              {saving ? 'Menyimpan…' : creating ? 'Tambah pemeriksaan' : 'Simpan pemeriksaan'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
