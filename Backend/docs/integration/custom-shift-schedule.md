# Jadwal shift yang dapat diatur

Admin memakai `PUT /api/v1/maintenance/settings`. Tambahan opsional:

```json
{
  "lines": ["1", "2"],
  "allowed_samplers": ["Ldr"],
  "night_rollover_hour": 12,
  "shift_schedule": {
    "day": ["07:45", "12:45"],
    "night": ["21:15", "01:15"]
  }
}
```

Waktu adalah WIB, formatHH:mm, tepat dua per shift. Empat waktu harus berbeda dan berurutan dalam satu siklus yang dimulai pada day[0]: day[0] → day[1] → night[0] → night[1]. Shift dapat melewati tengah malam. Bila shift_schedule ada, tanggal produksi berganti tepat pada day[0], termasuk menit. night_rollover_hour dipertahankan untuk kompatibilitas klien lama; UI baru menyimpan nilainya tanpa menampilkan kolom lama. Klien yang menghilangkan shift_schedule pada update tidak menghapus jadwal yang sudah disimpan.

Gunakan label dan start_time dari `GET /api/v1/maintenance/schedule`. ID day-0745/day-1245/night-2115/night-0115 adalah identitas logis permanen: **jangan mengurai jam dari ID**. Misalnya day-0745 dapat mempunyai start_time08:10 setelah konfigurasi diubah. Slot di respons diurutkan berdasarkan jam kalender.

Per_shift memakai awal masing-masing shift; daily/weekly memakai awal produksi day[0]; every_4_hours mengikuti sesi server seperti sebelumnya; occurrence_rule.slot_ids mengikuti waktu terkini dari identitas logis yang dipilih. Panduan kertas interval_guide tetap merupakan deskripsi sumber, bukan pengganti aturan sesi.

Record baru menyimpan occurrence_snapshot serta settings_snapshot dan schedule_snapshot. Hasil lama tidak dihitung ulang menggunakan konfigurasi baru. Foto membekukan pengaturan saat upload; confirmation memakai kejadian yang difoto. Jika konfigurasi mengubah kejadian antara foto dan save, EVIDENCE_OCCURRENCE meminta bukti baru. Riwayat, hasil ukur dan batas penerimaan lama tidak diubah. Data JSON yang sudah ada mendukung tambahan ini tanpa migrasi tabel.

Frontend menginvalidasi cache settings, schedule, maintenance-due dan summary setelah pengaturan berhasil disimpan. Bentuk lengkap tipe dan kontrak tersedia dalam contracts/frontend-types.ts dan contracts/openapi.yaml.
