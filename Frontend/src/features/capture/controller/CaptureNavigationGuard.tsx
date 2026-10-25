import { useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { captureStore } from '../model/captureStore';
import { isAnalyzing } from '../model/analysisStage';

// Read synchronously so the flow's ready -> navigate transition is never blocked by a stale render.
export function CaptureNavigationGuard() {
  const blocker = useBlocker(useCallback(() => isAnalyzing(captureStore.getState().stage), []));
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);
  return null;
}
