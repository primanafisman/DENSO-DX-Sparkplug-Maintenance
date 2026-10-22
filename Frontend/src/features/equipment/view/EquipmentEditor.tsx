import { useForm } from 'react-hook-form';
import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Instrument, MaintenanceDefinition } from '../../../shared/lib/contracts';
import { equipmentSchema } from '../model/schemas';
import type { EquipmentForm } from '../model/schemas';
import { Button, Field, ErrorMessage, Badge } from '../../../shared/components/ui';
import { useCalibrationHistory } from '../controller/useEquipment';
import { AvailabilityAction } from '../../../shared/components/ui/AvailabilityAction';
export function EquipmentEditor({
  equipment,
  definitions,
  onSave,
  onClose,
  saving,
  error,
  onSetActive,
  statusPending = false,
  statusError,
}: {
  equipment?: Instrument;
  definitions: MaintenanceDefinition[];
  onSave: (v: EquipmentForm) => void;
  onClose: () => void;
  saving: boolean;
  error: unknown;
  onSetActive?: (active: boolean) => void;
  statusPending?: boolean;
  statusError?: unknown;
}) {
  const p = equipment?.profile;
  const [statusPrompt, setStatusPrompt] = useState(false);
  const form = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: equipment?.name ?? '',
      code: equipment?.code || equipment?.name || '',
      aliases: equipment?.aliases?.length ? equipment.aliases.join(', ') : (equipment?.name ?? ''),
      area: equipment?.area ?? '',
      instrument_type: equipment?.instrument_type ?? 'other',
      active: equipment?.active ?? true,
      measurement_mode: equipment?.measurement_mode ?? 'numeric',
      condition: equipment?.condition ?? 'unknown',
      condition_reason: 'Perubahan kondisi melalui pengaturan peralatan.',
      kind: p?.kind ?? 'auto',
      unit: p?.unit ?? 'MPa',
      minimum: p?.minimum ?? 0,
      maximum: p?.maximum ?? 1,
      decimals: p?.decimals ?? 3,
      tolerance: p?.tolerance ?? 0.01,
      check_ids: equipment?.maintenance_check_ids ?? [],
    },
  });
  const mode = form.watch('measurement_mode'),
    calibrations = useCalibrationHistory(equipment?.id);
  const automatic = useRef({
    code: !equipment?.code || equipment.code === equipment.name,
    aliases:
      !equipment?.aliases?.length ||
      (equipment.aliases.length === 1 && equipment.aliases[0] === equipment.name),
  });
  const nameField = form.register('name');
  const allowed = definitions
    .filter((d) => (mode === 'visual' ? d.input_method === 'ok_ng' : d.input_method !== 'ok_ng'))
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base', numeric: true }));
  return (
    <div className="modal-backdrop">
      <section
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-title"
      >
        <div className="row between">
          <h2 id="equipment-title">{equipment ? 'Edit peralatan' : 'Tambah peralatan'}</h2>
          <Button variant="ghost" onClick={onClose} disabled={statusPending}>
            Tutup
          </Button>
        </div>
        <form
          onSubmit={form.handleSubmit((v) => {
            if (statusPrompt || statusPending) return;
            onSave({
              ...v,
              check_ids: v.check_ids.filter((id) => allowed.some((d) => d.id === id)),
            });
          })}
        >
          <fieldset className="editor-fields" disabled={statusPrompt || statusPending}>
            <h3 className="section-title">Identitas alat</h3>
            <div className="field-row">
              <Field label="Nama alat">
                <input
                  {...nameField}
                  onChange={(e) => {
                    void nameField.onChange(e);
                    if (automatic.current.code)
                      form.setValue('code', e.target.value, { shouldDirty: true });
                    if (automatic.current.aliases)
                      form.setValue('aliases', e.target.value, { shouldDirty: true });
                  }}
                  required
                />
              </Field>
            </div>
            <details className="identity-details">
              <summary>Detail identitas alat</summary>
              <p className="muted">
                Nomor dan alias mengikuti Nama alat. Buka detail untuk memakai identitas berbeda.
                Area kosong berlaku untuk semua line.
              </p>
              <div className="field-row">
                <Field label="Nomor / kode alat">
                  <input
                    {...form.register('code', {
                      onChange: () => {
                        automatic.current.code = false;
                      },
                    })}
                  />
                </Field>
                <Field label="Alias pada label">
                  <input
                    {...form.register('aliases', {
                      onChange: () => {
                        automatic.current.aliases = false;
                      },
                    })}
                    placeholder="Pisahkan dengan koma"
                  />
                </Field>
                <Field label="Line / area">
                  <input {...form.register('area')} />
                </Field>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const name = form.getValues('name');
                  form.setValue('code', name);
                  form.setValue('aliases', name);
                  automatic.current = { code: true, aliases: true };
                }}
              >
                Samakan dengan Nama Alat
              </Button>
            </details>
            <div className="field-row">
              <Field label="Tipe alat">
                <select {...form.register('instrument_type')}>
                  <option value="pressure_gauge">Pressure gauge</option>
                  <option value="caliper">Kaliper</option>
                  <option value="height_gauge">Height gauge</option>
                  <option value="gasket_gauge">Check gasket</option>
                  <option value="dial_indicator">Dial indicator</option>
                  <option value="other">Alat lainnya</option>
                </select>
              </Field>
              <Field label="Metode input alat">
                <select {...form.register('measurement_mode')}>
                  <option value="numeric">Angka dari foto</option>
                  <option value="visual">Visual · OK / NG</option>
                </select>
              </Field>
            </div>
            <hr className="divider" />
            <h3 className="section-title">Kondisi dan penggunaan</h3>
            <div className="field-row">
              <Field label="Kondisi alat">
                <select {...form.register('condition')}>
                  <option value="unknown">Kondisi belum tercatat</option>
                  <option value="working">Berfungsi</option>
                  <option value="not_working">Tidak berfungsi</option>
                </select>
              </Field>
            </div>
            {(!equipment || !onSetActive) && (
              <label className="check-label">
                <input type="checkbox" {...form.register('active')} />
                Dapat dipilih operator
              </label>
            )}
            {mode === 'numeric' && (
              <>
                <hr className="divider" />
                <h3 className="section-title">Parameter fisik alat</h3>
                <p className="info-note">
                  Batas ini mengikuti alat. Batas OK/NG proses diatur pada pemeriksaan.
                </p>
                <div className="field-row">
                  <Field label="Pembacaan">
                    <select {...form.register('kind')}>
                      <option value="auto">Otomatis analog / digital</option>
                      <option value="digital">Digital</option>
                      <option value="analog">Analog 0–1 MPa</option>
                    </select>
                  </Field>
                  <Field label="Satuan">
                    <select {...form.register('unit')}>
                      {['MPa', 'mm', 'kN', 'N', 'bar'].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Rentang fisik minimum">
                    <input
                      type="number"
                      step="any"
                      {...form.register('minimum', { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Rentang fisik maksimum">
                    <input
                      type="number"
                      step="any"
                      {...form.register('maximum', { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Desimal tampilan">
                    <input
                      type="number"
                      min="0"
                      max="6"
                      {...form.register('decimals', { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Toleransi verifikasi">
                    <input
                      type="number"
                      step="any"
                      {...form.register('tolerance', { valueAsNumber: true })}
                    />
                  </Field>
                </div>
              </>
            )}
            <hr className="divider" />
            <h3 className="section-title">Pemeriksaan terhubung</h3>
            <div className="linked-checks" data-testid="linked-checks">
              {allowed.map((d) => (
                <label className="check-label" key={d.id}>
                  <input type="checkbox" value={d.id} {...form.register('check_ids')} />
                  <span>
                    {d.name}
                    <small className="muted">
                      {' '}
                      · {d.interval_guide.description} · n{d.sample_count}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            {equipment && mode === 'numeric' && (
              <details className="info-note">
                <summary>Versi kalibrasi ({calibrations.data?.items.length ?? 0})</summary>
                {calibrations.data?.items.map((c) => (
                  <p key={c.id}>
                    <Badge>Versi {c.version}</Badge> {c.created_at}
                  </p>
                ))}
                <p>
                  Kalibrasi terdahulu dipertahankan. API kalibrasi tersedia bagi integrator;
                  perubahan profil memerlukan verifikasi ulang.
                </p>
              </details>
            )}
            {Object.values(form.formState.errors).some(Boolean) && (
              <p className="source-note">
                Periksa parameter:{' '}
                {Object.values(form.formState.errors)
                  .map((e) => e.message)
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            <ErrorMessage error={error} />
          </fieldset>
          <div className="actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={statusPending}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || statusPrompt || statusPending}>
              {saving ? 'Menyimpan…' : 'Simpan peralatan'}
            </Button>
          </div>
        </form>
        {equipment && onSetActive && (
          <AvailabilityAction
            name={equipment.name}
            active={equipment.active}
            confirming={statusPrompt}
            onPrompt={setStatusPrompt}
            onConfirm={onSetActive}
            pending={statusPending || saving}
            error={statusError}
          />
        )}
      </section>
    </div>
  );
}
