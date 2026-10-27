import { ApiError } from './api';

type UserError = { message: string; action?: string };
const reusedPhoto: UserError = {
  message: 'Foto ini sudah digunakan.',
  action: 'Ambil foto baru atau periksa hasil sebelumnya di Riwayat.',
};
const expiredPhoto: UserError = {
  message: 'Foto atau hasil pembacaan telah kedaluwarsa.',
  action: 'Ambil atau unggah foto kembali.',
};
const changedProfile: UserError = {
  message: 'Pengaturan alat telah berubah.',
  action: 'Pilih alat dan baca ulang foto.',
};
const busyReader: UserError = {
  message: 'Pembaca sedang sibuk.',
  action: 'Tunggu sebentar lalu coba lagi.',
};
const messages: Record<string, UserError> = {
  CHECK_NUMBER_CONFLICT: {
    message: 'Nomor pemeriksaan sudah digunakan.',
    action: 'Pilih nomor lain; setiap pemeriksaan harus memiliki nomor yang berbeda.',
  },
  CHECK_NUMBER_INVALID: {
    message: 'Nomor pemeriksaan tidak valid.',
    action: 'Gunakan bilangan bulat dari 1 sampai 10000.',
  },
  EVIDENCE_ALREADY_CONFIRMED: reusedPhoto,
  EVIDENCE_REVIEW_CONFLICT: {
    message: 'Foto ini sudah dikonfirmasi dengan angka berbeda.',
    action: 'Periksa bacaan sebelumnya di Riwayat atau ambil foto baru.',
  },
  MAINTENANCE_OCCURRENCE_COMPLETED: {
    message: 'Alat ini sudah diperiksa pada jadwal ini.',
    action: 'Lihat hasil di Riwayat atau pilih alat yang belum diperiksa.',
  },
  EVIDENCE_OCCURRENCE: {
    message: 'Foto berasal dari jadwal pemeriksaan berbeda.',
    action: 'Ambil foto baru pada jadwal yang aktif.',
  },
  BASELINE_ILLUSTRATIVE_DATA: {
    message: 'Data uji tidak dapat menjadi batas kontrol produksi.',
  },
  ANALYSIS_ALREADY_CONFIRMED: reusedPhoto,
  DUPLICATE_EVIDENCE: {
    message: 'Satu foto hanya untuk satu sampel.',
    action: 'Ambil foto baru untuk setiap sampel.',
  },
  PHOTO_EXPIRED: expiredPhoto,
  ANALYSIS_EXPIRED: expiredPhoto,
  JOB_EXPIRED: expiredPhoto,
  PROFILE_CHANGED: changedProfile,
  CALIBRATION_PROFILE_CHANGED: changedProfile,
  CONFIRMATION_CONFLICT: {
    message: 'Konfirmasi sebelumnya berbeda.',
    action: 'Periksa Riwayat sebelum mengirim ulang.',
  },
  CONTEXT_CONFLICT: {
    message: 'Konteks pemeriksaan berbeda dari foto.',
    action: 'Mulai pemeriksaan pada line dan sesi yang sesuai.',
  },
  EVIDENCE_CONTEXT: {
    message: 'Konteks pemeriksaan berbeda dari foto.',
    action: 'Mulai pemeriksaan pada line dan sesi yang sesuai.',
  },
  CHECK_EQUIPMENT_CONFLICT: {
    message: 'Alat belum terhubung ke pemeriksaan ini.',
    action: 'Pilih alat yang sesuai atau periksa Pengaturan.',
  },
  EQUIPMENT_NOT_WORKING: {
    message: 'Alat berstatus tidak berfungsi.',
    action: 'Pilih alat lain yang berfungsi.',
  },
  INSTRUMENT_UNAVAILABLE: {
    message: 'Alat tidak tersedia.',
    action: 'Pilih alat aktif di Pengaturan.',
  },
  VERIFICATION_REQUIRED: { message: 'Konfirmasi identitas alat dan angka terlebih dahulu.' },
  STANDARD_REQUIRED: {
    message: 'Standar pemeriksaan belum lengkap.',
    action: 'Minta admin melengkapi standar di Pengaturan.',
  },
  VALUE_INVALID: {
    message: 'Angka di luar rentang atau ketelitian alat.',
    action: 'Periksa angka dan satuan pada foto.',
  },
  UPLOAD_LIMIT: {
    message: 'Ukuran foto melebihi batas.',
    action: 'Gunakan foto yang lebih kecil lalu unggah kembali.',
  },
  IMAGE_FORMAT: {
    message: 'Format foto belum didukung.',
    action: 'Gunakan foto JPEG, PNG, atau WebP.',
  },
  QUEUE_FULL: busyReader,
  ANALYSIS_CAPACITY: busyReader,
  PHOTO_CAPACITY: busyReader,
  LOGIN_FAILED: { message: 'Login gagal. Periksa ID dan kata sandi.' },
  INVALID_LOGIN: { message: 'Login gagal. Periksa ID dan kata sandi.' },
  CSRF_INVALID: {
    message: 'Sesi perlu diperbarui.',
    action: 'Muat ulang halaman lalu coba lagi.',
  },
  DRAFT_REPLACED: { message: 'Pemeriksaan telah diganti. Lanjutkan pemeriksaan yang aktif.' },
  SAVE_LOCKED: {
    message: 'Penyimpanan sebelumnya perlu diperiksa.',
    action: 'Periksa Riwayat sebelum mengirim ulang.',
  },
  DEFINITION_VERSION_CONFLICT: {
    message: 'Standar pemeriksaan telah berubah.',
    action: 'Tinjau standar terbaru lalu mulai pemeriksaan kembali.',
  },
};

export function userError(error: unknown): UserError {
  if (!(error instanceof ApiError))
    return { message: error instanceof Error ? error.message : 'Permintaan belum berhasil.' };
  if (messages[error.code]) return messages[error.code];
  if (error.status === 401)
    return { message: 'Sesi telah berakhir.', action: 'Masuk kembali untuk melanjutkan.' };
  if (error.status === 403) return { message: 'Akun Anda tidak memiliki izin untuk tindakan ini.' };
  if (error.status === 404) return { message: 'Data tidak ditemukan.' };
  if (error.status === 409)
    return { message: 'Data telah berubah.', action: 'Muat ulang data lalu periksa kembali.' };
  if (error.status === 413) return messages.UPLOAD_LIMIT;
  if (error.status === 415) return messages.IMAGE_FORMAT;
  if (error.status === 422)
    return {
      message: 'Periksa data yang diisi.',
      action: 'Lengkapi pilihan wajib lalu coba lagi.',
    };
  if (error.status === 429) return busyReader;
  if (error.status >= 500)
    return {
      message: 'Server belum dapat memproses permintaan.',
      action: 'Coba lagi setelah beberapa saat.',
    };
  return {
    message: 'Tidak dapat terhubung ke server.',
    action: 'Periksa koneksi lalu coba lagi.',
  };
}
