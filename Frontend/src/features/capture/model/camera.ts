// Browser-only capture helpers retained from the verified backend smoke interface.
import { captureCamera, configureCamera } from './legacy-camera.js';
export function createCameraSession(
  getUserMedia = (constraints: MediaStreamConstraints) =>
    navigator.mediaDevices.getUserMedia(constraints),
) {
  let stream: MediaStream | null = null,
    video: HTMLVideoElement | null = null,
    generation = 0,
    abort = new AbortController();
  function close() {
    generation++;
    abort.abort();
    abort = new AbortController();
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (video) video.srcObject = null;
    video = null;
  }
  return {
    close,
    async open(element: HTMLVideoElement) {
      close();
      const id = generation;
      const acquired = await getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (id !== generation) {
        acquired.getTracks().forEach((t) => t.stop());
        throw new DOMException('Kamera dibatalkan', 'AbortError');
      }
      stream = acquired;
      video = element;
      element.srcObject = stream;
      try {
        await configureCamera(stream.getVideoTracks()[0]);
        await element.play();
      } catch (error) {
        close();
        throw error;
      }
    },
    async take(monitor: boolean, onStatus: (message: string) => void) {
      if (!video || !stream) throw new Error('Buka kamera dan tunggu fokus.');
      const result = (await captureCamera({
        video,
        track: stream.getVideoTracks()[0],
        monitor,
        signal: abort.signal,
        onStatus,
      })) as unknown as {
        blob: Blob;
        quality: { score: number; contrast: number; sharpness: number; brightness: number };
      };
      const file = new File([result.blob], 'capture-' + Date.now() + '.jpg', {
        type: result.blob.type || 'image/jpeg',
      });
      return { file, quality: result.quality };
    },
  };
}
