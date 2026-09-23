# Position review integration queue

This queue covers all 58 groups / 2,950 observations in the pinned position
population. It does not claim completion of the larger input-equivalence audit.

| Status | Groups | Observations |
| --- | ---: | ---: |
| Historical export conserved; current-source reconciliation pending | 6 | 316 |
| Producer integrated; export/conservation pending | 14 | 768 |
| Inspected; classification pending | 17 | 811 |
| Investigation pending | 21 | 1,055 |

The six producer-integrated groups are grid-list root/tiles, divider and switch
placement. Their historical export now passes scalar/control conservation;
see [the transition record](material-position-canonical-conservation.md).
Later workflow edits changed twelve producer/test receipts, so historical
conservation is not a claim of current-builder freshness or final acceptance.
The fourteen newly integrated groups are tooltip, tabs, stepper, radio, three
choice-label stacking substitutions and seven static-position observation-stage
cases. The production adapter now collects, applies, serializes and validates
their bound evidence. Cold integration changes exactly fourteen metadata rows
and preserves all 8,362 raw rows. The canonical package has not been regenerated:
full export/conservation and current-source reconciliation remain pending.
Sort focus placement, toolbar composition and three
button-toggle owners, three chip owners and nine modal owners have inspection evidence but are not
represented as integrated classifications. Every other row remains
explicitly pending, including relative-position omissions and overlay wrappers.

`material-position-review-queue.json` includes every original group/value/count,
prior row digest and the relevant source-report hash. Assembly checks complete
ordered case membership against the original population and refuses duplicate
reviews. This is a coverage/integration ledger, not a replacement for replaying
the source proofs or validating canonical conservation.

Regenerate with `node scripts/material-position-review-queue.mjs`.
`node --test tests/material-parity/position-review-queue.spec.mjs` passed 2/2,
exit 0, 176.2477 ms. Four negative controls reject missing/reordered cases,
unknown groups and duplicate reviews. No canonical acceptance or output parity
claim is made by this ledger.
