import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from 'zustand';
import { captureStore } from '../../capture/model/captureStore';
import { captureResumePath } from '../../capture/controller/captureWorkspace';
import {
  Camera,
  Upload,
  ArrowRight,
  ClipboardCheck,
  CheckCircle2,
  Clock3,
  SlidersHorizontal,
} from 'lucide-react';
import { useSession } from '../../auth/controller/useSession';
import { useSettings } from '../../settings/controller/useSettings';
import { useInspection, useMaintenanceDue } from '../controller/useInspection';
import { inspectionSampleProgress } from '../model/sampleProgress';
import { InspectionContextForm } from './InspectionContextForm';
import type { ContextSelection } from './InspectionContextForm';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import {
  compareInspections,
  inspectionLabel,
  inspectionNumber,
} from '../../../shared/lib/inspectionIdentity';
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
    capture = useStore(captureStore),
    [selection, setSelection] = useState<ContextSelection>(
      state.draft?.context ?? { line: '', sampler: '' },
    ),
    [replaceDraft, setReplaceDraft] = useState<null | (() => void)>(null),
    [target, setTarget] = useState(''),
    [q, setQ] = useState(''),
    [kind, setKind] = useState(''),
    [requirement, setRequirement] = useState(''),
    [group, setGroup] = useState('');
  const due = useMaintenanceDue(selection.line, selection.product_type_id);
  const defs = [...(settings.catalog.data?.items ?? [])].sort(compareInspections),
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
      due.data?.items.some(
        (i) => i.definition_id === d.id && (i.state === 'pending' || i.state === 'completed'),
      ) === true &&
      !due.isError &&
      !due.expired &&
      (!q || inspectionLabel(d).toLowerCase().includes(q.toLowerCase())) &&
      (!kind || d.input_method === kind) &&
      (!target || (d.inspection_target ?? 'unclassified') === target) &&
      (!requirement || d.requirement_tags.includes(requirement)) &&
      (!group || d.group === group),
  );
  const start = (...args: Parameters<typeof state.start>) => {
    const run = () => state.start(...args);
    if (state.draft) setReplaceDraft(() => run);
    else run();
  };
  const countsReady =
    !!selection.line &&
    !!due.data &&
    !due.isError &&
    !due.expired &&
    (!state.schedule.data || due.data.schedule.starts_at === state.schedule.data.starts_at);
  return (
    <div className="inspection-page">
      <PageHeader
        title="Pemeriksaan"
        icon={<ClipboardCheck size={23} />}
        actions={
          selection.line && (
            <div className="status-strip" aria-label="Progres pemeriksaan">
              <span
                className="status-chip status-chip-ok"
                role="status"
                aria-label={(countsReady ? due.data!.completed_count : '—') + ' Selesai'}
              >
                <CheckCircle2 size={18} />
                <strong>{countsReady ? due.data!.completed_count : '—'}</strong> Selesai
              </span>
              <span
                className="status-chip status-chip-pending"
                role="status"
                aria-label={(countsReady ? due.data!.pending_count : '—') + ' Tersisa'}
              >
                <Clock3 size={18} />
                <strong>{countsReady ? due.data!.pending_count : '—'}</strong> Tersisa
              </span>
            </div>
          )
        }
      />
      <Card className="inspection-entry">
        {settings.settings.data && (
          <InspectionContextForm
            settings={settings.settings.data}
            schedule={state.schedule.data}
            value={selection}
            onChange={setSelection}
          />
        )}
        <ErrorMessage error={settings.settings.error ?? state.schedule.error} />
        <div className="quick-capture">
          <div className="capture-heading">
            <span className="capture-symbol">
              <Camera size={27} />
            </span>
            <h2>Input otomatis</h2>
          </div>
          <div className="actions header-actions">
            <Button disabled={!canWrite} onClick={() => start(null, selection, 'camera')}>
              <Camera size={19} /> Buka kamera
            </Button>
            <Button
              variant="secondary"
              disabled={!canWrite}
              onClick={() => start(null, selection, 'upload')}
            >
              <Upload size={19} /> Upload gambar
            </Button>
          </div>
        </div>
      </Card>
      {state.draft && (
        <Card className="resume-banner">
          <div>
            <strong>
              {state.draft.definition ? inspectionLabel(state.draft.definition) : 'Foto alat'}
            </strong>
            <span>
              {' '}
              · Line {state.draft.context.line} · {state.draft.observations.length} sampel
            </span>
          </div>
          <Link
            className="button button-secondary"
            to={
              state.draft.definition?.input_method === 'ok_ng'
                ? '/pemeriksaan/visual'
                : captureResumePath(capture)
            }
          >
            Lanjutkan pemeriksaan <ArrowRight size={16} />
          </Link>
        </Card>
      )}
      <Card className="inspection-list-panel">
        <div className="section-heading">
          <h2>Daftar pemeriksaan</h2>
          <div className="header-actions">
            <Field label="Cari pemeriksaan">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nomor atau nama pemeriksaan"
              />
            </Field>
            <details className="filter-disclosure">
              <summary>
                <SlidersHorizontal size={17} /> Filter
              </summary>
              <div className="filter-popover">
                <Field label="Sasaran pemeriksaan">
                  <select value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">Semua pemeriksaan</option>
                    <option value="machine">Mesin / line</option>
                    <option value="product">Sampling produk sparkplug</option>
                    <option value="unclassified">Belum diklasifikasikan</option>
                  </select>
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
            </details>
          </div>
        </div>
        {user?.role === 'Viewer' && <Badge>Hanya lihat</Badge>}
        <ErrorMessage error={due.error ?? settings.catalog.error} />
        {due.isError && (
          <Button variant="secondary" onClick={() => due.refetch()}>
            Coba lagi
          </Button>
        )}
        {!selection.line && (
          <div className="compact-empty">
            <ClipboardCheck size={24} />
            <strong>Pilih line</strong>
          </div>
        )}
        {settings.catalog.isPending || (!!selection.line && (due.isPending || due.expired)) ? (
          <Loading />
        ) : (
          <div className="inspection-list">
            {filtered.map((d) => {
              const dueItem = due.data!.items.find((item) => item.definition_id === d.id)!;
              const progress = inspectionSampleProgress(d, state.draft, selection, dueItem);
              const completed = progress.saved;
              return (
                <article
                  className={
                    'inspection-option' + (completed ? ' inspection-option-completed' : '')
                  }
                  key={d.id}
                >
                  <div
                    className={`check-number check-number--${progress.state}`}
                    aria-label={`${inspectionNumber(d) ?? 'Pemeriksaan'}: ${completed ? 'pemeriksaan selesai' : `${progress.filled} dari ${progress.total} sampel terisi`}`}
                  >
                    {inspectionNumber(d) ?? <ClipboardCheck size={20} />}
                  </div>
                  <div className="inspection-option-body">
                    <h3>{d.name}</h3>
                    <div className="inspection-facts">
                      {completed && (
                        <span className="inspection-completed-status" role="status">
                          <CheckCircle2 size={15} aria-hidden="true" /> Selesai
                        </span>
                      )}
                      <span>
                        {d.input_method === 'ok_ng'
                          ? 'OK / NG'
                          : d.input_method === 'photo_difference'
                            ? 'Foto sebelum / sesudah'
                            : 'Foto'}
                      </span>
                      <span>{d.sample_count} sampel</span>
                      {progress.filled > 0 && (
                        <span className={`sample-progress sample-progress--${progress.state}`}>
                          {progress.filled}/{progress.total} sampel terisi
                          {!completed && progress.filled === progress.total
                            ? ' · Belum disimpan'
                            : ''}
                        </span>
                      )}
                      {!!dueItem.equipment?.length && (
                        <span className="tool-progress">
                          {dueItem.equipment.filter((item) => item.state === 'completed').length}/
                          {dueItem.equipment.length} alat
                        </span>
                      )}
                      <span>{d.interval_guide.description}</span>
                    </div>
                    <details className="inspection-guide">
                      <summary>Standar & metode</summary>
                      <ul>
                        {d.requirements.length ? (
                          d.requirements.map((r) => <li key={r.id}>{r.label}</li>)
                        ) : (
                          <li>{d.standard_text}</li>
                        )}
                      </ul>
                      {d.limits && (
                        <strong>
                          {d.limits.minimum}–{d.limits.maximum} {d.unit}
                        </strong>
                      )}
                      <p>{d.method_text}</p>
                      {d.review_notes.map((n) => (
                        <p key={n} className="source-note">
                          {n}
                        </p>
                      ))}
                    </details>
                  </div>
                  <Button
                    variant="secondary"
                    aria-label={(completed ? 'Selesai ' : 'Mulai ') + d.name}
                    disabled={!canWrite || completed}
                    onClick={() => start(d, selection)}
                  >
                    {completed ? (
                      'Selesai'
                    ) : (
                      <>
                        Mulai <ArrowRight size={16} />
                      </>
                    )}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
        {selection.line && !due.isPending && !due.isError && !due.expired && !filtered.length && (
          <div className="compact-empty">
            <CheckCircle2 size={25} />
            <strong>{due.data?.pending_count === 0 ? 'Selesai' : 'Tidak ada hasil'}</strong>
          </div>
        )}
      </Card>
      <ErrorDialog error={state.error} onClose={state.clearError} />
      {replaceDraft && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Mulai pemeriksaan baru"
          >
            <h2>Ganti pemeriksaan?</h2>
            <p>Progres yang belum disimpan akan diganti.</p>
            <div className="actions">
              <Button variant="secondary" onClick={() => setReplaceDraft(null)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  replaceDraft();
                  setReplaceDraft(null);
                }}
              >
                Mulai baru
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
