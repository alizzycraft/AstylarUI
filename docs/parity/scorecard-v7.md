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
| Canvas-aware responsive reflow | A representative application and a wrapped-text Grid resize desktop → tablet → mobile → desktop in their existing page and scene. Every settled state matches Chromium and the equivalent fresh render, including media rules, viewport/percentage units, wrapping, intrinsic sizing, Flex/Grid, clipping, fixed positioning, text, and resource counts. | Astylar only resized the engine on a window event; layout and media rules stayed at the previous viewport. The first live dashboard trial also exposed unregistered ghost meshes and disposed text textures being returned from cache. | Observe the canvas CSS box with `ResizeObserver`, invalidate the render session, rebuild within the same scene, and expose deterministic responsive actions in the harness. Track renderer-created scene resources, dispose replaced meshes/materials, reset the text-texture cache on full replacement, and retain session-owned texture resources safely. The harness captures all four live states and rejects geometry/text/resource growth relative to fresh renders. | Dashboard live SSIM `0.9743 / 0.9800 / 0.9594 / 0.9743`, maximum error `0.4986px`; wrapped Grid live SSIM `0.9917 / 0.9952 / 0.9870 / 0.9917`, maximum error `0.0491px`. Every edge is within `2px`; text and line counts are exact; runtime/resource checks are clean. | 98 fixtures / 120 renders / three viewports; median SSIM `0.9957`; minimum `0.9509`; `99.9%` of edges within `2px`; maximum error `3.9921px`; exact text; runtime clean. All 125 tests and both builds pass. | Accepted |
| Asynchronous natural image reflow | A delayed image with no authored dimensions adopts its `120x80` natural content size, adds its padding and border, and reflows a nested height-auto Flex card, height-auto Grid, and following row without replacing the scene. | New `reactive-natural-image`: SSIM `0.9161`; `58.3%` of edges within `2px`; maximum error `412.0003px`; exact text; runtime clean. The texture callback resized only the image mesh, omitted border insets, did not propagate through intrinsic ancestors, and restarted image loading on a full reflow. | Added scene/source-owned image resources with synchronous natural-size metadata, asset invalidation, reuse across layout passes, replacement disposal, and stale-completion guards. Natural replaced-element sizing now participates in element, Flex, and recursive Grid measurement. Height-auto Grid surfaces resize to their intrinsic tracks, and both parity renderers wait for actual asset readiness rather than sleeping. | SSIM `0.9923`; every measured edge within `2px`; maximum error `0.0413px`; exact text/line counts; runtime clean. Focused tests cover natural border-box sizing, Flex/Grid propagation, one-time metadata publication, source disposal, ignored late completion, failed-load settlement, and per-element UV state. | 99 fixtures / 121 renders / three viewports; median SSIM `0.9955`; minimum `0.9509`; `99.9%` of edges within `2px`; maximum error `3.9921px`; exact text; runtime clean. All 131 tests and both builds pass. | Accepted |

## Public lifecycle supported so far

- `render(canvas, siteData, options)` remains backward compatible and returns the created `Scene`.
- `update(siteData, scene?)` replaces the session's current data, schedules one frame-coalesced reflow, and resolves after the final queued reflow settles.
- `invalidate(reason?, scene?)` requests layout using the current data.
- `whenSettled(scene?)` exposes deterministic readiness; `getSession(scene?)` exposes the owning session where lower-level control is needed.
- Multiple reasons in a frame coalesce, invalidation during a reflow schedules a following frame, reflows never overlap, and scene disposal cancels pending work.
- Canvas element size changes automatically request responsive reflow through a session-owned `ResizeObserver`; a window-resize fallback is used where the observer API is unavailable.
- `getResourceSnapshot(scene)` reports the currently live Astylar-owned mesh, material, and texture counts for deterministic lifecycle diagnostics.
- Image textures are owned per scene and source. A successful asynchronous load records natural dimensions, invalidates the active session once, and reuses the same texture during the resulting reflow. Replaced sources and scene disposal release their textures; stale completions cannot mutate the current render.

The first implementation deliberately rebuilds the rendered DOM in the existing scene. It does not recreate the engine, camera, or scene. Fine-grained reconciliation and state preservation across a full DOM rebuild remain outside this phase.

## Remaining phase work

The remaining supported update categories, repeated-cycle/disposal coverage, and the final three-run stability audit remain pending.
