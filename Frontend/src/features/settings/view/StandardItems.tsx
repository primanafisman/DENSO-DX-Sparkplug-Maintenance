import type { MaintenanceDefinition } from '../../../shared/lib/contracts';

const number = (value: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(value);

export function StandardItems({ definition }: { definition: MaintenanceDefinition }) {
  // Semicolons/newlines separate source clauses; decimal points and tolerances
  // remain untouched. Requirement labels and master names come from the catalog.
  const clauses = definition.standard_text
    .split(/;\s*|\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean);
  const items = [
    ...clauses,
    ...definition.requirements
      .map((item) => item.label)
      .filter(
        (label) =>
          !clauses.some((clause) =>
            clause.toLocaleLowerCase('id-ID').includes(label.toLocaleLowerCase('id-ID')),
          ),
      ),
  ];
  return (
    <>
      <ul className="settings-standard-items" aria-label={'Standar ' + definition.name}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      {definition.limits && definition.unit && (
        <dl className="settings-standard-range" aria-label="Batas penerimaan">
          <div>
            <dt>Minimum</dt>
            <dd>
              {number(definition.limits.minimum)} {definition.unit}
            </dd>
          </div>
          <div>
            <dt>Maksimum</dt>
            <dd>
              {number(definition.limits.maximum)} {definition.unit}
            </dd>
          </div>
        </dl>
      )}
      {definition.input_method === 'ok_ng' && definition.samples.length > 1 && (
        <ul className="settings-master-samples" aria-label={'Sampel ' + definition.name}>
          {definition.samples.map((sample) => (
            <li key={sample.id}>{sample.label}</li>
          ))}
        </ul>
      )}
    </>
  );
}
