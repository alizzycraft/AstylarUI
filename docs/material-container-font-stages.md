# Non-own-text containers and visual owners: inherited font-size measurement stages

## Finding

The original capture contains **1,150 observations across 21 owners**
whose reference reports inherited computed `font-size`, while the candidate
inspection omits a local `fontSize` declaration. Both authored paths omit size
overrides between the selected owner and the corresponding scaled frame/page
declaration. These observations compare different measurement stages.

This is **not** a claim that the candidate has the correct computed font size,
that all input is equivalent, or that its descendants and layout render
correctly. The containers have no own text and no captured retained/control
text for that owner. Unlike the [plain-text proof](material-leaf-font-stages.md),
there is no retained glyph-style value that can verify the actual consumer.

| Owner | Observations |
| --- | ---: |
| `badge-primary` | 52 |
| `button-toggle-primary` | 68 |
| `card-primary` | 52 |
| `checkbox-primary` | 68 |
| `chips-primary` | 76 |
| `divider-primary` | 24 |
| `expansion-primary` | 68 |
| `grid-list-primary`, `grid-tile-one`, `grid-tile-two` | 52 each |
| `radio-primary` | 68 |
| `sidenav-primary` | 62 |
| `slide-toggle-primary` | 68 |
| `sort-primary` | 60 |
| `stepper-primary` | 68 |
| `tabs-primary` | 70 |
| `tree-primary` | 52 |
| `icon-primary` | 20 |
| `progress-bar-primary` | 20 |
| `progress-spinner-primary` | 20 |
| `slider-visual` | 78 |

All 2,311 original cases are scanned. Counts include every captured static and
interaction state for these owners, across original theme/viewport variants;
they do not stand for a fresh browser run or unrecorded states.

## Evidence and ownership

`src/lib/astylar.ts:910` records the normal/effective cascade snapshots and, when
present, separate retained text-registry and control-texture evidence. It does
not expose a fully inherited computed font for every non-text container.
The first demonstrated discrepancy here belongs to the audit's comparison of
browser computed inheritance with candidate local-declaration inspection.

The proof authenticates the original capture and each selected full tree.
It records exact case, owner, viewport, state, input digest, complete ancestry,
applicable reference size requests, candidate size-rule inventory digests,
candidate normal/effective/comparison stages, and direct child identities.
The page/frame inputs correspond at 16px, 14.4px, or 18.4px in those captures.
The omitted candidate values remain omitted, never replaced with calculated
computed values.

The existing conservative selector-exclusion helper is reused. Unknown
possibly applicable size/reset selectors prevent attribution. The only extra
exclusions are the two exact captured table-cell selectors whose terminal
`th`/`td` cannot match the selected non-cell path nodes. This is not
a replacement cascade or selector engine.

The initial draft incorrectly expected the scalar reference structure to
contain `ownText`; it exposes subtree `text` instead. The proof now obtains
own text from the authenticated full-tree node, requires the scalar field to
remain absent, and keeps the two observations distinct.

Separate issues remain:

- Stepper font-family tokens, descendant overrides, wrappers, state effects,
  em-dependent sizes, and all raster/interaction behavior are not accepted.
- The [font-relative box reduction](material-font-relative-box-audit.json)
  independently records a core consumer using uncomputed font size. That defect
  is not cleared by this measurement-stage explanation.
- [List/table fixed fonts and range resets](material-authoring-input-attribution.md)
  are unequal authored inputs, not covered by this omission proof.
- Overlays, toolbar/paginator explicit component tokens and custom-rendered tab
  panels still require separate review. The [toolbar/paginator scope proof](material-font-scope-inputs.md)
  establishes intervening reference font requests, unlike the paths here.
- The visual-owner extension individually authenticates the image, linear
  progress, circular progress and range-visual node types and ancestry. It does
  not infer their drawing inputs from CSS font size. Their raw authored data,
  image source, and corresponding reference child identities remain recorded.
  Image/SVG differences, plugin geometry/material calculations, disabled-state
  propagation and interaction ownership are independent findings.
- The tab panel is deliberately excluded: its plugin paints text from a
  private `data['font-size']` input. The existing public mounted-texture
  characterization in `material-plugin/tab-panel-input-audit.spec.ts` proves
  that CSS size changes do not control that private font. Treating it as a
  non-text owner merely because core inspection lacks retained text would
  conceal that different paint pipeline.

## Canonical proposal and verification

The source proof is
[material-container-font-stages.json](material-container-font-stages.json).
The independently bound proposal is
[material-container-font-stage-plan.json](material-container-font-stage-plan.json).
It authenticates the frozen canonical revision
`06e50dbcd3594c5987d63a4ec38e792b87b08dde`, independently joins source owner/state
membership, requires exact occurrences/case samples/states, refuses replacement
of existing classifications, and hashes every unrelated complete row.

```powershell
node scripts/audit-material-container-font-stages.mjs
node scripts/audit-material-container-font-stages.mjs --check
node --max-old-space-size=512 scripts/audit-material-container-font-stages.mjs --plan
node --test tests/material-parity/container-font-stages.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

The focused suite includes an independent `--plan --check` replay. Pure join
mutation tests use small canonical projections only for rejection behavior;
they do not substitute for authentication of the complete canonical payload.

The initial plan process exceeded its 512 MiB heap limit while retaining the
full original capture object beside canonical rows. The bounded collector now
authenticates that complete capture, retains all original cases, and projects
only the case fields and selected owner inputs consumed by the join before
loading canonical rows. The full source proof is still replayed, selected
inputs still retain their complete original digests, and unrelated canonical
rows remain authenticated and hashed. No threshold or evidence gate was
weakened; the heap limit remains 512 MiB.

### Earlier 17-owner verification

Generation and independent no-write replay passed with exit **0**. The earlier
focused suite, including full-payload plan replay, passes **8/8**, exit **0**,
with no skips/cancellations/TODOs, in **96,467.9779ms**. It executes 29 rejection
controls for each of 17 owners (**493 executions**) plus 19 independent join
mutations (**512 rejection executions** total). The earlier source-only suite
passed 6/6 in 8,117.9199ms; it was not used as a substitute for plan verification.

The earlier plan mapped **51 groups / 1,012 observations**, preserving all **8,288 other
complete rows**. Ordered unrelated-row-digest SHA-256:
`fbd380d311fb19e2ed92ffd53e7e5dab6d563186230305f4c55469acf541d6a8`.
Source-proof SHA-256:
`419b9191472abb96b8214923c5bf290f646f930567c76225b0a40d2e35894dab`.
Plan SHA-256:
`ca34840f113202220f1b4b32cc6412a91bf04b40fb990bbdd3ffc94cdd250dca`.
The terminal focused log is
`artifacts/material-parity/field-host-flow-input-audit/container-font-stages-with-plan-focused.log`.

At that increment harness discovery contained **123 files** (115 Material, four general,
four TTS), retaining all 43 legacy files. The separately running full harness
selected 120 files at `9933ac1`; it does not include this suite or the two
preceding additions. Its historical explicit-gap conservation failure is
recorded in [harness coverage](material-audit-harness-coverage.md). This focused
pass neither resolves that failure nor replaces the final full enforced matrix.

### Visual-owner extension: 21 owners

The extension adds four individually inspected owner types and **138 original
observations**: image 20, linear progress 20, circular progress 20, and range
visual 78. The collector's request, ancestry and inspection-stage criteria are
unchanged. The expanded plan proposes **63 groups / 1,150 observations**, leaving
**8,276 unrelated complete rows** unchanged. These remain proposed attributions,
not changes to the canonical 2,160 unresolved groups.

A frozen comparison against `74ee4e537309761d3d115249a9e9135b9c89ed4c`
deep-compares every original 1,012 finding and every original 51-group plan
entry, not just counts. Their complete records and canonical-payload descriptor
remain unchanged. The new 12 groups are separate from those earlier entries.

Source proof SHA-256:
`94b067a09f0c06f597532d37a7f40f0474ff3204ccfb043a39a0ed8bdf61d5a8`.
Plan SHA-256:
`798ea8ed11618506d34fb603bcd1f02ce0671e6782cbc0e37107fbed7fd749f3`.
Ordered unrelated-row-digest SHA-256:
`026ac4fb664119ce4efae6540e40ce4f992f523c035290fe9d47ee938c391f4d`.

Generation passes at the same 512 MiB heap limit. The expanded suite runs
29 rejection controls for all 21 owners (**609 executions**), plus the existing
19 join mutations (**628 total**). It also includes complete original-record
and prior-plan conservation and independent full-payload plan replay. The final
rerun passes **9/9**, exit **0**, in **98,435.5563ms**, with no skipped,
cancelled or TODO tests. It includes the added prior-plan conservation checks;
the earlier 9/9 run before those checks was not used as their verification.
Final verification is recorded in
`artifacts/material-parity/field-host-flow-input-audit/container-visual-font-stages-final-focused.log`.

Current discovery remains **124 files** (116 Material, four general, four TTS).
The new target coverage extends a suite introduced after the live 120-file
selection; a comparison against its launch revision confirms none of its
selected test files changed. The ongoing full run has separate explicit-gap
and gap-review conservation failures. This extension does not repair or waive
either failure and does not establish full enforced parity.

## Implementation recommendation

Preserve inspection stages explicitly and classify only source-bound
measurement differences. Do not add local container font sizes merely to make
the comparison green. Test and fix inherited-font consumers at their shared
core boundary with equivalent public inputs, keeping their failures distinct
from this diagnostic-stage finding.

No renderer, canonical fixture, or canonical discrepancy classification changes
are included. The canonical 2,160 unresolved groups and complete enforced
parity acceptance remain outstanding.
