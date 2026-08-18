# Scrolling, pointer selection, and popup interaction parity v9

This phase extends the stateful interaction foundation with production-usable overflow scrolling, pointer-driven text selection, text-control autoscrolling, and expanded single-select interaction. Work proceeds one bounded browser behavior at a time: add a deterministic real-input fixture, capture the unsupported baseline, implement the reusable scene-owned behavior, compare after every action, run all gates, document the boundary, and commit the increment.

## Completion thresholds

- Wheel and trackpad-style input scroll supported `overflow: auto` and `overflow: scroll` containers vertically and horizontally, with browser-equivalent limits, clipping, targeting, and nested propagation.
- Stable, unique, semantically compatible containers preserve and clamp offsets through update/reflow; removed, duplicated, disabled, or incompatible containers do not retain stale state.
- Pointer caret placement, bidirectional drag selection, selection replacement, supported Shift extension, and text-control autoscrolling keep value, selection, focus, paint, and events synchronized.
- Expanded single-select pointer and keyboard workflows support disabled-option skipping, commit/cancel, click-away dismissal, viewport-aware placement, targeting, stacking, and cleanup within the documented subset.
- All three representative applications contain useful Phase 9 workflows, and repeated scroll/selection/popup/update/resize/dispose cycles do not grow resources or registrations.
- Full-corpus median SSIM remains at least `0.98`; every representative viewport and required new fixture remains at least `0.95`; at least `95%` of measured edges are within `2px`; no unexplained error exceeds `5px`; visible text and line counts match exactly.
- Supported interaction and scroll state plus normalized event logs match exactly, runtime/lifecycle/disposal reports are clean, all unit tests and both builds pass, and the completed clean Phase 9 commit passes the enforced corpus.

## Starting baseline

The unchanged Phase 8 commit `75abecd` passes 166 tests, the library build, and the production application build with only the two documented size-budget warnings. Its enforcing parity result is 125 fixtures / 294 renders / three viewports; median SSIM `0.9932`; minimum `0.9512`; approximately `99.97%` of measured edges within `2px`; maximum error `3.9921px`; exact visible text and interaction state; clean runtime and lifecycle reports.

The Phase 8 interaction runtime owns pointer and keyboard input, focus, typed events, default actions, and compatible control-state restoration. It does not own a wheel listener or a scroll-container registry, `overflow: auto`/`scroll` content is not clipped or translated, and the parity report has no deterministic scroll state.

## Increment log

| Increment | Browser expectation | Unsupported baseline | Cause and general solution | Focused result | Full result | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Vertical overflow wheel scrolling | Wheel input over a descendant scrolls its nearest fixed-height `overflow: auto` container, clamps at both ends, translates content beneath a stable clip, rejects interaction outside the visible clip, and exposes the browser's scroll offsets and extents. | New `overflow-vertical-wheel`: four renders; median SSIM `0.9613`; minimum `0.9513`; `77.5%` of measured edges within `2px`; maximum error `80.0002px`; exact text. Static paint was already close at SSIM `0.9646`, but the three wheel steps left Astylar content fixed with `70px`, `80px`, and `50px` geometry errors and no scroll state. | Added one scene-owned scroll runtime that discovers unique authored `auto`/`scroll` containers, measures client/content extents from the rendered hierarchy, clamps offsets, translates direct content roots without moving world-space clipping planes, preserves compatible offsets across rebuilds, and clears state at disposal. The interaction runtime owns one non-passive canvas wheel listener, normalizes pixel/line/page deltas, picks the authored target, walks scroll ancestors, prevents the browser default only when Astylar consumed movement, and rejects picked descendants outside an ancestor scroll clip. `auto` and `scroll` now use the same overflow clipping path as hidden overflow. The harness drives real Playwright wheel input and compares deterministic `scrollLeft`, `scrollTop`, `scrollWidth`, `scrollHeight`, `clientWidth`, and `clientHeight`. | Four renders; median SSIM `0.9549`; minimum `0.9532`; every measured edge within `2px`; maximum error `0.0007px`; exact text, geometry, and scroll state after `70px` movement, bottom clamping at `80px`, and reverse movement to `50px`; runtime clean. Twenty-one focused tests pass, including scroll measurement/transform/clamping, compatible preservation with smaller-content clamping, duplicate-ID rejection, disposal, one non-passive owned wheel listener, listener removal, and `overflow:auto` clipping. | 126 fixtures / 298 renders / three viewports; median SSIM `0.9930`; minimum `0.9512`; `99.97%` of measured edges within `2px`; maximum error `3.9921px`; exact visible text and interaction state; clean runtime reports; every completion threshold passes. All 171 tests and both builds pass; only the two accepted application size-budget warnings remain. | Accepted |

## Supported public Phase 9 boundary so far

- Unique, stably identified elements with authored `overflow: auto` or `overflow: scroll` are registered as scene-owned scroll containers after rendering.
- Pixel, line, and page-mode wheel deltas are normalized by the interaction runtime. A consumed wheel movement prevents the native canvas/page default; an unconsumed movement remains available to an ancestor or host page.
- Vertical offsets clamp to the measured content range and translate authored direct child roots beneath a stationary clip.
- Wheel targeting begins at the picked descendant and walks authored ancestors to find a scroll container.
- Pointer hits on descendants outside any registered ancestor scroll bounds are rejected, so clipped content cannot be activated.
- The current offset is restored after a compatible stable-ID rebuild and clamped if the rebuilt content range is smaller. Duplicate container IDs are not restored or registered.
- Each active scene owns one wheel listener and one scroll registry. Disposal removes the listener and clears the registry.
- The parity harness drives real wheel input and compares deterministic container offset, scroll extent, and client extent after every measured action.

Horizontal overflow behavior, independently scrolling nested axes and ancestor propagation at an exhausted inner boundary, scroll-state update/removal lifecycle fixtures, pointer-driven text selection, text-control autoscrolling, expanded-select interaction, representative Phase 9 workflows, and the combined Phase 9 lifecycle stress sequence remain to be implemented and verified before this phase is complete.
