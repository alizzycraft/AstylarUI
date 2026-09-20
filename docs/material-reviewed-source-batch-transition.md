# Reviewed source batch: complete-row dry-run transition

The 146-group [prepared batch](material-reviewed-source-batch.md) now has an
executable metadata transition. It does not write the canonical report or change
the current **1,835 unresolved** count.

The input plan is pinned to `e66deef` and SHA-256
`6a9335ebb748681bc2d1b390464b64c558ed28c30104323e03899e23803fdbd3`.
The transition itself is deliberately **not** a source authenticator. Its caller
must independently replay the source reports; the focused test runs the complete
existing batch collector and canonical join with writes prohibited.
The baseline reader is pinned to accepted alignment commit
`7cd5cb79f65f30a6468a41cbd9d643aadb723d72`; it does not follow later changes to
the working-tree canonical report. All source reports still replay freshly.

## Verified transition

- Exactly **146 groups / 6,295 observations** receive reviewed metadata.
- All **8,193 other complete rows** remain identical, in the same order.
- All **6,504 previously classified rows** remain unchanged.
- Every raw field survives, including occurrences, original case samples,
  values and state membership; complete reviewed-case membership is added.
- The hypothetical unresolved count is **1,689**, not a published current count.
- Missing/altered original rows, changed unrelated rows, reordered or duplicated
  rows, modified plans and reapplication are rejected.

The unchanged ordered-row digest remains
`8c924d71e7da9ec5c7335f319fc395f27359b189dfbf55624e7d752184a7e18c`.
Every new record expressly declines to claim whole-element input equivalence,
candidate computed values, a cascade winner, inactive motion, equivalent raster,
renderer causality or necessary compensation.

## Next boundary

Bind the independently replayed sources to exact original per-case scalar inputs
at the main classifier's unresolved-observation boundary, then compare every
canonical output row against this transition. Preserve the earlier 134-, 66- and
125-group integrations and all raw evidence. Complete builder validation and
freshness remain mandatory before promotion. The pure transition alone cannot
justify a classification or substitute for those checks.

## Verification

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/reviewed-source-batch-transition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**7/7 pass**, exit 0, **210,395.1304ms**, no skips, cancellations or TODOs.
Includes 13 rejection controls, complete payload authentication, raw-field and
prior-classification conservation, plus fresh source replay with writes forbidden.
Log: `artifacts/material-parity/field-host-flow-input-audit/reviewed-source-batch-transition-sep20.log`.
This is not an unfiltered audit-harness or enforced parity-matrix pass.

The subsequent historical-baseline binding run passes **12/12**, exit 0,
**433,244.3257ms**, including both preparation and transition suites. It verifies
the same complete-row result while the preparation CLI is forbidden from reading
the mutable canonical payload. See the accepted historical baseline checkpoint
in `material-reviewed-source-batch.md`.
