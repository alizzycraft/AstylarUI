# Core Web Parity v1 Scorecard

Last updated: 2026-08-15

## Coverage

| Category | Fixtures | Required direction |
| --- | ---: | --- |
| Cascade and default styles | 0 | Selectors, specificity, inheritance, inline styles, UA-like defaults |
| Block and inline flow | 0 | Block, inline, inline-block, none, inline-flex |
| Box model and sizing units | 1 | Width/height, min/max, padding, margin, borders, px/%/viewport/font units |
| Typography and multiline text | 0 | Fonts, line height, wrapping, whitespace, alignment, overflow |
| Flexbox | 0 | Direction, wrap, basis, grow/shrink, gap, order, alignment |
| Positioning and stacking | 0 | Static, relative, absolute, fixed, containing blocks, z-order |
| Lists, tables, and images | 0 | Representative structural and replaced content |
| Forms and interactive states | 0 | Basic visible controls, focus, checked/disabled states |
| **Total** | **1 / 40** | Balanced coverage required before completion |

## Current Baseline

| Metric | Current result | Core Web Parity v1 threshold |
| --- | ---: | ---: |
| Fixtures | 1 | At least 40 |
| Median SSIM | 0.9984 | At least 0.98 |
| Minimum fixture SSIM | 0.9984 | At least 0.95 |
| Geometry edges within 2px | 100% | At least 95% |
| Maximum edge error | 0.003px | At most 5px or documented |
| Text content and line counts | Pass | Exact |
| Runtime errors | 0 | 0 |

The current fixture passes every per-fixture quality threshold. The suite does
not meet the completion gate because coverage is still 1 of 40 fixtures.

## Decisions

1. Both modes use one Angular application and the same installed Chromium browser,
   viewport, DPR, and font readiness gates.
2. Astylar geometry is measured from projected mesh bounds; internal CSS-pixel
   dimensions are retained to distinguish layout errors from camera/render errors.
3. Screenshots are compared without broad masks. Exact antialiasing is out of
   scope, but no tolerance is currently applied to hide it.
4. Parity routes use client rendering so SSR never creates a WebGL engine.
5. Logical X coordinates are converted at the central mesh-placement boundary.
   Babylon's camera looks down the negative Z axis, so this conversion prevents
   every CSS layout mode from being mirrored horizontally.
6. Solid CSS materials are unlit, emissive, and two-sided. Their color must not
   depend on scene lighting or plane orientation.
7. Astylar keeps its historical `border-box` sizing default for compatibility,
   while an explicit `boxSizing: 'content-box'` expands the outer dimensions by
   padding and border in the same way as CSS.

## Known Intentional Deviations

None accepted yet.

## Recommended Next Target

Add focused fixtures for border-box sizing, percentage sizing, and nested
containing blocks before moving to block/inline flow. This will test whether the
corrected coordinate and box-model foundations compose under nesting.
