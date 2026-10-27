type InspectionIdentity = {
  check_number?: number | null;
  source_number?: number | null;
  name: string;
  id?: string;
  definition_id?: string;
};
export function inspectionNumber(
  value: Pick<InspectionIdentity, 'check_number' | 'source_number'>,
) {
  const number = value.check_number ?? value.source_number;
  return Number.isInteger(number) && Number(number) > 0 ? Number(number) : null;
}
export function inspectionLabel(value: InspectionIdentity) {
  const number = inspectionNumber(value);
  return number === null ? value.name : number + ' · ' + value.name;
}
export function compareInspections(a: InspectionIdentity, b: InspectionIdentity) {
  return (
    (inspectionNumber(a) ?? Infinity) - (inspectionNumber(b) ?? Infinity) ||
    a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }) ||
    (a.id ?? a.definition_id ?? '').localeCompare(b.id ?? b.definition_id ?? '')
  );
}
export function nextInspectionNumber(values: InspectionIdentity[]) {
  const used = new Set(values.map(inspectionNumber));
  for (let number = 45; number <= 10000; number++) if (!used.has(number)) return number;
  for (let number = 1; number < 45; number++) if (!used.has(number)) return number;
  return null;
}
