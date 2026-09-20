# Shared button paint: source-bound classification proposal

The [machine proposal](material-shared-button-paint-attribution-plan.json) freshly
replays the complete [600-owner state census](material-button-paint-all-states.md)
and authenticates every byte of the frozen canonical payload at `67db724`.
It uses the independently bound production normalization functions without
changing raw source values or supplying missing styles.

## Proposed and retained populations

| Population | Groups | Property observations | Action |
| --- | ---: | ---: | --- |
| Complete groups with active reference layers | 32 | 135 | Propose application/plugin authoring defect |
| Groups including inactive reference layers | 16 | 173 | Retain for separate review |
| Previously classified button-primary groups | 8 | 24 | Preserve prior classification |
| Equal host-background scalars | — | 268 | Preserve; not evidence of equal layer composition |

All 600 source observations are accounted for. The 32 proposed groups consist
of core (4), menu (8), bottom-sheet (4), dialog (4), snack-bar (8) and tooltip (4).
Each proposed group matches the canonical occurrence count, ordered case sample
and complete state list; its full ordered source membership and original
input/proof/tree hashes remain in the proposal. The complete original canonical
row hash is retained too.

The first demonstrated divergence is unequal paint authoring: the reference
preserves a base background plus an active translucent child pseudo-layer,
while the candidate authors a leaf and replacement host background. This does
not establish that core cannot render the equivalent layered input. Sibling
plugin paint, pointer/rebuild lifecycle, clipping, alpha composition and final
pixels remain separate obligations.

## Why inactive states are not promoted

The wider census closes the old survey's partial case coverage, but also reveals
that some identical color-pair signatures span both active and inactive
reference-layer states. In particular, bottom-sheet and dialog triggers retain
candidate hover-like colors during some modal/open states while the reference
layer is inactive. A hover-only authoring explanation is not a complete
explanation of those groups. The secondary and disabled button backgrounds also
need their own base/disabled input review.

The planner therefore retains all 16 such groups. It also refuses promotion
when canonical membership is missing, duplicated, incomplete or already
classified. No previously accepted classification is replaced.

## Conservation and scope

The other **8,307 complete canonical rows** have ordered digest
`82898499f239d8ecdcbd010319c98c482928d85d7c6750820cf640a87bbc47af`.
The frozen baseline has 1,960 unresolved groups. This is a standalone historical
proposal, **not canonical integration** and not a subtraction from the current
1,835-group count. Before promotion, bind it to the accepted current population,
independently replay source coverage, and conserve every unrelated complete row.

Restore equivalent base/layer structure in the later implementation task, then
test it through core paint and interaction. Do not tune another opaque color to
match the screenshot or infer root causes for modal positioning from this review.

## Verification

```text
node --max-old-space-size=1536 scripts/audit-material-shared-button-paint-attribution.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/button-paint-attribution.spec.mjs tests/material-parity/button-hover-composition.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0: 32 groups / 135 observations proposed, 24 groups / 197
observations retained, 268 equal scalars preserved. Proposal SHA-256:
`3c9bfd957b4b02b0abe034c62c9ba26a73dba84fa0ae290a1648933a346849a6`.
The initial focused run passed **8/8**, exit 0, **103,413.9884ms**. Pre-commit
review then found that the initial script/report names collided with the existing
eight-group primary-button attribution at `547d349`. The broader proposal now
uses distinct `shared-button-paint-attribution` filenames. Both historical files
were restored and compared in full against that commit (checkout line endings
normalized); no prior code or report is replaced by this increment.

A combined run of the historical five-test suite, new four-test suite and four
harness checks passed **13/13**, exit 0, **200,078.7142ms**, with no failures,
skips, cancellations or TODOs after the separation. It covers source corruption,
partial/duplicate membership, preservation of prior classifications, immutable
inputs, complete source/payload replay with writes prohibited, and harness
discovery/runner checks. Its log is
`shared-button-paint-attribution-preservation-sep20.log` in the directory below.
Logs are `button-paint-attribution-generation-sep20.log` and
`button-paint-attribution-full-sep20.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.
