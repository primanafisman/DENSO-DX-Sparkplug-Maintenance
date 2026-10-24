# Integrasi frontend

Endpoint publik `/api/v1`; dokumentasi lengkap pada `contracts/openapi.yaml` (JSON adalah subset YAML), tipe TypeScript dan contoh client. Database/tabel/private Python tidak menjadi kontrak frontend.

Flow: login → csrf → context/line → upload multipart → discovery → periksa ROI/label/equipment → submit job → poll → verifikasi → readings/confirm → maintenance/records. `MaintenanceClient` memakai `credentials:include`; mutasi cookie mengirim `X-CSRF-Token`. Sistem/Postman bisa memakai Bearer dari auth/token. Tidak menyimpan JWT ke browser localStorage.

Foto berupa field `image`; `context` merupakan string JSON `{line,production_date,shift,sampler}`. MIME JPEG/PNG/WebP, maksimum15MiB/20MP; EXIF dikoreksi di server, source_hash memakai byte asli. ROI normalized0–1 relatif original yang sudah diorientasi; preview letterbox harus dipetakan oleh frontend. Minimum crop32×32 pixel sumber.

Discovery kini mengembalikan `suggested_profile`, `profile_source`, `observed_unit`, `observed_decimals` dan `requires_profile_confirmation:true`. Master terdaftar selalu menjadi sumber profil yang berwenang. Untuk alat belum terdaftar, jenis display/satuan OCR menyediakan profil awal dengan range default; jangan menyebutnya kalibrasi fisik. Gunakan profil proposal untuk job, lalu operator memilih/master-register alat dan memeriksa satuan/range sebelum konfirmasi. LCD otomatis diarahkan ke reader digital; analog keluarga0–1MPa ke reader analog.

Discovery memberi beberapa crop indikator/label, observed unit/decimals dan kandidat master. Label parsial/tidak unik merupakan saran; operator memilih nama. Daftar alat di database dipakai lebih dahulu. Satu job1–12 ROI dengan client_id unik. Gunakan profil alat terbaru; foto/ROI/profil/kalibrasi baru memerlukan analisis baru. Temp IDs TTL900s; queued/running dipoll; completed dapat berisi hasil unreadable untuk koreksi operator. failed/expired adalah terminal, tidak dipoll tanpa akhir.

Konfirmasi wajib analysis_id publik, instrument_id, final_value, identity_verified, verified, context, check_id, sample_key, reason bila dikoreksi/tidak terverifikasi, confirmation_id unik. Prediction/confidence/actor dikendalikan server, tidak dikirim ulang dari browser. Untuk difference, sample_key adalah `n1:before`/`n1:after`. Retry dengan ID/body sama idempotent. Satu analysis terikat ke nilai/context/check/sample yang dikonfirmasi; ID baru tidak membebaskan ikatan ini. Pengukuran berikutnya untuk alat yang sama membutuhkan foto sumber baru: recrop atau reanalysis foto yang sama tidak boleh mengisi sampel baru. Satu foto dengan beberapa alat tetap dapat menghasilkan satu sampel untuk masing-masing alat. Evidence dan audit mengikuti record yang tersimpan.

History memakai limit1–100/cursor/sort allowlist dan filter yang didokumentasikan. Export CSV dipage/stream, bukan load tabel penuh. Result/crop/label/overlay jangan digambarkan sebagai angka final sebelum konfirmasi. Confidence adalah heuristik; tiga desimal analog adalah interpolasi, bukan jaminan ketelitian fisik±0.001MPa.

Endpoint master/settings Admin mendukung nama, kode, alias, jenis, area/line, unit/range/desimal/toleransi, active dan daftar maintenance_check_ids; kalibrasi immutable peralat. Viewer hanya baca/export; Operator upload/analisis/konfirmasi/record; Admin juga mengubah master/settings. Perubahan definisi menyimpan versi baru, history mempertahankan snapshot.

`smoke_ui` contoh kecil, menggunakan API publik dan rendering textContent. Final mobile UX, multi-ROI editing, auto-stop camera dan device UAT menjadi pekerjaan tim frontend. Kamera dalam smoke page menyediakan satu bingkai bersama untuk analog/digital dan capture manual; belum dianggap tervalidasi pada seluruh HP.

Pada HTTP LAN, contoh membuka kamera native melalui input capture lalu menggunakan upload API yang sama; preview getUserMedia tetap memerlukan secure context. Confirmation UUID memakai getRandomValues fallback ketika randomUUID tidak tersedia di HTTP. `setup-camera.cmd` kini menyediakan HTTPS lokal tambahan untuk preview dan bingkai gauge + label. Ikuti [pemasangan sertifikat pada HP](../deployment/local-camera.md); kepercayaan sertifikat tidak dipasang otomatis dan device UAT tetap diperlukan.

Foto, ROI, profil dan alat membentuk satu snapshot analisis. Jika salah satunya diubah saat job berjalan, abaikan completion lama dan buat analisis baru. Crop preview, nilai dan konfirmasi harus mengacu snapshot yang sama; jangan menampilkan angka lama di samping crop baru. Contoh `smoke_ui/capture-state.js` menerapkan aturan ini dengan generation token.

## Foto otomatis, label dan progres

`smoke_ui/auto-analysis.js` menyediakan alur upload → discovery → job CV → hasil. Pemilihan foto atau capture memulai alur tanpa tombol analisis tambahan. Progress memakai tahap request dan status `queued`/`running` yang benar-benar tersedia; tidak menampilkan persentase akurasi atau kemajuan internal buatan. Tombol baca ulang digunakan setelah koreksi crop/profil. Kembali/ganti foto membuang hasil lama dari UI; job yang sudah diterima server tetap dapat selesai sampai TTL.

Discovery yang cocok dengan master terdaftar diprioritaskan. `roi` gauge, `label_roi` label bila ditemukan, profil, ID alat, dan `photo.context.line` sebagai `area` ikut dalam snapshot/submission. Foto dikirim utuh supaya nama test di bawah gauge tetap tersedia. Kedua crop ditampilkan bersama hasil. Label tidak unik/tidak terbaca tetap memerlukan pilihan manual; konfirmasi identitas dan angka tidak dicentang otomatis. Analisis tidak menyimpan hasil pengukuran.

Nama/alias lengkap yang unik tetap dapat mengenali alat saat line foto berbeda dari area master. Line foto dan master tidak diganti otomatis. Kecocokan parsial tetap hanya saran; kode lama tetap mengikuti area master. Pemilihan nama alat tidak menjalankan CV lagi jika profil fisiknya sesuai dengan hasil yang sudah ada.

`Instrument.acceptance_limits` mengatur batas hasil OK per alat, terpisah dari `profile.minimum/maximum` yang merupakan rentang fisik pembacaan. Kirim `{"minimum":0.35,"maximum":0.45}` untuk batas inklusif; salah satu batas boleh `null`, tetapi keduanya tidak boleh kosong. Batas harus berada dalam rentang fisik. Kirim `null` untuk mengikuti batas definisi pemeriksaan; peralatan visual memakai pilihan OK/NG tanpa batas angka.

Backend menilai hasil dari `instrument_snapshot.acceptance_limits` pada foto yang sudah dikonfirmasi. Hasil di bawah/di atas batas menjadi NG; batas itu sendiri termasuk OK. Setiap outcome menyimpan `acceptance_limits` dan `acceptance_source` (`equipment` atau `inspection`). Perubahan master sesudah konfirmasi tidak mengubah kriteria foto atau hasil lama. Untuk pemeriksaan selisih, batas diterapkan pada selisih hasil; foto sebelum/sesudah harus membawa kriteria yang sama. SPC memisahkan kriteria berbeda dan menyediakan batas efektif pada cohort; Cp tetap kosong bila hanya ada satu batas.

## Jadwal berdasarkan waktu server

Panggil `GET /api/v1/maintenance/schedule` setelah login, sebelum foto diunggah, dan saat kembali memulai pemeriksaan. Gunakan `server_time`, `production_date`, `shift` dan `slot_id` dari respons. Jam HP tidak menentukan shift. Batas awal WIB berlaku inklusif: Shift 1 07:45, Shift 1 12:45, Shift 2 21:15, Shift 2 01:15. Pilih batas terakhir yang sudah dilalui; contoh 00:30 masih slot Shift 2 21:15 hari sebelumnya, sedangkan 01:15 menjadi slot Shift 2 01:15.

Tanggal produksi mengikuti konfigurasi `night_rollover_hour` yang sudah ada (default 12). Pada shift malam dini hari, tanggal produksi adalah hari produksi sebelumnya. UI menyegarkan jadwal setiap 30 detik ketika layar capture diam, lalu mengambil waktu server baru sebelum upload. Context dan waktu pemeriksaan foto kemudian dibekukan sampai konfirmasi agar pergantian shift saat analisis tidak mengubah bukti. Untuk pemeriksaan visual, ambil waktu server lagi sebelum penyimpanan. Jangan gunakan cache respons jadwal.

## Touch crop dan capture kamera

`roi-editor.js`/`roi-geometry.js` menangani ROI gauge dan label, drag/corner resize, nudge, ukuran area, zoom serta pan foto. Transform contain/letterbox dan zoom dipetakan ke koordinat foto asli. `setImage` harus memakai foto asli yang sama dengan upload, bukan pratinjau hasil crop. `setRegions` bersifat silent; `onChange` hanya untuk edit ROI/aktivasi label yang memerlukan analisis ulang. Zoom/pan dan tap tanpa perpindahan tidak mengubah nilai. Simpan presisi koordinat; jangan membulatkan data input sebelum analisis. Preview crop async memakai revision guard agar respons lama tidak mengganti tampilan setelah edit.

`camera-capture.js` menampilkan gauge persegi dan label tepat di bawahnya pada area video aktual, termasuk saat letterbox/orientasi berubah. Konfigurasi fokus/eksposur mempertahankan permintaan resolusi serta kontrol sebelumnya. `ImageCapture.takePhoto()` digunakan bila didukung, dengan fallback video; mode monitor memilih satu foto berdasarkan struktur pada area panduan gauge. Ini bukan pembacaan multi-frame atau rekonstruksi angka. Signal pembatalan mencegah pengiriman foto dari sesi kamera yang sudah ditutup. API backend dan payload bisnis tidak berubah.

Browser HTTP memakai kamera native. Kamera web dengan kontrol/bingkai memerlukan HTTPS lokal dan sertifikat dipercaya perangkat. Foto monitor adalah domain pengujian berbeda dari file asli; tidak ada klaim 100% akurasi perangkat atau perbaikan universal moiré. Nama file gambar pada viewer kini diabaikan dalam kandidat label, kecuali cocok tepat dengan master terdaftar.

## Revisi pembaca digital 2026-10-15

`method=hybrid-cv-v0.2.4` memperbaiki orientasi OCR LED, titik desimal LCD pada foto monitor dan konteks auto-crop. Kontrak endpoint/DTO tetap sama. Tulisan tombol gabungan seperti ORIGIN ON/OFF tidak menjadi kandidat label, kecuali cocok tepat dengan identitas master. Jika nama tidak terbaca, pertahankan pilihan manual; angka yang valid tidak membuktikan identitas alat.

Tampilkan `validated_prediction` sebagai hasil yang lolos pemeriksaan lokal, pisahkan estimasi `candidate.value` yang belum valid, dan tetap minta operator mengonfirmasi nama serta nilai. `confidence.level=medium` adalah tingkat heuristik; `probability_correct=null` tidak boleh diubah menjadi persentase akurasi. Simpan hasil setelah konfirmasi eksplisit. Restart layanan setelah mengganti kode pembaca; unggah ulang foto karena ID sementara dari versi lama tidak dipakai kembali.


## Ketersediaan peralatan

Admin memakai PUT /api/v1/instruments/:id/status dengan body ketat {"active":false} atau {"active":true}. Endpoint mengubah active/revision saja di dalam transaksi, mencatat audit, dan mengembalikan InstrumentResponse. Profil, identitas, tautan, kondisi, kalibrasi dan catatan lama dipertahankan. Tidak menyimpan draft editor yang belum disubmit. Status identik bersifat no-op; otorisasi dan CSRF cookie tetap wajib. Kontrak OpenAPI/Postman menyertakan InstrumentStatusInput. UI menempatkan tindakan ini di editor dalam tab Peralatan pada Pengaturan.
