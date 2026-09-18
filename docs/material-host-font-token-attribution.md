# Proposed canonical attribution: component host font tokens

The [proposal](material-host-font-token-attribution-plan.json) joins the
[independent host-token proof](material-host-font-token-inputs.md) to seven
unresolved canonical groups / **380 observations**:

- Toolbar host: font family, weight and tracking, 52 observations each.
- Paginator host: font family, weight and tracking, 52 observations each.
- Stepper host: font family, 68 observations.

Proposed classification: `application-plugin-authoring-defect`.
Proposed attribution: `reviewed-component-host-font-token-omission`.
This is a proposal only; canonical classification remains unchanged.

## Independent membership and conservation

Generation replays all 172 original owners and their per-property source
checks, then re-authenticates the original 2,311-case capture. It uses the
actual production normalizer, AST-bound to its saved function digest; it does
not introduce a parallel property-normalization rule. For example, raw
tracking `normal` remains in the source proof while the canonical signature
uses the production `0` representation.

The entire frozen canonical payload at `06e50db` is authenticated and streamed
before selecting rows. Each proposal requires a unique unresolved row with
matching property/scalars, occurrence count, ordered case sample and states.
It retains every original observation's input/tree/proof hashes and the digest
of the complete canonical row. Changed membership or previously reviewed rows
are rejected; a matching count alone does not authorize attribution.

All **8,332 other complete rows** remain outside the proposal. Their ordered
complete-row digest sequence has SHA-256
`e2c2c533163a2d17daee4eab9e1ac1e7562e3556bc5edfd20d40f3f1c292e0d3`.
Plan SHA-256:
`2de241032d8040d4bf578d8caecc1aa6b61dd7cd812b85042e0871c5afa23d12`.

This audit explains missing component authoring dependencies, not computed
candidate typography, descendant consumers, theme-token definition origins,
visible consequences, or a renderer cause. The proposal rejects stronger
claims. Its synthetic join tests exercise boundary validation only; the
separate CLI test independently replays the actual source and full payload.

## Verification

```text
node --max-old-space-size=512 scripts/audit-material-host-font-token-inputs.mjs --plan
node --test tests/material-parity/host-font-token-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits **0**, reporting seven groups / 380 observations / 8,332 other
rows. The focused suite contains the independent no-write CLI replay, 436
source-proof mutation executions, 27 join mutation controls, and the complete
harness inventory tests. It passes **8/8**, exit **0**, in **89,857.8797ms**,
with zero failures, skips, cancellations or TODOs. Log:
`artifacts/material-parity/field-host-flow-input-audit/host-font-token-plan-focused.log`.

No renderer, comparison input or canonical attribution changed. The canonical
unresolved count remains 2,160. Discovery remains 130 files; the live original
120-file run, later current full-harness run and enforced rendering matrix are
separate and cannot be replaced by this focused verification.
