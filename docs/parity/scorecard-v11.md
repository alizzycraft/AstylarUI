# Phase 11 Incremental Reconciliation and State Continuity

Phase 11 replaces whole-tree visual reconstruction with identity-aware rendered-tree reconciliation while preserving the browser-parity guarantees established through Phase 10. Work is delivered as small, independently tested commits. This scorecard records the active contract and the evidence for each increment.

## Completion contract

- Unique authored IDs are the stable reconciliation identity. Compatible nodes keep identity across text, attribute, style, value, image-source, insertion, removal, and reorder updates; incompatible type changes are replaced and disposed.
- Anonymous or duplicate-ID nodes receive deterministic, explicitly documented fallback behavior and must never corrupt keyed nodes or leak resources.
- Reconciliation reuses unaffected Babylon meshes, materials, textures, semantic nodes, control managers, interaction registrations, scroll containers, and observers.
- Focus, caret and selection, text-control scroll, generic scroll, live form state, expanded single-select state, modal state, semantic identity, and event behavior survive compatible updates and are released when their owner is removed or replaced.
- Diagnostics expose reused, created, replaced, and disposed nodes/resources together with reconciliation, reflow, and registration counts.
- The three representative applications exercise repeated updates and realistic interaction workflows without fixture-specific renderer behavior.
- Final acceptance requires three consecutive `npm run parity:check` passes on an unchanged commit, all unit tests and both builds green, exact text/state/semantic checks, no runtime errors or resource growth, a clean working tree, median SSIM at least `0.98`, every render SSIM at least `0.95`, at least 95% of measured edges within 2 px, and no measured edge error above 5 px.

## Increment 1: padded table-cell content origins

Status: complete (`c5c1867`).

The table layout algorithm previously overwrote the padding resolved by generic element creation with zeroes before processing nested children. Nested controls were therefore laid out from the cell border edge rather than its CSS content-box origin. The general table-cell path now retains resolved padding while applying the table algorithm's final border-box width and height.

Evidence:

- Added `table-cell-control-content-box` at desktop, tablet, and mobile sizes.
- Focused pre-fix result: median SSIM `0.9564`, minimum SSIM `0.9502`, 80% of edges within 2 px, maximum edge error `20.0272 px`.
- Focused post-fix result: median SSIM `0.9980`, minimum SSIM `0.9975`, 100% of edges within 2 px, maximum edge error `0.0271 px`, exact text, and no runtime errors.
- Added a unit regression proving that the table algorithm retains the resolved top/right/bottom/left padding for nested content.
- Full corpus: 153 fixtures, 511 renders, median SSIM `0.9902`, minimum SSIM `0.9503`, 100% of edges within 2 px, maximum edge error `3.9921 px`, exact text, no runtime errors, and all completion thresholds satisfied.
- `npm test -- --watch=false`: 207 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed with the existing application bundle and stylesheet budget warnings.

Representative data-management integration remains a separate Phase 11 increment. An exploratory action-column variant correctly exercised the fixed geometry but reduced the mobile app raster score below the fixed `0.95` threshold, so it was not included in this commit.

## Remaining work

1. Complete three consecutive full parity acceptance passes on the final unchanged commit.

## Increment 2: authored identity contract

Status: complete (`16b1e6d`).

- Added a shared reconciliation identity index with diagnostics for unique IDs, anonymous nodes, and duplicate IDs.
- Unique authored IDs remain stable through insertion, removal, reorder, and reparenting. Anonymous and duplicate-ID nodes use deterministic typed positional paths and do not promise continuity when that path changes.
- Defined compatible same-type updates and explicit replacement boundaries for element-type and input-manager-kind changes.
- Applied the shared contract to semantic reconciliation, including compatible input reuse and incompatible input replacement.
- Added per-reconciliation semantic diagnostics for reused, created, replaced, and disposed owners.
- Published the contract in `docs/reconciliation.md` and exported its public types and helpers from the library entry point.
- `npm test -- --watch=false`: 214 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed with the existing application bundle and stylesheet budget warnings.

- Focused `semantic-lifecycle-stress`: 29 renders, median SSIM `0.9751`, minimum SSIM `0.9548`, 100% of edges within 2 px, maximum edge error `0.0010 px`, exact text, and no runtime errors.

## Increment 3: visual reconciliation boundary and diagnostics

Status: complete.

- Added a visual reconciliation planner that shares the authored-ID and compatibility contract with the semantic bridge.
- Exact and semantic-only `Astylar.update()` calls now retain the complete live Babylon visual tree; resize, asset, manual, layout, paint, text, child, image, and control-data changes remain on the safe full-reflow path.
- Added public latest-pass and cumulative diagnostics for reuse, creation, replacement, disposal, reconciliation, and reflow.
- Extended parity reports with stable per-component Babylon mesh-owner tokens and reconciliation diagnostics.
- Added `reconciliation-semantic-reuse`, a two-update live/fresh fixture that changes accessible labels and titles while enforcing zero visual reflow and stable mesh identity.
- `npm test -- --watch=false`: 218 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed with the existing application bundle and stylesheet budget warnings.
- Focused fixture: three renders, median/minimum SSIM `0.9925`, 100% of edges within 2 px, maximum edge error `0.0006 px`, exact text and browser-computed semantics, stable visual-owner tokens, and no runtime errors. The focused `--enforce` command exits nonzero only because the global completion gate requires the full corpus coverage.

## Increment 4: keyed Babylon owner retention

Status: complete.

- Added a staged visual-resource transaction that detaches compatible uniquely identified meshes before the old owned tree is cleared, renders the authoritative new layout, transplants its geometry/material/children/transforms/metadata/picking state, and re-adopts retained owners for final session disposal.
- Parent/child retained owners are reconciled in tree order, so insertion, removal, reorder, and reparenting keep correct Babylon ancestry.
- Compatible control meshes are released from old manager-private resources and rebound to fresh typed control managers before focus, control-state, scrolling, clipping, modal, and semantic restoration.
- Expanded single-select snapshots now retain an open compatible popup and its uncommitted active option by value; removed or incompatible controls still close and dispose their popup lifetime.
- Added `reconciliation-visual-updates`, covering text, paint/layout, child insertion/reorder, and image-source replacement with fresh/live parity and stable per-element mesh tokens.
- Visual-update fixture: five renders, median/minimum SSIM `0.9790`, 100% of edges within 2 px, maximum edge error `0.0338 px`, exact text, stable owner tokens, and no runtime errors.
- Focused text-control update: six renders, median SSIM `0.9931`, minimum `0.9914`, exact control/focus/selection state, stable owner tokens, and no runtime errors.
- Focused overflow update: six renders, median SSIM `0.9868`, minimum `0.9865`, exact scroll state, and no runtime errors.
- Repeated interaction lifecycle: 34 renders, median SSIM `0.9737`, minimum `0.9588`, exact live state/events, stable resource/registration plateaus, and clean disposal.
- Repeated semantic lifecycle: 29 renders, median SSIM `0.9751`, minimum `0.9548`, exact semantics/modal/focus/announcement state, stable ownership/registration plateaus, and clean disposal.
- `npm test -- --watch=false`: 221 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed with the existing application bundle and stylesheet budget warnings.

## Increment 5: representative application reconciliation

Status: complete.

- The project dashboard now requires compatible primary Babylon owners to remain stable through filtered child removal, status completion, and status reopening.
- The account settings application now requires owner stability through six realistic updates spanning modal dismissal/reopening, validation publication/clearance, responsive content compaction, and completed-field removal.
- The inventory application now contains an explicitly styled row action nested in a padded table cell. Its geometry is measured in the app, its semantic action is exercised after search/filter/pagination state changes, and a second data update changes its visual value and row status while preserving the live application state.
- All three applications opt into per-update visual-owner assertions, so a compatible update fails if it silently replaces the measured Babylon owners even when its final screenshot is otherwise identical.
- Inventory application: 18 renders across three viewports, two live/fresh updates, and thirteen interaction states; median SSIM `0.9653`, minimum SSIM `0.9502`, 100% of edges within 2 px, maximum edge error `0.9786 px`, exact text/state/semantics, stable owner tokens, and no runtime errors.
- Project dashboard: 21 renders; median SSIM `0.9766`, minimum SSIM `0.9668`, 100% of edges within 2 px, maximum edge error `0.4986 px`, exact text/state/semantics, stable owner tokens, and no runtime errors.
- Account settings: 31 renders; median SSIM `0.9609`, minimum SSIM `0.9551`, 100% of edges within 2 px, maximum edge error `1.9339 px`, exact text/state/semantics, stable owner tokens, and no runtime errors.
- Each focused application run clears the fixed per-render, geometry, text, state, semantic, and runtime gates. Its focused median is informational: the `0.98` median requirement is the completion gate for the complete corpus, not for a deliberately complex single-application subset.
- `npm test -- --watch=false`: 221 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed with the existing application bundle and stylesheet budget warnings.

## Increment 6: final Phase 11 baseline

Status: implementation and documentation complete; unchanged-commit verification pending.

- Full pre-freeze corpus: 155 fixtures / 522 renders across desktop, tablet, and mobile.
- Median SSIM `0.9900`; minimum SSIM `0.9502`.
- 100% of measured edges are within 2 px; maximum edge error `3.9921 px`.
- Visible text, live-vs-fresh output, interaction/control/focus/selection/scroll/modal state, browser-computed semantics, announcements, navigation outcomes, retained-owner assertions, resource plateaus, and disposal audits are exact and runtime-clean.
- The enforced completion command reports `Completion thresholds: true`.
- `npm test -- --watch=false`: 221 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed with only the two existing application bundle and stylesheet budget warnings.
- The final acceptance procedure is three consecutive `npm run parity:check` executions after this evidence is committed, without changing the commit between runs.
