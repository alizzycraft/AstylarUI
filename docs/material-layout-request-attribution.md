# Layout-request authoring attribution proposal

[The machine proposal](material-layout-request-attribution-plan.json) binds three
previously verified source reviews to eight exact unresolved rows in the
authenticated `67db724` canonical payload. It freshly replays each complete
source review and retains full original property membership, tree descriptors,
input/proof hashes, normalized values and complete canonical-row hashes.

| Source review | Groups | Property observations | First demonstrated divergence |
| --- | ---: | ---: | --- |
| [Control self-alignment](material-control-self-alignment.md) | 4 | 272 | Explicit candidate `flex-start` under a replacement column-flex parent, versus reference `auto` under a block parent |
| [Content flex requests](material-content-flex-requests.md) | 3 | 168 | Reference expansion/dialog component grow/basis requests missing from candidate content authoring |
| [Badge whitespace](material-badge-whitespace-audit.md) | 1 | 52 | Candidate label explicitly requests `nowrap` rather than the reference whitespace contract |

The proposed classification is **application/plugin authoring defect**, not a
confirmed renderer defect. The source reviews retain their composition and
history qualifications. In particular, all four self-alignment requests were
already in the initial showcase; they are not proved to be later compensations.
The badge word is unbroken, so these captures do not establish a visible effect
of `nowrap`. The content rows do not by themselves explain the historical dialog
height or expansion text-placement symptoms.

Correct restoration must address equivalent parent/content structure and
component requests together. Do not simply tune these eight scalars, claim a
core fix, or infer that the substitutions were necessary to conceal a defect.
Existing intrinsic-layout, typography and positioning reductions remain separate
evidence for the later implementation task.

This proposal leaves all **8,331 other complete rows** unchanged, and changes no
canonical classifications, renderer, plugin or comparison input. Integration
against the accepted current canonical report remains a separate obligation.

## Verification

```text
node --max-old-space-size=1536 scripts/audit-material-layout-request-attribution.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/layout-request-attribution.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation completed with exit 0: eight groups / 492 property observations.
The complete test run passes **7/7**, exit 0, **96,344.4133ms**, without skips,
cancellations or TODOs. It includes write-prohibited source/payload freshness,
21 rejection controls and full harness discovery/runner checks. Logs are
`layout-request-attribution-generation-sep20.log` and
`layout-request-attribution-full-sep20.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.

Proposal SHA-256:
`063ffeb261546694d2edfa355f384d22d17a8eaf897ea3fa24402b04400ae428`.
These results verify the audit proposal, not full rendering parity or canonical
promotion. Current harness discovery contains 184 suites; a complete run remains
required after integration and infrastructure corrections.
