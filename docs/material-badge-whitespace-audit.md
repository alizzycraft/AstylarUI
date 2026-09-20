# Badge label: explicit whitespace input mismatch

The source-bound [inventory](material-badge-whitespace-audit.json) checks all
2,311 original cases and all 52 badge label observations: 12 static and 40
interaction cases. Every reference computes `white-space: normal`; AstylarUI
explicitly authors `.badge-label { whiteSpace: 'nowrap' }` and retains it in
all three captured local style stages. Corresponding leaf identity/content,
all 89 reference scalar properties, candidate stages, rule indexes and captured
ancestor requests are independently checked against authenticated input trees.

Classification: **application/plugin authoring defect**. The first divergence
is an authored whitespace request, not a demonstrated renderer interpretation
failure. No canonical row is promoted by this standalone review.

## History and causal limits

At the parent-to-`7945a42` edge, the comparison introduced the badge label span
and its `nowrap` rule together with profile-dependent relative/top offsets.
The already-present measured anchor widths were retained. Later `48c994e`
removed those label offsets but retained `nowrap`. The report records exact
commit/source hashes and line witnesses; this is not a historical browser bisect
or evidence of developer intent.

`Notifications` is a single unbroken word. These captures do not demonstrate
that the whitespace difference changes the visible result, and it must not be
described as the cause of the zero-width parent. The existing
[badge public reductions](material-input-audit-investigation.md#badge-reduction-intrinsic-parent-width-and-positioned-margins-2026-09-12)
already isolate descendant intrinsic sizing and positioned-margin defects with
equal inputs. Reuse those proofs rather than adding more label offsets or
claiming that changing whitespace repairs core sizing.

Future restoration must match the reference whitespace contract and remove
measured-width compensation only alongside verification of the owning intrinsic
layout correction. No fixture or renderer behavior changes in this increment.

## Verification

Run `node scripts/audit-material-badge-whitespace.mjs --check` and
`node --test tests/material-parity/badge-whitespace-audit.spec.mjs`.
The replay is write-prohibited; 13 mutation controls exercise identity,
provenance, scalar, stage, ancestor and explicit-rule rejection. This is input
audit evidence, not full-matrix acceptance or proof of equal rendered output.

On 2026-09-20 the two owning tests passed (exit 0, 3,986.8554ms), the standalone
freshness check passed, and all four harness inventory/runner tests passed
(exit 0, 533.1548ms). No tests were skipped or cancelled. The generated report
SHA-256 is `2bb6325b1e0c409348f1af75209ea121a3b8c4da8d90347d0fac77a0fa9d71e4`.
