# Technical Specification

Runtime: Node22/Express5/Zod/Sequelize6; Python3.12/FastAPI/OpenCV/Pillow/RapidOCR/ONNX CPU. Pinned packages/lockfiles accompany source; tests execute from independent reconstructed project on D.

Public interface: /api/v1, typed success/error envelopes, request IDs; cookie HttpOnly JWT + signed CSRF or Bearer for system clients. CORS allowlist, role authorization, validation and safe errors. Private engine: authenticated loopback /internal/v1. Deployment topology and data flow are in ARCHITECTURE.md; exact DTOs/enums/examples are in OpenAPI and frontend types/client.

Storage dictionary:

| Entity/table | Key and lookup columns | Domain payload |
|---|---|---|
| SPM_M_User | id, unique username, role | bcrypt hash, active; hash never in public user DTO |
| SPM_M_Instrument | id, name | code/aliases/area/type, profile, active, check IDs, revision |
| SPM_M_Calibration | id, instrument_id | immutable landmarks, resolution, template hash and bytes, profile snapshot/version |
| SPM_T_Reading | id, unique confirmation_id, unique analysis_id, unique evidence_key, instrument_id, line/date/shift/check/sample | exact decimal string, raw prediction, identity/profile/context, correction reason, actor, evidence metadata; evidence_key binds source hash + equipment |
| SPM_M_MaintenanceDefinition | id, name | versioned method/requirements/samples/limits and source notes |
| SPM_T_MaintenanceRecord | id, definition_id, line/date/shift | definition/settings snapshots, sample reading IDs, per-sample and overall OK/NG |
| SPM_M_Setting | id | allowed lines/samplers/WIB night rollover and version |
| SPM_T_Audit | id, actor_id, action | actor/action/entity/time with immutable save events |
| SPM_M_Schema | schema-version | controlled version1 marker |

All models have created_at and explicit primary-key indexes. Query selection uses named attributes/allowlisted filters/SQL-level limits; no runtime raw SQL, count(*) or sync/DDL. SQLite is verified development storage; production engine and live-server schema/dialect verification are not settled.

Processing constraints:15MiB/20MP upload; JPEG/MPO-primary/PNG/WebP; oriented originals; crop32×32minimum;1–12unique ROIs; one worker and5active jobs; TTL900s. Analog only0–1MPa black needle with3decimal interpolation, physical accuracy not independently calibrated. Digital requires explicit punctuation, complete leading digits, minus/unit consistency and preprocessing agreement. Results require confirmation; missing information does not become a fake zero.

Operational constraints: startup verifies schema and runtime, models provisioned explicitly, evidence private, logs redacted/rotated, IDs lost on restart. Start/stop ownership checks and rollback documented. Native-memory/CPU throughput depends on image size and OCR; no GPU/AI subscription is required. Future multi-instance scaling requires shared session/evidence/job ownership design.

Quality: automated Node/Python tests, architecture checks, dependency audit, real private CV workflow in process and operation reuse benchmark. Live Node-to-Python sockets, company Sonar criteria and human UAT are recorded as external gates. See verification/UAT documents for actual results and limits.
