# Visibility canonical transition: verification procedure

Producer integration: `222667e` on `codex/material-audit-alignment-integration`.
This is audit instrumentation only, not a renderer fix or a parity acceptance.

Before regeneration, the canonical manifest, compressed payload and human report
were copied without modification to
`artifacts/material-parity/pre-visibility-222667e`. The compressed SHA-256 is
`923a4b5bcb412c181e7b97ad3158cfc4e06c633ab01dae928a7b116122617347`;
the manifest declares decoded SHA-256
`89e1beffd14cc7050456cda0cfba84b51beec9fa0e74ed9b18f305119b6142e0`.
The streaming checker authenticates both representations before comparison.

Run after regeneration finishes:

```powershell
node --max-old-space-size=1536 scripts/check-material-visibility-canonical-conservation.mjs
```

The command independently replays the original authenticated visibility sources
and applies them to the complete previous scalar rows. Current scalar rows must
match that expected output exactly, in order. Exactly 15 previously unresolved
groups covering 530 observations may change classification. It also authenticates
the whole producer-source transition and permits only its hash to change in the
48 existing normal-line-box receipts; every other control field must remain
identical. It does not normalize away raw values or classify the pending tabs and
stepper state-owner differences.

This check conserves scalar discrepancy and control-typography populations. It
does not, by itself, prove equality of every other top-level report section,
validate full rendering parity, or establish that hidden-state support works.
Fresh production validation and the full required gates remain separate.

Focused checker verification:

```powershell
node --max-old-space-size=1536 --test tests/material-parity/visibility-canonical-conservation.spec.mjs
```

Result: **2/2**, no skips, **1,411.7875 ms**. Synthetic negative controls reject
changed/reordered/missing rows, lost control evidence, changed comparisons,
forged receipts, duplicate cases, and changes beyond the receipt itself. Inputs
remain unmodified. These tests validate the comparator; they do not claim that
the pending regenerated report has passed it.

The regeneration run was launched with all five original evidence arguments;
its output is retained in
`artifacts/material-parity/visibility-canonical-regeneration-v1.log`.
At this checkpoint it is still running, so canonical conservation is **pending**.
