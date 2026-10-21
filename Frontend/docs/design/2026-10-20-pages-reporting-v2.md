# Frontend page refinement v2

Date: 20 October 2026, Asia/Jakarta. Status: **design proposal for user review, no product implementation**.

History behavior is superseded by [history/SPC v3](2026-10-20-history-spc-v3.md): monthly overall table only, followed by a separately selected check/date-range X-bar/R report.

This revision supersedes the earlier dashboard, history, equipment and settings outline where they differ. Retain the Denso Feature MVC architecture, proposed red/neutral visual system, explicit confirmation workflow and local CV boundary.

## User direction and interpretation

- Ringkasan: a complete one-month maintenance summary, table and overall visualizations. Move primary inspection input actions into Pemeriksaan.
- Pemeriksaan: an operational hub with contextual overview, start inspection, camera/upload and the 44 available definitions.
- Riwayat: six months of measurement logs in a checksheet format resembling the user's paper maintenance sheets, including numeric readings, visual OK/NG, shift and samples.
- Peralatan: add/edit equipment, equipment number, type, working/not-working condition, numeric versus OK/NG input and inspection frequency.
- Pengaturan: maintain reviewed standards, methods, intervals, shifts, line and sampler settings.

Interpretation for review: working/not-working is the physical operational condition; active/inactive separately controls whether an operator can select the equipment. Input method is numeric/photo or OK/NG. A numeric value outside the maintenance limits becomes NG and must still be recorded; NG is not a separate gauge type. Six months is the default reporting window, not an automatic deletion policy.

All screenshots use demonstration data. Mockup KPI values do not come from the live database, and diagrams are not accuracy evidence.

## Ringkasan: monthly analytics

Filters: month/year, line, shift and optionally check group. Initial illustration: October 2026, records up to 20 October. No camera/upload action in the dashboard; use the Pemeriksaan navigation entry.

Show four KPI values derived from the entire selected period: saved maintenance records, OK records, NG records, and OK ratio. Counting unit is a completed maintenance record, not a photo, sample or unique piece of equipment. One NG sample makes the record NG according to the existing business rule. Empty periods show no-data, not 100% OK.

Use stacked daily columns for OK/NG record counts, a simple distribution visualization and a table grouped by process/check. Avoid a single chart mixing MPa/mm/kN readings. Tool-specific numerical trends belong to the matching equipment/check detail. Do not imply that the OK ratio is CV confidence or planned-maintenance completion.

Illustrative consistent data: 240 records = 228 OK + 12 NG; OK ratio 95.0%. Group totals: Lowering 60/58/2, Talc 50/47/3, Caulking 45/43/2, Gasket 45/42/3, EE Cutting 40/38/2 (total/OK/NG). Dates later than the report cutoff are not zero-valued observations.

## Pemeriksaan: operator work hub

Show server-based production date/shift/current time slot, selected line and sampler above input. Provide a conspicuous camera/upload panel, Start inspection, and a catalog with input-method/group filters. The small context overview is separate from the monthly analytics dashboard.

Each catalog option exposes its standard, unit, tool, method, frequency, required sample count and source review note when relevant. Example visible source rows: Packing Depth Tool (visual OK/NG), Actual Load Lower Ring Press (7.0-8.0 kN, n4), Caulking Load (29-41 kN, n4), Hexagon Diff. Check (0.05-0.25 mm, n4). Do not invent source rows 17-23 or the clipped row 45.

Visual/functional branch: guide -> OK/NG per sample -> confirm record. Numeric branch: photo -> automatic CV -> crop/name check -> prominent number -> identity/value confirmation -> next independent sample -> record save. Difference branch collects before/after photo evidence for every sample.

Quick capture uses registered labels to suggest equipment and linked checks. Multiple/absent matches require a choice. A global capture cannot silently select an unrelated check. Retain large drag/button/zoom ROI controls and the separate label frame below the complete gauge.

## Riwayat: six-month checksheet and numerical detail

Default: current month plus the previous five calendar months, ending at the server's current production date. For 20 October 2026 the illustration spans 1 May through 20 October 2026. Month tabs prevent a 180-column table; a month/day view can be printed as an A4 landscape checksheet with repeated frozen identifiers. Other retained periods remain accessible through the period selector.

Views:

1. **Checksheet**: frozen columns for check number/name, equipment, standard/unit, shift, time slot and sample; day columns 1-31. On narrow screens use horizontal scrolling and a day-detail drawer. A blank cell is unfilled, never automatically OK or zero.
2. **Log detail**: time, equipment number/name, check, sample/stage, numeric value and unit or OK/NG, sampler, final status and authorized photo link. Support date range and existing filters with server pagination.
3. **Measurement trend**: selected check/equipment only; confirmed points against specification limits with clear MPa/mm/kN units. X-bar and R are optional when a complete valid multi-sample subgroup exists. Do not invent statistical UCL/LCL, Cp/Cpk or calculate them from an incomplete/too-small sample set.

Several occurrences can share one date/shift/sample. Each cell expands to distinct recorded occurrences/time slots; never overwrite or choose one arbitrarily. For new records persist slot/occurrence identity and schedule snapshot. Older records show actual checked_at without guessing an historical slot.

Use stored definition/profile snapshots for historical names, methods, units, limits and precision. If standards change within a month, split rows by definition version or visibly annotate the version; do not evaluate old values with new limits. Difference detail shows before, after and the computed difference, each with its own evidence.

Click a value for its photo, operator, measurement and standard snapshot. Confirmed records are read-only here; no destructive inline edit. Exports/print must use the same report dataset and selected filters, not only the currently visible virtualized rows.

## Peralatan: registry and operational condition

List columns: equipment number, name, type, linked input method, condition, enabled status, frequency summary and edit action. Search/filter is server-side for a large registry; do not silently search only a loaded page. Add/edit opens a focused drawer with clear groups:

- Identity: number/code, name, aliases, line/area, equipment type.
- Condition: Berfungsi / Tidak berfungsi; separate Dapat dipilih operator switch. Require an audit reason on condition changes. Preserve past results when equipment is disabled.
- Numeric parameters: analog/digital mode, unit, physical range, decimal precision and calibration version. Analog CV remains the black-needle 0-1 MPa family. These physical limits are separate from acceptable maintenance specifications.
- Linked maintenance: check(s), Angka dari foto / OK-NG / Selisih before-after, applicable frequency, samples and reviewed standard. Frequency and method are properties of the linked check configuration, not one universal frequency blindly applied to every measurement made by a shared tool.

For tools used only for visual inspection, hide numeric unit/range/decimal fields. The backend currently requires a numeric profile for every Instrument, so support for visual-only registry entries requires a conditional/nullable profile or an equivalent explicit capability model. Do not insert a fake 0-1 MPa profile merely to satisfy the current schema.

Current contracts have active, code, type, profile and check links, but no operational_condition. Proposed addition: working/not_working with change timestamp, actor and audit reason. The operational condition does not automatically manufacture a maintenance OK/NG outcome. The final policy for whether a non-working but enabled tool can be used should be explicit; recommended behavior is to block numeric capture until an Admin reviews/re-enables it.

## Pengaturan: standards and frequency

Subsections: Line & Sampler, Standar & Metode, Frekuensi & Shift, and local display preferences. Account display/sign-out uses existing auth; no user-management/password-reset screen is promised without new APIs.

Check editor: name/tool, input method, standard text, unit and inclusive acceptance limits, required sample identifiers/count, before/after requirement if needed, interval and event triggers, sampler default, shifts and planned occurrences. Always explain which linked equipment/checks a shared change affects before saving.

Frequency choices initially follow supported intervals: per shift, every 4 hours, daily and weekly; optional custom intervals require explicit backend validation and schedule support before being enabled. Show the configured time occurrences rather than assuming every check is required at every shift boundary. The existing server time slot boundaries remain 07:45, 12:45, 21:15 and 01:15 WIB. Weekly/day rules must be configured, not inferred from the current date.

Every standard/method/frequency update creates a version with reason and effective time; past records keep their snapshots. Switching OK/NG to numeric requires proper unit/limits/evidence rules, while switching a numeric device to visual does not delete past readings. Validate these changes in the server, not just the UI.

## Backend contract additions needed before these screens are functional

These are proposed interfaces, not endpoints already available:

| Extension | Purpose |
|---|---|
| GET /api/v1/maintenance/summary?month=YYYY-MM&line=...&shift=... | Entire-period record counts, OK ratio, daily series and grouped table; explicit count unit and cutoff |
| GET /api/v1/maintenance/report?from=YYYY-MM-DD&to=YYYY-MM-DD&line=... | Grouped checksheet/report rows with versioned standards, dates/shifts/occurrences/samples, units, values, statuses and authorized evidence IDs; bounded/cursor paging |
| Date-range filters on history and report exports | Six-month navigation and exports without scanning all pages in the browser |
| Record slot/occurrence and schedule snapshot | Distinguish multiple readings in one date/shift; backward-compatible null slot for older data |
| Equipment condition + conditional numeric profile | Working/not-working registry and visual-only tools without fake numeric settings |
| Versioned definition method/sample/frequency updates | Reviewed changes to method, interval guide and actual occurrence schedule |

Existing data already includes record snapshots and sample numeric outcomes, so historical reporting can reuse these rather than replacing the readings store. Existing CSV exports readings only; a complete maintenance checksheet export needs the new report/export boundary. Retain server aggregation, pagination and indexes to keep six-month reports fast; do not cache full photo blobs in reporting queries.

## Review scope

Produce five coherent preview screens: monthly Ringkasan, operator Pemeriksaan, six-month Riwayat checksheet, Peralatan editor and Pengaturan standards/schedule. Preserve earlier mobile capture/result/confirmation concept. Continue as design only until reviewed; Backend remains unchanged.
