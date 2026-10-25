# Complete monitor summary without scrolling

The user clarified that the complete displayed Summary data must be visible at once, including all six configured line pies and all nine monthly inspection rows. Scrolling inside a bounded panel does not satisfy this requirement. Keep the existing data, filters and actions, with no pagination or hidden rows.

Use a compact desktop grid: shared 64px header and content origin; heading and filters in one row; schedule/counts and line pies; four monthly KPIs; daily chart and complete table beside each other. Remove nested overflow limits rather than hiding scrollbars over clipped data. Small devices retain normal page flow. Errors and expanded guidance may extend the page to remain readable.

Verification uses a private, isolated command harness rendering and hydrating the actual React SummaryPage/AppShell with six-line/nine-row fixtures and current built CSS. Measure 1280×600, 1280×650, 1366×768 and 1920×1080, with and without collapsed warnings. Require every row and line visible, a rendered chart SVG, no clipping, no nested scroll area and no page overflow. Run the existing frontend checks, independent review, local served-build/readiness and transfer-bundle/privacy checks. No operational data writes or CV/backend changes are needed.
