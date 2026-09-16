# Root formatting context with repeated height-only rules

This audit-only supplement closes a specific evidence gap in the existing
shared demo block-to-flex finding. It does not change the canonical classifier,
renderer, fixtures or output thresholds.

## Why these cases remained unresolved

`classifyReviewedRootFlowDependency` in
`tests/material-parity/input-equivalence-audit.mjs` requires exactly one
candidate rule with the root ID selector. Button and toolbar cases have a
second responsive height-only rule; 26 paginator cases do too. The strict guard
therefore leaves nine direction/gap groups unresolved, although the additional
rules do not request any formatting-context property.

Source: `examples/material-showcase/src/app/astylar.component.ts:480` authors
`display:flex; flex-direction:column; gap:16px` for the shared root. Lines
481–486 add family/density-specific heights under `mediaMaxWidth:500px`.
`examples/material-showcase/src/app/reference.component.ts:106` leaves the
reference `.demo` section in block flow, with no flex direction or gap request.
The formatting substitution is present in initial showcase commit
`2f440115740ff76fa9e55b3f4a11568207b2af5a`. This supplement does not claim when
or why each responsive height adjustment was introduced.

## Complete affected-family evidence

The machine report `material-root-flow-height-overrides.json` covers all **164
original cases** across button, toolbar and paginator, retaining the original
report hash and all 328 tree descriptors:

| Population | Cases | Direction/gap observations |
| --- | ---: | ---: |
| Repeated root selector with a height-only override | 138 | 414 |
| Single-root-rule controls | 26 | 78 |

Every observation proves a unique section/frame/page mapping, agreement of all
89 reference scalars with its full-tree owner, absence of reference formatting
requests, one unconditional candidate formatting rule, and exact normal,
interaction and comparison-stage joins. All possibly applicable candidate
formatting rules are checked, including state selectors and reset shorthands.
Each extra root rule is constrained to the captured selector, a 500px media
boundary and one height declaration. The scalar collector's media-metadata
omission is handled by an explicit join to the retained full-tree rule—not by
discarding the repeated rule or inventing whether it applied.

The first input divergence remains **authored block-to-column-flex substitution**:
reference direction/gaps `row / normal / normal` versus candidate
`column / 16px / 16px`. These are application-authoring differences. The result
does not verify responsive heights, used geometry, child placement, paint or
rendering equivalence. A one-child composition hiding the gap visually does not
make these layout requests equivalent.

## Verification

```powershell
node scripts/audit-material-root-flow-height-overrides.mjs
node --test tests/material-parity/root-flow-height-override-evidence.spec.mjs
node scripts/audit-material-root-flow-height-overrides.mjs --check
```

Generation and no-write replay exited 0. Tests passed **2/2**, zero failures,
skips or cancellations, in **1,507.9713 ms**. All original proofs replay and seven
source fingerprints are checked. Fourteen rejection controls cover competing
gap/direction/reset requests, additional unreviewed declarations, altered media,
state/universal rules, duplicate owners, changed local stages, reference or
inline requests, missing scalar rule receipts and source/scalar corruption.

## Next steps and ownership

Bind this supplemental evidence into the canonical classifier only after
production-precedence and complete-row conservation checks. Keep the already
classified single-root controls unchanged and preserve every other property,
especially height. The canonical count remains **2,810** until that integration.

The eventual implementation should restore equivalent block-flow authoring
alongside the general core fixes required by existing public reproductions.
Do not replace these values with different tuned gaps or responsive heights.
Reuse the existing DPR 1/2 block-versus-column-flex sensitivity proof and the
independent intrinsic-height/anonymous-flex core reproductions; this supplement
does not turn those prior diagnostic results into whole-showcase acceptance.

## Original-source binding prepared

`root-flow-height-source-binding.mjs` independently reopens the original report,
checks its complete button/toolbar/paginator population against the caller, and
hash-checks both original trees for each case. All **164** owner proofs are
retained, including the **26 single-rule controls**. Only the **138** repeated-rule
owners are eligible for the new attribution; their three properties form nine
groups / 414 observations. The single-rule controls are deliberately ineligible
so their existing canonical classification can retain precedence.

Validation separately replays the complete source and requires exact
owner/state/value coverage for every new classification. Negative controls
reject lost controls, altered height-rule receipts, caller-selected populations,
missing scalar owners, forged provenance and height/raster overclaims. No height
property can receive this direction/gap attribution.

```powershell
node --test tests/material-parity/root-flow-height-source-binding.spec.mjs
```

Result: **4/4 pass**, zero failures/skips/cancellations, **16,758.6465 ms**.
The focused test uses a local explicit expansion of captured `gap:16px` into
the two axes; it does not establish production normalization or precedence.
Canonical integration and complete-row conservation remain required. Original
reports, all captured declarations and renderer behavior are unchanged.

## Production integration proof

The main audit now retains and independently validates this source binding,
and consults its classifier only after all earlier classifications decline.
The actual prior production module at c391a6f supplies the comparison baseline;
normalization and shared mappings remain unchanged. The combined authoring
integration proof retains all 164 original root-family cases and requires all
nine new direction/gap groups (414 observations), the 26 single-rule controls,
unchanged raw scalar projections and unchanged unrelated complete records.
Source-loss, missing-row, lost-case and false-equivalence mutations are rejected.

`node --test tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs`
passes **2/2**, zero failures/skips/cancellations, **737,618.2584 ms**. This is
diagnostic production-classifier evidence, not used-layout or height verification.
Complete canonical regeneration and its independent conservation gate remain
pending; no canonical input or renderer behavior has been edited.

## Complete canonical conservation verified

Full regeneration retains all 2,311 original cases and now classifies exactly
the nine reviewed root-flow groups / 414 observations. All 26 single-rule
controls keep their prior classifications. The independent combined conservation
gate (`node scripts/verify-material-reviewed-authoring-integration.mjs`) exits 0:
all 8,339 scalar projections and 8,222 records unrelated to this flow/radius
increment are unchanged, and only the 117 planned attributions differ.

The canonical unresolved count is **2,657**; input equivalence remains false.
Regeneration exits 1 solely for that remaining count. Full no-write replay and
final acceptance are pending. This verifies source-backed classification, not
responsive height behavior, candidate used layout, or original raster cause.
