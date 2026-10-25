import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, ClipboardList, Wrench, Factory } from 'lucide-react';
import type { MaintenanceDefinition } from '../../../shared/lib/contracts';
import { useSession } from '../../auth/controller/useSession';
import { useSettings } from '../controller/useSettings';
import { DefinitionEditor } from './DefinitionEditor';
import { StandardItems } from './StandardItems';
import { EquipmentPage } from '../../equipment/view/EquipmentPage';
import { newDefinition } from '../model/newDefinition';
import { GeneralSettings } from './GeneralSettings';
import { ConfirmationDialog } from '../../../shared/components/ui/ConfirmationDialog';
import { shiftSlots } from '../model/shiftSchedule';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import {
  Card,
  Button,
  Badge,
  Loading,
  ErrorMessage,
  ErrorDialog,
} from '../../../shared/components/ui';
export function SettingsPage() {
  const state = useSettings(true),
    { user } = useSession(),
    [params, setParams] = useSearchParams(),
    [selected, setSelected] = useState<MaintenanceDefinition | null>(null),
    [savePrompt, setSavePrompt] = useState<(() => void) | null>(null);
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
      <PageHeader title="Pengaturan" icon={<Wrench size={23} />} />
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
                <Badge>
                  {state.catalog.data?.items.filter((d) => d.active !== false).length ?? 0}{' '}
                  pemeriksaan
                </Badge>
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
                  {state.catalog.data?.items
                    .filter((d) => d.active !== false)
                    .map((d) => (
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
          slots={shiftSlots(state.settings.data?.shift_schedule)}
          key={selected.id}
          definition={selected}
          creating={selected.id === 'new'}
          manageEquipment={admin}
          onClose={() => setSelected(null)}
          onSave={(body) =>
            setSavePrompt(
              () => () =>
                selected.id === 'new'
                  ? state.createDefinition.mutate(body, { onSuccess: () => setSelected(null) })
                  : state.saveDefinition.mutate(
                      { id: selected.id, body },
                      { onSuccess: () => setSelected(null) },
                    ),
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
      {savePrompt && (
        <ConfirmationDialog
          title="Simpan pemeriksaan?"
          onCancel={() => setSavePrompt(null)}
          onConfirm={() => {
            savePrompt();
            setSavePrompt(null);
          }}
        />
      )}
      <ErrorDialog error={state.save.error} onClose={() => state.save.reset()} />
    </>
  );
}
