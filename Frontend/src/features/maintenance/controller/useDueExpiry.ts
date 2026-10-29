import { useEffect, useState } from 'react';
import type { MaintenanceDue } from '../../../shared/lib/contracts';
import { dueExpiresAt } from '../model/dueFreshness';

type Snapshot = { data?: MaintenanceDue; dataUpdatedAt: number };

export function useDueExpiry(snapshots: Snapshot[]) {
  const [observedAt, setObservedAt] = useState(() => Date.now());
  const now = Math.max(
    observedAt,
    Date.now(),
    ...snapshots.map((snapshot) => snapshot.dataUpdatedAt),
  );
  const deadlines = snapshots.map((snapshot) =>
    dueExpiresAt(snapshot.data, snapshot.dataUpdatedAt),
  );
  const next = Math.min(...deadlines.filter((deadline) => deadline > now));
  useEffect(() => {
    const update = () => setObservedAt(Date.now());
    const visible = () => {
      if (document.visibilityState !== 'hidden') update();
    };
    const timer = Number.isFinite(next)
      ? window.setTimeout(update, Math.max(0, next - Date.now()))
      : undefined;
    window.addEventListener('focus', update);
    window.addEventListener('online', update);
    document.addEventListener('visibilitychange', visible);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('online', update);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [next]);
  return snapshots.map((snapshot, index) => !!snapshot.data && deadlines[index] <= now);
}
