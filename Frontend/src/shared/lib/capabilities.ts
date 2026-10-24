import { read } from './api';

export type RuntimeCapabilities = { demo_reports?: boolean };
export const capabilitiesApi = {
  read: (signal?: AbortSignal) => read<RuntimeCapabilities>('/capabilities', { signal }),
};
