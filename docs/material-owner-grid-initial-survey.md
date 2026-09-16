# Owner grid-template observation-stage audit

This is audit evidence, not a renderer fix or a grid-equivalence claim.

## Question and boundary

The canonical audit contains 160 unresolved `gridTemplateColumns` /
`gridTemplateRows` groups. A browser-computed `none` compared with an absent
AstylarUI local inspection field does not, by itself, demonstrate an authored
input difference or a core layout defect. Conversely, omission must not be
silently replaced with a presumed computed `none`.

The [machine survey](material-owner-grid-initial-survey.json) reopens the
original scalar inputs and paired trees. It records only whether the captured
owner's declarations support the narrower observation-stage description
`captured-none-versus-local-omission`. Its computed-candidate, grid-layout and
rendering-equivalence flags remain false, including for positive observations.
The standalone survey changes no canonical attribution. The production integration
below now consumes independently bound evidence; the saved full canonical report
has not yet been regenerated.

## Production integration and conservation

### Full canonical conservation verified

The complete regeneration finished with exit **1**, solely because **2,495**
resolved-style groups still lack root-cause attribution. It retained all
**436/436 static** and **1,875/1,875 interaction** cases, **8,339** scalar groups,
**386,891** occurrences and **132** source findings. Input equivalence remains
false; this is not acceptance or a renderer fix.

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
node scripts/verify-material-grid-integration.mjs
```

The independent conservation command initially rejected the preceding saved
report (exit 1, zero versus 100 required grid groups). Against the regenerated
report it exits **0**. Relative to the actual saved report at `9a60909`, all
**8,339 scalar records** and **8,239 unrelated complete records** are unchanged.
The latter records retain SHA-256
`de91923052b1af91e8895f07831fd5a6c87dbbe8f4e0451ec4b9b98db57c8d2c`.
Exactly 100 groups / 6,226 observations gain the bounded observation-stage
attribution. Their original authored examples remain intact. The entire grid
ledger is replayed from all 2,311 original captures, retaining all 13,824 eligible
observations and all 2,856 review gaps. Earlier non-grid evidence remains exact.

Source membership is 196, with precisely nine new grid dependencies and four
changed earlier fingerprints: audit builder, its test, the independently
replayed field-host initial-style index and the slider integration test. No
previous source is removed. Summary conservation permits only the 100-group
reduction in unresolved attribution; no classification totals or equivalence
flags are changed.

The human report is conserved in order after accounting for two added grid
evidence lines, one unresolved-count line, and independently checked source-line
movements. One slider reference moves by two lines and 34 main-test references
move by ten lines; their target source lines match the earlier committed source
at `43452db`. The resulting unchanged ordered text has SHA-256
`501ea98794d1bfd2b90712b7605f3117f65f869462ad5a59c687e2cf57345f22`.

Saved gzip: **51,021,493 bytes**, SHA-256
`179a46186cb9ab0d20fa0ac241c578e64f2754614ae0e47b19d7ec683d2b4258`.
Decoded payload: **1,916,451,099 bytes**, SHA-256
`2b87d96d29d930e3b893e4f025afbebaf0fded9f8b14f36bf7fd8ad02da34bff`.
The complete no-write `--check`, current 80-file harness and final enforced
comparison matrix remain required. Conservation is not candidate computed-grid,
used-layout or raster proof.

### Complete no-write replay

The complete generation command above, with `--check` appended, has now finished
with exit **1**, solely for **2,495** unresolved resolved-style differences.
There is no source-fingerprint drift, decoded saved-report mismatch or human
report mismatch. It replays the same complete 436 static / 1,875 interaction
capture, 8,339 groups, 386,891 observations and 132 source findings. All 196
fingerprinted dependencies were held unchanged, and the saved payload retains
the compressed and decoded digests recorded above. This verifies report
reproducibility, not input equivalence, renderer correctness, the complete
current test harness or the final enforced comparison matrix.

### Diagnostic integration history

The production builder now retains the complete source-bound grid ledger and
applies the grid observation-stage classifier only after every earlier
classification. Validation replays original tree evidence and exact scalar
coverage, including negative observations and earlier non-grid precedence.
No candidate computed `none` is synthesized. Source inventory grows from 187 to
196 files, adding all nine grid evidence, binding, classification, coverage and
integration sources without removing an existing dependency.

`node --test tests/material-parity/owner-grid-initial-canonical-integration.spec.mjs`
first failed before integration (0/1 passed, 25,167.4791ms): the real production
builder did not attribute independently reviewed grid observations. The test
loads the actual prior builder from `364f46a309319201317919b6a23dd1aadd08f405`,
verifies unchanged normalization/template mappings, and changes only its relative
import locations. It retains all scalar inputs in 36 static cases (every family)
and 74 representative interaction cases from the original capture.

After integration it passed 1/1 (116,142.5656ms). A final replay including the
additional false-summary-equivalence rejection passed **1/1**, exit 0,
**138,661.0266ms**. Its 683 eligible observations include review gaps. It adds
100 groups / 240 occurrences in this diagnostic population, preserving all
6,423 scalar rows and 6,323 complete unrelated records with SHA-256
`9fe0caab68908fa3f3a926e21d4267947f3fb6a771e2b3f86ded21b649e482a5`.
Four negative controls reject missing binding, a lost negative observation,
fabricated grid-layout equivalence and fabricated summary input equivalence.
This is not the full 2,311-case canonical conservation gate.

The existing slider integration exposed a second historical conservation failure:
the original expected digest remained
`4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee`,
while the new complete rows produced
`38e27c5fdd6dc5bc5401db8d2ad7b69200598b275cbeb2e040481027a0ce6a41`.
The exact difference is six new grid observation-stage rows: columns and rows
on `slider-primary`, `slider-start` and `slider-visual`, each covering the same
two original cases. The test now validates those exact identities, values,
case lists, 16-observation ledger and false equivalence flags before projecting
only those six rows back to their prior unresolved records. The original
220-row checksum is unchanged, not replaced or broadly filtered.

`node --test tests/material-parity/slider-border-canonical-integration.spec.mjs`
then passed **4/4**, exit 0, **13,912.6353ms**, including four new full-validator
negative controls. The source-fingerprint assertion also passed in the earlier
two-test diagnostic command; that command correctly exited 1 for the slider
checksum failure. No renderer, plugin or canonical comparison input was edited.
Full canonical regeneration/conservation and the complete current harness remain
required. Current discovery contains 80 files; no focused result replaces that
complete run or the enforced comparison matrix.

## Complete classification coverage and precedence checks

`owner-grid-initial-coverage.mjs` now independently reopens the hash-bound
original scalar capture and checks every eligible owner/property in original
order, including all 2,856 gaps. It matches case, family, profile, viewport,
state, owner/property identity and the complete input digest before constructing
expected classification coverage. Source paths are restricted to the real
Material artifact directory. Duplicate cases, owners and earlier proofs fail.

The earlier non-grid classifier retains precedence: **74 existing groups /
4,742 observations** are checked alongside the proposed **100 additional groups /
6,226 observations**, not excluded from conservation. Every classified row must
retain exact values, evidence, justification, owner, complete reviewed cases,
sample cases, states and occurrence counts. A changed attribution cannot opt a
row out of checking. This validator must be used with the existing full grid
tree/declaration replay and non-grid inventory validation; scalar coverage alone
does not prove those declarations or candidate computed layout.

```powershell
node --test tests/material-parity/owner-grid-initial-coverage.spec.mjs
```

Terminal exit **0**, **3/3 pass**, no skips or cancellations,
**39,511.4537ms**. The test reuses the committed canonical non-grid rows, rebuilds
their proofs from all original trees, and checks direct and JSON-round-trip
validation. Ten row mutations, six evidence mutations and two earlier-proof
controls reject lost/duplicated coverage, attribution substitution, altered
values, invented equivalence, dropped negative observations, changed provenance,
reordered observations and missing/duplicate prior proofs. Diagnostics remain
bounded rather than serializing the whole capture on failure.

This is a verified standalone prerequisite, **not production integration**.
The canonical audit remains unchanged at 2,595 unresolved groups. Actual builder
integration, full unrelated-row conservation, canonical regeneration and full
acceptance remain required.

## Provenance and coverage

- Original report: `artifacts/material-parity/current-ancestry-audit/latest-report.json`.
- Original SHA-256: `b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.
- All 2,311 original cases are inventoried: 436 static and 1,875 interaction.
- 13,824 eligible property observations across 233 groups and all 36 families.
- 10,968 observations have a reviewed local omission; 2,856 remain review gaps.
- 174 groups have no gaps **within this survey's eligibility boundary**.

Every observation includes case, family, profile, viewport, state, full scalar
input digest, property, owner mapping and declaration-review result. All cases
retain their paired-tree descriptors and selected input digests, including
cases without an eligible property. Tree file bytes are checked against their
captured digests before use. Source fingerprints cover the generator, inspector,
focused test and shared conservative selector evaluator.

The inspector checks unique owner correspondence, reference/candidate types,
every reference scalar and all three candidate style stages against the trees.
It inspects inline declarations, raw inline attributes, reference owner rules,
potentially applicable candidate rules and candidate inspection stages. Explicit
grid/reset requests, motion declarations and uncertain mappings are not accepted
as omission evidence. Unknown candidate selectors remain potentially applicable;
they are not discarded to obtain a positive result.

## Retained gaps and next actions

| Gap | Observations | Required follow-up |
| --- | ---: | --- |
| Motion declaration requires review | 1,920 | Trace the actual animated/transitioned properties and state; do not assume motion cannot affect the grid request. |
| Explicit grid or reset declaration | 52 | Review `grid-list-primary`: candidate columns are `1fr 1fr`, so its omitted rows cannot establish equivalent grid authoring. |
| Uncertain owner mapping | 884 | Prove the actual corresponding owner instead of guessing an alias or wrapper. |

Mapping gaps include badge count, paginator size/range, stepper content,
bottom-sheet overlay/panel/dismiss/copy, dialog panel, snackbar overlay/surface
and tooltip popup. This survey does not resolve the separate overlay mapping,
positioning or clipping investigations.

An exploratory join to the unchanged canonical payload
`de4473ec4d60f3707a8d71c802efd7e0bf612565f9a73e75acd017944d91b221`
found 159 of its 160 unresolved grid-template groups in the eligible survey;
their occurrence counts matched. The remaining group is the explicit
`grid-list-primary` columns difference (`none` versus `1fr 1fr`), intentionally
outside eligibility. An initial assertion that all 160 would be eligible failed
on that group; eligibility was not broadened to hide the failure.

Of the 159 joined groups, 100 groups / 6,226 observations have no review gap.
This is a scoping result, **not 100 new canonical resolutions**. Integration
still requires exact per-case source binding, precedence/conservation checks and
a classification justified at the observed stage. The canonical count remains
2,595 unresolved groups. The survey's 174 positive groups also include groups
already classified by other evidence and must not be counted as new findings.

## Browser controls and limits

Real Chrome 152.0.7977.76 controls run at DPR 1 and DPR 2. A non-grid child with
omitted templates and one with explicit `none` both compute `none`; changing the
parent's templates leaves those children unchanged. An explicit `inherit` child
does follow the parent's changed templates. This tests why these non-inherited
properties are reviewed at their owner rather than attributed to unrelated
ancestor grid formatting.

A separate implicit grid has no authored template but computes columns `100px`
and rows `18px` in this control. Thus browser computed/used serialization cannot
be equated with a missing authored declaration. These are browser-only controls:
they do not synthesize AstylarUI computed values or prove its track solver,
structure, paint or plugin layout correct.

## Verification

`node --test tests/material-parity/owner-grid-initial-evidence.spec.mjs`
finished with exit 0: **4/4 passed**, 14,869.905ms. This includes a full original
capture replay, eleven negative mutation controls, an unrelated-rule control,
and the two real-browser controls. Mutations cover wrong values, stage/source
substitution, duplicate identity, grid shorthand, resets, unknown selectors,
state rules, motion and raw inline declarations.

`node scripts/audit-material-owner-grid-initial.mjs --check` finished with
exit 0 and reproduced the complete saved survey without writing it.

The earlier two-test run (before browser controls) passed 2/2 in 12,886.1185ms.
The previous generator handle was no longer available and no generator process
was live on recovery; the successful fresh no-write replay above is the verified
result, rather than an inferred exit status for the lost handle.

The existing full audit harness was launched with 73 files before this survey
and the button-box input test were added. Its results do not cover these two
new files. Current discovery includes 75 files (67 Material plus eight general
and TTS). The next complete run must include that full inventory. This increment
does not change any source or survey consumed by the live 73-file run.

## Original-source binding and scalar joins

`tests/material-parity/owner-grid-initial-source-binding.mjs` now binds the
survey to its original report rather than trusting a copied proof. It compares
the caller's complete case/eligible-input population with the reopened source,
checks unique case and selected-owner/property identities, resolves source paths
inside the real Material artifact directory, and reopens both digest-checked
trees for every case. The resulting captures, observations and groups exactly
match the durable survey, including every negative observation. Validation
reconstructs the full ledger and rejects deletion of gaps, altered case coverage,
changed digests and invented equivalence flags. This is property-input binding,
not a claim that independent control-state or raster evidence was reviewed.

The initial focused execution terminated with a native V8 allocation/check
failure: exit 1, zero passing tests, 209,826.7647ms. A separate PowerShell command
also encountered a CLR error, and the concurrent full harness recorded several
allocation crashes. The exact initiating cause of the new test's native crash
is not proven. Do not describe this as a diagnosed renderer or grid failure.

To prevent a rejected large caller population from expanding into an enormous
assertion message, the binder uses `isDeepStrictEqual` plus a bounded assertion
message instead of asking `assert.deepEqual` to format both full populations.
An isolated replay then matched all 2,311 captures, 13,824 observations and 233
groups. The subsequent complete focused execution finished with exit 0:

`node --test tests/material-parity/owner-grid-initial-source-binding.spec.mjs`

**3/3 passed**, 207,751.714ms. This includes nine changed-population controls,
unbound/out-of-artifact source controls and ten full-ledger mutation controls.
The crash remains part of the record; the rerun does not retroactively turn it
into a passing result.

After adding an explicit assertion that rejected caller populations produce
messages shorter than 400 characters, the targeted command
`node --test --test-name-pattern="changed caller eligibility" tests/material-parity/owner-grid-initial-source-binding.spec.mjs`
passed **1/1**, exit 0, 24,573.6367ms. The complete 3/3 run above preceded only
this additional test assertion; no binder implementation changed afterward.

`tests/material-parity/owner-grid-initial-classification.mjs` provides a separate
scalar join for a source-validated observation. It accepts only the exact
property/input digest, reference `none`, candidate omission in all three stages,
reviewed mapping/types/display, inspection provenance and bounded false claims.
Its classification is `parity-harness-defect` with attribution
`reviewed-owner-grid-template-observation-stage`; it is not input or renderer
equivalence. The complete source validator remains mandatory, not replaceable
by this scalar join.

`node --test tests/material-parity/owner-grid-initial-classification.spec.mjs`
finished with exit 0: **2/2 passed**, 1,638.9712ms. All 10,968 positive and 2,856
negative outcomes are checked against original scalars. Fourteen proof mutations,
three property/value controls and three explicit-stage controls reject detached
or inflated claims, including a recomputed digest over an explicit declaration.

At that earlier verification point neither module was integrated into the canonical builder. Production
precedence, complete classification coverage and unrelated-row conservation
remain required before updating the canonical result. No renderer, plugin,
reference or existing canonical survey dependency changed. Current complete
test discovery now contains 77 files (69 Material plus eight general/TTS).
The earlier 73-file suite finished with 777 passes / 19 failures; it cannot
establish coverage of the four later additions. Its failures are recorded in
the [complete harness review](material-audit-harness-coverage.md#first-complete-run-failed).

## Ownership and implementation order

### Existing core failures remain authoritative

Reuse the earlier public-API grid reductions rather than treating this survey
as their replacement. `examples/material-showcase/src/app/grid-template-initial-audit.spec.ts`
(history `5baf74b`, expanded by `77b2098`) contains the equal-input active-grid
`none` cases and omitted / `1fr` / literal controls, plus two-child block/flex
controls. The existing finding in `tests/material-parity/input-equivalence-policy.mjs`
records four explicit-`none` failures: the candidate assigns zero CSS track
extent before projection while the browser stretches the item to 120/240px.
That demonstrated core parser/implicit-track defect is not explained away by
an observation-stage omission review.

The separate grid-list substitution is already recorded as
`fixture-grid-list-missing-reference-gutter`, introduced with the original
showcase in `2f44011`. The reference uses positioned tiles with percentage
`calc` widths/offsets and a 1px gutter; candidate `.grid-list` at
`examples/material-showcase/src/app/astylar.component.ts:683` uses fractional
tracks and zero gap. The corresponding paired reductions remain in
`examples/material-showcase/src/app/input-equivalence-proof.spec.ts:172`.
Existing evidence distinguishes direct expression support, successful loaded-CSS
expression resolution and an independent opposing-inset/inner-height defect.
Do not rerun or rewrite these completed investigations merely because this
survey finds their related scalar column difference still awaiting a source
link in the canonical classifier. The next action is exact evidence binding,
not a new fixture-side grid approximation.

The immediate owner is input-audit observation-stage classification, not the
grid renderer. First establish correspondence and exact authored requests;
then separate local inspection omissions from used-grid evidence. Keep explicit
layout substitutions and grid-list authoring discrepancies visible. Where
equivalent authored grids demonstrably diverge, reduce the case to the core
layout boundary before proposing any general implementation change. Do not
rewrite grid fixtures into positioned cells or add plugin-specific placement
as a consequence of this survey.
