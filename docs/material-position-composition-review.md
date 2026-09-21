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

## Production adapter boundary prepared

`position-composition-audit-source-binding.mjs` adds the production-shaped
collector, apply and validation entry points. It requires the full unchanged
original capture, authenticates its bytes, independently replays the six source
reviews, and retains all 316 observation identities. Unbound diagnostic inputs
cannot acquire a classification; invalid inputs retain explicit errors rather
than silently becoming an empty successful review.

`node --max-old-space-size=1536 --test tests/material-parity/position-composition-audit-source-binding.spec.mjs`
passed **2/2**, no skips, **29,179.7914 ms**. Tests cover serialization, altered
observations/classification/source hash/equivalence claims, mismatched reports,
out-of-bound evidence paths, missing rows and unbound application attempts.
Log: `artifacts/material-parity/position-bound-adapter-68bcc35.tap`.
Producer wiring, its source-transition proof and canonical regeneration remain
pending; these tests are not a claim that the six findings are integrated.

## Producer wiring

The builder now applies the bound positioning review after the existing visibility
review, serializes `positionAuditInputs`, and validates its source and complete
row membership through the standard review boundary. Normalization, mapping and
all prior aggregation calls are unchanged. Fifteen independently inventoried
dependencies extend the source list from 409 to 424 without losing or reordering
previous entries.

An exact whole-module reverse-transition proof reconstructs the `e62e846`
producer byte-for-byte. Prior visibility and historical test-suite conservation
checks compose through that proof; they do not omit prior logic or refresh its
historical hashes. Negative controls still reject unrelated source changes.

Verification:

- Combined transition, historical assertion, disabled-ink and alignment checks:
  **9/9**, zero skips, 30,033.8187 ms (`position-producer-conservation-dff8c3b.tap`).
- Actual legacy source inventory assertion: **1/1**, zero skips, 6,900.0035 ms
  (`position-producer-inventory-dff8c3b.tap`).
- Existing visibility pipeline and whole-module proof rerun: **2/2**, zero skips
  (`position-visibility-pipeline-dff8c3b.tap`).

Logs are under `artifacts/material-parity`. The accepted canonical manifest,
payload and human report were copied and hash-verified at
`artifacts/material-parity/pre-position-e62e846` before regeneration. Canonical
regeneration and complete conservation are still pending. No renderer or
canonical comparison fixture was modified.
