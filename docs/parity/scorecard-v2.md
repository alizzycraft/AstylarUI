# Application Web Parity v2 Scorecard

Last updated: 2026-08-16

This scorecard tracks the second parity phase: making ordinary application-oriented HTML/CSS knowledge transfer reliably to Astylar's JSON DOM and styles. Phase 1 remains a required regression baseline.

## Completion gates

| Gate | Current | Target | Status |
| --- | ---: | ---: | --- |
| Total parity fixtures | 64 | 65 | Open |
| New Phase 2 fixtures | 24 | 25 | Open |
| Composed application/component fixtures | 10 | 10 | Passing |
| Deterministic viewport sizes | 3 exercised | 3 exercised | Passing |
| Median SSIM | 0.9956 | >= 0.98 | Passing |
| Minimum fixture SSIM | 0.9502 | >= 0.95 | Passing |
| Edges within 2 px | 99.7% | >= 95% | Passing baseline |
| Maximum edge delta | 3.9921 px | <= 5 px | Passing |
| Visible text and line counts | Exact | Exact | Passing baseline |
| Runtime errors | 0 | 0 | Passing baseline |
| Phase 1 regressions | 0 | 0 | Passing baseline |
| Consecutive final enforcing passes | 0 | 3 | Open |

## Coverage balance

| Phase 2 category | Fixtures | Representative coverage | Status |
| --- | ---: | --- | --- |
| Selectors and cascade | 5 | Relationship combinators plus first/last structural pseudo-classes | In progress |
| CSS Grid | 2 | Two- and three-column mixed fixed/fr tracks, independent gaps, stretch, and row-order auto-placement | Passing |
| Responsive behavior | 2 | Viewport-relative geometry and width media conditions across three profiles | In progress |
| Overflow and scrolling | 2 | Hidden overflow for positioned descendants and intersected nested clipping ancestors | Passing |
| Controls and states | 2 | Enabled, disabled, checked, required, optional, read-only, and read-write selector states | Passing |
| Layering and overlays | 1 | Nested parent stacking contexts and bounded child z-index | In progress |
| Composed applications | 10 | Dashboard, responsive gallery, settings, modal, popover, article, sidebar, data table, checkout, and notification-center pages | Passing |

## Baseline

The committed 40-fixture Phase 1 suite was rerun before Phase 2 work began. It passed without source changes:

- Median SSIM: `0.9953`
- Minimum SSIM: `0.9805`
- Edges within 2 px: `100%`
- Maximum edge delta: `0.2029706 px`
- Exact visible text and line counts: yes
- Runtime errors: none
- Completion thresholds: passed

## Decisions

- Retain every Phase 1 fixture as an enforcing regression test.
- Count composed fixtures separately; a composed fixture may also exercise another category but does not replace balanced focused coverage.
- The repository's Angular 20 and Babylon.js 8.15 runtime are authoritative for this phase.
- Resolve relational selectors through `DOMAncestryService`; do not add parent pointers to the JSON DOM schema.
- Start with descendant selectors because application CSS depends on them and the current resolver explicitly rejects whitespace combinators.
- Keep parsed author-style caches distinct from renderer-authored context overrides so cached declarations cannot bypass the normal cascade.
- Implement rectangular overflow clipping with per-material world-space clip planes and intersect bounds from nested clipping ancestors.
- Use one hierarchy-aware physical-depth model for CSS stacking; do not duplicate z-index through Babylon material polygon offsets.
- Start Grid with explicit px/percentage/fr tracks and DOM-order auto-placement; expand syntax only through representative fixtures.
- Use composed fixtures to expose integration defects after focused primitives pass; the first dashboard case identified button-label alignment that isolated geometry tests missed.
- Keep flex/Grid content planes far enough from parent surfaces to remain deterministic at every camera scale; `0.1` world units is the current verified minimum.
- Keep ordinary element borders at their proven `0.05` local depth while select borders use `0.06`; selected-value content remains at `0.04` so nested selects paint deterministically without crossing general stacking bands.
- Reserve `0.25` world units between adjacent root z-index levels so each context contains its descendant paint band without enough perspective shift to exceed geometry tolerance.
- Separate genuinely nested positioned auto-z descendants from their parent surface by `0.15` world units; keep top-level positioned elements and static descendants on their prior paths.
- Register the full semantic table subtree with renderer ancestry, position row groups at table-relative offsets, keep rows local to each group, and reserve `0.05` world units per table paint level.
- Render text-bearing elements under their generated mesh identity when no authored ID exists; IDs remain optional metadata, as in HTML.
- Resolve flex item margin shorthand first, then apply authored longhand overrides on each edge.
- Expand authored flex shorthand during cascade resolution so its grow, shrink, and basis values replace browser defaults while preserving longhand specificity and declaration order.
- Preserve explicit z-index for positioned flex items instead of replacing it with flex source-order depth.

## Iteration history

| Item | Before | General fix | Verification | Commit |
| --- | --- | --- | --- | --- |
| Phase 2 foundation | Phase 1 complete; no v2 scorecard | Added gates, category accounting, baseline, and decision log | Phase 1 parity suite green | `3fc1e3d` |
| Descendant selectors | Nested target used base class colors; SSIM `0.9744` | Ancestry-aware multi-compound matching and summed specificity | Fixture SSIM `0.9971`; 100% edges within 2 px; exact text; 53 tests and both builds pass | `fix: support descendant selectors` |
| Child combinator | Direct child retained base colors; SSIM `0.9912` | Parsed direct-child relations with immediate-parent matching | Fixture SSIM `0.9913`; visual output aligned; 100% edges within 2 px; exact text; 54 tests and both builds pass | `fix: support child combinators` |
| Adjacent sibling | Immediate sibling retained base colors; SSIM `0.9924` | Resolved the previous sibling from authored parent child order | Fixture SSIM `0.9930`; visual output aligned; 100% edges within 2 px; exact text; 55 tests and both builds pass | `fix: support adjacent sibling selectors` |
| General sibling | Both later siblings retained base colors; SSIM `0.9865` | Searched authored preceding siblings in right-to-left selector order | Fixture SSIM `0.9868`; visual output aligned; 100% edges within 2 px; exact text; 56 tests and both builds pass | `fix: support general sibling selectors` |
| Structural pseudo-classes | First and last items retained neutral colors; SSIM `0.9916` | Matched first/last authored siblings with class-level pseudo specificity | Fixture SSIM `0.9940`; visual output aligned; 100% edges within 2 px; exact text; 57 tests and both builds pass | `fix: support structural pseudo selectors` |
| Multi-viewport harness | One hard-coded `800x600` browser context and component surface | Added named desktop, tablet, and mobile profiles with per-fixture selection and render-case accounting | All 45 existing fixtures remain green at desktop; profile and render counts are reported | `test: add deterministic viewport profiles` |
| Responsive viewport units | Viewport profiles were available but not exercised; scaled borders also lowered tablet/mobile SSIM below `0.95` | Added a three-profile fixture; isolated it to responsive geometry and logged scale-dependent border paint separately | Desktop `0.9979`, tablet `0.9990`, mobile `0.9968`; maximum edge error `0.027px`; exact text; 57 tests and both builds pass | `test: cover responsive viewport geometry` |
| Responsive media conditions | Every JSON variant applied: desktop was `160px` too wide and tablet `64px` too wide | Added optional min/max width/height media bounds, evaluated in both cascade resolution and renderer context parsing | Desktop `0.9983`, tablet `0.9973`, mobile `0.9972`; max edge error `0.012px`; exact text; 58 tests and both builds pass | `fix: support responsive media conditions` |
| Control state selectors | Controls retained base colors despite semantic flags; visual inspection also found element opacity omitted from button text | Added `:enabled`, `:disabled`, and `:checked` matching with pseudo specificity; prevented parsed author caches from overriding cascade winners; propagated opacity to button labels | Fixture SSIM `0.9979`; 100% edges within 2 px; exact text; 60 tests and both builds pass | `fix: support control state selectors` |
| Hidden overflow | Positioned descendants painted beyond an `overflow: hidden` ancestor; baseline SSIM `0.9738` despite exact geometry | Added four world-space material clip planes for hidden/clip overflow and intersected nested ancestor bounds | Fixture SSIM `1.0000`; 100% edges within 2 px; exact text; 62 tests and both builds pass | `fix: clip hidden overflow descendants` |
| Nested stacking contexts | A child at `z-index: 100` escaped its parent at `z-index: 1` and covered a sibling context at `z-index: 2`; baseline SSIM `0.9924` | Added ancestry-aware context depth bands and removed duplicate material polygon offsets | Fixture SSIM `1.0000`; median suite SSIM `0.9973`; 100% edges within 2 px; 63 tests and both builds pass | `fix: contain nested stacking contexts` |
| Explicit Grid tracks | Grid children fell through block layout, producing SSIM `0.8822` and a `600px` maximum edge error | Added explicit fixed/percentage/fr track resolution, row/column gaps, stretch sizing, and DOM-order auto-placement | Fixture SSIM `1.0000`; max edge error `0.010px`; exact text; 65 tests and both builds pass | `feat: add explicit grid track layout` |
| Composed dashboard shell | Nested flex/Grid geometry passed immediately at SSIM `0.9838`, but visual inspection showed button labels centered despite authored left alignment | Positioned input-button label meshes from text alignment and CSS horizontal padding | Fixture SSIM `0.9877`; max edge error `0.025px`; exact text; 65 tests and both builds pass | `test: add composed dashboard parity` |
| Responsive card gallery | Desktop/mobile passed, but tablet lost a header and card paint despite exact geometry, dropping SSIM to `0.8488` | Increased flex/Grid child-plane separation to a camera-stable depth while preserving sibling order | Desktop `0.9973`, tablet `0.9978`, mobile `0.9960`; max edge error `0.106px`; exact text; 65 tests and both builds pass | `test: add responsive gallery parity` |
| Composed settings form | Nested Grid/control geometry and text were exact, but the final select border was depth-unstable; baseline SSIM `0.9285` | Established explicit local control-content/select-border depth layers while retaining the proven general border offset; reused verified heading metrics | Fixture SSIM `0.9626`; suite median `0.9969`; 100% edges within 2px; exact text; 66 tests and both builds pass | `test: add composed settings form parity` |
| Composed modal and backdrop | Adjacent root z-index values 20/21 compressed to a `0.0015` world-depth gap, so the translucent backdrop painted over the dialog; baseline SSIM `0.8686` | Replaced the root `atan` compression with a `0.25` linear context step that reserves descendant paint space while limiting perspective growth | Fixture SSIM `0.9697`; max edge error `1.934px`; exact text and paint order; 67 tests and both builds pass | `test: add composed modal parity` |
| Composed clipped popover | Aggregate baseline passed at SSIM `0.9718`, but visual inspection found the overlapped positioned card was depth-quantized into its parent surface | Added a hierarchy-scoped `0.15` paint band for nested positioned auto-z descendants without shifting top-level positioned fixtures | Fixture SSIM `0.9838`; clipping and overlap visually match; suite median `0.9960`; 68 tests and both builds pass | `test: add composed popover parity` |
| Composed article page | The first composed render passed at SSIM `0.9630` with exact geometry and text; visual inspection showed avoidable upscaling blur from the small shared SVG | Kept CSS sizing and object-fit under test while using a deterministic high-resolution source asset representative of application imagery | Fixture SSIM `0.9647`; max edge error `0.055px`; exact wrapped lines; suite median `0.9956`; 68 tests and both builds pass | `test: add composed article parity` |
| Composed sidebar workspace | New nested navigation, active compound-descendant styling, flexible content, and toolbar composition had no unsupported behavior | No renderer change; retained the ordinary authored structure as a regression fixture | Fixture SSIM `0.9847`; max edge error `0.109px`; exact text; suite median `0.9956`; 68 tests and both builds pass | `test: add composed sidebar parity` |
| Composed semantic data table | Header and body groups independently consumed table height, overlapping at SSIM `0.7807` with `112.516px` edge error; after geometry repair, descendant styles and cell surfaces were still absent | Positioned semantic groups cumulatively with local rows, registered manually rendered table ancestry for selectors, and reserved bounded paint depth for section/row/cell surfaces | Fixture SSIM `0.9747`; max edge error `0.123px`; existing table fixtures remain green; suite median `0.9953`; 71 tests and both builds pass | `fix: compose semantic table sections` |
| Composed checkout form | Baseline SSIM `0.9569`; ID-less summary spans painted no text, and `margin-top: 8px` on the total row was ignored, exceeding the edge gate at `8.006px` | Used generated mesh IDs for ID-less text rendering and applied flex margin longhands over shorthand values | Fixture SSIM `0.9585`; max edge error `0.104px`; exact text; suite median `0.9953`; 73 tests and both builds pass | `fix: support ordinary checkout composition` |
| Composed notification center | Fixed-height rows shrank by `20px` each despite `flex: 0 0 88px`, producing SSIM `0.8861` and `99.969px` maximum edge error; explicit badge stacking was also discarded inside flex layout | Expanded flex shorthand in the cascade and honored explicit z-index for positioned flex items | Fixture SSIM `0.9502`; max edge error `0.095px`; exact text and clipping; suite median `0.9952`; 75 tests and both builds pass | `fix: preserve fixed notification layout` |
| Mixed Grid tracks | Three columns with unequal fractional weights and a second explicit row had no unsupported behavior | No renderer change; retained the six-item case as a focused regression fixture | Fixture SSIM `0.9998`; max edge error `0.041px`; all suite thresholds pass | `test: cover mixed grid tracks` |
| Nested overflow intersection | A descendant crossed both an inner clip and its narrower outer ancestor | No renderer change; retained the intersected clip as a focused regression fixture | Fixture SSIM `1.0000`; max edge error `0.078px`; clipping visually exact | `test: cover nested overflow intersection` |
| Requirement and editability selectors | Required/optional and read-only/read-write selectors were rejected by the pseudo-class parser | Added semantic matching for requirement and editability flags with normal pseudo-class specificity | Fixture SSIM `1.0000`; exact geometry and paint; 76 tests and both builds pass | `fix: support requirement state selectors` |

## Remaining work

- Add at least 25 focused Phase 2 fixtures, including at least 10 composed fixtures.
- Establish three deterministic viewport sizes and responsive assertions.
- Cover all seven categories with enough focused cases to expose interactions and regressions.
- Add deterministic interaction checks for applicable transitions, focus, scrolling, and pointer targeting.
- Continue exercising nested and scaled border paint in composed layering and responsive fixtures; select-specific depth precision is now covered by the settings form.
- Keep quality, text, clipping, paint-order, runtime, test, and build gates enforcing.
- Finish with three consecutive clean enforcing passes.

## Next target

Add a focused opacity stacking-context fixture, then run the three final enforcing passes.
