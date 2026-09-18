# Historical slider checksum: one authenticated later caret row

The original positive test at `a6c98bd` fails its frozen complete-row checksum.
The [five-file baseline](material-historical-caret-recheck-baseline.md) retains
that failure alongside the four passing slider rejection tests.

The diagnostic adds a comparison immediately before the original assertion and
keeps the assertion unchanged. Removing the insertion reconstructs the exact
historical source; AST checks restrict import relocation. Original spec SHA-256:
`00ff5566c36025a2429d82b367a4694f1ffc907d489894905ee3b93c88788c68`.

```powershell
node scripts/diagnose-material-slider-caret-conservation.mjs --source-only
node --test --test-name-pattern='^slider border canonical integration preserves' scripts/diagnose-material-slider-caret-conservation.mjs
```

The executed diagnostic emits conservation evidence and then fails the retained
original assertion: **0 pass / 1 fail**, exit **1**, **115,899.1576 ms**. This is
an intentional original failure, not a passing corrected integration run.
Log: `artifacts/material-parity/field-host-flow-input-audit/caret-slider-border-diagnostic.log`,
SHA-256 `33fc4d5bece5f09edfd9b317f4ee33a8033d332a092522d52bc866a7dc16cb3f`.

The two original cases produce 244 scalar rows, including 24 border rows and
220 historical non-border rows. Exactly one later row changes: `slider-visual`,
`caretColor`, two observations, from unresolved to the independently source-bound
local observation-stage review. Four pending range caret observations remain
unresolved and unchanged. No original border finding or earlier attribution is
replaced.

The original frozen digest is
`4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee`.
The failing current digest is
`06e2e601bed4152555f19ded8e9dd6caac5eecad89fa9eded6a7b2e1cb754660`.
Restoring only the authenticated caret metadata reproduces the original digest
over all 220 complete rows. Previous/current complete caret-row digests are
`a8bd5d07de66bef53ca73b5da3d5889a6fc9c625c105949ae5f489a4317dfcc5`
and `0d605c98650558ca6fcc65d2b013530bd94eccf002a3801946b60e020d79e2ba`.

The correction must keep that original hash, independently authenticate exactly
this one row, enforce disjointness from the prior rollback population, preserve
the four pending observations, and rerun all five slider tests without a filter.
That corrected run is a separate acceptance step. This evidence concerns audit
metadata, not slider targeting, dragging, rendering, or input equivalence.
