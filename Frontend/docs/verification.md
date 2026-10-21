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
