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

1. Define and test the authored-ID identity and compatibility contract, including anonymous and duplicate-ID fallback behavior.
2. Add reconciliation diagnostics and resource ownership boundaries.
3. Reconcile compatible visual nodes and child-list changes without whole-tree replacement.
4. Preserve transient control, focus, selection, scroll, popup, modal, semantic, and event state across compatible updates; clean up replaced and removed owners.
5. Add representative-app update workflows, including the corrected table-cell control behavior, without reducing the fixed parity thresholds.
6. Update the public API documentation and README, run three consecutive unchanged-commit completion passes, and publish the final Phase 11 evidence.

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
