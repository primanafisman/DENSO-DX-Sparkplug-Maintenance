# Operator layout and report content

This update implements the operator's requested compact desktop/tablet presentation within the existing Feature MVC structure. `src/styles/operator.css` supplies shared typography, contrast, spacing, responsive controls and workflow actions over the existing base styles. Views retain domain logic in their controllers/models.

- The top bar uses one unchanged official DENSO raster asset, stored locally. Source and ownership are recorded in `src/assets/brand-source.json`; no internet request is needed at runtime.
- Navigation uses labelled icons; each content page has one heading. Settings sections share right-aligned Add actions. Technical fields and optional graph controls are collapsed.
- Inspection starts with compact line/sampler/Type context and visible camera/upload actions. Concise completed/pending counts replace scheduling paragraphs. Progress continues through the shared in-memory capture workspace.
- History has one display row per inspection ID/number, sorted by stable inspection number. All paginated source occurrences are loaded consistently before aggregation. Stored records and SPC cohorts remain distinct.
- Cell modes are All Data, OK/NG, and complete sample X/R. Single readings never create an R value. MPa photo checks use daily status reporting, including legacy definitions without a target classification.
- Equipment uses names, optional alias/area, required operating condition and editable acceptance bounds. Internal codes remain compatible with existing integrations but are not shown as an extra equipment identity.
- Mandatory standards/method acknowledgement, manual photo-backed review, server schedule, evidence checks and deletion confirmation remain operational controls.

Verification uses command-driven DOM, model, API, schema and package checks. Responsive CSS is not a claim of physical tablet or monitor pixel-fit acceptance.
