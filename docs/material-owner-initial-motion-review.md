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

## Historical canonical membership cross-check

A read-only join on 2026-09-20 authenticated every compressed and decoded byte
of the accepted `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0` canonical payload,
then matched **all 121 groups / 7,254 observations** to its unresolved rows.
The comparison uses the independently bound production normalization functions,
requires a unique family/element/property/value/omission match, and verifies
exact occurrence counts, ordered captured case samples and unique complete
source memberships. Each joined result retains the complete canonical-row hash
and ordered full-case hash. The 86 directly disjoint groups account for 4,708
observations; the other 35 groups remain review cases.

The diagnostic exited 0. Its full machine output is retained at
`artifacts/material-parity/field-host-flow-input-audit/owner-motion-historical-membership-sep20.log`
(raw SHA-256 `6ee7c151623f4814baf147113f6cb183252ee67526c18190c2e146defb44f25e`).
A separate identity comparison found no overlap with the 72 saved alignment/font
transition groups. This check reuses the hash-authenticated motion review; it
does not freshly replay its source proofs, join the still-generating current
canonical payload, establish classification eligibility, or change a canonical
row. Those remain prerequisites for integration, not consequences of membership.

## Source-replayed attribution proposal

[The proposal](material-owner-motion-attribution-plan.json) now freshly replays
the complete original motion review and authenticates the entire frozen canonical
payload at `67db724`. It proposes **86 groups / 4,708 observations** as
`parity-harness-defect`: browser-computed initial values are compared with
omissions in candidate local declaration stages. The captured reference motion
targets have been independently reviewed as disjoint from the audited property.
This does not supply missing candidate computed values, certify external
inheritance, or waive indirect motion effects, layout, paint or interaction.

All **35 groups / 2,546 observations** still requiring specific review remain
explicitly retained. The proposal records original complete-row and proof-group
hashes, full ordered case membership, observation digests and preserved static
cases. The other **8,253 complete rows** have ordered digest
`f9eeb1626d403c169d07d1defc99ca08eda122e7c92659c78a95c9ee1814d816`.
No canonical row or count is changed by generating this historical proposal.
Integration must still compare against the accepted current canonical population.

Verification:

```text
node --max-old-space-size=1536 scripts/audit-material-owner-motion-attribution.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/owner-motion-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The final generation exits 0 and the complete test run passes **7/7**, exit 0,
**119,880.7958ms**, no skips, cancellations or TODOs. It includes 32 rejection
controls and a complete source/payload freshness replay with writes prohibited.
Proposal SHA-256:
`fd25668197bd401d1aa806a802c1655ac4315bfa177ca705c8acb4eaf3e98eda`.
Logs are `owner-motion-attribution-generation-retry-sep20.log` and
`owner-motion-attribution-full-sep20.log` in the existing artifact directory.

Initial failed attempts are retained too: the small test fixture first omitted
the static-state key, and the first full generation compared raw `0px` directly
with canonical `0` for word spacing. The final checker uses the already bound
production normalization function for that stage comparison; captured raw values
and source proofs remain unchanged. The positive test explicitly covers this
representation difference before exercising rejection controls.

The subsequent read-only current-payload join also completed with exit 0. It
authenticates generated payload `c08d24e9...a810e` and compares every proposed
and retained group object, including complete-row hashes, against the verified
historical proposal. All 86 proposed and 35 retained objects are unchanged;
the 125-group alignment integration did not consume or relabel them. Current
unresolved count remains 1,835. The other 8,253 current rows have ordered digest
`c7530e5f1f61087dfb0896f3d10502db3f210236348026ecde591ddea8d075ac`.
Log: `owner-motion-current-membership-sep20.log` (SHA-256
`31b6aafb1193ff793897d015bf2c678d8210437094ead10fd8b9301ffa6d74c1`).
This scoped join does not freshly replay the source proof or replace the pending
all-row conservation and CLI freshness checks for the canonical integration.
