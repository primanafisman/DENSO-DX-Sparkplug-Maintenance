# Local CV scale-direction recovery —24 October2026

IMG_0493 previously produced a correct0.417MPa needle candidate but no validated prediction because full-dial OCR supplied zero usable numeric scale-order anchors. Geometry and independent needle masks already agreed. Cropped OCR at printed scale positions recovers the decimal-less02 and08 strings; the fixed0–1MPa-family direction validator can then verify numeric order.

The bounded fallback runs only for an otherwise clean, direction-unconfirmed analog candidate with strong radial needle support, agreement across contrast masks, a supported pivot and exactly6 scale positions. It reads at most6 local scale crops and stops once independent labels confirm order (2 for0493). Only exact high-confidence02/04/06/08 tokens may regain a decimal for scale-order validation. Bare2/8, arbitrary numbers, duplicate/single anchors, low scores and ambiguous needles cannot validate a result. Needle interpolation itself is unchanged. A saved conflicting calibration is not overridden.

Verification: full CV suite222 passed; normal/mirrored/uncertain/nonfamily/competing-needle cases covered. Full private-API upload→discovery→job→poll for0493 returned0.417MPa, valid, medium confidence,2 numeric anchors, algorithm hybrid-cv-v0.2.5. The target run used the image content, with no filename/value special cases.

On35 previously benchmarked photos with cached discovery ROI proposals, all raw outcomes were unchanged, no previously valid reading was lost, IMG_0419 additionally validated, and all5 digital values remained exact. The accepted count moved27→28;7 still need review. These outcomes show regression preservation and targeted recovery, not a field accuracy probability or±0.001MPa precision claim. Shared-machine runtime was variable; no latency guarantee is claimed. Only a small subset missing direction anchors uses the additional OCR work.

Reproduction images, hashes, crops, runtime JSON and local benchmark scripts remain private under Backend/runtime/cv-0493 and are excluded from Git/transfer packages. Restart the owned local services using root start.cmd to load the new algorithm; readiness must confirm local OCR initialization.

The restarted public Node API also passed upload→discovery→analysis-job→poll for IMG_0493 at valid0.417MPa, medium confidence. Worker health confirmed hybrid-cv-v0.2.5. This test saved no maintenance reading or record.
