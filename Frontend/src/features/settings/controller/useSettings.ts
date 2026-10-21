import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../model/api';
import { toast } from 'sonner';
export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: settingsApi.catalog });
}
export function useSettings() {
  const client = useQueryClient(),
    settings = useQuery({ queryKey: ['settings'], queryFn: settingsApi.settings }),
    catalog = useQuery({ queryKey: ['catalog'], queryFn: settingsApi.catalog });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['settings'] });
    client.invalidateQueries({ queryKey: ['catalog'] });
    client.invalidateQueries({ queryKey: ['history'] });
    toast.success('Konfigurasi dan revisi disimpan');
  };
  return {
    settings,
    catalog,
    save: useMutation({ mutationFn: settingsApi.save, onSuccess: refresh }),
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
