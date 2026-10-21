import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useInspectionStore } from '../model/inspectionStore';
import { Card, Status } from '../../../shared/components/ui';
export function InspectionSuccess() {
  const record = useInspectionStore((s) => s.lastRecord);
  if (!record) return <Navigate to="/pemeriksaan" replace />;
  return (
    <Card className="success-card">
      <CheckCircle2 size={56} />
      <h1>Pemeriksaan tersimpan</h1>
      <p>Hasil sudah masuk ke riwayat maintenance.</p>
      <Status value={record.overall_status} />
      <small className="muted">ID {record.id}</small>
      <div className="actions">
        <Link className="button button-primary" to="/pemeriksaan">
          Pemeriksaan baru
        </Link>
        <Link className="button button-secondary" to="/riwayat">
          Lihat riwayat
        </Link>
      </div>
    </Card>
  );
}
