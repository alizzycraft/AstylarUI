# Source-replayed classification transition dry run

The [machine report](material-reviewed-input-transition-dry-run.json) applies
the seven [independently replayed proposal sets](material-reviewed-input-proposal-binding.md)
to the complete frozen 8,339-row canonical population **in memory only**.
It changes classification metadata for **134 groups / 3,325 observations**:
98 measurement-stage harness groups and 36 authoring/ownership groups.
The projected unresolved count is **2,026**; the actual canonical report still
has **2,160**, because no canonical files or renderer inputs were changed.

Only classification, attribution, justification, recommended owner, review
evidence and complete reviewed-case membership may change. All other raw fields,
row order and original source objects remain unchanged. Every one of the
**8,205 other complete rows** is conserved, with ordered-row-digest SHA-256
`d65133f5c8148f376ea6ff795d06e6760bea1b64052c53dcb90dbe66a2decfb8`.
Reapplication is rejected rather than overwriting previous reviews. Prior static
reviews sharing scalar tuples with pending interactive rows remain separate.

The pure transition is not an evidence authenticator. Its caller first
authenticates the complete frozen payload and reruns all twelve source proofs
and seven original joins. The small binding-reader refactor shares that same
decoded population with the transition without decoding it twice; the saved
combined binding remains byte-identical. Saved boolean flags alone never
authorize a classification change.

## Verification

```text
node --max-old-space-size=1536 scripts/check-material-reviewed-input-transition.mjs
node --test --test-concurrency=1 tests/material-parity/reviewed-input-proposal-transition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. The focused/inventory command passes **7/7**, zero failures,
skips, cancellations or TODOs, in **135,416.0381ms**. The first test independently
replays the complete source/payload path in check mode with filesystem writes
prohibited and verifies unchanged report bytes. Pure-transition tests then
check raw-field conservation, source immutability, rejection of repeated
application, and **34 negative controls** for altered sources, membership,
ownership and unsupported parity claims. The synthetic small projection used
by those controls is not substituted for the full-population replay.

Report SHA-256:
`26face32b1cb81fff1adae825eaeb827423cc5486b9fcb100e5f6baf1e928348`.
Projected ordered-row-digest SHA-256:
`830977a576794e632d71039fd25b892629574e40f2d2d0b3e3a06f962487d8bc`.
Logs: `artifacts/material-parity/field-host-flow-input-audit/reviewed-input-transition-generate.log`
and `artifacts/material-parity/field-host-flow-input-audit/reviewed-input-transition-focused.log`.

Discovery includes **135 files**: 127 Material, four general and four TTS,
with all 43 legacy files retained. This is not a full current-harness pass.
Next is live audit-builder integration with exact source/subset validation and
conservation, followed by canonical regeneration/checks. Unjoined leaf-family
evidence and all other remaining classifications are still pending. None of
these metadata reviews establishes whole-element input or rendering parity;
the complete enforced rendering matrix remains required.
