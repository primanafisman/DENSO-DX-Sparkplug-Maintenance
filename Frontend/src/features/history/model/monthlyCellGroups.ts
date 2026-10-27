import type { ReportScope } from '../../../shared/lib/contracts';
import type { MonthlyOccurrence } from './monthlyRows';

export function monthlyCellGroups(
  items: MonthlyOccurrence[],
  scope: Pick<ReportScope, 'line' | 'shift'>,
) {
  return (['day', 'night'] as const)
    .map((shift) => ({
      shift,
      items: items
        .filter(
          ({ occurrence: o }) =>
            o.context.shift === shift &&
            (!scope.shift || o.context.shift === scope.shift) &&
            (!scope.line || o.context.line === scope.line),
        )
        .sort(
          (a, b) =>
            a.occurrence.context.line.localeCompare(b.occurrence.context.line, 'id', {
              numeric: true,
            }) ||
            (Date.parse(a.occurrence.checked_at) || 0) -
              (Date.parse(b.occurrence.checked_at) || 0) ||
            a.occurrence.id.localeCompare(b.occurrence.id),
        ),
    }))
    .filter((group) => group.items.length > 0);
}
