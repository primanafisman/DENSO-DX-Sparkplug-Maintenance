import type { useReportFilters } from '../../controller/useReportFilters';
import { Field } from '../ui';
import { monthLabel } from '../../lib/format';
import { useState } from 'react';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
export function ReportFilters({ filters: f }: { filters: ReturnType<typeof useReportFilters> }) {
  const [custom, setCustom] = useState<{ month: string; year: string } | null>(null);
  const validCustom =
    custom &&
    /^\d{1,4}$/.test(custom.year) &&
    Number(custom.year) >= 1 &&
    Number(custom.year) <= 9999;
  return (
    <div className="filter-bar">
      <Field label="Bulan">
        <select
          value={f.month}
          onChange={(e) =>
            e.target.value === 'custom'
              ? setCustom({ month: f.month.slice(5, 7) || '01', year: f.month.slice(0, 4) })
              : f.change('month', e.target.value)
          }
        >
          {!f.month && <option value="">Memuat…</option>}
          {f.month && !f.months.some((m) => m.value === f.month) && (
            <option value={f.month}>{monthLabel(f.month)}</option>
          )}
          {f.months.map((m) => (
            <option value={m.value} key={m.value}>
              {m.label}
            </option>
          ))}
          <option value="custom">Pilih bulan lain…</option>
        </select>
      </Field>
      <Field label="Line">
        <select value={f.line} onChange={(e) => f.change('line', e.target.value)}>
          <option value="">Semua line</option>
          {f.lines.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Shift">
        <select value={f.shift ?? ''} onChange={(e) => f.change('shift', e.target.value)}>
          <option value="">Semua shift</option>
          <option value="day">Shift 1</option>
          <option value="night">Shift 2</option>
        </select>
      </Field>
      {custom && (
        <ConfirmationDialog
          title="Pilih bulan"
          confirmLabel="Terapkan"
          confirmDisabled={!validCustom}
          onCancel={() => setCustom(null)}
          onConfirm={() => {
            if (!validCustom) return;
            f.change('month', custom.year.padStart(4, '0') + '-' + custom.month);
            setCustom(null);
          }}
        >
          <div className="field-row month-picker-fields">
            <Field label="Nama bulan">
              <select
                value={custom.month}
                onChange={(event) => setCustom({ ...custom, month: event.target.value })}
              >
                {monthNames.map((label, i) => (
                  <option value={String(i + 1).padStart(2, '0')} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tahun">
              <input
                type="number"
                min="1"
                max="9999"
                step="1"
                value={custom.year}
                onChange={(event) => setCustom({ ...custom, year: event.target.value })}
              />
            </Field>
          </div>
        </ConfirmationDialog>
      )}
    </div>
  );
}
