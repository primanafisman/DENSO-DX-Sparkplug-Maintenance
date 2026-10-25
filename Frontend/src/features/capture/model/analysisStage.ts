import type { CaptureState } from './captureStore';

export const analysisStages = {
  uploading: 'Mengunggah foto…',
  locating: 'Mencari gauge dan label…',
  queued: 'Menunggu reader lokal…',
  reading: 'Membaca angka / jarum…',
} as const;

export function isAnalyzing(stage: CaptureState['stage']): stage is keyof typeof analysisStages {
  return stage in analysisStages;
}
