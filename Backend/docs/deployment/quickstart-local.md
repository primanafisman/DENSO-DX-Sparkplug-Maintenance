# Mulai di komputer lokal

## Komputer yang sekarang

1. Buka folder **Backend** pada lokasi instalasi Anda.
2. Klik dua kali **start.cmd** dan tunggu tulisan **Siap**.
3. Buka **http://127.0.0.1:8100/** pada browser komputer ini.
4. Login **SPM-TEST**; password lokal ada di **runtime/test-access.txt**.
5. Biarkan terminal server terbuka. Untuk berhenti, jalankan **stop.cmd**.

## Instalasi pertama di komputer Windows lain

1. Instal **Node.js 22 x64 (minimal 22.12, beserta npm)** dan **Python 3.12 x64**. Instalasi library pertama memerlukan internet.
2. Clone repository atau unduh **Code → Download ZIP**, ekstrak ke folder yang dapat ditulis, lalu buka **Backend**. Bundle transfer terpisah juga dapat dipakai jika diberikan. Jangan menyalin node_modules, .venv, .env atau runtime komputer asal.
3. Klik dua kali **setup.cmd**. Installer memasang library, memeriksa tiga model OCR yang sudah ada dalam bundle, membuat konfigurasi/database lokal dan akun uji baru.
4. Setelah tulisan **Instalasi selesai**, klik dua kali **start.cmd**.
5. Buka **http://127.0.0.1:8100/** pada komputer tersebut. Baca password uji yang dibuat di **runtime/test-access.txt**; password instalasi lain tidak disalin.

127.0.0.1 menunjuk komputer yang dipakai untuk membuka browser. Tidak membutuhkan alamat IP komputer pengembang, Cloudflare, akun Codex atau Gemini API key. Node/Python tetap menjadi prasyarat; setup memasang library aplikasi, bukan memasang runtime ke sistem secara global.

Jika Node/Python dipasang pada lokasi khusus, gunakan contoh NODE_BIN/PYTHON_BIN dalam [panduan lengkap](installation.md). Setup menyimpan lokasi runtime yang sudah diverifikasi untuk startup berikutnya. Folder instalasi boleh memakai spasi.

Kamera live dengan bingkai pada HP melalui Wi-Fi memerlukan setup-camera.cmd dan pengaturan HTTPS/perangkat tersendiri. Untuk mencoba aplikasi melalui browser komputer sendiri, HTTP lokal di atas sudah cukup. [Panduan kamera lokal](local-camera.md).
