import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { CaptureContext } from '../controller/captureContext';
import { useCaptureFlow } from '../controller/useCaptureFlow';
import { useInspectionStore } from '../../maintenance/model/inspectionStore';
export function CaptureLayout() {
  const flow = useCaptureFlow(),
    draft = useInspectionStore((s) => s.draft),
    location = useLocation();
  if (!draft) return <Navigate to="/pemeriksaan" replace />;
  const step = location.pathname.endsWith('foto')
    ? 1
    : location.pathname.endsWith('konfirmasi')
      ? 3
      : 2;
  return (
    <CaptureContext.Provider value={flow}>
      <div className="capture-steps no-print">
        {['Foto', 'Hasil baca', 'Konfirmasi'].map((s, i) => (
          <span className={step === i + 1 ? 'current' : ''} key={s}>
            <b>{i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      <Outlet />
    </CaptureContext.Provider>
  );
}
