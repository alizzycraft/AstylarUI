# Public range dragging: separate core failures from Material authoring

The [machine findings](material-public-range-drag-audit.json) establish a shared
core premature-release cause and two additional range interaction discrepancies.
This is failing public-API evidence, not a slider fix or visual-parity claim.

## Equivalent authored input and scope

`examples/material-showcase/audit/range-drag.mjs` uses Angular `createApplication`
and package-root `Astylar.mount`. The HTML and candidate consume the same two
range definitions and ordered style declarations. Both ranges have min 0, max
100, step 5, initial values 30 and 65, distinct IDs, 160-by-40 CSS-pixel boxes,
zero margin/padding/border and absolute placement at x=20/240, y=40.
The surface is 440 by 140 CSS pixels in a 640-by-360 viewport. The same CSS
pointer path starts inside each control and moves past its right/left edge.

There is no Material plugin, half-domain substitution, generated visual thumb,
overlapping input, private renderer import, mesh mutation or injected pointer
event. An identical public document update occurs before the first drag move
in the update scenario; the reference retains its unchanged native inputs.
Every state boundary verifies equal authored documents and host rectangles.
Settlement awaits fonts, public surface settlement and two animation frames.

The final capture covers both controls/directions, DPR 1/2, host origins (0,0)
and (64,40), update/no-update, and passive stack tracing on/off: **32 cases,
416 paired boundaries, 256 screenshots**. Chrome 152.0.7977.76 runs Angular
20.3.29, AstylarUI 0.2.0, Babylon 8.56.2 and esbuild 0.28.1. The build hashes
every bundled input and verifies the actual served HTML and JavaScript bytes.
All cases dispose their surface/application; there are no page exceptions or
console errors.

## Findings and owning boundaries

### 1. Identical update prematurely ends the range drag

All **16** update cases dispatch a public `pointerup` and lose the pressed owner
while native pointer-up/cancel counts are still zero. Further mouse movement
leaves the value stuck at 30 or 65. Reference controls continue to 100 or 0.
The untouched sibling stays unchanged. Reconciliation reports **reuse**, not a
rebuild, so replacement of visual nodes is not required to trigger this defect.

All **eight** stack-enabled update cases bind these frames to instructions in
the exact served bundle:

1. `_AstylarSemanticBridge.syncFocus` calls `node.focus`.
2. Canvas blur invokes Babylon's `_pointerBlurEvent`, which calls `_onInputChanged`.
3. `AstylarInteractionRuntime.handlePointer` dispatches the synthetic release.

This independently extends the [button-held update diagnosis](material-button-held-update-root-cause.md)
to ranges. Repository navigation: `src/lib/astylar.ts:513` queues focus on the
reuse path; `src/lib/astylar-semantic-bridge.ts:343` focuses the semantic owner;
`src/lib/astylar-interaction-runtime.ts:579` handles release. Captured bundle
frames, not assumed source-line equivalence, establish the executed path.

**Implementation priority:** preserve an active native gesture through semantic
focus synchronization and public updates in core. Re-test buttons and ranges
before changing Material drag handlers. Do not suppress legitimate consumer
updates or patch this separately in each component.

### 2. Captured release outside the owner loses its public pointer-up

All **16 no-update cases** retain native canvas capture, reach the domain endpoint,
receive native pointer-up, dispatch `change`, and clear the pressed owner—but
never dispatch public `pointerup` to that range. The browser input does receive
its captured release.

The served core's POINTERUP branch dispatches only to the current hit target,
while committing change to the separately retained pressed owner. At the final
point the current hit is empty. This explains the missing owner event without
assuming the mouse release itself was lost.

**Implementation priority:** make generic captured-pointer release routing
consistent with its pressed owner. Preserve cancellation, disabled/disposed
owner handling and click eligibility as separate rules. Add release-inside,
release-outside, over-another-owner and cancel regressions.

### 3. Intermediate value mapping differs despite identical step/domain

Without updates, both controls move in the correct direction, the sibling stays
fixed and both endpoints are reachable. At **two forward** and **three reverse**
intermediate samples, candidate values differ from the reference by one step.
All candidate values match the executed `localX / width` mapping over the full
160px box, followed by step rounding. Public event-local X exactly matches the
authored CSS coordinates, including translated hosts and both DPRs.

The responsible core entry is
`src/app/services/dom/input/input-element.service.ts:549`; range normalization
and visual placement are in `range.manager.ts`. The
[subsequent native-raster travel review](material-public-range-travel-audit.md)
measures 8px/152px endpoint centers and predicts all 256 native move samples
using the resulting 144px travel span; the full-width model fails 80 of them.
This establishes the metric for the captured geometry, not all native sizes or
themes. Do not guess a compensating offset or weaken value comparison.
The unchanged results across the two tested
origins/DPRs do not establish global coordinate correctness.

## Verification and retained failures

```powershell
node scripts/audit-public-range-drag.mjs --output=artifacts/material-parity/public-range-drag-audit-v2
node --test tests/material-parity/public-range-drag-evidence.spec.mjs
node scripts/record-public-range-drag-audit.mjs
node scripts/record-public-range-drag-audit.mjs --check
```

Use a **new output directory** for a fresh capture; the producer refuses to
overwrite evidence. The retained v2 browser run exits **1** with 32 valid but
failing cases and **488 failed interaction assertions**, zero evidence errors
and zero runtime errors. The evidence verifier passes **3/3**, exit **0**, no
skips/cancellations/todos, **1,811.2238 ms**. It verifies sources, served assets,
all screenshots, exact traces and causal frames, with **15** rejection controls.
The separate earlier 16-case stack-disabled run reproduces the same value and
release observations. Generation and no-write machine-record replay exit 0.

SHA-256 evidence:

- v2 `latest-report.json`: `8c298293efb0e464af4a3ba73bf80055fcbab469c196e666e22b02f17ad85962`.
- v1 `latest-report.json`: `a6eb8e4743ab7666f70e054242d8ff5d446a322dacf08cfe393adc5a8c07fc25`.
- `field-host-flow-input-audit/public-range-drag-proof.log`: `6cbbf32e96755d7b2e35e9a12f4293e1f8e33f557adffdf8d3301aa006a35b73`.

## Limits and remaining Material work

This proof does **not** establish the cause of swapped overlapping Material
thumbs. The existing half-domain, step, hit-region and sibling pointer-state
differences remain separate [authoring/state findings](material-slider-peer-pointer-survey.md).
Native reference screenshots show tracks/thumbs; the candidate screenshots show
blank control boxes. They are retained, not corrected or treated as matching
paint. Pointer actions use shared authored CSS points, not measured candidate
thumb centers. No native-like range paint or visual equivalence is claimed.

Continuous controlled-value updates, overlapping peer constraints, pointer
cancellation, vertical/RTL ranges, transformed/scrolled ancestors and the exact
native travel metric remain follow-up cases. The public reproduction is isolated
from the canonical Material fixtures. No renderer or plugin was changed, and
the current complete audit harness and enforced parity matrix remain required.
