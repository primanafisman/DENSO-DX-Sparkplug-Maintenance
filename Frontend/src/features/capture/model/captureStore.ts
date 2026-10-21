import { createStore } from 'zustand/vanilla';
import type {
  Photo,
  Instrument,
  Profile,
  ROI,
  AnalysisResult,
  Discovery,
  Confirmation,
  ConfirmedReading,
} from '../../../shared/lib/contracts';
export type CaptureState = {
  file: File | null;
  photo: Photo | null;
  sourceUrl: string;
  gaugeUrl: string;
  labelUrl: string;
  instruments: Instrument[];
  discovery: Discovery | null;
  proposalIndex: number;
  instrument: Instrument | null;
  profile: Profile | null;
  roi: ROI;
  label_roi: ROI | null;
  result: AnalysisResult | null;
  stage: 'idle' | 'uploading' | 'locating' | 'queued' | 'reading' | 'ready' | 'error';
  error: unknown;
  pending: Confirmation | null;
  reading: ConfirmedReading | null;
  generation: number;
};
const initial = (): CaptureState => ({
  file: null,
  photo: null,
  sourceUrl: '',
  gaugeUrl: '',
  labelUrl: '',
  instruments: [],
  discovery: null,
  proposalIndex: 0,
  instrument: null,
  profile: null,
  roi: { x: 0, y: 0, width: 1, height: 1 },
  label_roi: null,
  result: null,
  stage: 'idle',
  error: null,
  pending: null,
  reading: null,
  generation: 0,
});
export const createCaptureStore = () => createStore<CaptureState>(() => initial());
export const captureStore = createCaptureStore();
