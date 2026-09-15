# Tooltip wrapping: independently bound input evidence

This is an audit increment, not a renderer or fixture fix. The preceding
remaining-overlay ancestry review identified two unequal authored wrapping
inputs on `tooltip-popup` in 18 original hover/held captures:

| Property | Reference | AstylarUI |
| --- | --- | --- |
| `whiteSpace` | Computed `normal` | Explicit `nowrap` in the matched rule and all three local stages |
| `overflowWrap` | Active Material `overflow-wrap:anywhere`, computed `anywhere` | Neither `overflowWrap` nor public `wordWrap` requested along the captured owner path |

The source-bound collector reopens the original parity report and hash-checks
each paired full tree. It retains the **entire tooltip family population**, not
just the 18 positive cases. Exact scalar/owner/three-stage alias validation
precedes declaration tracing. Changed or caller-selected populations, duplicate
owners, missing source binding, mutated evidence and invented computed/raster
claims are rejected. The public `wordWrap` alias is checked explicitly so an
equivalent differently named request cannot be mislabeled as absent.

The classifier preserves the original values and labels these as
`application-plugin-authoring-defect`. It does not synthesize candidate computed
inheritance or claim the original tooltip displacement, blur, clipping or raster
is explained by wrapping. Original-state external ancestry and motion/settlement
remain separate obligations. The earlier history review and implementation
ownership remain in `material-remaining-overlay-ancestry-review.md`.

Verification:

```powershell
node --test tests/material-parity/tooltip-wrapping-source-binding.spec.mjs
```

Initial result: **6/6 passing**, zero failures/skips/cancellations,
15,279.8667 ms. The tests cover all 36 positive property observations, complete
original-source replay, exact classification population, source/owner/state
mutations and non-equivalence flags. Production normalization and classification
precedence require a separate integration proof; the initial binding tests use
identity callbacks deliberately. No canonical attribution count is changed by
this standalone increment.

After tightening the alias negative-control test to select its exact original
case key rather than a representative theme/state, the rerun also passed
**6/6**, zero failures/skips/cancellations, **15,202.7751 ms**.

## Existing canonical replay reached its terminal result

The no-write replay launched after `7ab9c62` finished with exit 1 **only** for
2,812 unattributed groups. It reported 436/436 static cases, 1,875/1,875 interaction
cases, 8,339 differences, 386,891 occurrences, 132 source findings and input
equivalence false. No stale-report/source or source-binding errors were emitted.

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit --check
```

This closes that replay obligation, not the whole audit. The recorded full
harness result remains 709/710 plus its separately passing metadata correction;
final full-harness and enforced parity acceptance remain required.
