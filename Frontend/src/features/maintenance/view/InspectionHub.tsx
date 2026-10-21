import { useState, useEffect } from 'react';
import { Camera, Upload, ArrowRight, ClipboardCheck } from 'lucide-react';
import { useSession } from '../../auth/controller/useSession';
import { useSettings } from '../../settings/controller/useSettings';
import { useInspection, useMaintenanceDue } from '../controller/useInspection';
import { InspectionContextForm } from './InspectionContextForm';
import type { ContextSelection } from './InspectionContextForm';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import {
  Card,
  Field,
  Button,
  Badge,
  Loading,
  ErrorMessage,
  ErrorDialog,
} from '../../../shared/components/ui';
export function InspectionHub() {
  const state = useInspection(),
    { user } = useSession(),
    settings = useSettings(),
    [selection, setSelection] = useState<ContextSelection>({ line: '', sampler: '' }),
    [q, setQ] = useState(''),
    [kind, setKind] = useState(''),
    [requirement, setRequirement] = useState(''),
    [group, setGroup] = useState('');
  const due = useMaintenanceDue(selection.line, selection.product_type_id);
  const defs = settings.catalog.data?.items ?? [],
    canWrite =
      (user?.role === 'Admin' || user?.role === 'Operator') &&
      !!settings.settings.data?.lines.includes(selection.line) &&
      !!settings.settings.data?.allowed_samplers.includes(selection.sampler);
  useEffect(() => {
    const configured = settings.settings.data;
    if (!configured) return;
    setSelection((old) => ({
      ...old,
      line: configured.lines.includes(old.line)
        ? old.line
        : configured.lines.length === 1
          ? configured.lines[0]
          : '',
      sampler: configured.allowed_samplers.includes(old.sampler)
        ? old.sampler
        : configured.allowed_samplers.length === 1
          ? configured.allowed_samplers[0]
          : '',
    }));
  }, [settings.settings.data]);
  const filtered = defs.filter(
    (d) =>
      !!selection.line &&
      due.data?.items.some((i) => i.definition_id === d.id && i.state === 'pending') === true &&
      !due.isError &&
      (!q || d.name.toLowerCase().includes(q.toLowerCase())) &&
      (!kind || d.input_method === kind) &&
      (!requirement || d.requirement_tags.includes(requirement)) &&
      (!group || d.group === group),
  );
  return (
    <>
      <PageHeader
        title="Pemeriksaan"
        description="Pilih konteks kerja, lalu mulai pemeriksaan atau ambil foto alat."
      />
      <Card>
        <h2 className="section-title">Konteks pemeriksaan</h2>
        {settings.settings.data && (
          <InspectionContextForm
            settings={settings.settings.data}
            schedule={state.schedule.data}
            value={selection}
            onChange={setSelection}
          />
        )}
        <ErrorMessage error={settings.settings.error ?? state.schedule.error} />
      </Card>
      <div className="quick-capture">
        <div>
          <span className="eyebrow">INPUT OTOMATIS</span>
          <h2>Mulai dari foto alat ukur</h2>
          <p>Angka dan label dicocokkan ke peralatan terdaftar. Hasil ditinjau sebelum disimpan.</p>
        </div>
        <div className="actions">
          <Button
            disabled={!canWrite || !selection.line || !selection.sampler}
            onClick={() => state.start(null, selection, 'camera')}
          >
            <Camera size={20} />
            Buka kamera
          </Button>
          <Button
            variant="secondary"
            disabled={!canWrite || !selection.line || !selection.sampler}
            onClick={() => state.start(null, selection, 'upload')}
          >
            <Upload size={19} />
            Upload gambar
          </Button>
        </div>
      </div>
      <Card>
        <div className="row between section-title">
          <h2>Daftar pemeriksaan</h2>
          <Badge>{due.data?.pending_count ?? 0} belum diperiksa</Badge>
        </div>
        {!canWrite && (
          <p className="info-note">
            Akun Viewer dapat membaca panduan. Pengisian membutuhkan Operator atau Admin.
          </p>
        )}
        <div className="filters">
          <Field label="Cari pemeriksaan">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nama pemeriksaan"
            />
          </Field>
          <Field label="Kelompok">
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Semua proses</option>
              {[...new Set(defs.map((d) => d.group))].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Metode input">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Semua metode</option>
              <option value="ok_ng">OK / NG</option>
              <option value="photo">Angka foto</option>
              <option value="photo_difference">Before / after</option>
            </select>
          </Field>
          <Field label="Persyaratan">
            <select value={requirement} onChange={(e) => setRequirement(e.target.value)}>
              <option value="">Semua persyaratan</option>
              {[
                ...new Map(
                  defs.flatMap((d) => d.requirements.map((r) => [r.id, r.label] as const)),
                ).entries(),
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {!selection.line && (
          <p className="info-note">Pilih line untuk melihat pemeriksaan yang belum selesai.</p>
        )}
        {selection.line && due.data && (
          <p className="muted">
            {due.data.completed_count} pemeriksaan sudah selesai pada jadwal ini. Item muncul
            kembali saat jadwal berikutnya; hasil OK / NG tetap ada di Riwayat.
          </p>
        )}
        <ErrorMessage error={due.error} />
        {due.isError && (
          <Button variant="secondary" onClick={() => due.refetch()}>
            Muat ulang jadwal
          </Button>
        )}
        {selection.line && due.data?.pending_count === 0 && !due.isError && (
          <p className="info-note">
            Semua pemeriksaan pada jadwal ini sudah selesai atau belum waktunya.
          </p>
        )}
        {settings.catalog.isPending || (!!selection.line && due.isPending) ? (
          <Loading />
        ) : (
          <div className="inspection-list">
            {filtered.map((d) => (
              <article className="inspection-option" key={d.id}>
                <div className="check-number">
                  {d.source_number ?? <ClipboardCheck size={20} />}
                </div>
                <div className="inspection-option-body">
                  <div className="row wrap">
                    <h3>{d.name}</h3>
                    <Badge>
                      {d.input_method === 'ok_ng'
                        ? 'OK / NG'
                        : d.input_method === 'photo_difference'
                          ? 'Before / after'
                          : 'Angka foto'}
                    </Badge>
                  </div>
                  <p>{d.standard_text}</p>
                  <small className="muted">
                    {d.tool} · {d.interval_guide.description} · {d.sample_count} sampel
                  </small>
                  <details>
                    <summary>Persyaratan dan panduan</summary>
                    <p>{d.method_text}</p>
                    {d.requirements.map((r) => (
                      <p key={r.id}>• {r.label}</p>
                    ))}
                    <p>{d.interval_guide.note}</p>
                    {d.review_notes.map((n) => (
                      <p key={n} className="source-note">
                        {n}
                      </p>
                    ))}
                  </details>
                </div>
                <Button
                  variant="secondary"
                  aria-label={'Mulai ' + d.name}
                  disabled={!canWrite || !selection.line || !selection.sampler}
                  onClick={() => state.start(d, selection)}
                >
                  Mulai
                  <ArrowRight size={16} />
                </Button>
              </article>
            ))}
          </div>
        )}
      </Card>
      <ErrorDialog error={state.error} onClose={state.clearError} />
    </>
  );
}
