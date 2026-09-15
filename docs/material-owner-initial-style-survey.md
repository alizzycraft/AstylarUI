# Remaining mapped-owner initial-style survey

This is source-bound diagnostic triage, not a renderer fix or canonical
attribution. The canonical audit still has **3,138 unresolved groups**.

## Scope and results

The [machine inventory](material-owner-initial-style-survey.json) selects all
**600 unresolved groups** for `fontStyle`, `wordSpacing`, `textTransform`,
`whiteSpace`, `overflowWrap`, `wordBreak`, `pointerEvents` and `visibility`.
It reopens the original capture and both input trees for **1,734 cases**, checks
their digests, and examines **32,144 raw property observations**. Each group
retains all matching original cases, rejection reasons, representative complete
diagnostic results and a digest of the ordered per-case results.

| Diagnostic outcome | Groups |
| --- | ---: |
| Captured default versus local omission in every raw matching case | 297 |
| Direct authored-ID mapping is insufficient | 150 |
| Motion declarations require further review, without other detected requests | 108 |
| Explicit relevant declarations, without other detected issues | 8 |
| Explicit declarations plus motion | 24 |
| Explicit declarations plus noninitial reference values | 9 |
| Explicit declarations, motion and noninitial values | 4 |

These outcomes are mutually exclusive group partitions, not defect counts.
Within each group the detailed reason lists can overlap. Unknown selectors,
font/whitespace aliases, resets, inline attributes and missing stages are not
discarded. Motion duration declarations conservatively block the simple proof;
that does **not** establish that they animate the property under examination.

Only **549 groups** have the same raw matching occurrence count as the canonical
unresolved row. Of those, **258** have the narrow captured-default/local-omission
result throughout. Neither number permits automatic canonical reclassification.
Matching counts alone do not prove identical case membership or equivalent
computed values, descendants, hit testing, wrapping, visibility or rendering.

## Why the 51 count differences matter

The canonical grouping includes classification, attribution and justification,
not merely family/element/property/value. The survey deliberately matches raw
scalar signatures without pretending to replay those classification decisions.

For example, `badge/badge-label/fontStyle` has 52 original `normal` versus
omitted observations. The canonical report separates 12 static observations as
`reviewed-stage-mismatch`, with retained-text evidence, from 40 still-unresolved
interaction observations. The survey retains all 52 and flags the unequal
count. It must not overwrite the already reviewed static classification or
claim its proof automatically covers the interaction paint.

The owning grouping is in `collectStyleDiscrepancies` in
`tests/material-parity/input-equivalence-audit.mjs`; the relevant signature
includes the classification metadata after the raw values. This distinction
must be preserved when integrating any broader attribution reader.

## Why 150 direct-ID mappings need specific review

An absent direct ID is not an absent rendered element. The reference collector
in `tests/material-parity/run-material-parity.mjs`, function
`referenceGeneratedTextTarget`, maps synthetic measurement IDs to generated
Material nodes. For example, `badge-count` selects
`#badge-primary .mat-badge-content`; the first original reference tree contains
`span#mat-badge-content-0` at `frame/2/0/1`, not `#badge-count`.

This survey does not guess or replace those mappings. It retains `owner-mapping`
as an explicit limit. The existing reviewed full-tree correspondences should be
reused and independently validated before extending the reader, especially for
dialogs, tooltips and other generated overlay owners. Overlay ancestry also
requires its own containment and inherited-style evidence rather than assuming
the ordinary main/page path applies.

## Next integration steps

1. Replay exact canonical case membership, retaining previously classified
   static observations and independent interaction obligations.
2. Reuse source-reviewed generated-node mappings; reject missing, ambiguous or
   transplanted owner correspondences rather than inferring them from text.
3. Trace explicit state requests separately, particularly held/disabled
   `pointer-events:none`. The sibling-thumb survey already shows why treating
   all pointer-event omissions as an initial default is unsafe.
4. Determine whether motion declarations actually affect the property before
   relaxing any conservative rejection. Do not drop them based on screenshots.
5. For eligible observations, attribute only the demonstrated measurement-stage
   gap. Candidate computed inheritance/consumption and final output remain
   separate proofs. Keep all raw values and unrelated complete rows unchanged.

No renderer, plugin implementation, comparison authoring, reference truth or
acceptance threshold was changed. This standalone survey is not yet registered
in the 39-file harness or integrated into the canonical attribution pipeline.

## Verification

Commands:

```powershell
node scripts/audit-material-owner-initial-styles.mjs
node --test tests/material-parity/owner-initial-style-survey.spec.mjs
node scripts/audit-material-owner-initial-styles.mjs --check
```

The test suite checks a real captured positive case, sixteen negative mutations,
property-specific scope, complete original scalar case membership, the explicit
52-versus-40 counterexample, and a no-write full tree replay. Terminal test
results: **4/4 pass**, zero failures/skips/cancellations, **78,260.8804 ms**.
The fourth test invokes the listed `--check` command, reopens every paired tree,
compares the complete regenerated report and verifies that it does not rewrite
the checked-in artifact.
