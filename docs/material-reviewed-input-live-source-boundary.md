# Reviewed-input source boundary for the canonical builder

The canonical builder is synchronous. Its future reviewed-input integration
must authenticate current input captures without making an asynchronous frozen
payload decoder part of that API. The new source boundary separates these
responsibilities without treating saved flags as evidence.

`tests/material-parity/reviewed-input-audit-source-binding.mjs` pins the complete
proposal binding and verified transition at `c58c62c`, checks their working bytes
against the committed evidence, and independently reruns all twelve original
source collectors. All seven proposal populations, source-plan receipts,
normalization functions and original capture bytes must still match. The
existing full frozen-canonical replay remains a separate mandatory check.
The runtime receipt explicitly reports `frozenCanonicalJoinReplayedNow: false`;
the independently repeated source proofs are not mislabeled as a fresh replay
of the prior two-gigabyte canonical payload.

The supplied capture may remove original cases or measured owners for a focused
test, but cannot alter their content, order, input-tree descriptors, profile or
viewport. Every missing case, owner and proposed property observation is
enumerated. Incomplete captures cannot pass complete-mode validation. Unknown,
altered or unbound captures provide no classification contexts.

For every selected observation, the classifier checks the complete original
input hash and exact normalized property values before returning the verified
classification metadata. All whole-element equivalence, rendering equivalence
and renderer-cause claims remain false. This explains input differences; it
does not fix the UI or declare it correct.

## Integration status

The new collector, subset projector, classifier-context builder and replay
validator are not yet called by the canonical builder. Its unresolved count
therefore remains **2,160**, not the projected 2,026. The next integration must
apply these classifications only after prior attribution rules leave an
observation unresolved, validate exact emitted group/state membership, and
prove all raw fields and unrelated complete rows unchanged. Canonical source
fingerprints and generated evidence then need refreshing. The later leaf-family
proof is still outside these seven proposal sets.

## Verification command

```text
node --test --test-concurrency=1 tests/material-parity/reviewed-input-audit-source-binding.spec.mjs tests/material-parity/reviewed-input-proposal-transition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The first suite exercises a full source replay and an independent validator
replay with filesystem writes prohibited, then classifies every one of the
3,325 observations across the original 2,311 cases. Partial-capture tests check
explicit omissions and exact classifier inputs; 18 projection mutation controls
reject altered sources, reordered/duplicated membership and unjustified claims.
The transition suite separately reruns the complete frozen canonical proof,
including every unrelated row, after the source-replay refactor.

Log: `artifacts/material-parity/field-host-flow-input-audit/reviewed-input-live-source-boundary.log`.
The combined command exits **0**, **11/11 passed**, zero failed, skipped,
cancelled or TODO, in **193,667.261ms**. The saved frozen transition and binding
remain byte-identical after their independent complete replay.
Discovery includes **136 files**: 128 Material, four general and four TTS,
retaining all 43 legacy files. This focused command is not a full harness or
enforced-rendering acceptance result.
