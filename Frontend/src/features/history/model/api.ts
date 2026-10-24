import { read, binary, write, remove } from '../../../shared/lib/api';
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
function reportRequest(scope: ReportInput, suffix: string) {
  const { demo, ...params } = scope;
  return { path: '/maintenance/' + (demo ? 'demo/' : '') + suffix, params };
}
export const historyApi = {
  deleteRecord: (id: string) =>
    remove<{ id: string; deleted: true }>('/maintenance/records/' + encodeURIComponent(id)),
  checksheet: async (scope: ReportInput, cursor?: string, signal?: AbortSignal) => {
    const request = reportRequest(scope, 'report');
    const result = await read<ChecksheetPage>(request.path, {
      params: { ...request.params, limit: 25, cursor },
      signal,
    });
    checksheetSchema.parse(result);
    return result;
  },
  evidence: (id: string, variant: 'crop' | 'original', signal?: AbortSignal) =>
    binary('/readings/' + encodeURIComponent(id) + '/evidence/' + variant, { signal }),
  spc: (scope: ReportInput, baseline_id?: string, signal?: AbortSignal) => {
    const request = reportRequest(scope, 'spc');
    return read<SpcReport>(request.path, { params: { ...request.params, baseline_id }, signal });
  },
  subgroups: (
    scope: ReportInput,
    cohort_id: string,
    cursor?: string,
    baseline_id?: string,
    signal?: AbortSignal,
  ) => {
    const request = reportRequest(scope, 'spc/subgroups');
    return read<SubgroupPage>(request.path, {
      params: { ...request.params, cohort_id, cursor, limit: 100, baseline_id },
      signal,
    });
  },
  export: (scope: ReportInput, report_kind: 'checksheet' | 'spc', baseline_id?: string) =>
    binary('/maintenance/export.csv', { params: { ...scope, report_kind, baseline_id } }),
  baselines: (cursor?: string) =>
    read<Page<SpcBaseline>>('/maintenance/spc-baselines', { params: { limit: 100, cursor } }),
  saveBaseline: (body: BaselineInput) => write<SpcBaseline>('/maintenance/spc-baselines', body),
};
