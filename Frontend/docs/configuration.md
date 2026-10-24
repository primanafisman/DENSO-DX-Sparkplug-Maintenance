# Konfigurasi operasional dan batas data

Konfigurasi rilis lokal 1.1; cocokkan dengan kontrak OpenAPI Backend/contracts/openapi.yaml pada versi distribusi.

- Backend/.env menyimpan rahasia server, adapter database, port dan pengaturan HTTPS. File ini tidak dikirim ke browser atau GitHub.
- Frontend/.env hanya untuk konfigurasi publik pengembangan. VITE_API_BASE_URL kosong menggunakan /api/v1 pada origin yang sama. Jangan menaruh API key, JWT secret, password atau koneksi SQL pada variabel VITE_.
- Port awal: Node8100, CV privat8101, HTTPS lokal8443 bila diaktifkan. Frontend menggunakan Node, bukan akses langsung ke Python atau database.
- Pengaturan memuat line, sampler, master Type produk dan revisi definisi pemeriksaan. Shift mengikuti waktu server Asia/Jakarta: 07:45,12:45 Shift1;21:15,01:15 Shift2. Tanggal produksi malam menggunakan pengaturan rollover server.
- Instalasi baru menawarkan line1–17 dan sampler awal Ldr. Di Pengaturan → Line, sampler & Type, Admin mencentang line aktif serta menambah/menghapus sampler. Dashboard dan pemeriksaan hanya menawarkan pilihan tersimpan; daftar kosong menonaktifkan pilihan, bukan membuka input bebas. Penghapusan pilihan tidak menghapus catatan historis.
- Peralatan: Nama alat menjadi input identitas utama. Nomor/kode dan alias otomatis mengikuti nama; buka Detail identitas alat untuk identitas berbeda atau line/area khusus (area kosong berarti bersama). Jenis, kondisi fisik, enabled dan parameter fisik tetap dapat diatur. Alat visual tidak memerlukan profil angka. Kondisi Tidak berfungsi memblokir pengukuran numerik baru; menonaktifkan alat tidak menghapus sejarah.
- Standar penerimaan, metode, sampel dan frekuensi berada pada definisi pemeriksaan yang ditautkan ke alat. Rentang fisik alat bukan batas OK/NG proses.
- Type pada laporan adalah varian produk. Riwayat tanpa Type menampilkan Tidak tercatat. Type, standar, alat dan kalibrasi yang tidak kompatibel dipisahkan dalam laporan SPC.
- Nama label yang cocok adalah saran dari master; identitas dan angka tetap dikonfirmasi operator. Label parsial/ambigu tidak boleh memilih alat secara diam-diam.
- Label lengkap dicocokkan ke nama, kode atau alias terdaftar dengan mengabaikan perbedaan huruf besar, spasi dan tanda pemisah. Pencocokan otomatis mengikuti area/line alat (area kosong berarti bersama). Identitas berupa angka saja, label parsial, duplikat atau konflik tetap dipilih manual; confidence hasil ukur tidak dinaikkan oleh kecocokan nama.
- Di hasil foto, Pemeriksaan berada di kiri/sebelum Nama alat. Tanpa pemeriksaan terpilih, seluruh alat angka aktif tersedia. Memilih pemeriksaan membatasi alat pada hubungan yang tersimpan; identitas yang tidak sesuai dikosongkan untuk dipilih operator. Kosongkan pemeriksaan untuk melihat semua alat kembali. Memilih alat yang memiliki satu pemeriksaan angka aktif mengisi pemeriksaan tersebut otomatis, tanpa CV ulang.
- Hubungkan alat melalui Peralatan atau editor Standar & metode. Contoh konfigurasi: MC Lowering 1 dan MC Lowering 2 ditautkan ke satu pemeriksaan Machine Lowering yang sesuai. Nama saja tidak membuat relasi atau standar penerimaan baru. Jika relasi belum diisi, aplikasi menampilkan petunjuk konfigurasi dan tetap meminta pilihan operator.
- Profil digital harus sesuai satuan dan jumlah digit desimal yang benar-benar terlihat pada display. Contoh layar 15.96 mm memakai decimals=2; jangan memilih decimals=3 hanya untuk memformat laporan. Profil terdaftar bersifat otoritatif; mode auto tidak mengubahnya secara diam-diam. Profil yang salah dapat membuat digit yang terlihat jelas ditolak. Untuk analog 0–1 MPa, decimals=3 adalah format interpolasi, bukan bukti ketelitian fisik 0.001 MPa.
- Perubahan standar menghasilkan versi baru. Pemeriksaan yang sedang berjalan mengirim definition_version; jika standar berubah sebelum disimpan, server mengembalikan DEFINITION_VERSION_CONFLICT dan operator harus meninjau ulang versi baru.
- Mengosongkan semua slot jadwal mengirim occurrence_rule=null untuk menghapus aturan sebelumnya. Field yang tidak dikirim pada pembaruan tetap mempertahankan nilainya.
- Enam bulan adalah rentang navigasi bawaan, bukan kebijakan penghapusan. Batas satu permintaan laporan kurang dari enam bulan kalender,100000 catatan dan5000 subgroup SPC; pilih rentang lebih kecil bila ditolak.

## Daftar pemeriksaan dan jadwal aktif

Admin dapat menambah pemeriksaan melalui Pengaturan → Standar & metode → Tambah pemeriksaan. Isi nama, persyaratan, metode, jenis input, sampel, satuan/batas untuk angka, shift, frekuensi dan alat terhubung. Hubungan alat ini dipakai untuk menyarankan pemeriksaan setelah label foto cocok. Beberapa hubungan tetap membutuhkan pilihan operator.

Hapus dari pilihan menonaktifkan pemeriksaan; riwayat, foto dan revisinya tetap ada. Aktifkan mengembalikannya ke pilihan. Perubahan menghasilkan versi baru, sehingga hasil standar lama tidak menandai standar baru sebagai selesai.

Daftar Pemeriksaan menampilkan item yang belum selesai untuk line dan Type yang dipilih, memakai waktu server. OK maupun NG yang sudah tersimpan dihitung selesai; foto/angka yang belum disimpan sebagai pemeriksaan lengkap belum dihitung. Sampler/operator berbeda tidak mengulang kewajiban yang sama. Tanpa filter Type, seluruh Type pada line dihitung bersama.

- Per shift: Shift 1 mulai07:45 hingga21:15; Shift 2 mulai21:15 hingga07:45 berikutnya. Slot12:45 dan01:15 tidak mengulang item per shift.
- Harian: sekali per tanggal produksi. Mingguan: sekali per minggu produksi mulai Senin.
- Aturan slot yang ditinjau Admin menggantikan pengelompokan bawaan. Slot harus sesuai shift aktif; mingguan memerlukan hari pilihan.
- Untuk interval berulang `every_4_hours` tanpa aturan slot, pilot mengikuti empat sesi server07:45/12:45/21:15/01:15. Ini bukan timer empat jam bergulir. Waktu lain pada panduan kertas tetap informasi sumber, sampai jadwal operasional ditinjau dan disetel.

Daftar diperbarui berkala, saat kembali ke aplikasi dan setelah simpan. Gangguan pengambilan jadwal menampilkan pesan muat ulang, bukan status selesai palsu. Riwayat NG tetap terlihat di Riwayat/Ringkasan.

## Statistik

Xbar/R memerlukan subgroup lengkap berukuran sama. Faktor yang tersedia pada rilis ini n4 dan n8. Sampel belum lengkap tetap terlihat beserta alasan eksklusi. n1 tidak dibuatkan R atau capability palsu.

Metode awal paper_stdev_s menggunakan STDEV.S seluruh observasi subgroup lengkap untuk Cp/Cpk lembar. Sigma within=Rbar/d2 ditampilkan terpisah. Tim quality perlu memverifikasi konvensi statistik/baseline untuk penggunaan produksi. Cp/Cpk tidak otomatis menyatakan proses diterima. Nilai NG dan outlier tidak dibuang otomatis.

Baseline tersimpan membekukan batas kontrol; statistik periode yang sedang dilihat tetap diberi konteks periode tersebut. Nilai null memiliki alasan seperti data belum cukup, variasi nol atau batas spesifikasi belum tersedia.

## Database perusahaan

SQLite adalah database lokal yang diuji. MySQL/SQL Server disediakan melalui adapter Backend; pemasangan driver tidak sama dengan verifikasi koneksi perusahaan. Integrasi memerlukan host/port/database/user, TLS, hak akses, backup dan migrasi yang ditinjau administrator. Frontend tetap menggunakan API yang sama.

## Panduan, identitas dan urutan tampilan

Standar dan metode tampil dalam tabel sebelum OK/NG maupun foto. Popup awal wajib dikonfirmasi “Saya mengerti”; penerimaan berlaku selama sesi pemeriksaan dan versi standar yang sama, termasuk beberapa sampel. Versi/sesi baru meminta pemahaman ulang. Pemeriksaan cepat tanpa pilihan awal meminta pemahaman setelah identitas/pemeriksaan diketahui. Popup ini tidak memanggil CV dan tidak menyimpan hasil otomatis. Nilai master Zero/Plus/Minus dan catatan sumber tetap ditampilkan persis, tanpa menebak batas yang hilang.

Pengaturan tidak meminta Alasan revisi atau Alasan perubahan kondisi. API tetap menerima deskripsi audit otomatis dari aplikasi, sehingga jejak revisi dan otorisasi Admin tetap ada. Nama alat mendukung100 karakter; kode internal mengikuti nama saat membuat alat baru dan tidak menjadi kolom tambahan. Alias yang diubah manual tidak ditimpa saat nama kemudian diedit; tombol Gunakan nama sebagai alias mengaktifkan pengisian otomatis kembali.

Daftar Pemeriksaan terhubung pada editor alat disusun menurut abjad nama. Daftar Peralatan memuat seluruh halaman hasil pencarian lalu mengurutkan nama secara A–Z dengan urutan angka wajar (B2 sebelum B10). Header tabel dapat ditekan untuk urut naik/turun. Pengurutan tidak mengubah data master.

Riwayat memakai check_number1–44 yang tetap untuk katalog awal, terpisah dari source_number pada foto kertas. Filter bulan/line dan perubahan nama tidak mengubah nomor ini. Nomor tambahan mulai45 dan tidak dipakai ulang ketika pemeriksaan dinonaktifkan. Definisi/riwayat lama mempertahankan snapshot asli; nomor tampilan dapat diambil dari ID definisi yang sama.

## Ringkasan dan perangkat

Sidebar desktop/tablet menampilkan ikon dengan nama aksesibel, tooltip dan penanda merah menu aktif. Nama halaman tetap terlihat di header. Tablet mempertahankan sasaran sentuh minimal48px dan halaman menggulir normal; layar HP memakai navigasi bawah. Grafik/status monitoring desktop ditata dua kolom dengan panel tabel bergulir dan tinggi grafik mengikuti viewport pendek.

Jadwal aktif menunjukkan shift/sesi dari waktu server serta jumlah pemeriksaan sudah/belum untuk line terpilih. Bila hanya satu line aktif, line itu ditampilkan eksplisit. Bila beberapa line aktif dan filter Semua line dipilih, pilih satu line untuk memuat kewajiban jadwal; aplikasi tidak mengasumsikan line pertama. Jumlah ini berbeda dari Total catatan dan OK/NG bulanan. Mengganti bulan/shift laporan tidak mengubah label shift saat ini. Saat jadwal berganti, angka jadwal lama disembunyikan sampai data jadwal baru cocok. Gagal/memuat data menampilkan tanda — dan pemulihan, bukan nol palsu.


## Pengaturan terpadu dan hapus dari pilihan

Navigasi utama berisi Ringkasan, Pemeriksaan, Riwayat dan Pengaturan. Pengaturan memiliki urutan tab Daftar Pemeriksaan, Peralatan, Line Produksi. Tab Line Produksi tetap memuat sampler, Type produk dan batas tanggal produksi. Pilihan tab tercermin pada URL (?tab=standards/equipment/general); tautan lama /peralatan diarahkan ke /pengaturan?tab=equipment.

Pada daftar pemeriksaan dan peralatan, buka ikon Edit untuk menambah/mengubah konfigurasi. Hapus dari pilihan tersedia di dalam editor sebagai tombol berikon tempat sampah untuk item yang sudah disimpan, khusus Admin. Tindakan meminta konfirmasi dan tidak menyimpan perubahan formulir lain yang belum disimpan. Batal/gagal tetap mempertahankan isian. Item nonaktif tetap ada di Pengaturan dan dapat diaktifkan kembali dari editornya; riwayat, nomor pemeriksaan, tautan dan kalibrasi tetap dipertahankan.

Status peralatan memakai endpoint khusus yang mengubah active dan revision saja, sehingga nama/profil terbaru dari editor lain tidak ditimpa. Edit biasa pada peralatan memakai katalog yang juga mencakup pemeriksaan nonaktif agar tautan yang lama tetap terlihat. Tidak ada penghapusan fisik data dari tindakan ini.
