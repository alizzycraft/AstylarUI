# Reviewed source batch: classifier adapter

The adapter is prepared for the main audit's unresolved-observation boundary.
It does **not** modify the main builder or canonical classifications yet. The
current unresolved total remains **1,835**; the proposed reduction to **1,689**
still requires actual integration, conservation and canonical freshness.

## Source and ownership boundaries

The adapter replays the seven original source reports using the
[original-observation binding](material-reviewed-source-batch-observation-binding.md).
It retains exact case/element/property identity, original scalar-input and
proof digests, all missing-subset observations, and the distinction between
browser-computed values and candidate local declarations.

Classification requires the exact original input object, property and normalized
values. Unbound evidence supplies no classification contexts. A caller/report
mismatch or a capture path outside Material artifacts is invalid. Validation
replays source evidence independently, rather than trusting the proposed output.

The adapter shares the metadata formatter with the earlier pure transition;
that formatter is not a source authenticator. The regression test loads the
**original committed transition implementation from `7b842cb`**, authenticates
the complete historical `7cd5cb7` payload and compares every resulting row.
This guards the formatter extraction as well as the adapter's output.

No renderer, plugin or canonical comparison behavior changes. All records retain
false flags for input/raster equivalence, candidate computed values, cascade
winner, inactive motion, renderer causality and necessary compensation.

## Verification

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/reviewed-source-batch-audit-source-binding.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The initial complete run passed **9/9**, exit 0, **334,146.0652ms**, with no
failures, skips, cancellations or TODOs. It proves all 146 groups / 6,295
observations and preserves all 8,193 other complete rows. The unchanged ordered
row digest is `8c924d71e7da9ec5c7335f319fc395f27359b189dfbf55624e7d752184a7e18c`.
Log:
`artifacts/material-parity/field-host-flow-input-audit/reviewed-source-batch-classifier-adapter-sep20.log`.

Review then separated the accepted baseline revision (`7cd5cb7`) from the later
commit containing the verified join (`7b842cb`) in binding metadata. The focused
source-replay check with exact assertions for both receipts passes **1/1**, exit
0, **136,161.8571ms**, with no skips, cancellations or TODOs:

```text
node --max-old-space-size=1536 --test --test-name-pattern='classifier adapter independently' tests/material-parity/reviewed-source-batch-audit-source-binding.spec.mjs
```

Log: `artifacts/material-parity/field-host-flow-input-audit/reviewed-source-batch-classifier-revisions-sep20.log`.
This focused rerun supplements the nine-test run; neither is an unfiltered
harness or enforced parity-matrix result.

## Remaining population and next boundary

A separate complete authenticated read of the accepted alignment payload
confirms **1,835 unresolved groups**. Largest individual properties include
background color (118 groups), text color (105), line height (64), transform
origin (59), position (58), box sizing (55), appearance (54), letter spacing (54),
height (49), right inset (48), and width (47). Four border-color sides together
account for 181 groups. These are review signatures, not independent confirmed
renderer defects, and include the still-unintegrated prepared population.
The read-only census is retained in
`artifacts/material-parity/field-host-flow-input-audit/alignment-baseline-pending-population-sep20.log`.

After the current canonical source refresh is verified, integrate the adapter
without replacing prior classifications. Compare every output row against the
verified historical transition and keep raw observations unchanged. Continue
the larger paint/typography/positioning/box-model investigations by shared source
and owning subsystem; do not prioritize merely by easy-to-classify values.
