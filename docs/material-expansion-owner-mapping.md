# Expansion: the same diagnostic ID denotes different roles

The [original-source proof](material-expansion-owner-mapping.json) verifies a
**harness mapping defect in all 68 expansion captures**. The HTML
`expansion-primary` is the `mat-expansion-panel`. The candidate uses that ID for
its `div.expansion-trigger`, a header button inside `article#expansion-shell`.
Matching IDs therefore do not identify corresponding style/layout owners.

| Role | HTML owner | Candidate owner |
| --- | --- | --- |
| Whole panel | `mat-expansion-panel#expansion-primary` | `article#expansion-shell` |
| Header button | `mat-expansion-panel-header` | `div#expansion-primary.expansion-trigger` |

These are structural correspondences to investigate, **not declarations of
equivalent structure, styles, geometry, behavior or rendering**. In particular,
the candidate chevron is a sibling of its header. Its title/header font-size
scope already has a separate [authoring finding](material-expansion-title-inputs.md).

## What the evidence establishes

The verifier authenticates the original report and both complete input trees,
reuses the existing exact title/header/panel ancestry proof, and checks all
**89 original reference scalar properties** against the panel. All three
candidate scalar stages match the trigger exactly. Node roles, parentage,
title ownership, expanded/disabled states and tab stops are independently
checked; a same string or screenshot is not the mapping criterion.

The apparent font-weight mismatch is **400 on the reference panel versus 500 on
the candidate header**. The actual reference header computes **500 in all 68
cases** from its Material header token. Changing candidate header weight to 400
to clear that original row would be an incorrect fixture compensation.

Correct role selection must not erase genuine differences. In the **eight
disabled captures**, the reference header computes cursor `auto` whereas the
candidate header retains `pointer`. The reference pointer declaration applies
only to headers not marked disabled; the candidate `.expansion-trigger`
declaration is unconditional. The other 60 captured header cursors match
`pointer`. This establishes a captured authoring difference, not a browser
pointer-hit-testing or runtime-cursor guarantee.

## Source history and ownership

The report records exact source lines and hashes for both templates and the
capture harness. Both ID roles exist in initial showcase commit `2f44011` and
current source. The original candidate trigger was a `button`; it is now a
`div` with button semantics. The role mismatch therefore cannot be attributed
to a later parity fix from this evidence. No developer intent is inferred.

The capture harness's `referenceTarget` selects the authored ID first, and
`compareStyleInputs` pairs the captured elements by ID. The first incorrect
comparison boundary is role correspondence, before any inference about
font-weight resolution or rendering. Existing raw observations remain intact.

## Verification

```text
node scripts/audit-material-expansion-owner-mapping.mjs
node --test --test-concurrency=1 tests/material-parity/expansion-owner-mapping.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0; report SHA-256 is
`5a7fb8f30727708ddccf83caa1077247bfabf495501bb0695433048d28cb7c73`.
The focused suite passes **7/7**, exit 0, with no skipped, cancelled or TODO
tests, in **4,374.9446ms**. The full replay prohibits filesystem writes and
checks that canonical files and the saved proof remain byte-identical.
Forty-six mutation controls reject changed scalar ownership, missing values,
wrong roles/paths, reparented content, duplicated owners, altered tokens and
state mismatches. A separate pass checks all 68 cases without mutating inputs.

The initial history assertion incorrectly assumed the original candidate
trigger was also a `div`. It failed on the actual historical `button` and was
corrected to assert both observed versions explicitly. The first negative-test
run exposed shared mutable input in the test fixture; independent clones now
prevent one mutation contaminating the next. Both failures are retained in
the artifact logs, not mistaken for renderer findings.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`expansion-owner-mapping-generation.log`,
`expansion-owner-mapping-generation-corrected.log`,
`expansion-owner-mapping-focused.log`, and
`expansion-owner-mapping-focused-corrected.log`.

## Implementation order, not implemented by this audit

1. Separate interaction-target identity from comparison-owner identity in the
   harness. Retain panel-to-panel and header-to-header records, with exact
   structural/semantic mapping guards. Do not rename reference truth or discard
   the original bad pairing without a documented evidence transition.
2. Recollect the mapped state matrix and classify all remaining property
   differences individually. Matching header weight does not settle panel
   paint, dimensions, clipping, child order or typography inheritance.
3. Restore equivalent disabled-cursor input at the appropriate authoring
   owner, then test actual pointer behavior through public APIs. Do not patch
   the core to force a cursor contrary to the authored rule.
4. Investigate core defects only for the remaining equivalent-input failures.

No fixture, renderer, canonical mapping or canonical attribution is changed by
this increment. The complete audit and enforced parity matrix remain open.
