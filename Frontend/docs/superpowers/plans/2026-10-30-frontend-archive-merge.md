# Frontend archive integration plan

> **For agentic workers:** Use superpowers:executing-plans; implement in place in the existing requested workspace.

**Goal:** Integrate the meaningful changes supplied in Frontend.zip without reverting version3 fixes.

**Architecture:** Retain React/Feature MVC, existing backend contracts and dependencies. Sample progress is derived in a pure maintenance model and rendered in InspectionHub. Vite-only TLS configuration stays outside the browser application.

**Spec:** User-supplied Frontend.zip, inspected 30 October2026. Its new behavior is red/empty, yellow/partial and green/filled sample indicators, and a LAN HTTPS development server. Several other files match old commits and must not replace current popup/expiry logic. Archive build/dependencies are excluded.

**Approach:** Selective merge rather than wholesale replacement: keep existing API/controller, stale-response expiry and scrollable popup fixes. Draft-ready is visibly distinct from saved completion. Only matching equipment/sample definition, production line/product and active occurrence contribute draft progress. Before/after requires both readings. Existing completed server state remains authoritative and cannot be restarted as a new duplicate check.

## Tasks

- [x] Add failing model and UI regressions for empty/partial/full draft samples, numeric/visual/difference, wrong context/version/occurrence and multi-equipment pending state; existing completed/line-switch tests remain.
- [x] Implement `src/features/maintenance/model/sampleProgress.ts`, merge InspectionHub markup and archive progress colors, preserving fresh due filtering and completed actions.
- [x] Add `scripts/dev-server-config.ts` with certificate-pair discovery (archive certs path, then existing Backend runtime TLS); optional explicitly configured pair; HTTP fallback when neither exists. Test missing/partial/explicit pairs and ensure build works without certs. Set LAN host/port from archive, retain proxy/test configuration.
- [x] Run focused tests red→green, full frontend lint/types/tests/build once, command-only served-build check, and document changes. Do not publish to GitHub without a new upload request.

## Review focus

No green stale draft on another line/product or after recurrence rollover; no false saved status from unsaved samples; no half before/after counted; no multiple-equipment completion from one tool; no compulsory private TLS paths in transferred builds. No browser, copied node_modules, private config overwrite or backend/business-data edits.
