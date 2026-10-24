import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { equipmentApi } from '../model/api';
import type { EquipmentFilters } from '../model/api';
import { sortEquipment } from '../model/equipmentOrder';
import type { EquipmentSort, EquipmentSortKey } from '../model/equipmentOrder';
import type { Instrument, MaintenanceDefinition } from '../../../shared/lib/contracts';
import { toast } from 'sonner';
export function useEquipment(
  filters: EquipmentFilters = {},
  definitions: MaintenanceDefinition[] = [],
) {
  const client = useQueryClient(),
    [sort, setSort] = useState<EquipmentSort>({ key: 'name', direction: 'asc' });
  const query = useQuery({
    queryKey: ['equipment', filters],
    queryFn: async ({ signal }) => {
      const items: Instrument[] = [];
      let cursor: string | undefined;
      do {
        const page = await equipmentApi.list(filters, cursor, signal);
        items.push(...page.items);
        cursor = page.next_cursor ?? undefined;
        if (cursor && items.length >= 10000)
          throw new Error('Daftar alat terlalu besar. Gunakan pencarian untuk membatasi daftar.');
      } while (cursor);
      return items;
    },
  });
  const save = useMutation({
    mutationFn: equipmentApi.save,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['equipment'] });
      client.invalidateQueries({ queryKey: ['catalog'] });
      client.invalidateQueries({ queryKey: ['definition-equipment'] });
      toast.success('Peralatan disimpan');
    },
  });
  const setStatus = useMutation({
    mutationFn: equipmentApi.setStatus,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['equipment'] });
      client.invalidateQueries({ queryKey: ['definition-equipment'] });
      client.invalidateQueries({ queryKey: ['maintenance-due'] });
      toast.success('Status pilihan peralatan disimpan');
    },
  });
  const items = useMemo(
    () => sortEquipment(query.data ?? [], sort, definitions),
    [query.data, sort, definitions],
  );
  const sortBy = (key: EquipmentSortKey) =>
    setSort((old) => ({
      key,
      direction: old.key === key && old.direction === 'asc' ? 'desc' : 'asc',
    }));
  return { ...query, items, save, setStatus, sort, sortBy };
}
export function useCalibrationHistory(id?: string) {
  return useQuery({
    queryKey: ['calibrations', id],
    queryFn: () => equipmentApi.calibrations(id!),
    enabled: !!id,
  });
}
