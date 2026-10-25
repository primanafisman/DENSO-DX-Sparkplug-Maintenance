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
6. POST readings/confirm dengan {analysis_id,instrument_id,final_value,verified:true,identity_verified:true,context,check_id,sample_key,reason,confirmation_id}. final_value memakai titik desimal; reason opsional (aplikasi mengirim string kosong); verifikasi angka/identitas tetap wajib. Retry memakai confirmation_id dan body yang sama.
7. Kumpulkan reading_id untuk tiap sampel. Sample_key biasa n1; difference memakai n1:before dan n1:after. Setiap sampel/tahap membutuhkan foto baru.
8. POST maintenance/records dengan {definition_id,definition_version,context,interval,trigger,checked_at,observations:[{sample_id,reading_id}]}. Difference mengganti reading_id dengan before_reading_id/after_reading_id. Backend menghitung OK/NG terhadap snapshot standar.

ROI memakai {x,y,width,height} ternormalisasi0–1 pada foto penuh yang sudah mengikuti orientasi EXIF. Koordinat bukan piksel elemen HTML atau foto yang sedang diperbesar. Crop sementara POST photos/{image_id}/crop menerima ROI langsung, bukan {roi:...}.

Pemilihan nama alat pada halaman hasil tidak mengirim pekerjaan CV baru. Relasi `maintenance_check_ids` mengisi pemeriksaan bila tepat satu pilihan tersedia; pemilihan pemeriksaan juga mengisi alat bila tepat satu alat terhubung. Pilihan ambigu tetap memerlukan operator, dan alat yang belum ditautkan harus dikonfigurasi di Peralatan.

Jika mengganti identitas alat dengan profil fisik yang sama, konfirmasi mengirim `equipment_reassigned:true` dan `instrument_revision` yang ditinjau. Server tetap memeriksa profil, revisi, kepemilikan analisis, identitas, relasi pemeriksaan, bukti, serta idempotensi. Kalibrasi milik alat lama tidak dapat dipindahkan; provenance identitas/profil asli tetap disimpan. Pilihan alat tidak mengubah satuan atau desimal hasil foto sebelumnya. Profil berbeda membutuhkan tombol baca ulang secara eksplisit atau jalur input manual.

## Angka manual dengan bukti foto

Jika CV/discovery tidak berhasil, pertahankan foto yang telah berhasil diunggah dan daftar alat. Setelah alat serta pemeriksaan dipilih, kirim `POST /analysis-jobs/manual` dengan `{image_id,instrument_id,roi,label_roi?}`. Endpoint ini tidak memanggil OCR/analisis CV dan mengembalikan AnalysisResult dengan `analysis_id`, `validated_prediction:null` dan `confidence.valid:false`.

Gunakan ID tersebut pada endpoint konfirmasi bacaan yang sama. Isi `final_value`, verifikasi identitas dan verifikasi angka. Tidak ada kolom alasan yang wajib diisi. Nilai manual tetap diperiksa terhadap rentang/desimal alat dan disimpan bersama foto/crop; angka tersebut tidak diberi confidence CV. Foto yang gagal diunggah harus diunggah kembali sebelum dapat dikonfirmasi. Bukti yang sama tetap tidak boleh dipakai ulang untuk sampel baru.

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

## Field utama integrasi

| Field | Bentuk | Sumber / arti |
|---|---|---|
| context.line | string | Line yang dipilih dari settings |
| context.production_date | YYYY-MM-DD | Tanggal produksi dari server, bukan jam HP |
| context.shift | day / night | Shift1 / Shift2 dari server |
| context.sampler | string | Pelaksana dari settings |
| context.product_type_id | string, opsional | ID Type produk, bukan jenis gauge |
| checked_at | ISO8601 | Waktu server saat pemeriksaan dimulai |
| definition_version | integer | Versi standar yang ditinjau; konflik409 mewajibkan mulai ulang dengan versi baru |
| definition_id / check_id | string | ID definisi pemeriksaan, bukan nomor urut tampilan |
| instrument_id | string | ID master alat yang dikonfirmasi |
| roi / label_roi | x,y,width,height | Pecahan 0–1 pada foto penuh yang sudah berorientasi |
| validated_prediction | number / null | Angka tervalidasi; **0 tetap valid** |
| confidence.valid | boolean | Apakah reader memvalidasi angka kandidat |
| confidence.level | low / medium / high | Heuristik, bukan persentase akurasi |
| final_value | string atau number | Angka operator, titik desimal saat dikirim |
| sample_key | n1 atau n1:before / n1:after | Mengikat bacaan ke sampel/tahap |
| confirmation_id | UUID | ID tetap untuk retry permintaan yang sama |
| observations | array | Status visual atau ID bacaan terkonfirmasi tiap sampel |
| meta.as_of | ISO8601 | Snapshot laporan untuk paging/cetak/CSV yang konsisten |
| cohort_id | string | Kelompok data kompatibel pada respons SPC |

Contoh penyimpanan numeric setelah empat bacaan dikonfirmasi:

```json
{
  "definition_id": "chart_ee_length",
  "definition_version": 1,
  "context": {"line":"17","production_date":"2026-10-21","shift":"day","sampler":"Ldr"},
  "checked_at":"2026-10-21T01:00:00Z",
  "interval":"per_shift",
  "trigger":"routine",
  "observations":[
    {"sample_id":"n1","reading_id":"reading-id-1"},
    {"sample_id":"n2","reading_id":"reading-id-2"},
    {"sample_id":"n3","reading_id":"reading-id-3"},
    {"sample_id":"n4","reading_id":"reading-id-4"}
  ]
}
```

Ini contoh kontrak, bukan ID siap kirim. Ambil ID/opsi yang berlaku dari katalog dan respons API. `overall_status`, `outcomes` dan snapshot historis dihasilkan backend; jangan kirim status OK hasil hitungan frontend untuk numeric. Profil, standar atau identitas yang berubah membatalkan hasil lama dan perlu analisis/konfirmasi baru.

## Versi standar dan rekonsiliasi simpan

Frontend ini selalu mengirim `definition_version` dari standar yang ditinjau saat mulai pemeriksaan. Server memeriksanya di dalam transaksi penyimpanan. Respons409 `DEFINITION_VERSION_CONFLICT` berarti operator perlu memulai ulang dengan standar terbaru. Untuk kompatibilitas, API masih menerima klien lama tanpa field ini dan menggunakan standar terbaru; integrasi baru wajib mengirimkannya agar standar yang ditinjau terlindungi.

Status penyimpanan maintenance yang tidak pasti disimpan bersama draft selama navigasi. Setelah gangguan jaringan/server, periksa riwayat sebelum membuka kembali kunci percobaan. Jangan melakukan retry otomatis; endpoint maintenance belum menyediakan idempotensi lintas permintaan. `confirmation_id` hanya melindungi endpoint konfirmasi bacaan, bukan keseluruhan catatan maintenance.

Update definisi memakai `occurrence_rule:null` untuk menghapus aturan slot secara eksplisit. Field yang dihilangkan berarti tidak mengubah nilai lama.

## Pemeriksaan aktif dan status jadwal

`GET /maintenance/catalog` mengembalikan pemeriksaan aktif; `?include_inactive=true` juga memuat yang dinonaktifkan untuk Pengaturan dan pemilihan laporan historis. Admin membuat pemeriksaan dengan `POST /maintenance/definitions` (DefinitionCreate), memperbaruinya dengan `PUT /maintenance/definitions/:id`, dan mengubah status dengan `PUT /maintenance/definitions/:id/status` berisi `{active, review_reason}`. Penonaktifan mempertahankan riwayat. `instrument_ids` pada create/update mengganti hubungan alat dalam transaksi yang sama; tidak dikirim berarti mempertahankan hubungan lama.

`GET /maintenance/due?line=17&product_type_id=...` memberikan `schedule`, `items`, `pending_count` dan `completed_count`. Type opsional. Setiap item memiliki `definition_id`, `definition_version`, `state` (`pending`, `completed`, `not_scheduled`), `completed_record_id`, `occurrence_key`, `starts_at`, `next_starts_at` dan `basis`. Daftar pengisian menggunakan state=pending. Waktu/perhitungan berasal dari server; jangan menghitung selesai dari jam HP atau foto yang belum disimpan. Invalidasi query ini setelah penyimpanan pemeriksaan atau perubahan master; ambil ulang berkala dan saat aplikasi kembali aktif.

Kecocokan label terdaftar dapat memilih alat dan pemeriksaan terkait tanpa mengirim pekerjaan CV kedua. Profil auto boleh menggunakan hasil digital/analog yang terbukti jenisnya jika seluruh parameter fisik identik. Perbedaan satuan, rentang, toleransi, presisi atau kalibrasi tetap memerlukan pembacaan ulang eksplisit atau input manual berbukti foto. Identitas/nilai tetap dikonfirmasi operator.

Frontend juga membandingkan satu baris label lengkap dengan `Instrument.name` dan `aliases`. Kecocokan lengkap yang unik dapat memilih alat lintas area walau respons OCR hanya memuat `raw_text` tanpa ID; line foto dan area master tetap dipertahankan. Kode internal lama hanya dicocokkan pada area yang sesuai. Teks parsial/ambigu/konflik atau identitas hanya angka tidak dipilih otomatis. Penentuan pemeriksaan selalu menggunakan `maintenance_check_ids` terhadap katalog aktif, tanpa menebak standar dari nama/jenis alat.

Pilihan Pemeriksaan mendahului Nama alat. Saat pemeriksaan belum dipilih, daftar alat angka aktif tidak dibatasi relasi; setelah dipilih, daftar difilter berdasarkan `maintenance_check_ids`. Alat lama yang tidak terkait dikosongkan. Operator tetap memilih identitas jika label tidak cocok, termasuk ketika hasil filter hanya satu alat. Mengubah pilihan ini tidak memanggil endpoint analisis.

## Nomor tampilan, panduan dan audit formulir

MaintenanceDefinition dan ChecksheetRow menyediakan check_number (integer/null): urutan katalog awal1–44, pemeriksaan tambahan45+. Gunakan definition_id untuk relasi dan permintaan; check_number hanya untuk tampilan. source_number tetap menyimpan nomor kertas asli, termasuk celah sumber. Endpoint laporan mengurutkan berdasarkan check_number sebelum paging, lalu identitas/peralatan/versi/shift agar stabil. Riwayat asli tidak ditulis ulang untuk menambah field ini.

Acknowledgement panduan merupakan state lokal UI dengan kunci session_id+definition_id+definition_version. Tidak ada field baru yang wajib dikirim pada POST. UI harus menampilkan standard_text, method_text, requirements, limits terstruktur, sample dan outcome_guide dari definisi; jangan menghitung batas master yang hanya tertulis di teks. Quick photo memblokir konfirmasi setelah definisi terpilih sampai standar dipahami.

Formulir otomatis mengirim review_reason dan condition_reason deskriptif. Backend tetap mempertahankan audit/revisi dan validasi yang sama. equipment.code sekarang maksimal100 karakter agar dapat mengikuti equipment.name. Alias otomatis sama dengan Nama alat, termasuk nama yang memiliki koma; alias berbeda dapat diedit di detail.

Monitoring memakai /maintenance/schedule dan /maintenance/due secara berkala. Jangan menampilkan jumlah due lama dengan shift/sesi baru: bandingkan schedule.starts_at penuh, bukan hanya slot_id yang berulang setiap hari. Jumlah catatan bulanan dari /maintenance/summary tidak boleh dipakai sebagai jumlah kewajiban selesai. Frontend ini mengambil semua halaman pencarian peralatan sebelum pengurutan lokal agar urutan konsisten melampaui halaman pertama.


## Status pilihan alat dan pengaturan terpadu

PUT /instruments/:id/status menerima hanya {"active":false} untuk mengeluarkan alat dari pilihan, atau {"active":true} untuk mengaktifkan kembali. Wajib Admin dan CSRF untuk sesi cookie, sama dengan penulisan lain. Respons berbentuk Instrument; perubahan status memperbarui revision tetapi tidak mengganti name, profile, aliases, maintenance_check_ids, kondisi atau kalibrasi. Status yang sudah sama tidak membuat revisi tambahan. Jangan memakai PUT profil lengkap hanya untuk menonaktifkan alat, karena endpoint itu mengganti field formulir.

Daftar pemeriksaan tetap memakai PUT /maintenance/definitions/:id/status dengan active dan review_reason otomatis. Konfirmasi UI berada dalam editor dan terpisah dari submit formulir. Gagal/batal mempertahankan draft; sukses menutup editor dan memperbarui daftar. Status ini tidak menghapus riwayat.

Pengaturan memuat tab standards (Daftar Pemeriksaan), equipment (Peralatan) dan general (Line Produksi). /peralatan merupakan tautan kompatibilitas yang redirect replace ke /pengaturan?tab=equipment. Gunakan URL Pengaturan ini untuk integrasi navigasi baru; sidebar tidak lagi memiliki menu Peralatan terpisah.


## Operator simplification (2026-10-24)

`MaintenanceDefinition.inspection_target` is `machine`, `product`, or null for an unclassified legacy custom check. Admin create/update accepts `inspection_target`; this is separate from `kind` and `input_method`. Built-in defaults follow the inspected object; numeric kN machine loads remain machine inspections. Product subgroups keep one Type snapshot per complete set of samples. Changing Type must start a separate inspection, not append mixed n1–n4.

Configured `lines` are trimmed nonempty names (max64 characters), unique ignoring case, max200. Initial defaults remain1–17. Equipment create/update must submit `condition: working | not_working`; legacy stored unknown can be read but must be reviewed before resubmission.

`DELETE /maintenance/records/:id` is Admin-only and needs CSRF for cookie authentication. It returns `{id, deleted:true}`. This is an idempotent soft deletion with actor/time audit; normal list, reports, due and SPC exclude the record. Evidence and historical snapshots stay available to the backend audit process. The UI asks confirmation before issuing DELETE.

The frontend always calls ordinary `/maintenance/report`, `/maintenance/spc`, and `/maintenance/spc/subgroups` routes. Old `demo` URL flags are ignored and stripped from requests. Illustrative local records use `origin.kind=illustrative_local_import`, explicit Data uji X/R labels, distinct Type/cohort identities, no fabricated photo actions, and cannot become production baselines. CSV includes `data_origin`. The development-only private import/rollback tool is documented in the Backend integration guide.

Capture state remains in browser memory while authenticated routes change after analysis. Resume uses the same photo/ROI/result/review and completed samples; logout, expired session, completion, reload or an explicitly confirmed new run clears it. During uploading/locating/queued/reading, CaptureWorkspaceProvider presents one blocking modal and makes the shell inert. CaptureNavigationGuard uses the live capture store to reject router transitions while busy; the ready-to-result transition is allowed synchronously. Cancel aborts the generation and releases the modal/focus/scroll lock. This blocks app navigation, not operating-system or other browser tabs.

## Acceptance criteria and monthly display (2026-10-25)

`Instrument.acceptance_limits` is optional/null or `{minimum: number|null, maximum: number|null}`. At least one bound is required when enabled, inside the physical profile range. Null follows the inspection definition. Numeric outcomes freeze the effective bounds and `acceptance_source: equipment | inspection` from the confirmed reading snapshot. The server judges inclusive boundaries; the frontend submits the reviewed value, not a client-calculated status. Changes to equipment must not rewrite prior criteria. See the Backend integration guide for difference measurements and SPC compatibility.

Monthly display merges API rows by `definition_id`, after loading every cursor page with the same `as_of` and scope. Keep original occurrences, source snapshots, units and statistical cohorts intact. The selector changes display only: `all`, `status`, or `measurement` (complete n≥2 X/R subgroups). Numeric MPa photo checks route to daily OK/NG reporting even for unclassified legacy definitions. Their numeric readings remain in cells/details; no X/R/capability is displayed for these gauges.

`MaintenanceDueItem.equipment` contains `{instrument_id,state,completed_record_id}` for eligible single-reading machine checks, otherwise `[]`. The top item remains pending until all required equipment is complete. Match line/context and the captured operational occurrence before using this status to filter a retained photo. Scope completion by tool; never let one shared definition hide an uninspected sibling. Confirmation recovers exact machine reviews without bypassing product subgroup/difference evidence uniqueness.
