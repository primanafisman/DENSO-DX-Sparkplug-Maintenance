# Sparkplug Maintenance Frontend 1.1

React19 + TypeScript + Vite8, following the supplied Denso Feature MVC structure. This folder stays beside `Backend/`; all HTTP runs through `src/shared/lib/api.ts` to the same-origin Node API. Views render, controllers manage workflows, models hold DTOs/schemas/API/state. SQL and Python remain private backend concerns.

## Local use

Use root `setup.cmd`, `start.cmd`, `stop.cmd` for the integrated application. Frontend-only `setup.cmd` installs dependencies, runs checks and builds; `check.cmd` runs lint, types, tests and build. Development uses `npm run dev` after Backend starts. When developing through Vite, add its explicit origin (normally http://127.0.0.1:5173) to Backend CORS_ORIGINS and restart; integrated production-build serving needs no extra development origin.

## Navigation

Five menus: Ringkasan, Pemeriksaan, Riwayat, Peralatan, Pengaturan. Charts are lazy-loaded. Riwayat month view contains the overall table; `/riwayat/:definitionId` holds compatible-cohort SPC and paper-style printing. Photo steps are separate routes, with transient in-memory state and explicit confirmation. Reloading discards the unsaved draft.

## Developer handover

- [Installation](docs/installation.md)
- [Configuration](docs/configuration.md)
- [Input/output and variables](docs/frontend-integration.md)
- [Verification](docs/verification.md)
- [Approved design](docs/design/2026-10-20-history-spc-v3.md)
- [Implementation plan](docs/superpowers/plans/2026-10-20-frontend-maintenance.md)

Run `npm run format` for consistent source formatting. Corporate starter-kit/private guide documents were not copied into this folder. Visual mockups use fictional data; actual records come from the authenticated server API.
