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
    aliases: v.aliases
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    area: v.area,
    instrument_type: v.instrument_type,
    active: v.active,
    condition: v.condition,
    condition_reason: v.condition_reason,
    measurement_mode: v.measurement_mode,
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
  async list(filters: EquipmentFilters, cursor?: string) {
    const data = await read<Page<Instrument>>('/instruments', {
      params: { ...filters, limit: 50, cursor },
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
