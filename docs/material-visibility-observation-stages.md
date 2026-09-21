# Prepared visibility observation-stage classification

The complete ancestry census now supports a bounded classification for **15
groups / 530 original observations**: `parity-harness-defect`, attributed to
`reviewed-visibility-observation-stage`.

The reference value is browser-computed `visible`; candidate inspection omits
the field at every captured normal, effective and interaction style stage.
The authenticated captured owner chains contain no visibility declarations or
`all` resets. Candidate rules are conservatively checked across the whole tree,
including unmatched rules, rather than guessing selector applicability.

This explains the comparison's unequal observation stages. It does **not** set a
candidate computed value, establish equal rendering, or excuse missing support
for authored hidden state. The public reproduction's hidden paint/hit-test
failures remain valid and separately documented. Uncaptured document ancestry
is not claimed to have been inspected.

Tabs and stepper remain outside this classifier: **2 groups / 138 observations**
use state-driven owners, with structural substitutions classified separately in
`material-panel-state-ownership.json`.

## Evidence and guards

- Full population digest and each raw tree digest are authenticated.
- Every ancestor must have the required captured styles; synthetic candidate
  document root remains explicitly unobserved.
- All reference chain values must be captured `visible`, with no relevant rule
  or inline request/reset; candidate style stages must omit visibility/reset.
- Custom candidate renderers and candidate inline styles require separate review.
- Classification requires the exact original scalar input digest; changing the
  owner, reference value, candidate value or captured stage rejects it.
- No computed-value, rendering-equivalence or renderer-causality claim is allowed.

`node --max-old-space-size=1536 --test tests/material-parity/visibility-observation-stage.spec.mjs`
passes **2/2** in **1,891.598 ms**, including all 530 authenticated original
inputs and negative controls for missing stages, inherited requests, resets,
capture errors, altered inputs and inflated claims.

The initial preparation incorrectly requested a `ruleEvidenceComplete` field
from the raw tree schema. That flag exists in derived ledgers, not the raw
capture. The corrected check uses raw schema/context versions, stylesheet-read
errors and per-rule active/declaration evidence. No capture was altered or
missing completeness flag fabricated.

## Integration remains pending

This is a tested preparation, not a canonical change. The collector supplies
authenticated proof contexts; the small classifier is not itself an independent
validator of arbitrary caller-supplied proof objects. Canonical integration must
rederive/validate contexts, preserve all raw rows, account for source receipts,
and prove that exactly these 15 groups change attribution. Neither the pending
state-owner groups nor any other property may be swept into this classification.

Generate with `node scripts/prepare-material-visibility-observation-stages.mjs`.
Machine evidence: `docs/material-visibility-observation-stages.json`.

### Validated binding now available

`bindVisibilityObservationStages` independently rederives the complete preparation
from authenticated source trees and requires whole-object equality before creating
private classification contexts. Editing a proof, removing/reordering/duplicating
members, changing classifications or dropping pending groups is rejected. Returned
metadata and classification results cannot mutate the private contexts.

`node --max-old-space-size=1536 --test tests/material-parity/visibility-observation-binding.spec.mjs`
passes **2/2**, no skips, **13,984.1966 ms**: all 530 original inputs classify,
unreviewed inputs do not, and 11 tampering controls reject. This closes the
unvalidated-context limitation for callers using the binder; the low-level
classifier alone still is not a source validator. Canonical wiring, exact row
conservation, source-receipt accounting and regeneration remain pending.
