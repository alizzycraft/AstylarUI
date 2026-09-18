# Gap-review historical conservation failure

## Retained failing baseline

The full 120-file audit harness launched at `9933ac1` reports failure 111 in
`tests/material-parity/gap-review-canonical-integration.spec.mjs:72`:
`all unrelated complete findings unchanged`. The failing test duration is
282,481.064ms. It reaches this assertion after passing original input and
ordered scalar conservation, 36 reviewed gap groups / 1,838 observations, and
the 1,902-observation gap-input coverage assertions (including 64 unresolved
motion observations).

The test compares the current builder with
`3ebcff3e8f7bdfe7ecd9e00a4c2acbd11fefdc4a`. The main-builder commits since that
baseline are:

- `175956e134be5f074eb826ec606f2fa066532b82`: bounded motion/scalar gap reviews.
- `7feb4fbe63052acf896057b68522e6e3a5dd9e57`: later source-bound caret reviews.

These commits identify candidates for investigation, not permission to waive
changed records. The earlier explicit-gap diagnostic covers a different test
population and cannot substitute for this investigation.

## Diagnostic boundary

```powershell
node --max-old-space-size=2048 scripts/diagnose-material-gap-review-conservation.mjs
```

The diagnostic loads the original test from
`f5285a47025a303a14bf7ad30181abdc9f31363e`, inserts evidence checks immediately
before the failing assertion, and proves that removing the insertion recovers
the exact original source. Import relocation is checked statement-by-statement
through the TypeScript parser. The original failed comparison stays in place.

The insertion independently validates the selected gap input/classification
coverage and the complete committed caret proof plus its selected original
source population. It permits only the exact later caret signatures returned
by that authenticated proof, disjoint from the original reviewed gap groups.
Any other changed unrelated record causes diagnosis to fail.

Each changed record must retain its full ordered scalar tuple and every
raw/authored field, previously be unresolved, and change only review metadata.
The shared caret verifier separately rejects fabricated input/rendering/core
claims and preserves complete pending caret records. Every other complete
record is compared. Both unresolved dialog motion-gap records must remain
identical, unresolved, and total exactly 64 observations.

Successful diagnosis intentionally still ends at the original failing
assertion. It is not a corrected-test pass, a renderer fix, canonical input
equivalence, or complete current harness acceptance.

## Result

The diagnostic completed with all added evidence checks passing, then failed
at the unchanged original assertion: **one test / zero pass / one retained
original failure**, exit **1**, no skipped/cancelled/TODO tests. Test duration
was **415,387.1517ms** and total reported duration **415,406.8843ms**. This is a
successful diagnosis of a retained failure, not a passing integration test.

| Evidence | Verified result |
| --- | ---: |
| Original selected cases | 676 |
| Ordered scalar rows, unchanged | 2,173 |
| Original gap-review groups / observations | 36 / 1,838 |
| Original gap-input observations | 1,902 |
| Pending dialog motion groups / observations preserved | 2 / 64 |
| Later changed caret groups / observations | 32 / 796 |
| Pending caret observations preserved | 155 |
| Remaining complete rows, unchanged | 2,105 |

Every changed row has attribution `reviewed-motion-caret-observation-stage`.
The changes affect badge-count; bottom-sheet, core, dialog, menu, progress-bar,
progress-spinner, snackbar and tooltip primary owners; all three button owners;
card-open; and toolbar-action, with distinct value groups where present. The
machine report retains each exact owner/value/case/state record and both
complete-row digests.

Only `justification`, `recommendedOwner`, `attribution`, `reviewEvidence` and
`reviewedCases` changed. Raw values, authored evidence, occurrences, ordered
case/state membership and the classification field itself are unchanged. The
original gap population is disjoint from the authenticated caret changes.

The failure is therefore an outdated historical integration-test assumption:
it expected complete unrelated metadata to remain unchanged after a later,
independently verified caret review. It is not a demonstrated gap input,
authorship, or scalar regression. This establishes the second failure's cause
independently of the smaller explicit-gap diagnostic.

Machine evidence:
[material-gap-review-later-conservation.json](material-gap-review-later-conservation.json).
Proof SHA-256:
`4f6f68fc2828a678d468d4761f756f3092e02e365298d309ef5e0704dbbc74c2`.
Frozen test source SHA-256:
`6a816fef95f25c39b513595b27bff89fcbc758f5a2b4c5e115e37a3d986c3d3c`.
Complete unchanged-row-array SHA-256:
`e778dbd5ecca5dcd92e135ea75089295d84a5aaa563f5b5550cf0d0195e9203c`.
Log: `artifacts/material-parity/field-host-flow-input-audit/gap-review-later-conservation-diagnostic.log`,
SHA-256 `df48873f35ea75c67366fcbd9c5016a31baeb998c031cd20899595c4db215011`.

## Required correction boundary

Any correction must preserve the frozen historical baseline
and the original 36-group gap review assertions; authenticate only the exact
later caret population; conserve every raw/scalar/authored field; preserve the
64 unresolved motion observations and 155 pending caret observations; and
compare all 2,105 remaining complete findings. Do not exempt a whole property or family, accept
an arbitrary new checksum, or reinterpret the original failing run as passing.

The original selected test and production audit builder remain unchanged while
the 120-file run continues. Final acceptance still requires the current complete
harness and the separate enforced parity matrix.
