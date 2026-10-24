import type { Instrument, MaintenanceDefinition } from '../../../shared/lib/contracts';
export type EquipmentSortKey = 'name' | 'input' | 'condition' | 'active' | 'frequency';
export type EquipmentSort = { key: EquipmentSortKey; direction: 'asc' | 'desc' };
export function equipmentFrequency(a: Instrument, definitions: MaintenanceDefinition[]) {
  return (
    [
      ...new Set(
        definitions
          .filter((d) => a.maintenance_check_ids.includes(d.id))
          .map((d) => d.interval_guide.description),
      ),
    ].join(' · ') || 'Belum dihubungkan'
  );
}
export function sortEquipment(
  items: Instrument[],
  sort: EquipmentSort,
  definitions: MaintenanceDefinition[],
) {
  const collator = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });
  const value = (a: Instrument) => {
    switch (sort.key) {
      case 'name':
        return a.name;
      case 'input':
        return a.measurement_mode === 'visual' ? 'OK / NG' : (a.profile?.unit ?? 'Angka foto');
      case 'condition':
        return a.condition === 'working'
          ? 'Berfungsi'
          : a.condition === 'not_working'
            ? 'Tidak berfungsi'
            : 'Kondisi belum tercatat';
      case 'active':
        return a.active ? 'Aktif' : 'Nonaktif';
      case 'frequency':
        return equipmentFrequency(a, definitions);
    }
  };
  return [...items].sort(
    (a, b) =>
      (sort.direction === 'asc' ? 1 : -1) *
        (collator.compare(value(a), value(b)) || collator.compare(a.name, b.name)) ||
      a.id.localeCompare(b.id),
  );
}
