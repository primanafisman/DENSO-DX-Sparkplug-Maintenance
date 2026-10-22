import { useState } from 'react';
import { Plus, Search, Pencil, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Instrument } from '../../../shared/lib/contracts';
import { useSession } from '../../auth/controller/useSession';
import { useEquipment } from '../controller/useEquipment';
import { useCatalog } from '../../settings/controller/useSettings';
import { equipmentFrequency } from '../model/equipmentOrder';
import type { EquipmentSort, EquipmentSortKey } from '../model/equipmentOrder';
import { EquipmentEditor } from './EquipmentEditor';
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
    [selected, setSelected] = useState<Instrument | null | undefined>(undefined);
  const { user } = useSession(),
    catalog = useCatalog(true),
    definitions = catalog.data?.items ?? [],
    equipment = useEquipment({ q, ...(condition ? { condition } : {}) }, definitions);
  return (
    <>
      <PageHeader
        level={embedded ? 2 : 1}
        title="Peralatan"
        description="Identitas, kondisi dan parameter alat ukur."
        actions={
          user?.role === 'Admin' && (
            <Button
              onClick={() => {
                equipment.save.reset();
                equipment.setStatus.reset();
                setSelected(null);
              }}
            >
              <Plus size={18} />
              Tambah alat
            </Button>
          )
        }
      />
      <Card>
        <div className="filters">
          <Field label="Cari peralatan">
            <div className="search-field">
              <Search size={18} />
              <input
                value={q}
                placeholder="Nama, nomor atau alias"
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
          <Empty
            title="Peralatan belum tersedia"
            description="Administrator dapat menambahkan alat dan alias untuk pencocokan label."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <SortHeading
                    field="code"
                    label="Nomor / kode"
                    sort={equipment.sort}
                    onSort={equipment.sortBy}
                  />
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
                      <strong>{a.code || a.name}</strong>
                    </td>
                    <td>
                      {a.name}
                      <small className="block muted">{a.area || 'Area belum diisi'}</small>
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
          onSave={(values) =>
            equipment.save.mutate(
              { id: selected?.id, values },
              { onSuccess: () => setSelected(undefined) },
            )
          }
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
