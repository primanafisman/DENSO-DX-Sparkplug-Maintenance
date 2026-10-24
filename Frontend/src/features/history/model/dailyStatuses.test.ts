import { expect, it } from 'vitest';
import { dailyStatuses } from './dailyStatuses';
import type { ChecksheetRow } from '../../../shared/lib/contracts';
it('counts OK/NG on each date and retains separate occurrences across shifts without duplication', () => {
  const rows = [
    {
      cells: [
        {
          date: '2026-10-01',
          occurrences: [
            { id: 'a', overall_status: 'OK' },
            { id: 'b', overall_status: 'NG' },
          ],
        },
      ],
    },
    {
      cells: [
        {
          date: '2026-10-01',
          occurrences: [
            { id: 'c', overall_status: 'OK' },
            { id: 'a', overall_status: 'OK' },
          ],
        },
        { date: '2026-10-02', occurrences: [{ id: 'd', overall_status: 'NG' }] },
      ],
    },
  ] as ChecksheetRow[];
  expect(dailyStatuses(rows).map(({ date, ok, ng }) => ({ date, ok, ng }))).toEqual([
    { date: '2026-10-01', ok: 2, ng: 1 },
    { date: '2026-10-02', ok: 0, ng: 1 },
  ]);
});
