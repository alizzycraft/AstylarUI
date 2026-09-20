# Follow-up input evidence under precise normalization

## Result and scope

The live follow-up reader now uses the precision-preserving normalizer, while
the four historical attribution collectors explicitly execute the normalizer
from their original canonical revision. No historical proposal or source-proof
JSON is rewritten. A new shared binding utility names the historical/current
choice explicitly and authenticates the chosen function set before execution.

The live builder replays each source proof, authenticates each original input,
and compares the current normalized property values with its exact historical
proposal. All **66 groups / 2,640 observations** still match:

| Source plan | Groups | Observations |
| --- | ---: | ---: |
| Leaf font family | 4 | 96 |
| Leaf weight/tracking | 8 | 192 |
| Expansion owner mapping | 43 | 1,596 |
| Control font-style inheritance | 11 | 756 |

These classifications are unchanged, not new equivalence findings. In
particular, expansion-owner mismatches still require role-correct recapture;
this migration does not establish renderer causality or resolve those UI bugs.

The current binding includes both `historicalPlans` and `current` normalization
descriptors. The synchronous live reader claims fresh source replay, not a new
decode/join of the historical canonical payload. Separate read-only commands
authenticate that complete payload and reproduce the original joins.

## Weight/tracking boundary

The source collector itself formerly required the old live normalizer. It now
executes both the historical and current functions and compares the selected
`fontWeight` and `letterSpacing` values before returning only those properties.
It cannot supply rounded color values to callers. All **304** original source
proofs remain identical, including the retained-text provenance and explicit
limits on what those proofs establish.

Historical joins bind their normalizer to `06e50dbcd3594c5987d63a4ec38e792b87b08dde`
for leaf-family evidence and `957774a` for the other three sets. The original
seven-function digest is
`8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e`;
the precise current digest is
`27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773`.
Changed current code, a historical descriptor applied to current code, changed
current property values, and false historical contracts are rejected.

## Verification

The pre-change live replay failed on its old-normalizer assertion, retained in
`artifacts/material-parity/field-host-flow-input-audit/followup-normalization-before-sep20.log`.

```powershell
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/audit-normalization-contracts.spec.mjs tests/material-parity/leaf-weight-tracking-stages.spec.mjs tests/material-parity/followup-input-source-replay.spec.mjs tests/material-parity/followup-input-audit-source-binding.spec.mjs
```

Result: **15/15 passed**, exit 0, no failures/skips/cancellations/TODOs, in
**72,324.0987 ms**. Log:
`artifacts/material-parity/field-host-flow-input-audit/followup-normalization-live-sep20.log`.
The tests replay the complete current membership and reject 48 changed
weight/tracking contexts, 23 invalid source receipts, 18 projection mutations,
14 emitted-row mutations, and changes to current normalization values.

`node --max-old-space-size=768 --test tests/parity/material-audit-harness-inventory.spec.mjs`
also passed **4/4**, exit 0, in **558.5328 ms**, with no failures or skips.
Its log is
`artifacts/material-parity/field-host-flow-input-audit/followup-normalization-inventory-sep20.log`.

```powershell
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/followup-input-proposal-binding.spec.mjs tests/material-parity/followup-input-proposal-transition.spec.mjs
```

Historical replay log:
`artifacts/material-parity/field-host-flow-input-audit/followup-normalization-historical-sep20.log`.
Result: **6/6 passed**, exit 0, no failures/skips/cancellations/TODOs, in
**716,105.202 ms**. All four original canonical joins and the complete metadata
transition reproduce unchanged, preserving all **8,273 unrelated complete
rows**. Both commands prohibit report writes and retain the historical proposal
and transition JSON byte-for-byte.

## Remaining work

No renderer, plugin, comparison input, historical proposal or canonical audit
payload changes here. Alignment readers and remaining color-dependent evidence
still need current-value validation; canonical regeneration, complete coverage,
and the full enforced parity matrix remain outstanding.

A read-only probe of `replayAlignmentFontPlans`, `replayTextAlignPlan`, and
`replayLtrAlignmentReview` failed in all three cases at the combined mapping/
normalization guard: current digest
`532be752d1d356da8d3efc1fae4d376b7dbedbc5a830ad9d9a32ced093775cdb`
versus expected historical digest
`2e976169c8113ffc95478b88971e4bd175e5ac80a769eeac2b2a4d67a7085971`.
The complete three-result diagnostic is retained in
`artifacts/material-parity/field-host-flow-input-audit/alignment-normalization-before-sep20.log`.
The next investigation must distinguish changed normalization from mapping
changes rather than simply replacing this combined digest.

The preceding commit's push failed with HTTP 408, and `git ls-remote` still
reported `d9b374fb6cd744d9e792f4ed30b00f2415ff7f52` for
`codex/material-audit-alignment-integration`. Local commits are not claimed as
published.
