import { Clock3 } from 'lucide-react';
import { useServerClock } from '../controller/useServerClock';

export function ServerClock() {
  const { clock, loading } = useServerClock();
  return (
    <div className={'server-clock' + (!clock ? ' server-clock-unavailable' : '')}>
      <Clock3 size={17} aria-hidden="true" />
      <div>
        {clock ? (
          <time
            className="server-clock-time"
            role="timer"
            aria-label="Waktu server"
            aria-live="off"
            dateTime={clock.iso}
          >
            {clock.time} WIB
          </time>
        ) : (
          <span className="server-clock-time">--:--:-- WIB</span>
        )}
        <small className="server-clock-date">
          {clock ? clock.date : loading ? 'Memuat waktu server…' : 'Waktu server tidak tersedia'}
        </small>
      </div>
    </div>
  );
}
