# Explicit-gap historical conservation failure

## Retained failing baseline

The full 120-file audit harness launched from `9933ac1` reports failure 72 in
`tests/material-parity/explicit-gap-canonical-integration.spec.mjs:75`:
`all unrelated complete findings unchanged`.
The test had already passed its original raw-input hash, ordered scalar-row
comparison, 16 explicit-gap group / 1,032 observation coverage checks, and
explicit-gap authored-input/classification assertions.

It compares the current builder against
`3abdb781279462cd1ca1a78e8cf2b6cdc618f3b5`. Subsequent main-builder changes are:

- `7cc8e93c4c86b1890b139c02ea6ddd372b3ac36e`: explicit-spacing integration.
- `175956e134be5f074eb826ec606f2fa066532b82`: later motion/scalar gap reviews.
- `7feb4fbe63052acf896057b68522e6e3a5dd9e57`: later source-bound caret reviews.

History identifies candidates to investigate, not permission to accept every
changed row or replace a checksum.

## Exact diagnostic

```powershell
node --max-old-space-size=1536 scripts/diagnose-material-explicit-gap-conservation.mjs
```

The script loads the exact original failing test from
`285bf494b6803a875e66a62d97a0e6237b585cfd`. It inserts a diagnostic immediately
before the original conservation assertion, proves removing the insertion
reconstructs the original source, and checks AST equivalence around import-path
relocation. No canonical builder, original test, fixture, or production
renderer is edited.

The diagnostic independently validates the complete committed gap-review
proof and exact selected source population, plus the later caret proof and
its pending observations. It then requires each changed unrelated row to:

- Retain the complete ordered scalar tuple.
- Belong to an independently authenticated later review, disjoint from the
  original explicit-gap population and the other later review population.
- Previously be unresolved.
- Change only classification/review metadata, retaining every raw/authored field.
- Retain false input-equivalence, computed-candidate, rendering-equivalence,
  whole-element-equivalence, and renderer-cause claims.

Every remaining complete row is compared, not just its scalar projection or
hash. Pending caret records remain in that comparison. The original failing
assertion is retained, so successful diagnosis still ends with the original
test failure rather than a manufactured green result.

## Result

The diagnostic completed: **one test / zero pass / one retained original
failure**, exit **1**, with no skipped/cancelled/TODO tests. Test duration was
**209,139.6657ms**; total reported duration was **209,156.8861ms**. It emitted its
successful source-authenticated conservation evidence before failing at the
unchanged original assertion, with the same failure text as the full harness.

| Evidence | Verified result |
| --- | ---: |
| Original selected cases | 296 |
| Ordered scalar rows, unchanged | 892 |
| Original explicit-gap groups / observations | 16 / 1,032 |
| Later changed caret groups / reviewed observations | 9 / 332 |
| Pending caret observations preserved | 184 |
| Later gap-review groups in this population | 0 |
| Remaining complete rows, unchanged | 867 |

All nine changed rows are the independently authenticated later
`reviewed-owner-caret-observation-stage` review. They cover the two
button-toggle buttons, checkbox/chips primary containers, and grid-list primary
container, with separate reference-value groups where present. Only
`justification`, `recommendedOwner`, `attribution`, `reviewEvidence`, and
`reviewedCases` changed. Raw values, authored evidence, occurrences, case/state
membership, and the original classification field remain unchanged.

The failure is therefore a historical integration-test assumption invalidated
by later, separately verified caret attribution—not an explicit-gap scalar or
authoring regression. No motion/scalar gap review contributes to this test's
delta; there is no basis to exempt any such row in its correction.

Machine evidence:
[material-explicit-gap-later-conservation.json](material-explicit-gap-later-conservation.json).
Report SHA-256:
`150c97969beb92335be66de2a055fe653273f13fb3251eb03c287fb3d562f099`.
Frozen test source SHA-256:
`0ca228fcecefc851956fc6c1bdc2c636dd03adb7e1aceba9bbe3b9f05925ff5e`.
Complete unchanged-row-array SHA-256:
`148228a933f26e3b3e1ff6604bd175717194c4cbd57012f463fe8d1d70f1704b`.
Log: `artifacts/material-parity/field-host-flow-input-audit/explicit-gap-later-conservation-diagnostic.log`,
SHA-256 `198c2494e5dd9fd4bb73ff50485a6aae5e17d17fc2bf3162c64d024caf25222e`.

## Required correction boundary

A later test correction must preserve the frozen baseline and original checks,
authenticate the exact later populations, and compare every other complete
record. It must reject missing, altered, broadened, or unbound review evidence.
The unchanged full-harness run must remain an honest historical result; this
diagnostic does not repair its result retroactively or establish complete
current parity acceptance.

The original test remains unmodified while the full 120-file run continues.
Its eventual failing result must not be retroactively described as passing.
