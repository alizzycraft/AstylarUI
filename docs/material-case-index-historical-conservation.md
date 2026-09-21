# Historical case-index source conservation

## Finding

Nine saved case indexes retain audit-module source hash
`82854bccdaa6ff23fc5f9df987f6ec5cf3e22d0da5dbe64357109d5a03035f3b`,
authenticated against revision `4650791a7208b841dd29f1ced015f98234949623`.
The legacy tests compare that historical receipt to today's whole module and
therefore reject it before reaching their membership checks.

All non-receipt fields in all nine indexes are exactly equal to their committed
baseline at `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0`. This includes findings,
classifications, capture receipts, membership order, and pending follow-ups.
Every other listed source dependency still matches. The established source
projection independently verifies all 230 retained main-module statements,
allowing only reviewed orchestration/imports and the separately authenticated
color-normalization correction. It does not assert old/new colors are equal.

## Evidence

`audit-material-case-index-conservation.mjs` authenticates both historical
module receipts, checks complete non-receipt conservation, and verifies the
current source projection. It then makes temporary in-memory copies of the nine
reports solely to run the unchanged legacy membership assertions past their
whole-module receipt check. It does **not** write those copies to disk.

The eleven `case index` test statements must match their historical AST text
exactly. A separate child runs all eleven, with synchronous writes rejected and
reads of the nine reports substituted only after conservation succeeds. Saved
report byte hashes and fresh source evidence are checked again afterward.

```text
node --max-old-space-size=1536 scripts/audit-material-case-index-conservation.mjs
```

Result: **11/11 membership tests passed**, no skips or failures,
61,361.7996 ms. Their complete TAP output is embedded in
`material-case-index-historical-conservation.json`, with output SHA-256
`a0b93433d3dd7efa5a8f7b65df1d872d53b7f9c54f28ea9662d5049b19d5b277`.
Generated evidence SHA-256:
`ec753aa2328f9ea8d1445ae0f40774ef8ade4db5819a54dcbe8233c7afdac1c8`.

The nine indexes cover container caret, root height, field-host color, root
color, root typography, field-host alignment, field-host typography,
non-widget appearance and Material button appearance. Passing their membership
assertions does not prove every current canonical classification or rendering.

## Limits and integration

This is preparatory verification. The original saved reports and legacy tests
remain untouched, so the ordinary broad suite still needs a source-aware
historical binding integrated after the running canonical generation finishes.
Do not replace saved historical hashes with today's hash or treat this replay
as the full 388-test suite. It establishes why the nine receipt checks can be
migrated without dropping or changing their membership assertions. It does not
identify or clear every failure from the earlier broad run.

The independent focused tests cover altered findings in each index, changed
receipt identity/order, membership order, another source dependency, and
retained mapping behavior. They also verify that in-memory projection changes
only the source receipt and preserves all disk records.

```text
node --max-old-space-size=1536 --test --test-concurrency=1 --test-reporter=tap --test-reporter-destination=artifacts/material-parity/case-index-historical-conservation-96ac5ba.tap tests/material-parity/case-index-historical-conservation.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Result: **6/6 passed**, no skips or failures, 17,475.5637 ms. The full output is
retained at the reporter destination above.
## Explicit assertion adapter (prepared, not integrated)

`tests/material-parity/historical-case-index-source-assertion.mjs` provides an
explicit replacement for comparing a historical module receipt to today's full
module bytes. It authenticates the saved historical report and the separately
reviewed current-source projection, then requires the caller's entire index to
equal that authenticated saved object. It never rewrites disk receipts or mutates
the caller's index, and makes no canonical-classification acceptance claim.

All nine indexes passed the adapter; negative checks reject an unknown index,
changed caller membership and a changed retained source declaration. Command:

```text
node --test --test-reporter=tap --test-reporter-destination=artifacts/material-parity/historical-case-index-source-assertion-c35c080.tap tests/material-parity/historical-case-index-source-assertion.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Result: **6/6 passed**, no skips/cancellations, 15,471.6705ms. The main legacy
suite has not yet been changed: it is fingerprinted by the live regeneration.
Integration must preserve every original membership assertion and verify the
scope of the sole source-receipt assertion replacement. This adapter's focused
pass is not a pass of that legacy suite or the complete discovered audit harness.
