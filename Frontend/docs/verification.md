# Verification — local application 1.1

Date: 21 October 2026. Branch: feat/frontend-maintenance. Deterministic tests, live checks and receiving-team acceptance are distinguished below.

## Automated evidence

- Backend: architecture check and **133/133** Node tests passed from Backend cwd. Coverage includes migration/legacy preservation, authenticated reporting/evidence, whole-period aggregates, paper SPC, CSV escaping, frontend/static routing, launcher ownership and bundle allowlists.
- Frontend: lint/Feature MVC guard, strict TypeScript, **37/37** tests in 13 files and production build passed. Coverage includes roles, settings revisions, automatic photo flow, stale results, camera cleanup, ROI geometry, zero, explicit confirmation, uncertain-save navigation, monthly blanks/multiple occurrences, 501 totals, incompatible SPC cohorts, reference Cp/Cpk and a 101-subgroup print snapshot.
- Production audits: **zero vulnerabilities reported** by npm audit --omit=dev for both packages on this date. This is a dependency audit, not a corporate security certification.
- Initial JavaScript is 204.59KB gzip; the shared chart chunk is 98.95KB gzip and loaded with chart routes. These are build measurements, not phone response-time promises.
- Installed SQLite migrated **schema1→2 with backup**, preserving existing records and credentials. No CV algorithm or model changes were made.

## Independent review and corrections

One independent end review covered the whole feature. Material findings were reproduced with failing tests, fixed and included in the passing suites:

- Bind an inspection to its reviewed standard version and reject a stale version transactionally.
- Keep unresolved equipment identity unselected even when a check has only one linked asset.
- Export measurements by sample ID rather than observation array order.
- Invalidate prepared print data when the report snapshot/cohort changes.
- Provide recovery from an incompatible frozen baseline, including the error screen.
- Preserve an uncertain-save lock across navigation and clear completed drafts to prevent known duplicate submissions.
- Explicitly clear a previous occurrence schedule when all slots are unchecked.

Additional UI checks corrected phone-width overflow and analysis-error dismissal. A selected photo is copied into an owned in-memory File before clearing the native picker, preserving original bytes/MIME and cancellation; files over 15MiB are rejected. This adds one bounded memory copy. The source picker regression is unit-tested; the internal-browser limitation below remains.

## Unchanged local CV integration

Fresh isolated FastAPI upload → discovery → matching gauge ROI → job/poll → nonempty JPEG crop accepted three existing local cases: analog pressure, digital pressure and digital length. Predictions matched the earlier reader results, with medium heuristic confidence. This is an integration check, not a new field-accuracy benchmark. No private photos are included in Git or the application bundle.

A separate live Node API → private CV test used the digital length case and a fixture-only database: upload201, discovery success, completed/validated job, explicit reading confirmation and authenticated crop200. The test initially used the wrong registered decimal count; setting the fixture profile to the display's actual two decimals resolved the rejection. No operational master/data was changed by this test. Profile configuration remains authoritative even in auto mode.

## Live local application checks

- Root start launches HTTP8100 and private CV8101. HTTPS8443 returned200 with the installation CA trusted and normal certificate validation enabled.
- Desktop UI login, server schedule, monthly table/history, seven-subgroup EE SPC fixture and explicit visual NG save succeeded. Fixture data used an isolated temporary database. Operational records were not replaced by demonstration records.
- Monthly totals reflected the complete fixture data. EE capability matched the independent paper fixture. At a390px browser viewport, content width stayed within the375px layout viewport after responsive fixes.
- Direct API photo/confirmation/evidence succeeded as described above. Browser controller/unit tests exercise automatic upload, recrop, cancellation and explicit saving.
- **Live file selection in the Codex internal browser could not be completed:** its selected-file read first failed and later crashed the renderer. This does not establish that Chrome/HP behaves the same way. Full real-Chrome upload → ROI → confirmation and physical-phone camera UAT remain open acceptance checks; they are not claimed as passing.
- The101-subgroup print test verifies complete snapshot data and print CSS exists. Physical A4 print pagination/preview has not been visually accepted on a printer/browser print dialog.

## Transfer and receiving-team checks

The local application ZIP is built with a SHA256 manifest. Entry/hash verification includes three OCR weights, frontend source/build, lockfiles and relative setup/start scripts; it excludes private environment files, records, credentials, photographs, installed dependencies and certificates. Node/Python system runtimes and initial dependency downloads remain installation prerequisites. A fresh second-computer installation has not been performed here.

Remaining acceptance:

- Real Chrome/HP camera, permission, focus, HTTPS trust and glare/monitor recapture at workplace positions. Lost image detail cannot be guaranteed recoverable.
- Physical short/long A4 report printing and the receiving team's operating workflow.
- Production SQL Server/MySQL connectivity, backup/migration/TLS/permissions; SQLite is the verified local database.
- Quality approval of STDEV.S paper Cp/Cpk nomenclature versus within estimates, saved baselines and source ambiguities for Talc n8, Sweeping instrument/unit and Gasket occurrence schedule. Source review notes remain visible.
- Source images omit checklist rows17–23 and clip row45. The application retains44 configured options without inventing unseen requirements.
- OCR artifact provenance/licensing notes remain in Backend/docs/governance/ocr-artifacts.json. No corporate UAT/Sonar certification is implied.

## Update — result selection, manual entry and configured choices

The annotation fix retains the current reading/crops when equipment changes; it does not submit another CV job. All numeric equipment/check choices remain accessible. A unique registered relationship fills the paired selection; ambiguous or absent links require operator/configuration input. A different physical profile never relabels the original prediction. Rereading is explicit, and manual entry is an alternative.

Manual entry creates a photo-backed, unvalidated operator-review receipt without OCR. Equipment/value verification, profile limits, ownership, expiry and evidence uniqueness remain required; a user-entered reason is no longer required. If discovery fails after upload, equipment options and the uploaded photo are retained for this fallback.

Line defaults start at1–17; Admin can now type/add/remove configured line names beyond17 (maximum200), and add/remove samplers (initial Ldr). Empty lists do not enable unrestricted free-text entry. Existing records remain intact. This installation's active lists were explicitly updated to1–17 and Ldr while retaining product Types.

Update verification: **Backend137/137**, **Frontend48/48**, lint/Feature MVC/types/build passed. New regression tests cover no-reread selection, mutual links/ambiguity, original-unit display, uncertain-confirmation lock, reassignment/profile/calibration/revision guards, photo-backed manual entry, failed-discovery fallback and configured choice controls. One focused review found the failed-discovery fallback issue; its failing test was observed before the fix and the complete frontend suite was rerun. CV algorithms/models were not changed. Earlier real-HP/print/second-computer/SQL acceptance limits still apply.

## Update — registered matching, custom inspections and pending schedule

Command-only verification: Backend145/145 and Frontend53/53 passed, including lint, Feature MVC, types and production build. After the final slot/shift form guard, the five Settings tests, lint, types and build passed again. Backend checks cover create/archive/due endpoint authentication and response schemas, archive fallback/history preservation, transactional equipment links, custom links beyond the original44 and invalid shift/slot combinations. No browser testing was used for this extension.

Added tests demonstrate registered-label selection independent of an old check filter, safe auto/digital profile normalization, shared blank-area label matching, Admin add/archive controls and pending-list filtering by line. Schedule tests cover both OK/NG completion, incomplete/future exclusion, changed standards, per-shift midday/midnight boundaries, next-shift return, daily/weekly and year rollover, and explicit reviewed slots/weekdays. Source CV models and algorithms remain unchanged. Physical-phone UAT and receiving-computer acceptance limits above remain open.

Live local API verification returned a pending list and valid readings for IMG_0418 (0.410 MPa analog) and IMG_20261009_085505 (15.96 mm digital). These checks uploaded/analyzed photos without creating business maintenance records. Independent read-only review found the incompatible shift/slot guard and the old44-link equipment cap; both were corrected and verified before packaging. No release blockers remained in that review.

## Update — exact registered labels and dependent equipment choices

Frontend62/62 tests, lint, Feature MVC, types and production build passed using commands only. Failing regressions were observed before implementation for raw-text registered labels, a later matched indicator/ROI, dependent filtering and field order. Review found numeric-only display text could match an equipment code after normalization; the failing0405/0.405 regression was added and corrected before the final full run. Complete names/codes/aliases select an unambiguous eligible asset; partial, duplicate, conflicting or numeric-only fallback text stays manual. No CV algorithm/model or backend/API schema changed in this update.

Pemeriksaan precedes Nama alat in page/keyboard order. With no selected check, all eligible numeric equipment is available. Choosing a check filters its linked equipment and clears an incompatible identity; operator selection is still required when no label matched. Selecting an equipment name fills its sole active numeric check, without another CV job. Measurement confidence and original result units remain unchanged.

Read-only registry audit found B3601 in area17 without maintenance_check_ids, and no MC Lowering1/2 assets or matching numeric Machine Lowering/pressure check in the local master. These business records were not invented or changed. The automatic mapping requires the actual reviewed definitions/assets/relationships to be configured by Admin; missing associations are explained on the result page.


## Update — guidance, simplified administration and compact monitoring (22 October2026)

Command-only checks passed: Backend architecture and148/148 tests; Frontend lint, Feature MVC, strict types,77/77 tests in20 files and production build. No browser automation was used. New cases cover mandatory standard/method acknowledgement (including direct/late routes and camera gating), no CV reread, identity defaults/overrides, removed reason inputs with automatic audit descriptions, alphabetical linked checks, registry sorting across paginated results, stable1–44 report numbers, legacy custom ordinals and unchanged archived snapshots.

Monitoring regressions separate501 monthly records from2 completed/3 pending checks; cover historical month/shift versus server schedule, explicit multi-line selection, zero/loading/error/retry, old-response isolation, and next-day identical slot IDs. Independent review found two issues: mixing a newer schedule with older due counts, and excessive desktop vertical spacing. Both were corrected; the rollover failing regression was observed before the corrected full suite. Desktop/tablet icon navigation retains accessible names, tooltips, active status and48px targets. Short-desktop header/filter share a row and chart/table panels follow viewport height; tablet/phone workflows keep vertical scrolling.

A second review found legacy custom definitions lacked numbers on new record snapshots even when the catalog displayed45+. Resolution now carries stable numbers into new records and new reviewed revisions; old report rows use an ID-based display fallback. A regression verifies the original archived standard remains deeply equal. No business records, reviewed master associations or CV models/algorithms were modified. No remaining release blocker was identified in the focused reviews.

Pixel fit and physical tablet ergonomics are designed in CSS and reviewed in code, not newly browser/physical-device accepted. The chart-container dimensions supplied in jsdom tests are fixtures for data-flow testing, not evidence of rendered monitor geometry. Physical phone/tablet camera, print, second-computer and corporate database acceptance limits above remain open. Private-file and application-package checks are required before distributing this update.


## Update — merged settings and editor availability actions (22 October2026)

The pre-edit version64944fe was confirmed clean and already pushed to origin/feat/frontend-maintenance before product edits began. This preserves the requested pre-change snapshot independently of the subsequent commit.

Command-only tests: Frontend79/79 in21 files; Backend150/150, plus architecture/lint/strict types. Focused UI13/13 covers renamed/ordered tabs, direct equipment-tab URL, Admin/read-only access, moving archive inside the editor, cancel without writes, failed archive draft retention and explicit reactivation. Backend regressions cover strict active-only input, authentication, CSRF, Admin permissions, no-op repeat, latest identity/profile preservation, inactive links, calibration and historical snapshots. Real operational records were not modified by these fixture tests. No browser was used.

A dedicated transactional instrument status endpoint avoids writing a stale/full editor snapshot. Editors submit availability independently of unsaved fields; successful actions close the editor, failed/cancelled actions retain it. The registry includes archived inspections when editing relationships. Legacy /peralatan redirects with replace to /pengaturan?tab=equipment; tab state is URL-derived. Sidebar has four destinations. Independent read-only review found no release blocker. Existing physical-device/print/second-computer/SQL acceptance limits remain unchanged.


## Update — operator workflow and scale direction recovery (24 October2026)

Command-only release checks: Backend162/162 tests plus architecture; Frontend100/100 tests in26 files plus ESLint, Feature MVC, strict types and production build; private CV full suite222 passed. No browser automation was used. A legacy contract failure discovered during the full backend run was fixed by separating required working/not_working input from readable historical unknown condition responses. Final full backend run is green.

Regressions cover dynamic line names beyond17 and200-line capacity, required equipment condition, reason-free manual/corrected readings with evidence/identity/value guards, authenticated menu navigation preserving capture and typed review, no background navigation takeover, explicit session resets, deletion confirmation/cancel/error/Admin authorization, soft-delete report/due exclusion, machine completion independent of Type, isolated read-only demo, and complete multipage OK/NG daily aggregation. An obsolete visual-SPC test now asserts an empty status report without invented X/R statistics; populated status graphs are tested separately. Independent review findings about demo availability, return links, and partial status totals were resolved.

IMG_0493: full-resolution photo upload, discovery, local analysis and poll through the private API returned unchanged0.417MPa, now validated with medium confidence and two independently OCR-read scale-direction anchors. The fallback only runs after strong pivot/tick/dual-mask needle evidence and remains bounded to at most6 crops, normally2. It does not inject reference values or weaken ambiguous-needle gates. Synthetic tests also cover mirrored scale order, low OCR confidence, nonfamily/duplicate labels and competing needles.

35-photo cached-ROI private-API regression: all35 raw outcomes unchanged;27 previously validated readings retained and IMG_0419 additionally validated; all5 digital readings unchanged. This is28/35 validated readings, not a claim of>80% measured accuracy. Seven cases still require manual review/retake; three-decimal interpolation remains distinct from physical instrument accuracy. Discovery uses existing crop proposals for this comparison and is not a fresh full-discovery accuracy benchmark for all35 photos. The target0493 uses full discovery separately.

Demo values are deterministic illustrations following the reviewed paper definitions/sampling limits, not transcribed historical handwriting. They use isolated in-memory repositories and never enter operational totals, saved baselines, evidence or production CSV. Demo capability is exposed only in development. Physical tablet layout, new unseen camera scenes, printing and receiving-company SQL integration still require field acceptance. Private configuration, credentials, photos, operational records and certificates are excluded from Git and the transfer archive.

Live local API verification after restart confirmed initialized OCR, exact served production build, stable base numbers1–44, working monthly/due/status routes, and HTTPS with the existing installation CA. A newly changed Wi-Fi address required renewing the server certificate SAN while retaining that CA. The public Node upload→discovery→job→poll also returned valid0.417MPa for IMG_0493 using hybrid-cv-v0.2.5. Live demo returned two Type cohorts, seven complete n4 subgroups, computed X̄/R/control limits, and no saved business records. The transfer archive is validated separately against current source, build and three OCR weights.

## Update — compact operator layout, cell modes and acceptance criteria (25 October2026)

Command-only verification passed: frontend139/139 tests in32 suites, ESLint, Feature MVC, TypeScript and production build; backend169/169 plus architecture; Python CV226/226 with the packaged OCR model directory. The application package selection tests also pass, including the public DENSO source asset while excluding private PNG/JPG photos. No browser automation or operational maintenance-record writes were used.

Regression coverage includes unique complete cross-line name/alias selection, unchanged capture line, ambiguous identity fallback, no reread on selection, frozen confirmation limits, editable equipment acceptance, inclusive boundaries, one-sided limits, difference criteria consistency, legacy inspection-limit fallback, incompatible-criteria SPC separation, merged monthly rows and complete cursor pagination, all three cell modes, and status-only legacy MPa checks. Existing evidence, identity, schedule, subgroup completeness and baseline guards remain enforced.

An independent read-only review found that an equipment edit during a retained capture could leave explicit rereading on a stale registry revision. The follow-up refreshes and revalidates the selected registry entry before rereading, exposes that action after PROFILE_CHANGED, and preserves cancellation/pending-confirmation guards. Its45 focused capture/workspace/selection tests pass, including nine new regression cases, followed by final full-source lint/Feature MVC/types/build. Physical monitor/tablet layout acceptance remains a field check; the automated DOM suites verify behavior, not rendered pixel geometry.

After restarting the owned local services, readiness and OCR passed, the served index matched the final build, catalog numbers1–44 stayed stable, and HTTPS validated against the installation CA. A fresh IMG_0493 upload/discovery/analysis with both gauge and label ROI returned valid0.417MPa and uniquely selected MC Lowering1 linked to Machine Lowering, while retaining capture line1 and master area17. The isolated demo still returned two product cohorts and seven n4 subgroups. No maintenance records were written by these checks. Bundle verification matched current sources/build and all three packaged OCR weights without private runtime files.

## Update — dimensional console, tool occurrence and ordinary X/R history (25 October2026)

Final command suites passed **Frontend166/166 in38 files** and **Backend188/188**, with ESLint/Feature MVC, backend architecture, strict types and production build. CV models/algorithms were unchanged; live readiness still initialized all packaged OCR weights. No browser automation was used. Visual depth uses CSS/SVG/Lucide rather than a 3D runtime. The supplied transparent DENSO/Crafting the Core logo is copied unchanged, and the header clock is anchored to server time with local seconds ticks and minute/focus resync.

Regression coverage includes same-tool orphan confirmation recovery, legacy globally keyed reading recovery, later-shift availability, per-tool completion, occurrence freezing across processing, exact/concurrent save reconciliation, changed-review conflicts, strict product/before-after evidence, line-specific/shared required tools and legacy unassigned-line fallback. Errors are presented in Indonesian with technical details collapsed. A read-only review found the cross-line requirement issue; it was reproduced and corrected before the final188-test run. Confirmation file timing out in an earlier concurrent runner attempt was rerun6/6 successfully and the final complete backend suite passed88seconds without raising timeouts.

The frontend example mode/button is removed; stale flags call normal endpoints. A development-only, dry-run-first CLI imports tagged, manifest-verified X/R records with separate Type cohorts and no fabricated photo/reading evidence. API/schema tests prevent public requests from using the import path, CSV preserves data_origin, baselines reject illustrative cohorts and operational due ignores them. Imported records remain deletable with the normal Admin confirmation.

For this local installation only, after a private SQLite backup, the authorized import created56 records on Line17 for19–25October2026: four charts × two test Types × seven production dates. Ordinary authenticated report/subgroup APIs returned eight cohorts and56 complete n4 groups with computed X/R/statistics. Hash comparison confirmed all12 pre-existing records unchanged, due states unchanged, and zero fabricated evidence. This database and its backup are excluded from Git and bundles. Receiving installations can opt into the documented development import; it is never an automatic production seed.

The final local smoke confirmed exact served build, stable original check numbers1–44, ready OCR, normal monthly/due routes and trusted local HTTPS. Responsive monitor/tablet presentation, touch targets, reduced motion and print styles are implemented; physical screen/camera acceptance remains distinct from these command checks. The build's roughly700kB main JS chunk has a size advisory; compression is approximately217kB, with charts separately loaded.

## Update — all-line progress and focused capture (25 October2026)

Frontend **173/173 tests in38 files**, ESLint/Feature MVC, strict types and production build passed. Initial regressions failed for the old all-line placeholder and absent global modal, then passed after implementation. Five-line weighted aggregation, line configuration changes, failure/retry and independently refreshed occurrence boundaries are covered. Every line uses the same maintenance-due cache key as the inspection workflow. Counts from different occurrences are never combined; no partial overall percentage is shown after a line failure.

Capture tests cover inert shell/menu links, data-router back blocking, synchronous ready-to-result navigation, keyboard focus/Tab/Escape handling, cancel and late responses, failure/unmount cleanup, plus retained ready draft and confirmation state. Upload/discovery/CV status appears only in the workspace-level popup. The camera uses viewport-height bounds with unchanged full-source capture and contain-fit guide geometry. Heading margins match between pages, with a stable scrollbar gutter. A read-only independent review found no Critical/Important or minor findings. No browser automation, physical-device acceptance or maintenance-record writes were used for these changes. Backend/CV algorithms, models, API contracts and database data were unchanged.

After restart, the local API served the exact final build, reported OCR ready and stable base inspection numbers1–44, and passed monthly/due plus installation-CA-verified HTTPS checks. All four configured lines returned valid counts for one current occurrence. These live checks did not write maintenance records. The main chunk retains a size advisory at702kB, approximately218kB gzip; charts remain separately loaded.

## Update — compact monitoring, custom shifts and popup confirmations (25 October2026)

Full command verification passed **Frontend183/183 across41 files** plus ESLint/Feature MVC/types and production build, and **Backend233/233** plus architecture. New backend tests cover strict HH:mm/cyclic four-start validation, fixed logical slot IDs, minute cutoffs, shifts crossing midnight, month/year boundaries, every recurrence basis, older-client settings updates, frozen historical records and photo settings, and stale-evidence rejection after a schedule change. Models/CV algorithms are unchanged.

The normal desktop Summary content uses a fixed viewport grid with bounded scroll areas for long line-pie lists and the monthly table. Counts of pending lines replace the long note; all monthly filters display Indonesian names. Short desktop header spacing is uniform across menus. Physical browser/device pixel geometry remains a field acceptance check, distinct from static CSS and DOM verification.

Admin choice counts/add controls are aligned; custom start times are collapsed under Detail jadwal shift. Current equipment/inspection tables omit archived entries while preserving API history. Save/remove prompts, including reviewed photo and visual-result writes, use accessible modal notifications. Tests verify cancel-before-write, retry/error preservation, background inert/focus/scroll restoration, choice counts/time payloads, current-schedule cache refresh and removed-row visibility.

Independent review found an older-month UI restriction and focus trapping that skipped error summaries. Both were reproduced red, corrected and verified green in the final full suite. The replacement month/year picker keeps older retained periods accessible. No unresolved review finding remains. No browser automation or operational maintenance-data edits were used.

After the owned-service restart, live command checks confirmed the exact final served build, ready OCR, stable original check numbers1–44, trusted local HTTPS, current settings-to-schedule agreement and coherent due occurrences for all six then-configured lines. The active-only registry filter and generated custom-schedule contract were also verified. Operational settings and maintenance records were not written by these checks. The three-model transfer bundle was rebuilt and checked against current source/build with private files excluded.

## Update — complete Summary visible without nested scrolling (25 October 2026)

The user's clarification supersedes the bounded-scroll layout described above: every displayed line pie and monthly row must be visible at once on a monitor. The replacement stylesheet removes the list/table height caps, uses compact controls and rows, and preserves a shared header/content origin across menus. All data and report links remain present. Small screens use normal page flow; errors and expanded guidance can extend the page rather than clipping content.

A private command harness renders and hydrates the actual SummaryPage and AppShell using synthetic data matching six configured lines (2 completed, 268 pending) and the nine supplied monthly rows. It uses the built production CSS in an isolated headless Chrome process, without user browser sessions or operational requests. The old layout failed with its final row at 933px in a 650px viewport. The replacement passed the four exact inner viewport sizes 1280×600, 1280×650, 1366×768 and 1920×1080, each with and without collapsed warnings: all rows and tiles visible, zero page overflow, zero nested scroll areas and no ancestor clipping. Chart assertions require 29 visible nonzero bars, with reduced motion enabled to settle animation. This is rendered command verification, distinct from physical monitor/tablet acceptance.

Frontend 183/183 tests in 41 files, ESLint/Feature MVC, strict types and production build passed. Independent review identified a mismatched error selector and nested-error omission; both were corrected. Two additional cached-data error fixtures passed with readable normal flow and zero overlap or clipping, bringing the monitor harness to 10/10 cases. A separate 500×844 small-screen flow check passed without horizontal overflow; narrower mobile widths were not measured. No important review findings remain. Live smoke confirmed the exact served build, ready OCR, stable original check numbers 1–44, working monthly/due routes and trusted local HTTPS, with zero business records written. No backend, CV, model, API or database behavior changed.


## Update — larger daily chart and latest check times (25 October 2026)

The Summary header now holds title, month/line/shift filters and the start action on one desktop row, retaining shared typography. Inline KPI labels/values and dividers free vertical space for the daily chart; the Total month is right aligned before its calendar icon. Summary names use normal text color. The Detail column is replaced by the latest actual check time in WIB; the entire row opens filtered inspection history, with a native keyboard-accessible name link. The API adds nullable groups[].latest_checked_at and orders groups newest first, with legacy missing timestamps handled safely. Settings combines permanent number and name under No. Pemeriksaan; inspection borders are stronger and monthly history grows with page scrolling.

Verification: 25 targeted frontend tests, ESLint/Feature MVC, strict types and production build passed; all 237 backend tests and architecture checks passed. Isolated command geometry checks passed at 1101×650, 1180×650, 1280×600, 1280×650, 1366×768 and 1920×1080, including header containment, shared typography, inline unclipped KPIs, normal link colors and right-aligned month. The 1101px filter-grid wrap was found during review and corrected without reducing fonts. The chart plot measures about 321px at 1366×768. Live smoke confirmed the served build, ready OCR, trusted HTTPS and newest-first timestamp fields for all nine current groups, without business-record writes. Changes are local; no GitHub upload was performed.

## Update — editable inspection numbers, grouped history and choice editors (26 October 2026)

Inspection numbers are editable unique integers from 1 to 10000, including archived definitions. Current catalog, summary, checksheet projections and UI selectors use numeric order; stable internal IDs, equipment links and stored historical snapshots are preserved. Legacy number allocation is pinned during definition writes and paging fingerprints include current numbering. Add forms suggest the next available number rather than reusing an occupied identity.

Line Produksi has three columns of lists: **Line produksi, Sampler, Tipe produk**, with a single categorized add popup and per-item pencil editor. Saves wait for the server, failed drafts remain editable, deletion requires confirmation, and inactive choices stay visible in settings while operator lists only use active values. Optional inactive_lines/inactive_samplers preserve older clients. Legacy product codes, hidden rollover fields and saved shift times survive unrelated item edits. Shift edits are saved separately inside Detail jadwal shift. A reproduced query-cache race was fixed by publishing the successful response before invalidating settings.

Monthly cells group Shift 1 and Shift 2 vertically, then numeric line and chronological session order; explicit shift/line labels remain under filters. All/status/sample modes keep their existing meaning, and X̄/R units remain inline. Trash icons sit below the overall result in details and at the far left of Cancel/Save editor rows. Review found obsolete standalone delete-section spacing in the new footer position; the footer-specific reset removes it. The small attribution follows the initial working viewport and remains excluded from print.

Frontend command coverage completed 207 passing tests across all 48 files: the full run passed 204 tests in 47 files, while one worker failed to start; the remaining OccurrenceDrawer file passed all 3 tests on its separate rerun. An earlier outdated assertion for the replaced two-row CSS class was updated to assert both accessible shift groups and their actual line/status data. No browser automation or new browser profiles were used. DOM/CSS review is distinct from physical monitor/tablet acceptance. The build retains its main-chunk size advisory; CV algorithms and packaged OCR weights are unchanged.

After the owned local restart, a read-only authenticated smoke confirmed the exact served production build, ready OCR, 45 unique sorted current numbers matching both Summary and Report, valid active/inactive settings, due endpoints for all six configured lines and installation-CA-verified HTTPS. Zero operational maintenance records/settings were written. This live check was completed before the final three-column-only layout correction; the final build is checked again below. No GitHub upload was performed.

Final backend verification completed **251/251 tests**, with architecture and whitespace checks passing. This includes editable-number transactions/paging, inactive-choice backward compatibility and preserved historical snapshots. The final GeneralSettings column/title correction retains the same CRUD behavior.

The final three-column production build passed strict TypeScript and Vite build. After its restart, the same read-only smoke passed again: exact served build, initialized OCR, 45 positive/unique/sorted current numbers matching summary/report, six due lines and trusted local HTTPS. No business records or settings were written.

The 200-line UI fixture now scopes its dialog queries to the popup instead of repeatedly traversing all background edit controls; capacity and category-switch assertions are retained, without increasing test timeouts. Full-source ESLint/Feature MVC checks passed after the three-column title correction.

Final focused settings verification passed **21/21 tests in three files** after the three-column/title correction. The large combined capacity fixture was split into independent per-category boundary cases plus a small duplicate-name case, retaining all assertions and default timeouts; the earlier timeout was test-fixture overhead. The 200-line page fixture uses popup-scoped queries. No product behavior was changed to satisfy these tests.
