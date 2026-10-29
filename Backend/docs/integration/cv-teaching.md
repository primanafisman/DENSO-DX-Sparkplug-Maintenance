# Panduan dataset dan teaching CV lokal

Panduan untuk operator dan developer, 29 Oktober 2026.

## Yang digunakan saat ini

Pembacaan menggunakan OpenCV, aturan geometri/segmen, dan OCR lokal dengan model ONNX yang sudah disertakan. Tidak ada model khusus jarum yang otomatis belajar setiap kali foto ditambahkan. Istilah "training foto baru" pada pengembangan ini berarti menganalisis kegagalan, memperbaiki algoritme, dan menguji ulang terhadap nilai acuan terpisah.

Mengoreksi hasil pengamatan atau mengganti batas OK/NG tidak melatih OCR. Nilai acuan hanya untuk membandingkan hasil setelah pembacaan; jangan memasukkannya sebagai jawaban yang diharapkan oleh pengenal.

## Lokasi pada komputer pengembangan

| Isi | Lokasi |
| --- | --- |
| 24 foto pengujian baru | `D:\ChatGPT Projects\New Gauge Training` |
| Contoh foto sebelumnya | `D:\ChatGPT Projects\AnalogGauge Example` |
| Proyek backend | `D:\ChatGPT Projects\Sparkplug Maintenance\Backend` |
| Kode pembacaan | `Backend/cv_engine/src/vision/` |
| Pengujian regresi | `Backend/cv_engine/tests/` |
| Model OCR yang ikut workspace | `Backend/cv_engine/models/ocr/` |
| Manifest integritas model | `Backend/docs/governance/ocr-artifacts.json` |
| Laporan lokal pengujian baru | `Backend/runtime/new-gauge/` |

Path relatif di tabel dihitung dari folder Sparkplug Maintenance. Folder foto berada di luar repositori. `runtime/` berisi hasil pengujian privat dan tidak ikut Git/paket publik. Model OCR bukan dataset foto perusahaan; ada tiga berkas ONNX deteksi, pengenalan, dan orientasi. Jangan mengedit isi biner ONNX secara manual.

## Memilih bagian yang perlu diubah

| Masalah / jenis foto | Bagian kode utama |
| --- | --- |
| Tidak menemukan gauge/display atau salah memilih ROI | `hybrid_discovery.py`, `hybrid_display.py` |
| Gauge analog 0–1 MPa: lingkaran/kemiringan, skala, pusat dan jarum | `hybrid_auto_analog.py` |
| Gauge analog memakai template kalibrasi per alat | `hybrid_analog.py` |
| Memastikan urutan angka skala analog | `hybrid_scale_ocr.py` |
| Angka digital LED/LCD, tanda minus, titik desimal, kesepakatan pembaca | `hybrid_digital.py` |
| Meluruskan jendela display / menemukan baris digit | `hybrid_display.py` |
| Mengurai bentuk segmen digit LCD | `segment_reader.py` |
| Memuat dan menjalankan OCR lokal | `text_ocr.py` |
| Kualitas, kontras, crop dan pengolahan gambar umum | `images.py`, `preprocessing.py` |
| Alur pemilihan analog/digital dan versi algoritme | `hybrid.py` |

Semua nama Python di atas berada di `Backend/cv_engine/src/vision/`. Label nama alat dicocokkan dengan data registrasi; ubah nama/alias dan hubungan pemeriksaan melalui Pengaturan → Peralatan. Ini berbeda dari label pelatihan berupa kotak/titik pada gambar.

Tidak semua foto gagal membutuhkan training OCR. Periksa urutannya: ROI lengkap → perspektif/kontras → segmen digit/jarum → titik desimal dan satuan → pencocokan alat → validasi. Misalnya OCR sudah membaca 2.36 tetapi validasi titik menolak: perbaiki bukti geometri titik, bukan memaksa hasil atau melatih ulang seluruh model.

## Aplikasi teaching manual

Gunakan [Labelme](https://github.com/wkentaro/labelme), aplikasi anotasi yang mendukung rectangle dan point. Anotasi manual dapat digunakan tanpa API AI. Pasang pada lingkungan terpisah dari `.venv` produksi agar dependensi pembaca tetap terkunci; aplikasi ini belum dibundel dalam installer proyek.

Langkah operator:

1. Buka foto asli, bukan screenshot halaman hasil aplikasi.
2. Buat rectangle `gauge` untuk seluruh muka analog atau rectangle `display` untuk jendela angka digital. Sertakan seluruh digit, minus, titik dan satuan yang terlihat.
3. Buat rectangle `equipment_label` terpisah pada nama alat/test yang benar, bukan tulisan tombol ORIGIN/ON-OFF atau nama file dari layar laptop.
4. Pada analog, tandai point `pivot`, `needle_tip` pada jarum pembaca, serta `scale_0`, `scale_0_2`, `scale_0_4`, `scale_0_6`, `scale_0_8`, `scale_1` tepat di garis skala terkait. Abaikan penanda hijau sebagai jarum pembaca.
5. Simpan JSON anotasi dengan nama dasar yang sama dengan foto. Catat nilai acuan, satuan, jenis alat dan cara verifikasinya dalam CSV.
6. Kirim foto, JSON dan CSV kepada developer. **Saat ini JSON Labelme belum dapat diimpor langsung ke aplikasi dan belum memicu training.** Developer harus membuat konversi anotasi atau alur training terpisah bila kelak menggunakan model terlatih.

Contoh kolom CSV (format kerja yang disarankan, bukan endpoint impor saat ini):

```csv
filename,instrument_name,kind,unit,reference_value,reference_source,session,split
foto-001.jpg,B3601,digital_led,MPa,0.433,operator,2026-10-29-A,train
foto-002.jpg,MC Lowering 1,analog_pressure,MPa,0.425,operator,2026-10-30-B,test
foto-003.jpg,Kaliper,caliper_lcd,mm,2.36,operator,2026-10-30-C,test
```

Kelompokkan foto menjadi analog pressure, digital LED, dan LCD kaliper/mikrometer. Gunakan variasi alat, jarak, sudut, cahaya dan latar yang nyata. Pisahkan foto uji berdasarkan alat/sesi pemotretan agar salinan foto yang hampir sama tidak masuk kelompok pengembangan dan uji sekaligus. Foto buram, tertutup atau terpotong tetap boleh dikumpulkan dengan penanda tidak terbaca; jangan beri angka tebakan sebagai acuan pasti.

## Kalibrasi analog yang sudah tersedia di backend

Public API menyediakan `POST /api/v1/instruments/:id/calibrations` untuk Admin, dengan sesi login dan CSRF. Frontend saat ini belum menyediakan editor titik kalibrasi. Gunakan API client seperti Postman atau integrasikan editor di frontend nanti.

Body memuat:

| Field | Isi |
| --- | --- |
| `image_id` | ID hasil unggah foto melalui API |
| `roi` | Kotak gauge pada foto: x, y, width, height dalam 0–1 |
| `pivot` | Pusat jarum x,y dalam 0–1 relatif terhadap crop gauge |
| `scale_points` | Tepat enam x,y,value berurutan untuk 0, 0.2, 0.4, 0.6, 0.8, 1; x,y relatif terhadap crop |
| `clockwise` | Arah kenaikan nilai skala |
| `resolution` | Resolusi fisik skala yang diverifikasi, bukan jumlah desimal tampilan |

Peralatan harus aktif, berfungsi, dan memiliki profil analog 0–1 MPa yang didukung. API memeriksa geometri dan menyimpan versi template melalui adapter database (`SPM_M_Calibration`). Analisis berikutnya harus mengirim `calibration_id` yang dimiliki alat itu dan profil yang sesuai. Template tidak otomatis dipilih hanya karena endpoint kalibrasi pernah dipanggil. Koordinat titik tidak boleh dipakai ulang terhadap crop berbeda tanpa penyesuaian.

Implementasi: `Backend/src/validations/instrumentValidation.js`, `Backend/src/services/instrumentService.js`, `Backend/src/services/analysisService.js`. Template tetap perlu diuji pada foto baru dengan sudut/cahaya berbeda; kalibrasi bukan jaminan semua foto akan terbaca.

## Mengembangkan dukungan bentuk baru

1. Daftarkan alat, satuan, rentang fisik, desimal dan batas OK/NG melalui Pengaturan.
2. Kumpulkan foto dan acuan terverifikasi; pertahankan file asli.
3. Identifikasi tahap kegagalan memakai detail/crop dan laporan backend.
4. Tambahkan pengujian gagal yang mewakili masalah, kemudian perbaiki modul yang sesuai. Jangan membuat aturan nama file → nilai.
5. Jalankan pengujian CV dan benchmark dataset baru serta dataset lama yang sudah berhasil. Laporkan tingkat terbaca dan ketepatan nilai sebagai dua ukuran berbeda.
6. Bandingkan nilai digital beserta tanda/titik/satuannya secara tepat; gunakan toleransi analog yang disepakati berdasarkan resolusi alat. Tiga desimal hasil interpolasi tidak membuktikan akurasi fisik ±0.001 MPa.
7. Naikkan versi algoritme, bangun paket dan restart layanan setelah verifikasi.

Jenis analog selain keluarga 0–1 MPa memerlukan dukungan algoritme dan validasi baru; mengganti batas profil saja tidak menambah dukungan pembacaan skala. Model OCR baru juga memerlukan kompatibilitas format/preprocessing dan pembaruan hash/provenance manifest, bukan sekadar mengganti nama berkas ONNX.
