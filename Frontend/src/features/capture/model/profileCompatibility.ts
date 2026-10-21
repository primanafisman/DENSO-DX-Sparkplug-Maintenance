import type { Profile } from '../../../shared/lib/contracts';
export function sameProfile(a: Profile | null, b: Profile | null, detectedKind?: string) {
  return (
    !!a &&
    !!b &&
    (a.kind === b.kind ||
      ((a.kind === 'auto' || b.kind === 'auto') &&
        (a.kind === 'auto' ? b.kind : a.kind) === detectedKind)) &&
    a.unit === b.unit &&
    a.minimum === b.minimum &&
    a.maximum === b.maximum &&
    a.decimals === b.decimals &&
    a.tolerance === b.tolerance
  );
}
