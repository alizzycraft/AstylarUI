# Canonical root-background conservation gate

The regenerated canonical report must be checked against the preserved
pre-integration report, not accepted from its counts alone.

```text
node --max-old-space-size=1536 scripts/check-root-background-canonical-conservation.mjs
```

The command streams and authenticates both complete compressed payloads and
their decoded hashes. It pins the earlier report to compressed SHA-256
`d4dc68ab9a12d9de733e2a3c9aa462724ed2bb013ec402f04f8ab9fa291b6d7c`,
replays the original-source root-background classification collector, and then
checks every discrepancy row. An unchanged report is rejected.

Exactly 144 reviewed root-background rows / 2,311 observations may change from
unresolved to the source-proven attribution. Their raw properties, values,
counts, case samples and states must remain identical. All classification
metadata and complete reviewed case lists must match the independent collector.
Every unrelated row must remain completely identical; a matching scalar key
alone is insufficient because separate classifications may share that key.
Duplicate and missing rows are accounted for as a multiset.

The checker records the old/new manifest receipts, every changed row digest,
and a digest of all unchanged row digests. It does not silently accept another
change because the total number of rows is unchanged.

## Verification status

The conservation function's synthetic contract tests and the complete harness
inventory checks passed **6/6**, 1,238.5216ms:

```text
node --test tests/material-parity/root-background-canonical-conservation.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Negative checks cover row loss, unrelated attribution/membership changes,
altered raw values/counts, replacement of an already-reviewed attribution,
false renderer-cause claims, missing expected groups and duplicate rows.
Synthetic tests are not canonical acceptance or independent source proof.

At preparation time, canonical regeneration session `39286` remains live.
The command above has **not yet been run against its completed output**.
Do not interpret this document or passing contract tests as successful
canonical integration. The command will write
`material-root-background-canonical-conservation.json` only after all checks
pass. Restored control-line-box evidence, other report sections, source
provenance and the full enforced parity matrix require separate verification.
