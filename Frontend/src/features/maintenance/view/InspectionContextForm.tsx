import type { MaintenanceSettings, ServerSchedule } from '../../../shared/lib/contracts';
import { Field, Badge } from '../../../shared/components/ui';
export type ContextSelection = { line: string; sampler: string; product_type_id?: string };
export function InspectionContextForm({
  settings,
  schedule,
  value,
  onChange,
}: {
  settings: MaintenanceSettings;
  schedule?: ServerSchedule;
  value: ContextSelection;
  onChange: (v: ContextSelection) => void;
}) {
  return (
    <div className="inspection-context">
      <div className="context-grid">
        <Field label="Line">
          <select
            disabled={!settings.lines.length}
            value={value.line}
            onChange={(e) => onChange({ ...value, line: e.target.value })}
          >
            <option value="">Pilih line</option>
            {settings.lines.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Sampler">
          <select
            disabled={!settings.allowed_samplers.length}
            value={value.sampler}
            onChange={(e) => onChange({ ...value, sampler: e.target.value })}
          >
            <option value="">Pilih sampler</option>
            {settings.allowed_samplers.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Type produk">
          <select
            value={value.product_type_id ?? ''}
            onChange={(e) => onChange({ ...value, product_type_id: e.target.value })}
          >
            <option value="">Pilih Type</option>
            {settings.product_types
              ?.filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <div className="context-time">
        <Badge>{schedule?.slot_label ?? 'Memeriksa waktu server…'}</Badge>
        <time>{schedule?.production_date ?? '—'}</time>
      </div>
    </div>
  );
}
