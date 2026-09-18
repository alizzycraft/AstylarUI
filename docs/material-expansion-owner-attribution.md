# Expansion owner mismatch: exact canonical membership

The [owner-mapping proof](material-expansion-owner-mapping.md) now has an
independent [canonical membership plan](material-expansion-owner-attribution-plan.json).
It joins **43 unresolved groups / 1,596 property observations** to the original
68 captures that compare the HTML whole panel with the candidate header button.
The first noncomparable stage is owner selection, not a demonstrated core
style-resolution or paint defect.

The proposed attribution is `reviewed-expansion-panel-header-owner-mismatch`,
classified as a harness defect. It preserves every raw difference. This is not
a statement that the properly corresponding panel/header inputs or outputs
match, nor permission to change candidate styling to clear those differences.

## Complete scope and conservation

The collector regenerates the owner proof from original trees and authenticates
all bytes of the canonical payload pinned at commit `957774a`. It uses the
unchanged production normalization functions and examines all **8,339 groups**.
Each original case, tree descriptor, input hash, scalar owner and canonical
group membership is checked; occurrence counts, first displayed cases and
complete state lists must agree with independently selected source observations.

There are **102 canonical expansion-primary groups** in total. The other **59
previously reviewed owner groups** are retained, not silently reclassified or
treated as proof of corresponding roles. Across the full corpus, all **8,296
other complete rows** are conserved, with ordered-row-digest SHA-256:

`bea2570b892d4780d8f27e125d9016051a1664d57bfe63d293692bd10e301f74`.

The source proof's eight disabled header cursor differences remain explicit.
Correct owner mapping must not erase that genuine authoring mismatch. The
existing title font-token finding also remains separate.

## Verification

```text
node scripts/audit-material-expansion-owner-attribution.mjs
node --test --test-concurrency=1 tests/material-parity/expansion-owner-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0; plan SHA-256:
`4b89eaddb659e5221e759cc6f275d2584a449fb03f6d331bd869f41b3a195c0a`.
The focused source/canonical replay and inventory suite passes **7/7**, exit 0,
with no skipped/cancelled/TODO tests, in **90,723.1134ms**. The complete replay
prohibits filesystem writes and verifies that the saved plan and all canonical
files remain byte-identical. Twenty-nine rejection controls cover changed
owners, raw inputs, source membership, state/order, ambiguous scalar groups,
prior classifications and unsupported equivalence claims. Synthetic rows are
used only for the pure rejection tests; the separate replay authenticates the
entire real canonical payload.

Logs are `expansion-owner-canonical-diagnostic.log`,
`expansion-owner-attribution-generation.log` and
`expansion-owner-attribution-focused.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.

## Next implementation boundary

First distinguish interaction targets from comparison owners in the harness,
then capture panel-to-panel and header-to-header inputs separately. Review all
102 original groups against those corresponding roles, preserving the original
observations and provenance. Only then infer which remaining equivalent-input
failures belong to the renderer. Do not fix header weight, panel padding,
clipping or backgrounds based on the current cross-role scalar comparison.

This is a proposed attribution only. Canonical unresolved count remains 2,026;
the 43 groups are not subtracted before source-bound production integration and
complete conservation are verified. No fixture, renderer, reference, threshold
or canonical mapping is changed.
