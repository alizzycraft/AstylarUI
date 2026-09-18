# Gap-review conservation after later reviewed inputs

The production historical gap-review test now authenticates the exact later
reviewed-input metadata before reconstructing that metadata for its original
complete-row equality and hash checks. Its raw inputs, normalizers, original
classifications and rejection controls are unchanged. This is not a blanket
exemption for newly classified rows.

## Verified population

- Historical baseline: `3ebcff3e8f7bdfe7ecd9e00a4c2acbd11fefdc4a`.
- All 676 diagnostic cases and 2,173 scalar rows retained.
- All 36 original gap-review groups / 1,838 observations retained.
- Two unresolved motion groups / 64 observations remain unchanged.
- 32 later caret groups / 796 observations independently checked; 155 pending
  caret observations remain pending.
- Exactly 19 later reviewed-input groups / 195 observations authenticated by
  fresh source replay before reconstructing classification metadata.
- The other 2,105 complete rows retain their original ordered digest:
  `e778dbd5ecca5dcd92e135ea75089295d84a5aaa563f5b5550cf0d0195e9203c`.

## Verification

```text
node --test --test-concurrency=1 tests/material-parity/explicit-gap-canonical-integration.spec.mjs tests/material-parity/gap-review-canonical-integration.spec.mjs
```

Terminal TAP result: **2/2 pass**, zero failures, skipped, cancelled or TODO
tests, total **2,897,781.2575ms**. Explicit-gap took 906,280.4098ms and gap-review
took 1,985,557.7593ms. The process is no longer live. The complete result is in
`artifacts/material-parity/field-host-flow-input-audit/historical-reviewed-conservation-production.log`.

These tests prove their bounded historical conservation, not input equivalence,
renderer correctness or full canonical conservation. The canonical unresolved
count remains 2,026. Other historical tests, final source freshness, complete
current audit harness and enforced rendering matrix remain outstanding.
