import type { RecordOrigin } from '../../../shared/lib/contracts';
import { illustrativeOrigin } from '../model/reportOrigin';

export function OriginBadge({ origin }: { origin?: RecordOrigin }) {
  return illustrativeOrigin(origin) ? <span className="origin-badge">{origin!.label}</span> : null;
}
