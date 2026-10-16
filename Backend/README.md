# Sparkplug Maintenance

Backend rekonstruksi untuk digitalisasi pemeriksaan Spark Plug Final Assy. Node22/Express5 menyediakan API, autentikasi dan penyimpanan bisnis; Python3.12 menyediakan OpenCV dan OCR CPU offline. Tidak membutuhkan langganan AI atau kunci Gemini. Frontend akhir dibuat tim lain; `smoke_ui` hanya halaman uji integrasi.

Jalankan **start.cmd** dari folder **Backend** yang sudah disiapkan, lalu buka **http://127.0.0.1:8100/**. ID uji: **SPM-TEST**; password dibuat lokal dan tersedia di `runtime/test-access.txt`. Mesin Python internal memakai port8101.

Untuk komputer Windows x64 lain, clone repository atau unduh **Code → Download ZIP**, ekstrak, lalu buka folder **Backend**. Sediakan Node.js 22/Python 3.12, jalankan **setup.cmd** untuk instalasi library dan konfigurasi, lalu **start.cmd**. Buka **http://127.0.0.1:8100/** pada komputer itu. Tiga model OCR ada di `cv_engine/models/ocr`; tidak membutuhkan folder PanelReader lama. Bundle transfer terpisah dapat digunakan jika diberikan. [Panduan instalasi, transfer dan akses HP](docs/deployment/installation.md) menjelaskan prasyarat, konfigurasi runtime, firewall LAN dan kamera.

Referensi pengembang: [OpenAPI](contracts/openapi.yaml), [tipe frontend](contracts/frontend-types.ts), [client cookie/CSRF](contracts/frontend-client.js), [Postman](postman/SparkplugMaintenance.postman_collection.json), [integrasi frontend](docs/integration/frontend.md), [maintenance](docs/integration/maintenance.md), [arsitektur](ARCHITECTURE.md), [cakupan verifikasi](docs/verification/README.md).

Repository berisi kode, tiga model OCR, tes, kontrak dan dokumen. `.env`, database, foto pribadi, password dummy, dependensi terpasang dan cache tidak dipublikasikan; setup menyiapkannya pada komputer tujuan. Gunakan source terbaru yang menyertakan ketiga model.

Database produksi belum dipilih. SQLite sudah menjadi adapter lokal; koneksi SQL Server/MySQL dan Sonar perusahaan membutuhkan verifikasi tersendiri. Struktur mengikuti panduan Denso yang tersedia; proyek ini belum merupakan sertifikasi DX, persetujuan produksi atau hasil UAT manusia.

Revisi portabilitas diuji dengan **97 tes Node**. Pembaca **hybrid-cv-v0.2.4** mempertahankan perbaikan orientasi OCR LED, titik LCD dari foto layar dan label tombol gabungan. [Cakupan dan batas pengujian](docs/verification/README.md) membedakan pemeriksaan otomatis dan UAT fisik. Foto operator dan laporan lokal tidak dipublikasikan.
# Pembaruan alur uji lokal

Foto dari kamera atau upload langsung diproses CV, dengan indikator tahap analisis. Hasil menampilkan angka, crop gauge, dan crop label jika ditemukan; penyimpanan tetap melalui konfirmasi operator. Jadwal dipilih dari waktu server WIB: Shift 1 pukul 07:45/12:45 dan Shift 2 pukul 21:15/01:15.

Editor crop menyediakan drag kotak/sudut, tombol arah dan ukuran, serta zoom/pan foto. Gauge dan label diatur terpisah. Kamera HTTPS menyediakan mode alat langsung dan uji monitor dengan foto still/burst terpilih sesuai dukungan perangkat. Untuk pengujian akurasi, utamakan foto alat langsung atau file asli; foto monitor dapat kehilangan detail akibat fokus/pola layar.

Untuk bingkai langsung di kamera browser HP, jalankan `setup-camera.cmd`, ikuti [panduan kamera lokal](docs/deployment/local-camera.md), kemudian jalankan `start.cmd`. HTTP 8100 tetap mendukung upload/kamera bawaan; HTTPS lokal 8443 mendukung preview dengan bingkai setelah CA lokal dipercaya HP. Tidak memerlukan domain/cloud. ID dan password uji komputer ini berada di `runtime/test-access.txt`.

