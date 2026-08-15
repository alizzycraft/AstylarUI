# Core Web Parity v1 Scorecard

Last updated: 2026-08-15

## Coverage

| Category | Fixtures | Required direction |
| --- | ---: | --- |
| Cascade and default styles | 4 | Selectors, specificity, inheritance, inline styles, UA-like defaults |
| Block and inline flow | 3 | Block, inline, inline-block, none, inline-flex |
| Box model and sizing units | 4 | Width/height, min/max, padding, margin, borders, px/%/viewport/font units |
| Typography and multiline text | 4 | Fonts, line height, wrapping, whitespace, alignment, overflow |
| Flexbox | 4 | Direction, wrap, basis, grow/shrink, gap, order, alignment |
| Positioning and stacking | 3 | Static, relative, absolute, fixed, containing blocks, z-order |
| Lists, tables, and images | 7 | Representative structural and replaced content |
| Forms and interactive states | 4 | Basic visible controls, focus, checked/disabled states |
| **Total** | **33 / 40** | Balanced coverage required before completion |

## Current Baseline

| Metric | Current result | Core Web Parity v1 threshold |
| --- | ---: | ---: |
| Fixtures | 33 | At least 40 |
| Median SSIM | 0.9953 | At least 0.98 |
| Minimum fixture SSIM | 0.9805 | At least 0.95 |
| Geometry edges within 2px | 100% | At least 95% |
| Maximum edge error | 0.203px | At most 5px or documented |
| Text content and line counts | Pass | Exact |
| Runtime errors | 0 | 0 |

All current fixtures pass every per-fixture quality threshold. The suite does
not meet the completion gate because coverage is still 33 of 40 fixtures.

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
23. Single-line text controls position and clip text against the declared CSS
    padding edge plus border, including asymmetric horizontal padding. Native
    browser control chrome remains outside the comparison; fixtures remove it
    and declare every visible style explicitly.
24. Checkbox and radio state is initialized from the JSON DOM's `checked` and
    `disabled` properties. Checkbox geometry preserves independent CSS width and
    height, labels exist only when authored, and element opacity also applies to
    separately rendered borders.
25. Mesh stacking uses the fully cascaded stylesheet `z-index`, not only JSON
    inline style. A bounded monotonic world-depth mapping and matching material
    depth bias keep layers distinguishable at the UI camera distance without
    letting large CSS values cross the camera plane.
26. `min-width`, `min-height`, `max-width`, and `max-height` constrain resolved
    dimensions before content-box insets are added. Conflicting constraints use
    the CSS precedence where the minimum wins over the maximum.
27. Canvas measurement, line wrapping, layout metrics, and glyph painting all
    receive the resolved `letter-spacing` and `word-spacing`, keeping intrinsic
    text dimensions and the rendered texture on the same native browser metrics.
28. `inline-flex` participates in its parent's inline formatting context while
    using the same internal flex layout algorithm as a block-level `flex`
    container. Reference fixtures omit whitespace text nodes absent from JSON DOM.
29. Wrapped row flex layout is covered with explicit basis, independent row and
    column gaps, and `align-content: space-between`; the existing multi-line flex
    algorithm matches the browser for this representative case.
30. A positioned `z-index: 0` parent is covered with overlapping negative and
    `auto` children, confirming that the negative child remains above the parent
    background while the auto layer paints in front.
31. Semantic `select` and `textarea` element types dispatch to their control
    managers without requiring a redundant `inputType`. Closed select labels use
    the declared horizontal padding plus border as their content inset.
32. Uppercase text transformation and right alignment are covered together in a
    fixed content box, confirming that transformed glyph measurement and paint
    use the same right content edge as Chromium.
33. The universal selector matches every JSON-DOM element at specificity zero,
    so type, class, and ID selectors continue to override its declarations one
    property at a time. Browser-only harness elements are explicitly neutralized.

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
| Intrinsic images and object fit | 21-fixture attempt; 97.3% edges within 2px; max error 300.004px; minimum SSIM 0.1172 | 21 fixtures; median SSIM 0.9946; minimum 0.9805; 100% edges; max error 0.203px; exact text; image fixtures 0.9997-1.0000 SSIM | Images stretched one lit texture across the element, ignored natural size and object fit, rendered mirrored pixels, and exposed an inline auto-height bug that moved parents containing only positioned children |
| Styled buttons and text inputs | 23-fixture attempt; text input SSIM 0.9948 with value painted at a hard-coded 1.5px inset | 23 fixtures; median SSIM 0.9953; minimum 0.9805; 100% edges; max error 0.203px; exact text; both new controls at 0.9999-1.0000 SSIM | Text inputs ignored declared horizontal padding and border when positioning and clipping their value; control fixtures now explicitly remove native chrome |
| Checked and disabled controls | 24-fixture attempt; 98.3% edges within 2px; max error 2.785px; checkbox SSIM 0.9920 | 24 fixtures; median SSIM 0.9956; minimum 0.9805; 100% edges; max error 0.203px; exact text; state fixture 0.9999 SSIM | Checkbox/radio managers discarded initial state, forced height from width, invented labels, and failed to apply element opacity to separate border materials |
| Positioned sibling stacking | 25-fixture attempt; overlap SSIM 0.9917 with the later low-z sibling painted above the earlier high-z sibling | 25 fixtures; median SSIM 0.9956; minimum 0.9805; 100% edges; max error 0.203px; exact text; overlap fixture 1.0000 SSIM and 0.162px max edge error | Stacking read only inline element style, and its 0.01 depth step was too small for depth-buffer precision at the UI camera distance |
| Minimum and maximum constraints | 26-fixture attempt; 99.2% edges within 2px; max error 110.002px; constraint fixture SSIM 0.9668 | 26 fixtures; median SSIM 0.9964; minimum 0.9805; 100% edges; max error 0.203px; exact text; constraint fixture 1.0000 SSIM | Dimension resolution applied minimum constraints but ignored `max-width` and `max-height` entirely |
| Letter and word spacing | 27-fixture attempt; 99.6% edges within 2px; max error 46.005px; spacing fixture SSIM 0.9891 | 27 fixtures; median SSIM 0.9964; minimum 0.9805; 100% edges; max error 0.203px; exact text; spacing fixture 0.9971 SSIM | Text spacing was parsed but omitted from every canvas measurement and paint context, leaving auto width and glyph positions unspaced |
| Inline flex outer and inner flow | 28-fixture attempt; 93.7% edges within 2px; max error 100.008px; inline-flex fixture SSIM 0.9637 | 28 fixtures; median SSIM 0.9964; minimum 0.9805; 100% edges; max error 0.203px; exact text; inline-flex fixture 0.9856 SSIM | The outer inline layout recognized `inline-flex`, but the flex-container predicate did not, so each container's children were block-stacked instead of flex-laid out |
| Wrapped flex lines | No deterministic flex-wrap comparison | 29 fixtures; median SSIM 0.9956; minimum 0.9805; 100% edges; max error 0.203px; exact text; wrap fixture 0.9836 SSIM and 0.005px max edge error | Added positive coverage confirming that line formation, flex basis, axis-specific gaps, and `align-content: space-between` already agree with Chromium |
| Negative and auto stacking | No negative-versus-auto stacking comparison | 30 fixtures; median SSIM 0.9956; minimum 0.9805; 100% edges; max error 0.203px; exact text; stacking fixture 0.9880 SSIM and 0.098px max edge error | Added positive coverage confirming parent-background, negative child, and auto sibling paint order within a positioned stacking context |
| Styled semantic select | 31-fixture attempt; select geometry matched but the selected label was absent; fixture SSIM 0.9948 | 31 fixtures; median SSIM 0.9956; minimum 0.9805; 100% edges; max error 0.203px; exact text; select fixture 0.9999 SSIM | Semantic `select` was not dispatched to its manager without redundant `inputType`; once visible, its label used a hard-coded inset instead of declared border and padding |
| Text transform and alignment | No deterministic transform-plus-alignment comparison | 32 fixtures; median SSIM 0.9956; minimum 0.9805; 100% edges; max error 0.203px; exact text; transform fixture 0.9926 SSIM and 0.003px max edge error | Added positive coverage confirming uppercase transformation, bold glyph measurement, and right content-edge alignment already agree with Chromium |
| Universal selector cascade | 33-fixture attempt; universal declarations were absent and the new fixture scored 0.8939 SSIM | 33 fixtures; median SSIM 0.9953; minimum 0.9805; 100% edges; max error 0.203px; exact text; universal fixture 0.9903 SSIM | The selector parser rejected `*`; it now matches all elements at specificity zero while higher-specificity rules override individual properties |

## Known Intentional Deviations

CSS `line-height: normal` is currently approximated as `1.15` times the resolved
font size. For the deterministic Arial semantic fixture this differs from Chromium
block geometry by at most 0.203px; exact font-engine-specific leading is out of v1.

## Recommended Next Target

Cover fixed positioning and additional sizing units, then broaden block flow and
remaining forms coverage. These are the least represented foundational behaviors.
