# Panduan pemeriksaan dan data contoh

## Siapkan pilihan pada Pengaturan

Urutan tab: Daftar Pemeriksaan, Peralatan, Line Produksi. Line dan sampler ditambah dengan mengetik nama, lalu menekan Tambah; hapus pilihan yang tidak dipakai dan simpan. Line awal1–17 hanya nilai awal, bukan batas maksimum. Sampai200 nama line dapat dikonfigurasi.

Pada peralatan, Nama Alat menjadi identitas awal. Detail identitas tetap dapat dibuka bila kode/alias berbeda. Kondisi wajib dipilih Berfungsi atau Tidak berfungsi. Perubahan konfigurasi dicatat otomatis; operator tidak mengisi alasan. Panel riwayat versi/kalibrasi tidak muncul pada editor harian; catatan backend tetap dipertahankan.

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

Tabel bulanan memakai nomor pemeriksaan konsisten dan judul saja. Sel memperlihatkan setiap ✓ OK atau × NG dalam maksimal dua baris; klik sel untuk rincian. Rincian pemeriksaan angka memisahkan kelompok Type/alat/standar yang kompatibel sebelum menghitung X̄, R, STDEV.S, Cp/Cpk dan batas kontrol. Rincian pemeriksaan OK/NG menampilkan jumlah hasil per tanggal untuk pemeriksaan tersebut.

Admin dapat menghapus catatan dari rincian dengan ikon tempat sampah, kemudian Ya, hapus catatan. Batal tidak mengubah data. Catatan yang dihapus keluar dari laporan/jadwal aktif; foto, snapshot dan jejak audit tetap disimpan backend. Catatan NG yang sudah lengkap tetap dianggap telah dikerjakan pada jadwal itu; penanganan NG mengikuti proses perusahaan.

Untuk melihat contoh grafik pada server uji lokal, buka Riwayat → Lihat data contoh → pilih salah satu pemeriksaan angka, misalnya Panjang EE / EE Cutting. Pilih kelompok U-Type/V-Type untuk membandingkan rangkaian. Banner kuning menandai data contoh. Angka simulasi mengikuti struktur dan batas lembar sumber, bukan salinan angka tulisan tangan pada foto. Demo tidak menulis database dan tidak dapat dihapus, diekspor menjadi CSV produksi atau dipakai sebagai baseline. Tombol ini tidak ditampilkan pada server produksi.

## CV dan keterbatasan

IMG_0493 sebelumnya memiliki estimasi jarum0,417MPa tetapi tidak lolos verifikasi arah karena OCR angka skala kosong. Pembacaan baru mencoba crop angka skala secara terbatas hanya ketika pivot, enam posisi skala, dan dua metode deteksi jarum sudah sepakat. Nilai jarum tetap berasal dari geometri; perbaikan tidak memasukkan angka referensi operator ke perhitungan. Tiga desimal tetap interpolasi, bukan jaminan ketelitian fisik±0,001MPa. Foto ambigu tetap membutuhkan pemeriksaan operator.
