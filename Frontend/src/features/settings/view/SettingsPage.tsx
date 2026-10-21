import { useState } from 'react';
import { Save, Plus, Pencil, Clock3 } from 'lucide-react';
import type {
  MaintenanceDefinition,
  MaintenanceSettings,
  ProductType,
} from '../../../shared/lib/contracts';
import { useSession } from '../../auth/controller/useSession';
import { useSettings } from '../controller/useSettings';
import { DefinitionEditor } from './DefinitionEditor';
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
    [samplers, setSamplers] = useState(initial.allowed_samplers),
    [newSampler, setNewSampler] = useState(''),
    [rollover, setRollover] = useState(initial.night_rollover_hour),
    [products, setProducts] = useState<ProductType[]>(initial.product_types ?? []),
    [reason, setReason] = useState('');
  const change = (id: string, patch: Partial<ProductType>) =>
    setProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          lines: lines
            .filter((l) => /^(?:[1-9]|1[0-7])$/.test(l))
            .sort((a, b) => Number(a) - Number(b)),
          allowed_samplers: samplers,
          night_rollover_hour: rollover,
          product_types: products,
          review_reason: reason,
        });
      }}
    >
      <Card>
        <h2 className="section-title">Line dan penanggung jawab</h2>
        <div className="field-row">
          <fieldset className="active-line-options">
            <legend>Line aktif (1–17)</legend>
            <p className="muted">Hanya line yang dicentang muncul sebagai pilihan.</p>
            <div className="line-option-grid">
              {Array.from({ length: 17 }, (_, i) => String(i + 1)).map((line) => (
                <label className="check-label" key={line}>
                  <input
                    type="checkbox"
                    aria-label={'Line ' + line}
                    checked={lines.includes(line)}
                    disabled={!admin}
                    onChange={(e) =>
                      setLines(
                        e.target.checked ? [...lines, line] : lines.filter((v) => v !== line),
                      )
                    }
                  />
                  Line {line}
                </label>
              ))}
            </div>
          </fieldset>
          <section>
            <h3>Sampler aktif</h3>
            <p className="muted">Tambah atau hapus nama yang tersedia saat pemeriksaan.</p>
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
                      Hapus
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {!samplers.length && <p className="info-note">Belum ada sampler aktif.</p>}
            {admin && (
              <>
                <Field label="Tambah sampler">
                  <input
                    value={newSampler}
                    maxLength={64}
                    onChange={(e) => setNewSampler(e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    !newSampler.trim() ||
                    samplers.some((s) => s.toLowerCase() === newSampler.trim().toLowerCase())
                  }
                  onClick={() => {
                    setSamplers([...samplers, newSampler.trim()]);
                    setNewSampler('');
                  }}
                >
                  Tambah sampler
                </Button>
              </>
            )}
          </section>
        </div>
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
          <Clock3 size={17} /> Waktu server WIB · Shift 1: 07:45,12:45 · Shift 2: 21:15,01:15. Waktu
          pada HP tidak menentukan shift.
        </div>
      </Card>
      <Card>
        <div className="row between section-title">
          <div>
            <h2>Type produk</h2>
            <p className="muted">Varian spark plug untuk pemisahan laporan SPC.</p>
          </div>
          {admin && (
            <Button
              variant="secondary"
              type="button"
              onClick={() =>
                setProducts([
                  ...products,
                  { id: 'product-' + newId(), code: '', name: '', active: true, version: 1 },
                ])
              }
            >
              <Plus size={17} />
              Tambah Type
            </Button>
          )}
        </div>
        {products.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>KODE</th>
                  <th>NAMA TYPE</th>
                  <th>AKTIF</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        aria-label={'Kode ' + p.id}
                        value={p.code}
                        onChange={(e) => change(p.id, { code: e.target.value })}
                        required
                        readOnly={!admin}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={'Nama Type ' + p.id}
                        value={p.name}
                        onChange={(e) => change(p.id, { name: e.target.value })}
                        required
                        readOnly={!admin}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={'Type aktif ' + p.code}
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
          <p className="info-note">
            Belum ada Type. Hasil lama tetap ditampilkan sebagai Tidak tercatat.
          </p>
        )}
        {admin && (
          <>
            <Field label="Alasan perubahan pengaturan">
              <input value={reason} onChange={(e) => setReason(e.target.value)} required />
            </Field>
            <Button type="submit" disabled={pending}>
              <Save size={17} />
              {pending ? 'Menyimpan…' : 'Simpan pengaturan'}
            </Button>
          </>
        )}
      </Card>
    </form>
  );
}
export function SettingsPage() {
  const state = useSettings(true),
    { user } = useSession(),
    [tab, setTab] = useState('standards'),
    [selected, setSelected] = useState<MaintenanceDefinition | null>(null),
    [statusTarget, setStatusTarget] = useState<MaintenanceDefinition | null>(null),
    [statusReason, setStatusReason] = useState('');
  const admin = user?.role === 'Admin';
  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Standar, metode, jadwal dan master operasional yang terkontrol."
      />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'standards'} onClick={() => setTab('standards')}>
          Standar & metode
        </button>
        <button role="tab" aria-selected={tab === 'general'} onClick={() => setTab('general')}>
          Line, sampler & Type
        </button>
      </div>
      {!admin && (
        <p className="info-note">Tampilan baca saja. Perubahan konfigurasi memerlukan Admin.</p>
      )}
      <ErrorMessage error={state.settings.error ?? state.catalog.error} />
      {state.settings.isPending || state.catalog.isPending ? (
        <Loading />
      ) : tab === 'general' && state.settings.data ? (
        <GeneralSettings
          initial={state.settings.data}
          admin={admin}
          onSave={(body) => state.save.mutate(body)}
          pending={state.save.isPending}
        />
      ) : (
        <Card>
          <div className="row between section-title">
            <h2>Daftar pemeriksaan</h2>
            <Badge>{state.catalog.data?.count ?? 0} pilihan</Badge>
          </div>
          <p className="info-note">
            Setiap perubahan membentuk versi baru. Persyaratan dan metode terdahulu tetap tersimpan
            pada riwayat.
          </p>
          {admin && (
            <Button
              variant="secondary"
              onClick={() => {
                state.createDefinition.reset();
                setSelected(newDefinition());
              }}
            >
              <Plus size={17} />
              Tambah pemeriksaan
            </Button>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PEMERIKSAAN</th>
                  <th>STANDAR</th>
                  <th>METODE / SAMPEL</th>
                  <th>INTERVAL</th>
                  <th>VERSI</th>
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
                    <td>{d.standard_text}</td>
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
                    <td>v{d.definition_version}</td>
                    <td>
                      {admin && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            state.setDefinitionStatus.reset();
                            setStatusReason('');
                            setStatusTarget(d);
                          }}
                        >
                          {d.active === false ? 'Aktifkan' : 'Hapus dari pilihan'}
                        </Button>
                      )}
                      {admin && (
                        <button
                          className="icon-button"
                          aria-label={'Edit ' + d.name}
                          onClick={() => {
                            state.saveDefinition.reset();
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
          <small className="muted">
            Sumber: baris17–23 belum tersedia; baris45 terpotong. Parameter ber-catatan perlu
            ditinjau.
          </small>
        </Card>
      )}
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
        />
      )}
      {statusTarget && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Status pemeriksaan"
          >
            <h2>
              {statusTarget.active === false ? 'Aktifkan' : 'Hapus dari pilihan'} ·{' '}
              {statusTarget.name}
            </h2>
            <p>Riwayat pemeriksaan tetap tersimpan.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                state.setDefinitionStatus.mutate(
                  {
                    id: statusTarget.id,
                    active: statusTarget.active === false,
                    review_reason: statusReason,
                  },
                  { onSuccess: () => setStatusTarget(null) },
                );
              }}
            >
              <Field label="Alasan perubahan status">
                <input
                  required
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </Field>
              <ErrorMessage error={state.setDefinitionStatus.error} />
              <div className="actions">
                <Button type="button" variant="secondary" onClick={() => setStatusTarget(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={state.setDefinitionStatus.isPending}>
                  Simpan status
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
      <ErrorDialog error={state.save.error} onClose={() => state.save.reset()} />
    </>
  );
}
