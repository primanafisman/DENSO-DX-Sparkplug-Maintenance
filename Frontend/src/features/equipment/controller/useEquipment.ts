import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '../model/api';
import type { EquipmentFilters } from '../model/api';
import { toast } from 'sonner';
export function useEquipment(filters: EquipmentFilters = {}) {
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['equipment', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => equipmentApi.list(filters, pageParam),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const save = useMutation({
    mutationFn: equipmentApi.save,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['equipment'] });
      client.invalidateQueries({ queryKey: ['catalog'] });
      toast.success('Peralatan disimpan');
    },
  });
  return { ...query, items: query.data?.pages.flatMap((p) => p.items) ?? [], save };
}
export function useCalibrationHistory(id?: string) {
  return useQuery({
    queryKey: ['calibrations', id],
    queryFn: () => equipmentApi.calibrations(id!),
    enabled: !!id,
  });
}
