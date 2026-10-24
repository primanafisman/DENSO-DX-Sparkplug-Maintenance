import { expect, it, vi } from 'vitest';
import { loadMonthlyChecksheet } from './useMonthlyChecksheet';
import { meta } from '../../../test/fixtures';
import type { ChecksheetPage, ReportInput } from '../../../shared/lib/contracts';
import { historyRow, historyOccurrence } from '../test/monthlyFixtures';
const scope: ReportInput = { ...meta.scope, as_of: meta.as_of };

it('waits for all cursor pages before publishing one complete merged row', async () => {
  let finish!: (page: ChecksheetPage) => void;
  const read = vi
    .fn()
    .mockResolvedValueOnce({ meta, rows: [historyRow()], next_cursor: 'second' })
    .mockImplementationOnce(
      () =>
        new Promise<ChecksheetPage>((resolve) => {
          finish = resolve;
        }),
    );
  let completed = false;
  const loading = loadMonthlyChecksheet(scope, { read }).then((result) => {
    completed = true;
    return result;
  });
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(completed).toBe(false);
  expect(read.mock.calls[1][0].as_of).toBeUndefined();
  expect(read.mock.calls[1][1]).toBe('second');
  expect(read.mock.calls[1][3]).toBe(100);
  finish({
    meta,
    rows: [
      historyRow({
        row_id: 'night',
        shift: 'night',
        cells: [
          {
            date: '2026-10-21',
            count: 1,
            occurrences: [historyOccurrence('night', { overall_status: 'NG' })],
          },
        ],
      }),
    ],
    next_cursor: null,
  });
  const result = await loading;
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].cells[0].count).toBe(2);
});

it('rejects looping or bounded pagination rather than exposing a partially merged month', async () => {
  const looping = vi.fn().mockResolvedValue({ meta, rows: [], next_cursor: 'same' });
  await expect(loadMonthlyChecksheet(scope, { read: looping })).rejects.toThrow(/berulang/i);
  const bounded = vi
    .fn()
    .mockResolvedValueOnce({ meta, rows: [], next_cursor: 'second' })
    .mockResolvedValueOnce({ meta, rows: [], next_cursor: 'third' });
  await expect(loadMonthlyChecksheet(scope, { read: bounded, maxPages: 2 })).rejects.toThrow(
    /persempit/i,
  );
});

it('rejects a changed snapshot and ignores cancelled responses', async () => {
  const changed = vi
    .fn()
    .mockResolvedValueOnce({ meta, rows: [], next_cursor: 'second' })
    .mockResolvedValueOnce({
      meta: { ...meta, as_of: '2026-10-21T02:00:00Z' },
      rows: [],
      next_cursor: null,
    });
  await expect(loadMonthlyChecksheet(scope, { read: changed })).rejects.toThrow(/berubah/i);
  const controller = new AbortController();
  const aborted = vi.fn().mockImplementation(async () => {
    controller.abort();
    return { meta, rows: [], next_cursor: null };
  });
  await expect(
    loadMonthlyChecksheet(scope, { read: aborted, signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
