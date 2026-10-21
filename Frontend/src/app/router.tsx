import { lazy } from 'react';
const SpcReportPage = lazy(() =>
  import('../features/history/view/SpcReportPage').then((m) => ({ default: m.SpcReportPage })),
);
const SummaryPage = lazy(() =>
  import('../features/dashboard/view/SummaryPage').then((m) => ({ default: m.SummaryPage })),
);
import { HistoryPage } from '../features/history/view/HistoryPage';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { CaptureLayout } from '../features/capture/view/CaptureLayout';
import { CapturePage } from '../features/capture/view/CapturePage';
import { ResultPage } from '../features/capture/view/ResultPage';
import { RoiPage } from '../features/capture/view/RoiPage';
import { ConfirmPage } from '../features/capture/view/ConfirmPage';
import { InspectionHub } from '../features/maintenance/view/InspectionHub';
import { VisualCheckPage } from '../features/maintenance/view/VisualCheckPage';
import { InspectionSuccess } from '../features/maintenance/view/InspectionSuccess';
import { EquipmentPage } from '../features/equipment/view/EquipmentPage';
import { SettingsPage } from '../features/settings/view/SettingsPage';
import type { Role } from '../shared/lib/contracts';
import { useSession } from '../features/auth/controller/useSession';
import { LoginPage } from '../features/auth/view/LoginPage';
import { AppShell } from '../shared/components/layout/AppShell';

import { Loading, Empty } from '../shared/components/ui';
export function RequireRole({ roles }: { roles?: Role[] }) {
  const session = useSession();
  if (session.status === 'loading') return <Loading />;
  if (!session.user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(session.user.role))
    return (
      <Empty
        title="Akses terbatas"
        description="Akun Anda tidak memiliki izin untuk tindakan ini."
      />
    );
  return <Outlet />;
}
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireRole />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <SummaryPage /> },
          { path: 'pemeriksaan', element: <InspectionHub /> },
          { path: 'pemeriksaan/visual', element: <VisualCheckPage /> },
          { path: 'pemeriksaan/selesai', element: <InspectionSuccess /> },
          {
            element: <RequireRole roles={['Admin', 'Operator']} />,
            children: [
              {
                element: <CaptureLayout />,
                children: [
                  { path: 'pemeriksaan/foto', element: <CapturePage /> },
                  { path: 'pemeriksaan/hasil', element: <ResultPage /> },
                  { path: 'pemeriksaan/crop', element: <RoiPage /> },
                  { path: 'pemeriksaan/konfirmasi', element: <ConfirmPage /> },
                ],
              },
            ],
          },
          { path: 'riwayat', element: <HistoryPage /> },
          { path: 'riwayat/:definitionId', element: <SpcReportPage /> },
          { path: 'peralatan', element: <EquipmentPage /> },
          { path: 'pengaturan', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <Empty title="Halaman tidak ditemukan" description="Gunakan menu utama untuk kembali." />
    ),
  },
]);
