# Changelog

## 2026-10-16 · Relokasi Backend dan instalasi lokal

- Launcher mencari Node22 pada folder aplikasi/induk yang bertingkat dan menyimpan lokasi runtime yang telah diverifikasi setelah setup berhasil.
- Menormalkan path executable agar pencatatan kepemilikan proses tetap cocok saat NODE_BIN menggunakan garis miring ke depan.
- Setup mendeteksi Python3.12 melalui py/PATH atau interpreter lokal yang sehat; virtualenv yang rusak dapat diperbaiki tanpa menghapus data aplikasi.
- Panduan membedakan folder Backend pada komputer ini dan instalasi bersih ke lokasi pilihan di komputer Windows lain.

## 2026-10-15 · Digital display dari foto HP

- OCR display LED yang sudah diluruskan mempertahankan orientasi gambar; klasifikasi orientasi label umum tetap aktif dan status engine dipulihkan setelah setiap pemanggilan.
- Pengukuran titik LCD memakai tambahan threshold relatif terhadap pencahayaan lokal, mempertahankan konteks kaca saat auto-crop, dan menolak titik ganda yang persisten.
- Kaca LCD berwarna hijau tidak langsung dianggap LED jika posisi titik/digit LCD dapat dibuktikan dari piksel.
- Tulisan tombol gabungan seperti ORIGIN ON/OFF diabaikan sebagai kandidat nama; kode/nama/alias master yang cocok tepat tetap dipertahankan.
- Revisi mesin CV menjadi hybrid-cv-v0.2.4. Payload API tidak berubah, model OCR tetap sama, dan konfirmasi operator tetap diperlukan.
- Pencocokan waktu proses launcher memakai UTC ticks yang tepat pada PowerShell5/7, termasuk saat JSON menjadi DateTime. Stop/restart tetap memeriksa executable, waktu lahir dan ancestry proses.

## 1.0.0 · 2026-10-14

- Reconstructed Node public API and private local Python CV engine; removed cloud inference from runtime.
- Added protected workflow, adapter database boundary, immutable calibration/profile/evidence snapshots and maintenance context binding.
- Preserved44 reviewed definitions, versioned configuration and operator confirmation.
- Added bounded history, CSV export, source-only packaging, install/config guide and frontend contracts.
- Added operation-local source decode and shared bounded OCR reuse while retaining recognition evidence gates.
## 2026-10-15 · Perbaikan alur uji lokal

- Otomatis membaca foto setelah upload/capture, dengan tahap proses dan pembatalan hasil UI yang sudah tidak relevan.
- Mempertahankan ROI label terpisah, memprioritaskan profil master alat, dan menampilkan kedua crop sebelum konfirmasi.
- Memilih empat slot shift berdasarkan server WIB; menambahkan endpoint jadwal dan kontrak frontend.
- Menyediakan HTTPS lokal opsional untuk bingkai gauge + label di kamera HP, dengan panduan CA dan setup transfer.
- Password dummy lokal diperbarui sesuai permintaan operator; file akses tetap di runtime komputer ini.

## 2026-10-15 · Crop HP dan pengambilan kamera

- Mengembalikan crop dengan drag, sudut resize, tombol arah/ukuran, serta zoom/pan foto untuk gauge dan label terpisah.
- Memetakan bingkai gauge dan nama ke area video aktual, dengan label di bawah gauge.
- Memakai foto still beresolusi perangkat jika didukung, fokus kontinu berbasis kapabilitas, dan satu foto terpilih dari burst pendek untuk uji monitor.
- Menjaga preview lama dan sesi kamera yang sudah ditutup agar tidak muncul kembali; mempertahankan presisi ROI asli.
- Mengabaikan nama file viewer sebagai label alat jika tidak cocok tepat dengan master. Pembaca angka/jarum dan ambang validasi tidak dilonggarkan.

