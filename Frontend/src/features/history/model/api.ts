import { read, binary, write } from '../../../shared/lib/api';
import type {
  ReportInput,
  ChecksheetPage,
  SpcReport,
  SubgroupPage,
  Page,
  SpcBaseline,
  BaselineInput,
} from '../../../shared/lib/contracts';
import { checksheetSchema } from './schemas';
export const historyApi = {
  checksheet: async (scope: ReportInput, cursor?: string, signal?: AbortSignal) => {
    const result = await read<ChecksheetPage>('/maintenance/report', {
      params: { ...scope, limit: 25, cursor },
      signal,
    });
    checksheetSchema.parse(result);
    return result;
  },
  evidence: (id: string, variant: 'crop' | 'original', signal?: AbortSignal) =>
    binary('/readings/' + encodeURIComponent(id) + '/evidence/' + variant, { signal }),
  spc: (scope: ReportInput, baseline_id?: string, signal?: AbortSignal) =>
    read<SpcReport>('/maintenance/spc', { params: { ...scope, baseline_id }, signal }),
  subgroups: (
    scope: ReportInput,
    cohort_id: string,
    cursor?: string,
    baseline_id?: string,
    signal?: AbortSignal,
  ) =>
    read<SubgroupPage>('/maintenance/spc/subgroups', {
      params: { ...scope, cohort_id, cursor, limit: 100, baseline_id },
      signal,
    }),
  export: (scope: ReportInput, report_kind: 'checksheet' | 'spc', baseline_id?: string) =>
    binary('/maintenance/export.csv', { params: { ...scope, report_kind, baseline_id } }),
  baselines: (cursor?: string) =>
    read<Page<SpcBaseline>>('/maintenance/spc-baselines', { params: { limit: 100, cursor } }),
  saveBaseline: (body: BaselineInput) => write<SpcBaseline>('/maintenance/spc-baselines', body),
};
