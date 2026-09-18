# Public vertical-align applicability: confirmed core defect

An equal-input public reproduction confirms that AstylarUI uses `verticalAlign`
as **inner text placement**, including on block boxes, flex items and absolutely
positioned boxes where Chromium does not move the text in response to that
property. Explicit `baseline` is approximated as bottom alignment. Omitting the
property and explicitly requesting its CSS default therefore produce different
AstylarUI text placement.

This is a core finding, not a Material fixture adjustment. No renderer,
canonical comparison, plugin, threshold or reference truth changed.

## Evidence and scope

The standalone public consumer imports `Astylar` from `astylarui`. Both sides
consume the same tree and declarations from
`examples/material-showcase/audit/vertical-align-input.mjs`. The only API mapping
is public `root` to the reference's surface-host selector. The fixed-size surface
is 400x200 CSS pixels, the viewport is 560x320, and the target uses Arial 20px,
24px line height and an authored 80px box height.

The final matrix contains **64 paired cases / 128 screenshots**: four formatting
contexts, explicit baseline/middle/bottom plus omission, DPR 1/2, and host origins
(0,0)/(64,40). Every page awaits fonts, public surface settlement and two animation
frames. Served HTML/bundle bytes, every bundle input, public resolved/retained
styles, diagnostics, screenshots, glyph bounds and disposal are retained and
replayed. Runtime errors: **zero**. Chromium version: **152.0.7977.84**;
AstylarUI **0.2.0**, Angular **20.3.29**, Babylon **8.56.2**.

For block, flex-item and absolute contexts, the following are measured blue-glyph
top positions relative to the surface at DPR 1. DPR 2 adds 0.5px to each absolute
ink top while retaining exactly the same between-variant deltas. Moving the host
does not change surface-relative results.

| Authored alignment | Browser ink top | AstylarUI ink top |
| --- | ---: | ---: |
| omitted | 24px | 24px |
| baseline | 24px | 80px |
| middle | 24px | 52px |
| bottom | 24px | 80px |

Of **48 baseline-relative variant comparisons, 36 disagree**. These are retained
failures, not accepted rendering parity. The inline context also disagrees, but
combines inline line-box placement and height-applicability behavior; it is not
used to claim that the text-placement switch alone explains every inline error.
Glyph width/raster differences are visible and retained, not waived by the
vertical-delta proof.

## First divergence and ownership

With explicit requests, both public declaration snapshots preserve the requested
alignment and the candidate's normal/effective/retained-text stages agree. In
`src/app/services/dom/renderer.service.ts`, `positionTextMesh` selects inner text
placement from `style.verticalAlign` without testing CSS applicability. Its
`baseline` branch explicitly approximates baseline as bottom alignment. With an
80px box and a 24px text line box it computes local CSS Y offsets of:

- omitted: -28px;
- baseline/bottom: +28px;
- middle: 0px.

The evidence extracts and transpiles the unchanged source methods and the
actually bundled installed methods, requires equality, then evaluates those
methods with a recording projection boundary. The computed 56px baseline versus
omission difference and 28px middle difference match the browser-captured ink
movement. Both CSS calculations precede `projectCssLocalPoint`; this finding
does **not** implicate a Babylon coordinate conversion error.

The capability catalog's `text-paint-and-alignment` entry calls keyword support
compatible, but does not establish correct formatting-context applicability.
This proof identifies that contract gap without broadening its support claim.

## Connection to historical label compensation

The [original control-label history](material-control-label-vertical-align.md)
proves that `middle` was added to checkbox/radio/switch labels in commit
`354084e`, and binds 272 unequal-input observations. This new reduction proves a
general core issue, **not the cause of those full Material compositions**.

Importantly, omission already places text at the browser's vertical position in
the three non-inline reductions. Adding `middle` moves it away. Therefore the
historical labels must still be reproduced with their actual equivalent parent
structure and dimensions before claiming that this specific defect motivated or
was concealed by the label substitution. `originalMaterialLabelCauseProven`
remains false in the machine evidence.

## Implementation order after this audit

1. Make omitted and explicit CSS defaults semantically consistent. Apply
   `vertical-align` in its owning inline/table formatting context, not as a
   general text-centering instruction inside arbitrary boxes.
2. Keep line-box/glyph placement and final projection distinct; retain proper
   flex/absolute/block behavior and do not add compensating world-space offsets.
3. Reproduce the original label compositions with equivalent authoring. Identify
   any separate parent-layout or line-box defect before removing the historical
   `middle` substitutions alongside the appropriate general fixes.
4. Retain this full matrix and add inline siblings, table cells, wrapping and
   dynamic updates as applicability coverage when implementing the correction.

## Verification and rejected exploratory run

```text
node scripts/audit-public-vertical-align.mjs --output=artifacts/material-parity/public-vertical-align-audit-v2
node scripts/bind-public-vertical-align.mjs
node --test --test-concurrency=1 tests/material-parity/public-vertical-align-evidence.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
npm --prefix examples/material-showcase run build
```

The browser command exits **1**, intentionally retaining the 36 observed
alignment-response failures; there are no invalid cases or runtime errors.
Evidence binding exits **0**. Focused verification passes **11/11**, exit **0**,
zero skips/cancellations/TODOs, in **12,791.578ms** on the final replay. The first
focused replay also passed 11/11 in 13,067.4613ms. Verification includes 14 mutated input
rejections, four receipt/measurement rejections, two source-method rejection
controls, rejection of an undeclared style field, synthetic ink-metric
calibration, independently write-prohibited replay, and four inventory checks.
The consumer Angular build exits **0**, prerenders two routes and reports no
warnings in its retained log. The standalone browser entry is separately
compiled by esbuild; the Angular application build does not itself compile that
standalone entry.

The exploratory v1 run used an undeclared `backgroundColor` field and lacked an
omission control. It is **not accepted evidence**. The correction uses public
`background` declarations on both sides and an explicit equivalent root
background. A focused test now checks every diagnostic style key against the
installed public `StyleRule` declaration and rejects the original mistake.
Both exploratory and final logs remain under
`artifacts/material-parity/field-host-flow-input-audit/`, named
`public-vertical-align-v1.log`, `public-vertical-align-v2.log`,
`public-vertical-align-focused.log`, `public-vertical-align-focused-final.log`
and `public-vertical-align-consumer-build.log`.

[Machine evidence](material-public-vertical-align-audit.json) SHA-256:
`c2a04d904a2e181e9e2c6cd859796ea1d15a80bf163aa39735698a02fd3d56c1`.

This proof is separate from canonical classification promotion. Complete audit
coverage, unresolved classifications, canonical conservation checks and the
full enforced parity matrix remain outstanding.
