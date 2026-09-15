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

## Canonical pipeline integration (report regeneration pending)

The canonical builder now collects the independently bound wrapping evidence,
retains it in the machine report and invokes the classifier only after existing
attributions have had precedence. Validation independently reopens the original
capture and checks every classified property's exact case/state population.
The human report and focused-proof inventory state the same limited claim.
Six dependencies/proofs are added to the source inventory (156 to 162); none of
the original 156 entries is removed.

The initial production test correctly failed (1/2 passing, 23,664.9811 ms): its
unbound comparison also disabled the older candidate-only tooltip attribution.
That was an invalid test baseline, not evidence that wrapping replaced the old
classification. The corrected test loads the actual committed pre-integration
pipeline at `65487aeba6a26f9715f302f92b4ee454161a94ef` with identical bindings.
Relative imports are relocated for execution, with statement-by-statement AST
checks that nothing else changed. The shared alias-mapping declaration is also
required to remain identical. It now proves exactly two groups / 36 observations
change attribution while every scalar projection and unrelated complete row in
the diagnostic population remains identical. All original tooltip states and
full trees are retained; only the target scalar owner is selected in this
separate diagnostic report. This does not substitute for full-report coverage.

```powershell
node --test tests/material-parity/tooltip-wrapping-source-binding.spec.mjs tests/material-parity/tooltip-wrapping-canonical-integration.spec.mjs
node --test --test-name-pattern='records source fingerprints and actual visual acceptance fields' tests/material-parity/input-equivalence-audit.spec.mjs
```

Results: **8/8**, zero failures/skips/cancellations, **30,509.0957 ms**; and
**1/1**, zero failures/skips/cancellations, **1,721.5844 ms**, respectively.
An earlier corrected integration-only run passed 2/2 in 27,698.477 ms.

The full-report conservation gate is
`node scripts/verify-material-tooltip-wrapping-integration.mjs`. Before report
regeneration it fails as expected at `0 !== 2`: the committed machine report
does not yet contain these attributions. It requires all 8,339 scalar rows and
8,337 unrelated complete rows to survive, exact original-source membership for
the two wrapping groups, only the intended summary changes, six added source
entries and exactly two changed existing source fingerprints. Do not claim
2,810 remaining attributions until regeneration and this gate actually pass.

The main audit module and its source-inventory test have changed. Historical
surveys/captures that compare those whole-file hashes against current source
will now require explicit provenance review or replay. Their stored hashes and
observations have not been silently refreshed. Final full-harness, canonical
no-write and enforced parity acceptance remain pending.

## Full-report regeneration and conservation verified

The subsequent canonical regeneration finished with exit 1 only for **2,810
unattributed groups**. Coverage remains 436/436 static and 1,875/1,875 interaction
cases, with 8,339 differences, 386,891 occurrences and 132 source findings.
Input equivalence remains false.

`node scripts/verify-material-tooltip-wrapping-integration.mjs` now exits 0.
Against the immutable pre-integration report at `65487aeba6a26f9715f302f92b4ee454161a94ef`,
it proves all **8,339 scalar rows** and **8,337 unrelated complete rows** unchanged.
The latter projection has SHA-256
`fb9f92a8d674363d6e7892c6e79be78bafc8bd80fff21ac17fbbdc555aa3fc53`.
Exactly two wrapping groups / 36 observations across 18 independently bound
owners change attribution. The source inventory retains all 156 prior entries,
adds the six declared dependencies, and changes only the main audit module and
its inventory test among existing entries. Current source digests are verified.

The regenerated compressed report SHA-256 is
`14de1c5cca7afb08f6295e38c735f7053676c1375d3842b43d79c3fec07b97ab`.
The complete canonical `--check` replay with the same original and supplemental
report paths as the command above is now terminal: exit 1 **only** for 2,810
unattributed differences. It confirms 436/436 static and 1,875/1,875 interaction
cases, 8,339 differences, 386,891 occurrences and 132 source findings. There are
no stale-report/source or source-binding errors. This validates that report
checkpoint, not the final full harness, enforced parity matrix, or resolution
of the remaining audit uncertainty.
