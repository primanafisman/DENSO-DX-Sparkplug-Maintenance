# Verification and local checks

Run **check.cmd** after setup to execute API/CV tests, architecture checks and database verification. Node.js 22 and Python 3.12 are required. The three bundled OCR model hashes are checked during setup/start; recognition is local and does not use a cloud key.

The runtime relocation revision adds coverage for nested installation folders, runtime path persistence, Python launcher detection, virtualenv repair, Windows path normalization and PowerShell 5/7 behavior. The Node suite contains 97 passing cases at this revision. The unchanged CV reader remains hybrid-cv-v0.2.4; earlier complete CV tests and targeted relocation checks cover image/job lifecycle and operation-local reuse.

On 16 October 2026 the setup script was also exercised in a clean extraction, with no copied environment, dependencies, database or credentials. It installed libraries using a standard Windows Python 3.12.5 installation, generated a new local account/database, and started from a separate shell without NODE_BIN/PYTHON_BIN overrides. Local homepage, OCR readiness, login/CSRF and three photo recognition workflows passed. Repeated startup reused the healthy services and ownership-checked stop succeeded. This simulated another installation on the same physical computer; it was not a second-PC or physical-phone test.

Some optional regression tests reference operator photographs outside this repository. Those tests skip with a reason when private fixtures are absent. No operator photographs, captured measurements, local logs, database copies or private verification reports are published here. Synthetic fixtures remain in the test source.

Automated checks and source review do not replace physical-device UAT, production database pairing or company acceptance. Confirm equipment identity and numeric values before saving. Confidence is an uncalibrated heuristic, not a measured probability of accuracy.
