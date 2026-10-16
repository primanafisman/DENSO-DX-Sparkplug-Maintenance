# Kamera HP dengan bingkai di jaringan lokal

Bingkai gauge dan label ditampilkan pada preview kamera di browser HTTPS. Foto dan pembacaan tetap diproses oleh komputer di jaringan lokal; tidak perlu domain, layanan cloud, atau akun tambahan. Pada alamat HTTP, tombol kamera memakai aplikasi kamera bawaan HP sehingga bingkai halaman tidak muncul di layar kamera bawaan.

## Persiapan komputer

1. Ekstrak paket transfer lengkap dan jalankan `setup.cmd` jika komputer ini belum disiapkan. Node 22.12–22.x dan Python 3.12 diperlukan seperti pada instalasi biasa.
2. Hubungkan komputer dan HP ke jaringan Wi-Fi yang sama. Jalankan `setup-camera.cmd` dari folder proyek. Perintah ini memasang pustaka sertifikat dengan versi yang dikunci, membuat CA lokal dan sertifikat server, lalu mengaktifkan HTTPS di `.env`. Internet diperlukan saat memasang dependensi pertama kali; pembacaan foto tidak memerlukan internet.
3. Klik kanan `setup-lan.cmd` dan pilih **Run as administrator** untuk mengizinkan port HTTP 8100 dan HTTPS 8443 hanya dari subnet lokal pada jaringan Windows berprofil **Private**. Aturan HTTP yang sudah sesuai digunakan kembali. Port Python 8101 tetap hanya di komputer. Jika aturan lama berbeda, periksa aturan tersebut; skrip tidak mengganti aturan yang berbeda secara otomatis.
4. Saat siap, jalankan `stop.cmd`, lalu `start.cmd`. Setup sertifikat sendiri tidak menghentikan atau memulai ulang layanan. Alamat HTTPS kamera akan ditampilkan dan disimpan dalam `runtime/lan-access.txt`.

Format alamat: `https://<IP-LAN>:8443/`. Gunakan alamat lengkap yang ditampilkan launcher di komputer Anda. Alamat HTTP8100 tetap tersedia untuk pemeriksaan layanan dan pengambilan foto melalui kamera bawaan.

## Percayai sertifikat pada HP sekali

Salin hanya **`runtime/tls/camera-ca.cer`** ke HP, misalnya melalui kabel USB atau transfer file lokal. Ini adalah sertifikat CA publik. Jangan menyalin `ca-key.pem` atau `server-key.pem`. File tersebut harus tetap berada di komputer proyek.

- **Android:** buka Pengaturan dan cari **Install certificate / Instal sertifikat**. Pilih sertifikat **CA**, lalu pilih `camera-ca.cer`. Nama menu berbeda antarprodusen; biasanya berada pada Keamanan → Enkripsi dan kredensial. Buka kembali Chrome dan gunakan alamat HTTPS kamera. Konfirmasi izin kamera saat diminta oleh browser.
- **iPhone/iPad:** buka file sertifikat lalu pasang profil melalui Pengaturan → Umum → VPN & Manajemen Perangkat. Setelah profil terpasang, buka Umum → Mengenai → Pengaturan Kepercayaan Sertifikat dan aktifkan kepercayaan penuh untuk **Sparkplug Maintenance Local Camera CA**. Buka kembali Safari dan gunakan alamat HTTPS kamera. [Petunjuk resmi Apple](https://support.apple.com/en-us/102390).

Jika kebijakan HP kantor melarang pemasangan CA, mintalah pengelola perangkat memasangnya. Pengambilan foto melalui alamat HTTP tetap tersedia. Mengabaikan peringatan sertifikat browser tidak menggantikan pemasangan CA yang dipercaya untuk preview kamera.

Setelah halaman HTTPS terbuka tanpa peringatan sertifikat, tekan **Buka kamera**. Izinkan kamera, posisikan gauge/display dan label sesuai bingkai, lalu ambil foto. Hasil pembacaan tetap perlu diperiksa sebelum disimpan.

## Crop yang bisa digeser dan foto layar monitor

Pada hasil pilih **Perbaiki crop**. Pilih **Gauge** untuk kotak hijau atau **Label** untuk kotak kuning. Seret bagian tengah kotak atau gunakan tombol arah; bulatan sudut dan tombol **＋/− Area** mengubah batas crop. **＋/− Foto** memperbesar tampilan saja. Pilih **Geser foto** untuk menggeser foto yang sudah diperbesar, termasuk ketika gauge memenuhi layar; pilih **Geser kotak** untuk kembali mengubah crop. Koordinat tetap mengacu foto asli, dan kedua area dapat disesuaikan terpisah. Jika label tidak terdeteksi, kotak kuning berupa usulan di bawah gauge dan baru dipakai ketika Anda memilih area label.

Mode **Alat langsung** digunakan untuk implementasi. Mode **Uji foto layar monitor** tersedia untuk pengujian: kamera web mencoba foto still pada resolusi yang didukung perangkat, meminta fokus kontinu bila tersedia, dan memilih satu foto dari paling banyak tiga tangkapan still. Jika API still tidak didukung/gagal, dipilih satu dari lima frame video. Mode biasa memakai satu still atau empat frame cadangan. Hanya satu foto terpilih dikirim ke CV; foto tidak digabung dan angka tidak direkonstruksi.

Foto layar adalah pemotretan ulang, sehingga hasilnya dapat berbeda dari upload file asli. Moiré, ukuran digit yang kecil, silau, fokus dan penyapuan layar dapat merusak garis jarum atau titik desimal. Perbesar foto di monitor sehingga seluruh skala/angka dan label tampak jelas, tahan HP stabil, jangan memakai flash, dan ubah jarak sedikit bila tampak garis atau gelombang. Tidak ada satu jarak dalam sentimeter yang cocok untuk semua ukuran gauge dan lensa HP. File asli atau foto alat langsung memberi bukti yang lebih baik untuk menguji akurasi pembaca.

Pemilihan frame dan indikator kualitas adalah bantuan saat memotret, bukan confidence pembacaan atau jaminan moiré hilang. Blur global tidak diterapkan pada foto untuk menebak angka: penyaringan berlebihan dapat menghapus titik desimal. Pada HTTP, kamera bawaan HP tetap tersedia tetapi kontrol fokus/burst/bingkai kamera web tidak dapat diterapkan oleh halaman. Gunakan HTTPS untuk fitur tersebut. Resolusi foto terpilih ditampilkan pada hasil untuk membantu pemeriksaan.

Dasar teknis: [W3C Image Capture](https://www.w3.org/TR/image-capture/) membedakan foto still dan frame video serta menyediakan kontrol kamera berdasarkan kapabilitas; [riset ICCV tentang demoiréing](https://openaccess.thecvf.com/content/ICCV2023/html/Quan_Deep_Video_Demoireing_via_Compact_Invertible_Dyadic_Decomposition_ICCV_2023_paper.html) menjelaskan sulitnya memisahkan pola layar dari detail asli. Keberhasilan fitur pada HP tertentu tetap perlu uji perangkat.

## Jika alamat IP berubah atau sertifikat perlu diperbarui

Jalankan kembali `setup-camera.cmd` saat tersambung ke Wi-Fi yang akan digunakan. Sertifikat server baru berisi IP LAN saat ini, `127.0.0.1`, dan `localhost`. CA yang sama digunakan kembali, sehingga HP tidak perlu memasang CA lagi. Setelah itu jalankan `stop.cmd` lalu `start.cmd` dan buka alamat baru.

Sertifikat server berlaku satu tahun; CA berlaku sepuluh tahun. Jika pasangan CA tidak lengkap atau hampir kedaluwarsa, setup berhenti dengan pesan untuk diperiksa. Jangan menghapus salah satu file CA. Penggantian CA memerlukan pemasangan kepercayaan ulang di HP.

Pada komputer baru, jalankan setup kamera di komputer tersebut untuk membuat identitas lokalnya sendiri. Paket transfer tidak membawa `runtime/tls` atau private key dari komputer sebelumnya; HP perlu mempercayai CA komputer baru.

## Konfigurasi dan pemeriksaan

`setup-camera.cmd` menambahkan konfigurasi berikut:

```text
SPM_LAN_ENABLED=1
SPM_HTTPS_ENABLED=1
SPM_HTTPS_PORT=8443
SPM_TLS_CERT=runtime/tls/server-cert.pem
SPM_TLS_KEY=runtime/tls/server-key.pem
SPM_TLS_CA=runtime/tls/ca-cert.pem
```

Origin HTTPS untuk IP saat ini juga ditambahkan ke daftar origin yang diizinkan. Semua URL UI dan API menggunakan origin halaman yang sama. Gunakan `start.cmd` agar origin dan alamat LAN aktif disiapkan dengan benar. Untuk port khusus, jalankan `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-camera.ps1 -HttpsPort 8444`, lalu jalankan kembali helper firewall sebagai administrator.

Jika kamera tidak tampil, periksa alamat dimulai dengan `https://`, CA sudah dipercaya, izin kamera situs aktif, IP masih sesuai, dan jaringan HP dapat menjangkau komputer. Jika jaringan melakukan isolasi antarperangkat, gunakan jaringan lokal yang mengizinkan koneksi tersebut. Port 8101 tidak perlu dibuka untuk HP.

Untuk menonaktifkan HTTPS, atur `SPM_HTTPS_ENABLED=0` pada `.env` lalu restart dengan `stop.cmd` dan `start.cmd`. Sertifikat tetap disimpan untuk penggunaan berikutnya. Saat pengujian selesai dan CA tidak dibutuhkan lagi, hapus kepercayaan CA proyek dari HP melalui pengaturan sertifikat perangkat.
