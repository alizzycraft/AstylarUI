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

Audit normalization correction (2026-09-11): the old canonicalizer unconditionally
deleted shorthands, including `flex` without expanding it. It could therefore
hide unequal declarations. Supported box/gap/overflow shorthands now expand on
both sides; unexpanded flex and elliptical radius declarations remain explicit
harness-normalization gaps. Zero percentages are no longer collapsed to absolute
zero, preserving potentially different flex-basis semantics. Regression tests
cover differing flex/radius declarations, symmetric shorthand expansion, and
zero-percentage retention. `node --test tests/material-parity/input-equivalence-audit.spec.mjs`
passed 14/14; `npm run parity:harness:check` passed 52/52. This changes report
interpretation only, not captured inputs or fixture output.

The superseded collector run was explicitly stopped after confirming its live
process. A fresh unfiltered `--enforce --skip-build` run using the separate audit
build is now collecting complete trees; the previously completed baseline remains
in `artifacts/material-parity/full-audit-base.json`. Completion of the fresh run
and final report review are still required.

Collector end-to-end smoke (2026-09-11): a separate production build at
`examples/material-showcase/dist/material-showcase-audit` succeeded. Using
`ASTYLAR_MATERIAL_BROWSER_ROOT=examples/material-showcase/dist/material-showcase-audit/browser`,
`ASTYLAR_MATERIAL_ARTIFACTS=artifacts/material-parity/collector-smoke`, port 4432,
families `core,datepicker`, profile `light`, and viewport `desktop`, the command
`node tests/material-parity/run-material-parity.mjs --enforce --skip-build --static-only`
captured two passing cases (minimum SSIM 0.998795, maximum edge error 0.002px).
It correctly exited 1 because enforced acceptance requires all 436 static and
1,875 interaction cases. This is focused diagnostic evidence, not a green full
gate. Loading the resulting tree artifacts through `buildMaterialInputAudit`
verified all four case sides, valid digests, no collection gaps/errors, and
structural schema 2 throughout. Partial audit validation returned no errors.
The existing unfiltered run's bundle and artifacts were not replaced.

The initial structural collectors were not comparable: reference text included
the subtree, candidate text included only the node's own value; reference
descendant order followed requested IDs, while candidate IDs included unmapped
descendants. Structural schema 2 aligns subtree text and mapped document order.
The candidate style collector now retains all scalar resolved properties instead
of dropping longhands through an allowlist. Legacy evidence must be recaptured;
it must not be reported as a confirmed fixture discrepancy. These changes affect
audit collection only, not the rendered fixture. The matrix already in flight
uses its original bundle and cannot verify these later collector changes.

- Finish the unfiltered enforced matrix and regenerate both audit reports.
- Reconcile every one-sided mapping and preserve genuine state divergence.
- Capture and review the new full-tree inventory for every case, including
  anonymous wrappers, generated icons, and pseudo-elements. The browser collector
  has a real-Chrome regression test covering these plus inactive media rules and
  CSS layers (`node --test tests/material-parity/input-tree-evidence.spec.mjs`).
  Reference captures are stored with SHA-256 digests so a later focused run
  cannot silently replace evidence referenced by the full report. The generated
  audit pools identical styles/rules/trees while retaining every case association.
- Resolve used-value versus authored-expression normalization gaps before
  treating automatic difference counts as confirmed authoring defects.
- Complete minimal equivalent-input investigations for remaining suspicious
  compensation and connect the durable audit check to the release gate.

No fixture behavior, reference truth, or visual threshold was changed for these
findings. The investigation remains open until the full objective is verified.
