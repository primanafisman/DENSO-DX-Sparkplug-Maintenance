import { read, write, update } from '../../../shared/lib/api';
import type { Instrument, Page, Calibration } from '../../../shared/lib/contracts';
import type { EquipmentForm } from './schemas';
import { instrumentPageSchema } from './schemas';
export type EquipmentFilters = {
  q?: string;
  condition?: string;
  measurement_mode?: string;
  active?: string;
};
export function equipmentBody(v: EquipmentForm) {
  return {
    name: v.name,
    code: v.code,
    aliases:
      v.aliases.trim() === v.name.trim()
        ? [v.name.trim()]
        : v.aliases
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
    area: v.area,
    instrument_type: v.instrument_type,
    active: v.active,
    condition: v.condition,
    condition_reason: v.condition_reason || 'Perubahan kondisi melalui pengaturan peralatan.',
    measurement_mode: v.measurement_mode,
    acceptance_limits:
      v.measurement_mode === 'numeric' && v.use_acceptance_limits
        ? { minimum: v.acceptance_minimum, maximum: v.acceptance_maximum }
        : null,
    maintenance_check_ids: v.check_ids,
    profile:
      v.measurement_mode === 'visual'
        ? null
        : {
            kind: v.kind,
            unit: v.unit,
            minimum: v.minimum,
            maximum: v.maximum,
            decimals: v.decimals,
            tolerance: v.tolerance,
          },
  };
}
export const equipmentApi = {
  setStatus: ({ id, active }: { id: string; active: boolean }) =>
    update<Instrument>('/instruments/' + encodeURIComponent(id) + '/status', { active }),
  async list(filters: EquipmentFilters, cursor?: string, signal?: AbortSignal) {
    const data = await read<Page<Instrument>>('/instruments', {
      params: { ...filters, limit: 100, cursor },
      signal,
    });
    instrumentPageSchema.parse(data);
    return data;
  },
  save: ({ id, values }: { id?: string; values: EquipmentForm }) =>
    id
      ? update<Instrument>('/instruments/' + encodeURIComponent(id), equipmentBody(values))
      : write<Instrument>('/instruments', equipmentBody(values)),
  calibrations: (id: string) =>
    read<Page<Calibration>>('/instruments/' + encodeURIComponent(id) + '/calibrations'),
};
