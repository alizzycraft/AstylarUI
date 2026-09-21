# Follow-up position capture binding

The prepared adapter in
`tests/material-parity/position-followup-audit-source-binding.mjs` binds the
fourteen-group follow-up review to the complete original Material input capture.
It remains separate from the live producer and does not change canonical rows.

The capture is
`artifacts/material-parity/current-ancestry-audit/latest-report.json`, SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.
Binding checks the caller against the supplied on-disk report, then that report
against the authenticated original. Case/owner order, complete input coverage,
paired tree receipts and scalar input contents must be unchanged. A realpath
boundary rejects evidence outside Material artifacts and a foreign worktree.
This pins input evidence, not every output metric in a caller's report.

The review is replayed from authenticated paired source trees, not trusted from
caller metadata. Serialized evidence must equal a fresh replay. Classification
validation then reconstructs the complete predecessor rows using the follow-up
review's pinned digests. Reports lacking valid capture binding retain their
unresolved rows; they cannot carry this review's attribution.

The batch includes 768 property observations, not 768 distinct screenshots.
No input equivalence or rendering equivalence flag is promoted. Wiring into the
producer, its source inventory and source-transition proofs is still pending,
followed by regeneration and full canonical conservation checks.

## Verification

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/position-followup-audit-source-binding.spec.mjs
```

Log: `artifacts/material-parity/position-followup-binding-aecc084.log`.
Tests cover valid original binding and serialization, forged evidence,
incomplete/reordered reports, paths outside the artifact boundary, empty
classification coverage and unbound/invalid attribution rejection.
Result: 2/2 tests passed, exit 0, 65615.7985 ms. This establishes the adapter's
focused binding checks, not producer integration or canonical conservation.
