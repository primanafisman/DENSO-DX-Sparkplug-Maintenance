# Konfigurasi operasional dan batas data

Draft implementasi; cocokkan dengan kontrak OpenAPI Backend/contracts/openapi.yaml pada versi distribusi.

- Backend/.env menyimpan rahasia server, adapter database, port dan pengaturan HTTPS. File ini tidak dikirim ke browser atau GitHub.
- Frontend/.env hanya untuk konfigurasi publik pengembangan. VITE_API_BASE_URL kosong menggunakan /api/v1 pada origin yang sama. Jangan menaruh API key, JWT secret, password atau koneksi SQL pada variabel VITE_.
- Port awal: Node8100, CV privat8101, HTTPS lokal8443 bila diaktifkan. Frontend menggunakan Node, bukan akses langsung ke Python atau database.
- Pengaturan memuat line, sampler, master Type produk dan revisi definisi pemeriksaan. Shift mengikuti waktu server Asia/Jakarta: 07:45,12:45 Shift1;21:15,01:15 Shift2. Tanggal produksi malam menggunakan pengaturan rollover server.
- Peralatan: nomor/kode, nama, alias label, area, jenis, kondisi fisik, enabled dan parameter fisik. Alat visual tidak memerlukan profil angka. Kondisi Tidak berfungsi memblokir pengukuran numerik baru; menonaktifkan alat tidak menghapus sejarah.
- Standar penerimaan, metode, sampel dan frekuensi berada pada definisi pemeriksaan yang ditautkan ke alat. Rentang fisik alat bukan batas OK/NG proses.
- Type pada laporan adalah varian produk. Riwayat tanpa Type menampilkan Tidak tercatat. Type, standar, alat dan kalibrasi yang tidak kompatibel dipisahkan dalam laporan SPC.
- Nama label yang cocok adalah saran dari master; identitas dan angka tetap dikonfirmasi operator. Label parsial/ambigu tidak boleh memilih alat secara diam-diam.
- Enam bulan adalah rentang navigasi bawaan, bukan kebijakan penghapusan. Batas satu permintaan laporan kurang dari enam bulan kalender,100000 catatan dan5000 subgroup SPC; pilih rentang lebih kecil bila ditolak.

## Statistik

Xbar/R memerlukan subgroup lengkap berukuran sama. Faktor yang tersedia pada rilis ini n4 dan n8. Sampel belum lengkap tetap terlihat beserta alasan eksklusi. n1 tidak dibuatkan R atau capability palsu.

Metode awal paper_stdev_s menggunakan STDEV.S seluruh observasi subgroup lengkap untuk Cp/Cpk lembar. Sigma within=Rbar/d2 ditampilkan terpisah. Tim quality perlu memverifikasi konvensi statistik/baseline untuk penggunaan produksi. Cp/Cpk tidak otomatis menyatakan proses diterima. Nilai NG dan outlier tidak dibuang otomatis.

Baseline tersimpan membekukan batas kontrol; statistik periode yang sedang dilihat tetap diberi konteks periode tersebut. Nilai null memiliki alasan seperti data belum cukup, variasi nol atau batas spesifikasi belum tersedia.

## Database perusahaan

SQLite adalah database lokal yang diuji. MySQL/SQL Server disediakan melalui adapter Backend; pemasangan driver tidak sama dengan verifikasi koneksi perusahaan. Integrasi memerlukan host/port/database/user, TLS, hak akses, backup dan migrasi yang ditinjau administrator. Frontend tetap menggunakan API yang sama.
