# Equal-input gap probe: confirmed core CSS layout discrepancies

Two independent Chrome runs reproduce **10 failing and 14 passing tests** from
24 equal-input cases. They expose **34 geometry assertion failures**, with no
error diagnostics, input-mutation failures or disposal failures. The test keeps
the browser expectations unchanged. This is audit evidence, not an implementation
fix or a claim that Material parity is complete.

## Inputs and controls

The [public-API test](../examples/material-showcase/src/app/gap-value-input-audit.spec.ts)
mounts AstylarUI through the `astylarui` package root. Four empty 20×20 CSS-pixel
items occupy a wrapping flex row (70×90), wrapping flex column (140×70), or
explicit two-column/two-row grid (140×90). Every case uses one set of declarations
to generate both SiteData and browser CSS. All boxes have zero margin, padding
and border; `font-size: 20px` supplies the explicit `em` basis. The surface and
reference frame are 640×360 CSS pixels at DPR 1.

| Gap request | Flex row | Flex column | Grid |
| --- | --- | --- | --- |
| Omitted | Pass | Pass | Pass |
| `normal` | Pass | Pass | Pass |
| `0` | Pass | Pass | Pass |
| `8px` | Pass | Pass | Pass |
| `8px 16px` | Fail | Fail | Fail |
| `row-gap: 8px; column-gap: 16px` | Pass | Fail | Pass |
| `10%` | Fail | Fail | Fail |
| `1em` | Fail | Fail | Fail |

The longhand cases are diagnostic controls, not replacements for the shorthand
inputs. Normal/effective public style inspection preserves the exact requests.
The reader independently validates all reference boxes, authored structure and
CSS, and checks every reported assertion against the recorded geometry. The two
runs' complete records are identical after ordering and duplicate-log validation.

## First demonstrated divergence and ownership

Three source mechanisms match the equal-input failures:

1. **Two-value shorthand is reduced to its first number.**
   `FlexService.parseGapProperties` at `flex.service.ts:1389` parses the entire
   shorthand with `parseFloat`, then uses that result for both axes when no
   longhand exists. `GridService` at `grid.service.ts:81` and `:82` sends the
   entire shorthand to `parseLength` (`:278`) for each axis. Thus `8px 16px`
   produces 8 rather than 16 CSS pixels horizontally: the second row/grid item
   starts at x=28 rather than x=36. The public declaration stage is still correct.
2. **Relative gap lengths lose their CSS basis.** Those parsers likewise treat
   `1em` as 1 rather than 20 pixels and `10%` as 10 pixels regardless of the
   definite content-box dimension. The row probe's expected column/row gaps are
   7/9 pixels; the column probe's are 14/7; the grid probe's are 14/9. All are
   observed as 10-pixel gaps. For `1em`, even line membership changes because
   three items may fit where the browser fits two.
3. **Column wrapping uses the wrong cross-line gap.** The explicit-longhand
   control bypasses shorthand parsing but still places the second flex column at
   x=28 instead of x=36. `FlexService` passes the container to
   `FlexLayoutService.applyAlignContent` at `flex.service.ts:1207`.
   `applyAlignContent` (`flex-layout.service.ts:81`) and
   `alignContentFlexStart` (`:133`, `:143`) use `rowGap` between lines regardless
   of flex direction. For a column container, the between-column gap is the
   column gap, while row gap controls the vertical item separation.

The [machine receipt](material-gap-value-public-proof.json) fingerprints current
TypeScript and installed package JavaScript, extracts the unchanged relevant
method bodies, and verifies that both versions return the same diagnostic
results. This is source execution plus repeated public geometry evidence—not a
live internal trace or a corrective intervention. It supports the core
CSS-space parser/used-value and flex-axis ownership diagnosis. Babylon projection
is used only to measure final scene bounds; no world-space values feed layout.

## Compatibility and relationship to Material findings

The checked capability catalog lists gap/longhands in the compatible flexbox
group, with a supported shorthand/length subset and units including `%` and
`em`. It does not specify exact gap grammar independently. The audit therefore
records the concrete CSS behavior discrepancy and this documentation ambiguity;
it does not broaden the published compatibility claim. Grid's catalog also does
not independently promise every gap unit. All tested browser grammar is valid,
typed public requests compile, and these runs emit no invalid-input diagnostics.

The [original composition audit](material-explicit-gap-composition.md) establishes
different Material inputs separately. Most explicit original gaps are single
pixel values, which pass these controls. **These new defects are not proof of
why those original spacings differ or why earlier authors chose compensations.**
No original observation is reclassified by this probe, and the canonical
unresolved count remains 2,438.

## Recommended implementation sequence—not performed

1. Resolve one/two-value shorthand and supported CSS length units at a shared
   core CSS-space used-value boundary consumed consistently by flex and grid.
   Preserve authored declarations for inspection and honor longhand precedence.
2. Select line gaps from the correct axis for row/column flow. Audit all
   align-content paths, not just the demonstrated `flex-start` case.
3. Turn these unchanged paired tests green. Add reverse axes, padding/border
   percentage bases, intrinsic and cyclic percentage cases, updates/resizing,
   and further unit/DPR coverage before making a broader support claim.
4. Return to equivalent Material compositions. Do not work around these rules
   by expanding a shorthand in a fixture, substituting pixel values for units,
   adding a plugin gap calculator or switching flex direction.

## Commands and results

```powershell
npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/gap-value-input-audit.spec.ts --progress=false
node scripts/audit-material-gap-value-proof.mjs
node scripts/check-material-gap-value-proof.mjs
node scripts/audit-material-gap-value-proof.mjs --check
npm --prefix examples/material-showcase run build -- --output-path=dist/material-gap-value-audit
```

- Browser sessions **5257** and **81036** both exit **1**, honestly retaining
  **10 FAILED, 14 SUCCESS**. Exactly 34 geometry assertions fail per run.
- Evidence generation, no-write replay and **21 negative controls** exit **0**.
  The controls reject altered inputs, reference geometry, core stages, runtime
  errors, missing coverage, false summaries and concealed assertion failures.
  The three canonical audit files are byte-identical before/after verification.
- Separate build session **49389** exits **0**, prerenders two routes and reports
  no warnings. It does not replace the frozen reference server's build. The
  test's TypeScript compilation is separately proven by the browser runs.
- AstylarUI **0.2.0**, Angular **20.3.29**, Babylon **8.56.2**; Chrome reports
  **152.0.0.0**. Existing Karma polyfills produce the documented NG0914 zoneless
  warning. No dependencies were upgraded.

Logs, hashes, sources, exact inputs and all measured boxes are retained in the
receipt. This does not establish raster fidelity, updates, the full unit grammar,
loaded stylesheet translation or original Material causal attribution. The new
standalone checks are not part of the 91-file harness already running at
`52ec632`; full audit and enforced parity acceptance remain outstanding.
