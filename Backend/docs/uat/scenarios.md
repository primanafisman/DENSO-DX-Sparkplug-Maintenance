# UAT scenarios and status

P=passed automated local test, F=failed, B=blocked external verification, NT=not tested. Automated P is not a human/company sign-off.

| Scenario | Status | Evidence/limit |
|---|---|---|
| Auth cookie/Bearer, strict input, CSRF and Viewer write restriction | P | Node security suite |
| Upload/discovery/job/TTL and bounded queue | P | Node transport-double tests + Python in-process real recognition; abandoned polling and concurrent admissions covered |
| Confirmed identity/context/correction/idempotent retry/evidence | P | Node confirmation suite, concurrent uniqueness and photo-recrop replay rejection |
|44catalog, required samples, OK/NG, inclusive limits, WIB date | P | Maintenance suite; missing source rows not invented |
| Digital punctuation/leading digits/minus/blank rejection | P | Retained Python recognition suite |
| Analog black-needle scale/calibration/perspective regressions | P | Retained synthetic Python tests; physical calibration still unverified |
| Phone screenshot LCD2.248/2.242 | P | Explicit external screenshot fixtures; not full device camera UAT |
| Stale result after ROI/profile/photo/equipment changes | P | Capture-generation regression; preview/confirmation use immutable analysis snapshot |
| OpenAPI business-response schemas | P | AJV validation of real SQLite-backed HTTP DTOs |
| Live Node-to-Python sockets, login/CSRF, photo confirm and original evidence hash | P | Real public HTTP through LAN IP;0.410MPa/0.438MPa/15.96mm and visual OK saved as TEST ONLY development data |
| Windows launcher, reuse and owned child interpreter stop/restart | P | Actual start.cmd/restart plus process-tree/readiness regression; unrelated old PanelReader retained |
| LAN access from physical HP/firewall | B | Host-side LAN HTTP verified; Wi-Fi is Public with Node block rules, administrator firewall setup/operator device test required |
| Transfer to a second physical computer | NT | Model hashes/default relocation, source bundle and installer syntax checked; actual second-PC installation not performed |
| Final mobile camera/crop/ergonomics on operator HP | NT | Smoke camera guide provided; final frontend team/device validation required |
| Live SQLServer/MySQL pairing | B | Dedicated approved test server not supplied |
| Company Sonar gate / security acceptance | B | Approved scanner server/token not supplied |
| OCR artifact provenance / redistribution license | B | Local hashes available; original provenance/license approval pending |
| Corporate DX/UAT/PIC sign-off | NT | Await actual responsible people; no invented signature |

Human tester, PIC/NPK, date, comments and approval signature: **pending**. Re-run relevant cases after changing model artifacts, physical gauge calibration, equipment limits or final frontend.

Reader0.2.4 automated revision: **P** for upright LED0.405, three new LCD2.248 screenshot crops and their automatic JPEG recrops, missing/extra decimal rejection, classifier-state restoration, compound control-label exclusion and exact process time matching across PowerShell5/7. Complete suites79Node/214Python pass. Physical phone camera capture after this revision remains **NT**; screenshot regressions do not replace that check.

Crop/camera revision: automated mapping/capture/label tests do not replace physical touch, ImageCapture/focus capability or operator camera UAT. Private photo reports are not published; see [verification scope](../verification/README.md).

2026-10-15 additions: server-clock schedule boundaries/midnight/month/year rollover **P** (15 tests); automatic upload/discovery/job/stale-result flow **P** (4 tests); dual HTTP/HTTPS listeners, certificate SAN/trust/renewal and shutdown rollback **P** (5 tests); physical phone CA installation and live guide alignment **NT**. Public backend verification reads IMG_0418=0.410MPa, 085054=2.248mm and 085505=15.96mm without saving automatically. No label crop was proposed on these three specific originals; label-ROI forwarding is covered by the flow regression and remains a device/master-label acceptance case.
