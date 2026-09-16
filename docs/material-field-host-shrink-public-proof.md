# Field-host height reduction: bounded equal-input mechanism proof

The public-API browser probe passes **12/12** cases. Identical HTML/CSS and
AstylarUI inputs reproduce the field host's 2–6 px height reduction through
ordinary flex shrink, without any candidate-only correction.

| Density shape | Parent border-box height | Host authored height | Constrained, shrink 1 | Constrained, shrink 0 | Parent +40 px, either shrink value |
| --- | ---: | ---: | ---: | ---: | ---: |
| Normal | 134 | 78 | 76 | 78 | 78 |
| Contrast | 114 | 62 | 56 | 62 | 62 |
| Compact | 126 | 70 | 68 | 70 | 70 |

Every number is in CSS pixels. Parent padding is 28 px per side and its border
is 1 px per side, leaving 58 px less vertical content space. The host is the
sole flex item, with an absolutely positioned child that does not contribute
normal-flow height. All three measured owners—parent, host and absolute child—
match the browser's position and dimensions within the unchanged 0.5 px gate.
Browser expectations also pass the independent 0.01 px arithmetic check.

The public normal/effective style inspection continues to retain the authored
78/62/70 px host height after the measured border box becomes 76/56/68 px. This
is direct evidence that local resolved-style values are not a used-geometry
oracle. The probe also verifies no authored-input mutation and disposal of all
scene meshes, materials and textures.

## What this establishes—and does not

This intervention confirms a **sufficient flex-sizing mechanism** for the
original measured pattern: removing the height constraint or disabling shrink
removes the reduction on both surfaces. It rules out treating the reduced
height, by itself, as proof of a core sizing bug in these bounded inputs.

It does **not** establish that the original Material comparison inputs are
equivalent. Those still replace an automatically sized inline-flex host with
in-flow generated wrappers by fixed heights and absolute children. The probe
is deliberately candidate-like, not a substitute for testing Material-like
inputs. Its empty absolute child does not reproduce the original controls,
text, subscript content, overlays, error states or their raster output.

The original 577-case survey remains source evidence. No original runtime
instrumentation traces the complete cause in every state, so
`originalCaseCausalTraceComplete` stays false. The next priority is a separate
Material-like public reproduction with in-flow wrappers and content-driven
height, followed by tracing any earliest renderer divergence there. Do not
change the canonical host height to 76/56/68 px as a purported fix.

## Verification and provenance

```powershell
npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/field-host-shrink-input-audit.spec.ts
node scripts/audit-material-field-host-shrink.mjs
node --test tests/material-parity/field-host-shrink-log-proof.spec.mjs
node scripts/audit-material-field-host-shrink.mjs --check
```

- Browser process **73237** exits **0** with `TOTAL: 12 SUCCESS`; Karma reports
  1.773 seconds elapsed / 1.736 seconds executing specs (not total build time).
- Log: `artifacts/material-parity/field-host-shrink-input-audit/test.log`, SHA-256
  `9ebe1e3e1f27e88a6b7573b00bcd8d56eddb117fc2f81e1bdf5ba2626d158550`.
- Receipt generation and no-write replay exit **0**. Log/receipt checks pass
  **2/2**, zero failures/skips/cancellations/todos, **151.0828 ms**.
- The reader validates all 12 parameter combinations, all 24 repeated log
  records, exact shared rule generation, authored tree, both local style stages,
  browser styles and every measured box. Negative controls reject missing or
  contradictory cases, modified CSS/inputs, wrong dimensions, altered stage
  values and false runtime/scope metadata.
- Runtime: Angular **20.3.29**, Material **20.0.5**, AstylarUI **0.2.0**, Babylon
  **8.56.2**, Headless Chrome **152.0.0.0**, DPR **1**, canvas **400×280 CSS px**.
  Both source TypeScript and installed library JavaScript hashes are retained;
  the probe uses only package-root AstylarUI imports.
- Known warning: **NG0914**, zoneless change detection with Zone.js loaded by
  the existing Karma polyfills. No error diagnostic is accepted.

The complete machine receipt is
`docs/material-field-host-shrink-public-proof.json`. This is a focused geometry
probe, not a full harness/matrix pass or input/rendering parity acceptance. It
reclassifies zero canonical observations and fixes no renderer behavior.
