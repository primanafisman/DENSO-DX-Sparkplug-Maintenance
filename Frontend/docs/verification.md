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

Manual entry creates a photo-backed, unvalidated operator-review receipt without OCR. A reason, equipment/value verification, profile limits, ownership, expiry and evidence uniqueness remain required. If discovery fails after upload, equipment options and the uploaded photo are retained for this fallback.

Active lines are configured from1–17; initial sampler is Ldr. Settings provide line checkboxes and sampler add/remove controls. Empty lists do not enable unrestricted free-text entry. Existing records remain intact. This installation's active lists were explicitly updated to1–17 and Ldr while retaining product Types.

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
