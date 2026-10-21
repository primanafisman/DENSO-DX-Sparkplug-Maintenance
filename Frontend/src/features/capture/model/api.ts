import { read, write, cropBinary } from '../../../shared/lib/api';
import type {
  Context,
  Photo,
  Discovery,
  Instrument,
  Page,
  AnalysisItem,
  AnalysisResult,
  Job,
  ROI,
  Confirmation,
  ConfirmedReading,
} from '../../../shared/lib/contracts';
import { jobSchema } from './schemas';
export const captureApi = {
  upload: (file: File, context: Context, signal?: AbortSignal) => {
    const form = new FormData();
    form.append('image', file);
    form.append('context', JSON.stringify(context));
    return write<Photo>('/photos', form, { signal });
  },
  discover: (id: string, area: string, signal?: AbortSignal) =>
    write<Discovery>('/photos/' + encodeURIComponent(id) + '/discovery', { area }, { signal }),
  instruments: async () => {
    const items: Instrument[] = [];
    let cursor: string | undefined;
    do {
      const page = await read<Page<Instrument>>('/instruments', {
        params: { limit: 100, cursor, active: 'true', measurement_mode: 'numeric' },
      });
      items.push(...page.items.filter((a) => a.condition !== 'not_working'));
      cursor = page.next_cursor ?? undefined;
      if (items.length > 10000)
        throw new Error('Daftar alat terlalu besar. Batasi area konfigurasi.');
    } while (cursor);
    return items;
  },
  submit: async (image_id: string, items: AnalysisItem[], area: string, signal?: AbortSignal) => {
    const result = await write<Job>('/analysis-jobs', { image_id, items, area }, { signal });
    jobSchema.parse(result);
    return result;
  },
  job: async (id: string, signal?: AbortSignal) => {
    const result = await read<Job>('/analysis-jobs/' + encodeURIComponent(id), { signal });
    jobSchema.parse(result);
    return result;
  },
  crop: (id: string, roi: ROI, signal?: AbortSignal) =>
    cropBinary('/photos/' + encodeURIComponent(id) + '/crop', roi, signal),
  confirm: (body: Confirmation) => write<ConfirmedReading>('/readings/confirm', body),
  manual: (
    image_id: string,
    instrument_id: string,
    roi: ROI,
    label_roi: ROI | null,
    signal?: AbortSignal,
  ) =>
    write<AnalysisResult>(
      '/analysis-jobs/manual',
      { image_id, instrument_id, roi, ...(label_roi ? { label_roi } : {}) },
      { signal },
    ),
};
