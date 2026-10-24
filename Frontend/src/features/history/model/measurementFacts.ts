import type { Occurrence, SampleOutcome, SpcCohort } from '../../../shared/lib/contracts';
import { number } from '../../../shared/lib/format';
type Limits = { minimum: number | null; maximum: number | null };
type Accepted = { acceptance_limits?: Limits | null };
export function acceptanceLabel(limits: Limits | null | undefined, unit: string | null = null) {
  if (!limits || (limits.minimum === null && limits.maximum === null)) return null;
  const value =
    limits.minimum === null
      ? '≤ ' + number(limits.maximum)
      : limits.maximum === null
        ? '≥ ' + number(limits.minimum)
        : number(limits.minimum) + '–' + number(limits.maximum);
  return value + (unit ? ' ' + unit : '');
}
export function measurementUnit(
  occurrence: Occurrence,
  outcome?: SampleOutcome,
  fallback?: string | null,
) {
  const measured = outcome as (SampleOutcome & { unit?: string }) | undefined;
  return measured?.unit ?? occurrence.definition_snapshot?.unit ?? fallback ?? null;
}
export function occurrenceAcceptance(occurrence: Occurrence, fallback?: string | null) {
  return occurrence.outcomes.flatMap((outcome) => {
    if (typeof outcome.value !== 'number') return [];
    const frozen = outcome as SampleOutcome & Accepted;
    const limits = Object.hasOwn(frozen, 'acceptance_limits')
      ? frozen.acceptance_limits
      : occurrence.definition_snapshot?.limits;
    const label = acceptanceLabel(limits, measurementUnit(occurrence, outcome, fallback));
    return label ? [{ sample_id: outcome.sample_id, label }] : [];
  });
}
export function cohortAcceptance(cohort: SpcCohort) {
  return acceptanceLabel(
    (cohort as SpcCohort & Accepted).acceptance_limits ?? cohort.definition_snapshot.limits,
    cohort.unit,
  );
}
