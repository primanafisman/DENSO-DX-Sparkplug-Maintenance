import type { Instrument } from '../../../shared/lib/contracts';

const normalized = (text: string) =>
  text
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

export function matchRegisteredLabel(
  label: Record<string, unknown> | undefined,
  instruments: Instrument[],
  area: string,
): Instrument | null {
  if (!label || label.conflict === true) return null;
  const eligible = instruments.filter(
    (a) =>
      a.active &&
      a.profile &&
      a.measurement_mode !== 'visual' &&
      a.condition !== 'not_working' &&
      (!area || !a.area || a.area === area),
  );
  if (label.level === 'high' && label.requires_operator_selection === false) {
    const matched = eligible.find((a) => a.id === label.suggested_id);
    if (matched) return matched;
  }
  const raw =
    typeof label.raw_text === 'string'
      ? label.raw_text
      : typeof label.text === 'string'
        ? label.text
        : '';
  const lines = new Set(raw.split(/\r?\n/).map(normalized).filter(Boolean));
  // Complete text identities only; display numbers are not equipment labels.
  const matches = eligible.filter((a) =>
    [a.name, a.code, ...a.aliases].some(
      (text) => /\p{L}/u.test(text) && lines.has(normalized(text)),
    ),
  );
  return matches.length === 1 ? matches[0] : null;
}
