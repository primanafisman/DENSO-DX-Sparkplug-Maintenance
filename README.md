# DENSO DX Sparkplug Maintenance

Local maintenance application: **React/TypeScript Frontend**, **Node API**, and **private Python LOCAL_CV**. The sibling folders are portable; no AI API key or cloud tunnel is used.

## Start on Windows x64

1. Install Node.js **22.12 or newer within Node22**, including npm, and **Python3.12**.
2. Extract the complete application bundle, keeping `Backend/` and `Frontend/` beside each other. Run root **setup.cmd** once. Initial package installation needs internet; OCR models are included in the local transfer bundle.
3. Run root **start.cmd** and wait for `Siap`. Open **http://127.0.0.1:8100/**. The launcher prints local Wi-Fi URLs for a phone.
4. Find the local test login in **Backend/runtime/test-access.txt**. Existing credentials and records are preserved during updates. Root **stop.cmd** stops only verified application processes.

For updates, stop the server before running setup. Existing SQLite is backed up before migration; never run database initialization against existing records. The main screen is served from `Frontend/dist`; `Backend/start.cmd` also supports a backend-only installation with a smoke page at `/smoke/index.html`.

## Pages

- **Ringkasan:** monthly totals, OK/NG ratio, daily counts and check summaries.
- **Pemeriksaan:** server-time context, 44 source options, visual OK/NG or automatic photo/CV → crop/result → explicit confirmation. Equipment selection preserves the reading; registered links fill equipment/check choices when unique. Unread photos support manual numeric entry with explicit identity/value review. Each numeric sample/stage requires a new photo.
- **Riwayat:** month table only; individual checks open date-scoped X-bar/R, raw measurements/Type, statistics, full CSV and A4 landscape printing.
- **Peralatan (inside Pengaturan):** codes, names/aliases, required working/not-working condition, availability, physical profile and linked checks.
- **Pengaturan:** add/remove line names (initial1–17, up to200), add/remove samplers (initial Ldr), product Type and versioned methods/standards/sampling/cadence. Only configured choices appear in the application. Mutations require Admin.

The structure follows the supplied Feature MVC guidance. This is a local implementation, not a claim of corporate certification. SQLite is verified locally; company SQL deployment and quality-statistics conventions require receiving-team review.

See [Operator workflow and classification](Frontend/docs/operator-workflows.md) for resumable inspections, machine versus product sampling, history deletion and the isolated graph demonstration.

## Handover

Pada Pemeriksaan, pilih line untuk melihat item yang belum selesai pada jadwal server. Item yang selesai tetap terlihat hijau sampai jadwal pemeriksaan berikutnya, lalu status aktif dihitung ulang sesuai frekuensi masing-masing. Hasil sebelumnya tetap tersedia di Riwayat. Admin dapat menambah pemeriksaan, menghubungkannya ke alat, serta menonaktifkan/mengaktifkannya kembali melalui Pengaturan tanpa menghapus riwayat. Rincian frekuensi dan aturan slot dijelaskan pada panduan konfigurasi.

- [Dataset dan teaching CV lokal](Backend/docs/integration/cv-teaching.md)
- [Installation](Frontend/docs/installation.md)
- [Configuration and statistics](Frontend/docs/configuration.md)
- [Frontend input/output contract](Frontend/docs/frontend-integration.md)
- [Verification and remaining limits](Frontend/docs/verification.md)
- [OpenAPI](Backend/contracts/openapi.yaml) · [TypeScript DTOs](Backend/contracts/frontend-types.ts)
- [Local HTTPS camera setup](Backend/docs/deployment/local-camera.md)

Build the local transfer archive with `node scripts/package-application.js` after installation/build. It includes approved source, compiled UI, lockfiles, OCR models and a SHA256 manifest. The three OCR weights already tracked in the backend source are retained as requested for portability; the application bundle also includes them. Dependencies and OS runtimes are installed on the receiving computer; this is not an all-offline OS installer.

Private configuration, passwords, SQLite/business records, photographs, certificates, installed dependencies and runtime logs are excluded from Git and the bundle. Source licensing/provenance review for OCR artifacts remains listed in the existing Backend governance manifest.
