# Stateful interaction and form parity v8

This phase makes common pointer, keyboard, control, and application-update workflows behave like equivalent HTML applications. Work proceeds one browser behavior at a time: add a deterministic real-input fixture, capture the unsupported baseline, implement the general scene-owned behavior, compare state/event/geometry/text/paint after every action, run the full corpus, document the supported boundary, and commit the increment.

## Completion thresholds

- The harness drives real pointer and keyboard input in the existing browser page and Babylon scene and compares normalized event order, focus, supported control state, geometry, text, and screenshots after every action.
- All three representative applications contain useful interactive workflows with pointer and keyboard coverage; at least one continues through responsive resize and application-data update.
- Stable compatible authored IDs preserve supported control state through reflow/update; removed or incompatible controls blur and clean up.
- Repeated interaction/update/resize/dispose cycles do not grow scene resources, observers, listeners, action registrations, focus/cursor/selection/dropdown meshes, or registries.
- No executable event-handler strings are used by the supported public path.
- Full-corpus median SSIM remains at least `0.98`; every representative viewport remains at least `0.95`; at least `95%` of edges are within `2px`; no unexplained error exceeds `5px`; visible text and line counts match exactly.
- Supported normalized interaction state and event logs match exactly, runtime/lifecycle/disposal reports are clean, all tests and both builds pass, commits are incremental, and the final clean commit passes `npm run parity:check` three consecutive times unchanged.

## Starting baseline

The unchanged Phase 7 commit `32d031a` passes 132 tests, the library build, and the production application build with only the two documented size-budget warnings. Its enforcing parity result is 103 fixtures / 137 renders / three viewports; median SSIM `0.9952`; minimum `0.9509`; `99.9%` of measured edges within `2px`; maximum error `3.9921px`; exact visible text; clean runtime and completion thresholds.

The legacy renderer creates visible controls and contains several root-scoped input/focus/action services, but `AstylarRenderOptions` has no typed application event channel. Input setup also owns global keyboard and scene observers outside the render session, and `DOMElement.onclick` is a string-valued legacy field. These paths are evidence to reconcile, not an accepted public interaction contract.

## Increment log

| Increment | Browser expectation | Baseline | Cause and general solution | Focused result | Full result | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Real pointer harness and typed event foundation | A real primary-pointer activation reports `pointerdown`, `pointerup`, and `click` once, in order, with the authored target, current target, button, pointer type, and current value. Handlers live outside serializable `SiteData`; supported bubbling and cancellation expose familiar DOM concepts. | New `interaction-pointer-click`: static SSIM `0.9980`; live SSIM `0.9816`; every edge within `2px`; exact text and focus/control state. Chromium reported the three-event sequence; Astylar reported no application events, so runtime parity failed. | Added real Playwright pointer/keyboard action driving, per-step interaction reports, exact event/control/focus comparison, a pure typed target/bubble dispatcher, and one scene-owned Babylon pointer runtime. `AstylarRenderOptions.events` accepts handlers keyed by authored ID plus an optional dispatch observer. `pointerenter`, `pointerleave`, `focus`, and `blur` are non-bubbling; the remaining currently declared event types traverse authored ancestors. `preventDefault()` and `stopPropagation()` are recorded; later control increments connect cancellation to each supported default action. The runtime rejects hidden, disabled, or removed targets and releases its observer through render-session cleanup. | Static SSIM `0.9980`; live SSIM `0.9816`; every edge within `2px`; maximum error `0.0498px`; exact text, focus, control state, target payload, and `pointerdown → pointerup → click` event log; runtime clean. Four focused unit tests cover propagation, cancellation, disabled/removed targets, exact activation order, and observer disposal. | 104 fixtures / 139 renders / three viewports; median SSIM `0.9952`; minimum `0.9509`; `99.9%` of edges within `2px`; maximum error `3.9921px`; exact text; runtime clean. All 136 tests and both builds pass. | Accepted |

## Supported public interaction boundary so far

- Executable functions remain outside JSON `SiteData` in `AstylarRenderOptions.events.handlers`, keyed by stable authored element ID and event type.
- `events.onEvent` observes one normalized snapshot after each completed dispatch.
- Pointer targeting walks the picked Babylon mesh hierarchy to the authored element ID, so text/indicator child meshes retain their control target.
- The dispatcher supports target identity, current-target identity during propagation, value/checked/selected payloads, pointer/keyboard fields, `preventDefault()`, and `stopPropagation()`.
- `DOMElement.onclick` remains type-compatible but is deprecated and is not executed by the supported event path.

Default control actions, focus/keyboard dispatch, dynamic pseudo-state styling, state preservation, form semantics, and representative workflows remain active Phase 8 work.
