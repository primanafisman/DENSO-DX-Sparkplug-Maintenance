# Frontend outline - Sparkplug Maintenance

Date: 20 October 2026, Asia/Jakarta. Status: **proposal for visual review; not approved for implementation**.

Latest page requirements: [page/reporting refinement v2](2026-10-20-pages-reporting-v2.md). That revision supersedes dashboard/history/equipment/settings scope below where different, including monthly analytics and six-month checksheet reporting.

## Intent and assumptions

Build a clear, responsive operator interface for the existing local Node API and Python CV reader. Make capture/upload, gauge/label review and explicit confirmation easy on phones; make reviewing records and maintaining master data practical on laptops. Retain the original local-CV workflow, 44 catalog options, server-based shift selection and manual review when recognition is uncertain.

User requirements: sibling Frontend folder; alignment with supplied Denso architecture; red visual identity; dashboard/summary, maintenance history, settings and related screens; generated visual preview before confirmation.

Assumptions for review: Indonesian operator-facing copy; light theme first; desktop sidebar and mobile bottom navigation; Viewer/Operator/Admin roles already provided by the backend. Palette and typography are proposed UI choices, not verified corporate brand specifications.

## Approach

Recommended: a responsive operations dashboard with a separate, sequential inspection wizard. It combines quick camera/upload entry with a structured list of checks, while keeping configuration and history away from the capture flow.

Alternative: one dense page containing checklist, camera, crop, results and settings. This reduces page changes on a large screen but repeats the scrolling problem previously reported on phones, so it is not recommended.

Alternative: phone-only capture screens. These simplify operator input but make record review and master settings cumbersome; retain responsive desktop layouts instead.

## Denso architecture alignment

Reference reviewed: user-supplied DNIA DX Front-End Template Guide, Volume 2, pages 1-8; Full Stack Development Guide, Volume 3, pages 2-5. The PDF specifies a fuller baseline than the minimal JSX starter source bundled in the archive. Follow the documented Feature MVC architecture rather than copying that incomplete sample.

Proposed baseline from the guide, not a claim about newest available versions:

- Node.js >=22.12 <23; React 19; TypeScript 5; Vite 8; Tailwind CSS 4.
- TanStack Query 5 for server data; Zustand 5 for small UI/capture state.
- React Hook Form + Zod for forms; Axios for credentialed API requests and signed CSRF; Sonner for feedback; Lucide icons.
- Vitest + Testing Library, ESLint, type/build checks, dependency audit and company Sonar when available.
- No Socket.IO integration until the backend supplies a matching service. Current jobs use bounded polling.

View -> feature controller/hooks -> model API/schema/type -> shared Axios/CSRF -> existing Node API. Frontend never connects directly to Python, SQL or local secret files. Existing database adapter decisions remain in Backend.

Proposed folder tree (shown for review; `src` is not scaffolded yet):

```text
Sparkplug Maintenance/
  Backend/
  Frontend/
    docs/design/
    public/
    scripts/
    src/
      app/                         # App/providers, router, route guards
      config/                      # validated public environment settings
      features/
        auth/{model,controller,view}/
        dashboard/{model,controller,view}/
        maintenance/{model,controller,view}/
        capture/{model,controller,view}/
        history/{model,controller,view}/
        equipment/{model,controller,view}/
        settings/{model,controller,view}/
      shared/
        components/layout/
        components/ui/
        lib/                       # api, csrf, queryClient, utilities
      styles/
      test/
      main.tsx
```

Models own API functions, schemas, types and feature state. Controllers own orchestration, cancellation/generation checks, mutations and query invalidation. Views render components and invoke controllers; no raw HTTP in views. Reuse backend OpenAPI/types as the source of the contract; do not create a second business-rule implementation.

## Pages and navigation

| Page | Main content and actions | API boundary |
|---|---|---|
| Login | User ID, password, readable login failures | auth/login, auth/csrf, auth/me |
| Ringkasan | Selected line/date/shift; active server check window; recent saved results; camera/upload quick entry; open check list | maintenance/schedule, settings, catalog, records, ready |
| Pemeriksaan | 44 catalog options grouped by process; tool, standard, method, interval and sample guidance; OK/NG route or photo route | maintenance/catalog; active equipment |
| Photo wizard | Capture/upload -> crop and identify -> result and confirmation -> next sample/success | photos, discovery, crop, analysis-jobs, readings/confirm, maintenance/records |
| Riwayat | Maintenance/Readings tabs; supported filters; cursor paging; read-only snapshots; photo evidence; CSV for readings | maintenance/records, readings, evidence, readings/export.csv |
| Peralatan | Name/code/aliases, line, enabled flag, profile/range/decimals, linked maintenance checks; calibration versions | instruments, instrument calibrations |
| Pengaturan | Lines/samplers/production-date rollover; reviewed standards and methods; account display/logout | maintenance/settings, definitions/:id, auth/me, auth/logout |

Desktop navigation: Ringkasan, Pemeriksaan, Riwayat, Peralatan, Pengaturan. Mobile: Ringkasan, Periksa, Riwayat, Lainnya; equipment/settings live under Lainnya. Admin-only actions are hidden or read-only for other roles; server authorization remains authoritative.

## Inspection flow

1. Resolve server schedule and choose line/sampler before capture. Refresh server time before a new photo, then freeze that context through confirmation.
2. Normal entry: select a check and its sample. Quick photo entry: capture first, suggest equipment/check from registered matches, then require an explicit selection if mappings are absent or ambiguous.
3. Visual/functional checks show standard/method guidance and large OK/NG choices per required sample. No numeric photo flow is forced onto an OK/NG check.
4. Numeric checks start CV immediately after photo selection/capture. Show real stages: uploading, locating indicator, queued, reading, ready/error. No invented progress percentage.
5. Crop screen shows a square gauge guide and a separate label guide immediately below it. Support drag, corner resize, arrow buttons, size controls and zoom +/-; large controls and one primary action. Keep oriented source-image coordinates consistent.
6. Result screen prioritizes the number and unit, gauge crop, matched name and confidence label. Label crop and short unmatched/manual-selection prompt remain visible. Long explanation and technical details are collapsed.
7. Show separate explicit identity and value confirmation controls. Do not auto-tick them. Unvalidated candidate estimates must be visually distinguished from accepted predictions. Corrected/manual numbers require a reason.
8. Confirm reading, collect every required sample, then save the maintenance record. The backend decides numeric OK/NG against the definition limits. Difference checks need distinct before/after captures.
9. Success screen offers Next sample / New inspection / View history. A new measurement requires a new photo; recropping the same file is not a new sample.

Camera guide: the entire analog dial or digital display should fit the main frame; the conspicuous test label should fit the separate frame below. Guide is an aid, not proof of perpendicular alignment. Browser preview uses supported secure-context capabilities; native capture/upload remains available when preview is unavailable. Preserve local HTTPS installation guidance.

## Visual system

| Token | Proposed value | Use |
|---|---|---|
| Primary | #E60012 | Main action, selected navigation, small brand accents |
| Primary hover | #B8000E | Hover/pressed primary action |
| Canvas | #F5F6F8 | App background |
| Surface | #FFFFFF | Main panels and forms |
| Main text | #17212F | High-contrast headings and values |
| Secondary text | #64748B | Guidance and secondary metadata |
| Border | #E2E8F0 | Table/field separators |
| OK | #166534 on pale green | Explicit OK status with icon and text |
| NG | #B91C1C on pale red | Explicit NG status with icon and text |
| Review | #92400E on pale amber | Confidence/review notice; never a fake accuracy score |

Use readable sans-serif type, 16px base copy, 48-64px result values, consistent tabular numbers, restrained 10-12px panel radii and clear borders. Target 48px touch controls, visible focus, text/icon status in addition to color, and comfortable spacing. No decorative gradients, excessive cards, oversized branding or dark first-release theme.

Dashboard uses a strong photo-entry action panel, compact context filters, a recent-results table and a simple three-step operator guide. Mobile wizard hides desktop chrome and keeps Back/Continue/Confirm in an accessible footer outside the crop/image area. Dialogs must not hide unsaved capture state.

## Data honesty and API gaps

- All mockup numbers/names/statuses are fictional demo data. No images, credentials, database or private records are inserted into mockups.
- Existing APIs have cursor pages but no global count/summary, date-range, status search or overdue endpoint. Initial production dashboard can show recent rows and explicitly scoped loaded-record counts. Complete KPI/trend summaries require a separately reviewed backend aggregation extension; never label a partial page as a complete factory total.
- Do not show overdue/compliance/completion percentages or equipment health. Equipment active means enabled; saved check OK/NG is not a permanent health status.
- Current fixed schedule slot is available but slot_id is not persisted in MaintenanceRecord. Do not promise exact slot-completion tracking without a contract extension.
- No account-management/password-reset or public audit-history endpoint currently exists. Settings supports the existing APIs only. Server audit storage is not a browsable audit screen.
- Maintenance records have no dedicated detail endpoint; use loaded immutable row snapshots. CSV is available for readings, not an assumed maintenance-record PDF/Excel export.
- Catalog includes 37 visible checklist rows plus seven charts. Preserve source gaps and review_notes; do not imply all 44 source standards have corporate approval.

## Reliability and integration rules

HttpOnly cookie authentication, Axios withCredentials and CSRF on mutations; no JWT in localStorage. VITE_API_BASE_URL is public configuration, never a place for backend secrets. Prefer same-origin deployment/proxy to the existing /api/v1 boundary. Keep corporate documentation and local runtime private.

Use server state in TanStack Query, transient capture/step state in memory, form state in RHF/Zod. Do not persist photos or confirmed results as a shadow database. Avoid storing image blobs in long-lived global query caches; revoke object URLs and release camera tracks on close/navigation.

Job polling stops on completed/failed/expired, timeout, route exit or replacement capture. Only one active capture flow per operator. Photo/ROI/profile/equipment edits invalidate the old result with a generation token. Do not retry confirmation with a newly generated ID; preserve the same ID/body on retry. Maintenance save must show an explicit failure rather than silently duplicating/replaying uncertain writes.

Keep original photo context through result and save, including server checked_at. Handle 401 login, 403 permissions/CSRF, 409 stale profile/evidence conflict, 410 expired capture, 413 upload size, 422 field errors and 429 reader capacity with understandable messages and an appropriate retry/retake action. A failed request must never erase manual form inputs unnecessarily.

No backend CV algorithm, authentication schema or database migration changes are proposed in this visual-design stage.

## Review deliverables and next step

This stage creates only this outline, preview prompts and generated visual images under Frontend/docs/design. It does not install packages, scaffold a running frontend, modify Backend, or publish new files to GitHub.

Review desktop hierarchy, red/neutral palette, menu names and the phone capture-to-confirmation flow first. After visual feedback, complete the architectural specification and implementation plan for review, then implement incrementally. Future verification includes architecture boundaries, role guards, API parsing, wizard invalidation, zero-valued readings, keyboard/touch ROI, polling/cancellation, safe retries and real-device camera UAT.
