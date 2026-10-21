import { it, expect, vi, beforeEach } from 'vitest';
import { createCaptureFlow } from './useCaptureFlow';
import { createCaptureStore } from '../model/captureStore';
import { captureApi } from '../model/api';
import { fixtureInstrument, fixtureDefinition } from '../../../test/fixtures';
import { ApiError } from '../../../shared/lib/api';
import type { Job, Photo, ConfirmedReading, Confirmation } from '../../../shared/lib/contracts';
const profile = {
  kind: 'auto' as const,
  unit: 'MPa' as const,
  minimum: 0,
  maximum: 1,
  decimals: 3,
  tolerance: 0.01,
};
const instrument = fixtureInstrument({ profile, maintenance_check_ids: ['check'] });
const input = {
  definition: fixtureDefinition({ id: 'check', unit: 'MPa' }),
  sample_id: 'n1',
  context: { line: '17', production_date: '2026-10-21', shift: 'day' as const, sampler: 'Ldr' },
  checked_at: '2026-10-21T01:00:00Z',
};
const photo: Photo = {
  image_id: 'p',
  source_hash: 'hash',
  source_width: 800,
  source_height: 1200,
  preview_width: 800,
  preview_height: 1200,
  expires_at: 99999999999,
  context: input.context,
};
const job: Job = {
  job_id: 'j',
  status: 'completed',
  processed: 1,
  total: 1,
  expires_at: 99999999999,
  results: [
    {
      analysis_id: 'a',
      client_id: 'indicator',
      candidate: { readable: true, value: 0, unit: 'MPa', kind: 'digital' },
      validated_prediction: 0,
      confidence: { valid: true, level: 'medium' },
    },
  ],
};
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
});
function setup() {
  const state = createCaptureStore();
  const api = {
    ...captureApi,
    upload: vi.fn(async () => photo),
    discover: vi.fn<typeof captureApi.discover>(async () => ({
      instruments: [
        {
          client_id: 'indicator',
          roi: { x: 0.1, y: 0.1, width: 0.8, height: 0.5 },
          label_roi: { x: 0.1, y: 0.65, width: 0.8, height: 0.15 },
          instrument,
          suggested_profile: profile,
          profile_source: 'registered-equipment' as const,
          requires_confirmation: true as const,
          requires_profile_confirmation: true as const,
          kind_hint: 'digital',
        },
      ],
      warnings: [],
      confidence_calibrated: false as const,
    })),
    instruments: vi.fn(async () => [instrument]),
    submit: vi.fn(async () => job),
    job: vi.fn(async () => job),
    crop: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })),
    confirm: vi.fn(
      async (_body: Confirmation) => ({ id: 'r1', final_value: '0.000' }) as ConfirmedReading,
    ),
  };
  const ready = vi.fn(),
    engine = createCaptureFlow({
      api,
      store: state,
      getInput: () => input,
      onResult: ready,
      sleep: async () => {},
    });
  return { state, api, ready, engine };
}
it('photo selection automatically analyzes and retains valid zero without saving', async () => {
  const { state, api, engine, ready } = setup();
  await engine.upload(new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
  expect(api.submit).toHaveBeenCalledOnce();
  expect(state.getState().result?.validated_prediction).toBe(0);
  expect(ready).toHaveBeenCalled();
  expect(api.confirm).not.toHaveBeenCalled();
  engine.dispose();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it('late results after ROI replacement or route exit cannot overwrite new state', async () => {
  const { state, api, engine } = setup();
  let resolve!: (job: Job) => void;
  api.submit.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const upload = engine.upload(new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
  await vi.waitFor(() => expect(api.submit).toHaveBeenCalled());
  engine.invalidate();
  resolve(job);
  await upload;
  expect(state.getState().result).toBeNull();
  engine.dispose();
  expect(state.getState().file).toBeNull();
});
it('identity/value confirmation is explicit, and uncertain retry uses the same body and ID', async () => {
  const { engine, api } = setup();
  await engine.upload(new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
  await expect(
    engine.confirm({ final_value: '0.000', identity_verified: false, verified: true, reason: '' }),
  ).rejects.toThrow(/identitas/i);
  api.confirm.mockRejectedValueOnce(new ApiError('lost', 0));
  const review = { final_value: '0.000', identity_verified: true, verified: true, reason: '' };
  await expect(engine.confirm(review)).rejects.toThrow('lost');
  await engine.confirm(review);
  expect(api.confirm.mock.calls[1][0]).toEqual(api.confirm.mock.calls[0][0]);
  engine.dispose();
});
it('queue capacity retries only while active and late confirmation cannot revive a disposed flow', async () => {
  const { engine, api, state } = setup();
  api.submit.mockRejectedValueOnce(new ApiError('busy', 429));
  await engine.upload(new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
  expect(api.submit).toHaveBeenCalledTimes(2);
  let finish!: (v: ConfirmedReading) => void;
  api.confirm.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const saving = engine.confirm({
    final_value: '0.000',
    identity_verified: true,
    verified: true,
    reason: '',
  });
  engine.dispose();
  finish({ id: 'saved' } as ConfirmedReading);
  expect(await saving).toBeNull();
  expect(state.getState().reading).toBeNull();
});
it('a label preview failure does not discard a valid measurement', async () => {
  const { engine, api, state } = setup();
  api.crop.mockRejectedValueOnce(new Error('temporary crop unavailable'));
  await engine.upload(new File(['x'], 'x.jpg', { type: 'image/jpeg' }));
  expect(state.getState().result?.validated_prediction).toBe(0);
  expect(state.getState().stage).toBe('ready');
  engine.dispose();
});
it('unresolved label never silently selects the sole linked instrument', async () => {
  const { api, engine, state } = setup();
  api.discover.mockResolvedValueOnce({
    instruments: [
      {
        client_id: 'indicator',
        roi: { x: 0, y: 0, width: 1, height: 1 },
        label_roi: null,
        instrument: null,
        suggested_profile: profile,
        profile_source: 'observed-unit-default-range',
        requires_confirmation: true,
        requires_profile_confirmation: true,
        kind_hint: 'digital',
      },
    ],
    warnings: [],
    confidence_calibrated: false,
  });
  await engine.upload(new File(['x'], 'no-label.jpg', { type: 'image/jpeg' }));
  expect(state.getState().instrument).toBeNull();
  expect(state.getState().result?.validated_prediction).toBe(0);
  engine.dispose();
});
