# Coordinate-system remediation

## Invariant

All layout, positioning, scrolling, control, interaction, and plugin geometry is
calculated in CSS pixels with a top-left origin, positive X to the right, and
positive Y downward. Fractional CSS values are retained and do not depend on
device-pixel ratio. Babylon world coordinates exist only at the final rendering
projection and its inverse picking boundary.

## Baseline root cause

The DOM camera is currently placed at positive Z and aimed toward the origin in
Babylon's default left-handed scene. An asymmetric projection proof shows that
this makes world positive X appear screen-left. The codebase subsequently
accumulated compensating X negations in `CoordinateTransformService`, text
placement, image U coordinates, plugin adapters, and control-specific geometry.
The layout and positioning layers also expose Babylon `Vector3` values, while
scrolling reconstructs CSS movement from mesh positions and camera scale.

The target renderer uses Babylon's right-handed scene while retaining the camera
at positive Z. At that boundary world positive X projects screen-right without
turning the camera toward the back of the document, so CSS-local X needs no
mirror and the existing paint-depth direction remains stable. CSS positive Y is
converted once to Babylon positive-up Y. Paint depth is renderer-owned and is
not part of CSS layout geometry.

## Running migration record

| Phase | Root rule | Compensations removed | Evidence | Remaining debt |
| --- | --- | --- | --- | --- |
| Projection proof | CSS geometry is typed and converted by one pure boundary. | None yet; this phase deliberately records current behavior before migration. | Asymmetric point, rectangle, fractional round-trip, nesting, and real Babylon camera orientation tests. | Camera placement, depth direction, old coordinate service, layout meshes, scrolling, controls, picks, and plugin API still need migration. |
| Render-axis boundary | Babylon uses a right-handed scene so render positive X is screen-right; CSS positive Y is inverted only by `CssBabylonProjection`. | Global X negation, text-plane U flip, image U flip, text-offset negation, asymmetric-border reversal, and the standalone coordinate transform service. | 419 core tests; focused box, text, and image parity; plugin coordinate round-trip and range ordering. | Layout meshes, scrolling, controls, reverse picks, and the public plugin API still expose or reconstruct world geometry. |
| Screen-direction consumers | Screen-right is positive X everywhere; horizontal scrolling subtracts CSS `scrollLeft` only when projecting content, and visual offsets retain their CSS X sign. | Horizontal scroll/thumb reversal, scrollbar cross-axis reversal, ripple-origin texture mirroring, and shadow X-offset reversal. | 419 core tests; scroll and mesh unit suites; ripple-origin tests; focused horizontal-overflow parity at 0 edge error. | Scroll measurement still reconstructs geometry from Babylon bounds; retained CSS boxes must become authoritative before scrolling and interaction are fully isolated. |
| Retained CSS geometry | Every rendered element retains a parent-relative CSS border/content box. Scroll extents, visibility, event-local coordinates, and range pointer mapping resolve from that tree. | Mesh-bound projection in interaction, Babylon-bound scroll measurement, DPR multiplication of CSS-pixel wheel deltas, and hover recreation without retained placement. | 426 core tests; fractional/nested layout-box tests; scroll tests that throw on Babylon bound reads; retained range-pointer test. | Layout still mutates meshes in some auto-size paths; legacy positioning contracts, clipping, control paint helpers, and the plugin API still expose world geometry. |
| Single positioning engine | Static, relative, absolute, and fixed layout are resolved only by the retained CSS layout path. Viewport state contains CSS dimensions only. | The unused injected positioning facade, mode calculators, containing-block transform matrices, Babylon `Vector3` positioning types, and dormant renderer delegates. | Packaged-library build and 60/60 focused renderer, positioning, viewport-unit, and stacking-context tests; the full run passed 425/426 with only the pre-existing platform-dependent canvas half-leading assertion failing. | Auto-size paint mutation, clipping, scroll paint, controls, inverse picks, and the plugin API still need boundary isolation. |
| CSS layout and paint boundary | Block, inline, flex, grid, list, text, image, and overflow geometry remain CSS boxes until centralized projection helpers create or position Babylon output. Overflow rectangles resolve from retained CSS ancestry. | Layout fallbacks from mesh bounds, world-space auto-height nudges, scattered size/position scaling in layout, and mesh-bound overflow clipping. | Packaged-library build; 62/62 focused layout, projection, and clipping tests, including fractional projection and tests that reject mesh-bound reads. | Scrollbar paint, control paint helpers, inverse picks, and the plugin API still need boundary isolation. |
| CSS scroll and paint boundary | Scroll extents, offsets, root placement, and scrollbar rectangles remain CSS geometry; a renderer-owned adapter alone projects content and scrollbar meshes. | Captured mesh-origin scroll state, runtime camera-scale access, direct world-axis offset arithmetic, and scrollbar placement in world space. | Packaged-library build; focused scroll/projection tests, including fractional CSS offsets and tests that reject mesh-bound reads. | Control paint helpers, inverse picks, and the plugin API still need boundary isolation. |
| CSS range geometry | Range width, track, active segment, thumb position, pointer ratio, and value state are retained in CSS pixels; only generated mesh sizes and local centers are projected. | Mesh-bound width recovery during value updates and world-unit constants in range layout. | Focused range and pointer tests, including fractional CSS width, multi-scale projection, independent paired values, and a test that rejects mesh-bound reads. | Choice, text, select, and focus paint still need CSS-local migration; paired Material range hit ownership will be verified with the plugin contract. |
| CSS button, choice, and focus geometry | Button, checkbox, radio, label, and focus-ring dimensions and local positions remain CSS geometry; managers project only when creating or positioning paint meshes. | Button press position mutation, mesh-bound text/indicator/focus sizing, rotated radio cylinders and their counter-rotation, inverted label placement, raw world-unit focus constants, and raw-unit fallback planes. | Packaged-library build; focused button, checkbox/radio, and focus tests, including fractional projection and checks that reject mesh-bound reads. | Text and select paint, inverse picks, and the plugin API still need boundary isolation. |

## Known convention leaks to migrate

- `ElementCreationService` still exposes `pixelToWorldScale` and Babylon
  `Vector3` through the public plugin contract, although conversion now routes
  through the camera-owned CSS projection.
- text and select managers still perform some paint calculations using projected
  dimensions.
- reverse Babylon picks still need a single explicit inverse boundary for all
  consumers beyond range/event-local geometry.

Each migration phase must replace one of these convention leaks with CSS-space
state and remove its compensation only after a user-facing or boundary-level
regression test exists.
