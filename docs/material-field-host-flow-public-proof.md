# Inline field-host flow: confirmed core auto-height discrepancy

Restoring a minimal reference-like in-flow column exposes a core layout defect.
Two independent Chrome runs each finish with **2 FAILED, 2 SUCCESS**. The two
`inline-flex` tests fail; the two otherwise identical `flex` controls pass.
The browser parity assertions remain failing. No production code or canonical
comparison input has been changed.

## Equivalent inputs and observed failure

Both surfaces receive rules from one authored source. A 400×340 CSS-pixel frame
contains an automatically sized block section, an automatically sized column
host, two empty in-flow wrappers, and a following block sibling. Section content
width is 120 or 240 px, with 28 px padding and 1 px border per side. Its host
width is 100%; the first wrapper is 56 px high. The second changes 20 → 40 → 20
px through the public surface update API. The host's display is the only
experimental switch: `inline-flex` or the `flex` diagnostic control.

| Observation | Browser, both display modes | AstylarUI flex | AstylarUI inline-flex |
| --- | --- | --- | --- |
| Host height, initial / grown / restored | 76 / 96 / 76 | 76 / 96 / 76 | 76 / 96 / 76 |
| Section border-box height | 134 / 154 / 134 | 134 / 154 / 134 | 340 / 340 / 340 |
| Following sibling top | 150 / 170 / 150 | 150 / 170 / 150 | 356 / 356 / 356 |

All quantities are CSS pixels. The result is identical at both widths and on
both runs. All six owners' x/y/width/height are checked. Only inline section
height and following-sibling y fail: **12 property failures across six inline
observations**, with errors of 206 px initially/restored and 186 px after growth.
All six flex observations match. The final host and both child boxes match even
in the failing cases; examining only the host would miss this defect.

The receipt retains the exact authored tree, CSS, SiteData, browser computed
styles, public normal/effective styles, and measured geometry for all twelve
observations. There are 24 logged records per run because Karma repeats output;
duplicates must be identical. The test also checks input immutability, no error
diagnostics, and zero remaining scene meshes/materials/textures after disposal.

## Owning boundary and source diagnosis

The defect belongs to **core CSS inline-flow auto-height finalization**, not a
Material plugin layout or a Babylon-world-coordinate correction.

Source inspection identifies the stale-measurement ordering:

1. `element-dimension.service.ts:118` provisionally defaults height to parent
   content height. `calculateIntrinsicHeight` at line 593 does not measure
   descendant boxes: an empty, zero-inset ordinary element without text returns
   null. The inline host therefore needs its descendants resolved to obtain
   its final automatic height.
2. `element-creation.service.ts:870` reads inline child dimensions before
   laying out those descendants. It uses this captured child height for line
   height and calculates the parent's height at line 914.
3. Only after committing parent sizing and child placement does the inline path
   call `processChildren` at line 1000. `flex.service.ts:435`
   (`resizeStandaloneAutoHeightContainer`) can then correct the column host to
   76/96 px. The enclosing inline-flow parent is not subsequently remeasured.
4. The block control path already calls `processChildren` before reading final
   child dimensions (`element-creation.service.ts:1112`). Its public geometry
   matches the reference in this probe.

The 340 px section is consistent with measuring the provisional 282 px content
height plus 58 px section insets before the host settles to 76/96 px. This
mechanism is established by source-order inspection alongside the repeated
public differential failure; **an internal runtime trace and a corrective
intervention have not been performed**. The core observable discrepancy is
confirmed, but this is not a claim that every original Material state shares
the complete same causal chain.

TypeScript and installed package JavaScript fingerprints are retained in the
machine receipt. The probe imports AstylarUI only through its package root;
projection of public scene bounds is measurement instrumentation, not layout
logic supplied by a plugin.

## Relationship to historical compensation

The [original field-host survey](material-field-host-layout-inputs.md) shows
that the comparison substitutes a fixed-height block host and absolute children
for the reference's automatic inline-flex column and in-flow wrappers. The
[shrink control](material-field-host-shrink-public-proof.md) separately explains
how candidate-like fixed heights can yield matching smaller boxes through
ordinary flex shrink. Neither observation establishes equivalent inputs.

This new probe demonstrates a core defect that reference-like inputs can expose
and the alternative composition can avoid. It does **not** establish why the
original author chose the alternative or that this defect motivated it. History
already places those differing requests in the initial showcase. There is no
new historical intent evidence, no canonical reclassification, and no permission
to replace `inline-flex` with `flex` in the comparison.

## Prioritized implementation follow-up—not implemented here

1. Correct the general inline formatting/layout measurement boundary so parent
   line size and following flow consume finalized CSS child dimensions. Keep
   coordinate conversion at rendering projection. Do not introduce Material IDs,
   fixed parent heights, plugin remeasurement, or per-example offsets.
2. Turn this unchanged browser parity proof green, then cover multiple inline
   siblings and wrapping, baselines/vertical alignment, nested automatic sizing,
   margins/insets, constraints, inline-grid/inline-block, and update/resize.
   Moving recursion alone is not presumed sufficient for all formatting contexts.
3. Verify a composed public reference-like field with actual input, label,
   subscript/hint/error content and its typography/interaction states. Only then
   plan removal of the original fixed-height/absolute-child compensation in a
   separately authorized implementation phase.
4. Re-run the affected comparison families and the complete enforced matrix.
   Do not equate this geometry probe with raster, interaction, or full Material
   input equivalence.

## Verification and provenance

```powershell
npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/field-host-flow-input-audit.spec.ts
node scripts/audit-material-field-host-flow.mjs
node --test tests/material-parity/field-host-flow-log-proof.spec.mjs
node scripts/audit-material-field-host-flow.mjs --check
```

- Initial browser session **92712**, exit **1**, terminal result **2 FAILED,
  2 SUCCESS**. Karma: 1.719 s elapsed / 1.686 s executing tests, not build time.
- Repeat session **13035**: complete terminal log says **2 FAILED, 2 SUCCESS**,
  1.719 s / 1.693 s. The process handle expired before its exit code was recovered;
  that exit code remains explicitly unknown rather than inferred.
- Both logs are under `artifacts/material-parity/field-host-flow-input-audit/`.
  Their SHA-256 hashes and exact matching observation records are retained in
  [the machine receipt](material-field-host-flow-public-proof.json).
- Receipt generation and no-write replay exit **0**. Evidence/negative-control
  tests pass **2/2**, no failures/skips/cancellations/todos, **180.0622 ms**.
  These validate the failing evidence; they are not renderer acceptance tests.
- Reader checks exact input structure/rules, shared CSS generation, stages,
  browser styles, every reference and recorded candidate box, all state cases,
  identical repeats, and exactly the twelve expected assertion failures.
  Negative controls reject compensation, missing/contradictory cases, altered
  geometry, omitted failures, extra failures, and false environment metadata.
- Runtime: Angular **20.3.29**, Material **20.0.5**, AstylarUI **0.2.0**, Babylon
  **8.56.2**, Headless Chrome **152.0.0.0**, DPR **1**, 480×400 CSS-pixel surfaces,
  reference font readiness followed by public `surface.whenSettled()`.
- Known warning: **NG0914**, zoneless change detection with Zone.js loaded by
  the existing Karma polyfills.

The audit remains incomplete. This increment reclassifies **zero** canonical
observations; the previously recorded 2,486 unresolved groups are not reduced by
this standalone proof. Complete current harness and enforced matrix verification
remain separate outstanding requirements.
