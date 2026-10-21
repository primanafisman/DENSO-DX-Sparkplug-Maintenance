import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Instrument, MaintenanceDefinition } from '../../../shared/lib/contracts';
import { equipmentSchema } from '../model/schemas';
import type { EquipmentForm } from '../model/schemas';
import { Button, Field, ErrorMessage, Badge } from '../../../shared/components/ui';
import { useCalibrationHistory } from '../controller/useEquipment';
export function EquipmentEditor({
  equipment,
  definitions,
  onSave,
  onClose,
  saving,
  error,
}: {
  equipment?: Instrument;
  definitions: MaintenanceDefinition[];
  onSave: (v: EquipmentForm) => void;
  onClose: () => void;
  saving: boolean;
  error: unknown;
}) {
  const p = equipment?.profile;
  const form = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: equipment?.name ?? '',
      code: equipment?.code ?? '',
      aliases: equipment?.aliases?.join(', ') ?? '',
      area: equipment?.area ?? '',
      instrument_type: equipment?.instrument_type ?? 'other',
      active: equipment?.active ?? true,
      measurement_mode: equipment?.measurement_mode ?? 'numeric',
      condition: equipment?.condition ?? 'unknown',
      condition_reason: '',
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
    condition = form.watch('condition'),
    calibrations = useCalibrationHistory(equipment?.id);
  const allowed = definitions.filter((d) =>
    mode === 'visual' ? d.input_method === 'ok_ng' : d.input_method !== 'ok_ng',
  );
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
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>
        <form
          onSubmit={form.handleSubmit((v) => {
            if (
              equipment &&
              v.condition !== (equipment.condition ?? 'unknown') &&
              !v.condition_reason.trim()
            ) {
              form.setError('condition_reason', { message: 'Isi alasan perubahan kondisi.' });
              return;
            }
            onSave({
              ...v,
              check_ids: v.check_ids.filter((id) => allowed.some((d) => d.id === id)),
            });
          })}
        >
          <h3 className="section-title">Identitas alat</h3>
          <div className="field-row">
            <Field label="Nama alat">
              <input {...form.register('name')} required />
            </Field>
            <Field label="Nomor / kode alat">
              <input {...form.register('code')} />
            </Field>
            <Field label="Alias pada label">
              <input {...form.register('aliases')} placeholder="Pisahkan dengan koma" />
            </Field>
            <Field label="Line / area">
              <input {...form.register('area')} />
            </Field>
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
            <Field label="Alasan perubahan kondisi">
              <input
                {...form.register('condition_reason')}
                required={!!equipment && condition !== (equipment.condition ?? 'unknown')}
              />
              {form.formState.errors.condition_reason && (
                <small>{form.formState.errors.condition_reason.message}</small>
              )}
            </Field>
          </div>
          <label className="check-label">
            <input type="checkbox" {...form.register('active')} />
            Dapat dipilih operator
          </label>
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
          <div className="linked-checks">
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
                Kalibrasi terdahulu dipertahankan. API kalibrasi tersedia bagi integrator; perubahan
                profil memerlukan verifikasi ulang.
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
          <div className="actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan peralatan'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
