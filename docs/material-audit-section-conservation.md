# Complete section change inventory

The visibility scalar/control checker intentionally covers only two report
populations. Use the independent section inventory to identify changes elsewhere:

```powershell
node --max-old-space-size=1536 scripts/material-audit-section-digests.mjs artifacts/material-parity/pre-visibility-222667e docs
```

Run only after regeneration finishes. The reader authenticates compressed and
decoded bytes against each manifest, then reports every top-level section's
ordered JSON-token digest, including additions and removals. It does not retain
the approximately 2 GB decoded document. Token digests preserve nested property
order, array order, values, types and punctuation, but ignore JSON formatting and
equivalent string escapes. They are change-detection receipts, not semantic
equivalence claims. Section order remains visible in the full section lists.

Every changed section still needs an explanation and appropriate independent
validation; this script deliberately does not provide a blanket approval list.
Scalar/control replay, fresh source validation and output parity remain separate.

Verification: `node --test tests/material-parity/audit-section-digests.spec.mjs`
passed **2/2**, zero skips. Cases cover nested values, multiple sections, changed
values/keys/order, container types, byte-sized UTF-8 chunk splits, incomplete
documents, duplicate section names and trailing roots. The first test run exposed
the underlying parser's handling of split UTF-8; stream decoding was corrected
before the passing run. No production audit-builder dependency was changed.

The full canonical comparison has not yet been run at this checkpoint.
