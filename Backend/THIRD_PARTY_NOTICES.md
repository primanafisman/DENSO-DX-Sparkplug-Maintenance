# Third-party notices and model provenance

Node dependencies are pinned in package-lock.json; Python CPU dependencies in cv_engine requirements locks. Main libraries: Express MIT, Sequelize MIT, bcrypt MIT, Zod MIT, Winston MIT, FastAPI MIT, OpenCV Apache2, Pillow HPND/PIL, RapidOCR Apache2, ONNX Runtime MIT. Consult the installed package notices for the authoritative license/version text and transitive components.

The local CV source retains adaptations from the predecessor project. Private source-provenance records are not published. The project is marked UNLICENSED in package.json; publication does not grant an open-source license to the application.

The optional local camera certificate tool uses the separately pinned cryptography/cffi/pycparser dependencies in cv_engine/requirements-camera.lock.txt. These create per-computer certificates during setup; generated certificates and signing keys are not distributed in the source/model bundle. Consult their installed notices for license text.

At the user's explicit request, three existing OCR ONNX artifacts are bundled in cv_engine/models/ocr for internal transfer. Filenames, sizes and SHA-256 hashes establish identity, not provenance or redistribution rights. The original download URL/model-specific license has not been independently recovered; this remains a documented company review item. Normal runtime never downloads weights. No separate custom gauge keypoint model was found, and the legacy calibration registry has0rows. The retained classical CV source carries the previous project's improvements. Private photos, runtime credentials and databases remain excluded.
