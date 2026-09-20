# Content flex requests omitted from two comparisons

The [source audit](material-content-flex-requests.json) reviews 100 original
content-owner observations, covering three property groups and 168 property
observations. All 2,311 original capture entries are scanned; closed dialogs
without content are not counted as content-layout observations.

| Owner | Property | Reference request / computed | Candidate local stages | Observations |
| --- | --- | --- | --- | ---: |
| Expansion title | `flex-grow` | `1` / `1` | `0` | 68 |
| Expansion title | `flex-basis` | `0px` / `0px` | `auto` | 68 |
| Dialog content | `flex-grow` | `1` / `1` | `0` | 32 |

These are **application/plugin authoring differences**, present before renderer
layout. The captured active Material rules explicitly request those values;
the captured corresponding candidate requests do not. All three candidate
local-style stages retain the differing values. This is not an equal-input
core flex failure.

## Composition matters

The expansion title is a `mat-panel-title` in a `.mat-content` flex wrapper.
Its candidate is a span directly inside the replacement expansion trigger.
The reference title itself requests flex display, centered cross-axis content
and a 16px right margin; the candidate's surrounding layout is not equivalent.
The existing [title font audit](material-expansion-title-inputs.md) separately
documents the missing header token and compact-only descendant override.

The dialog content is a `mat-dialog-content` inside the Material dialog surface.
The candidate is a paragraph in a fixed-size replacement panel. The reference
requests block display, overflow handling and a maximum height; the candidate
requests flex display and a fixed 20px height. Merely making the grow scalar
match would not restore equivalent content sizing or prove the historical
dialog-height symptom corrected.

The report preserves complete captured owner requests, parent identity and
layout context, all original scalar/tree bindings and all candidate local
stages. It does not assert used geometry, equal rendering, compensation
necessity, historical introduction or author intent. No canonical row is
promoted by this source survey, and no renderer or comparison code was changed.

## Implementation handoff

The earlier [alignment population history](material-vertical-align-population.md)
already scans 102 candidate revisions. It identifies `354084e` as introducing
the expansion title's `middle` request and `bc0e449` as adding dialog content
height, flex alignment and padding together. The existing
[investigation ledger](material-input-audit-investigation.md) also records
`d102828` (dialog title span/flex-flow substitution) and `5b02171` (later title
and content padding adjustments). Direct review of those diffs confirms this
lineage. Reuse those historical findings alongside the three new flex-property
groups; the new source survey is not a new historical browser bisect or proof
that any particular offset was necessary to compensate for a core failure.

Restore the reference component structure and flex/size constraints as a whole
in the later implementation task. Test expansion width, labels and sibling
indicator layout, and dialog content growth, wrapping and scrolling, including
responsive and state changes. Only then attribute any remaining divergence to
core flex sizing, intrinsic measurement, text layout or clipping. Do not use
fixed heights, margins or glyph offsets as substitutes for those contracts.

## Verification

```text
node scripts/audit-material-content-flex-requests.mjs
node scripts/audit-material-content-flex-requests.mjs --check
node --max-old-space-size=1024 --test --test-concurrency=1 tests/material-parity/content-flex-requests.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and no-write replay exit 0. **7/7 tests pass**, exit 0,
**5,034.5965ms**, no failures, skips, cancellations or TODOs. Thirty negative
executions reject changed identity, text, source declarations, parent contexts,
provenance, scalar values and candidate stages. The no-write replay verifies
that the canonical manifest and payload remain unchanged.

Log: `artifacts/material-parity/field-host-flow-input-audit/content-flex-requests-tests-sep20.log`.
Report SHA-256:
`46cdcbaaa758f1bb8661b47d943c39647671ba89dea414fa7b9531fe056aadd9`.
