export function formatAcceptance(
  limits: { minimum: number | null; maximum: number | null },
  unit: string,
  decimals = 3,
) {
  const value = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  const range =
    limits.minimum !== null && limits.maximum !== null
      ? `${value(limits.minimum)}–${value(limits.maximum)}`
      : limits.minimum !== null
        ? `≥ ${value(limits.minimum)}`
        : limits.maximum !== null
          ? `≤ ${value(limits.maximum)}`
          : '';
  return range ? `${range} ${unit}`.trim() : '';
}
