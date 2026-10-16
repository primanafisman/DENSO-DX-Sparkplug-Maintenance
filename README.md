# DENSO DX Sparkplug Maintenance

The **Backend/** directory contains the local maintenance API, Python computer-vision engine, three offline OCR models and a minimal integration test page. The final frontend can be developed separately against its OpenAPI contract.

## Run locally on Windows x64

1. Install Node.js 22 (at least 22.12, including npm) and Python 3.12.
2. Open **Backend/** and run **setup.cmd** once. Initial library installation requires internet.
3. Run **start.cmd**, wait for **Siap**, then open **http://127.0.0.1:8100/** in a browser on that computer.
4. Find the generated development login in **Backend/runtime/test-access.txt**. Stop with **Backend/stop.cmd**.

No Gemini key, Codex installation, tunnel or developer computer is required. Setup creates local configuration, database, dependencies and credentials; these are excluded from Git. Optional HTTPS camera setup for phones is documented separately.

- [Quick start](Backend/docs/deployment/quickstart-local.md)
- [Installation and configuration](Backend/docs/deployment/installation.md)
- [Frontend integration](Backend/docs/integration/frontend.md)
- [OpenAPI contract](Backend/contracts/openapi.yaml)
- [Verification scope](Backend/docs/verification/README.md)

Business records, credentials, camera photographs, TLS private keys, dependency trees and local build/output files are not published. Database adapters are supplied for integration; verify the selected production database and deployment environment with the receiving team.
