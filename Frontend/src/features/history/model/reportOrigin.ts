import type { RecordOrigin } from '../../../shared/lib/contracts';

export function illustrativeOrigin(origin?: RecordOrigin) {
  return origin?.kind === 'illustrative_local_import';
}
