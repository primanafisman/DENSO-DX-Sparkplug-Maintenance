# Maintenance

Catalog44 =37baris checklist terlihat (1–16 dan24–44) +7chart pengukuran. Baris17–23 tidak tersedia;45terpotong. Sumber gambar tidak dibundel. ID/source_number/version/review_notes dipertahankan; standar yang belum jelas harus disetujui sebelum produksi.

GET maintenance/catalog dapat difilter group/kind/requirement. Setiap definisi menyediakan persyaratan, alat, metode, opsi interval/trigger/shift, sample IDs, satuan, limits dan panduan waktu. Interval guide adalah panduan sumber; jam mulai shift/hari mingguan tidak direka sebagai aturan perusahaan. Admin mengubah method/standar melalui versioned definition endpoint dan reason audit, bukan mengubah hasil lama.

Visual/functional menerima OK/NG saja. Numeric membutuhkan confirmed reading dengan evidence; unit, equipment link, check_id, sample_key, line, production_date, shift dan sampler harus cocok. Seluruh sampel wajib tepat sekali, evidence tidak boleh duplikat di dalam satu record. Difference menggunakan sesudah−sebelum dengan evidence stage berbeda. Batas inklusif; satu NG menjadikan overall NG.

Satu analysis dan satu foto sumber per alat hanya dapat mengisi satu pengukuran. Mengganti sample_key/confirmation_id atau mengubah crop tidak membuat sampel baru. Ambil foto baru untuk n2, n3, n4 dan setiap tahap before/after; retry pengiriman yang sama tetap idempotent.

Tanggal produksi dihitung WIB (Asia/Jakarta). Default night rollover12:00 adalah pengaturan lokal yang harus disesuaikan prosedur lapangan; pengecekan actual time menyilang tengah malam memakai production date malam sebelumnya. Settings menyimpan daftar line/sampler dan rollover hour; tidak mengubah context foto yang telah dianalisis.

Importer konfigurasi hanya membaca ekspor JSON yang dipilih operator, dengan dry-run default. Tidak membaca/memindahkan database PanelReader lama secara otomatis. Data pribadi/historical migration merupakan operasi terpisah.
