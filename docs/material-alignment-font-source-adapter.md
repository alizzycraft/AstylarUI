# Alignment and font-style review: prepared integration boundary

This prepares the next canonical classification increment. It does not modify
the main audit builder, comparison fixtures, plugins, renderer, or canonical
report. The current canonical unresolved count remains **1,960**.

## Reviewed scope

The adapter combines two already reviewed source populations:

- [Alignment](material-vertical-align-canonical-plan.md): 68 groups / 3,848
  original observations. This includes 53 observation-stage mismatches, four
  omitted reference alignment requests, and eleven candidate substitutions.
- [Control font style](material-additional-control-font-style-attribution.md):
  four groups / 168 observations, where candidate family-only reset authoring
  omits the reference inheritance request. Original textures already report
  normal; no core glyph defect is inferred.

The two alignment scalar-rule gaps, previously reviewed groups and the reserved
expansion-panel/header mapping remain outside this proposal. Neither a missing
candidate local declaration nor a matching screenshot is converted into a claim
of equivalent computed/used styles or rendering.

`tests/material-parity/alignment-font-audit-source-binding.mjs` pins both plans
to `f8a1642`, independently replays their original source collectors, verifies
the complete original capture and production normalizers, and binds every
proposal to its original scalar input, tree descriptors and source-proof hash.
The synchronous adapter does not claim to repeat the separately verified frozen
2GB canonical joins. Subset callers receive explicit missing-case and
missing-observation lists; only complete coverage can enter the dry-run transition.

The classifier checks exact case/owner/property/value identity. Classification
coverage checks require every source-bound group and observation. The transition
requires each original complete-row hash to remain unchanged and unresolved,
changes only classification metadata, and preserves unrelated rows in order.
Production integration must still call it only after prior classification rules
have retained precedence, and validate the evidence by independent replay.

## Current full-payload dry run

A separate read-only run authenticates every byte of the current canonical
payload (`72b148d9be7f4aaf3bd5872faedad2273f408d2a5ef1c258f6944f60be5ffd07`
compressed SHA-256) and checks the proposed transition against all 8,339 rows:

- Exactly **72 groups / 4,016 observations** remain eligible.
- The other **8,267 complete rows** retain their ordered digest:
  `3e9fbd9e6d1df52e39a5a57a7473d3f7c77e18e81ebcece3eee227ece519d7b0`.
- Projected unresolved count: **1,888**. This is not yet the canonical count.
- Before/after hashes of the canonical manifest, payload and Markdown are equal.

The checked-in [machine receipt](material-alignment-font-transition-dry-run.json)
retains every changed row's before/after digest, attribution and occurrence count,
the complete canonical manifest, unchanged-row digest, and source/log hashes.
The full command output is
`artifacts/material-parity/field-host-flow-input-audit/alignment-font-current-dry-run.log`;
the process exited **0**. This proves a bounded metadata transition, not a fresh
main-builder generation, renderer causality, input equivalence or visual parity.

## Verification and next integration

The focused suite replays source evidence twice with writes prohibited, tests
incomplete subsets and exact classifier boundaries, rejects ten changed
source/plan/input cases, tests seven invalid metadata transitions, preserves
unrelated synthetic rows, and checks the saved full-payload receipt. The
inventory tests continue to require every legacy suite.

```text
node --test --test-concurrency=1 tests/material-parity/alignment-font-audit-source-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Final receipt-inclusive verification is recorded in
`artifacts/material-parity/field-host-flow-input-audit/alignment-font-adapter-receipt-final.log`.
It passes **9/9**, exit **0**, no failures/skips/cancellations/TODOs, in
**86,454.4118ms**.
Earlier runs passed 7/7 (88,983.1069ms) and then 8/8 (92,581.851ms) before the
saved-receipt assertion was added; neither is the final nine-test result.

The earlier 66-group canonical promotion still awaits all six historical
production integration gates. Its first two suites now pass (button box sizing:
1,106,262.4695ms; fixed width: 1,246,738.7431ms); the third, button requests, is
running. Do not alter those live readers' inputs or claim the six-suite gate has
passed. After that promotion, integrate this adapter with complete conservation,
source validation, generation/freshness and historical compatibility evidence.
The complete audit harness and enforced parity matrix remain mandatory.
