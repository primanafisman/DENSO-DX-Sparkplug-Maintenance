# Evaluasi foto baru — 29 Oktober 2026

Reader: `hybrid-cv-v0.2.6`. Pengembangan ini memperbaiki CV klasik dan penggunaan OCR lokal yang sudah dibundel; tidak menghasilkan model neural khusus baru.

## Perubahan

- Gauge analog dengan bezel besar: pencarian garis skala lebih ke dalam jika pita luar gagal. Penerimaan memerlukan pola skala lengkap dan kesepakatan sudut pada pita berdekatan; validasi pusat, jarum dan arah angka tetap berlaku.
- LED miring: penyelarasan geser terbatas pada mask terang yang harus sepakat. Display yang sudah ditemukan sebagai LED mempertahankan jalur pembaca LED ketika heuristik seluruh crop terpengaruh bayangan segmen tidak aktif.
- Proposal kecil yang merupakan duplikat redup pada display LED atau caption hardware yang dikonfirmasi OCR tidak dianggap layar pengukuran kedua. Layar terpisah/angka kedua tetap memerlukan crop terpisah.
- LCD: pengelompokan kotak bagian atas/bawah satu glyph tanpa menggambar ulang tinta, serta pemeriksaan kaki glyph ujung yang terpisah. Titik desimal nyata di antara digit, tanda minus, satuan dan kesepakatan hasil tetap diperiksa.

## Hasil terukur dan batas klaim

Pengujian memakai upload → discovery baru → pemetaan profil publik yang sama dengan Node → analysis job → polling melalui API privat lokal. Tidak ada nilai acuan yang diberikan sebagai input pengenal dan tidak ada record maintenance yang ditulis.

Pada 24 foto baru, jumlah foto dengan setidaknya satu nilai tervalidasi meningkat **7 menjadi 12**. Ketujuh hasil awal tetap tersedia dengan nilai yang sama. Satu foto (091543) memang diminta dilewati; dua acuan (091553 dan 091559) belum dikonfirmasi ulang. Angka 12/24 adalah keterbacaan per foto, **bukan 50% akurasi fisik**. Foto dapat memuat beberapa indikator; adanya satu hasil tidak membuktikan semua indikator pada foto itu terbaca.

Laporan akhir merupakan gabungan satu putaran penuh 24 foto dan pengulangan 11 kasus digital setelah koreksi routing/decimal. Algoritme analog tidak berubah di antara dua putaran. Laporan lokal mencatat hash kode; hasil/crop/foto tetap privat di `Backend/runtime/new-gauge/`.

| Foto (akhiran nama) | Acuan pengguna | Hasil tervalidasi |
| --- | --- | --- |
| 091321 | 0.475 MPa | 0.475 MPa |
| 091331 | 0.473 MPa | 0.473 MPa |
| 091350 | 0.427 MPa | 0.427 MPa |
| 091419 | 0.433 MPa, koreksi pengguna | 0.433 MPa |
| 091421 | 0.430 MPa | 0.430 MPa |
| 091453 | sekitar 0.284 MPa | 0.297 MPa; selisih 0.013 MPa, perlu verifikasi |
| 091503 | sekitar 0.300 MPa | 0.300 MPa |
| 091509 | sekitar 0.300 MPa | 0.299 MPa |
| 091553 | belum dikonfirmasi ulang | 0.427 MPa analog; bukan acuan kebenaran |
| 091559 | belum dikonfirmasi ulang | 0.407 MPa digital; bukan acuan kebenaran |
| 091609 | 0.414 MPa | 0.414 MPa |
| 091713 | 2.36 mm | 2.36 mm |

Masih belum tervalidasi: 091429, 091435, 091440, 091455, 091459, 091557, 091603, 091606, 091706, 091726, 091729; 091543 dilewati. Tidak ada klaim target >80% atau >90% tercapai. Acuan analog yang berupa perkiraan foto belum menjadi pengukuran pembanding tersertifikasi, dan tiga desimal interpolasi tidak berarti akurasi ±0.001 MPa.

Dua regresi foto lama diuji ulang melalui alur API penuh: IMG_0418 menghasilkan 0.410 MPa dan IMG_20261009_085505 menghasilkan 15.96 mm, keduanya tervalidasi dengan confidence heuristik medium. Ini pemeriksaan dua kasus penting, bukan pengulangan seluruh dataset lama.

## Teaching berikutnya

Prioritaskan foto asli kamera dari kelompok yang masih gagal, anotasi display/label dan titik jarum, serta nilai acuan operator yang dikonfirmasi per nama file. Gunakan [panduan teaching](cv-teaching.md). Menambah foto ke folder tidak memicu pelatihan otomatis; aplikasi belum memiliki importer Labelme atau layar editor titik kalibrasi. Jangan memperlonggar validasi hanya agar jumlah hasil meningkat.
