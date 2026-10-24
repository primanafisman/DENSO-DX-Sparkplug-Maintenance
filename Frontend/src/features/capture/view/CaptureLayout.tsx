import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
import { InspectionGuidance } from '../../maintenance/view/InspectionGuidance';
export function CaptureLayout() {
  const draft = useInspectionStore((s) => s.draft),
    location = useLocation();
  if (!draft) return <Navigate to="/pemeriksaan" replace />;
  const step = location.pathname.endsWith('foto')
    ? 1
    : location.pathname.endsWith('konfirmasi')
      ? 3
      : 2;
  return (
    <>
      <div className="capture-workspace-bar no-print">
        <div className="capture-steps">
          {['Foto', 'Hasil baca', 'Konfirmasi'].map((s, i) => (
            <span className={step === i + 1 ? 'current' : ''} key={s}>
              <b>{i + 1}</b>
              {s}
            </span>
          ))}
        </div>
        <div className="capture-context">
          <span>Line {draft.context.line}</span>
          <span>{draft.context.sampler}</span>
        </div>
      </div>
      <InspectionGuidance>
        <Outlet />
      </InspectionGuidance>
    </>
  );
}
