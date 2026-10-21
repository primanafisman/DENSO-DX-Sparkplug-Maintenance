// Own the bytes before clearing/unmounting a native file picker. No resizing or re-encoding.
export async function snapshotPhoto(file: File, signal?: AbortSignal): Promise<File> {
  if (signal?.aborted) throw new DOMException('Pemilihan foto dibatalkan.', 'AbortError');
  if (file.size > 15 * 1024 * 1024)
    throw new Error('Foto melebihi 15 MB. Pilih ukuran foto yang lebih kecil.');
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => signal?.removeEventListener('abort', cancel);
    const cancel = () => {
      reader.abort();
      cleanup();
      reject(new DOMException('Pemilihan foto dibatalkan.', 'AbortError'));
    };
    reader.onload = () => {
      cleanup();
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      cleanup();
      reject(
        new Error('Foto tidak dapat dibaca. Pilih ulang file asli atau gunakan kamera bawaan HP.'),
      );
    };
    reader.onabort = () => {
      cleanup();
      reject(new DOMException('Pemilihan foto dibatalkan.', 'AbortError'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    reader.readAsArrayBuffer(file);
  });
  return new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
}
