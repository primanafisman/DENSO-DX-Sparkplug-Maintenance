# Dimensional console implementation plan

> Execute inline in this chat with bounded independent tasks and a final read-only review.

**Goal:** Apply the supplied visual direction and fix tool-scoped inspection completion without losing evidence integrity.
**Architecture:** Existing Feature MVC; root owns shared visual presentation/history consumption, one worker owns clock/localization, one owns evidence/due, one owns trusted local X/R import.
**Spec:** `Frontend/docs/design/2026-10-25-dimensional-console.md`.

## Constraints

- Keep local Node API/Python CV, no new hosted service or heavy visual dependency.
- Use the supplied logo unchanged; server time controls shift, local ticks only display seconds.
- Preserve one history row per inspection, three cell modes, explicit reviewed results, privacy exclusions and operator progress.
- Imported X/R values are labelled test data, have no fabricated photo evidence and cannot satisfy live due checks.
- Test by commands; preserve all existing measurements and configuration.

## Tasks

- [x] Trace permanent evidence uniqueness and definition-only completion. Write failing temporary-DB regressions for two tools, later shift, orphan retry and product/difference guards. Implement scoped reconciliation and additive DueItem.equipment; verify backend suite.
- [x] Test server clock and localized errors, implement monotonic server anchor/periodic sync and shared error mapping. Verify focused tests/types.
- [x] Add dimensional light theme, exact supplied logo, actual-data progress/icons and responsive touch/reduced-motion styles. Test new progress behaviour; run frontend lint/types/tests/build.
- [x] Add trusted development-only X/R import with separate provenance/cohorts, no fake evidence, dry-run/apply/rollback. Test normal reporting, idempotency, exclusion from due, malformed input and no collateral changes. Review the script before applying locally.
- [x] Remove frontend example-mode actions/branches; use normal reports and compact provenance badges. Integrate per-tool pending selection with fresh server due data; test no reread on identity changes.
- [x] Generate contracts after schema writers freeze; independently review boundary changes. Run complete command checks, live local API smoke, privacy scan, package integrity, and push verified source to the current branch.
