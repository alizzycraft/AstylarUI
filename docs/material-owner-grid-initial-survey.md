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
No canonical attribution is changed.

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

## Ownership and implementation order

The immediate owner is input-audit observation-stage classification, not the
grid renderer. First establish correspondence and exact authored requests;
then separate local inspection omissions from used-grid evidence. Keep explicit
layout substitutions and grid-list authoring discrepancies visible. Where
equivalent authored grids demonstrably diverge, reduce the case to the core
layout boundary before proposing any general implementation change. Do not
rewrite grid fixtures into positioned cells or add plugin-specific placement
as a consequence of this survey.
