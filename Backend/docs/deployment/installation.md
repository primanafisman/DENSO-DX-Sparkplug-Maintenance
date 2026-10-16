# Instalasi, konfigurasi dan uji lokal

## Menjalankan backend yang sudah terpasang

Buka folder **Backend** pada lokasi instalasi Anda. Jalankan **start.cmd** dari folder tersebut, lalu buka **http://127.0.0.1:8100/** pada browser komputer yang sama. Alamat127.0.0.1 selalu menunjuk komputer yang sedang digunakan, sehingga tidak perlu mengganti IP untuk akses lokal. ID dummy: **SPM-TEST**; password tersimpan di **runtime/test-access.txt**. Account ini Admin untuk menguji pengaturan. Password tidak ditanam dalam kode.

Startup memeriksa hash model, menunggu OCR aktif dan memeriksa `/ready`. Jika server proyek yang sama sudah sehat dan konfigurasi sama, server digunakan kembali. Perubahan konfigurasi menyebabkan restart proses yang kepemilikannya telah diverifikasi. Hentikan server melalui **stop.cmd** sebelum mengganti kode/bundle.

Launcher mendukung pembacaan catatan proses pada PowerShell5 dan7. Waktu lahir proses dibandingkan sebagai UTC ticks yang tepat, bukan format teks lokal; proses lain yang kebetulan memakai port yang sama tidak dihentikan. Jika alamat/port masih digunakan setelah update, periksa catatan pemilik pada runtime, jangan mengakhiri semua proses Python/Node sekaligus.

## Transfer ke komputer lain

1. Clone repository atau unduh **Code → Download ZIP**, ekstrak ke folder pilihan, lalu buka **Backend**. Jika menerima bundle transfer **sparkplug-maintenance-1.0.0-bundle.zip** secara terpisah, ekstrak isinya ke folder aplikasi, misalnya **D:\Applications\Sparkplug Maintenance\Backend**. Folder yang berisi setup.cmd/start.cmd adalah root aplikasi; tidak harus sama dengan lokasi komputer asal. Keduanya menyertakan backend, tiga model OCR, kontrak API, tes, halaman uji sederhana dan dokumentasi. Bundle release tidak disertakan dalam repository Git.
2. Prasyarat Windows x64: **Node >=22.12 <23** dan **Python 3.12.x**. Versi yang diuji: Node22.23.3/Python3.12.14. Bila keduanya tidak ada di PATH, atur path pada PowerShell:

```powershell
$env:NODE_BIN = 'D:\path\to\node.exe'
$env:PYTHON_BIN = 'D:\path\to\python.exe'
Set-Location 'D:\Applications\Sparkplug Maintenance\Backend'
.\setup.cmd
```

3. **setup.cmd** memasang library dari package-lock/requirements lock, membuat virtualenv di komputer tujuan, memeriksa model yang dibundel, membuat `.env` dengan secret acak, menyiapkan schema SQLite kosong dan membuat akun dummy development. Internet diperlukan untuk instalasi library pertama; pemrosesan sesudahnya berjalan lokal. File `.env` yang sudah ada dipertahankan.
4. Baca ID/password baru di **runtime/test-access.txt**. Setiap instalasi menghasilkan password berbeda. Jalankan **start.cmd**, tunggu tulisan **Siap**, kemudian buka **http://127.0.0.1:8100/** di komputer tersebut. Komputer tidak memerlukan IP/domain komputer pengembang untuk akses ini.
5. Jalankan **check.cmd** untuk tes API/CV, struktur dan database. Tes yang membutuhkan screenshot pribadi dilewati dengan alasan yang jelas pada komputer tanpa fixture tersebut; tes sintetis tidak memerlukan foto pribadi.

Setup mencari Node22 yang sesuai dari NODE_BIN, konfigurasi runtime lokal, folder tools aplikasi/induk, lalu PATH. Python3.12 dapat ditemukan dari PYTHON_BIN, environment yang masih sehat, konfigurasi lokal, launcher **py -3.12**, atau PATH. Jika memakai path khusus seperti contoh di atas, setup menyimpannya setelah berhasil di **runtime/tool-paths.json**; start.cmd yang diklik dari File Explorer tidak perlu mengatur variabel tersebut lagi. Path disimpan dalam bentuk absolut Windows yang sudah dinormalisasi.

File tool-paths.json hanya berlaku di komputer instalasi itu dan tidak ada di bundle. Path yang sudah tidak tersedia tidak dipakai; installer mencoba kandidat lain. Jika virtualenv disalin dari komputer lain dan rusak, setup dapat membuat ulang launcher/config dengan Python3.12 yang tersedia, kemudian memasang library kembali. `.env`, database dan akun lama dipertahankan; ini bukan perintah mereset data. Instalasi bersih dari ZIP tetap menjadi cara transfer yang dianjurkan.

## Memindahkan folder pada komputer yang sama

Hentikan layanan dengan stop.cmd **sebelum** memindahkan folder. Pindahkan root aplikasi beserta isinya, lalu jalankan start.cmd di lokasi baru. Jika environment atau runtime tidak ditemukan, jalankan setup.cmd di lokasi baru satu kali. Jangan menyunting file library/pyvenv.cfg secara manual. Model, runtime, SQLite dan TLS default menggunakan path relatif terhadap root aplikasi. Runtime eksternal yang Anda atur dengan path absolut harus masih tersedia.

Jangan memindahkan `.venv`, `node_modules`, `.env` atau database dari komputer asal untuk instalasi bersih. Setup membangun lingkungan sesuai komputer tujuan. Foto contoh juga tidak dibundel. Tiga ONNX yang sudah dilatih disertakan di **cv_engine/models/ocr**:

- PP-OCRv6_det_small.onnx — deteksi teks.
- PP-OCRv6_rec_small.onnx — pengenalan karakter.
- ch_ppocr_mobile_v2.0_cls_mobile.onnx — orientasi teks.

Hash/ukuran tercatat di `docs/governance/ocr-artifacts.json` dan diperiksa `scripts/verify-models.js`. Tidak ditemukan model keypoint gauge hasil training terpisah pada proyek lama; registri kalibrasi lama berisi **0 record**. Perbaikan OpenCV lama sudah ada pada source `cv_engine/src/vision`. Asal download/lisensi spesifik model tetap dicatat sebagai belum diverifikasi; bundle ini mengikuti permintaan transfer internal pengguna.

## Uji HP pada jaringan lokal

Tidak menggunakan Cloudflare atau domain. Hubungkan HP dan laptop ke Wi-Fi yang sama; laptop harus tetap hidup. Dengan **SPM_LAN_ENABLED=1**, launcher development mendeteksi IP private, menambahkan origin yang sesuai dan menampilkan alamat HP. Gunakan alamat terkini dari **runtime/lan-access.txt**. IP dapat berubah setelah pindah jaringan; jangan menyimpan IP contoh sebagai alamat tetap. Jalankan ulang start.cmd setelah pindah jaringan agar origin diperbarui.

Jika Windows memblokir akses HP:

1. Pada jaringan uji milik Anda yang dipercaya, buka Settings → Network & Internet → Wi-Fi → jaringan aktif → pilih **Private**.
2. Klik kanan **setup-lan.cmd → Run as administrator**, sekali. Skrip membuat izin inbound TCP hanya untuk executable Node yang digunakan, port API, profil Private dan sumber LocalSubnet. Port Python tidak dibuka; aturan blok Public yang sudah ada dipertahankan.
3. Jalankan `start.cmd`, buka alamat pada `runtime/lan-access.txt` dari HP. Pastikan router tidak mengisolasi perangkat antarclient.

Kebijakan firewall dan isolasi perangkat ditentukan oleh komputer/jaringan tujuan. Akses lokal127.0.0.1 tidak memerlukan perubahan profil Wi-Fi. Untuk akses dari HP, lakukan pengaturan jaringan yang sesuai dan uji dari perangkat tersebut.

Tombol **Buka kamera** pada HTTP LAN memakai kamera bawaan HP melalui file capture, kemudian mengupload hasil ke API yang sama. Upload galeri tetap tersedia. Untuk preview dengan bingkai gauge dan label di browser HP, jalankan **setup-camera.cmd**, percayai CA lokal pada HP sesuai [panduan kamera lokal](local-camera.md), lalu buka alamat HTTPS8443 yang dicetak launcher. HTTPS dan HTTP menggunakan API yang sama. Halaman ini hanya alat uji; frontend akhir dibangun tim penerima.

## Parameter konfigurasi

| Parameter | Fungsi |
|---|---|
| JWT_SECRET | Secret aplikasi >=32 karakter, dibuat otomatis. |
| CV_INTERNAL_TOKEN | Secret Node↔Python >=32 karakter; bukan kunci layanan AI. |
| NODE_ENV | development/test/production; produksi memakai cookie Secure dan origin HTTPS. |
| SPM_LAN_ENABLED | 1 untuk uji LAN development; 0 untuk loopback saja. Tidak mengaktifkan mode LAN pada production. |
| HOST / PORT | Listener API. Mode LAN development menggunakan0.0.0.0; default port8100. |
| CV_URL | Private engine HTTP loopback, default127.0.0.1:8101; satu worker. |
| CORS_ORIGINS | Origin eksplisit, dipisahkan koma. Launcher menambahkan IP LAN private pada mode development; tanpa wildcard. |
| OCR_MODEL_DIR | Defaultcv_engine/models/ocr, relatif workspace; tetap benar setelah pindah folder. |
| RUNTIME_DIR | State privat: SQLite, evidence dan log. Default runtime. |
| DB_DIALECT / DB_STORAGE | sqlite untuk development; override file database bila diperlukan. |
| DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD | Parameter adapter mssql/mysql; diisi setelah server/schema perusahaan disiapkan. |

`GET /health` menandai proses hidup. **GET /ready harus200 dan ocr_ready=true** sebelum scan. Satu Node instance dan satu Python worker diperlukan karena foto/job temporer berada dalam memori; restart menghapus ID sementara dan operator mengupload ulang. Hasil yang dikonfirmasi tetap tersimpan di database/evidence.

## Akun dan database perusahaan

Akun dummy dibuat otomatis hanya pada **development + SQLite**. Untuk akun nyata, gunakan CLI `scripts/seed-admin.js` dengan ADMIN_USERNAME/ADMIN_PASSWORD; password bcrypt minimal12karakter/maksimal72byte UTF-8. Baca `SECURITY.md` sebelum deployment produksi.

```powershell
$env:ADMIN_USERNAME = 'NPK-ANDA'
$securePassword = Read-Host 'Password baru' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
if ($env:NODE_BIN) { & $env:NODE_BIN scripts/seed-admin.js } else { node scripts/seed-admin.js }
Remove-Item Env:\ADMIN_PASSWORD
```

SQLite sudah diuji. SQL Server/MySQL disediakan melalui adapter, tetapi server produksi belum dipilih/diuji langsung. Sepakati engine/schema dengan DX, provision database/user dengan izin minimum, review `database/` serta `scripts/initialize-database.js`, lalu konfigurasi `.env`. Inisialisasi menolak database berisi tabel; startup memeriksa schema version1. Jangan memakai dummy untuk produksi. File kredensial lokal tidak disertakan dalam bundle.

## Troubleshooting dan rollback

- Port terpakai proses lain: launcher tidak mematikannya berdasarkan port. Periksa pemilik proses.
- OCR gagal: periksa hash model dan `runtime/cv.stderr.log`; runtime tidak mengunduh model.
- Belum terbaca: seluruh display/dial, titik/minus dan jarum harus masuk crop. Koreksi manual wajib alasan dan verifikasi. Kegagalan asli085310/085410/085413 masih sama seperti proyek sebelumnya; lihat laporan foto.
- 401/403: login ulang, ambil CSRF baru, periksa role/origin dan alamat IP saat ini.
- 410: foto/job kedaluwarsa atau server restart; upload ulang.
- 429: antrean/kapasitas sementara penuh; tunggu lalu ulangi. Frontend sebaiknya memiliki satu job aktif per operator.
- Sampel berikutnya: ambil foto baru. Mengganti crop/ID tidak membuat foto sumber yang sama menjadi sampel baru untuk alat yang sama.
- Update/rollback: `stop.cmd`, simpan database/evidence sesuai kebijakan, ganti bundle/config yang telah diverifikasi, jalankan `start.cmd`. Jangan menimpa data dengan schema baru tanpa migration yang ditinjau.

Node→Python melalui server nyata, login, tiga pembacaan/konfirmasi, hash evidence dan pemeriksaan visual OK sudah diuji. Windows stop/restart mengikutkan child interpreter dari virtualenv berdasarkan executable, creation time dan ancestry. UAT kamera HP fisik serta pairing SQL Server/MySQL/Sonar perusahaan tetap belum dijalankan.
## Kamera HP dengan bingkai dan jadwal otomatis

Halaman uji mengambil shift dan tanggal produksi dari API waktu server WIB. Batas awal: Shift 1 07:45 dan 12:45; Shift 2 21:15 dan 01:15. Jam HP tidak digunakan untuk menentukan jadwal. Foto langsung masuk discovery dan pembacaan CV setelah diambil/dipilih; tahap proses terlihat dan hasil belum tersimpan sampai dikonfirmasi.

Kamera bawaan HP pada HTTP tidak mendukung overlay halaman. Untuk preview browser dengan bingkai gauge dan label, jalankan `setup-camera.cmd`, pasang sertifikat CA publik pada HP, dan gunakan alamat HTTPS yang ditampilkan `start.cmd`. Lihat [langkah lengkap](local-camera.md). `setup.cmd` memasang pustaka pembuat sertifikat; setup kamera mengaktifkan listener HTTPS tambahan. File private key dibuat pada setiap komputer dan tidak ikut bundle.

