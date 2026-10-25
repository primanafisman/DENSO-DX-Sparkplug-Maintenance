# Compact monitoring and configurable shift sessions

**Goal:** Keep the complete normal Ringkasan dashboard in a desktop viewport, localize month names, align line/sampler controls and configure operational shift times under collapsed details. Removed equipment disappears from the current table; confirmations use modal notifications.

**Design:** Reuse current content and responsive styling. On desktop monitoring, place heading/filters together, then current progress (including a pending-line count beside completed/pending checks), line pies, monthly KPIs and two bounded report panels. Lists may scroll inside their panel while the page remains fixed. Tablets/phones retain normal readable flow. Replace native locale-dependent month inputs with Indonesian month options.

Settings keeps Line aktif and Sampler aktif headings, counts and add controls aligned. The old rollover-hour field is hidden from the operator flow; Detail jadwal shift holds two time inputs for each shift. The optional API field is shift_schedule:{day:[HH:mm,HH:mm],night:[HH:mm,HH:mm]}. Existing logical slot IDs remain stable when their times change. All operational due calculations follow configured times, and saved records/photos freeze their schedule context. Legacy configurations remain compatible.

**Tasks:**

1. Add failing dashboard/settings/modal regressions; implement compact desktop layout, Indonesian months and pending-line count.
2. Implement fixed-four custom server schedule, strict cyclic validation, all maintenance recurrence boundaries and immutable photo/record scheduling. Regenerate integration contracts. Preserve old callers without the new optional field.
3. Align line/sampler add controls/counts, collapse editable shift times, remove archived equipment/checks from current lists and replace inline confirmation prompts with accessible blocking popups. Confirm save/remove actions before writes; preserve historical data.
4. Run command-only frontend/backend checks, independent review, local readiness, bundle/privacy verification and update the authorized Git branch.

**Decisions:** No hard-delete of historical records. Configured times are WIB. Changing a schedule during an existing photo draft may require a new photo if its occurrence changed; no old evidence is reassigned. Exactly two sessions per shift match the existing four-session requirement. The desktop fit target starts at1101px width and600px height; smaller screens keep responsive scrolling rather than clipping controls. Short desktop screens use the same compact header spacing across all menus.

**Verification:** Implementation complete. All183 frontend tests in41 files passed, with ESLint/Feature MVC/types and production build; all233 backend tests passed, with architecture checks. Independent review found older-month selection restricted to six choices and keyboard focus omitting error summaries. Both were reproduced by failing tests and fixed in one pass: custom Indonesian month/year picker and complete focusable-control cycle. Their focused29-test rerun and final full183-test suite passed. Review found no backend blocker. CSS was checked statically; physical-device geometry is not claimed by command tests. Live readiness, exact served build, current six-line due/schedule agreement, active-registry filtering and trusted HTTPS passed without business-data writes. Bundle/privacy verification is part of the release command record.
