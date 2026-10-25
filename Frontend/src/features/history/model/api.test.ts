import { expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server';
import { envelope, meta } from '../../../test/fixtures';
import { historyApi } from './api';
import * as api from '../../../shared/lib/api';

it('ordinary history, SPC, subgroup and CSV requests strip a stale example flag', async () => {
  const visited: string[] = [];
  const capture = (request: Request) => {
    const url = new URL(request.url);
    expect(url.searchParams.has('demo')).toBe(false);
    visited.push(url.pathname);
  };
  server.use(
    http.get('/api/v1/maintenance/report', ({ request }) => {
      capture(request);
      return HttpResponse.json(envelope({ meta, rows: [], next_cursor: null }));
    }),
    http.get('/api/v1/maintenance/spc', ({ request }) => {
      capture(request);
      return HttpResponse.json(envelope({ meta, cohorts: [] }));
    }),
    http.get('/api/v1/maintenance/spc/subgroups', ({ request }) => {
      capture(request);
      return HttpResponse.json(envelope({ meta, items: [], next_cursor: null }));
    }),
    http.get('/api/v1/maintenance/export.csv', ({ request }) => {
      capture(request);
      return new HttpResponse('data_origin,check\nData uji X/R,EE Cutting\n', {
        headers: { 'Content-Type': 'text/csv' },
      });
    }),
  );
  const legacy = { ...meta.scope, demo: true };
  await historyApi.checksheet(legacy);
  await historyApi.spc(legacy);
  await historyApi.subgroups(legacy, 'cohort');
  const binary = vi
    .spyOn(api, 'binary')
    .mockResolvedValue(new Blob(['data_origin\nData uji X/R\n']));
  await historyApi.export(legacy, 'spc');
  expect(binary).toHaveBeenCalledWith('/maintenance/export.csv', {
    params: { ...meta.scope, report_kind: 'spc', baseline_id: undefined },
  });
  binary.mockRestore();
  expect(visited).toEqual([
    '/api/v1/maintenance/report',
    '/api/v1/maintenance/spc',
    '/api/v1/maintenance/spc/subgroups',
  ]);
});
