# Overlay capture roots are not DOM ancestry

This is a confirmed **harness evidence limitation**, not a diagnosis of the
original snackbar, tooltip, bottom-sheet or dialog rendering failures. No
canonical input attribution or production behavior changes in this increment.

## Source evidence

`tests/material-parity/input-tree-evidence.mjs:65-67` starts separate walks at
`app-reference .frame` and every `.cdk-overlay-container`, assigning each a
captured `parent: null`. It does not capture their external ancestors. That
null identifies a traversal boundary; it does not assert that the DOM element
has no parent, inherited declarations or ancestor-defined containing block.

The installed Angular CDK implementation in
`examples/material-showcase/node_modules/@angular/cdk/fesm2022/overlay-module-Bd2UplUU.mjs:736-766`
creates an overlay container and appends it to `document.body`. No
`OverlayContainer` override was found in the showcase source. This source
inspection identifies the expected attachment path, but is not a fresh capture
of attachment and ancestry in every original comparison state.

## Focused browser proof

The standalone `overlay-captured-root-context.spec.mjs` invokes the existing
capture function unchanged in Chrome 152.0.7977.76 at a 640 × 400 CSS-pixel
viewport, separately at DPR 1 and 2. Its synthetic DOM has a reference frame
and a body-attached, fixed-position overlay sibling.

- The captured roots are `frame` and `overlay:0`, both with null parents;
  their actual `html`, `body` and `app-reference` ancestry is absent.
- A frame-local custom property and font style do not leak into the sibling
  overlay. A body custom property and font style do affect the overlay even
  though that declaration owner is outside the capture.
- Translating the body by 30 CSS pixels horizontally and 40 vertically moves
  the fixed overlay from (10, 20) to (40, 60), while the overlay's own computed
  transform remains `none` and its captured parent remains null.
- Removing the body mutations restores the complete captured tree and the
  original rectangle exactly, at both DPRs.

The machine-readable companion records the source fingerprints, browser,
DPRs, actual DOM attachment and measured rectangles. The proof neither
reconstructs candidate computed values nor establishes rendering equivalence.
In particular, it does not show that a body transform existed in the original
Material captures or caused the missing snackbar or displaced tooltip.

## Verification

```powershell
node --test tests/material-parity/overlay-captured-root-context.spec.mjs
node scripts/audit-material-overlay-root-context.mjs
node scripts/audit-material-overlay-root-context.mjs --check
```

The direct focused run passed 2/2 tests, with no failures, skips or cancellations
in 3,290.519 ms. Generation and no-write verification passed; a subsequent
standalone `--check` also passed, replaying both browser tests and comparing
the full generated report without writing it. An initial attempted import from
the unavailable `playwright` package failed; the test now uses the project's
existing `playwright-core` dependency, with no dependency change.

This test remains standalone. It is not part of the concurrently running
43-file harness command and is not represented as covered by that command.

## Ownership and next evidence

The responsible boundary is reference ancestor-context capture. Before using
these roots to justify inherited values or overlay placement, add supplemental
original-state evidence of the actual ancestor chain, declarations, computed
context, containing-block triggers and attachment. Bind it to the frozen served
runtime and the corresponding case, preserving existing trees and scalar data.
Do not invent ancestors from candidate structure, treat null as a CSS initial
boundary, or change canonical fixtures to remove the missing context.

Only after that evidence is available can the investigation distinguish
reference host setup, input differences, core CSS-space layout/projection and
plugin placement. Existing overlay failures and uncertain attributions remain
open. No adjustment to popup coordinates, dimensions or text is authorized by
this finding.

## Supplemental collector: focused verification, application capture pending

`tests/material-parity/reference-root-ancestor-context.mjs` now provides a
separate read-only browser evaluator. It records each existing capture root's
actual DOM path and complete parent-element chain, deduplicated ancestor nodes,
inline declarations and priorities, enumerated computed CSS/custom properties,
viewport rectangles, scrolling and ordered stylesheet CSSOM source. Raw nested
rules are preserved; the collector does not implement a competing cascade or
infer which ancestor establishes a containing block. Unreadable stylesheets and
missing reference frames produce explicit errors.

```powershell
node --test tests/material-parity/reference-root-ancestor-context.spec.mjs
```

The two DPR cases passed **2/2**, with zero failures, skips or cancellations in
**4,644.5069 ms**. They verify inheritance outside the original tree, transformed
ancestor geometry, nested stylesheet source, stable repeated capture, exact
preservation of the DOM and original input-tree capture, changed attachment and
inherited values after explicit test reparenting, inline `!important` source,
and a missing-frame negative control. Test-only mutations are not part of the
collector. No changes were made to the existing collector or running harness.

This proves the supplemental instrumentation on controlled browser inputs.
Application capture and independent binding to original state/runtime evidence
remain pending; the collector's existence does not justify any canonical
classification or original-case ancestry claim.
