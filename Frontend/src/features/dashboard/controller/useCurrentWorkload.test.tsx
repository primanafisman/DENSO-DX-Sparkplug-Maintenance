import { afterEach, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MaintenanceDue } from '../../../shared/lib/contracts';
import { schedule } from '../../../test/fixtures';
import { inspectionApi } from '../../maintenance/model/api';
import { useCurrentWorkload } from './useCurrentWorkload';

const previous = {
  ...schedule,
  server_time: '2026-10-28T14:14:20.000Z',
  starts_at: '2026-10-28T05:45:00.000Z',
  next_starts_at: '2026-10-28T14:15:00.000Z',
};
const next = {
  ...previous,
  shift: 'night' as const,
  server_time: '2026-10-28T14:15:00.000Z',
  starts_at: '2026-10-28T14:15:00.000Z',
  next_starts_at: '2026-10-28T18:15:00.000Z',
};
const due = (line: string, fresh = false): MaintenanceDue => ({
  line,
  schedule: fresh ? next : previous,
  items: [],
  completed_count: fresh ? 0 : 10,
  pending_count: fresh ? 10 : 0,
});
let client: QueryClient;
afterEach(() => {
  client?.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function show(lines: string[], age = 12000) {
  vi.useFakeTimers();
  // The operator device's calendar differs; elapsed response age must still work.
  vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60000 } } });
  for (const line of lines)
    client.setQueryData(['maintenance-due', line, ''], due(line), { updatedAt: Date.now() - age });
  function Host() {
    const current = useCurrentWorkload('', lines, previous);
    return (
      <>
        <output data-testid="total">
          {current.countsReady ? current.data!.completed_count : 'waiting'}
        </output>
        {current.perLine.map((line) => (
          <output key={line.line} data-testid={'line-' + line.line}>
            {line.ready ? line.completed : 'waiting'}
          </output>
        ))}
      </>
    );
  }
  render(
    <QueryClientProvider client={client}>
      <Host />
    </QueryClientProvider>,
  );
}

it('expires a remounted cached completion at the real boundary before a delayed response returns', async () => {
  let finish!: (value: MaintenanceDue) => void;
  const request = vi.spyOn(inspectionApi, 'due').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  show(['1']);
  expect(screen.getByTestId('total')).toHaveTextContent('10');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(28001);
  });
  expect(screen.getByTestId('total')).toHaveTextContent('waiting');
  expect(screen.getByTestId('line-1')).toHaveTextContent('waiting');
  expect(request).toHaveBeenCalled();
  await act(async () => {
    finish(due('1', true));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByTestId('total')).toHaveTextContent('0');
});

it('does not mix refreshed zero counts with expired completion from another line', async () => {
  const finishes = new Map<string, (value: MaintenanceDue) => void>();
  vi.spyOn(inspectionApi, 'due').mockImplementation(
    (line) =>
      new Promise((resolve) => {
        finishes.set(line, resolve);
      }),
  );
  show(['1', '2']);
  expect(screen.getByTestId('total')).toHaveTextContent('20');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(28001);
  });
  expect(screen.getByTestId('total')).toHaveTextContent('waiting');
  await act(async () => {
    finishes.get('1')!(due('1', true));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByTestId('line-1')).toHaveTextContent('0');
  expect(screen.getByTestId('line-2')).toHaveTextContent('waiting');
  expect(screen.getByTestId('total')).toHaveTextContent('waiting');
  await act(async () => {
    finishes.get('2')!(due('2', true));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByTestId('total')).toHaveTextContent('0');
});

it('rejects already expired cache immediately on return to the page', () => {
  vi.spyOn(inspectionApi, 'due').mockImplementation(() => new Promise(() => {}));
  show(['1'], 50000);
  expect(screen.getByTestId('total')).toHaveTextContent('waiting');
});
