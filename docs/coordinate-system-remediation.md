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

The target camera observes the document from negative Z. At that boundary world
positive X projects screen-right, so CSS-local X needs no mirror. CSS positive Y
is converted once to Babylon positive-up Y. Paint depth is renderer-owned and
is not part of CSS layout geometry.

## Running migration record

| Phase | Root rule | Compensations removed | Evidence | Remaining debt |
| --- | --- | --- | --- | --- |
| Projection proof | CSS geometry is typed and converted by one pure boundary. | None yet; this phase deliberately records current behavior before migration. | Asymmetric point, rectangle, fractional round-trip, nesting, and real Babylon camera orientation tests. | Camera placement, depth direction, old coordinate service, layout meshes, scrolling, controls, picks, and plugin API still need migration. |

## Known convention leaks to migrate

- `BabylonCameraService` owns scale but not the complete forward/inverse projection.
- `CoordinateTransformService` encodes the positive-Z camera's X mirror.
- `ElementCreationService` wraps plugin coordinates with X/Y inversions and
  exposes `pixelToWorldScale`.
- text and image paths contain explicit mirrored-X/UV compensation.
- positioning contracts and containing blocks contain Babylon `Vector3` values.
- flex, grid, list, and auto-height paths position meshes during layout.
- `AstylarScrollRuntime` stores and mutates mesh positions using camera scale.
- range/control managers perform control calculations using world dimensions.
- reverse interaction projection derives CSS rectangles from Babylon bounds.

Each migration phase must replace one of these convention leaks with CSS-space
state and remove its compensation only after a user-facing or boundary-level
regression test exists.
