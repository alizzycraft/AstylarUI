# Slider sibling pointer suppression: source-bound observation

This is a newly isolated state-input discrepancy, not a demonstrated cause of
the swapped or jerky thumb movement and not a renderer fix.

The [machine survey](material-slider-peer-pointer-survey.json) reopens the
original report and both hash-checked trees for every one of its 78 slider cases
(156 native input owners). Its eight held-pointer cases, covering all four
profiles at DPR 1 and 2, have these distinct inputs:

- The reference start input has the generated
  `mat-mdc-slider-input-no-pointer-events` class, an active matching rule
  requesting `pointer-events: none`, and computed `none`.
- The reference end input remains `auto`.
- Candidate matching declarations and all three local diagnostic stages omit
  `pointerEvents` on both inputs. This omission does not prove a candidate
  computed value or actual hit-test behavior.

Both reference inputs are `auto` in the other 70 captured cases. Therefore an
unconditional `auto`/omission rule would erase a meaningful state boundary.

## Source interpretation

The installed Material slider source adds this class to the sibling in
`MatSliderRangeThumb._onPointerDown` and removes it in a deferred callback from
`_onPointerUp`, alongside updates to the sibling's hit-region width. Exact file
hashes and source lines are retained in the machine survey. This explains the
class seen in the original captures; it is not fresh browser proof of release
timing or proof that the original served bundle is byte-identical to the
installed unbundled module.

The existing Astylar translation uses independent fixed-half range inputs.
Their reachable domains, step values, peer-dependent geometry and omitted box
requests remain separately documented defects. No one of these findings alone
establishes why a particular pointer drag moves the wrong thumb.

## Verification and next investigation

`node --test tests/material-parity/slider-peer-pointer-survey.spec.mjs` passes
2/2, zero skips/cancellations, in 3.333 seconds. One test joins every recorded
owner to the original scalar and state input. The other independently reruns
`node scripts/audit-material-slider-peer-pointer.mjs --check`, reopens all
paired trees and verifies the complete report without rewriting it.

Next, trace equivalent start-active and end-active sequences through sibling
suppression, pointer capture and release/cancel. Isolate core CSS-space target
selection from peer constraints and generated hit-region widths. The current
held benchmark concerns the end thumb; it is not bidirectional drag coverage.
Keep legitimate Material state orchestration in the plugin and generic pointer
targeting/capture in core. Do not add a fixture-specific pointer-events patch
and call the slider fixed.

This standalone survey is not yet a canonical attribution or part of the
running 39-file harness. Its observations leave the canonical unresolved count
unchanged. No fixture, reference, renderer or interaction implementation changed.
