import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inspectionApi } from '../../features/maintenance/model/api';
import { settingsApi } from '../../features/settings/model/api';
import { monthRange, monthLabel } from '../lib/format';
export function useReportFilters() {
  const [params, setParams] = useSearchParams(),
    schedule = useQuery({
      queryKey: ['schedule'],
      queryFn: inspectionApi.schedule,
      refetchInterval: 60000,
    }),
    settings = useQuery({ queryKey: ['settings'], queryFn: settingsApi.settings });
  const serverMonth = schedule.data?.production_date.slice(0, 7),
    raw = params.get('month'),
    month = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : (serverMonth ?? '');
  const requestedLine = params.get('line') ?? '',
    line = settings.data?.lines.includes(requestedLine) ? requestedLine : '',
    shift: 'day' | 'night' | undefined =
      params.get('shift') === 'day' ? 'day' : params.get('shift') === 'night' ? 'night' : undefined;
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.delete('demo');
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'month') {
      next.delete('from');
      next.delete('to');
    }
    if (key === 'line' || key === 'shift') next.delete('baseline');
    setParams(next);
  };
  const months = serverMonth
    ? Array.from({ length: 6 }, (_, i) => {
        const date = new Date(serverMonth + '-01T12:00:00Z');
        date.setUTCMonth(date.getUTCMonth() - i);
        const value = date.toISOString().slice(0, 7);
        return { value, label: monthLabel(value) };
      })
    : [];
  return {
    serverSchedule: schedule.data,
    productionDate: schedule.data?.production_date,
    month,
    line,
    shift,
    months,
    change,
    lines: settings.data?.lines ?? [],
    scope: month
      ? {
          ...monthRange(month),
          ...(line ? { line } : {}),
          ...(shift ? { shift } : {}),
        }
      : null,
    error: schedule.error ?? settings.error,
  };
}
