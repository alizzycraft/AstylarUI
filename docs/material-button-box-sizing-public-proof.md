# Native button box sizing: bounded public proof

The native button's missing local `boxSizing` snapshot field is **not sufficient
evidence of a used-size defect**. Six independent, equal-input public browser
cases produce the same final border boxes as HTML. This does not establish
Material input equivalence or resolve its intrinsic-width authoring discrepancy.

## Question and first-stage distinction

The original Material button reference has `box-sizing: border-box`; the
candidate's local snapshot omits the field. Unlike a computed browser style,
that snapshot does not necessarily expose the rule consumed by layout.
`src/app/services/dom/elements/element-dimension.service.ts:312` preserves
declared dimensions as border-box sizes by default and adds padding/border for
explicit `content-box`. The native browser button also defaults to border-box.
This source observation motivated a public-path measurement, not a blanket
normalization of missing values.

The separate diagnostic spec is
`examples/material-showcase/src/app/button-box-sizing-input-audit.spec.ts`.
It mounts through the package-root `Astylar` API. One authored rule source feeds
HTML CSS and SiteData; no candidate-only compensation is present. It tests
omitted, explicit border-box, and explicit content-box at two declared widths,
with 44px height, 6px/14px padding and 2px borders. A 400x180 surface at DPR 1,
Arial 16px/20px, reference font readiness and `surface.whenSettled()` define the
measurement context. Final projected mesh bounds are converted to CSS pixels
only for output measurement, never fed back into layout.

| Authored width | Box-sizing request | HTML and Astylar border box |
| --- | --- | --- |
| 120px | omitted / border-box | 120x44px |
| 120px | content-box | 152x60px |
| 240px | omitted / border-box | 240x44px |
| 240px | content-box | 272x60px |

All six observed origins are (32,32), and all measured dimensions match exactly
in this run. Assertions allow less than 0.01px reference/expected error and
less than 0.5px candidate/reference error. They also check input preservation,
normal/effective style snapshots, no error diagnostics, and disposal of meshes,
materials and textures. Geometry is not proof of text raster, clipping or hit
testing.

## Verification and provenance

```powershell
npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/button-box-sizing-input-audit.spec.ts
node --test tests/material-parity/button-box-sizing-log-proof.spec.mjs
node scripts/audit-material-button-box-sizing.mjs
node scripts/audit-material-button-box-sizing.mjs --check
```

The recovered browser log ends **TOTAL: 6 SUCCESS** (Chrome Headless 152,
0.973s wall / 0.946s test time). The process handle was already unavailable on
recovery, so its exit code is not claimed. Log SHA-256:
`84df8d257e2675cd74fae88e242e63542203a30a4897ba3ee769b10132009245`.
The log contains the existing NG0914 warning: the Karma configuration loads
Zone.js while the test requests zoneless change detection.

The log reader initially failed its duplicate-count assertion (6 versus 12;
one passing and one failing test, 111.3737ms) because ANSI coloring interrupted
the literal prefix. It now removes terminal decoration before parsing and
compares repeated records rather than silently discarding contradictions.
The final reader tests pass **2/2**, no failures/skips/cancellations,
**104.3906ms**. Controls reject missing cases, failed test summaries, conflicting
duplicates, altered paired authoring, shifted geometry, incorrect style stages,
incorrect expected boxes and changed render size. Generation and no-write replay
both exit 0.

The checked-in `material-button-box-sizing-public-proof.json` retains all six
full observations, the twelve-record count, log digest, source/installed-package
fingerprints and versions (AstylarUI 0.2.0, Angular 20.3.29, Material 20.0.5,
Babylon 8.56.2). Baseline: `a576a81131977ceb974d433995379dc27b0da46e`.

## Disposition and remaining work

This is **bounded used-box equivalence despite local-style omission**, not a
renderer fix. It changes zero original Material classifications. Applying the
finding to original owners still requires reviewing their exact element type,
authored width/height, padding/border, local stages and sizing path. Auto and
intrinsic sizing, label composition, other native element defaults, clipping,
interaction and raster output remain outside this proof. The separate nine-group
Material fixed-width authoring mismatch remains an authoring mismatch even if
its resulting pixel width happens to match.

No renderer, canonical comparison, reference input, threshold or frozen report
dependency changed. Complete attribution, the full harness and final enforced
matrix remain required.
