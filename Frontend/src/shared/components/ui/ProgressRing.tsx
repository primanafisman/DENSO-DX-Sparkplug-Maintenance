export function ProgressRing({
  completed,
  pending,
  ready,
}: {
  completed: number;
  pending: number;
  ready: boolean;
}) {
  const valid =
    ready &&
    Number.isFinite(completed) &&
    Number.isFinite(pending) &&
    completed >= 0 &&
    pending >= 0 &&
    completed + pending > 0;
  const percentage = valid ? Math.round((completed / (completed + pending)) * 100) : null;
  return (
    <div
      className="progress-ring"
      role="img"
      aria-label={
        percentage === null
          ? 'Progres pemeriksaan belum tersedia'
          : `Progres pemeriksaan ${percentage}%`
      }
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle className="progress-ring-track" cx="30" cy="30" r="25" />
        <circle
          className="progress-ring-value"
          cx="30"
          cy="30"
          r="25"
          pathLength="100"
          strokeDasharray={`${percentage ?? 0} 100`}
          transform="rotate(-90 30 30)"
        />
      </svg>
      <strong>{percentage === null ? '—' : percentage + '%'}</strong>
    </div>
  );
}
