# Own-text weight and tracking: local versus retained observation

The [source proof](material-leaf-weight-tracking-stages.json) checks **304
property observations** across 152 captured own-text nodes: badge label, card
copy, and the two divider labels. It authenticates the original 2,311-case
report and full trees and reuses the exact text/ancestry/retained-owner checks
from the earlier leaf-family investigation.

| Property | Reference computed | Candidate local snapshot | Candidate retained core text |
| --- | --- | --- | --- |
| Font weight | `400` | omitted | `normal` |
| Letter spacing | `normal` | omitted | `0px` |

The **unchanged production normalization** maps each retained value to the
corresponding reference scalar. No defaults are inserted into the raw input.
The discrepancy is between observation stages: an omitted local declaration
is being compared with a computed browser value even though a later retained
text record supplies that property.

The verifier checks every selected path through the frame/page. It rejects
relevant font shorthand/longhand, inline, global-reset or motion requests on
those paths, including unknown potentially applicable candidate selectors.
Reference path values are checked against their actual computed snapshots;
candidate local omission is checked at normal, interaction and effective
stages. Text identity and retained provenance must remain exact.

This does **not** establish equivalent authored dependencies outside those
paths, physical font selection, glyph spacing/sharpness, layout or whole-element
parity. In particular the normal-versus-zero spacing normalization is not a
claim about final kerning or glyph pixels. No font weight, spacing, fixture or
renderer is adjusted to make the output look similar.

## Verification

```text
node scripts/audit-material-leaf-weight-tracking-stages.mjs
node --test --test-concurrency=1 tests/material-parity/leaf-weight-tracking-stages.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. Report SHA-256:
`024049e5fc9e785d08d33f7ad36a97c4c01a26ecc555285311bc075232e39f30`.
The focused/inventory suite passes **7/7**, no skipped/cancelled/TODO tests,
in **8,675.5415ms**. A full source replay prohibits filesystem writes and checks
the report and canonical file bytes remain unchanged. Another test reproduces
all 304 proofs without input mutation. **48 rejection controls** cover both
properties, changed values, roles/text, ancestry, local declarations, inline
attributes, unknown selectors, motion and retained-text provenance.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`leaf-weight-tracking-generation-final.log` and
`leaf-weight-tracking-focused.log`.

This increment supplies source evidence only. The later independent
[canonical membership plan](material-leaf-weight-tracking-attribution.md) binds
eight pending groups / 192 observations and preserves eight static reviewed
groups / 112 observations. Production integration still needs verification
before any classification changes. Canonical unresolved remains **2,026**. The complete
audit, current harness and enforced rendering matrix remain outstanding.
