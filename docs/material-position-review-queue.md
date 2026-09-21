# Position review integration queue

This queue covers all 58 groups / 2,950 observations in the pinned position
population. It does not claim completion of the larger input-equivalence audit.

| Status | Groups | Observations |
| --- | ---: | ---: |
| Producer integrated; canonical conservation pending | 6 | 316 |
| Classified in standalone proof; integration pending | 14 | 768 |
| Inspected; classification pending | 8 | 544 |
| Investigation pending | 30 | 1,322 |

The six producer-integrated groups are grid-list root/tiles, divider and switch
placement. Their regenerated report must be conserved before acceptance.
The fourteen standalone groups are tooltip, tabs, stepper, radio, three choice-label
stacking substitutions and seven static-position observation-stage cases.
Sort focus placement, toolbar composition and three
button-toggle owners plus three chip owners have inspection evidence but are not
represented as integrated classifications. Every other row remains
explicitly pending, including relative-position omissions and overlay wrappers.

`material-position-review-queue.json` includes every original group/value/count,
prior row digest and the relevant source-report hash. Assembly checks complete
ordered case membership against the original population and refuses duplicate
reviews. This is a coverage/integration ledger, not a replacement for replaying
the source proofs or validating canonical conservation.

Regenerate with `node scripts/material-position-review-queue.mjs`.
`node --test tests/material-parity/position-review-queue.spec.mjs` passed 2/2,
exit 0, 295.3955 ms. Four negative controls reject missing/reordered cases,
unknown groups and duplicate reviews. No canonical acceptance or output parity
claim is made by this ledger.
