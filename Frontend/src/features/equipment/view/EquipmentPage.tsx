import { useState } from 'react';
import { Plus, Search, Pencil, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Instrument } from '../../../shared/lib/contracts';
import { useSession } from '../../auth/controller/useSession';
import { useEquipment } from '../controller/useEquipment';
import { useCatalog } from '../../settings/controller/useSettings';
import { equipmentFrequency } from '../model/equipmentOrder';
import type { EquipmentSort, EquipmentSortKey } from '../model/equipmentOrder';
import { EquipmentEditor } from './EquipmentEditor';
import { ConfirmationDialog } from '../../../shared/components/ui/ConfirmationDialog';
import type { EquipmentForm } from '../model/schemas';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import {
  Card,
  Button,
  Field,
  Badge,
  Empty,
  Loading,
  ErrorMessage,
} from '../../../shared/components/ui';
export function EquipmentPage({ embedded = false }: { embedded?: boolean }) {
  const [q, setQ] = useState(''),
    [condition, setCondition] = useState(''),
    [selected, setSelected] = useState<Instrument | null | undefined>(undefined),
    [savePrompt, setSavePrompt] = useState<{ id?: string; values: EquipmentForm } | null>(null);
  const { user } = useSession(),
    catalog = useCatalog(true),
    definitions = catalog.data?.items ?? [],
    equipment = useEquipment(
      { q, active: 'true', ...(condition ? { condition } : {}) },
      definitions,
    );
  const addAction = user?.role === 'Admin' && (
    <Button
      onClick={() => {
        equipment.save.reset();
        equipment.setStatus.reset();
        setSelected(null);
      }}
    >
      <Plus size={18} aria-hidden="true" /> Tambah alat
    </Button>
  );
  return (
    <>
      {!embedded && <PageHeader title="Peralatan" actions={addAction} />}
      <Card>
        {embedded && (
          <div className="section-heading">
            <div className="section-heading-title">
              <h2>Peralatan</h2>
            </div>
            <div className="header-actions">{addAction}</div>
          </div>
        )}
        <div className="filters">
          <Field label="Cari peralatan">
            <div className="search-field">
              <Search size={18} />
              <input
                value={q}
                placeholder="Cari nama alat"
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Filter kondisi">
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="">Semua kondisi</option>
              <option value="working">Berfungsi</option>
              <option value="not_working">Tidak berfungsi</option>
              <option value="unknown">Belum tercatat</option>
            </select>
          </Field>
          <span className="muted">{equipment.items.length} alat ditampilkan</span>
        </div>
        <ErrorMessage error={equipment.error} />
        {equipment.isPending ? (
          <Loading />
        ) : !equipment.items.length ? (
          <Empty title="Peralatan belum tersedia" description="" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <SortHeading
                    field="name"
                    label="Peralatan"
                    sort={equipment.sort}
                    onSort={equipment.sortBy}
                  />
                  <SortHeading
                    field="input"
                    label="Input"
                    sort={equipment.sort}
                    onSort={equipment.sortBy}
                  />
                  <SortHeading
                    field="condition"
                    label="Kondisi"
                    sort={equipment.sort}
                    onSort={equipment.sortBy}
                  />
                  <SortHeading
                    field="active"
                    label="Status"
                    sort={equipment.sort}
                    onSort={equipment.sortBy}
                  />
                  <SortHeading
                    field="frequency"
                    label="Frekuensi pemeriksaan"
                    sort={equipment.sort}
                    onSort={equipment.sortBy}
                  />
                  <th />
                </tr>
              </thead>
              <tbody>
                {equipment.items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      {a.area && <small className="block muted">Line {a.area}</small>}
                    </td>
                    <td>
                      <Badge>
                        {a.measurement_mode === 'visual'
                          ? 'OK / NG'
                          : (a.profile?.unit ?? 'Angka foto')}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          a.condition === 'working'
                            ? 'ok'
                            : a.condition === 'not_working'
                              ? 'ng'
                              : 'warning'
                        }
                      >
                        {a.condition === 'working'
                          ? 'Berfungsi'
                          : a.condition === 'not_working'
                            ? 'Tidak berfungsi'
                            : 'Kondisi belum tercatat'}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={a.active ? 'neutral' : 'warning'}>
                        {a.active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td>
                      <small>{equipmentFrequency(a, definitions)}</small>
                    </td>
                    <td>
                      {user?.role === 'Admin' && (
                        <button
                          className="icon-button"
                          aria-label={'Edit ' + a.name}
                          onClick={() => {
                            equipment.save.reset();
                            equipment.setStatus.reset();
                            setSelected(a);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selected !== undefined && (
        <EquipmentEditor
          key={selected?.id ?? 'new'}
          equipment={selected ?? undefined}
          definitions={definitions}
          saving={equipment.save.isPending}
          error={equipment.save.error}
          statusPending={equipment.setStatus.isPending}
          statusError={equipment.setStatus.error}
          onSetActive={
            selected && user?.role === 'Admin'
              ? (active) =>
                  equipment.setStatus.mutate(
                    { id: selected.id, active },
                    { onSuccess: () => setSelected(undefined) },
                  )
              : undefined
          }
          onClose={() => setSelected(undefined)}
          onSave={(values) => setSavePrompt({ id: selected?.id, values })}
        />
      )}
      {savePrompt && (
        <ConfirmationDialog
          title="Simpan peralatan?"
          onCancel={() => setSavePrompt(null)}
          onConfirm={() => {
            equipment.save.mutate(savePrompt, { onSuccess: () => setSelected(undefined) });
            setSavePrompt(null);
          }}
        />
      )}
    </>
  );
}

function SortHeading({
  field,
  label,
  sort,
  onSort,
}: {
  field: EquipmentSortKey;
  label: string;
  sort: EquipmentSort;
  onSort: (key: EquipmentSortKey) => void;
}) {
  const selected = sort.key === field,
    Icon = selected ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th aria-sort={selected ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        className="table-sort-button"
        aria-label={'Urutkan berdasarkan ' + label}
        onClick={() => onSort(field)}
      >
        {label}
        <Icon size={15} />
      </button>
    </th>
  );
}
