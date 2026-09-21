# Material audit: evidence-led implementation priorities

This is an audit handoff, not authorization to implement fixes and not a claim
of completed input or output parity. It supplements the detailed
[62-item implementation inventory](material-input-equivalence-audit.md#root-cause-implementation-order).
It does not replace that inventory or drop its lower-priority findings.

The newer public reductions distinguish several independently demonstrated core
defects from Material authoring differences. Those distinctions change the order
of work: do not restore a composition and then tune it around known broken core
contracts, or treat a passing evidence verifier as corrected rendering.

## 1. Preserve real gestures across public updates

**Confirmed in public reductions.** An identical update on the reuse path, or an
unrelated sibling change on the rebuild path, can transfer native focus from the
canvas to its semantic counterpart. Babylon's blur handling then generates a
release while the user still holds the pointer. The core dispatches pointer-up
and, for buttons, premature activation. This is not merely missing active paint.

Owners: core reconciliation, semantic focus synchronization and device-input
integration. The [button causal proof](material-button-held-update-root-cause.md)
pins both paths and actually served instructions; the
[range reduction](material-public-range-drag-audit.md) independently records the
same release path. Preserve keyboard/assistive focus and genuine blur/cancel
semantics. Disabling semantic synchronization, suppressing public updates, or
moving gesture lifetime into the Material plugin is not a correction.

Acceptance for the future fix: replay both existing public matrices, then cover
real cancellation, owner removal/disable/replacement, dragging outside, repeated
updates and multiple surfaces. Verify native events, public events, pressed
identity and held paint at each boundary. Revisit the earlier pointer-focus
finding (inventory item 17) with this evidence; simply removing its transaction
guard could reproduce the proven premature release.

## 2. Route release to the captured owner

**Separately confirmed.** In all 16 no-update public range cases, the gesture
retains capture and native release/change, but release outside the hit target
loses the original owner's public pointer-up. The core runtime dispatches based
on the current hit rather than preserving captured-owner routing.

Owner: core interaction dispatch/capture. Preserve the distinction between
pointer-up delivery, click eligibility and cancellation; do not synthesize a
click whenever a captured gesture ends. Add release over another owner, outside
the surface, cancel/lost-capture and removal cases. Passing update preservation
does not close this independent defect.

## 3. Correct range paint ownership and ordering

**Confirmed for active track/thumb occlusion in the public reduction.** Generic
input material application replaces the range manager's interaction-only
material with an opaque, depth-writing white background. Active track and thumb
depths put them behind that owner and the root for the actual positive-Z camera.
The [passive scene and raster proof](material-public-range-paint-audit.md) retains
all-white candidate crops despite live presentation meshes, without mutating the
public application. Exact coplanar unfilled-track GPU behavior remains unproved.

Owners: core control/material composition and final paint-depth projection.
Define which layer owns the authored background, hit testing and presentation;
make general paint ordering consistent. Do not introduce a Material-only
transparent background, CSS displacement, private depth adjustment or a second
plugin convention. A range-manager-only guard is insufficient if subsequent
generic material application overrides it.

Acceptance: actual visible rasters with opaque ancestors, authored transparent
and opaque backgrounds, opacity zero, stacking, updates, DPR and host movement.
Mesh existence alone is not visibility. This proof does not establish the cause
of the Material black ring or swapped handles, or native range paint parity.

## 4. Share CSS-space range travel geometry

**Confirmed for the captured pointer paths and native appearance.** Independent
native endpoint rasters establish 144px thumb-center travel inside a 160px
control. The core pointer conversion instead divides by the entire 160px width.
The measured model predicts all 256 native moves; all 128 no-update candidate
moves follow the full-width model. Public event-local coordinates already match
the shared CSS coordinates. See the [travel proof](material-public-range-travel-audit.md).

Owners: core range used geometry, pointer mapping and presentation. Derive one
CSS-space travel contract and project only at paint time. Do not hard-code the
observed 8px inset, change step/domain values, or patch world-space coordinates.
Before selecting general metrics, extend width/height, native/custom appearance,
grab position, RTL/vertical, transforms and scroll coverage. This diagnosis is
not universal native thumb sizing or an explanation of overlapping-thumb choice.

## 5. Apply vertical alignment in its CSS formatting context

**Confirmed in the public reduction.** Core `positionTextMesh` interprets
`verticalAlign` as inner-box placement even for block/flex-item/absolute owners,
and approximates baseline as bottom. Explicit baseline and omission disagree
before Babylon projection. The [64-pair proof](material-public-vertical-align-audit.md)
retains 36 failing baseline-relative comparisons and a recording-projection
evaluation of the installed and source methods.

Owners: core formatting-context/line-box layout and text placement. Do not
replace the default with global centering or add text/world-space offsets.
Extend inline siblings, table cells, wrapping and updates. Separately reproduce
the original checkbox/radio/switch label compositions: this core defect is not
yet proved to cause those Material symptoms. In the non-inline reductions,
omission is already vertically correct and adding middle makes it worse.

## 6. Continue the other shared core tracks, not component calibration

The [public cursor reduction](material-public-cursor-defaults-audit.md) adds a
confirmed interaction-boundary defect: explicit resolved default becomes text
when owner-box selection prefers an owned text mesh. Preserve explicit cursor
intent in core pointer resolution. Separately review the documented legacy
button/label pointer defaults against the measured browser baseline. Neither
finding justifies unconditional pointer styles or per-fixture cursor patches.
Recheck actual owner/state targets; one passing family hover probe is insufficient.

Keep the detailed inventory's transform reference-box/units/origin/order,
transformed fixed containing blocks, intrinsic inline sizing, anonymous flex
text, positioned margins/heights, grid-none parsing, computed-font length
resolution, fallback fonts, line boxes and border color/alpha work. Use their
existing minimal proofs and extend composition coverage at the owning boundary.

The calendar span primitive passes; that evidence does not justify calling all
column spans unsupported. Restore and test the actual conditional table/week/
label composition rather than replacing it with manually calculated grid cells.

Input-stage observability is a prerequisite for attribution, not a license to
write a parallel CSS cascade in the harness. Preserve authored requests, local
normal/effective styles, computed/inherited values, used layout and retained
paint as separate evidence stages. The prepared
[72-group alignment/font adapter](material-alignment-font-source-adapter.md) and
[49-group text-alignment proposal](material-text-align-canonical-plan.md) are
classification work, not proof of equal computed values or repaired consumers.

## 7. Restore equivalent Material authoring alongside the owning fixes

Use the historical/input findings to restore the reference contract, not a new
visually calibrated representation. Each restoration needs paired input proof
and a renderer regression test if it exposes a core failure. Specifically:

- Range: restore 0–100/step 5, peer-dependent bounds and hit regions, and remove
  fixed halves and reliance on direct-mesh update bypass. Test both thumbs across
  the midpoint, including start=60/end=80 and start=20/end=40, plus keyboard and
  disabled/hover/held state. Native peer suppression is a separate authoring
  finding; do not assume that it alone diagnoses historical swapped handles.
- Text: restore component tokens, actual child/line-box structure and equivalent
  alignment requests. Remove label-middle and font/spacing substitutions only
  with a proof of the original composition, not a blanket reset.
- Calendar: retain original table/colspan, conditional month-label structure,
  text tokens, vectors, hidden descriptions and focus-reveal close control.
- Options, dialogs, sheets and snackbars: restore original message/action/list/
  label ownership and theme scope before attributing size or baseline symptoms
  to core. Do not copy sampled RGB values or use fixed sizes to simulate tokens.
- Plugin text: remove the competing tab-panel texture/baseline implementation
  in favor of core text ownership. Legitimate Material visuals and state
  orchestration remain plugin work, with CSS geometry and core resource lifetime.

The [slider history](material-slider-input-history.md) records what changed;
historical source facts alone are not browser bisect results or author intent.

## 8. Establish overlay position and lifecycle from authoritative CSS boxes

The connected-overlay path that projects mesh geometry and feeds it back into
authored CSS top is a confirmed ownership violation. Use an existing suitable
public CSS-layout query, or justify an API gap, instead of reusing rendered
output as layout input. Do not repair it with offsets, scale division, a flow
anchor, or plugin-specific world conventions.

**The proposed shared tooltip/snackbar low-position cause is still a hypothesis.**
For each popup, establish equivalent content, state and ancestry first; record
the core CSS box, containing block, scroll/collision decisions, projection,
clipping, paint order and viewport reachability. Distinguish an absent owner from
an off-screen, clipped or occluded owner. Tooltip missing center/wrap/structure
and forced-open benchmark states remain distinct from placement and blur.

Verify first-open/reopen, update, scroll, resize, DPR, real hover/focus/dismissal,
and surface-local modality. Preserve the different datepicker/timepicker focus
contracts. A passing isolated bottom-overlay primitive does not prove the
unequally authored Material bottom sheet, and changing its fixture size is not
a general rendering fix. Keep resource/lifecycle checks separate from rasters.

## 9. Preserve asymmetric borders in natural flow before removing sort paint substitution

The [complete sort structure review](material-sort-focus-structure.md) verifies
60 original cases. In eight focus cases, the reference paints an in-flow bottom
border while the candidate paints a separate absolute child under a fixed-height
relative host. State agreement does not justify that structural translation.
Commit `994da86b` introduced the host position and paint child together, but its
motivation has not been demonstrated.

The [equal-input public reduction](material-sort-focus-border-public-proof.md)
now reproduces a related core failure at two widths in two independent browser
runs: adding a 1px bottom border leaves the candidate flex owner and ancestor
1px too short, leaves the following sibling 1px too high, and shifts the content
up 0.5px. Initial and restored zero-border geometry matches. Normal/effective
style inspection retains the border request; the exact internal causal path
after that stage remains to be traced. Both browser runs fail unchanged
expectations, rather than accepting the current incorrect output.

Owner: core asymmetric border contribution, intrinsic/automatic flex sizing and
cross-axis positioning. The follow-up extracted-method proof demonstrates that
`calculateIntrinsicContainerHeight` in both repository and installed sources
doubles the first border-width scalar, losing bottom-only width and doubling
top-only width. This matches the public failure but is not yet its full runtime
call trace. Trace the reproduction through the actual installed path and
investigate cross-axis displacement separately. Also clarify the public catalog's
precise border-width value subset.

Future acceptance: preserve the public reduction, add text and real focus-state
coverage, verify border raster separately, then restore the Material border
authoring and remove the extra paint child plus its dependent host geometry as
one reviewed change. Do not correct sibling placement with another offset.
Proof commits: `1592ce3` (source structure) and `5c56000` (public reduction).
The six evidence/inventory checks for the reduction pass; the two browser tests
still fail in each run. No canonical attribution or full output parity claim is
made by this handoff addition.

Handoff addition verification:
`node --test tests/material-parity/sort-focus-structure.spec.mjs tests/material-parity/sort-focus-border-public-proof.spec.mjs`
passed **4/4**, exit 0, 1,694.4133ms, with no skips or cancellations. This
replays source and retained failing browser evidence, not new renderer fixes.

## Integration and completion gates

No implementation has been performed by this handoff. The main audit still has
unresolved classifications and pending canonical integration; proposed group
reductions must not be reported as accepted current counts. Do not roll back
unrelated work or alter a running verification job's inputs.

For each future fix: preserve the failing equivalent-input reproduction, test
the general correction at its owner, restore associated compensations with
explicit input review, verify the actual served package, then commit the bounded
result. Verify nearby compositions rather than closing every similar symptom
from a single primitive pass.

Audit completion still requires the full discovered audit harness and complete
unfiltered enforced parity matrix. Current package scripts define
`npm run parity:release:check` as general, TTS and Material enforced gates in
sequence. If an earlier gate prevents a later gate from executing, run and
record the missing constituent separately; do not count it as executed. Retain
honest output failures without loosening thresholds or implementing fixes under
audit scope. Input classifications, evidence-verifier passes and output-parity
results must remain separately reported.

## Handoff verification

The existing evidence suites were replayed unchanged; no extra documentary
validator or duplicate machine dataset was added:

```text
node --test --test-concurrency=1 tests/material-parity/button-held-update-evidence.spec.mjs tests/material-parity/public-range-drag-evidence.spec.mjs tests/material-parity/public-range-travel.spec.mjs tests/material-parity/public-range-paint.spec.mjs tests/material-parity/public-vertical-align-evidence.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Result: **24/24**, exit **0**, no failures, skips, cancellations or TODOs, in
**29,845.5369ms**. Log:
`artifacts/material-parity/field-host-flow-input-audit/root-cause-handoff-verification.log`.
These are evidence-replay and negative-control passes; the underlying public
rendering/interaction failures remain retained and unfixed. This is not a fresh
browser capture, the complete audit harness, or enforced output-parity acceptance.

## Audit integration follow-up after canonical regeneration

The canonical report at `6833850` retains **1,689 unresolved scalar groups**.
A complete authenticated streamed read confirms these are distributed across
many properties, including color (105 groups), background color (78), line
height (64), transform origin (59), position (58), box sizing (55), appearance
(54) and letter spacing (54). These are review signatures, not counts of core
bugs. The remaining groups and every original observation stay in the canonical
payload; this summary is not a replacement for their classification.

The separate **60 unresolved control-texture records** are all disabled-button
color. The [classifier diagnosis and prepared replay](material-disabled-button-ink.md)
identify an integer-only RGB guard rejecting the precise normalizer's fractional
channels. An in-memory one-regex correction passes the complete classifier for
all 60 authenticated original owners while preserving exact color values and
ten negative controls. This is an audit classifier defect, separate from the
underlying already-reviewed unequal foreground authoring. Integration must:

1. Wait for the active full legacy run to finish; preserve its complete result.
2. Apply only the demonstrated numeric-syntax correction, preserving alpha and
   all source, owner and stage requirements.
3. Explicitly account for that correction in historical-source conservation.
   `verifyAlignmentAuditProjection` currently requires the entire retained
   classifier to match the historical declaration. Do not bypass that check by
   treating arbitrary changed code or a fresh hash as equivalent.
4. Regenerate canonical evidence and verify exact affected membership plus
   unchanged unrelated records, followed by the full audit and enforced gates.

The [overlay ancestry check](material-position-input-population.md) establishes
that all 59 sheet/snackbar mapped absolute reference wrappers have fixed parents.
The candidate uses a directly fixed overlay. This rules out treating the keyword
mismatch alone as sufficient proof of a positioning defect; actual containing
blocks, surface boundaries, clipping and interaction remain separate obligations.

The [snackbar sensitivity proof](material-snackbar-placement-sensitivity.md)
demonstrates that its placement comparator accepts horizontal and size errors
when containment, bottom gap and semantics pass. This is a confirmed limitation
of that comparator, not a demonstrated full-harness false pass or a renderer
diagnosis. Add calibrated horizontal/size checks before relying on its green
result as complete geometry evidence. Keep visibility/raster proof separate.

## Legacy source-inventory assertion (now integrated)

The full 388-test run after case-index migration finished with 387 passes and
one failure: the source receipt test still expects 356 entries while the then
current builder supplies 392. All 356 expected paths remain; the original
308-file baseline order is preserved. The missing expectation comprises 36
reviewed batch, alignment, precision, root-background, line-box and gap/caret
dependencies. The later disabled-ink correction adds three more, for 395.

`tests/material-parity/source-inventory-assertion-preparation.spec.mjs` independently
enumerates those 39 additions and runs the entire existing test callback with
only five exact in-memory assertion changes. Reversing those substitutions must
restore the original callback. All original membership, receipt and visual-field
checks remain; every additional file's current digest is checked. Four negative
controls reject missing, duplicate, reordered or forged receipts.

`node --max-old-space-size=1024 --test tests/material-parity/source-inventory-assertion-preparation.spec.mjs`
passes **2/2**, no failures or skips, **8,062.6889 ms**. This prepares the exact
test correction; it does not change the checked-in legacy test or claim the full
suite is green. Apply the bounded assertion update after canonical regeneration
finishes, explicitly preserve the earlier nine case-index assertion migrations,
and rerun the affected conservation checks before the full suite.

Update: `b452ed6` applied this bounded assertion correction, preserving the
complete historical suite outside the nine receipt replacements and exact
inventory extension. The focused legacy assertion and conservation tests pass;
a fresh complete suite remains required. See
[the integration record](material-source-inventory-assertion-integration.md).

## CSS visibility support gap: preserve state semantics

The [remaining visibility census](material-visibility-input-population.md)
contains 17 groups / 668 observations. All compare browser computed `visible`
against a missing local candidate field; they must not be default-normalized
into equivalence. Across 138 tab/stepper observations, full reference ancestry
contains active hidden and visible state rules, even though the mapped text
node has no direct visibility declaration.

`scripts/audit-material-visibility-support.mjs` establishes a public input-support
gap: the current `StyleRule` interface, core validation allow-list and loaded-CSS
mapping lack `visibility`. A package-root TypeScript reduction rejects
`visibility: 'hidden'` with TS2353 while accepting `overflow: 'hidden'`. The
installed and source interfaces are compared in full; the imported type must
resolve to its actual 87 properties rather than `any`. Machine evidence is
`docs/material-visibility-support.json`.

The first demonstrated boundary here is public authoring/support, before layout
or Babylon projection. This does not prove a raster fault for omitted visible
values, explain the missing snackbar, or classify every census row. Implement
the general CSS visibility contract before replacing reference state rules with
conditional text or custom plugin painting. Prove layout retention, inherited
hidden state, explicit visible descendants, paint suppression and interaction
behavior with equivalent public-API/browser fixtures. Audit tabs' private text
painting separately; do not add a component-specific visibility workaround.

The [public browser reduction](material-public-visibility-audit.md) now confirms
hidden boxes remain painted and hoverable at DPR 1 and 2, including inherited
hiding. The omitted/explicit-visible controls match at the sampled points.
This is evidence of the unsupported core contract, not a Material overlay cause.

The [complete owner ancestry replay](material-visibility-ancestry.md) extends
the trace to all 668 observations / 646 distinct captured trees. Only tabs and
stepper (138 observations) have ancestor visibility declarations. The other
15 groups / 530 observations have none, including snackbar and tooltip. Do not
attribute their placement or absence to an observed hidden rule. Classify their
visible-state representation separately from the missing hidden-state capability;
retain geometry, clipping, lifecycle and custom-paint investigations.

The [complete panel-state replay](material-panel-state-ownership.md) checks all
138 tab/stepper cases, including inactive owners and bidirectional header links.
Stepper retains two reference text nodes, one hidden; tabs retains two outer
panels but only mounts active text. Both candidate implementations substitute
one owner. Tabs additionally bypasses core text paint through a custom texture.
Classify these structural substitutions as application/plugin authoring defects,
separate from the core visibility support gap. The benchmark pins tab phase to 1;
it supplies no proof of live intermediate animation. Restore equivalent owner
structure only after general core support is proven, not through another custom
paint or offset adjustment.
