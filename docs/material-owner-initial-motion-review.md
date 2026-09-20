# Initial-style backlog: direct motion-target review

The [machine inventory](material-owner-initial-motion-review.json) revisits the
121 motion-only groups in the pinned generated-owner mapping survey. It replays
all 7,254 original property observations, authenticates their input trees and
checks each group's ordered diagnostic-proof digest against that earlier survey.
This is a historical review population, not a claim that all current unresolved
differences have been classified.

| Captured request review | Groups | Observations |
| --- | ---: | ---: |
| Every motion rule names targets disjoint from the audited property | 86 | 4,708 |
| Specific review still required | 35 | 2,546 |

The eight audited properties are `fontStyle`, `wordSpacing`, `textTransform`,
`whiteSpace`, `overflowWrap`, `wordBreak`, `pointerEvents` and `visibility`.
Explicit transition targets `none`, `transform`, `box-shadow`, `border`,
`opacity`, `color` and `height` do not directly name these properties or their
shorthands. The reviewer requires a target within each complete captured rule;
it does not combine rules into an invented cascade. Any animation declarations
must include an explicit `animation-name: none` in that same rule.

This establishes only what the captured requests name. It does not establish
that animations are inactive, candidate computed values equal browser values,
or motion has no indirect effect on layout, paint or descendants. CSSOM/Web
Animations state and external inheritance remain separate obligations.

## Preserved gaps and evidence

All 35 remaining groups concern chips (16) or tabs (19). Incomplete target
declarations, empty targets and animation metadata without a proved `none` name
remain rejected. Duration-only rules are not silently treated as harmless; no
missing target is converted to `none`.

The original diagnostic issues and declarations remain recorded in each shared
pattern. Per-capture revision values are stored with the observations rather
than duplicating otherwise identical patterns. Original input/proof hashes,
ordered case membership, preserved static cases and raw values remain intact.
No reference tree is rewritten, no issue is removed from the original proof,
and no canonical classification is changed by this standalone review.

Before canonical integration, join these results to the exact current unresolved
membership, retain prior classifications and separately prove the observation
stage being attributed. This review alone cannot justify an equal-input claim.

## Verification

`node --test tests/material-parity/owner-initial-motion-review.spec.mjs` passes
3/3 (exit 0, 31,026.3284ms), with no skips or cancellations. The complete replay
prohibits writes. Twenty-one mutation controls retain unknown/overlapping
targets, variables, resets, shorthand motion, named animations, incomplete
rules, provenance gaps and non-motion issues as review cases. An additional
control rejects applying this reviewer to `color`, outside its eight-property
scope. The original generation and focused-test log is
`artifacts/material-parity/field-host-flow-input-audit/owner-initial-motion-review-sep20.log`.

Run `node scripts/audit-material-owner-initial-motion.mjs --check` for freshness.
That check passed on 2026-09-20, followed by all four harness inventory/runner
tests (exit 0, 605.585ms, no skips or cancellations).
The report SHA-256 is
`f8f90799191604823875d849fb6ae56de46dd96c37e3f91c8d540bdd48916294`.
These are audit-evidence tests, not renderer fixes or full parity acceptance.
