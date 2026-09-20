# Reviewed source batch: historical replay and current normalization

This audit-only change restores independent replay of the prepared 146-group,
6,295-observation batch after the color-precision instrumentation correction.
It changes no renderer, plugin, reference, or canonical comparison input.

## Historical evidence remains historical

The saved plan still uses normalization contract
`8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e`.
The preparation command and observation binder now obtain those exact functions
from the pinned `7cd5cb79f65f30a6468a41cbd9d643aadb723d72` source instead of
incorrectly expecting the current audit module to contain the old normalizer.

Motion findings are conserved through the separately tested
`motion-source-conservation.mjs` boundary. The delay review is freshly executed
from its authenticated, unchanged collector declarations, with that conserved
historical parent supplied explicitly. Every resulting field must equal the
saved delay report. Its 35 groups / 2,546 observations include the 12 groups /
840 observations eligible for the prepared batch; the other groups remain
unresolved. The adapter exposes both the current source receipt and historical
receipt conservation. It never rewrites the old receipts as current hashes.

The standalone historical collectors' strict whole-report `--check` paths have
not been relaxed. The batch uses `replayReviewedBatchMotion` for the explicit
conservation transition. Tests for that transition retain write prohibition,
full membership, and the motion/delay rejection controls.

## Current classification uses current values

The live classifier projection uses precise normalization contract
`27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773`.
For every original observation it reauthenticates the raw input and derives
current reference and candidate scalars. Historical values remain separately
visible on each observation and in `historicalGroups`; the historical dry-run
transition uses only that explicitly historical projection.

Four disabled-button background groups / 60 observations change reference
values. Their original source proof still establishes reference alpha 0.12
versus an opaque candidate fill. This classification does not depend on rounding
the RGB channels. There are two distinct reference-value transitions across
the four groups:

| Historical value | Precise value | Observations |
| --- | --- | ---: |
| `rgba(29,27,32,0.12)` | `rgba(28.999875,26.99991,31.99995,0.12)` | 45 |
| `rgba(230,225,229,0.12)` | `rgba(230.000055,225.000015,228.999945,0.12)` | 15 |

No candidate values change. Other properties may not silently acquire changed
reference values under this transition. Group membership must remain uniform;
an unexpected split fails explicitly. Current classification rejects the old
rounded value for every changed observation. This retains the meaningful
precision difference rather than tolerating or normalizing it away.

## Verification

The following run passed all eight tests, with no skips, in 281,436 ms:

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/reviewed-source-batch-observation-binding.spec.mjs tests/material-parity/reviewed-source-batch-audit-source-binding.spec.mjs
```

It covers all 146 groups / 6,295 observations, independent replay, current
classification contexts, 60 old-rounded-value rejection checks, missing and
altered membership, inflated evidence, partial coverage, and the original
historical complete-row transition. All 8,193 unrelated rows retain their
ordered digest:
`8c924d71e7da9ec5c7335f319fc395f27359b189dfbf55624e7d752184a7e18c`.

The saved plan and motion/delay JSON reports remain unchanged. Their historical
input/output-equivalence disclaimers also remain unchanged.

The historical/rejection/inventory run passed all 15 tests, with no skips, in
198,997 ms:

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/reviewed-source-batch.spec.mjs tests/material-parity/motion-delay-target-review.spec.mjs tests/material-parity/owner-initial-motion-review.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

This includes exact reproduction of the saved prepared plan while filesystem
writes and reads of the mutable canonical payload are prohibited. Across both
runs, 23 tests pass. This is focused verification, not the full audit harness.

## Next boundary

This is a verified classifier adapter, not accepted canonical integration.
Wire its current projection into the main audit builder without replacing
prior classifications, refresh and authenticate the canonical report, then
continue classification of the remaining discrepancy population. Other older
standalone attribution-plan collectors still need their historical-normalizer
bindings checked before the complete harness run. Complete state coverage and
the enforced parity matrix remain outstanding; this focused proof does not
establish either.
