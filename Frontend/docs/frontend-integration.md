# Input/output untuk developer frontend

Sumber kontrak: Backend/contracts/openapi.yaml dan Backend/contracts/frontend-types.ts (termasuk report-types.ts). Semua nama field mengikuti kontrak tersebut; tipe SQL dan private CV ID tidak menjadi API frontend.

## Transport dan sesi

Base /api/v1, cookie HttpOnly, withCredentials=true. Login POST auth/login dengan {username,password}; baca GET auth/me; ambil csrf_token dari GET auth/csrf dan kirim X-CSRF-Token untuk mutasi. Jangan menyimpan JWT di localStorage. Logout POST auth/logout lalu bersihkan cache dan sesi pengambilan foto.

JSON berhasil: {success:true,message,data,request_id}. Gagal: {success:false,message,code,request_id,details?}. Crop/evidence dan CSV adalah respons binary/text, bukan envelope JSON.

## Pemeriksaan dengan angka

1. GET maintenance/schedule dan maintenance/settings. Pilih context={line,production_date,shift,sampler,product_type_id?}. Waktu produksi berasal dari server; simpan konteks ini sepanjang pengukuran.
2. POST photos multipart: image=file asli, context=JSON.stringify(context). Hasil Photo memuat image_id, source_width/height, hash dan expires_at.
3. POST photos/{image_id}/discovery dengan {area}. Hasil menawarkan beberapa ROI, label_roi, instrument dan suggested_profile. Masing-masing perlu ditinjau.
4. POST analysis-jobs dengan {image_id,items:[{client_id,roi,label_roi?,instrument_id?,calibration_id?,profile}],area}. Jalankan otomatis setelah foto/identitas/profil tersedia. Poll GET analysis-jobs/{job_id} hingga terminal, batas waktu atau pembatalan.
5. Hasil utama: validated_prediction (angka atau null), candidate, confidence.valid/level/reasons, ROI dan label. Confidence bukan probabilitas akurasi yang telah dikalibrasi. candidate yang ditolak tidak boleh ditampilkan sebagai prediksi valid.
6. POST readings/confirm dengan {analysis_id,instrument_id,final_value,verified:true,identity_verified:true,context,check_id,sample_key,reason,confirmation_id}. final_value memakai titik desimal; reason wajib untuk nilai manual/koreksi/tidak tervalidasi. Retry memakai confirmation_id dan body yang sama.
7. Kumpulkan reading_id untuk tiap sampel. Sample_key biasa n1; difference memakai n1:before dan n1:after. Setiap sampel/tahap membutuhkan foto baru.
8. POST maintenance/records dengan {definition_id,context,interval,trigger,checked_at,observations:[{sample_id,reading_id}]}. Difference mengganti reading_id dengan before_reading_id/after_reading_id. Backend menghitung OK/NG terhadap snapshot standar.

ROI memakai {x,y,width,height} ternormalisasi0–1 pada foto penuh yang sudah mengikuti orientasi EXIF. Koordinat bukan piksel elemen HTML atau foto yang sedang diperbesar. Crop sementara POST photos/{image_id}/crop menerima ROI langsung, bukan {roi:...}.

## Pemeriksaan visual

Observations berupa [{sample_id,status:'OK'|'NG'}]. Lengkapi semua sampel dan konfirmasi sebelum POST maintenance/records. instrument_id opsional mengikat identitas alat visual; profil angka palsu tidak diperlukan.

## Riwayat dan SPC

- GET maintenance/summary?month=YYYY-MM&line=&shift= → total/ok/ng/ok_ratio,daily,groups. Unit hitung adalah catatan maintenance, bukan jumlah foto.
- GET maintenance/report?production_date_from=&production_date_to=&line=&limit=&cursor= → rows[].cells[].occurrences[]. Kosong tetap kosong; count>1 berarti beberapa kejadian.
- GET maintenance/spc dengan rentang dan definition_id → cohorts[].series/statistics/control_limits/capability. Pilih satu cohort sebelum menampilkan satu Cp/Cpk.
- GET maintenance/spc/subgroups menambah cohort_id,limit,cursor → X1…Xn dan evidence per kejadian. Grafik/statistik seluruh periode tidak dihitung dari satu halaman tabel.
- Pertahankan meta.as_of pada halaman/print/ekspor berikutnya agar snapshot konsisten. Cursor tidak boleh dipakai ulang setelah filter berubah.
- GET maintenance/export.csv dengan report_kind=checksheet atau spc dan filter sama mengekspor seluruh lingkup, termasuk data yang belum terlihat pada halaman.
- Evidence GET readings/{reading_id}/evidence/original atau crop memerlukan sesi. Jangan membangun path file lokal dari respons.
- Baseline GET/POST maintenance/spc-baselines; hanya Admin dapat menyimpan baseline dengan scope,cohort_id,method,review_reason. Batas kontrol dihitung server.

## Error dan siklus hidup

401: login ulang;403: hak akses/CSRF;409: konflik profil/evidence, analisis ulang sesuai alasan;410: foto/job kedaluwarsa, unggah ulang;413: ukuran foto;422: periksa field/lingkup;429: kapasitas reader, tunggu lalu coba. Tampilkan pesan operator, request_id pada detail, dan jangan menghapus input manual tanpa alasan.

Batalkan polling saat keluar atau mengganti foto/ROI/alat/profil. Gunakan generation token agar hasil lama tidak mengisi foto baru. Hentikan camera tracks dan revoke object URLs. Gambar dan draft tetap di memori, bukan query cache jangka panjang/localStorage. Jangan retry POST penyimpanan maintenance otomatis ketika status respons tidak pasti; cek riwayat lebih dahulu.
