# Six-group positioning review prepared

The grid-list and divider/switch source investigations now have one validated
review boundary: `tests/material-parity/position-composition-review.mjs`.
It independently replays both source collectors and requires complete equality
with their checked-in reports before constructing six decisions covering
**316 observations**. Each decision retains its original complete-row digest,
complete case membership, source receipt and complete source-proof digest.

All six decisions are application/plugin authoring defects. No renderer cause
or rendering equivalence is claimed. The grid-list root's omitted candidate
position remains absent; it is not converted to computed `static`.

`applyPositionCompositionReview` accepts only the exact six unresolved original
rows and changes classification metadata only. It rejects missing or duplicate
predecessors, another existing review, altered raw fields and caller-invented
proofs. Returned records cannot mutate the input rows.

## Verification

```powershell
node --max-old-space-size=1536 --test tests/material-parity/position-composition-review.spec.mjs
```

**3/3 passed**, no skips, **37,916.1994 ms**. The actual ordinary aggregation
produced 8,362 rows: exactly six changed and 8,356 complete rows remained
unchanged, with all raw fields and ordering conserved. The test deliberately
supplies the other review populations as empty on both sides; this is isolated
aggregation proof, **not full canonical conservation**.

## Remaining integration

The production builder does not import this module. After the running visibility
regeneration is verified, integrate this batch with source inventory, exact
historical/source-transition assertions, serialized evidence and fresh validation.
Then regenerate with all evidence populations and conserve complete canonical
rows and separately explained source receipts. Do not use these tests to claim
that the canonical report already contains the six classifications.

Source investigations:

- [Grid positioning substitution](material-grid-position-substitution.md)
- [Divider and switch flow substitutions](material-flow-position-substitutions.md)

## Serialized-row integrity

The pending adapter now preserves the original presence/value of each replaced
metadata field. `validatePositionCompositionRows` checks exact six-group
membership and independently replayed decisions, reconstructs each complete
predecessor and checks its pinned original digest. This catches raw changes
outside selected scalar fields, including extra fields and loss of absence.

The same three-test suite passed again: **3/3**, zero skips, **42,648.8235 ms**.
It includes a JSON serialization round trip and eight new rejection controls:
missing/duplicate row, changed occurrence count, lost case, forged/reordered
predecessor metadata, invented renderer-cause claim and an extra raw field.
Log: `artifacts/material-parity/position-composition-serialized-validation-e62e846.tap`.
This strengthens the future production validation boundary; the batch is still
not wired into the canonical producer.
