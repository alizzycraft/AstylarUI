# Reactive layout and reflow parity v7

This phase adds an application-grade invalidation lifecycle so viewport changes, asynchronous assets, and supported application-data changes can settle inside the existing Babylon engine and scene. Correct settled output is prioritized over incremental subtree performance; rebuilding the rendered DOM within the active scene is an accepted implementation strategy.

## Completion thresholds

- In-place representative desktop/tablet/mobile transitions match equivalent fresh renders and remain at or above SSIM `0.95`.
- Full-corpus median SSIM remains at or above `0.98`; at least `95%` of measured edges are within `2px`, with no unexplained error above `5px`.
- Text and line counts match exactly, runtime reports are clean, and responsive layout dependencies recompute after in-place resize.
- Natural image metadata reflows nested intrinsic containers; supported text, value, style, child-list, and image-source updates match fresh renders.
- Invalidations coalesce without overlap, stale callbacks, loops, or arbitrary sleeps.
- Repeated update/resize/dispose cycles do not grow live resources, observers, listeners, or interaction registrations.
- Unit tests and both builds pass; the final committed tree is clean and passes `npm run parity:check` three consecutive times unchanged.

## Starting baseline

The committed Phase 6 baseline was reproduced before renderer changes: 97 fixtures / 111 renders over desktop, tablet, and mobile; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact visible text; clean runtime. All 118 unit tests and the application/library builds passed. The Angular build retained only its two documented size-budget warnings.

Representative desktop/tablet/mobile SSIM was project dashboard `0.9743 / 0.9802 / 0.9603`, data management `0.9891 / 0.9898 / 0.9804`, and account settings `0.9609 / 0.9664 / 0.9509`.

## Increment log

| Increment | Browser expectation | Baseline | Cause and general solution | Focused result | Full result | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Render session and wrapped-text update | Updating short text to wrapped long text in the same page/scene changes line count and intrinsic ancestor height, then moves following content. Calls can deterministically await settlement. | New `reactive-text-update`: SSIM `0.9030`; `62.5%` of edges within `2px`; maximum error `20.0039px`; text mismatch. Astylar had no supported live site-data lifecycle. | Added a scene-owned `AstylarRenderSession` with frame coalescing, serialized/re-entrant reflow, revisions, settlement promises, failure recovery, and disposal cancellation. `Astylar.render()` remains scene-returning; `update`, `invalidate`, `whenSettled`, and `getSession` extend it. The dynamic harness mutates Chromium and updates Astylar in their existing page/scene. | SSIM `0.9724`; every edge within `2px`; maximum error `0.0276px`; exact text/line counts; runtime clean. Scheduler tests cover coalescing, re-entrancy, non-overlap, failure/retry, and disposal. | 98 fixtures / 112 renders; median SSIM `0.9966`; minimum `0.9509`; `99.9%` of edges within `2px`; maximum error `3.9921px`; exact text; runtime clean. All 123 tests and both builds pass. | Accepted |

## Public lifecycle supported so far

- `render(canvas, siteData, options)` remains backward compatible and returns the created `Scene`.
- `update(siteData, scene?)` replaces the session's current data, schedules one frame-coalesced reflow, and resolves after the final queued reflow settles.
- `invalidate(reason?, scene?)` requests layout using the current data.
- `whenSettled(scene?)` exposes deterministic readiness; `getSession(scene?)` exposes the owning session where lower-level control is needed.
- Multiple reasons in a frame coalesce, invalidation during a reflow schedules a following frame, reflows never overlap, and scene disposal cancels pending work.

The first implementation deliberately rebuilds the rendered DOM in the existing scene. It does not recreate the engine, camera, or scene. Fine-grained reconciliation and state preservation across a full DOM rebuild remain outside this phase.

## Remaining phase work

Canvas-aware responsive reflow, asynchronous natural image sizing, the remaining supported update categories, stale asset protection, deterministic resource accounting, repeated-cycle/disposal coverage, and the final three-run stability audit remain pending.
