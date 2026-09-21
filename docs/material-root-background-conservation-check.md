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

## Completed regeneration and conservation check

Regeneration session `39286` subsequently finished with exit **1**, correctly
rejecting incomplete audit acceptance: **1,689** resolved-style attributions
and **60** control texture typography differences remain unresolved. Coverage is
436/436 static cases and 1,875/1,875 interaction cases. No renderer fixes or
output-parity acceptance are implied.

The conservation command then completed with exit **0**. All **8,483** rows /
**389,202** observations were retained. Exactly **144** root classifications /
**2,311** observations changed; **8,339** complete unrelated rows are identical.
Unresolved scalar attributions decreased from 1,833 to 1,689. The machine receipt
is now checked in as `material-root-background-canonical-conservation.json`.
Its unchanged-row digest is
`dd436b2cab1d7f0b84c0273d23fa606e9050e4e20001bae3e0b5c8aaa7415ab3`.

New canonical compressed SHA-256:
`ca6403047204b4c62d36239ece6c6446b92f12daae35dffe862c02a67eee484b`.
Decoded payload: 2,016,962,991 bytes, SHA-256
`b1a0e6e9f8c2a72625666444f9828f46e42d649acafd95354b5b75e62731424e`.

A separate complete streamed read authenticated the decoded payload and
inspected the restored line-box section: **671** observations, **48** historical
normalization reconciliations, zero errors and zero missing observations.
Control typography retains **637** interactive natural-line-box attributions
and **34** snackbar line-box size dependencies. The generated module receipt
matches `ec5fd9d1b35795b7614c43a5c667b1817c017a52f4ebc35c957e4d1813601f6a`.
This inspection complements the independently replayed 112 line-box checks
recorded in `material-root-background-main-integration.md`; it is not another
browser capture or a complete new test-suite run.

Logs: `artifacts/material-parity/root-background-canonical-regeneration.log`
and `root-background-canonical-conservation-ab7c20a.log`. The generated
Markdown's visual-parity statement describes its pinned input capture, not the
latest enforced release matrix. The complete audit and that matrix remain
unfinished.
