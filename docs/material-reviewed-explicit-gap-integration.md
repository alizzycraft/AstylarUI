# Explicit-gap conservation after later reviewed inputs

The existing production explicit-gap integration test now authenticates and
reconstructs the exact later reviewed-input metadata before applying its
unchanged complete-row conservation assertions. It does not exempt a property,
family or attribution string merely because that row changed.

The production replay passes its complete original population:

- 296 cases and all **892 original scalar rows** retained.
- All **16 explicit-gap groups / 1,032 observations** retained.
- Nine later caret groups / 332 observations still source-bound; 184 pending
  caret observations remain pending.
- Exactly **13 later reviewed-input groups / 424 observations** independently
  authenticated before their metadata is reconstructed.
- All **867 other complete rows** still match the original saved digest:
  `148228a933f26e3b3e1ff6604bd175717194c4cbd57012f463fe8d1d70f1704b`.

The original normalizer, mapping, scalar comparisons, classifications, counts,
hash assertion and missing-evidence rejection tests remain intact. The raw
input object is unchanged. This is audit-infrastructure verification, not a
renderer fix, gap equivalence or complete audit acceptance.

## Verified execution

```text
node --test --test-concurrency=1 tests/material-parity/explicit-gap-canonical-integration.spec.mjs tests/material-parity/gap-review-canonical-integration.spec.mjs
```

The first file's sole test passed in **906,280.4098ms**. The
[gap-review sibling](material-reviewed-gap-review-integration.md) subsequently
passed in **1,985,557.7593ms**. The combined run is terminal: **2/2 pass**, zero
failures/skips/cancellations/TODOs, **2,897,781.2575ms** total. This is not a
complete-suite pass.
Log: `artifacts/material-parity/field-host-flow-input-audit/historical-reviewed-conservation-production.log`.

An earlier in-memory diagnostic launcher failed before executing any test
because a bare `typescript` import cannot resolve from a data URL. That
temporary launcher was removed once the independent freshness job finished;
this result comes from the normal production test files, not that diagnostic.
Its log remains `historical-reviewed-conservation-diagnostic.log`.

The remaining historical conservation checks,
final canonical source-freshness regeneration, complete current harness and
enforced rendering matrix remain outstanding.
