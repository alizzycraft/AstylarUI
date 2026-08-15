# Application Web Parity v2 Scorecard

Last updated: 2026-08-15

This scorecard tracks the second parity phase: making ordinary application-oriented HTML/CSS knowledge transfer reliably to Astylar's JSON DOM and styles. Phase 1 remains a required regression baseline.

## Completion gates

| Gate | Current | Target | Status |
| --- | ---: | ---: | --- |
| Total parity fixtures | 50 | 65 | Open |
| New Phase 2 fixtures | 10 | 25 | Open |
| Composed application/component fixtures | 0 | 10 | Open |
| Deterministic viewport sizes | 3 exercised | 3 exercised | Passing |
| Median SSIM | 0.9973 | >= 0.98 | Passing |
| Minimum fixture SSIM | 0.9804 | >= 0.95 | Passing |
| Edges within 2 px | 100% | >= 95% | Passing baseline |
| Maximum edge delta | 0.2048 px | <= 5 px | Passing |
| Visible text and line counts | Exact | Exact | Passing baseline |
| Runtime errors | 0 | 0 | Passing baseline |
| Phase 1 regressions | 0 | 0 | Passing baseline |
| Consecutive final enforcing passes | 0 | 3 | Open |

## Coverage balance

| Phase 2 category | Fixtures | Representative coverage | Status |
| --- | ---: | --- | --- |
| Selectors and cascade | 5 | Relationship combinators plus first/last structural pseudo-classes | In progress |
| CSS Grid | 0 | — | Open |
| Responsive behavior | 2 | Viewport-relative geometry and width media conditions across three profiles | In progress |
| Overflow and scrolling | 1 | Hidden overflow clipping for positioned descendants | In progress |
| Controls and states | 1 | Enabled, disabled, and checked selector states with element opacity | In progress |
| Layering and overlays | 1 | Nested parent stacking contexts and bounded child z-index | In progress |
| Composed applications | 0 | — | Open |

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

## Remaining work

- Add at least 25 focused Phase 2 fixtures, including at least 10 composed fixtures.
- Establish three deterministic viewport sizes and responsive assertions.
- Cover all seven categories with enough focused cases to expose interactions and regressions.
- Add deterministic interaction checks for applicable transitions, focus, scrolling, and pointer targeting.
- Investigate missing border paint on third-level nested and non-desktop scaled elements during the layering/paint phase; these were isolated from focused selector/responsive fixtures after visual inspection.
- Keep quality, text, clipping, paint-order, runtime, test, and build gates enforcing.
- Finish with three consecutive clean enforcing passes.

## Next target

Establish a focused two-column CSS Grid baseline and implement the smallest general track-and-gap layout primitive needed for ordinary application shells.
