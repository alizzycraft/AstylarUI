# Chip-set spacing: different layout inputs, not a demonstrated renderer cause

The [read-only verifier](../scripts/verify-material-chip-spacing-input-history.mjs)
checks the source history and every original chip case in the
[gap survey](material-owner-gap-input-survey.json). It hash-checks both original
trees and checks unique owner/child identities, ancestry and all three candidate
style stages. The [machine receipt](material-chip-spacing-input-history.json)
records **76 cases: 12 static and 64 interaction**, covering both chip-set gap
groups / **152 property observations**. Canonical attribution is unchanged.

## Confirmed inputs across those cases

- Reference `chips-primary` is an outer non-wrapping flex host. Its direct inner
  `.mdc-evolution-chip-set__chips` wrapper wraps, requests minimum width 100%,
  and has a computed left margin of -8px. Host and wrapper gaps are `normal`.
- The two reference `mat-chip-option` children belong to that inner wrapper.
  Each has 8px left and 4px top/bottom computed margins.
- Candidate `chips-primary` wraps directly with an 8px gap. Its two chip
  children have zero margins. There is no equivalent intervening wrapper.
- The candidate host has a fixed authored height and the individual chips have
  fixed, selection-dependent widths; these requests are retained in the case
  projection, not converted into reference used dimensions.

The active source locations are `astylar.component.ts:641`, `:697`, `:698`,
`:699`, `:704` and `:844`. This is a confirmed input/structure mismatch. Matching
horizontal spacing in one row would not establish equivalent wrapping, intrinsic
sizing, line spacing or edge spacing. The assertion scope is the 76 existing
captured cases; it is not a new narrow-width wrapping experiment.

## History

`7159b1d5266ed4bc03b56581b8034526abae892b` first adds the explicit chip-set
`gap: '10px'` rule. Its parent lacks that rule. The commit also changes plugin
and harness code, so it must not be described as a showcase-only commit.

`00de46ceffc78850115fca006a9680f8044efe75`, titled "fix(material): align chip
labels and spacing", changes that gap to 8px, selected widths from 98/94px to
97/93px, and removes a relative -2px label offset. Its only changed file is the
showcase component; it contains no renderer correction. Removing the offset is
not itself evidence of a regression or an inappropriate change.

These facts identify historical visual tuning and different current inputs.
They do not prove the author's rationale or the renderer defect that motivated
the initial composition. Keep the change as a **suspected compensation / confirmed
input mismatch**, not a confirmed core cause or equivalent representation.

## Next owning proof

Preserve the reference's wrapper, margins and sizing requests in an isolated
public-API reproduction. Test one-row and wrapped layouts, selection-dependent
intrinsic width, and narrow containers. Trace any divergence through shared
margin, flex intrinsic sizing and wrapping code; do not add a plugin spacing
calculator. Only propose removing the candidate substitution after that general
behavior has evidence. Existing margin-related core failures are leads, not
proof that they caused these original chip discrepancies.

## Verification

`node scripts/verify-material-chip-spacing-input-history.mjs` exits **0**.
Its JSON output matches the checked-in machine receipt. The case/owner/tree-hash
projection has SHA-256
`8d634bf9494c5cdc3feb8e9f504ebde8bdf0d14d0dd4d08d4fe0aa1de0512804`.
No canonical report, captured tree, renderer or comparison input is written.
This separate read-only proof was added after the complete 91-file harness
started at `52ec632`; it is not included in that run's inventory or totals.
