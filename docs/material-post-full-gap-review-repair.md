# Historical gap-review conservation correction

The historical baseline `3ebcff3e8f7bdfe7ecd9e00a4c2acbd11fefdc4a`
predates later source-verified caret classifications. The original unrelated-row
comparison consequently rejected those legitimate metadata changes. This is an
audit-test correction, not a renderer or input-equivalence fix.

The corrected test independently replays the existing caret source boundary and
exempts exactly **32 groups / 796 observations**, not a whole property or family.
It preserves **155 pending caret observations**. All **2,173 scalar rows** remain
unchanged, including the original 36 gap-review groups / 1,838 observations.
The two unresolved dialog gap rows retain all **64 motion observations** and
their complete original records.

All **2,105 other complete rows** remain deeply equal to the historical builder,
with SHA-256 `e778dbd5ecca5dcd92e135ea75089295d84a5aaa563f5b5550cf0d0195e9203c`.
The original four validator rejection controls remain active. No normalization,
reference, canonical attribution, fixture or renderer behavior changed.

## Verification

```text
node --test --test-concurrency=1 tests/material-parity/explicit-gap-canonical-integration.spec.mjs tests/material-parity/gap-review-canonical-integration.spec.mjs
```

The original sequential command is now terminal: **2/2 passed**, zero failed,
skipped, cancelled or TODO, **2,264,725.0812ms**. The gap-review child passed in
**1,560,272.1355ms**; the separately committed explicit-gap child passed in
698,451.2773ms. Both original process handles are absent. Full log:
`artifacts/material-parity/field-host-flow-input-audit/post-full-gap-conservation-correction.log`.

This completes the focused corrections for the three failures of the previous
120-file harness, including the separately verified motion receipt repair. It
does not convert that failed historical run into a pass or replace a fresh
complete harness. Canonical source fingerprints require refresh; the complete
input audit and enforced rendering matrix remain outstanding.
