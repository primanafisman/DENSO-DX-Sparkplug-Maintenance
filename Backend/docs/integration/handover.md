# Backend handover

Source delivery: clone/download this repository, then open **Backend/**. An internal transfer bundle **sparkplug-maintenance-1.0.0-bundle.zip** can also be generated and supplied separately; release archives are excluded from Git. Node.js 22 public API, private Python 3.12 local CV, three hash-verified offline OCR models, adapter-based persistence, 44 source catalog definitions, tests and simple test UI. No Cloudflare/domain/Gemini dependency.

Current local reader is **hybrid-cv-v0.2.4**; API contract version remains1.0.0. Runtime relocation tests cover nested folders, saved runtime paths and Windows PowerShell5/7. See [verification scope](../verification/README.md). Stop the old server before replacing the bundle, then start and upload a fresh photo; temporary analysis IDs are not migrated.

## Receiving checklist

1. Clone/download the repository and open Backend, or extract a separately supplied bundle. Install Node.js 22/Python 3.12, run setup.cmd then start.cmd. Setup verifies model SHA-256 hashes; transfer bundles additionally include SOURCE-MANIFEST.json. Credentials are generated per development installation in runtime/test-access.txt.
2. GET /ready must return200 with ocr_ready=true. Use the local URL or the private IP printed by start.cmd. Follow the LAN/firewall/native-camera guide for HP.
3. Frontend consumes contracts/openapi.yaml, frontend-types.ts and frontend-client.js. Replace smoke_ui with the final UI; preserve cookie/CSRF, capture-generation invalidation and explicit identity/value confirmation.
4. Select production DB with DX. Adapters are in src/repositories with configuration in src/config/db.js; controlled schema lifecycle is outside application src. SQLite verified; dedicated SQL Server/MySQL pairing remains pending.
5. Run check.cmd and relevant photo/device UAT after changing models, profiles, physical calibration or frontend. Company Sonar/PIC/UAT/licensing acceptance is independent of source-test results.

## Stable photo workflow

Login → CSRF → GET maintenance/schedule (server WIB) → POST photos(image + JSON context) → POST photos/{id}/discovery → select each ROI/suggested_profile or registered profile → POST analysis-jobs → poll → display candidate/validated_prediction/confidence + gauge/label crops → operator verifies equipment/value → POST readings/confirm. The smoke page automatically starts recognition after capture/upload and shows request/queue stages. Numeric maintenance binds confirmed reading IDs to correct context/check/sample; visual/functional maintenance accepts OK/NG only.

All operator photos, captured measurements and private verification reports remain outside the repository. Test recognition through the public upload/discovery/job endpoints. Use reference numbers only to compare outputs afterward; never supply them to the reader as expected answers. Development equipment and records must be clearly marked TEST ONLY.

## Boundaries and limits

- src follows route/middleware/validation/controller/service/repository/model layering. Python has no business DB or cloud provider.
- Physical profile range and maintenance acceptance limits are separate. Unregistered display defaults require confirmation; reliable matched master settings take precedence.
- Analog is the black-needle0–1MPa family. Three decimals are interpolation. Digital7-segment/LCD readers preserve visible digit/point evidence; unreadable or ambiguous photos require manual review or a retake.
- One Node instance + one CV worker. Temporary IDs expire/restart;5active jobs,12ROIs/job,15MiB/20MP uploads. Future multi-instance deployment requires shared job/photo/evidence state.
- Final frontend/mobile multi-ROI ergonomics and live automatic scan belong to the receiving team. Local HTTP test capture uses the device camera; optional setup-camera.cmd supplies trusted local HTTPS for browser preview with gauge and label guides. See docs/deployment/local-camera.md; phone trust and physical device UAT are manual steps.
- Separate custom-trained gauge model was not present; the previous CV algorithms and all three OCR weights are included. The legacy calibration table contains0rows.
