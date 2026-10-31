# Evaluasi foto baru — 30 Oktober 2026

Finalisasi paket uji: 31 Oktober 2026.

Reader `hybrid-cv-v0.2.8`. Perubahan berada pada algoritme CV klasik; ketiga model OCR ONNX tetap sama dan tidak ada pelatihan neural baru atau panggilan API AI.

## Acuan dan pembagian pengujian

68 foto baru ditinjau secara visual terlebih dahulu. Operator mengoreksi nilai per nama file, mengonfirmasi satuan MPa untuk No.10–19, kemudian menyetujui 30 nilai lain pada draft. Hasilnya 58 acuan yang disetujui (31 analog, 27 digital) dan 10 foto skip. Foto skip tidak masuk denominator. Acuan merupakan pembacaan visual yang disetujui operator, bukan pengukuran alat pembanding tersertifikasi.

Sebelum tuning, 28 foto analog yang dikoreksi secara eksplisit dipisahkan menjadi 9 development dan 19 held-out. Dari 30 acuan yang baru disetujui, kasus digital 092049 dan 092457 juga digunakan untuk diagnosis titik desimal. Karena itu kelompok 30 bukan lagi kelompok held-out murni. Foto dari alat/sesi yang sama bukan bukti generalisasi ke alat baru.

## Perubahan pembaca

- Pencarian ellipse wajah dial netral-terang membantu menemukan gauge kecil atau tidak di tengah foto. Kandidat dibatasi; lingkaran biasa tidak otomatis menjadi alat yang terbaca.
- Pencarian ini memakai foto asli dengan orientasi EXIF yang sama dengan upload, bukan JPEG pratinjau yang dapat memutus kontur. Gambar kerja dibatasi 1.400 piksel pada sisi terpanjang, memakai BOX area averaging dan memakai ulang decode yang sudah tersedia. Pembacaan tetap memakai crop piksel asli.
- Jika enam garis tebal hanya dapat dipilih setelah membuang outlier cat/teks pada pita dalam, pita berdekatan harus sepakat dan garis kecil tidak boleh menggantikan garis utama yang hilang. Hasil subset ini tetap **kandidat untuk konfirmasi manual**: cat bisa membuat garis kecil menyerupai garis utama. Pola lengkap yang sebelumnya tervalidasi tetap memakai pemeriksaan pusat, jarum, dan urutan angka OCR.
- Profil API, model OCR, batas OK/NG per alat, dan data maintenance tidak berubah.
- Titik desimal awal seperti `.525` dibaca jika benar-benar terlihat, lalu dinormalisasi menjadi `0.525`. Proyeksi piksel komponen memperbaiki pemeriksaan titik pada LED miring; beberapa bukti titik asli yang sepakat diperlukan untuk mengabaikan satu bintik noise atau memakai titik redup. Titik hilang, ganda yang persisten, terpotong, dan nilai negatif di luar rentang tetap ditolak.
- Penyaring sudut menghitung ribuan kombinasi skala secara vektor sebelum menjalankan pemeriksaan/skor scalar lama pada kandidat yang lolos. Urutan kombinasi, batas penerimaan dan pemilihan akhir dipertahankan. Uji privat 44 kasus membandingkan hasil/tick terpilih dengan algoritme lama; peningkatan waktu fungsi sekitar 80–110 kali bukan klaim seluruh aplikasi menjadi 100 kali lebih cepat.

## Cara menilai

Pengujian lokal melalui backend: upload foto asli → discovery baru → pemetaan profil publik Node yang sama dengan aplikasi → analysis job → polling. Nilai acuan, nama file dan jenis referensi tidak dikirim ke pengenal. Tidak ada penulisan record maintenance.

Hasil analog dibandingkan dengan toleransi ±0,010 MPa terhadap acuan visual. Digital MPa harus sama sampai tiga desimal (toleransi pembandingan 0,0005 MPa). Satuan juga harus cocok. Foto dianggap sesuai hanya bila ada nilai tervalidasi dan tidak ada nilai tervalidasi tambahan yang keliru. Kandidat yang memerlukan pemeriksaan manual dihitung terpisah, bukan dianggap berhasil otomatis.

## Artefak lokal

Seluruh **291 tes CV** lulus pada Python lokal dengan model OCR workspace; verifikasi ulang sebelum publikasi dilakukan pada 31 Oktober 2026 (165 detik). Pemeriksaan arsitektur Node, integritas ketiga model OCR, dan readiness server juga lulus. Review independen menguji regresi garis utama tipis, titik terpotong, titik tambahan terang, urutan ambang redup, dan pengecualian skor ketajaman untuk bukti segmen lengkap; perbaikannya sudah termasuk pada putaran tes akhir. Hasil tes sintetis tidak disamakan dengan persentase foto lapangan.

Pada mask latar hijau 2 megapiksel, proyeksi titik memakai sekitar 12 MB alokasi Python/NumPy terukur, dibanding 104 MB pada percobaan awal yang memproyeksikan setiap piksel. Angka ini tidak mencakup buffer native OpenCV. Sesudah perbaikan memori, pengujian dibagi menjadi dua proses terisolasi yang masing-masing memproses 29 foto berurutan. Percobaan paralel sebelumnya yang kehabisan memori tidak dipakai sebagai putaran akhir.

## Hasil foto dan batas penggunaan

| Kelompok | Foto | Sesuai acuan | Keluaran berbeda | Belum tervalidasi |
|---|---:|---:|---:|---:|
| Analog | 31 | 2 | 0 | 29 |
| Digital | 27 | 10 | 2 | 15 |
| Semua | 58 | 12 | 2 | 44 |

Kesesuaian total **20,7%**, sehingga target keterbacaan >80% **belum tercapai**. Dua keluaran digital berbeda dari acuan operator; tabel privat menunjukkan nama file dan angka masing-masing. Hasil ini belum mendukung penggunaan tanpa konfirmasi operator, dan tidak membuktikan akurasi fisik. Menambah nilai acuan belum menghasilkan model keypoint/segmentasi yang terlatih.

Pembacaan piksel, discovery, profil publik dan job/poll diuji dengan API baru. Setelah itu satu keputusan penerimaan LED dengan skor ketajaman rendah diterapkan ulang pada hasil piksel yang tersimpan. Hash membuktikan pembaca piksel dan komponen lain identik; hanya gerbang kualitas yang berubah. Probe API penuh pada kode akhir menghasilkan 0,525 MPa untuk 092457. OCR saja tetap tidak cukup untuk melewati gerbang ini. Detail provenance tersedia dalam `all-confirmed-final.json` dan `finalize_evaluation.py` privat.

Dua kasus regresi lama diuji kembali dengan API penuh: IMG_0418 menghasilkan 0,411 MPa (acuan visual 0,410), sedangkan IMG_20261009_085505 menghasilkan 15,96 mm. Keduanya lolos kriteria pembandingan. Ini bukan pengujian ulang seluruh dataset lama.

Untuk foto analog sulit, langkah berikutnya membutuhkan pemetaan posisi dial, pusat, garis skala dan jarum, atau kalibrasi per alat. Angka acuan skalar saja tidak menyediakan anotasi geometri tersebut. Lihat panduan teaching sebelum memilih model/keypoint baru; evaluasi perangkat atau sesi baru tetap diperlukan.

Eksperimen privat tambahan memakai template statis SIFT pada sembilan foto development. Beberapa dial yang tadinya salah crop dapat ditemukan, tetapi tidak ada nilai end-to-end yang lolos pemeriksaan ketat. Satu template tidak dapat dipakai untuk seluruh tata letak muka gauge. Eksperimen ini tidak dimasukkan ke pembaca atau bundle; langkah berikutnya perlu template per model muka alat dan perbaikan deteksi jarum, bukan pelonggaran batas penerimaan.

Folder privat `Backend/runtime/gauge-ai-review-2026-10-30/` berisi `operator-confirmed-references.csv`, `operator-feedback.json`, `split.json`, tabel `koreksi-operator.md`, dan laporan API. Dataset foto tetap di folder privat `New Gauge Training`, di luar repositori. Folder runtime/foto tidak ikut Git atau bundle sumber. Nilai acuan tidak dimuat pada proses pembacaan produksi.

Mengoreksi nilai di CSV tidak melatih model. Untuk teaching posisi dial, skala dan jarum pada foto sulit, gunakan anotasi yang dijelaskan pada [panduan teaching](cv-teaching.md). Tiga desimal adalah format/interpolasi; tidak membuktikan akurasi fisik ±0,001 MPa.
