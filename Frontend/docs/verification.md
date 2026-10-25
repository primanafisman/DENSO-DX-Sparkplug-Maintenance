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
