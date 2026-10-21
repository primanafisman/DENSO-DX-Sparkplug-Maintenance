import { it, expect, vi } from 'vitest';
import { createCameraSession } from './camera';
it('closing or cancelling a delayed camera releases every acquired track', async () => {
  const stop = vi.fn(),
    track = { stop, getCapabilities: () => ({}), getConstraints: () => ({}) },
    stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = {
    videoWidth: 800,
    srcObject: null,
    play: async () => {},
  } as unknown as HTMLVideoElement;
  const session = createCameraSession(async () => stream as unknown as MediaStream);
  await session.open(video);
  session.close();
  expect(stop).toHaveBeenCalledOnce();
  let resolve!: (s: MediaStream) => void;
  const delayed = createCameraSession(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const opening = delayed.open(video);
  delayed.close();
  resolve(stream as unknown as MediaStream);
  await expect(opening).rejects.toMatchObject({ name: 'AbortError' });
  expect(stop).toHaveBeenCalledTimes(2);
});
