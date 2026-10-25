import { useRef, useState } from 'react';
import { Save, Plus, Clock3, Trash2 } from 'lucide-react';
import type { MaintenanceSettings, ProductType } from '../../../shared/lib/contracts';
import { Card, Field, Badge, Button } from '../../../shared/components/ui';
import { ConfirmationDialog } from '../../../shared/components/ui/ConfirmationDialog';
import { newId } from '../../../shared/lib/id';
import { DEFAULT_SHIFT_SCHEDULE, validateShiftSchedule } from '../model/shiftSchedule';
export function GeneralSettings({
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
    [shiftSchedule, setShiftSchedule] = useState(() =>
      structuredClone(initial.shift_schedule ?? DEFAULT_SHIFT_SCHEDULE),
    ),
    [scheduleError, setScheduleError] = useState<string | null>(null),
    [savePrompt, setSavePrompt] = useState<
      (MaintenanceSettings & { review_reason: string }) | null
    >(null),
    [removePrompt, setRemovePrompt] = useState<{ kind: 'line' | 'sampler'; name: string } | null>(
      null,
    ),
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
      <input
        aria-label="Tambah line"
        value={newLine}
        maxLength={64}
        placeholder="Nomor atau nama line"
        onChange={(event) => setNewLine(event.target.value)}
      />
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
      <input
        aria-label="Tambah sampler"
        placeholder="Nama sampler"
        value={newSampler}
        maxLength={64}
        onChange={(event) => setNewSampler(event.target.value)}
      />
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
        const invalid = validateShiftSchedule(shiftSchedule);
        setScheduleError(invalid);
        if (invalid) return;
        setSavePrompt({
          lines: [...lines].sort((a, b) =>
            a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' }),
          ),
          allowed_samplers: samplers,
          night_rollover_hour: initial.night_rollover_hour,
          ...(initial.shift_schedule ||
          JSON.stringify(shiftSchedule) !== JSON.stringify(DEFAULT_SHIFT_SCHEDULE)
            ? { shift_schedule: shiftSchedule }
            : {}),
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
        </div>
        <div className="field-row">
          <section aria-label="Line aktif">
            <div className="section-heading">
              <h3>Line aktif</h3>
              <div className="choice-add-row">
                <Badge>{lines.length} line</Badge>
                {lineAddControls}
              </div>
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
                      onClick={() => setRemovePrompt({ kind: 'line', name: line })}
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
          <section aria-label="Sampler aktif">
            <div className="section-heading">
              <h3>Sampler aktif</h3>
              <div className="choice-add-row">
                <Badge>{samplers.length} orang</Badge>
                {samplerAddControls}
              </div>
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
                      onClick={() => setRemovePrompt({ kind: 'sampler', name: s })}
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
          <div className="shift-time-grid">
            {(['day', 'night'] as const).map((shift, i) => (
              <fieldset key={shift}>
                <legend>
                  <Clock3 size={17} /> Shift {i + 1}
                </legend>
                {shiftSchedule[shift].map((time, index) => (
                  <Field key={index} label={'Sesi ' + (index + 1)}>
                    <input
                      aria-label={`Shift ${i + 1} · Sesi ${index + 1}`}
                      type="time"
                      value={time}
                      disabled={!admin}
                      required
                      onChange={(event) => {
                        const next = structuredClone(shiftSchedule);
                        next[shift][index] = event.target.value;
                        setShiftSchedule(next);
                        setScheduleError(null);
                      }}
                    />
                  </Field>
                ))}
              </fieldset>
            ))}
          </div>
          <small className="muted">WIB · Jadwal maintenance mengikuti waktu mulai sesi.</small>
        </details>
        {scheduleError && (
          <p role="alert" className="source-note">
            {scheduleError}
          </p>
        )}
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
      {savePrompt && (
        <ConfirmationDialog
          title="Simpan pengaturan?"
          description="Perubahan jadwal berlaku untuk pemeriksaan berikutnya."
          onCancel={() => setSavePrompt(null)}
          onConfirm={() => {
            onSave(savePrompt);
            setSavePrompt(null);
          }}
        />
      )}
      {removePrompt && (
        <ConfirmationDialog
          title={`Hapus ${removePrompt.kind} ${removePrompt.name}?`}
          confirmLabel="Ya, hapus"
          danger
          onCancel={() => setRemovePrompt(null)}
          onConfirm={() => {
            if (removePrompt.kind === 'line')
              setLines(lines.filter((value) => value !== removePrompt.name));
            else setSamplers(samplers.filter((value) => value !== removePrompt.name));
            setRemovePrompt(null);
          }}
        />
      )}
    </form>
  );
}
