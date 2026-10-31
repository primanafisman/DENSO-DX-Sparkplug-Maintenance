# Panduan pemeriksaan dan data contoh

## Siapkan pilihan pada Pengaturan

Urutan tab: Daftar Pemeriksaan, Peralatan, Line produksi. Pada Line produksi terdapat tiga kolom berisi daftar **Line produksi, Sampler, Tipe produk** pada desktop dan tablet; pada layar HP kecil, ketiga daftar disusun ke bawah. Tombol **Tambah line** di samping judul membuka popup dengan pilihan kategori, nama dan status aktif. Ikon pensil pada setiap item membuka pengubahan nama, status aktif/nonaktif dan ikon hapus. Simpan langsung menerapkan perubahan setelah server berhasil; kesalahan tetap muncul di popup agar dapat dicoba kembali. Tidak ada tombol Simpan pengaturan terpisah. Pilihan nonaktif tetap terlihat di Pengaturan dan tidak muncul pada isian operator. Line awal 1–17 hanya nilai awal, bukan batas maksimum; batasnya 200 line dan 100 sampler termasuk pilihan nonaktif.

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

Saat foto diunggah, gauge/label dicari, atau angka dibaca, popup **Analisis foto** mengunci menu dan tombol kembali aplikasi. Tekan **Batalkan analisis** untuk menghentikan dan membuka kembali menu. Hasil siap langsung membuka langkah Hasil baca; respons terlambat dari analisis yang dibatalkan diabaikan. Pada tablet, isi popup standar/metode dan konfirmasi dapat digulir sementara tombol tindakan tetap berada di bagian bawah popup. Upload dan foto kamera tetap diproses otomatis.

## Progres semua line

Pada Ringkasan, pilihan **Semua line** menampilkan persentase gabungan dan pie kecil untuk setiap line aktif di Pengaturan. Persentase gabungan dihitung dari jumlah pemeriksaan selesai ÷ jumlah seluruh pemeriksaan pada jadwal server yang sama. Indikator **Line pemeriksaan tersisa** menampilkan jumlah line yang masih mempunyai pekerjaan, di samping Selesai dan Tersisa. Klik pie line untuk memfilter. Menambah/menghapus line di Pengaturan memperbarui pilihan dan pie tanpa batas tetap17 line. Bila sebagian data gagal atau jadwal berganti, persentase gabungan menunggu data lengkap; gunakan Coba lagi bila diperlukan. Persentase dan jumlah selesai kedaluwarsa pada batas jadwal server, termasuk saat kembali ke halaman dari cache atau jaringan terlambat. Pemeriksaan sekali per shift kembali perlu dikerjakan pada shift berikutnya; frekuensi sesi, harian dan mingguan mengikuti periode masing-masing. Rekap bulanan tetap mencakup bulan yang dipilih.

Ringkasan memakai ukuran judul, subjudul, label dan kontrol yang sama dengan halaman lain. Filter bulan/line/shift sejajar dengan judul; tombol **Mulai pemeriksaan** berada di ujung kanan. KPI menampilkan label dan angka secara sejajar agar grafik lebih tinggi. Grafik hasil per hari menjadi panel utama yang lebih lebar; tabel pemeriksaan lebih sempit dan dapat digulir dengan header kolom tetap terlihat. Nama panjang diringkas secara visual dan dapat dilihat melalui tooltip. Klik baris pemeriksaan untuk membuka riwayat sesuai filter; kolom Waktu menampilkan jam–menit WIB dari catatan terakhir, dengan urutan nomor pemeriksaan dari kecil ke besar. Tabel Riwayat menampilkan seluruh data melalui gulir halaman, dengan gulir horizontal bila diperlukan. Bulan terpilih ditampilkan di samping Total. Detail data dan Catatan laporan tidak ditampilkan. Tablet/HP memakai alur halaman biasa; bulan dan tahun tetap dipilih dalam bahasa Indonesia.

## Waktu mulai shift

Buka **Pengaturan → Line produksi → Detail jadwal shift**. Isi Sesi1 dan Sesi2 untuk Shift1, lalu Sesi1 dan Sesi2 untuk Shift2, dalam WIB. Urutan waktunya mengikuti satu siklus24 jam; waktu Shift2 sesi2 boleh melewati tengah malam. Empat waktu wajib berbeda. Tekan **Simpan jadwal** di dalam Detail jadwal shift dan setujui popup. Perubahan jadwal yang belum disimpan tidak ikut tersimpan ketika menambah atau mengedit line, sampler atau tipe. Jadwal server dan kewajiban maintenance langsung mengikuti waktu ini sesuai interval masing-masing pemeriksaan. Catatan lama tetap memakai jadwal saat disimpan. Jika jadwal berubah ketika sebuah foto masih terbuka dan kejadian pemeriksaannya berganti, ambil foto baru.

Jumlah pilihan ditampilkan di judul masing-masing daftar. Menghapus line, sampler atau tipe melalui ikon sampah di popup Edit meminta persetujuan, lalu langsung disimpan. Ikon sampah berada paling kiri sejajar Batal dan Simpan; pada peralatan dan definisi pemeriksaan juga demikian. Menghapus peralatan atau pemeriksaan melalui Edit menghilangkan barisnya dari tabel saat berhasil; riwayatnya tetap ada. Persetujuan simpan hasil foto, hasil visual, master dan penghapusan memakai popup yang dapat dibatalkan sebelum penulisan.

Pratinjau kamera dibatasi tinggi layar. Border gauge dan label tetap mengikuti bagian video yang terlihat tanpa memotong foto sumber. Kamera bawaan HP mengikuti tampilan sistem HP.

## Riwayat dan grafik

Tabel bulanan memakai satu baris per nomor pemeriksaan dan judul saja. Sel tanggal menyusun Shift 1 lalu Shift 2 dalam satu kolom. Setiap sesi ditampilkan pada baris tersendiri dengan label Line; beberapa line diurutkan menurut nomor dan sesi menurut waktu. Label shift dan line tetap tampil ketika difilter. Angka X̄/R beserta satuan tetap bersebelahan. Klik sel untuk melihat setiap kejadian beserta waktu, shift, nilai dan satuannya; ikon hapus berada tepat di bawah status OK/NG.

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

## Nomor pemeriksaan dan footer

Nomor pemeriksaan menjadi identitas tampilan pada daftar, pilihan alat/pemeriksaan, Ringkasan, Riwayat dan halaman pengisian. Admin dapat mengisi atau mengubah nomor 1–10000 melalui Tambah/Edit pemeriksaan; nomor harus unik termasuk pemeriksaan yang diarsipkan. Daftar selalu diurutkan berdasarkan nomor. Perubahan nomor tidak mengganti ID internal, tautan alat atau snapshot data lama.

Footer copyright kecil muncul pada seluruh tab di bawah area konten; pada monitor perlu sedikit menggulir untuk melihatnya sehingga tidak mengambil ruang Ringkasan.

## Pemeriksaan selesai

Daftar Pemeriksaan tetap menampilkan item yang sudah dikerjakan, dengan warna hijau, ikon dan penanda **Selesai**. Tombol mulai dinonaktifkan selama periode pemeriksaan itu masih berlaku. Item kembali dapat dimulai saat periode berikutnya dibuka server atau saat memilih line lain yang belum diperiksa. Jika pemeriksaan membutuhkan beberapa alat, status baru selesai setelah seluruh alat wajib diperiksa. Hasil ukur OK/NG tersimpan di Riwayat.


## Indikator sampel pemeriksaan

Nomor pemeriksaan berwarna merah jika belum terisi, kuning jika sebagian sampel/alat sudah terisi, dan hijau jika sampel lengkap. Label jumlah sampel tetap terlihat agar warna bukan satu-satunya penanda. Sampel lengkap pada draft ditandai **Belum disimpan**; status **Selesai** hanya mengikuti hasil yang sudah tersimpan pada jadwal server. Pemeriksaan selesai tetap terlihat hijau. Perpindahan line, tipe produk atau periode jadwal tidak mewarisi warna draft yang tidak sesuai. Pemeriksaan sebelum/sesudah memerlukan kedua pembacaan untuk dihitung satu sampel.
