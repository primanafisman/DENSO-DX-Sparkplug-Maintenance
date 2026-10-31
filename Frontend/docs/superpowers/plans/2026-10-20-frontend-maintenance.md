# Sparkplug Maintenance Frontend and Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive five-page local maintenance application with reliable photo confirmation, master-data administration, monthly checksheets and paper-style X-bar/R reporting.

**Architecture:** React Feature MVC consumes the existing same-origin Node API; Node owns authorization, maintenance decisions, snapshots and statistics. Python remains the private LOCAL_CV reader. Extend the existing database repository ports additively, preserving installed data and the backend-only smoke interface.

**Tech Stack:** Node >=22.12 <23; Express 5, Sequelize 6 and existing database adapters; React 19, TypeScript 5, Vite 8, Tailwind 4, TanStack Query 5, Zustand 5, React Hook Form, Zod, Axios, Sonner, Lucide React, React Router and Recharts; Node test runner, Vitest and Testing Library. Resolve compatible patch versions at installation, pin them in the lockfile, and audit them; these version families follow the supplied guide rather than asserting latest versions.

**Spec:** [frontend outline](../../design/2026-10-20-frontend-outline.md), [page refinement v2](../../design/2026-10-20-pages-reporting-v2.md), [history/SPC v3](../../design/2026-10-20-history-spc-v3.md). V3 supersedes V2 history; V2 supersedes the original dashboard. Selected visual references are listed in [previews/README.md](../../design/previews/README.md).

**Execution:** Native implementation in this chat, incrementally, with one independent whole-change review at the end, as already selected by the user. Approved by the user on 21 October 2026. Tasks1–13 are implemented; Task14 code, local setup, review corrections and handover documentation are implemented. Backend133/133 and Frontend37/37 tests passed. See [verification](../../verification.md) for actual evidence and uncompleted manual acceptance; the step checklists below remain the original approved test intent.

**Acceptance boundary:** The three unchanged CV integrations and live Node photo→confirmation→evidence flow passed. Desktop browser history/SPC/visual-save checks passed with isolated fixtures. Internal-browser file reads crashed its renderer, so real Chrome/HP upload/camera/ROI end-to-end acceptance, physical A4 printing, a second-computer install and company SQL verification remain open. They are not represented as passing automated checks.

## Global Constraints

- Work in the repository root; `Frontend/` is beside `Backend/`. Paths below are relative to that root. Do not duplicate the old PanelReader project, installed CV environment, OCR models or training corpus.
- Feature MVC: views render, controllers orchestrate, models own DTO/schema/API/state. Views never import Axios or make raw HTTP calls. Frontend never connects to SQL, Python or secret files.
- Use HttpOnly cookie sessions, credentialed requests and signed CSRF for mutations. No JWT, photos or confirmed-record shadow database in localStorage. Preserve Viewer/Operator/Admin authorization on the server.
- Keep LOCAL_CV only, current OCR/model assets, automatic analog/digital detection and the black-needle 0–1 MPa analog family. No Gemini, cloud tunnel or algorithm retraining in this work.
- Numeric inspection remains photo-backed, with separate identity/value confirmation and a new photo per sample/stage. A reading of zero is valid; an unvalidated estimate is not an accepted reading.
- Source catalog remains 44 options: 37 visible checklist entries plus seven charts. Preserve missing rows 17–23, clipped row 45 and source review notes; do not claim corporate approval of unreviewed settings.
- Server timezone is `Asia/Jakarta`. Start boundaries remain 07:45, 12:45, 21:15 and 01:15, inclusively. Freeze production context through photo, reading and record; do not recompute it from the browser clock.
- Product Type means product variant, not analog/digital. Historic missing Type or equipment condition stays unknown; never backfill it from today's master data.
- Six months means six calendar months in navigation, not a deletion policy. Monthly Riwayat shows only the overall table; charts appear in a separately selected check report.
- Historical values use saved definition, product, instrument/profile, calibration and schedule snapshots. Physical range differs from maintenance specifications, which differ from statistical control limits.
- Only complete compatible subgroups feed X-bar/R and capability. Keep NG, outliers and corrected values visible. No automatic filtering to increase capability; no invented 1.33 acceptance threshold.
- Palette: primary `#E60012`, hover `#B8000E`, canvas `#F5F6F8`, surface white, text `#17212F`, secondary `#64748B`, border `#E2E8F0`; status includes text/icon, not color alone. Base copy 16px, prominent results 48–64px, touch actions at least 48px.
- Preserve private `.env`, runtime data, credentials, certificates, company source documents and installed packages outside Git/release. Demo credentials stay local. Do not publish new files before verification and secret review.
- Additive schema migration runs explicitly through installation tooling, never inside request handling or by reinitializing a populated database. Preserve all existing Backend setup/start commands.

## Review Focus

1. A legacy record lacks product/slot/condition fields, or a master changes later: preserve its bytes and show historical unknown/snapshot values. Owned by Tasks 1–3 and 6.
2. Capture crosses midnight or a shift boundary: preserve its server-derived production context and distinguish two occurrences in one slot. Owned by Tasks 2 and 10–11.
3. Sparse/mixed data, n=1, missing limits or zero variance: show explicit reasons and counts; never fake R=0, infinity or pooled capability. Owned by Tasks 5–6 and 13.
4. ROI/image/profile changes during polling, or a confirmation response is lost: invalidate stale responses, release camera resources and retry only the same immutable confirmation ID/body. Owned by Tasks 8 and 11.
5. A month contains more than one SQL/UI page, hostile spreadsheet text or unauthorized evidence: aggregate all matching data, bound work, escape exports and enforce access. Owned by Tasks 1, 6–7 and 12–13.

## Delivery sequence and boundaries

Phase A (Tasks 1–7) is an independently testable backend reporting/contract extension. Phase B (Tasks 8–13) implements the approved frontend against those contracts. Phase C (Task 14) integrates local launch, packaging and handover. Do not start a later dependent task before its contracts pass.

Before Task1, run the current Backend lint/tests once as a baseline using the validated Node22 runtime. Commands below run from Backend or Frontend as named, with that runtime on the process PATH; do not silently use an incompatible globally installed Node. Retain existing unrelated working changes and commit only files owned by the completed task.

Future work outside this plan: external identity/account management, corporate database deployment, Socket.IO, I-MR charts, electronic approval workflows, corporate Sonar/UAT certification and general-purpose gauge families. Existing database adapters remain bounded integration points; SQLite is the locally verified database until other servers are provided.

## Contract and file ownership map

Backend additions:

```text
Backend/src/constants/{schemaVersion,spcConstants}.js
Backend/src/services/{productionContextService,reportService,spcService,baselineService}.js
Backend/src/services/reporting/{reportScope,subgroups,checksheet,summary}.js
Backend/src/validations/reportValidation.js
Backend/src/controllers/reportController.js
Backend/src/routes/reportRoutes.js
Backend/scripts/migrations/002-report-indexes.js
Backend/scripts/migrate-database.js
Backend/test/{report-repository,production-context,equipment-condition,
  definition-revisions,spc,reporting,baseline,report-contracts,frontend-serving}.test.js
Backend/test/fixtures/{reporting,spc-paper}.js
```

Existing services/validations/repositories/models/contracts are extended in place. Keep new report orchestration out of the existing compact `maintenanceService.js`; no unrelated architectural rewrite.

Frontend structure:

```text
Frontend/{package.json,package-lock.json,index.html,vite.config.ts,tsconfig.json,
  eslint.config.js,.env.example,.gitignore}
Frontend/scripts/{check-architecture.mjs,setup.ps1,check.ps1}
Frontend/src/app/{App.tsx,router.tsx,providers.tsx}
Frontend/src/config/env.ts
Frontend/src/features/{auth,dashboard,maintenance,capture,history,equipment,settings}/
  model/       # api.ts, schemas.ts, types.ts, narrowly scoped state/geometry
  controller/  # hooks for this feature's orchestration
  view/        # page/components, no HTTP/business statistics
Frontend/src/shared/components/{layout,ui}/
Frontend/src/shared/lib/{api,csrf,queryClient,contracts,format}.ts
Frontend/src/styles/{tokens.css,app.css,print.css}
Frontend/src/test/{setup.ts,server.ts,fixtures.ts}
Frontend/src/main.tsx
Frontend/{setup.cmd,check.cmd}
```

Shared reporting DTOs (defined in `Backend/contracts/frontend-types.ts`, generated response schemas alongside existing schemas):

- `ReportScope = {production_date_from:string, production_date_to:string, line?:string, shift?:'day'|'night', definition_id?:string, product_type_id?:string, instrument_id?:string}`. ISO dates are validated calendar dates; bounds are inclusive. A range spans at most six calendar months, ending before the six-month anniversary of its first day.
- `ReportMeta = {report_version:'1', as_of:string, scope:ReportScope, scanned_records:number, count_unit:'maintenance_record', warnings:string[]}`. A report request has a consistent read snapshot. Cursors bind the normalized scope and `as_of`; a changed scope rejects the old cursor.
- `Summary = {meta:ReportMeta, total:number, ok:number, ng:number, ok_ratio:number|null, daily:{date:string,ok:number,ng:number}[], groups:{definition_id:string,name:string,total:number,ok:number,ng:number}[]}`. No records gives null ratio. Daily rows stop at the server production-date cutoff; future dates are not observations.
- `Occurrence = {id:string, checked_at:string, context:Context, slot_id:string|null, overall_status:'OK'|'NG', outcomes:SampleOutcome[], definition_snapshot:MaintenanceDefinition, product_snapshot:ProductSnapshot|null, instruments:Instrument[], evidence:EvidenceRef[]}`. Use the existing published SampleOutcome and Instrument types; instruments here are saved snapshots. `id` is the maintenance record ID; different records remain different occurrences. Legacy slot is null.
- `ChecksheetPage = {meta:ReportMeta, rows:ChecksheetRow[], next_cursor:string|null}`. A row is keyed by definition version, equipment identity, shift and unit; its `cells` are `{date:string,occurrences:Occurrence[],count:number}[]`. Empty dates are absent cells, not zero/OK.
- `SpcReport = {meta:ReportMeta, cohorts:SpcCohort[]}`; each cohort has stable `cohort_id`, saved scope/profile identifiers, standards, `n`, `counts`, complete series, incomplete rows with reasons, `statistics`, `control_limits`, `capability`, `baseline` and warnings. `capability = {method:'paper_stdev_s'|'within_rbar_d2',sigma:number|null,cp:number|null,cpk:number|null,reason:string|null,provisional:boolean}`. All undefined numerical results are null with a reason, never NaN/Infinity.
- `EvidenceRef = {reading_id:string,variant:'original'|'crop'}` references the existing authenticated evidence route. `crop` is the saved gauge/display image. Label previews during capture use the temporary photo/crop API; this release does not invent a persisted label-evidence route. Do not expose filesystem paths.
- `ProductSnapshot = {id:string,code:string,name:string,version:number}`. `Context` gains only optional `product_type_id?:string`, with no default/null inserted for legacy requests. Resolved snapshots are server-side sidecars, not additional equality/fingerprint context keys.
- `ChecksheetRow = {row_id:string,definition_id:string,definition_version:number,name:string,equipment_id:string|null,equipment_name:string|null,shift:'day'|'night',unit:string|null,standard:{text:string,minimum:number|null,maximum:number|null},input_method:'ok_ng'|'photo'|'photo_difference',cells:{date:string,occurrences:Occurrence[],count:number}[]}`. Task6 owns row construction; Task7 publishes this schema.
- `SpcCohort = {cohort_id:string,cohort_key:string,definition_snapshot:MaintenanceDefinition,product_snapshot:ProductSnapshot|null,instruments:Instrument[],unit:string,n:number,counts:{complete:number,incomplete:number,excluded:number,observations:number},series:{occurrence_id:string,checked_at:string,xbar:number,r:number}[],incomplete:{occurrence:Occurrence,reasons:string[]}[],statistics:SpcCalculation,control_limits:SpcCalculation['control_limits'],capability:SpcCalculation['capability'],baseline:{id:string|null,source:'selected_period'|'frozen',as_of:string,scope:ReportScope},warnings:string[]}`. Raw complete groups page separately as `{occurrence:Occurrence,values:number[],xbar:number,r:number}`. `excluded` counts incomplete/unusable groups, never silently discarded NG groups.

For consistent paging/printing/export, report endpoints accept optional `as_of` from a preceding ReportMeta; exclude records created after that cutoff. Reject a future or malformed cutoff. Saved maintenance records are immutable; their snapshots are the source of historical content. Snapshot consistency under the locally verified SQLite adapter is tested; other adapter isolation remains part of deployment verification.

### Task 1: Safe schema upgrade and indexed reporting repository

**Files:** Create `Backend/src/constants/schemaVersion.js`, `Backend/scripts/migrate-database.js`, `Backend/scripts/migrations/002-report-indexes.js`, `Backend/test/report-repository.test.js`. Modify `Backend/src/models/index.js`, `Backend/src/repositories/index.js`, `Backend/scripts/initialize-database.js`, `Backend/scripts/setup.ps1`, `Backend/package.json`, `Backend/test/database-lifecycle.test.js`.

**Interfaces:**
- Produce `SCHEMA_VERSION = 2`; `migrateDatabase(config): Promise<{from:number,to:number}>` (installation tool only).
- Produce `repositories.maintenance.listRecordsRange({scope,limit,cursor?,as_of}): Promise<{items:MaintenanceRecord[],next_cursor:string|null}>`, ordered production_date/id ascending, internal limit 1–500.
- Produce `repositories.readings.getMany(ids:string[]): Promise<Reading[]>`, batching at most 500 IDs per SQL query, and `repositories.transaction(fn)` with consistent reads for reports.
- Produce append-only `repositories.revisions.create(value)`, `get(id)`, `list({entity_id,limit,cursor})`, using namespaced immutable entries in existing JSON settings storage. No new mutable update operation.

- [x] Write failing tests: populated v1 upgrades without changing any existing payload string; initialization still refuses a populated database; v2 migration is idempotent; unknown/newer versions reject; 501 range records and 501 reading IDs cross a page without omission/duplication; query scopes cannot inject SQL; a second writer is not partially mixed into a report transaction.

```js
assert.deepEqual(after.payloadStrings, before.payloadStrings);
assert.equal(upgrade.to, 2);
assert.equal(new Set(allRows.map(r => r.id)).size, 501);
assert.deepEqual(foundIds.sort(), requestedIds.sort());
```

- [x] Run `node --test test/database-lifecycle.test.js test/report-repository.test.js` in Backend; confirm failures identify absent migration/ports, not a broken test harness.
- [x] Add indexes on maintenance records `(production_date,id)` and `(definition_id,production_date,id)`, plus equivalent readings range indexes. Use Sequelize operators and projection columns, no request-time DDL or raw SQL. Fresh initialization writes schema2; installed SQLite setup creates a dated backup while services are stopped, migrates, verifies, then continues. Non-SQLite migration requires the documented administrator backup step and never silently initializes.
- [x] Run the same tests and `npm run lint`; inspect indexes on temporary SQLite only. Do not modify the user's live database during this task's test cycle.
- [x] Commit explicit Task 1 files: `feat: add safe reporting schema upgrade and range repositories`.

### Task 2: Product Type, server occurrence and immutable context

**Files:** Create `Backend/src/services/productionContextService.js`, `Backend/test/production-context.test.js`. Modify `Backend/src/validations/{sharedValidation,maintenanceValidation}.js`, `Backend/src/services/{photoService,readingService,maintenanceService}.js`, and their existing tests as required.

**Interfaces:**
- `resolveProduct(product_type_id:string|undefined, settings): ProductSnapshot|null` validates configured active master entries.
- `snapshotOccurrence(checked_at:string, settings): {slot_id:string,starts_at:string,schedule_version:number,timezone:'Asia/Jakarta'}` uses the existing latest start-boundary algorithm.
- New records save `product_snapshot` and `schedule_snapshot`; maintenance input gains optional `instrument_id` for visual/functional equipment identity, resolved/validated server-side into `instrument_snapshot`. Numeric instrument identity always comes from its confirmed readings, not a conflicting client field. Old records are not rewritten. `record.id` remains occurrence identity.
- Settings add optional `product_types:{id,code,name,active,version}[]`; updates preserve this list when an older client omits it. A product rename makes a new version, with old snapshots unchanged.

- [x] Write failing cases for old four-field Context parsing unchanged; unknown/inactive product rejection; rename after upload retaining original photo snapshot; new records before/after 01:15 and 07:45 WIB; two records in one slot retaining separate IDs; a photo captured before a boundary confirmed after it retaining its original context. Verify no public product fields leak into an incompatible private CV payload.

```js
assert.deepEqual(parseContext(legacy), legacy);
assert.equal(saved.product_snapshot.name, 'U-Type'); // master renamed after capture
assert.equal(saved.context.production_date, captured.context.production_date);
assert.notEqual(first.id, second.id);
```

- [x] Run `node --test test/production-context.test.js test/server-schedule.test.js test/confirmation.test.js`; verify new cases fail.
- [x] Implement sidecar snapshots at upload/confirmation/record save without changing legacy fingerprints or body equality. Reject attempts to pair a different product/context with saved evidence. Derive a new record's slot from its checked_at, not the current browser time; legacy reports never guess old slots.
- [x] Run those tests plus `test/maintenance.test.js`; verify inclusive starts 07:45/12:45/21:15/01:15 and existing night rollover.
- [x] Commit: `feat: preserve product and server occurrence context`.

### Task 3: Equipment condition and visual-only registry

**Files:** Create `Backend/test/equipment-condition.test.js`. Modify `Backend/src/validations/instrumentValidation.js`, `Backend/src/services/{instrumentService,analysisService,discoveryProfile,readingService,maintenanceService}.js`, `Backend/src/validations/readingValidation.js`, repository instrument search support in `Backend/src/repositories/index.js`.

**Interfaces:**
- Instrument adds `measurement_mode:'numeric'|'visual'`, `condition:'working'|'not_working'|'unknown'`, `condition_changed_at`, `condition_changed_by`, `condition_reason`; `active` remains a separate switch.
- Explicit visual mode has `profile:null`; numeric mode requires the existing valid profile. Legacy profile-bearing instruments read as numeric; missing legacy condition reads as unknown without persisted backfill.
- `listInstruments({q?,active?,condition?,measurement_mode?,limit,cursor}): InstrumentPage` searches the full registry server-side, not just the loaded page. Existing supported query names stay compatible.

- [x] Write failing tests: create visual tool without fake MPa settings; numeric null profile rejects; not_working cannot start/confirm a numeric reading or satisfy a new numeric record; visual checks can select an enabled visual tool; condition changes require a reason; disabled tools remain present in historical snapshots; full-registry search finds an item beyond page100.

```js
assert.equal(visual.profile, null);
assert.equal(legacy.condition, 'unknown');
assert.equal(blocked.code, 'EQUIPMENT_NOT_WORKING');
assert.equal(history.instruments[0].name, 'Original tool name');
```

- [x] Run `node --test test/equipment-condition.test.js test/instruments-calibrations.test.js`; confirm new failures.
- [x] Implement nullable-profile guards at every analysis/calibration/confirmation entry, condition audit and server search. Unknown legacy condition permits operator review with a warning; explicitly not_working blocks numeric use. Treat visual status and permanent tool condition as separate values.
- [x] Run those tests plus discovery, confirmation and maintenance tests. Verify no runtime dereference assumes a visual profile exists.
- [x] Commit: `feat: add audited equipment condition and visual profiles`.

### Task 4: Versioned standard, method, sample and frequency settings

**Files:** Create `Backend/test/definition-revisions.test.js`. Modify `Backend/src/validations/maintenanceValidation.js`, `Backend/src/services/maintenanceService.js`, `Backend/src/routes/maintenanceRoutes.js`, `Backend/src/controllers/maintenanceController.js`, existing maintenance tests.

**Interfaces:**
- Extend definition update with `kind:'visual'|'functional'|'numeric'|'difference'`, `input_method:'ok_ng'|'photo'|'photo_difference'`, unique `samples:{id,label}[]` (1–20), `shifts:('day'|'night')[]`, and optional `occurrence_rule:{slot_ids:string[],weekdays?:number[]}`. Visual/functional maps to ok_ng, numeric to photo, difference to photo_difference. Derive sample_count from samples, not a separately editable input. Weekdays are ISO1–7; a newly supplied weekly occurrence rule requires an explicit nonempty weekday list. Legacy weekly definitions without that rule retain their source-review note.
- Preserve the existing structured `interval_guide = {interval,description,day:{times:{time,day_offset}[],window:{start,end,end_day_offset}|null},night:{times:{time,day_offset}[],window:{start,end,end_day_offset}|null},note}`. Validate HH:mm, offsets0/1 and allowed intervals; optional edits retain existing fields when omitted. Existing paper times/windows remain guidance even when not one of the four global shift-selection boundaries.
- `updateDefinition(id,input,actor)` increments definition_version, archives both prior and new versions with actor/reason/effective_at=server now, and validates unit/limits/evidence requirements together.
- Produce `GET /api/v1/maintenance/definitions/:id/revisions` (Admin, paginated immutable versions). Settings updates also archive versions.

- [x] Write failing tests: visual→numeric without unit/limits rejects; duplicate sample IDs reject; a new weekly occurrence rule without weekdays rejects; unsupported slot rejects; old records retain definition version/limits; old settings PUT omitting product_types preserves them; historic unused definition versions are retrievable; source interval_guide objects retain their times/windows; difference method remains photo_difference.

```js
assert.equal(invalid.code, 'STANDARD_REQUIRED');
assert.equal(oldRecord.definition_snapshot.definition_version, 1);
assert.equal(revisions.items.at(-1).effective_at, serverNow);
assert.deepEqual(saved.value.product_types, previous.value.product_types);
```

- [x] Run `node --test test/definition-revisions.test.js test/maintenance.test.js`; verify new cases fail.
- [x] Implement immediate versioned changes and frequency guidance. Keep the four global server boundaries fixed; per-check slot/day selections guide applicable occurrences without inventing overdue/completion percentages. Do not schedule future-effective edits in this release. Keep Talc n8, Sweeping tool/unit and Gasket schedule review notes visible.
- [x] Run tests; verify unauthorized Operator/Viewer writes return403 and all current catalog options remain reachable.
- [x] Commit: `feat: version maintenance standards methods and cadence`.

### Task 5: Pure, independently verified SPC calculations

**Files:** Create `Backend/src/constants/spcConstants.js`, `Backend/src/services/spcService.js`, `Backend/test/spc.test.js`, `Backend/test/fixtures/spc-paper.js`.

**Interfaces:**
- `calculateSpc({groups:number[][],lsl:number|null,usl:number|null,method:'paper_stdev_s'|'within_rbar_d2'}): SpcCalculation` is pure and never reads a database.
- `SpcCalculation` includes k,n,N,sum_raw,sum_xbar,sum_r,grand_mean,rbar,s_overall,sigma_within,three_sigma,six_sigma,r_max,control_limits,capability,reasons,constants_version. Three/six sigma use the selected capability sigma and are labelled with that method.
- Constants version `nist-xbar-r-v1` initially supports reviewed n4 `{A2:.729,D3:0,D4:2.282,d2:2.059}` and n8 `{A2:.373,D3:.136,D4:1.864,d2:2.847}`. Unsupported n returns descriptive mean/range and an explicit unsupported-chart reason; n1 never claims an R chart.

- [x] Write failing tests using the independent seven-subgroup EE fixture from `Frontend/docs/design/spc-demo-fixture-v3.json`, copied as raw observations only. Expected assertions (absolute tolerance1e-10):

```js
assert.equal(s.k, 7); assert.equal(s.n, 4); assert.equal(s.N, 28);
near(s.sum_raw, 125.96); near(s.sum_xbar, 31.49); near(s.sum_r, .16);
near(s.grand_mean, 4.498571428571428); near(s.rbar, .022857142857143);
near(s.s_overall, .012971274735120); near(s.sigma_within, .011101089294387);
near(s.control_limits.ucl_x, 4.515234285714286);
near(s.control_limits.lcl_x, 4.481908571428571);
near(s.control_limits.ucl_r, .05216); near(s.control_limits.lcl_r, 0);
near(s.capability.cp, 2.569780843750274);
near(s.capability.cpk, 2.533069688839537); near(s.r_max, .03);
```

Also test n8 constants, empty/single/constant groups, n1, variable sizes, nonfinite values, one-sided specifications, negative Cpk and a far-outlier NG group retained in totals. All serialization remains finite/null.
- [x] Run `node --test test/spc.test.js`; verify missing-module/function failures.
- [x] Implement the v3 formulas with stable summation/Welford variance and no intermediate rounding. `paper_stdev_s` is the proposed visible paper default, not claimed Denso certification. Within estimator remains separately named. One-sided limits may yield defined one-sided Cpk but Cp=null with an explicit reason; never silently fabricate the missing side.
- [x] Run tests against hand-calculated asymmetric and constant fixtures; assert formula inputs, not only snapshots of implementation output.
- [x] Commit: `feat: calculate versioned paper SPC statistics`.

### Task 6: Monthly summary, checksheets and compatible SPC cohorts

**Files:** Create `Backend/src/services/reportService.js`, `Backend/src/services/reporting/{reportScope,subgroups,checksheet,summary}.js`, `Backend/src/validations/reportValidation.js`, `Backend/test/reporting.test.js`, `Backend/test/fixtures/reporting.js`. Modify repository range support only if a tested contract gap appears.

**Interfaces:**
- `createReportService({repositories,clock}).summary({month,line?,shift?}): Promise<Summary>`.
- `.checksheet(scope,{limit=25,cursor?}): Promise<ChecksheetPage>`; limit1–100 rows, each grouped row contains all authorized occurrences for that month/scope.
- `.spc(scope,{baseline_id?}): Promise<SpcReport>` computes complete series/statistics independently of raw-table pagination; `.subgroups(scope,{cohort_id,limit=50,cursor?})` pages raw groups.
- Limits: maximum six calendar months,100000 scanned records,5000 plotted subgroups. A larger request returns422 `REPORT_TOO_LARGE` with a narrower-range action, never partial statistics. SQL reads batch500; evidence blobs never loaded for aggregation.
- Cohort key: definition ID/version + line/process + product ID/version or explicit unknown + unit + instrument/profile/calibration identity + n. This release conservatively splits different instruments; no implicit equivalent-process pooling.

- [x] Write failing tests with >500 persisted records, multiple occurrences/day, missing dates, legacy unknown Type/slot, mixed standards/units/n, numeric/difference/visual checks, missing readings and swapped instrument master names. Include all seven paper IDs with their own limits; visual checks return status logs without numeric capability.

```js
assert.equal(summary.total, 501); assert.equal(summary.ok + summary.ng, 501);
assert.equal(empty.ok_ratio, null);
assert.equal(cell.count, 2); assert.equal(cell.occurrences.length, 2);
assert.equal(blankCell, undefined);
assert.equal(mixed.cohorts.length, 2);
assert.equal(incomplete.counts.excluded, 1);
assert.equal(oldRow.standard.maximum, oldSnapshot.limits.maximum);
assert.equal(report.meta.count_unit, 'maintenance_record');
```

- [x] Run `node --test test/reporting.test.js test/spc.test.js`; verify absent report service fails.
- [x] Build immutable report rows from maintenance snapshots and batched confirmed-reading snapshots. Difference outcomes keep before/after evidence. Preserve source exclusions with reasons, actual timestamp and sampler. Raw missing evidence remains visible but cannot generate invented data. Summary count means records, not samples/photos; daily dates use server production dates.
- [x] Run tests including leap month, six-calendar-month boundary, invalid date/reversed range, cursor filter mismatch, oversized range and all-record aggregate independent of page limit. Confirm no report fetches photo bytes.
- [x] Commit: `feat: aggregate monthly checksheets and scoped SPC reports`.

### Task 7: Reporting API, frozen baselines, export and published contracts

**Files:** Create `Backend/src/services/baselineService.js`, `Backend/src/controllers/reportController.js`, `Backend/src/routes/reportRoutes.js`, `Backend/test/{baseline,report-contracts}.test.js`. Modify `Backend/src/app.js`, `Backend/scripts/{generate-contracts,business-response-schemas}.js`, `Backend/contracts/{frontend-types.ts,frontend-client.js,openapi.yaml}`, `Backend/postman/SparkplugMaintenance.postman_collection.json`.

**Interfaces:**
- Authenticated GET `/api/v1/maintenance/summary?month=YYYY-MM&line=&shift=`.
- GET `/api/v1/maintenance/report?production_date_from=&production_date_to=&line=&shift=&definition_id=&limit=&cursor=`.
- GET `/api/v1/maintenance/spc` with ReportScope plus optional baseline_id; GET `/api/v1/maintenance/spc/subgroups` adds cohort_id/limit/cursor.
- GET `/api/v1/maintenance/export.csv` uses scope plus `report_kind:'checksheet'|'spc'`, optional baseline_id; exports all in-scope rows/statistics, not one UI page.
- Admin POST `/api/v1/maintenance/spc-baselines` takes `{scope,cohort_id,method,review_reason}`. Server calculates/fixes the complete baseline cohort and stores immutable `{id,version,scope,as_of,cohort_key,method,constants_version,control_limits,center,created_by,created_at,review_reason}` through revisions. It cannot accept arbitrary client-computed limits. GET collection/detail is authenticated. Label `Baseline tersimpan`; not an invented corporate electronic approval.
- Applying baseline_id to incompatible cohorts rejects422; unknown ID404. Fixed control limits/center remain fixed as the displayed period changes; selected-period descriptive statistics are still labelled separately. Capability always states its sigma method and source scope.

- [x] Write failing API tests for role access, cookie CSRF, no filesystem paths, every response validated against generated schemas, baseline immutability, wrong-cohort rejection, all-page CSV and spreadsheet injection escaping.

```js
assert.equal(viewerWrite.status, 403);
assert.deepEqual(laterReport.control_limits, stored.control_limits);
assert.equal(otherCohort.status, 422);
assert.ok(csv.includes("'=HYPERLINK")); // formula-safe exported text
assert.equal(api404.body.code, 'NOT_FOUND');
```

- [x] Run `node --test test/baseline.test.js test/report-contracts.test.js test/contracts.test.js`; verify new endpoints fail404 initially.
- [x] Implement thin routes/controllers and services with normal envelopes/request IDs. Evidence variants stay original/crop as supported by `readingService.js`. Extend contract generator, TypeScript/client and Postman together, including new master/context fields. Existing field names stay stable.
- [x] Run `node scripts/generate-contracts.js`, API/schema tests, `npm run lint`, then full `npm test`. Generated output reruns without unexpected differences. Validate CSV totals/limits match JSON report at its as_of snapshot.
- [x] Commit: `feat: publish secure reporting baseline and export contracts`.

### Task 8: Frontend foundation, authentication and responsive navigation

**Files:** Create Frontend package/config/lock/env/ignore files, `scripts/check-architecture.mjs`, `src/{main.tsx,app/App.tsx,app/router.tsx,app/providers.tsx,config/env.ts}`, `src/shared/lib/{api,csrf,queryClient,contracts,format}.ts`, `src/shared/components/layout/{AppShell,PageHeader,MobileNav}.tsx`, `src/styles/{tokens,app}.css`, `src/features/auth/{model/api.ts,model/schemas.ts,controller/useSession.ts,view/LoginPage.tsx}`, `src/test/{setup.ts,server.ts,fixtures.ts}`, `src/features/auth/controller/useSession.test.tsx`.

**Interfaces:**
- `api` is one Axios instance with withCredentials=true, base `/api/v1`, JSON-envelope unwrap and safe `ApiError{status,code,message,request_id,details}`. CSRF added on cookie-authenticated writes; binary/multipart callers select responseType without corrupting headers.
- `useSession(): {user,status,login,logout}` uses `/auth/me`, login and CSRF; `RequireRole` handles Viewer/Operator/Admin routes. `contracts.ts` imports the published Backend types, without copying incompatible definitions.
- Public env contains optional dev API base only. Production uses same origin. Query keys include filters and session; logout clears caches and transient capture state.

- [x] Add tests for login success/failure,401 expiry,403 mutation error, CSRF header, no auth localStorage, Viewer navigation, preserved form input on error and a red/neutral shell at desktop/mobile sizes. Test architecture guard rejects raw HTTP imports from views.

```ts
expect(request.credentials).toBe('include');
expect(write.headers.get('X-CSRF-Token')).toBeTruthy();
expect(localStorage.length).toBe(0);
expect(screen.getByRole('navigation')).toBeVisible();
```

- [x] Install compatible dependencies into Frontend only using the validated Node22 runtime; record versions/lockfile, then run new tests and observe behavioral failures before building auth components. Add MSW for tests only and jsdom test environment.
- [x] Implement providers/routes (Ringkasan, Pemeriksaan, Riwayat, Peralatan, Pengaturan), accessible primitives and actionable error dialogs/toasts with request ID in collapsed detail. Implement route guards plus real server enforcement, no fake demo-auth fallback.
- [x] Run `npm test -- --run`, `npm run lint`, `npm run typecheck`, `npm run build`; no JWT/secret in built assets. Unknown client route gets an understandable page.
- [x] Commit: `feat: scaffold Denso feature MVC frontend and session shell`.

### Task 9: Equipment and settings pages

**Files:** Create `Frontend/src/features/equipment/{model/api.ts,model/schemas.ts,controller/useEquipment.ts,view/EquipmentPage.tsx,view/EquipmentEditor.tsx}`, `Frontend/src/features/settings/{model/api.ts,model/schemas.ts,controller/useSettings.ts,view/SettingsPage.tsx,view/DefinitionEditor.tsx}`, corresponding controller/view tests. Modify app router.

**Interfaces:**
- `useEquipment(filters)` exposes paginated registry, create/update/calibrations and invalidation; uses Task3 instrument contracts.
- `useSettings()` exposes maintenance settings/catalog/revisions and Admin mutations using Task4 contracts. Forms use RHF/Zod and map422 field errors without dropping input.
- Linked-check panel displays method, standard, frequency, samples and source review notes from definitions, not a single copied tool frequency.

- [ ] Tests: visual selection hides numeric range; numeric→visual does not erase history; unknown condition labelled unknown; not_working/active switches independent; changing a condition or standard requires reason; source review note visible; product version/weekly weekday edits preserve fields; denied mutations retain draft values; registry search reaches server beyond the current page.

```ts
expect(screen.queryByLabelText('Rentang fisik minimum')).not.toBeInTheDocument();
expect(screen.getByText('Kondisi belum tercatat')).toBeVisible();
expect(updateBody.review_reason).toBe('Metode direvisi');
```

- [ ] Run focused equipment/settings Vitest tests; confirm the pages/hooks are absent or assertions fail.
- [ ] Build list/drawer equipment UI and grouped settings forms following selected previews. Preserve calibration versions; show changes and effective timestamp before saving. Do not expose password/account administration or company approval claims without APIs.
- [ ] Run focused tests, architecture lint and typecheck. Admin sees editing; other roles have clear read-only views.
- [ ] Commit: `feat: manage equipment and versioned inspection settings`.

### Task 10: Inspection hub and visual/functional branch

**Files:** Create `Frontend/src/features/maintenance/{model/api.ts,model/schemas.ts,model/inspectionStore.ts,controller/useInspection.ts,view/InspectionHub.tsx,view/InspectionContextForm.tsx,view/VisualCheckPage.tsx,view/InspectionSuccess.tsx}`, related tests. Modify router.

**Interfaces:**
- `useInspection()` owns selected check/interval/trigger/sample/stage and frozen Context from the server schedule; result state includes record outcomes, not client-computed acceptance decisions.
- `inspectionStore` holds transient current inspection only; no persisted measurements/photos. Numeric routes hand Task11 `{definition,sample_id,stage?,context,checked_at}`; visual branch posts observations to the existing record endpoint.
- Before capture choose line, sampler and product Type; display server shift/production date/slot. Refresh schedule before a new inspection; already captured contexts cannot silently change.

- [ ] Tests: catalog count44 including review gaps; requirement/input-method/group filters; Packing Depth Tool offers OK/NG only; missing samples block save; zero/NG is not silently replaced; boundary refresh only before new capture; two completed checks in one slot remain distinct. Unknown master match cannot silently select an unrelated check.

```ts
expect(screen.getAllByRole('button', {name:/^(OK|NG)$/})).toHaveLength(2);
expect(saveRecord).not.toHaveBeenCalled(); // missing required sample
expect(capturedContext).toEqual(contextAtStart);
```

- [ ] Run focused maintenance tests, verify new failures.
- [ ] Implement clear hub/context panel, 44 catalog options, standard/method/frequency guidance and focused visual confirmation/success pages. Keep all photo input in Pemeriksaan, separate from monthly Ringkasan.
- [ ] Run tests/typecheck; verify no numeric result can be manufactured by the OK/NG UI.
- [ ] Commit: `feat: add guided inspection hub and visual checks`.

### Task 11: Camera/upload, ROI, automatic local CV and safe confirmation

**Files:** Create `Frontend/src/features/capture/model/{api,schemas,captureStore,roiGeometry,camera}.ts`, `controller/{useCaptureFlow,useCamera,useRoiEditor}.ts`, `view/{CapturePage,RoiPage,ResultPage,ConfirmPage,CameraGuide}.tsx` and focused tests under their feature folders. Modify shared UI only for reusable controls. Read existing `Backend/smoke_ui/{camera-capture,roi-geometry,auto-analysis,capture-state}.js` as tested behavior references; do not import their DOM app into React.

**Interfaces:**
- `useCaptureFlow(input:CaptureInput)` exposes step,stage,photo,discovery,result,error and capture/upload/recrop/reanalyse/confirm/retry/dispose actions. Stages upload/discovery/queued/reading/ready/error reflect actual responses, not invented percent progress.
- Model API wraps photos multipart, discovery, bare-ROI binary crop, job submit/poll and reading confirm. Job polling has AbortSignal, generation token, bounded backoff up to2s and120s total; stop at terminal/expiry/route exit/replacement.429 waits only while flow remains active.
- `useRoiEditor` consumes oriented source dimensions and normalized ROI, produces normalized ROI. Drag/resize, arrow nudges, width/height sliders and zoom+/- share one mapping. Preview zoom never changes crop coordinate semantics.
- `CameraGuide` has a full square gauge/display frame and a separate shorter label frame directly below; both scale inside the actual video content area, including letterboxing. Full-resolution capture excludes guide overlays. Native capture/upload remains fallback when live preview is unsupported.

- [ ] Tests: valid value0 displayed; automatic analysis after selection; stale result ignored after ROI/profile/image edit; guide/crop mapping in portrait/landscape/EXIF orientation; button/drag operations yield the same crop; cancel/error revokes object URLs and stops tracks; blurred screen recapture shows an actionable warning but never invented correction.
- [ ] Tests for explicit identity and value review; rejected candidate clearly separate from accepted prediction; manual correction requires reason; uncertain confirmation retry preserves identical ID/body; next sample needs a new photo. Include a deferred response arriving after a shift boundary and after route exit.

```ts
expect(screen.getByText('0.000 MPa')).toBeVisible();
expect(oldResponseApplied).toBe(false);
expect(retry.confirmation_id).toBe(first.confirmation_id);
expect(retry).toEqual(first);
expect(track.stop).toHaveBeenCalled();
expect(saveRecord).not.toHaveBeenCalled(); // user has not confirmed
```

- [ ] Run capture tests before implementation; verify meaningful failures.
- [ ] Implement photo→result→confirmation separate pages, ergonomic crop controls, prominent value/unit/confidence and collapsed reading details. Prefer registered label matches as suggestions; no match/multiple matches require operator selection. Keep label crop visible; filenames and instrument button legends cannot become accepted master identities. Changes invalidate pending evidence. Preserve existing profile-authoritative server behavior.
- [ ] Run focused tests, typecheck and Backend camera/ROI/confirmation regressions. Exercise a real analog image, digital pressure and IMG_20261009_085505 from the existing local corpus through the backend, without copying private images into Git. This confirms integration, not a new accuracy claim; no CV algorithm changed.
- [ ] Commit: `feat: integrate automatic local CV camera crop and confirmation`.

### Task 12: Monthly Ringkasan and table-only Riwayat

**Files:** Create `Frontend/src/features/dashboard/{model/api.ts,model/schemas.ts,controller/useMonthlySummary.ts,view/SummaryPage.tsx}`, `Frontend/src/features/history/{model/api.ts,model/schemas.ts,controller/useChecksheet.ts,view/HistoryPage.tsx,view/MonthlyTable.tsx,view/OccurrenceDrawer.tsx}`, feature tests. Modify router.

**Interfaces:**
- `useMonthlySummary({month,line?,shift?})` returns Task7 Summary; KPIs/daily graph/group table use full server aggregates.
- `useChecksheet(scope)` handles cursor rows, month and status/value toggle; it never recomputes statistics from loaded rows.
- Monthly table uses `ChecksheetPage`; an expanded cell opens distinct occurrence/raw/evidence data. Numeric overview explicitly labels X-bar; selecting a check links to `/riwayat/:definitionId` with line/date context.

- [ ] Tests:501 records show501 total regardless visible rows; no-data ratio is a dash; OK ratio not labelled completion/confidence; monthly Riwayat has no graph/KPI/SPC panel; selecting month replaces table; two-occurrence cell opens both; blank cell stays blank; stale query completion cannot swap current month; mobile horizontal table retains identifiers.

```ts
expect(screen.getByText('501')).toBeVisible();
expect(screen.queryByRole('img', {name:/grafik/i})).not.toBeInTheDocument(); // history monthly
expect(screen.getByRole('button', {name:'2 pemeriksaan'})).toBeVisible();
```

- [ ] Run dashboard/history tests, verify failures.
- [ ] Implement monthly dashboard matching preview and frozen-column checksheet matching history v3. Default picker lists current plus five previous calendar months; retained archives remain selectable. Use table paging/row windowing only when necessary, and never cache evidence image bytes with report queries.
- [ ] Run tests/typecheck and manual desktop/mobile layout inspection; no chart mixing MPa/mm/kN into one numerical series.
- [ ] Commit: `feat: display monthly analytics and overall checksheet history`.

### Task 13: Detailed paper-style SPC, evidence and complete print/export

**Files:** Create `Frontend/src/features/history/{controller/useSpcReport.ts,view/SpcReportPage.tsx,view/SpcCharts.tsx,view/MeasurementMatrix.tsx,view/CalculationPanel.tsx,view/EvidenceDialog.tsx,view/BaselineDialog.tsx}`, `Frontend/src/styles/print.css`, related tests. Extend history model APIs/schemas and route.

**Interfaces:**
- `useSpcReport(scope,baseline_id?)` uses server SpcReport and independently paginated subgroups. Presets are1week/1month/custom inclusive dates; choose one cohort before a single capability panel.
- Charts render supplied xbar/r series and supplied limits; view code never implements Cp/Cpk/control-limit formulas. Selecting a point opens its authorized occurrence/evidence.
- Print/export uses the complete report dataset at one as_of. If continuation would exceed report bounds, require a narrower scope; never silently print only loaded groups. CSV is server-generated; A4-landscape print transposes sample rows/occurrence columns with repeated headers and page breaks.

- [ ] Tests: EE fixture displays correct Xbar/R/Cp/Cpk/Type; all seven numeric chart profiles selectable; visual check has no fabricated SPC; n1/incomplete/constant/mixed standards show reason/cohort selection; changed viewing dates retain frozen baseline limits; API error does not leave an old cohort's numbers under a new heading; print covers more than one raw-data page.

```ts
expect(screen.getByText('Cp (lembar)')).toBeVisible();
expect(screen.getByText('STDEV.S')).toBeVisible();
expect(screen.getByText('Tidak tercatat')).toBeVisible(); // historic Type
expect(printData.groups).toHaveLength(101); // not first50
expect(lastExportScope).toEqual(selectedScope);
```

- [ ] Run focused report tests, observe failures.
- [ ] Implement Xbar then R chart, raw matrix X1…Xn/Xbar/R/Type, count/sum/stddev/3σ/6σ/Cp/Cpk/all UCL/LCL/Rmax panel, baseline source and provisional/undefined reasons. Clearly separate LSL/USL from control limits. Place technical explanations in expandable details; keep values legible.
- [ ] Run tests, compare rendered fixture against deterministic v3 preview, inspect A4 print at short and long ranges, verify authenticated photo access and formula-safe CSV. Admin baseline save requires review reason; no other role sees a working save mutation.
- [ ] Commit: `feat: add scoped paper SPC reports evidence and printing`.

### Task 14: Local setup/start, regression verification and handover

**Files:** Create root `setup.cmd`, `start.cmd`, `stop.cmd`, `Frontend/{setup.cmd,check.cmd,scripts/setup.ps1,scripts/check.ps1}` if not already created; root `scripts/package-application.js`; `Backend/test/frontend-serving.test.js`. Modify `Backend/src/app.js`, `Backend/scripts/{start.ps1,package-release.js}`, `Backend/test/{launcher,release-tooling}.test.js`, root `.gitignore`, root/Frontend README and create `Frontend/docs/{installation,configuration,frontend-integration,verification}.md`.

**Interfaces:**
- Root setup delegates Backend setup (packages/OCR/schema) then frontend npm ci and build using the same validated Node runtime. Initial setup may download dependencies; start only launches installed services.
- Existing Backend start serves sibling `Frontend/dist` at `/` when present; absent build keeps smoke landing. `/smoke/index.html` remains explicit. SPA fallback excludes `/api`, `/contracts`, evidence and unknown asset paths; API404 remains JSON. Serve hashed assets with immutable cache, HTML/version metadata no-store. Support existing local HTTPS8443 and HTTP8100.
- Root start/stop wrappers use relative `%~dp0` paths. Root packaging includes source, lockfiles, compiled UI and existing required OCR/model distribution assets per current manifest; excludes runtime/private files. Do not duplicate model assets or include node_modules/.venv/private corpus. Installation documentation states dependency/network needs rather than claiming an offline installer.

- [ ] Tests: UI deep link returns HTML; unknown API returns JSON404; missing JS asset404 not HTML; backend-only smoke still works; moved/space-containing directory setup resolves correctly; release excludes.env/databases/passwords/certificates/photos and includes OCR manifest/models plus frontend source/lock/dist; startup reuses healthy owned processes and handles occupied ports clearly.

```js
assert.match(html.headers['content-type'], /text\/html/);
assert.equal(api404.body.code, 'NOT_FOUND');
assert.equal(asset404.status, 404);
assert.equal(release.entries.some(p => /online-access|\.env$|\.sqlite|\.key$/.test(p)), false);
```

- [ ] Run new serving/launcher/release tests first; verify absent integration failures.
- [ ] Implement static serving with CSP compatible with the chosen local assets, relative launch/build scripts and installer/migration instructions. Keep existing private data/credentials unchanged. Update docs with ports, camera HTTPS certificate setup, product/line/shift setup, ROI coordinate contract, input/output examples, error codes, reporting sigma assumptions and SQL adapter pairing boundary.
- [ ] Run Backend `npm run lint`, full `npm test`; Frontend lint/typecheck/Vitest/build and production dependency audit. Audit findings need documented resolution or an explicit remaining blocker, not silent success. Run selected existing CV endpoint fixtures (analog, digital pressure, digital length) since the reader is unchanged. Do not rerun/train the full corpus unless a CV change or new failure justifies it.
- [ ] Verify the built application through existing localhost and local-network HTTPS, login, one visual check, photo auto-analysis, ROI change, confirmed numeric sample, history, SPC fixture/export, settings permissions and logout. Record which checks ran on laptop versus real HP; do not claim physical-phone UAT without that test. Screenshots/demo data never stand in for live integration evidence.
- [ ] Request one independent end review of the whole diff against this plan. Fix material findings, rerun affected checks, then record results/remaining database and quality-review limitations in verification.md. Do not commit generated private logs or actual corpus photos.
- [ ] Commit verified files: `feat: ship local frontend integration and handover guide`. If publishing to the already authorized GitHub remote, inspect staged files/secrets and push only verified public source/artifacts; no force push. Report exact URL/revision only after successful publication.

## Completion and self-review

Acceptance: five responsive pages; no-chart monthly history; separately scoped complete SPC; server-owned versions and counts; explicit verified photo saving; camera/upload/ROI guides; portable local setup/start; backend-only fallback; no private files in release/Git. CV accuracy remains the existing validated implementation, with fresh integration checks documented separately.

Plan self-review performed before handoff:

- Spec coverage: original mobile flow → Tasks8/10/11; all v2 pages and master settings → Tasks2–4/9/10/12; v3 monthly/detail/SPC/Type/baseline/print → Tasks2/5–7/12/13; portability/security → Tasks1/7/8/14.
- Interfaces: API base remains `/api/v1`; `product_type_id` optional Context plus immutable sidecars; record ID identifies occurrence; report scope consistently uses `production_date_from/to`; calculation/report method strings consistent.
- Review Focus: each of the five classes above has explicit owning red/green tests. Legacy data, finite serialization, all-page totals, authorization and retry/cancellation have direct assertions.
- Proportion: the plan selects boundaries, DTOs, formulas and test assertions; it does not implement business functions or repeat generated contracts. Existing kind/input_method/evidence literals and structured interval guides were checked against source before handoff.
- Remaining external review: Talc sample interpretation, Sweeping tool/unit, Gasket occurrence schedule, quality team's sigma/baseline conventions, real HP camera UAT and production SQL adapter integration. These remain labelled; none prevents local verified workflows for already configured profiles.
