# Maintenance

Catalog44 =37baris checklist terlihat (1–16 dan24–44) +7chart pengukuran. Baris17–23 tidak tersedia;45terpotong. Sumber gambar tidak dibundel. ID/source_number/version/review_notes dipertahankan; standar yang belum jelas harus disetujui sebelum produksi.

GET maintenance/catalog dapat difilter group/kind/requirement. Setiap definisi menyediakan persyaratan, alat, metode, opsi interval/trigger/shift, sample IDs, satuan, limits dan panduan waktu. Interval guide adalah panduan sumber; jam mulai shift/hari mingguan tidak direka sebagai aturan perusahaan. Admin mengubah method/standar melalui versioned definition endpoint dan reason audit, bukan mengubah hasil lama.

Visual/functional menerima OK/NG saja. Numeric membutuhkan confirmed reading dengan evidence; unit, equipment link, check_id, sample_key, line, production_date, shift dan sampler harus cocok. Seluruh sampel wajib tepat sekali, evidence tidak boleh duplikat di dalam satu record. Difference menggunakan sesudah−sebelum dengan evidence stage berbeda. Batas inklusif; satu NG menjadikan overall NG.

Satu analysis dan satu foto sumber per alat hanya dapat mengisi satu pengukuran. Mengganti sample_key/confirmation_id atau mengubah crop tidak membuat sampel baru. Ambil foto baru untuk n2, n3, n4 dan setiap tahap before/after; retry pengiriman yang sama tetap idempotent.

Tanggal produksi dihitung WIB (Asia/Jakarta). Default night rollover12:00 adalah pengaturan lokal yang harus disesuaikan prosedur lapangan; pengecekan actual time menyilang tengah malam memakai production date malam sebelumnya. Settings menyimpan daftar line/sampler dan rollover hour; tidak mengubah context foto yang telah dianalisis.

Importer konfigurasi hanya membaca ekspor JSON yang dipilih operator, dengan dry-run default. Tidak membaca/memindahkan database PanelReader lama secara otomatis. Data pribadi/historical migration merupakan operasi terpisah.


check_number adalah urutan aplikasi tetap1–44 untuk katalog awal dan45+ untuk tambahan. source_number tetap nomor sumber kertas asli. GET catalog dan report menyertakan field ini; report mengurutkan sebelum paging. Definisi custom lama diselesaikan menurut urutan created_at/id dan nomor yang sudah dialokasikan, lalu dinormalisasi pada revisi baru tanpa menulis ulang arsip lama. Nomor pada record baru mengikuti definisi, sedangkan row laporan lama dapat memakai pemetaan ID untuk nomor tampilan saja. Gunakan definition_id untuk integrasi, bukan nomor urut.

Frontend sederhana tidak lagi meminta alasan revisi/kondisi secara manual; deskripsi audit otomatis tetap dikirim melalui field yang sudah ada. Persetujuan standar pada popup merupakan alur UI dan tidak mengganti autentikasi, versi definisi atau konfirmasi bacaan di API. equipment.code mendukung panjang100 karakter agar sama dengan Nama alat secara default.
