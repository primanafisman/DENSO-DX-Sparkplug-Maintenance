# Panduan pemeriksaan dan data contoh

## Siapkan pilihan pada Pengaturan

Urutan tab: Daftar Pemeriksaan, Peralatan, Line Produksi. Line dan sampler ditambah dengan mengetik nama, lalu menekan Tambah; hapus pilihan yang tidak dipakai dan simpan. Line awal1–17 hanya nilai awal, bukan batas maksimum. Sampai200 nama line dapat dikonfigurasi.

Pada peralatan, Nama Alat menjadi identitas yang ditampilkan. Kode internal dibuat otomatis untuk kompatibilitas integrasi, tanpa kolom kode tambahan. Buka Detail identitas bila alias atau area berbeda. Kondisi wajib dipilih Berfungsi atau Tidak berfungsi. Perubahan konfigurasi dicatat otomatis; operator tidak mengisi alasan. Panel riwayat versi/kalibrasi tidak muncul pada editor harian; catatan backend tetap dipertahankan.

## Mesin atau sampel produk?

| Sasaran | Contoh dari lembar sumber | Cara pengisian |
| --- | --- | --- |
| Mesin / line | Packing Depth Tool, master/function check, load cell Lower Ring dan Caulking, chart Talc Load | Pilih line, lakukan panduan metode/standar, isi OK/NG atau foto sesuai definisi. Pemeriksaan yang lengkap berlaku pada jadwal line tersebut. |
| Sampling produk sparkplug | Depth After Press, Sweeping Depth, Hexagon Size/Difference, Caulking Height, Gasket Press, EE Cutting | Pilih Type produk lalu isi seluruh n sampel untuk Type yang sama. Untuk Type berbeda mulai rangkaian pemeriksaan baru. |
| Sampling visual produk | Posisi ring, appearance Talc, posisi gasket | Pilih Type bila tersedia, lalu isi OK/NG per sampel sesuai definisi. |

Sasaran tidak ditentukan hanya dari satuan atau cara input. Nilai kN load cell merupakan kondisi proses mesin; nilai mm dimensi sparkplug merupakan hasil sampling. Admin dapat mengubah sasaran definisi jika praktik lapangan berbeda. Pemeriksaan tambahan belum berkategori perlu diklasifikasikan saat diedit. Batas tekanan/tautan alat baru tidak ditebak otomatis.

## Isi dan lanjutkan pemeriksaan

Pilih line/sampler dan Type produk sebelum mulai. Pahami popup standar/metode, kemudian isi OK/NG atau foto. Jika foto tidak dapat divalidasi, masukkan angka manual dari foto dan centang verifikasi identitas serta angka. Tidak perlu alasan koreksi. Satu bukti foto tidak dapat dipakai ulang untuk sampel baru.

Saat berpindah ke Ringkasan, Riwayat atau Pengaturan, progres pemeriksaan tetap berada dalam memori. Kembali ke Pemeriksaan dan pilih Lanjutkan pemeriksaan. Foto, ROI, hasil, angka yang sedang ditinjau dan sampel terkonfirmasi diteruskan. Memulai pemeriksaan baru meminta konfirmasi penggantian progres. Muat ulang browser, keluar/login habis, atau penyelesaian pemeriksaan menghapus draft dari memori; draft belum menjadi catatan produksi sebelum disimpan.

## Riwayat dan grafik

Tabel bulanan memakai satu baris per nomor pemeriksaan dan judul saja. Hasil dari beberapa shift/alat tetap tersimpan di dalam sel tanggal yang sama. Klik sel untuk melihat setiap kejadian beserta waktu, shift, nilai dan satuannya.

Pilihan **Isi sel tabel** tersedia dalam tiga mode:

- **Semua Data**: status, nilai pengukuran tunggal, atau X̄/R untuk sampel lengkap.
- **Hasil NG / OK**: hanya simbol ✓ OK dan × NG.
- **Rata-rata sampel X dan R**: hanya rangkaian sampel lengkap dengan sedikitnya dua sampel; tidak menampilkan pressure gauge atau menghitung R dari satu angka.

Pressure gauge MPa memakai grafik OK/NG per tanggal. Nilai tekanan asli dan Batas OK tetap tersedia pada rincian. Sampling produk seperti EE Cutting atau Gasket memakai X̄/R, STDEV.S, Cp/Cpk dan batas kontrol untuk kelompok Type/alat/standar yang kompatibel. Pemeriksaan visual juga memakai grafik OK/NG per tanggal. Pengaturan teknis grafik berada pada panel yang dapat dibuka bila diperlukan.

## Batas OK alat dan pencocokan label

Pada **Pengaturan → Peralatan → Edit**, aktifkan **Gunakan batas OK alat**, lalu isi Minimum OK dan/atau Maksimum OK. Misalnya batas yang sudah disetujui 0,350–0,450 MPa akan menghasilkan OK untuk kedua nilai batas tersebut dan nilai di antaranya; nilai di luar batas menjadi NG. Kosongkan salah satu batas untuk syarat satu arah. Batas harus berada dalam rentang fisik alat. Jika pilihan ini tidak aktif, sistem mengikuti standar pemeriksaan. Jangan memakai rentang fisik 0–1 MPa sebagai pengganti kriteria penerimaan proses.

Operator mengonfirmasi identitas dan angka sesuai foto; server menentukan hasil OK/NG. Batas pada bacaan terkonfirmasi dibekukan, sehingga perubahan pengaturan berikutnya tidak mengubah hasil lama. Untuk pemeriksaan selisih, batas diterapkan pada hasil setelah dikurangi sebelum; kedua bukti harus memakai kriteria yang sama.

Nama/alias lengkap yang sama persis dan unik, misalnya **MC Lowering 1**, dapat memilih alat dan pemeriksaan terkait secara otomatis meskipun area pada master berbeda. Line yang dipilih operator tetap dipertahankan. Nama parsial, kandidat ganda atau tautan pemeriksaan yang ambigu membutuhkan pilihan manual. Memilih alat atau pemeriksaan tidak membaca ulang CV; pembacaan ulang dilakukan melalui aksi khusus.

Admin dapat menghapus catatan dari rincian dengan ikon tempat sampah, kemudian Ya, hapus catatan. Batal tidak mengubah data. Catatan yang dihapus keluar dari laporan/jadwal aktif; foto, snapshot dan jejak audit tetap disimpan backend. Catatan NG yang sudah lengkap tetap dianggap telah dikerjakan pada jadwal itu; penanganan NG mengikuti proses perusahaan.

Grafik X/R dibuka langsung dari Riwayat → pilih pemeriksaan angka, misalnya Panjang EE / EE Cutting. Pilih Type/kelompok untuk melihat rangkaian yang terpisah. Tidak ada mode atau tombol Lihat data contoh. Pada instalasi uji lokal ini, rangkaian Type uji U/V diberi penanda Data uji X/R; angka simulasi mengikuti struktur/batas lembar dan bukan hasil ukur lapangan. Data ini berada pada penyimpanan riwayat biasa, dapat dihapus Admin dan diekspor dengan asalnya, tetapi tidak dapat dijadikan baseline produksi. Data uji tidak membuat kewajiban pemeriksaan selesai.

## Jam dan pemeriksaan per alat

Jam header menampilkan WIB hingga detik dari waktu server. Jika koneksi gagal, jam menampilkan tanda kosong; shift tetap ditentukan server saat pemeriksaan dimulai.

Untuk pemeriksaan mesin satu angka, alat terhubung dihitung sendiri-sendiri. Selesainya MC Lowering 1 tidak menutup MC Lowering 2. Pengaturan line/area yang sesuai dan alat bersama diprioritaskan; instalasi lama yang belum memiliki penugasan pada line memakai daftar terhubung sebagai fallback. Nama lengkap unik tetap boleh dikenali lintas area tanpa mengubah line pilihan. Sampel produk dan pengukuran sebelum/sesudah tetap membutuhkan foto berbeda.

Konfirmasi yang sempat selesai sebelum pemeriksaan disimpan dapat dilanjutkan dengan hasil yang sama. Angka berbeda pada foto yang sudah dikonfirmasi memerlukan foto baru atau pemeriksaan riwayat; sistem tidak mengganti bacaan lama diam-diam. Alat yang sudah selesai baru muncul kembali sesuai frekuensi/jadwal berikutnya.

## CV dan keterbatasan

IMG_0493 sebelumnya memiliki estimasi jarum0,417MPa tetapi tidak lolos verifikasi arah karena OCR angka skala kosong. Pembacaan baru mencoba crop angka skala secara terbatas hanya ketika pivot, enam posisi skala, dan dua metode deteksi jarum sudah sepakat. Nilai jarum tetap berasal dari geometri; perbaikan tidak memasukkan angka referensi operator ke perhitungan. Tiga desimal tetap interpolasi, bukan jaminan ketelitian fisik±0,001MPa. Foto ambigu tetap membutuhkan pemeriksaan operator.
