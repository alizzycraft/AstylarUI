# Follow-up classifications: fresh source replay

This is audit infrastructure, not a renderer or fixture correction. The
four-set [binding](material-followup-input-proposal-binding.md) is pinned to
`11bd538`; each underlying proposal remains pinned to its independently
verified source/canonical commit.

The synchronous replay boundary executes all four original source collectors,
checks the complete original capture hash and production normalizers, verifies
the saved proof bytes, and rejoins every proposed observation to its freshly
replayed source proof and captured tree identities. The population remains
**66 groups / 2,640 observations** across the original **2,311 cases**.

This path deliberately does **not** claim to decode and rejoin the historical
two-gigabyte canonical payloads on each synchronous call. Those full joins were
independently verified by the binding and transition tests. Its receipt keeps
`frozenCanonicalJoinReplayedNow: false`, and all equivalence/acceptance flags
remain false. A saved classification or matching font scalar alone cannot
authorize a new finding.

## Verification

```text
node --test --test-concurrency=1 tests/material-parity/followup-input-source-replay.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**7/7 pass**, exit 0, **24,801.5258ms**, with zero failures, skips,
cancellations or TODOs. The actual source replay runs with writes prohibited;
23 receipt mutations and a separate altered-capture interception are rejected.
The complete-harness inventory checks also pass. Log:
`artifacts/material-parity/field-host-flow-input-audit/followup-input-source-replay-focused.log`.

No live classifier or canonical report has changed. Wiring exact subset
membership into the live builder, preserving earlier classification precedence,
and proving full canonical conservation are separate next steps. The actual
canonical count remains **2,026 unresolved groups**.
