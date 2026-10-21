# History mockup prompts v3

Mode: built-in image_gen for visual exploration, derived from history-checksheet-v2.png. Fictional data only. The source and calculation fixture are documented in history-spc-v3. The selected exact SPC report is newly rendered with Matplotlib; see below.

## Intermediate edit prompts (not selected calculation reference)

### Statistics table correction

Use case: precise-object-edit. Make ONE tiny numeric correction to the provided existing desktop SPC report UI screenshot. Keep every pixel of layout, charts, table, fonts, colors, titles, measurements and all other text unchanged as closely as possible. In the RIGHT-HAND "Perhitungan periode" statistics table, locate the row labeled "UCLr", currently incorrectly showing "0.05786". Replace ONLY that value with the exact correct text "0.05216". The existing R chart already correctly labels UCLr 0.05216; both must now agree. Do not change the neighboring LCLr=0, R maks=0.0300, Rbar=0.02286, Cp=2.570 or Cpk=2.533. No other edits.

### R chart label correction attempt

Precise UI text correction in this supplied screenshot. Change ONLY ONE TEXT LABEL in the lower-left "Grafik R (mm)" chart. At the RIGHT END OF THE GRAY HORIZONTAL CENTER LINE, around image x=1030 y=620, the current label incorrectly says "R̄ 0.05286". Replace that exact chart-center label with "R̄ 0.02286". This is the R-bar CENTER at approximately y=0.023, so it must be 0.02286. Do NOT change the upper red dashed UCLr limit, which correctly says 0.05216. Do NOT change the separate right-hand statistics table, which already correctly has R̄=0.02286 and UCLr=0.05216. Keep the rest of the screenshot identical: same 2 charts, 7 points, data table, text, decimal numbers, title, UI, layout, colors and size. Change only the wrong 0.05286 attached to the gray R-chart center line to 0.02286.

## Selected detailed report rendering

The selected SPC PNG/SVG is newly authored with Matplotlib from spc-demo-fixture-v3.json by render_spc_preview_v3.py. It loads no images and uses computed values for chart limits, labels, table and capability metrics. Intermediate imagegen edit drafts are not calculation references. Monthly overall table remains an imagegen visual preview.


## overall

Use case: ui-mockup. Edit the supplied Sparkplug Maintenance history UI reference into a polished sibling/revised desktop screen. Preserve the DENSO red #E60012 wordmark, white sidebar, exact navigation order Ringkasan/Pemeriksaan/Riwayat/Peralatan/Pengaturan with Riwayat active, typography, red/white/pale-gray enterprise styling, borders and restrained spacing. This is a design preview with fictional data; keep "Preview · Data contoh" in the compact top bar. Flat front-on screenshot, readable Indonesian UI, no browser chrome or perspective. Fit the whole described report without clipping text or footer. Never represent this synthetic UI as actual measured results or a certified capability study.
MONTHLY OVERALL TABLE VIEW ONLY. Title "Riwayat maintenance", subtitle "Tabel bulanan seluruh alat dan pemeriksaan". Filters: "Oktober 2026", "Line 17", "Semua shift", dropdown "Semua pengecekan". Right top outlined "Cetak tabel" and "Ekspor". Month tabs Mei/Juni/Juli/Agustus/September/Oktober with Oktober selected. A quiet caption "Pilih pengecekan untuk membuka grafik dan perhitungan SPC".
The entire main body is ONE large white checksheet table, NO charts, NO KPI statistic cards, NO summary graphs, NO capability panel anywhere. Frozen left columns "Pemeriksaan / alat", "Standar", "Metode", followed by seven visible date columns 1,2,3,4,5,6,7, a subtle horizontal scrollbar to further October dates, row chevrons. Table should have ample row height and readable measurement values.
Eight example rows with exact labels and units:
Packing Depth Tool, small tool subtitle Tool Packing, standard Tanpa luka/gompal, method OK/NG; green explicit OK cells and one blank dash.
Depth After Press, small tool subtitle Ring & Talc Depth, standard 6.00–6.70 mm, method Foto; cells around 6.49,6.50,6.48, plus some cells "2 sesi" indicating multiple occurrences.
Pressure Load Talc Press, subtitle MC Talc, standard 11.00–12.00 kN, method Foto; values around 11.53.
Sweeping DEPTH Check, subtitle MC Talc, standard 2.00–2.60 mm, method Foto; values around 2.30 and some "2 sesi".
Hexagon Size Check, subtitle Micrometer, standard 15.73–16.00 mm, method Foto; values around 15.89.
Caulking Height Check, subtitle Caulking Depth, standard 14.90–15.10 mm, method Foto; values around 15.00.
Gasket Ring Press, subtitle MC Gasket, standard 2.00–2.30 mm, method Foto; values around 2.20.
EE Cutting, subtitle EE Cutting 1, standard 4.40–4.60 mm, method Foto; exact date values 4.500,4.510,4.490,4.505,4.485,4.510,4.490. Highlight this selected row very lightly red, with a red right chevron and small action "Lihat SPC".
A compact footer legend reads "Angka = rata-rata subgrup · Beberapa sesi: klik untuk rincian · – Belum diisi". Another quiet hint says "Klik nama pengecekan untuk memilih tanggal dan membuka laporan lengkap". A footer indicates "8 dari 44 pilihan" and pagination. Make this a clear overview of all instruments rather than a detailed one-check chart report. Do not add even a small chart below the table.

## spc

Use case: ui-mockup. Edit the supplied Sparkplug Maintenance history UI reference into a polished sibling/revised desktop screen. Preserve the DENSO red #E60012 wordmark, white sidebar, exact navigation order Ringkasan/Pemeriksaan/Riwayat/Peralatan/Pengaturan with Riwayat active, typography, red/white/pale-gray enterprise styling, borders and restrained spacing. This is a design preview with fictional data; keep "Preview · Data contoh" in the compact top bar. Flat front-on screenshot, readable Indonesian UI, no browser chrome or perspective. Fit the whole described report without clipping text or footer. Never represent this synthetic UI as actual measured results or a certified capability study.
DETAILED SINGLE-CHECK SPC REPORT, matching a paper X-bar/R chart with measurement matrix and calculation sidebar. Use a sufficiently tall desktop report composition to keep everything legible, about 4:3 if necessary.
Title "EE Cutting · Laporan pengukuran". Breadcrumb "Riwayat > Detail pengecekan". Controls: check dropdown "EE Cutting", date range "1–7 Okt 2026", line "Line 17", Type dropdown "U-Type". Preset buttons "1 minggu" selected red, "1 bulan", "Kustom". Top-right "Cetak laporan".
Compact metadata strip "Standar 4.40–4.60 mm · n=4 · 7 subgrup · 28 nilai". Add a small amber status label "Estimasi awal · STDEV.S". It is a temporary selected-period calculation, not an approved process capability decision.
MAIN REPORT has a wide left plotting area and a compact right calculation table. Top LEFT graph titled "Grafik X̄ (mm)" showing exactly seven chronological subgroup means at days 1–7: 4.500,4.510,4.490,4.505,4.485,4.510,4.490. Red dashed control line labeled "UCLx 4.5152", center gray line "X̄̄ 4.4986", red dashed lower line "LCLx 4.4819". Vertical plotting scale about 4.48–4.52. Do not mistake these statistical limits for the specification limits 4.40 and 4.60; specifications are in the header.
Below LEFT graph titled "Grafik R (mm)" showing exactly seven ranges 0.020,0.020,0.020,0.030,0.030,0.020,0.020. Dashed red upper line "UCLr 0.05216", gray center line "R̄ 0.02286", lower axis line "LCLr 0". Vertical scale 0–0.06.
RIGHT small readable table title "Perhitungan periode" with label/value rows, neutral text, no green approved badges:
Σx 125.9600
ΣX̄ 31.4900
ΣR 0.1600
X̄̄ 4.4986
R̄ 0.02286
s 0.01297
3s 0.03891
6s 0.07783
Cp 2.570
Cpk 2.533
UCLx 4.5152
LCLx 4.4819
UCLr 0.05216
LCLr 0
R maks 0.0300
Make Cp/Cpk easy to find but clearly part of the temporary example, not corporate approval.

BELOW the charts/table a paper-style raw-measurement MATRIX titled "Data pengukuran dan Type" with seven occurrence columns. First column is row labels, subsequent columns dates 01/10,02/10,03/10,04/10,05/10,06/10,07/10.
Rows exact:
Jam: 07:45 in every column.
X1: 4.49,4.50,4.48,4.49,4.47,4.50,4.48.
X2: 4.50,4.51,4.49,4.51,4.49,4.52,4.50.
X3: 4.51,4.52,4.50,4.52,4.50,4.51,4.49.
X4: 4.50,4.51,4.49,4.50,4.48,4.51,4.49.
X̄: 4.500,4.510,4.490,4.505,4.485,4.510,4.490.
R: 0.020,0.020,0.020,0.030,0.030,0.020,0.020.
Type: U-Type in every column.
The Type row must be visible. Include a small "Foto" link affordance on measurement cells, not private filenames. Final quiet note "Batas kontrol dihitung dari periode terpilih; bukan baseline yang disahkan." All 7 groups are fictional complete groups. Do not invent additional observations or mix different measurements, units, product Types or checks.

