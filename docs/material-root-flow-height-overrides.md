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
