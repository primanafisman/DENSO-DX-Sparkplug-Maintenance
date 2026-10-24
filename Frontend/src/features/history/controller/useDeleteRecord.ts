import { useMutation, useQueryClient } from '@tanstack/react-query';
import { historyApi } from '../model/api';

export function useDeleteRecord() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: historyApi.deleteRecord,
    onSuccess: () => {
      for (const key of ['history', 'summary', 'maintenance-due'])
        void client.invalidateQueries({ queryKey: [key] });
    },
  });
}
