export type ServerClockAnchor = { epoch: number; monotonic: number };
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function anchorServerClock(serverTime: string, monotonic: number): ServerClockAnchor {
  const epoch = Date.parse(serverTime);
  if (!Number.isFinite(epoch) || !Number.isFinite(monotonic))
    throw new Error('Waktu server tidak tersedia.');
  return { epoch, monotonic };
}

export function serverClockAt(anchor: ServerClockAnchor, monotonic: number) {
  const instant = new Date(anchor.epoch + Math.max(0, monotonic - anchor.monotonic));
  return {
    time: timeFormat.format(instant),
    date: dateFormat.format(instant),
    iso: instant.toISOString(),
  };
}
