# Core Web Parity v1 Scorecard

Last updated: 2026-08-15

## Coverage

| Category | Fixtures | Required direction |
| --- | ---: | --- |
| Cascade and default styles | 3 | Selectors, specificity, inheritance, inline styles, UA-like defaults |
| Block and inline flow | 2 | Block, inline, inline-block, none, inline-flex |
| Box model and sizing units | 3 | Width/height, min/max, padding, margin, borders, px/%/viewport/font units |
| Typography and multiline text | 2 | Fonts, line height, wrapping, whitespace, alignment, overflow |
| Flexbox | 3 | Direction, wrap, basis, grow/shrink, gap, order, alignment |
| Positioning and stacking | 1 | Static, relative, absolute, fixed, containing blocks, z-order |
| Lists, tables, and images | 7 | Representative structural and replaced content |
| Forms and interactive states | 0 | Basic visible controls, focus, checked/disabled states |
| **Total** | **21 / 40** | Balanced coverage required before completion |

## Current Baseline

| Metric | Current result | Core Web Parity v1 threshold |
| --- | ---: | ---: |
| Fixtures | 21 | At least 40 |
| Median SSIM | 0.9946 | At least 0.98 |
| Minimum fixture SSIM | 0.9805 | At least 0.95 |
| Geometry edges within 2px | 100% | At least 95% |
| Maximum edge error | 0.203px | At most 5px or documented |
| Text content and line counts | Pass | Exact |
| Runtime errors | 0 | 0 |

All current fixtures pass every per-fixture quality threshold. The suite does
not meet the completion gate because coverage is still 21 of 40 fixtures.

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
15. Flex layout uses the renderer's border-box-to-content-box inset rather than
    reparsing padding, so border widths participate in the flex containing block.
16. Main-axis gap is `column-gap` for rows and `row-gap` for columns. It is
    reserved exactly once before justification and flex growth distribution.
17. Auto-sized blocks with direct text fill the containing content width and use
    intrinsic line-box height. Adjacent normal-flow vertical margins collapse.
18. `em` margins resolve from the element font size; `rem` margins use the 16px
    Core Web Parity root baseline.
19. List items use the list content box and their intrinsic line-box heights.
    Markers are painted outside the item box, with discs for unordered lists and
    rendered sequential decimal text for ordered lists. Inherited `line-height`
    is not shadowed by a synthetic per-element global default.
20. Fixed table layout uses explicit pixel and percentage `<col>` definitions.
    Space left by undefined columns is divided evenly among those columns.
21. Replaced image content loads on a child plane above the element background.
    Natural dimensions resolve after texture readiness while preserving the
    element's top-left layout anchor; `fill`, `contain`, and `cover` use centered
    aspect-ratio math and mirrored U coordinates compensate for the render axis.
22. Inline formatting contexts with only positioned children do not collapse or
    move their parent while attempting content-driven auto-height calculation.

## Iteration History

| Iteration | Before | After | Root cause addressed |
| --- | --- | --- | --- |
| Harness foundation | 1 fixture; SSIM 0.1031; 50% edges within 2px; max error 360px | 1 fixture; SSIM 0.9984; 100% edges; max error 0.003px | Mirrored camera X coordinates, content-box sizing, and black/back-culled unlit materials |
| Positioned containing blocks | 4 fixtures; nested child max error 24px; text mismatch | 4 fixtures; median SSIM 0.9992; 100% edges; exact text | Absolute children incorrectly started at the content edge instead of the padding-box edge; reference double-counted descendant text |
| Cascade and inheritance | 4 fixtures; no cascade coverage | 6 fixtures; median SSIM 0.9992; minimum 0.9978; 100% edges; exact text | Resolver used class attribute order, ignored inline styles and compound specificity, and did not inherit parent typography |
| Block and inline flow | 8-fixture attempt; minimum SSIM 0.9498; 80% edges within 2px; max error 172px | 8 fixtures; median SSIM 0.9984; minimum 0.9955; 100% edges; max error 0.006px; exact text | Block children retained centered X positions; `display: none` children entered layout and prevented inline placements from being applied |
| Multiline typography | 10-fixture attempt; new fixtures SSIM 0.9716 and 0.9821 | 10 fixtures; median SSIM 0.9983; minimum 0.9862; 100% edges; exact text | Pixel line height was divided by a fixed 16px default rather than the resolved 18px or 20px element font size |
| Flex axes and gaps | 12-fixture attempt; 91.3% edges within 2px; max error 18.007px; column fixture SSIM 0.9609 | 13 fixtures; median SSIM 0.9978; minimum 0.9833; 100% edges; max error 0.009px; exact text | Flex layout ignored border insets, always used column gap on the main axis, and could reserve gap twice during growth |
| Semantic block defaults | 14-fixture attempt; 94.8% edges within 2px; max error 431.571px; semantic fixture SSIM 0.9619 | 14 fixtures; median SSIM 0.9953; minimum 0.9805; 100% edges; max error 0.203px; exact text | Text-bearing blocks shrink-wrapped width, inherited parent height, used fixed-size `em` margins, and summed adjacent margins; text bounds also ignored resolved line height |
| List flow and markers | 16-fixture attempt; 85.1% edges within 2px; max error 80.002px; minimum SSIM 0.9361 | 16 fixtures; median SSIM 0.9946; minimum 0.9805; 100% edges; max error 0.203px; exact text | Lists added a second indentation, narrowed items, divided container height equally, inserted fixed spacing, and used colored geometric placeholders for ordered markers |
| Fixed table tracks | 18-fixture attempt; 98.1% edges within 2px; max error 59.998px | 18 fixtures; median SSIM 0.9941; minimum 0.9805; 100% edges; max error 0.203px; exact text | The table renderer parsed `<col>` definitions for column count but discarded their declared widths and redistributed every track equally |
| Intrinsic images and object fit | 21-fixture attempt; 97.3% edges within 2px; max error 300.004px; minimum SSIM 0.1172 | 21 fixtures; median SSIM 0.9946; minimum 0.9805; 100% edges; max error 0.203px; exact text; image fixtures 0.9997–1.0000 SSIM | Images stretched one lit texture across the element, ignored natural size and object fit, rendered mirrored pixels, and exposed an inline auto-height bug that moved parents containing only positioned children |

## Known Intentional Deviations

CSS `line-height: normal` is currently approximated as `1.15` times the resolved
font size. For the deterministic Arial semantic fixture this differs from Chromium
block geometry by at most 0.203px; exact font-engine-specific leading is out of v1.

## Recommended Next Target

Add deterministic basic form-control fixtures. Forms and visible interactive
states remain the only zero-coverage category, and their specialized Babylon
managers have not yet been measured against equivalent browser controls.
