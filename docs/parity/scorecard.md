# Core Web Parity v1 Scorecard

Last updated: 2026-08-15

## Coverage

| Category | Fixtures | Required direction |
| --- | ---: | --- |
| Cascade and default styles | 2 | Selectors, specificity, inheritance, inline styles, UA-like defaults |
| Block and inline flow | 2 | Block, inline, inline-block, none, inline-flex |
| Box model and sizing units | 3 | Width/height, min/max, padding, margin, borders, px/%/viewport/font units |
| Typography and multiline text | 2 | Fonts, line height, wrapping, whitespace, alignment, overflow |
| Flexbox | 0 | Direction, wrap, basis, grow/shrink, gap, order, alignment |
| Positioning and stacking | 1 | Static, relative, absolute, fixed, containing blocks, z-order |
| Lists, tables, and images | 0 | Representative structural and replaced content |
| Forms and interactive states | 0 | Basic visible controls, focus, checked/disabled states |
| **Total** | **10 / 40** | Balanced coverage required before completion |

## Current Baseline

| Metric | Current result | Core Web Parity v1 threshold |
| --- | ---: | ---: |
| Fixtures | 10 | At least 40 |
| Median SSIM | 0.9983 | At least 0.98 |
| Minimum fixture SSIM | 0.9862 | At least 0.95 |
| Geometry edges within 2px | 100% | At least 95% |
| Maximum edge error | 0.006px | At most 5px or documented |
| Text content and line counts | Pass | Exact |
| Runtime errors | 0 | 0 |

All current fixtures pass every per-fixture quality threshold. The suite does
not meet the completion gate because coverage is still 10 of 40 fixtures.

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
8. Absolutely positioned descendants resolve offsets and percentages from the
   positioned ancestor's padding box. Normal-flow sizing continues to use the
   ancestor content box.
9. Reference text metrics include direct text nodes only. Descendant element
   text is measured against its own Astylar mesh, preventing double counting.
10. Stylesheet declarations are resolved per property using selector specificity
    followed by source order. Supported simple compound selectors may combine a
    type, ID, and multiple classes; combinators remain outside this iteration.
11. Inline JSON `style` declarations are the highest supported author priority.
    Inherited text properties use an internal weak ancestry registry so rendering
    never inserts circular parent references into serializable `SiteData`.
12. Normal-flow block children begin at the parent's content edge and stack in
    source order. Elements with `display: none` are excluded before mesh creation
    and contribute no block or inline layout space.
13. Fixtures may declare `expectedAbsentIds`; reference mode verifies a zero-size
    native `display: none` box and Astylar mode verifies that no mesh exists.
14. Pixel `line-height` values are normalized against the element's resolved font
    size. Unitless and percentage values remain direct multipliers.

## Iteration History

| Iteration | Before | After | Root cause addressed |
| --- | --- | --- | --- |
| Harness foundation | 1 fixture; SSIM 0.1031; 50% edges within 2px; max error 360px | 1 fixture; SSIM 0.9984; 100% edges; max error 0.003px | Mirrored camera X coordinates, content-box sizing, and black/back-culled unlit materials |
| Positioned containing blocks | 4 fixtures; nested child max error 24px; text mismatch | 4 fixtures; median SSIM 0.9992; 100% edges; exact text | Absolute children incorrectly started at the content edge instead of the padding-box edge; reference double-counted descendant text |
| Cascade and inheritance | 4 fixtures; no cascade coverage | 6 fixtures; median SSIM 0.9992; minimum 0.9978; 100% edges; exact text | Resolver used class attribute order, ignored inline styles and compound specificity, and did not inherit parent typography |
| Block and inline flow | 8-fixture attempt; minimum SSIM 0.9498; 80% edges within 2px; max error 172px | 8 fixtures; median SSIM 0.9984; minimum 0.9955; 100% edges; max error 0.006px; exact text | Block children retained centered X positions; `display: none` children entered layout and prevented inline placements from being applied |
| Multiline typography | 10-fixture attempt; new fixtures SSIM 0.9716 and 0.9821 | 10 fixtures; median SSIM 0.9983; minimum 0.9862; 100% edges; exact text | Pixel line height was divided by a fixed 16px default rather than the resolved 18px or 20px element font size |

## Known Intentional Deviations

None accepted yet.

## Recommended Next Target

Add foundational flexbox fixtures for row/column direction, main/cross-axis
alignment, gap, and grow/shrink. Flexbox remains the largest uncovered layout
category and affects representative application composition.
