# Four control hosts use a different parent formatting context

The [source-bound audit](material-control-self-alignment.json) covers all **272
original observations** for button-toggle, checkbox, radio and slide-toggle:
68 cases per family. Every case retains the original input digest, paired-tree
descriptors, owner/parent identity, reference requests and all three candidate
local-style stages. The 69 proof patterns preserve theme and state differences.

## Finding

| Input boundary | HTML reference | AstylarUI comparison |
| --- | --- | --- |
| Host self-alignment | Computed `auto` | Explicit `alignSelf: 'flex-start'` |
| Immediate demo parent | Block `section` | Column-flex `section` |
| Request owner | No candidate-style substitution inferred | Exact `#<family>-primary` rule |

The first demonstrated discrepancy is **application/plugin authoring**: the
replacement parent formatting context and explicit host request already differ
before layout or projection. The host's computed reference value and the
candidate's local styles are not interchangeable used-layout measurements.
The scalar difference is not evidence of a core `align-self` defect.

Do not fix this by setting all four hosts to `auto`, or retain the current
`flex-start` merely because their screenshots appear aligned. The parent itself
is not equivalent. A future correction must review the block/inline control
composition together with host intrinsic sizing and the replacement flex
container. Existing public intrinsic-width failures remain relevant separate
proofs; this source review does not assign those core failures to these controls.

The report deliberately leaves input/rendering equivalence, renderer causality
and the necessity of the extra alignment request unproved. In particular, it
does not claim that removing this declaration changes a fixed-width control's
position or that the declaration was required to hide a renderer bug.

## History: not a later parity-fix introduction

All four `alignSelf: 'flex-start'` requests are present in the initial Material
showcase commit, `2f440115`. The report authenticates that committed source and
retains the four exact historical lines alongside current line-numbered
witnesses in `examples/material-showcase/src/app/astylar.component.ts`:

- Radio: line 491.
- Slide-toggle: line 504.
- Button-toggle: line 512.
- Checkbox: line 771.

Several complete lines were subsequently edited, so current line blame alone
would incorrectly suggest that the alignment declaration originated in a later
fix. The initial-source evidence establishes its earlier presence; it does not
establish developer intent or a historical rendered regression.

## Verification and remaining work

```text
node scripts/audit-material-control-self-alignment.mjs
node scripts/audit-material-control-self-alignment.mjs --check
node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/control-self-alignment.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and no-write replay exit 0. Focused/inventory tests pass **7/7**, no
failures, cancellations, skips or TODOs, in **5,089.7546ms**. They replay all
2,311 capture entries, select all 272 observations, prohibit writes during the
source replay and verify the canonical manifest/payload remain unchanged. Sixty
negative-control executions reject changed owners, missing provenance, altered
parent contexts, incorrect authored requests and inconsistent local stages.

Log: `artifacts/material-parity/field-host-flow-input-audit/control-self-alignment-tests-sep20.log`.
Machine-report SHA-256:
`f63c2a8791f8fa8be456538d446dde3b9198f06e310cbee01cbbf797142a18db`.

This is an original-input classification proof, not a canonical row promotion.
The accepted canonical audit still has 1,960 unresolved groups; the separate
125-group integration is not yet accepted. No renderer, plugin, comparison
fixture or reference was changed. Source-bound canonical integration and the
complete current enforced verification matrix remain required.
