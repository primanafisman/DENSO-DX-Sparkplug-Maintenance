import { createContext, useContext } from 'react';
import type { useCaptureFlow } from './useCaptureFlow';
export const CaptureContext = createContext<ReturnType<typeof useCaptureFlow> | null>(null);
export function useCapture() {
  const value = useContext(CaptureContext);
  if (!value) throw new Error('Capture layout is required.');
  return value;
}
