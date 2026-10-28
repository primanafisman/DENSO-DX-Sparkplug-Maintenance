import type { MaintenanceDue } from '../../../shared/lib/contracts';

// Translate a server deadline into the client's timeline using response age,
// so a cached response does not receive a new full interval on remount.
export function dueExpiresAt(data: MaintenanceDue | undefined, receivedAt: number) {
  if (!data || !Number.isFinite(receivedAt)) return 0;
  const server = Date.parse(data.schedule.server_time);
  const deadlines = [data.schedule.next_starts_at, ...data.items.map((item) => item.next_starts_at)]
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  if (!Number.isFinite(server) || !deadlines.length) return 0;
  return receivedAt + Math.min(...deadlines) - server;
}

export function dueRefreshInterval(data: MaintenanceDue | undefined, receivedAt: number) {
  if (!data) return 60000;
  return Math.max(1000, Math.min(60000, dueExpiresAt(data, receivedAt) - Date.now()));
}
