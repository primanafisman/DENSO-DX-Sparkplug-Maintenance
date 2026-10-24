import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Plus, Pencil, Clock3, ClipboardList, Wrench, Factory, Trash2 } from 'lucide-react';
import type {
  MaintenanceDefinition,
  MaintenanceSettings,
  ProductType,
} from '../../../shared/lib/contracts';
import { useSession } from '../../auth/controller/useSession';
import { useSettings } from '../controller/useSettings';
import { DefinitionEditor } from './DefinitionEditor';
import { StandardItems } from './StandardItems';
import { EquipmentPage } from '../../equipment/view/EquipmentPage';
import { newDefinition } from '../model/newDefinition';
import { newId } from '../../../shared/lib/id';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import {
  Card,
  Button,
  Field,
  Badge,
  Loading,
  ErrorMessage,
  ErrorDialog,
} from '../../../shared/components/ui';
function GeneralSettings({
  initial,
  admin,
  onSave,
  pending,
}: {
  initial: MaintenanceSettings;
  admin: boolean;
  onSave: (body: MaintenanceSettings & { review_reason: string }) => void;
  pending: boolean;
}) {
  const [lines, setLines] = useState(initial.lines),
    [newLine, setNewLine] = useState(''),
    [samplers, setSamplers] = useState(initial.allowed_samplers),
    [newSampler, setNewSampler] = useState(''),
    [rollover, setRollover] = useState(initial.night_rollover_hour),
    [products, setProducts] = useState<ProductType[]>(initial.product_types ?? []);
  const productCodeFollowsName = useRef(
    new Map(
      (initial.product_types ?? []).map((product) => [
        product.id,
        !product.code || product.code === product.name,
      ]),
    ),
  );
  const change = (id: string, patch: Partial<ProductType>) =>
    setProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const lineAddControls = admin && (
    <div className="header-actions settings-inline-add">
      <Field label="Tambah line">
        <input
          value={newLine}
          maxLength={64}
          placeholder="Nomor atau nama line"
          onChange={(event) => setNewLine(event.target.value)}
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={
          !newLine.trim() ||
          lines.length >= 200 ||
          lines.some(
            (line) => line.toLocaleLowerCase('id-ID') === newLine.trim().toLocaleLowerCase('id-ID'),
          )
        }
        onClick={() => {
          setLines([...lines, newLine.trim()]);
          setNewLine('');
        }}
      >
        <Plus size={16} aria-hidden="true" /> Tambah line
      </Button>
    </div>
  );
  const samplerAddControls = admin && (
    <div className="header-actions settings-inline-add">
      <Field label="Tambah sampler">
        <input
          value={newSampler}
          maxLength={64}
          onChange={(event) => setNewSampler(event.target.value)}
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={
          !newSampler.trim() ||
          samplers.length >= 100 ||
          samplers.some((sampler) => sampler.toLowerCase() === newSampler.trim().toLowerCase())
        }
        onClick={() => {
          setSamplers([...samplers, newSampler.trim()]);
          setNewSampler('');
        }}
      >
        <Plus size={16} aria-hidden="true" /> Tambah sampler
      </Button>
    </div>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          lines: [...lines].sort((a, b) =>
            a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' }),
          ),
          allowed_samplers: samplers,
          night_rollover_hour: rollover,
          product_types: products,
          review_reason: 'Pembaruan pengaturan operasional.',
        });
      }}
    >
      <Card>
        <div className="section-heading">
          <div className="section-heading-title">
            <h2>Line Produksi</h2>
          </div>
          {lineAddControls}
        </div>
        <div className="field-row">
          <section>
            <div className="section-heading">
              <h3>Line aktif</h3>
              <Badge>{lines.length} line</Badge>
            </div>
            <div className="sampler-options">
              {lines.map((line) => (
                <div className="row between" key={line}>
                  <span>Line {line}</span>
                  {admin && (
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={'Hapus line ' + line}
                      onClick={() => setLines(lines.filter((value) => value !== line))}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {!lines.length && <p className="info-note">Belum ada line aktif.</p>}
            {lines.length >= 200 && (
              <small className="source-note">Batas 200 line aktif tercapai.</small>
            )}
          </section>
          <section>
            <div className="section-heading">
              <h3>Sampler aktif</h3>
              {samplerAddControls}
            </div>
            <div className="sampler-options">
              {samplers.map((s) => (
                <div className="row between" key={s}>
                  <span>{s}</span>
                  {admin && (
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={'Hapus sampler ' + s}
                      onClick={() => setSamplers(samplers.filter((v) => v !== s))}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {!samplers.length && <p className="info-note">Belum ada sampler aktif.</p>}
          </section>
        </div>
        <details className="settings-details">
          <summary>Detail jadwal shift</summary>
          <Field label="Batas pergantian tanggal shift malam (jam WIB)">
            <input
              type="number"
              min="1"
              max="23"
              value={rollover}
              onChange={(e) => setRollover(Number(e.target.value))}
              disabled={!admin}
            />
          </Field>
          <div className="info-note">
            <Clock3 size={17} /> Waktu server WIB · Shift 1: 07:45,12:45 · Shift 2: 21:15,01:15.
          </div>
        </details>
      </Card>
      <Card>
        <div className="section-heading">
          <div className="section-heading-title">
            <h2>Type produk</h2>
          </div>
          {admin && (
            <div className="header-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  const id = 'product-' + newId();
                  productCodeFollowsName.current.set(id, true);
                  setProducts([...products, { id, code: '', name: '', active: true, version: 1 }]);
                }}
              >
                <Plus size={17} />
                Tambah Type
              </Button>
            </div>
          )}
        </div>
        {products.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>NAMA TYPE</th>
                  <th>AKTIF</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        aria-label={'Nama Type ' + p.id}
                        maxLength={productCodeFollowsName.current.get(p.id) ? 64 : 100}
                        value={p.name}
                        onChange={(e) =>
                          change(p.id, {
                            name: e.target.value,
                            ...(productCodeFollowsName.current.get(p.id)
                              ? { code: e.target.value }
                              : {}),
                          })
                        }
                        required
                        readOnly={!admin}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={'Type aktif ' + p.name}
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) => change(p.id, { active: e.target.checked })}
                        disabled={!admin}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="info-note">Belum ada Type produk.</p>
        )}
        {admin && (
          <div className="header-actions">
            <Button type="submit" disabled={pending}>
              <Save size={17} />
              {pending ? 'Menyimpan…' : 'Simpan pengaturan'}
            </Button>
          </div>
        )}
      </Card>
    </form>
  );
}
export function SettingsPage() {
  const state = useSettings(true),
    { user } = useSession(),
    [params, setParams] = useSearchParams(),
    [selected, setSelected] = useState<MaintenanceDefinition | null>(null);
  const admin = user?.role === 'Admin';
  const requested = params.get('tab'),
    tab = ['standards', 'equipment', 'general'].includes(requested ?? '') ? requested : 'standards';
  const tabs = [
    { id: 'standards', label: 'Daftar Pemeriksaan', icon: ClipboardList },
    { id: 'equipment', label: 'Peralatan', icon: Wrench },
    { id: 'general', label: 'Line Produksi', icon: Factory },
  ];
  const setTab = (value: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next);
  };
  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="tabs settings-tabs" role="tablist" aria-label="Pengaturan operasional">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            role="tab"
            id={'settings-tab-' + item.id}
            aria-controls="settings-panel"
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(e) => {
              const offset = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
              const target =
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? tabs.length - 1
                    : offset
                      ? (index + offset + tabs.length) % tabs.length
                      : null;
              if (target !== null) {
                e.preventDefault();
                setTab(tabs[target].id);
                const buttons =
                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]',
                  );
                buttons?.item(target)?.focus();
              }
            }}
          >
            <item.icon size={18} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
      {!admin && <p className="info-note">Akses baca saja</p>}
      <ErrorMessage error={state.settings.error ?? state.catalog.error} />
      <div role="tabpanel" id="settings-panel" aria-labelledby={'settings-tab-' + tab}>
        {state.settings.isPending || state.catalog.isPending ? (
          <Loading />
        ) : tab === 'equipment' ? (
          <EquipmentPage embedded />
        ) : tab === 'general' && state.settings.data ? (
          <GeneralSettings
            initial={state.settings.data}
            admin={admin}
            onSave={(body) => state.save.mutate(body)}
            pending={state.save.isPending}
          />
        ) : (
          <Card>
            <div className="section-heading">
              <div className="section-heading-title">
                <h2>Daftar Pemeriksaan</h2>
                <Badge>{state.catalog.data?.count ?? 0} pemeriksaan</Badge>
              </div>
              {admin && (
                <div className="header-actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      state.createDefinition.reset();
                      state.setDefinitionStatus.reset();
                      setSelected(newDefinition());
                    }}
                  >
                    <Plus size={17} />
                    Tambah pemeriksaan
                  </Button>
                </div>
              )}
            </div>
            <div className="table-scroll">
              <table className="settings-catalog-table">
                <thead>
                  <tr>
                    <th>PEMERIKSAAN</th>
                    <th>STANDAR</th>
                    <th>METODE / SAMPEL</th>
                    <th>INTERVAL</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {state.catalog.data?.items.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                        {d.active === false && <Badge>Nonaktif</Badge>}
                        {d.review_notes.map((note) => (
                          <p className="source-note" key={note}>
                            {note}
                          </p>
                        ))}
                      </td>
                      <td>
                        <StandardItems definition={d} />
                      </td>
                      <td>
                        <Badge>
                          {d.input_method === 'ok_ng'
                            ? 'OK / NG'
                            : d.input_method === 'photo_difference'
                              ? 'Before / after'
                              : 'Angka foto'}
                        </Badge>
                        <small className="block muted">
                          n{d.sample_count} · {d.tool}
                        </small>
                      </td>
                      <td>{d.interval_guide.description}</td>
                      <td>
                        {admin && (
                          <button
                            className="icon-button"
                            aria-label={'Edit ' + d.name}
                            onClick={() => {
                              state.saveDefinition.reset();
                              state.setDefinitionStatus.reset();
                              setSelected(d);
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
            {!!state.catalog.data?.source_gaps?.missing_rows.length && (
              <small className="source-note">
                Sumber belum tersedia: baris{' '}
                {state.catalog.data.source_gaps.missing_rows.join(', ')}.
              </small>
            )}
            {!!state.catalog.data?.source_gaps?.clipped_row && (
              <small className="source-note block">
                Sumber baris {state.catalog.data.source_gaps.clipped_row} terpotong; perlu ditinjau.
              </small>
            )}
          </Card>
        )}
      </div>
      {selected && (
        <DefinitionEditor
          key={selected.id}
          definition={selected}
          creating={selected.id === 'new'}
          manageEquipment={admin}
          onClose={() => setSelected(null)}
          onSave={(body) =>
            selected.id === 'new'
              ? state.createDefinition.mutate(body, { onSuccess: () => setSelected(null) })
              : state.saveDefinition.mutate(
                  { id: selected.id, body },
                  { onSuccess: () => setSelected(null) },
                )
          }
          saving={state.saveDefinition.isPending || state.createDefinition.isPending}
          error={state.saveDefinition.error ?? state.createDefinition.error}
          statusPending={state.setDefinitionStatus.isPending}
          statusError={state.setDefinitionStatus.error}
          onSetActive={
            admin && selected.id !== 'new'
              ? (active) =>
                  state.setDefinitionStatus.mutate(
                    {
                      id: selected.id,
                      active,
                      review_reason: active
                        ? 'Pemeriksaan diaktifkan melalui Pengaturan.'
                        : 'Pemeriksaan dinonaktifkan melalui Pengaturan.',
                    },
                    { onSuccess: () => setSelected(null) },
                  )
              : undefined
          }
        />
      )}
      <ErrorDialog error={state.save.error} onClose={() => state.save.reset()} />
    </>
  );
}
