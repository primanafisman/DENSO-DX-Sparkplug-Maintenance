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
      <div className="capture-steps no-print">
        {['Foto', 'Hasil baca', 'Konfirmasi'].map((s, i) => (
          <span className={step === i + 1 ? 'current' : ''} key={s}>
            <b>{i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      <InspectionGuidance>
        <Outlet />
      </InspectionGuidance>
    </>
  );
}
