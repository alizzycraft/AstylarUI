# Reviewed source batch: original-observation binding

The prepared **146 groups / 6,295 observations** now have a tested source-to-input
binding. This is a prerequisite for canonical integration, not integration itself.
The published unresolved count remains **1,835**. No renderer, plugin or
comparison fixture changed.

## Evidence boundary

`tests/material-parity/reviewed-source-batch-observation-binding.mjs` replays all
seven complete original source reports and compares their complete serialized
digests with the already-reviewed prepared plan. It authenticates the original
capture, then binds each property observation to its exact case, element, source
input trees, raw scalar-input digest, proof/pattern digest, and normalized values.

This preserves the distinction between browser-computed values and candidate
local declarations. It does not invent candidate computed values, select a
cascade winner, establish inactive motion, prove necessary compensation, or
claim input/rendering equivalence. Historical complete-row membership remains
the separate responsibility of the pinned preparation/transition proof.

| Source population | Groups | Observations |
| --- | ---: | ---: |
| Initial values with disjoint captured motion targets | 86 | 4,708 |
| Self-alignment, content flex and badge whitespace | 8 | 492 |
| Active shared-button paint composition | 32 | 135 |
| Inactive outlined/disabled base alpha | 8 | 120 |
| Delay-only rules with same-owner disjoint targets | 12 | 840 |

The complete original capture has **2,311 cases / 6,946 measured owners**. All
6,295 reviewed property observations bind without omissions. Their ordered
digest is `3b6ad05c6ffe7768e2bbd4c5a1add9a69552da137421677761e33daaa96089bb`.
A diagnostic subset may omit a complete owner, but its missing observations and
incomplete coverage are explicit. It cannot silently become complete evidence.

## Verification

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/reviewed-source-batch-observation-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

**7/7 pass**, exit 0, **96,202.3165ms**, no skips, cancellations or TODOs.
The 17 rejection controls cover altered scalar inputs, duplicated owners/cases,
reordered cases, forged tree metadata, changed plan membership/receipts/claims,
each changed source report, and an invalid normalization function. A separate
subset check verifies exact conservation of all remaining observations.
Log: `artifacts/material-parity/field-host-flow-input-audit/reviewed-source-batch-observation-binding-sep20.log`.

## Next step

Attach this freshly replayed binding at the main classifier's unresolved-input
boundary. Preserve prior classifications and every raw observation. Verify that
the resulting complete canonical rows equal the already-tested dry-run
transition, then run full builder validation and canonical freshness. Until
those steps finish, do not subtract these groups from the unresolved total.
The unfiltered harness now discovers 195 files; this seven-test run is not a
complete harness or enforced parity-matrix result.
