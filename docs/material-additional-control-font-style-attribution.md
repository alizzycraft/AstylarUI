# Additional control font-style omissions: exact original membership

The independent source proof in `material-additional-control-font-style.json`
now has an exact membership proposal against the complete frozen canonical
payload at `957774a`. It accounts for four groups / 168 observations:

| Original control | Observations |
| --- | ---: |
| `card-open` | 52 |
| `toolbar-action` | 52 |
| `dialog-cancel` | 32 |
| `dialog-save` | 32 |

The reference explicitly inherits font style. Candidate authoring supplies a
family-only reset and omits that inheritance request through the captured
ancestry. The original candidate text textures already report `normal`.
Consequently this is an **application/plugin authoring omission**, not evidence
of incorrect glyphs or a core inheritance defect. Non-normal ancestor behavior
and whole-element input/rendering equivalence remain unproved.

The collector pins source proof `a0112fe`, independently reruns it, authenticates
the original capture and production normalizers, and reads/authenticates the
entire frozen canonical payload. Each proposal binds original scalar input,
tree descriptors, actual control class, reset declarations, text-stage evidence,
case/state membership and the complete original canonical row. Previously
classified rows cannot be overwritten. No canonical classifications change.

All 8,335 other complete rows are preserved. Their ordered-row-digest SHA-256 is
`bbcf74d0567f01fd47c49d96438ec0185861a39ba7e427d4be1feb2b59e3497a`.
The proposed report SHA-256 is
`47636a2957730e71b760627e6e2c6cd37ad6dfb7617c428ef5f979ee7eb5d5a6`.

## Verification

Generation exited 0. Independent write-prohibited replay, pure membership
checks, 27 evidence-changing rejection controls and four inventory checks all
pass: **7/7**, exit 0, zero failed/skipped/cancelled/TODO, **84,685.4358ms**.

```text
node scripts/audit-material-additional-control-font-style-attribution.mjs
node --test --test-concurrency=1 tests/material-parity/additional-control-font-style-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Logs are under `artifacts/material-parity/field-host-flow-input-audit/`:
`additional-control-font-style-attribution-generation.log` and
`additional-control-font-style-attribution-focused.log`.

This supplements, but does not expand or silently modify, the separate
66-group follow-up integration. Canonical promotion of these four groups is
still pending. No renderer, plugin, comparison fixture or visual threshold was
changed. The full input audit and enforced parity matrix remain incomplete.
