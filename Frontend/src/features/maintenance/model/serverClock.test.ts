import { expect, it } from 'vitest';
import { anchorServerClock, serverClockAt } from './serverClock';

it('projects server time with monotonic elapsed time and formats WIB independently of the client clock', () => {
  const anchor = anchorServerClock('2026-10-25T00:45:00.000Z', 1000);
  const clock = serverClockAt(anchor, 4300);
  expect(clock.time).toBe('07:45:03');
  expect(clock.date).toBe('25 Okt 2026');
  expect(clock.iso).toBe('2026-10-25T00:45:03.300Z');
});

it('rolls over midnight using the server calendar and never projects backwards before its anchor', () => {
  const anchor = anchorServerClock('2026-10-25T16:59:59.000Z', 1000);
  expect(serverClockAt(anchor, 3000)).toMatchObject({ time: '00:00:01', date: '26 Okt 2026' });
  expect(serverClockAt(anchor, 900).time).toBe('23:59:59');
});

it('rejects invalid server times instead of substituting the computer clock', () => {
  expect(() => anchorServerClock('unavailable', 1000)).toThrow();
  expect(() => anchorServerClock('2026-10-25T00:45:00Z', NaN)).toThrow();
});
