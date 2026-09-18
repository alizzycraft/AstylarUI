# Follow-up input classification transition: dry-run proof

This projects the four [source-bound follow-up sets](material-followup-input-proposal-binding.md)
into classification metadata only. It does not edit canonical report files,
reference/candidate inputs, plugins or renderer behavior.

The source-replayed population is 66 groups / 2,640 observations: 55 harness findings
(leaf-family stage, leaf-weight/tracking stage, and expansion owner mismatch)
plus 11 control font-style authoring-omission findings. The source data retains
the omissions and raw values; those are not replaced with inferred defaults.

Every transition requires the exact original complete-row digest, unresolved
prior classification, unchanged case/state/occurrence membership, authenticated
source-plan descriptor and the bounded finding's approved classification. The
pure transition rejects repeated application, duplicated property observations,
overwritten previous reviews and unsupported equivalence claims. Only six
classification metadata fields can change. Original authored examples and all
unrelated complete rows must remain intact and in their original order.

## Verification checkpoint

The pure transition and four-set binding tests pass **4/4**, exit 0, in
**5,122.3256ms**, with no failures, skips, cancellations or TODOs. They include
34 transition rejection controls and 45 binding controls. Their intentionally
synthetic fixture is not substituted for the full-payload proof.

```text
node --test --test-concurrency=1 --test-name-pattern="cross-revision|followup join|followup metadata|followup transition refuses" tests/material-parity/followup-input-proposal-binding.spec.mjs tests/material-parity/followup-input-proposal-transition.spec.mjs
node --max-old-space-size=1536 scripts/check-material-followup-input-transition.mjs
```

The full-source/full-canonical dry-run generation has passed, exit 0. It replays
the original proofs and complete frozen joins before checking every current
frozen row and protecting the canonical files' hashes. All 66 metadata-only
changes preserve 8,273 other complete rows; all canonical files are unchanged.
Projected ordered row-digest SHA-256:
`6d74056c73c615d2a2a4b77d6fc2f00290d9256d108039baabdcd61d6f850fba`.
The generated report's SHA-256 is
`34c8c2fc309e695bd82c8280c7196a108856fd874c20273e8f00612478915b90`.
Independent write-prohibited replay now passes. The complete focused run is
**7/7**, with zero failures, skips, cancellations or TODOs, in
**549,212.8772ms**. The independent replay itself took **547,278.6315ms**;
the remaining tests cover pure conservation, 34 rejection controls, and all
four complete-harness inventory checks.

```text
node --test --test-concurrency=1 tests/material-parity/followup-input-proposal-transition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Logs: `followup-four-transition-pure.log` and
`followup-input-transition-generation.log`, plus the terminal
`followup-input-transition-focused.log`, under
`artifacts/material-parity/field-host-flow-input-audit/`.

The full projection leaves 1,960 unresolved groups in memory. The **actual
canonical report still contains 2,026**. Promotion into
the live builder, validation of precedence and full-row conservation, the
remaining classifications, full harness and enforced rendering matrix are
separate outstanding requirements.
