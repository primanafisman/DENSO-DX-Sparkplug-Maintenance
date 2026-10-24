import type { ReactNode } from 'react';
import type { CaptureState } from '../model/captureStore';
import { CaptureContext } from './captureContext';
import { useCaptureFlow } from './useCaptureFlow';

// Keep the in-memory photo workspace alive across authenticated menu routes.
export function CaptureWorkspaceProvider({ children }: { children: ReactNode }) {
  const flow = useCaptureFlow();
  return <CaptureContext value={flow}>{children}</CaptureContext>;
}

export function captureResumePath(state: CaptureState) {
  if (state.pending || state.reading || state.reviewDraft) return '/pemeriksaan/konfirmasi';
  if (state.result || state.error) return '/pemeriksaan/hasil';
  return '/pemeriksaan/foto';
}
