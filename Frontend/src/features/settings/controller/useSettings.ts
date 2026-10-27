import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../model/api';
import { equipmentApi } from '../../equipment/model/api';
import type { Instrument } from '../../../shared/lib/contracts';
import { toast } from 'sonner';
export function useCatalog(includeInactive = false) {
  return useQuery({
    queryKey: ['catalog', includeInactive],
    queryFn: () => settingsApi.catalog(includeInactive),
  });
}
export function useSettings(includeInactive = false) {
  const client = useQueryClient(),
    settings = useQuery({ queryKey: ['settings'], queryFn: settingsApi.settings }),
    catalog = useQuery({
      queryKey: ['catalog', includeInactive],
      queryFn: () => settingsApi.catalog(includeInactive),
    });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['settings'] });
    client.invalidateQueries({ queryKey: ['catalog'] });
    client.invalidateQueries({ queryKey: ['history'] });
    client.invalidateQueries({ queryKey: ['equipment'] });
    client.invalidateQueries({ queryKey: ['definition-equipment'] });
    client.invalidateQueries({ queryKey: ['maintenance-due'] });
    client.invalidateQueries({ queryKey: ['schedule'] });
    client.invalidateQueries({ queryKey: ['summary'] });
    toast.success('Pengaturan disimpan');
  };
  return {
    settings,
    catalog,
    save: useMutation({
      mutationFn: settingsApi.save,
      onSuccess: (saved) => {
        client.setQueryData(['settings'], saved.value);
        refresh();
      },
    }),
    createDefinition: useMutation({ mutationFn: settingsApi.createDefinition, onSuccess: refresh }),
    setDefinitionStatus: useMutation({
      mutationFn: settingsApi.setDefinitionStatus,
      onSuccess: refresh,
    }),
    saveDefinition: useMutation({ mutationFn: settingsApi.saveDefinition, onSuccess: refresh }),
  };
}
export function useDefinitionRevisions(id?: string, enabled = false) {
  return useQuery({
    queryKey: ['definition-revisions', id],
    queryFn: () => settingsApi.revisions(id!),
    enabled: !!id && enabled,
  });
}

export function useDefinitionEquipment(enabled = false) {
  return useQuery({
    queryKey: ['definition-equipment'],
    enabled,
    queryFn: async () => {
      const items: Instrument[] = [];
      let cursor: string | undefined;
      do {
        const page = await equipmentApi.list({}, cursor);
        items.push(...page.items);
        cursor = page.next_cursor ?? undefined;
        if (cursor && items.length >= 10000) throw new Error('Daftar alat terlalu besar.');
      } while (cursor);
      return items;
    },
  });
}
