# Application Web Parity v2 Scorecard

Last updated: 2026-08-15

This scorecard tracks the second parity phase: making ordinary application-oriented HTML/CSS knowledge transfer reliably to Astylar's JSON DOM and styles. Phase 1 remains a required regression baseline.

## Completion gates

| Gate | Current | Target | Status |
| --- | ---: | ---: | --- |
| Total parity fixtures | 41 | 65 | Open |
| New Phase 2 fixtures | 1 | 25 | Open |
| Composed application/component fixtures | 0 | 10 | Open |
| Deterministic viewport sizes | 1 (`800x600`) | 3 | Open |
| Median SSIM | 0.9953 | >= 0.98 | Passing baseline |
| Minimum fixture SSIM | 0.9805 | >= 0.95 | Passing baseline |
| Edges within 2 px | 100% | >= 95% | Passing baseline |
| Maximum edge delta | 0.2030 px | <= 5 px | Passing baseline |
| Visible text and line counts | Exact | Exact | Passing baseline |
| Runtime errors | 0 | 0 | Passing baseline |
| Phase 1 regressions | 0 | 0 | Passing baseline |
| Consecutive final enforcing passes | 0 | 3 | Open |

## Coverage balance

| Phase 2 category | Fixtures | Representative coverage | Status |
| --- | ---: | --- | --- |
| Selectors and cascade | 1 | Descendant matching, subtree scoping, combined specificity | In progress |
| CSS Grid | 0 | — | Open |
| Responsive behavior | 0 | — | Open |
| Overflow and scrolling | 0 | — | Open |
| Controls and states | 0 | — | Open |
| Layering and overlays | 0 | — | Open |
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

## Iteration history

| Item | Before | General fix | Verification | Commit |
| --- | --- | --- | --- | --- |
| Phase 2 foundation | Phase 1 complete; no v2 scorecard | Added gates, category accounting, baseline, and decision log | Phase 1 parity suite green | `3fc1e3d` |
| Descendant selectors | Nested target used base class colors; SSIM `0.9744` | Ancestry-aware multi-compound matching and summed specificity | Fixture SSIM `0.9971`; 100% edges within 2 px; exact text; 53 tests and both builds pass | `fix: support descendant selectors` |

## Remaining work

- Add at least 25 focused Phase 2 fixtures, including at least 10 composed fixtures.
- Establish three deterministic viewport sizes and responsive assertions.
- Cover all seven categories with enough focused cases to expose interactions and regressions.
- Add deterministic interaction checks for applicable transitions, focus, scrolling, and pointer targeting.
- Investigate missing border paint on a third-level nested element during the layering/paint phase; it was isolated from the selector fixture after visual inspection.
- Keep quality, text, clipping, paint-order, runtime, test, and build gates enforcing.
- Finish with three consecutive clean enforcing passes.

## Next target

Add a focused child-combinator fixture that distinguishes direct children from deeper descendants, then extend the same selector matcher without weakening descendant behavior.
