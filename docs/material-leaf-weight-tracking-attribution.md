# Leaf weight/tracking: canonical membership proposal

The [304-observation source proof](material-leaf-weight-tracking-stages.md) is
joined independently to the canonical payload pinned at `957774a` in the
[machine-readable plan](material-leaf-weight-tracking-attribution-plan.json).

- **Eight pending groups / 192 interactive observations** are proposed for
  measurement-stage attribution.
- **Eight previously reviewed static groups / 112 observations** retain their
  existing classifications even though their scalar values match the interactive
  groups. Case identity, not just property/value equality, distinguishes them.
- Every other complete row is conserved: **8,331 rows**, ordered-row-digest
  SHA-256 `0b850453874e2c4b957b4fc33b3622de3297ce38734724c0c00fe6f9b065d8c8`.

The original input hashes, case/state membership, tree descriptors, retained
provenance, raw/normalized values and false equivalence/cause flags must all
agree with the independently regenerated source proof. The collector reads and
authenticates every compressed and decoded canonical byte. It does not alter
the canonical report or infer complete input/rendering equivalence.

## Verification

```text
node scripts/audit-material-leaf-weight-tracking-attribution.mjs
node --test --test-concurrency=1 tests/material-parity/leaf-weight-tracking-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. Plan SHA-256:
`73a50177d906dc98d67abc88ca7a7275dc544ff047604d726268a8a81dfff70a`.
The focused/inventory suite passes **7/7**, exit 0, with no skipped/cancelled/TODO
tests, in **90,404.3299ms**. The independent replay prohibits filesystem writes
and verifies the plan and canonical files remain unchanged. Twenty-five
rejection controls cover missing/duplicate source membership, changed raw and
retained values, wrong state/tree provenance, earlier reviewed classifications
and unsupported equivalence claims. Synthetic rows are used only for rejection
sensitivity; the separate replay authenticates the complete real payload.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`leaf-weight-tracking-attribution-generation.log` and
`leaf-weight-tracking-attribution-focused.log`.

Source-bound production integration and complete canonical conservation are
still required before these eight proposals affect the unresolved count. That
count remains **2,026**. Physical font selection, glyph spacing/paint, layout,
the complete current harness and enforced rendering matrix remain separate
requirements.
