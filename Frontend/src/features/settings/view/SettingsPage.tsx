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
  const [lines, setLines] = useState(initial.lines.join('\n')),
    [samplers, setSamplers] = useState(initial.allowed_samplers.join('\n')),
    [rollover, setRollover] = useState(initial.night_rollover_hour),
    [products, setProducts] = useState<ProductType[]>(initial.product_types ?? []),
    [reason, setReason] = useState('');
  const change = (id: string, patch: Partial<ProductType>) =>
    setProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const split = (s: string) => [
    ...new Set(
      s
        .split(/[,\n]/)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          lines: split(lines),
          allowed_samplers: split(samplers),
          night_rollover_hour: rollover,
          product_types: products,
          review_reason: reason,
        });
      }}
    >
      <Card>
        <h2 className="section-title">Line dan penanggung jawab</h2>
        <div className="field-row">
          <Field label="Line (satu per baris)">
            <textarea value={lines} onChange={(e) => setLines(e.target.value)} readOnly={!admin} />
          </Field>
          <Field label="Sampler (satu per baris)">
            <textarea
              value={samplers}
              onChange={(e) => setSamplers(e.target.value)}
              readOnly={!admin}
            />
          </Field>
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
  const state = useSettings(),
    { user } = useSession(),
    [tab, setTab] = useState('standards'),
    [selected, setSelected] = useState<MaintenanceDefinition | null>(null);
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
          onClose={() => setSelected(null)}
          onSave={(body) =>
            state.saveDefinition.mutate(
              { id: selected.id, body },
              { onSuccess: () => setSelected(null) },
            )
          }
          saving={state.saveDefinition.isPending}
          error={state.saveDefinition.error}
        />
      )}
      <ErrorDialog error={state.save.error} onClose={() => state.save.reset()} />
    </>
  );
}
