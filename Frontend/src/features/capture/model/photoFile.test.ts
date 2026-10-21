import { it, expect } from 'vitest';
import { snapshotPhoto } from './photoFile';
const bytes = async (file: File) =>
  new Uint8Array(
    await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    }),
  );
it('copies the selected photo bytes into an owned file before the picker is cleared', async () => {
  const original = new File([new Uint8Array([255, 216, 0, 1, 255, 217])], 'gauge.jpg', {
    type: 'image/jpeg',
    lastModified: 123,
  });
  const snapshot = await snapshotPhoto(original);
  expect(snapshot).not.toBe(original);
  expect(snapshot.name).toBe(original.name);
  expect(snapshot.type).toBe(original.type);
  expect(await bytes(snapshot)).toEqual(await bytes(original));
});
it('cancelled or oversized photos never read into memory', async () => {
  const abort = new AbortController();
  abort.abort();
  await expect(snapshotPhoto(new File(['x'], 'x.jpg'), abort.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
  await expect(
    snapshotPhoto(new File([new Uint8Array(16 * 1024 * 1024)], 'large.jpg')),
  ).rejects.toThrow(/15 MB/);
});
