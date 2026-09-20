# Reviewed source batch: main-pipeline integration

The main input-audit builder now loads the independently replayed source batch,
uses its precise current-value projection, and applies its classifications only
after the existing classifiers leave an observation unresolved. It records the
batch in the report, validates its complete source and row coverage, retains
every reviewed case, and fingerprints the implementation and focused proofs.
The Markdown report explicitly distinguishes these findings from input or
rendering equivalence.

The overlay and alignment source-conservation guards permit the exact new
orchestration import. Their retained mapping statements and precise-normalizer
checks remain enforced; this is not a wildcard exception for source changes.
`collectStyleDiscrepancies` is exported from the internal audit module for its
focused production-pipeline test, not from AstylarUI's public package.

## Production-pipeline proof

```text
node --max-old-space-size=1536 --test tests/material-parity/reviewed-source-batch-pipeline.spec.mjs
```

Passed 1/1 in 93,595 ms. It replays the source evidence and runs the actual
production discrepancy aggregation twice against original captured inputs,
with and without the batch. Other bound review populations are absent in both
calls, so this deliberately does not claim complete canonical integration.

The result classifies exactly 146 groups / 6,295 observations. All 8,216
unrelated complete rows remain identical. Three baseline rows contain both
reviewed and unreviewed observations in this reduced proof context; the test
requires the split, preserves the residual classifications and observation
counts, and checks complete reviewed membership through the source validator.
No raw scalar is changed by classification, and the total observation count is
unchanged. The first test version incorrectly assumed that classification
could not split a row; it failed at 8,365 versus 8,362 groups. The corrected
assertions check observation conservation rather than hiding those residuals.

Final source-conservation and harness-discovery checks passed all 18 tests in
66,969 ms, with no skips:

```text
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/alignment-survey-conservation.spec.mjs tests/material-parity/original-overlay-context-survey.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Together with the pipeline proof, these are 19 focused passing tests. They do
not replace the failed broader run below or establish full parity acceptance.

## Broader verification is not yet complete

An attempted run of `alignment-survey-conservation.spec.mjs` and the full
`input-equivalence-audit.spec.mjs` terminated after 39 passing checks. Node's
test runner reported Windows exit code `3221226505` for the latter file, after
376,519 ms; the overall run ended after 386,556 ms. The file contains 388 tests,
so this is explicitly a failed, incomplete run. The cause of the native process
termination has not been established. A read-only recent Application Error
event-log query returned no matching diagnostic. No test or threshold was
removed to turn that run green.

The canonical payload has not yet been regenerated for this integration.
Regenerate it using the original complete capture and supplemental paths, then
check it independently. Preserve and revalidate previous classifications,
including the separately reviewed precise-color transition, before calling
the new canonical report accepted. Remaining difference classification and
the complete enforced parity matrix are still required by the audit goal.
