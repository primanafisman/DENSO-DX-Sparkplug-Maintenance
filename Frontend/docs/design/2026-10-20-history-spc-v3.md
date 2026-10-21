# History and paper-style SPC design v3

Date: 20 October 2026, Asia/Jakarta. Status: **design proposal only; user review pending**.

This revision supersedes v2 history behavior. Other page designs remain unchanged.

## Required navigation

1. **Riwayat -> select month -> overall table only.** Display the monthly checksheet across all equipment/checks, with line and shift filters, dates, values/status and photo access. No chart, KPI cards or SPC panel below this overall table.
2. **Choose one check -> choose dates -> detailed measurement/SPC report.** Provide presets 1 week, 1 month and custom inclusive production-date range. Examples: EE Cutting, Gasket Ring Press, Caulking Height Check, Hexagon Size Check. A check/row links to this view, preserving line and period context.
3. The default period picker still exposes the last six calendar months and retained archives. Changing the month changes the overall table. Choosing a check enables its independent date-range report, rather than forcing all detailed analysis to a calendar month.

Use server production dates/WIB and existing checked_at snapshots. Multiple events within one date/shift remain distinct. On mobile, the monthly table scrolls horizontally with frozen identifiers; the detailed view stacks charts and collapsible calculation/table sections.

## Monthly table only

Frozen identifiers: check, equipment number/name, standard/unit and input method. The date columns show visual OK/NG or explicitly labeled numeric subgroup means. Expand a cell/row for raw samples and photo evidence. If a cell has multiple occurrences, show their count and open the occurrence list instead of silently selecting one. A toggle can switch between status and values; numerical mode must label that an overview value is X-bar, not one raw sample.

Blank dates remain blank, not zero/OK. The monthly view must not mix units in a common numerical summary. Selecting EE Cutting opens the detailed EE report; selecting Caulking Height opens its own data/standard instead.

## Detailed report matching the paper layout

Header: check/process, machine/line, equipment identity, product Type, measurement unit, resolution, subgroup size n, specification LSL/USL, selected dates, and calculation/baseline method. Include print/export using the complete report dataset.

Layout:

- X-bar chart first, with center and UCLx/LCLx.
- R chart below, with R-bar and UCLr/LCLr.
- Measurement matrix below the charts: date, actual time/shift/occurrence, X1...Xn, X-bar, R and **Type**. The normal screen can use occurrences as rows; paper print transposes into occurrence columns like the originals.
- Calculation panel alongside charts: subgroup count k, sample count n, observation count N, sum of all raw values, sum X-bar, sum R, grand mean, average R, standard deviation, 3 sigma, 6 sigma, Cp, Cpk, UCLx, LCLx, UCLr, LCLr, R maximum and data/baseline status.
- A point/cell opens the original confirmed measurement and authorized evidence. Incomplete subgroups remain visible with a reason but do not become an X-bar/R point with an invented sample.

## Product Type

Type on the paper means the spark-plug/product variant, not analog/digital instrument type. Add product_type (or a product-master ID plus immutable snapshot) to the capture, confirmation and maintenance context. Operator selects it alongside line/shift/sampler before capture, using a configured product master. The current context only has line/date/shift/sampler, so this needs a backward-compatible backend contract extension. Do not infer missing historic Type from today's selected Type or from a gauge name.

Default calculations partition by check characteristic, process/machine/line, product Type/specification version, unit, compatible measurement method/calibration and subgroup size. Different equipment may be pooled only under an explicitly reviewed equivalent-process configuration. A Type=All view either separates compatible cohorts or asks for a Type before presenting one capability result. Legacy records with no Type are labeled Tidak tercatat; no fabricated backfill.

## Source-sheet profiles

These are existing reviewed catalog transcriptions; production parameters remain reviewable and versioned. Paper sheet labels UCL/LCL must not cause the configured specification min/max to be reused as statistical control limits.

| Definition ID | Paper check | Specification | n | Resolution | Source |
|---|---|---|---|---|---|
| chart_depth_after_press | Depth After Press Check | 6.00-6.70 mm | 4 | 0.01 mm | IMG_20261009_084639 |
| chart_talc_load | Pressure Load Talc Press | 11.00-12.00 kN | 8 provisional from header | not established | IMG_20261009_084656 |
| chart_sweeping_depth | Sweeping DEPTH Check | 2.00-2.60 mm | 4 | 0.01 mm | IMG_20261009_084708 |
| chart_hexagon_size | Hexagon Size Check | 15.73-16.00 mm | 4 | 0.01 mm | IMG_20261009_084718 |
| chart_caulking_height | Caulking Height Check | 14.90-15.10 mm | 4 | 0.01 mm | IMG_20261009_084729 |
| chart_gasket_press | Gasket Ring Press | 2.00-2.30 mm | 4 | 0.01 mm | IMG_20261009_084738 |
| chart_ee_length | Panjang EE / EE Cutting | 4.40-4.60 mm | 4 | 0.01 mm | IMG_20261009_084803 |

The Talc header/sample-grid interpretation requires confirmation; do not silently substitute four for eight or claim eight collection times. Sweeping's named instrument and mm unit need review. Gasket's complete occurrence schedule remains a source-review item. The source paper was read previously and its catalog transcriptions retained; the accessible Caulking Height original was reopened for layout/formula/Type review on this revision.

Other numeric checks, including Actual Load Lower Ring Press and Caulking Load, can use the same report engine with their own specification/subgroup profile. Pure OK/NG definitions stay attribute logs and status counts; they do not acquire fabricated Cp/Cpk or R=0 charts.

## Calculation definitions

For k complete equal-sized rational subgroups, each containing n measurements x(i,j), N=k*n. Compute using confirmed final values without rounding intermediate results. Displayed decimals are formatting only.

```text
Xbar(i)       = sum_j x(i,j) / n
R(i)          = max_j x(i,j) - min_j x(i,j)
grand_mean    = sum_i Xbar(i) / k
Rbar          = sum_i R(i) / k
sum_raw       = sum_i sum_j x(i,j)
sum_Xbar      = sum_i Xbar(i)
sum_R         = sum_i R(i)
s_overall     = sqrt(sum_all (x - grand_mean)^2 / (N - 1))
sigma_within  = Rbar / d2(n)
UCLx          = grand_mean + A2(n) * Rbar
LCLx          = grand_mean - A2(n) * Rbar
UCLr          = D4(n) * Rbar
LCLr          = max(0, D3(n) * Rbar)
Rmax          = max_i R(i)
Cp            = (USL - LSL) / (6 * sigma_selected)
Cpk           = min((USL-grand_mean)/(3*sigma_selected),
                    (grand_mean-LSL)/(3*sigma_selected))
```

Here k is the number of columns/occurrences on the paper, not N raw observations. Do not divide sum_Xbar or sum_R by the raw observation count. A2/D3/D4/d2 depend on n, never the number of days. For n=4, A2=0.729, D3=0, D4=2.282; use a referenced/versioned constants table for other sizes.

The paper says sigma=stdev without declaring STDEV.S versus STDEV.P or a within-subgroup estimator. Proposed paper-compatible default is **paper_stdev_s**, visibly labeled STDEV.S (all complete-subgroup observations). This is a proposal requiring the receiving quality team's confirmation, not a claim about an existing Denso spreadsheet. Show sigma_within separately. An approved within-method profile can select Rbar/d2 for capability instead. Never switch the sigma definition silently or label the two values identically. Selected method, constants precision and profile version travel with the report and export.

LSL/USL are acceptance specifications; UCL/LCL describe statistical process behavior. Plot them with distinct labels/legend when both are enabled. Specification NG and out-of-control signals are separate flags.

## Baselines, sparse data and exceptions

- A selected date period can calculate exploratory limits. Label them Estimasi periode terpilih, not an approved baseline. A frozen approved baseline keeps its limits when the viewing period changes.
- Show descriptive calculations for mathematically valid small samples, with the sample count and provisional status. Capability assumptions include process stability and an appropriate distribution; do not label a process accepted just because Cp/Cpk is numerically high. Minimum study size/acceptance thresholds are reviewed configuration, not invented company rules.
- Non-working tools, corrected values and outliers remain auditable. Never remove NG/out-of-control values automatically to improve Cp/Cpk; exclusions require a recorded reason and report inclusion counts.
- Constant/zero-variance data returns an explicit undefined capability reason, not infinity or perfect capability. Missing one/two-sided limits, insufficient data, incomplete groups and unapproved profiles each have distinct reasons. Negative Cpk is retained when applicable, not clamped to zero.
- n=1 is not an X-bar/R subgroup. An approved Individuals/Moving Range profile would be a separate method; do not fabricate an R chart. Variable n uses separately reviewed limits or partitions, not n=4 constants everywhere.
- Preserve definition/product/measurement/baseline versions. A range spanning incompatible standards shows separate reports; no silent pooled capability.

## Contract extension proposal

Existing /maintenance/report proposal serves the monthly overall table. Add a dedicated report boundary (not implemented):

```text
GET /api/v1/maintenance/spc
  ?definition_id=chart_ee_length
  &production_date_from=2026-10-01
  &production_date_to=2026-10-07
  &line=17
  &product_type_id=...
  &instrument_id=...
  &baseline_id=...
```

Return filter/scope metadata; standards/product/measurement snapshots; sigma/constant/baseline profile versions; complete and incomplete subgroup counts; ordered subgroup data and evidence IDs; X-bar/R series; specification and control limits; aggregates/capability with provisional/undefined reasons; any exclusions with audit reasons. The backend computes from the whole authorized filtered cohort, never only the visible UI page. Large raw tables are paginated independently from chart/statistic aggregates. Exports consume the same calculation/report version.

No endpoint, database field, live report or product code is implemented by this design revision. Keep the existing Feature MVC structure: report model owns DTO/API, controller owns selection/query orchestration, views render the monthly table or detailed SPC report. No statistical business rules in the view.

## Sources and design fixtures

- [NIST: X-bar and R control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc321.htm): control-limit relationships and sample-size factors.
- [NIST: Process capability](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm): Cp/Cpk formulas and capability assumptions.
- User-provided maintenance sheet images and Backend/src/constants/maintenanceCatalog.js: layout, recorded columns and existing check profiles. No private photo or real measured record is embedded in generated previews.
- spc-demo-fixture-v3.json: fictional 7-subgroup EE example, evaluated only to keep mockup values consistent. It is not a production statistics implementation or proof of capability.
- Final detailed preview: previews/history-spc-detail-v3.png and .svg, newly authored with Matplotlib 3.11.2 through render_spc_preview_v3.py from that fixture. No input image is edited. Intermediate imagegen SPC mockups are visual drafts and are not selected calculation references because some rendered numbers were inconsistent.
