# Text alignment: contextual keyword correspondence, not global normalization

Four remaining original scalar groups have a bounded explanation: the reference
computes `text-align:start` in horizontal LTR writing, while the candidate's
three owner-local style stages explicitly contain `left`. The source review
covers **178 original observations**, not just one screenshot per component:

| Owner | Original observations |
| --- | ---: |
| `sort-primary` | 60 |
| `stepper-content` | 68 |
| `bottom-sheet-dismiss` | 25 |
| `bottom-sheet-copy` | 25 |

For the **requested alignment edge in these captured contexts**, this is an
equivalent representation. It is not equal whole-element input, generic
logical-keyword support, a candidate computed-inheritance proof, or matching
actual text placement. Structure, sizing, typography, applicable formatting
context and all other discrepancies remain independent. No captured keyword is
rewritten, no normalization rule is changed, and no canonical classification is
promoted by this review.

## Original context and browser control

The collector pins the complete prior membership proposal at `e3bc804`, replays
the original ancestry survey from its captured input trees, and visits every
member of these four groups. In addition to the survey's direction evidence, it
reads `writingMode` and `textAlignLast` directly from each authenticated original
reference tree. Every mapped owner and captured ancestor is LTR, horizontal-tb,
with start alignment and auto last-line alignment. Candidate owner-local
normal/resolved/interaction inspection stages all explicitly contain left. No
candidate used line box or painted placement is inferred from those values.

The CSS distinction matters: start follows the line's logical start; left follows
its line-left edge. They must not be globally interchanged. The relevant
definitions are in [CSS Text Level 3](https://www.w3.org/TR/2026/CRD-css-text-3-20260814/#text-align-property).

An independent browser-only control uses explicit Arial 16px/24px, 160px/240px
block widths, horizontal writing, LTR/RTL, start/left/end/right and DPR 1/2.
It captures **32 cases** and checks **16 logical-versus-physical pairs** in
Chromium **152.0.7977.84**, after fonts and two animation frames. Text-range
rectangles agree exactly for the matching edge. Each opposite-edge control
differs by more than 80px, including RTL start versus left. Page errors are zero.

This is geometric evidence for keyword semantics, not Astylar raster evidence.
It neither mounts AstylarUI nor claims native glyph ink, sharpness or Material
layout equivalence. The reproducible capture records its authored HTML, script
hash, individual computed styles and measured rectangles. The earlier ad-hoc
control is exploratory; the source-bound v2 report is the accepted evidence.

## History and remaining responsibility

The original showcase revision `2f440115740ff76fa9e55b3f4a11568207b2af5a`
already authors left alignment on `.sort-header` and `.bottom-sheet-option`.
Commit `4e58f58a71ab57bdc3102a01c2cc1f9ee8b17b3c` adds it to
`#stepper-content`; its parent `00de46ceffc78850115fca006a9680f8044efe75`
does not. Complete source hashes and exact declaration lines are retained in the
[machine review](material-ltr-alignment-review.json).

These are verified source-history facts, not evidence of author motivation or
executions of historical builds. The stepper change also included layout/spacing
and structural changes; this bounded alignment-edge correspondence does not
justify those other adjustments.

The current core `TextStyleParserService.parseTextAlign`, in
`src/app/services/text/text-style-parser.service.ts:344`, accepts only left,
center, right and justify, and otherwise warns and falls back to left. That
source limitation is **not fixed or certified** by the browser control. A
public equal-input logical-alignment reproduction is needed to establish the
consumer consequences before implementation. Do not substitute physical keywords
in the example to hide missing core logical-alignment support.

All six other retained groups / 235 observations stay outside this proposal:
the separately reviewed expansion owner, inherited expansion-title alignment,
the progress owners' explicit requests, and the two overlay scalar-capture gaps.
The existing 49-group adapter and its pinned plan are unchanged. Adding this
review to the canonical report still requires exact-row membership/precedence
and conservation verification.

## Reproduction and verification

```text
node scripts/capture-text-align-keyword-reference.mjs
node scripts/audit-material-ltr-alignment.mjs
node --max-old-space-size=2048 --test --test-concurrency=1 tests/material-parity/ltr-alignment-review.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
node scripts/audit-material-ltr-alignment.mjs --check
```

The first command prints its report; preserve it at a new path on subsequent
runs rather than overwriting the bound v2 evidence. The collector currently
binds `artifacts/material-parity/field-host-flow-input-audit/text-align-keyword-reference-v2.log`.
Generation and independent write-prohibited replay validate all original source
members. Focused tests also reject altered browser context/geometry and changed
original writing direction, writing mode, last-line rules and candidate stages.
No renderer, plugin, canonical fixture, reference truth or threshold changes.

Generation exits **0**. Independent write-prohibited replay, eighteen mutated
browser/source-context rejection controls, bounded membership/history assertions
and inventory checks pass **8/8**, exit **0**, no skips/cancellations/TODOs, in
**35,468.6374ms**. The replay checks both canonical files remain unchanged.
Logs are `ltr-alignment-generation-final.log` and `ltr-alignment-verification.log`
under `artifacts/material-parity/field-host-flow-input-audit/`.
Machine review SHA-256:
`2f4e7b5b44090dd8564a12c8856ae6de1b74d118a86cc07192c1daea53eeaf26`.
The standalone `--check` command is also executed inside the write-prohibited
test; it is not claimed as an additional independent run.

The discovered harness now contains 168 files. Complete audit coverage,
canonical integration and the full unfiltered enforced parity matrix remain
outstanding; this focused verifier pass retains those obligations.
