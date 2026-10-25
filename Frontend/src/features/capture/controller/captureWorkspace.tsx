import type { ReactNode } from 'react';
import type { CaptureState } from '../model/captureStore';
import { CaptureContext } from './captureContext';
import { useCaptureFlow } from './useCaptureFlow';
import { isAnalyzing } from '../model/analysisStage';
import { AnalysisProgressDialog } from '../view/AnalysisProgressDialog';

// Keep the in-memory photo workspace alive across authenticated menu routes.
export function CaptureWorkspaceProvider({ children }: { children: ReactNode }) {
  const flow = useCaptureFlow();
  const busy = isAnalyzing(flow.state.stage);
  return (
    <CaptureContext value={flow}>
      <div
        className="capture-workspace-root"
        inert={busy}
        aria-hidden={busy ? true : undefined}
        onClickCapture={(event) => {
          if (busy) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {children}
      </div>
      {isAnalyzing(flow.state.stage) && (
        <AnalysisProgressDialog stage={flow.state.stage} onCancel={flow.engine.invalidate} />
      )}
    </CaptureContext>
  );
}

export function captureResumePath(state: CaptureState) {
  if (state.pending || state.reading || state.reviewDraft) return '/pemeriksaan/konfirmasi';
  if (state.result || state.error) return '/pemeriksaan/hasil';
  return '/pemeriksaan/foto';
}
