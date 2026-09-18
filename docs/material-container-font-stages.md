# Non-own-text containers: inherited font-size measurement stages

## Finding

The original capture contains **1,012 observations across 17 container owners**
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
`th`/`td` cannot match any selected div/span/section/main path node. This is not
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
- Overlays, toolbar/paginator explicit component tokens, custom-rendered tab
  panels, icons, progress plugins, and slider visuals require their own owner
  reviews; this proof cannot be generalized to them.

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

Generation and independent no-write replay pass with exit **0**. The expanded
focused suite, including full-payload plan replay, passes **8/8**, exit **0**,
with no skips/cancellations/TODOs, in **96,467.9779ms**. It executes 29 rejection
controls for each of 17 owners (**493 executions**) plus 19 independent join
mutations (**512 rejection executions** total). The earlier source-only suite
passed 6/6 in 8,117.9199ms; it was not used as a substitute for plan verification.

The plan maps **51 groups / 1,012 observations**, preserving all **8,288 other
complete rows**. Ordered unrelated-row-digest SHA-256:
`fbd380d311fb19e2ed92ffd53e7e5dab6d563186230305f4c55469acf541d6a8`.
Source-proof SHA-256:
`419b9191472abb96b8214923c5bf290f646f930567c76225b0a40d2e35894dab`.
Plan SHA-256:
`ca34840f113202220f1b4b32cc6412a91bf04b40fb990bbdd3ffc94cdd250dca`.
The terminal focused log is
`artifacts/material-parity/field-host-flow-input-audit/container-font-stages-with-plan-focused.log`.

Current harness discovery contains **123 files** (115 Material, four general,
four TTS), retaining all 43 legacy files. The separately running full harness
selected 120 files at `9933ac1`; it does not include this suite or the two
preceding additions. Its historical explicit-gap conservation failure is
recorded in [harness coverage](material-audit-harness-coverage.md). This focused
pass neither resolves that failure nor replaces the final full enforced matrix.

## Implementation recommendation

Preserve inspection stages explicitly and classify only source-bound
measurement differences. Do not add local container font sizes merely to make
the comparison green. Test and fix inherited-font consumers at their shared
core boundary with equivalent public inputs, keeping their failures distinct
from this diagnostic-stage finding.

No renderer, canonical fixture, or canonical discrepancy classification changes
are included. The canonical 2,160 unresolved groups and complete enforced
parity acceptance remain outstanding.
