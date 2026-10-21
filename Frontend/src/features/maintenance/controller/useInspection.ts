import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { inspectionApi } from '../model/api';
import { useInspectionStore } from '../model/inspectionStore';
import type { InspectionDraft } from '../model/inspectionStore';
import type { MaintenanceDefinition } from '../../../shared/lib/contracts';
import { contextFormSchema } from '../model/schemas';
import { ApiError } from '../../../shared/lib/api';
export function useInspection({ scheduleEnabled = true } = {}) {
  const schedule = useQuery({
      queryKey: ['schedule'],
      queryFn: inspectionApi.schedule,
      refetchInterval: 60000,
      enabled: scheduleEnabled,
    }),
    store = useInspectionStore(),
    navigate = useNavigate(),
    client = useQueryClient(),
    [error, setError] = useState<unknown>(null);
  const start = async (
    definition: MaintenanceDefinition | null,
    selection: { line: string; sampler: string; product_type_id?: string },
    source?: 'camera' | 'upload',
  ) => {
    try {
      const c = contextFormSchema.parse(selection),
        fresh = await inspectionApi.schedule();
      store.start({
        definition,
        context: {
          line: c.line,
          sampler: c.sampler,
          shift: fresh.shift,
          production_date: fresh.production_date,
          ...(c.product_type_id ? { product_type_id: c.product_type_id } : {}),
        },
        checked_at: fresh.server_time,
        interval: definition?.intervals[0] ?? 'per_shift',
        trigger: definition?.triggers[0] ?? 'routine',
      });
      navigate(
        definition?.input_method === 'ok_ng'
          ? '/pemeriksaan/visual'
          : '/pemeriksaan/foto' + (source ? '?source=' + source : ''),
      );
    } catch (e) {
      setError(e);
    }
  };
  const mutation = useMutation({
    mutationFn: async (d: InspectionDraft | null) => {
      const current = useInspectionStore.getState();
      if (!d?.definition) throw new Error('Pilih pemeriksaan.');
      if (d.session_id !== current.draft?.session_id)
        throw new ApiError('Draft pemeriksaan telah diganti.', 409, 'DRAFT_REPLACED');
      if (current.saveState !== 'editing')
        throw new ApiError(
          'Periksa riwayat dan rekonsiliasi penyimpanan sebelumnya sebelum mencoba lagi.',
          409,
          'SAVE_LOCKED',
        );
      current.setSaveState('saving');
      return inspectionApi.save({
        definition_id: d.definition.id,
        definition_version: d.definition.definition_version,
        context: d.context,
        checked_at: d.checked_at,
        interval: d.interval,
        trigger: d.trigger,
        observations: d.definition.samples
          .map((s) => d.observations.find((o) => o.sample_id === s.id)!)
          .filter(Boolean),
      });
    },
    onSuccess: (record, d) => {
      client.invalidateQueries({ queryKey: ['history'] });
      client.invalidateQueries({ queryKey: ['summary'] });
      if (d?.session_id === useInspectionStore.getState().draft?.session_id) {
        store.complete(record);
        navigate('/pemeriksaan/selesai');
      }
    },
    onError: (e, d) => {
      if (d?.session_id !== useInspectionStore.getState().draft?.session_id) return;
      if (!(e instanceof ApiError && ['SAVE_LOCKED', 'DRAFT_REPLACED'].includes(e.code)))
        store.setSaveState(
          e instanceof ApiError && (e.status === 0 || e.status >= 500) ? 'uncertain' : 'editing',
        );
      setError(e);
    },
  });
  const snapshot = () => structuredClone(useInspectionStore.getState().draft);
  return {
    ...store,
    schedule,
    start,
    save: {
      ...mutation,
      mutate: () => mutation.mutate(snapshot()),
      mutateAsync: () => mutation.mutateAsync(snapshot()),
    },
    error,
    clearError: () => setError(null),
    uncertain: store.saveState === 'uncertain',
    allowAfterReview: () => {
      if (useInspectionStore.getState().saveState === 'uncertain') store.setSaveState('editing');
    },
  };
}
