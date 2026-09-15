# Range input default-border investigation

This is audit evidence, not a slider fix. The public reproduction and both
complete repeated observation logs are retained in
[the machine record](material-range-default-box-audit.json).

## Demonstrated result

A single range input uses one shared source for its browser CSS and Astylar
rules. It requests `width:120px`, `height:44px`, zero padding/margin and an
absolute position of `(32px, 32px)`. Border declarations are either omitted on
both sides, or explicitly identical on both sides.

| Box sizing | Shared border request | Browser root box | Astylar root box | Style/geometry equality |
| --- | --- | --- | --- | --- |
| content-box | omitted | 120 x 44 | 122 x 46 | fails |
| content-box | 0px none, radius 0 | 120 x 44 | 120 x 44 | passes |
| content-box | 2px solid, radius 0 | 124 x 48 | 124 x 48 | passes |
| border-box | omitted | 120 x 44 | 120 x 44 | border styles still fail |
| border-box | 0px none, radius 0 | 120 x 44 | 120 x 44 | passes |
| border-box | 2px solid, radius 0 | 120 x 44 | 120 x 44 | passes |

Both retained browser runs return **2 failing / 4 passing tests**, exit 1.
Their six observation records are identical. The assertions remain true
equality assertions: the two omission failures are not rewritten as passes.
The green Node evidence checks verify the integrity of this failing diagnostic;
they do not certify renderer parity.
All **3/3 evidence checks pass**, including seven corrupted-evidence rejection
controls and all 18 source/installed-runtime fingerprints (118.825ms).

## Earliest demonstrated divergence and owner

`StyleService.findStyleForElement` selects defaults using `element.type`, which
is `input`, rather than the `range` input subtype. `StyleDefaultsService` merges
the global map and `elementDefaults.input`. Those generic defaults supply a
1px solid border and 4px radius. Chromium resolves the omitted range border to
0px, none, and radius 0. Both public normal and effective inspection stages
retain the generic defaults on Astylar.

This is not merely an inspection artifact. The dimension service adds the
resolved border widths outside explicit content-box dimensions. The calculated
CSS size then reaches `RangeManager`, whose root interaction plane is projected
at that size. Measuring its final root mesh yields the predicted 2px increase
in each dimension. The same-input explicit-border controls isolate this effect:
their style and box measurements match.

The generic input defaults date to `2c16e148`; the catalog's statement that
checkbox/radio/range use input-type-specific defaults dates to `cd222388`.
That catalog wording is too broad for this demonstrated range border path.
The compatibility prose separately documents intentionally styled controls and
non-Chromium defaults. Thus this is a **documented default-policy divergence
with a confirmed used-box effect**, plus a **catalog-claim discrepancy**. It is
not evidence of a faulty content-box addition formula or final projection.

The user's same-input rendering contract requires a core default-policy
decision/correction, not a candidate-only border reset. The explicit styles in
this reproduction are experimental controls, not fixture fixes. Nothing here
authorizes a plugin to create its own box calculation.

## Verification

Environment: AstylarUI 0.2.0, Angular 20.3.29, Material 20.0.5, Babylon 8.56.2,
Chrome Headless 152, Windows, DPR 1, 320 x 180 CSS-pixel surfaces, Arial.
The test awaits document fonts and public surface settlement, checks diagnostic
errors, preserves authored inputs and verifies zero meshes/materials/textures
after disposal. Babylon projection is used only for final-output measurement.

```powershell
npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/range-default-box-audit.spec.ts
node --test tests/material-parity/range-default-box-proof.spec.mjs
npm --prefix examples/material-showcase run build -- --output-path dist/material-showcase-range-default-box-audit
```

The Angular test command compiles the diagnostic TypeScript. The separate
production browser/server build passed and prerendered two routes in 31.214
seconds. It does not overwrite the frozen comparison build. The existing
NG0914 warning notes Zone.js is loaded alongside zoneless test providers.
An initial compile rejected numeric min/max/step; the reproduction now copies
the public string values from the browser input attributes.

## Remaining work and limits

- Bind the original 156 Material range-owner border observations to their exact
  captured author rules and stages before assigning these canonical groups.
  The already-classified unequal padding/box-sizing requests remain separate.
- Keep the slider's thumb selection, pointer coordinate domain, peer constraints,
  min/max/step, restricted travel, and state-layer artifacts under separate
  investigation. These static box measurements do not explain all dragging bugs.
- This proof does not measure border raster, native thumb geometry, hit testing,
  DPR 2, or appearance equivalence. Matching explicit-border boxes does not prove
  matching control pixels or interaction.
- Plan the general defaults correction first, reconcile the capability claim,
  then remove any proven dependent compensation with equal-input regression
  evidence. No renderer, compatibility contract or canonical fixture was changed.
- The canonical unresolved total remains **3,210**; this isolated proof does not
  silently classify or erase any remaining group.
