# Snackbar placement acceptance has limited sensitivity

Classification: **harness/instrumentation limitation**. This is not the cause
of the user's missing snackbar, nor proof that the complete harness would
accept these deliberately incorrect geometries.

The actual `compareOverlayPlacement` function in
`tests/material-parity/run-material-parity.mjs` is extracted through its AST
and executed unchanged by `scripts/check-material-snackbar-placement-sensitivity.mjs`.
Its function SHA-256 is
`683fe024b55b043d929f0bab518ef420c69214a29739aa48eac47548c35e81f0`.
Only page geometry and successful semantics are mocked; no browser, renderer,
canonical fixture, capture, threshold or runner is changed.

For a 344 x 48 reference surface at (548, 944) in a 1440 x 1000 canvas:

| Candidate geometry change | Placement result |
| --- | --- |
| None | Accepted |
| Shift right 100 CSS px | Accepted |
| Halve width to 172 CSS px | Accepted |
| Increase height by 20 CSS px while preserving bottom edge | Accepted |
| Change bottom gap by 10 CSS px | Rejected |
| Extend outside canvas | Rejected |

Command: `node scripts/check-material-snackbar-placement-sensitivity.mjs`.
All six assertions passed, exit 0. It emits the complete machine-readable
results and source receipt. These assertions document current sensitivity;
they do not prescribe retaining the missing checks after a future correction.

The comparator checks canvas containment, bottom-gap agreement and semantics.
It does not enforce horizontal placement, width or height. A green
`overlayPlacement.matches` therefore cannot prove complete snackbar geometry,
and measured boxes cannot alone prove visible paint, unclipped content or
reachability. Screenshot and other full-harness checks might reject these
mutations; they were not executed by this focused proof.

## Implementation handoff

Before treating this placement result as complete geometry evidence, enforce
the reference-relative horizontal anchor and dimensions in the owning harness
check, with negative controls for each axis and size. Preserve bottom-gap,
containment and semantic checks. Use real browser/raster evidence separately
for clipping, visibility and occlusion. Do not change candidate geometry to
satisfy this checker, and do not infer a shared tooltip/snackbar renderer cause
from this limitation.
