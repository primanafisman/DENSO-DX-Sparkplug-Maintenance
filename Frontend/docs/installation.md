# Instalasi frontend dan backend lokal

Draft implementasi; hasil pengujian akhir dicatat di verification.md.

## Folder

```text
Sparkplug Maintenance/
  setup.cmd
  start.cmd
  stop.cmd
  Backend/
  Frontend/
```

Pertahankan kedua folder sebagai saudara. Hindari memindahkan hanya file start.cmd. Tidak ada path D: atau nama pengguna yang diperlukan dalam konfigurasi distribusi.

## Instalasi awal

1. Ekstrak paket ke folder lokal yang dapat ditulis. Sediakan Node22 (>=22.12,<23), Python sesuai README Backend, dan koneksi internet untuk pemasangan pustaka pertama.
2. Jalankan setup.cmd pada folder utama. Instalasi memeriksa runtime, memasang pustaka backend/CV dan frontend, memverifikasi model OCR, menyiapkan atau memigrasikan database lokal, kemudian membangun frontend.
3. Instalasi yang menemukan SQLite lama membuat backup sebelum migrasi. Hentikan server terlebih dahulu. Jangan menjalankan db:init untuk database yang telah berisi data. Jangan menghapus runtime/ untuk memperbarui aplikasi.
4. Akun uji yang dibuat instalasi berada di Backend/runtime/test-access.txt. File ini bersifat lokal; jangan memasukkannya ke GitHub/paket sumber. Akun dan kata sandi yang sudah diubah tetap dipertahankan.
5. Jalankan start.cmd. Buka alamat lokal yang ditampilkan. Stop.cmd menghentikan proses yang terbukti milik aplikasi ini.

Instalasi pertama memerlukan unduhan; paket ini bukan installer offline seluruh sistem operasi. Model OCR yang diperlukan disertakan sesuai manifest Backend/cv_engine/models, sementara .venv dan node_modules dibuat ulang di komputer tujuan.

## Penggunaan HP dalam jaringan lokal

HP dan komputer server harus terhubung ke jaringan yang sama. Gunakan alamat LAN yang dicetak launcher. Untuk pratinjau kamera dengan bingkai, ikuti Backend/docs/deployment/local-camera.md: aktifkan HTTPS lokal, pasang CA lokal pada HP dan izinkan kamera. Upload/capture native tetap tersedia sebagai cadangan bila browser membatasi pratinjau.

Sertifikat dan kunci lokal terikat lingkungan instalasi dan tidak disalin ke GitHub. Jika IP berubah, jalankan konfigurasi kamera lokal kembali sesuai panduan. Tidak diperlukan Cloudflare, domain publik atau API key AI.

## Pengembangan

Jalankan backend terlebih dahulu. Dari Frontend jalankan npm run dev untuk Vite lokal; /api diteruskan ke Node8100. Gunakan build yang disajikan oleh Backend untuk uji kamera HP/HTTPS dan cookie satu-origin yang mendekati penggunaan operasional.

Pemeriksaan: npm run lint, npm run typecheck, npm test -- --run, npm run build. Backend mempunyai npm test dan npm run lint tersendiri; jalankan dari folder Backend. Hasil build frontend berada di Frontend/dist. Backend tanpa build frontend tetap menyediakan halaman uji di /smoke/index.html.
