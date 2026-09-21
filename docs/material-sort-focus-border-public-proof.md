# Sort border: equal-input public reduction fails

The [historical sort structure audit](material-sort-focus-structure.md) found a
reference bottom border replaced with an absolute painted child. A separate
public-API reduction now demonstrates a border/flow geometry defect without
that substitute. It does not establish why the historical author chose it.

## Paired input and observations

One declaration map produces both browser CSS and `SiteData`. A natural-height
flex container contains a 19px-high empty block; an 8px block follows it in
normal flow. The sequence changes `borderWidth` from `0 0 0px 0` to
`0 0 1px 0` and back. Both sides receive `solid` and the same explicit color.
Using the four-value border-width shorthand expresses the bottom-only border
without inventing an unsupported typed `borderBottomWidth` field.

| Border-on observation | Browser | AstylarUI |
| --- | ---: | ---: |
| Parent height | 28px | 27px |
| Flex owner height | 20px | 19px |
| Content top | 0px | -0.5px |
| Following sibling top | 20px | 19px |

Results are identical at 120px and 240px widths. Initial and restored geometry
matches exactly. Normal and effective public style inspection both retain
`0 0 1px 0`, `solid` and `content-box`; neither introduces a height. Thus the
first observed divergence is **after resolved-style inspection**, in rendered
geometry/flow behavior. The exact internal layout-versus-projection causal path
is not yet proven by this measurement alone.

Both independent browser runs produced six identical observation records and
the same eight geometry assertion failures. Each run ended **2 FAILED,
0 SUCCESS**, exit code **1**. Those failures remain in the public test; they
have not been converted to expected-success assertions or relaxed tolerances.
The evidence-reader tests pass by verifying these failures, not the renderer.

## Ownership and limits

This reproduction uses only root-package AstylarUI authoring and lifecycle APIs.
Babylon scene access is read-only measurement of the final projection, not a
layout workaround or mesh mutation. No Material plugin participates. The
defect belongs on the core investigation path, not in another showcase offset.

Relevant source leads: `element-dimension.service.ts` has a four-side
`parseBorderWidthBox`; several intrinsic sizing paths in `flex.service.ts`
instead parse the first scalar with `Number.parseFloat`. These are leads, not
a demonstrated call trace for this reproduction. Follow the auto-height and
cross-axis alignment path before naming an exact faulty function.

The capability catalog's `paint` entry lists compatible `borderWidth` and
solid-border support but does not enumerate the four-value subset explicitly.
The public type accepts a string and core has four-side parsing. Keep that
documentation precision gap visible; do not present this as a verified claim
that every border shorthand is supported.

This reduction intentionally excludes typography, real focus gestures,
`currentColor`, border raster correctness and the complete Material structure.
It establishes a general equal-input failure relevant to removing the
substitute, not full causation of the original screenshot discrepancy.

## Reproduction and evidence

```text
npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/sort-focus-border-input-audit.spec.ts
node scripts/record-sort-focus-border-audit.mjs
node --test tests/material-parity/sort-focus-border-public-proof.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Browser logs: `artifacts/material-parity/sort-focus-border-1592ce3.log` and
`sort-focus-border-1592ce3-repeat.log`. Machine evidence, log hashes, complete
authored input, resolved styles and measurements are checked in as
`material-sort-focus-border-public-proof.json`.

Runtime: installed AstylarUI 0.2.0, Angular 20.3.29, Babylon 8.56.2,
Headless Chrome 152, DPR 1, 400×200 CSS-pixel surfaces. The Angular test build
compiled the new TypeScript successfully. Existing warning NG0914 reports
zoneless change detection while Zone.js remains loaded by the test polyfills.
First run: 1.012s / 0.986s Karma elapsed/executing; repeat: 0.946s / 0.921s.
These durations exclude compilation.

Evidence and inventory checks: **6/6 passed**, 532.762ms. Negative controls
reject erased failures, missing records, changed dimensions, altered border
requests, incorrect DPR and concealed content displacement.

No core, plugin or canonical comparison fix was made. No canonical discrepancy
was reclassified by this standalone reduction. Full audit acceptance remains
outstanding.
