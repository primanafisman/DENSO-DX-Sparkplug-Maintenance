# Line progress and focused capture

**Goal:** Show current progress across configured lines, align page headings, constrain camera height and block app navigation during photo analysis.

**Architecture:** Reuse the existing per-line due API and query keys. Sum checks only when every selected line belongs to the current server occurrence. The capture workspace owns one modal; a data-router guard prevents navigation while the store is busy. Ready drafts remain resumable.

**Scope:** Frontend only; existing backend judgement, data, CV weights and schedule rules remain authoritative. Command-based verification only.

## Tasks

1. Replace the all-lines placeholder with weighted progress and adaptive line rings, showing pending lines below. Test five configured lines, line changes, failures, configuration changes and occurrence rollover.
2. Put upload/discovery/reader progress in a blocking, keyboard-accessible popup. Prevent menu links and router history while busy; allow cancellation; automatically advance on success. Test cancellation, late responses, focus/scroll cleanup and ready draft preservation.
3. Standardize heading spacing and stable scrollbar gutters; size camera and intro content to viewport height while retaining contain-fit guide geometry. Run frontend tests/lint/build, independent review, local readiness and bundle/privacy checks; update the authorized branch and handover bundle.

## Decisions

- Overall percentage is completed checks divided by all due checks, rather than averaging unequal line percentages.
- A failed/stale line hides the aggregate percentage until refreshed. Per-line states remain distinguishable.
- Blocking concerns this application's menus and history navigation, not other browser tabs or operating-system controls.
- Camera guides remain visual guidance; capture preserves the full photo and label for automatic CV discovery.

## Verification record

All three tasks complete. Regressions reproduced the previous all-line placeholder and missing popup; focused tests then passed. Full frontend check passed173/173 across38 files, lint/architecture/types and build. Independent read-only review found no release-blocking or minor issue. The restarted local service serves the exact new build, initializes OCR, preserves base check numbers1–44 and serves trusted local HTTPS. All four currently configured lines returned valid counts for the same occurrence. Final bundle/private-file checks are recorded in the release verification. No backend/CV changes or business-data writes.
