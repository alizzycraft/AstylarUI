# Overlay font inheritance input audit

## Finding

The reference overlay owners are outside the scaled comparison frame. Their
captured font size is 16px. The candidate owners are descendants of the scaled
`#page`, with no intervening local font-size request. In addition, the candidate
bottom-sheet panel omits the reference container's explicit Material font token.

This is an **application/plugin authoring and inheritance-context difference**,
not evidence that core computes inherited font size incorrectly. Candidate
computed/used owner font sizes are not available in these local-style stages
and are not synthesized by this proof.

| Mapped owner | Original observations | Reference size source |
| --- | ---: | --- |
| `bottom-sheet-overlay` | 25 | External overlay context, outside the frame |
| `bottom-sheet-panel` | 25 | `--mat-bottom-sheet-container-text-size`, falling back to `--mat-sys-body-large-size` |
| `dialog-panel` | 32 | External overlay context, outside the frame |
| `dialog-actions` | 32 | External overlay context, outside the frame |
| `snack-bar-overlay` | 34 | External overlay context, outside the frame |
| `snack-bar-surface` | 34 | External overlay context, outside the frame |

All **182 observations in 91 original interaction cases** are included. The
candidate page request numerically matches the reference overlay size in 94
light/dark observations; it differs in 88 contrast/custom observations (14.4px
or 18.4px versus 16px). Numeric matches remain in coverage. They do not prove
that the different inheritance scope preserves behavior across theme scales.
The bottom-sheet container token omission is recorded separately from that
context substitution.

This does **not** diagnose missing snackbar visibility, bottom-sheet clipping,
dialog scale, descendant text paint, or any world-coordinate calculation. It
does not establish a common cause with tooltip positioning. Those claims still
require their own geometry, consumer and raster evidence.

## Source-bound evidence

[Machine-readable evidence](material-overlay-font-inputs.json) independently
scans all 2,311 original cases. It authenticates each selected scalar/tree pair
and reuses the existing exact alias/structural owner proof. It preserves all
**59 scalar/full-tree rule gaps** (25 bottom-sheet wrappers, 34 snackbar
wrappers), rather than treating successful owner mapping as complete scalar
rule capture.

Each observation includes family/state/profile/viewport, source descriptors,
the original scalar digest, full mapped ancestor identities, reference font
requests and computed sizes, candidate normal/interaction/comparison local
sizes and the page request. The document-root candidate node is explicitly
uncaptured, not given an invented computed style. The explicit page request
and complete path below it are independently checked.

Original capture:
`artifacts/material-parity/current-ancestry-audit/latest-report.json`, SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

Proof SHA-256:
`3f06636fd36443605c6a5df9667ab159d2abc0a87672bd1546d5aabbfabfa759`.

The [original-state reference context replay](material-original-overlay-context-survey.md)
is independently revalidated, not copied as an unverified summary. Its 91
cases map back to the original owners and retain browser/asset/function/source
provenance. Its external `div → body → html` context reports 16px at each node.
This is a later reference-only observation whose overlay root matches the
original root; it does not reconstruct historically unrecorded body styles or
provide a fresh candidate rendering. The report preserves that limitation.

Current source locations in
`examples/material-showcase/src/app/astylar.component.ts`:

- Lines 463–466: page and comparison-section nesting of the content.
- Lines 789–792: dialog panel/actions rules without the parent font context.
- Lines 799–801: bottom-sheet overlay/panel rules without the container token.
- Lines 1004–1024: modal panel construction and inclusion in comparison content.

Existing historical bottom-sheet structure/token findings remain in
`docs/material-input-audit-investigation.md`, including
`fixture-bottom-sheet-list-structure-and-token-substitution`. This increment
does not infer which historical sizing change was motivated by inheritance,
or claim to establish the intent of the overlay nesting.

## Proposed owning-layer correction

First restore equivalent overlay inheritance and the bottom-sheet container
token in separate diagnostic fixtures. Preserve surface-local event/modal
ownership; moving an overlay in the style tree is not permission to let it
capture the whole browser window. Avoid sampled literal sizes or compensating
scale transforms presented as general fixes.

Then test inherited text, explicit component/descendant overrides and
font-relative boxes across default and non-default scales, with identical
overlay containing-block and clipping inputs. If equivalent inputs diverge,
trace the first core style/layout/paint stage before changing it. Keep font
context, placement, scroll reachability and focus containment as distinct
assertions. This proposal does not authorize changing canonical fixtures or
renderer behavior during the audit.

## Verification

```text
node scripts/audit-material-overlay-font-inputs.mjs
node scripts/audit-material-overlay-font-inputs.mjs --check
node --test tests/material-parity/overlay-font-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation and independent no-write replay pass. Final focused/inventory
verification passes **6/6**, exit **0**, **8,356.3895ms**, with no skips,
cancellations or TODOs. Twenty-six mutation controls run for all six owners in
all four profiles: **624 rejection executions**.

The initial focused run failed one negative control (5/6 passed): the test
fixture accidentally shared its viewport object with the expected entry, so
the mutation changed both sides of its comparison. Giving the independently
captured context its own cloned viewport fixed the test setup. No expected
production value or assertion was weakened; the full controls then passed.

Discovery now contains 128 files: 120 Material, four general and four TTS,
retaining all 43 legacy files. No canonical attribution was promoted; 2,160
groups remain unresolved. The original 120-file full harness continues
separately and has reached the reviewed-authoring integration suite, retaining
the two already diagnosed historical conservation failures.
