# Material input audit: root-cause evidence

This is an investigation record, not a declaration of completed parity or a renderer fix.
The machine report is generated separately from the full benchmark output.

## Rendered geometry feeds layout

`examples/material-showcase/src/app/astylar.component.ts`, `connectedOverlayTop`, calls
`measure(surface, [anchorId], false)`. That measurement calls `computeWorldMatrix`,
projects `boundingBox.vectorsWorld` with `Vector3.Project`, and converts the result
to CSS pixels. `connectedOverlayTop` then uses `anchor.top` to author the next
datepicker overlay position.

This is a confirmed architectural violation: expressing the result in CSS pixels
does not remove its dependency on rendered output. It also creates first-render
versus update dependence. The earlier audit instrumentation correction in
`d6a3158` avoided re-entering the `siteData` computed signal; it did not fix this
layout feedback path.

Core already owns `layoutBoxesMap`, consumed by the scroll runtime in
`src/lib/astylar.ts`. The public `AstylarSurface` interface in
`src/lib/astylar-surface.ts` has no layout-box query. Plugin render contexts do
receive their own CSS dimensions (`src/lib/astylar-plugin.ts`), but that is not
an application query for an arbitrary overlay anchor. Implementation should
reuse authoritative core CSS geometry, not add another calculation based on
mesh output. Test first open, subsequent updates, scroll, nested transforms,
resize, and DPR separately.

## Slider authoring and test coverage disagree with the reference

`reference.component.ts` declares a Material range slider with min 0, max 100,
and step 5. `astylar.component.ts` authors start as 0..50 and end as 50..100,
both step 1, and clamps their values at 50. Shared state normalization rounds
values to multiples of 5, introducing another difference between the native
control's value and application state.

Start=60/end=80 and start=20/end=40 are valid shared states but cannot be
represented faithfully by those candidate controls. This discrepancy exists
before rendering; it is not evidence of a Babylon coordinate bug.

The harness `sliderDragCoordinates` only targets start=40 and end=75. Both
remain within those restricted halves. A green drag test therefore does not
disprove the defect. Restore equivalent domains and step semantics, then add
cross-midpoint drags in both directions, full-range reachable values, and
keyboard increments. Reduce any remaining hit-testing failure independently.

## Plugin typography ownership

`MaterialTabPanelRenderer` in `material-showcase.plugin.ts` allocates a
`DynamicTexture`, calculates a baseline using `textureFontSize * .328125`,
adds an authored `baseline-offset`, and draws text with `fillText`.
This is a confirmed second text-paint path. Transition orchestration can stay
Material-specific; ordinary text layout and rasterization should use core.
The general plugin coordinate adapter is not itself evidence of a violation:
final CSS-to-render projection is its intended responsibility.

## Minimal browser evidence

`input-equivalence-proof.spec.ts` supplies the same style objects to browser CSS
and public Astylar `SiteData`. All three Chrome/WebGL tests passed on 2026-09-11:
content-derived padded flex height, a full-span grid marker with a cell-centered
ring, and a fixed bottom-aligned overlay. Every measured edge is within 0.5 CSS px.

Command: `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Runtime: Chrome Headless 152, Babylon 8.56.2, WebGL2. The existing NG0914
Zone.js/zoneless configuration warning was emitted. These are geometry proofs,
not typography, paint, or full Material-composition proofs. They do not justify
either a broad core rewrite or retention of fixture compensation.

## Outstanding acceptance work

- Finish the unfiltered enforced matrix and regenerate both audit reports.
- Reconcile every one-sided mapping and preserve genuine state divergence.
- Extend mapped-node evidence to the relevant anonymous wrappers, generated
  icons, and pseudo-elements; configured case counts alone do not prove this.
- Resolve used-value versus authored-expression normalization gaps before
  treating automatic difference counts as confirmed authoring defects.
- Complete minimal equivalent-input investigations for remaining suspicious
  compensation and connect the durable audit check to the release gate.

No fixture behavior, reference truth, or visual threshold was changed for these
findings. The investigation remains open until the full objective is verified.
