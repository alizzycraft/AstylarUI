# Application-grade intrinsic Grid parity v6

This phase makes Grid tracks and height-auto Grid containers derive their used sizes from nested content in common browser layouts. Work proceeds one coherent behavior at a time: capture a browser/Astylar baseline, repair the general contribution or track-sizing rule, add focused regression coverage, verify all representative viewports and the full corpus, remove newly unnecessary application workarounds, document the supported subset, and commit.

## Completion thresholds

- Nested text and container content correctly determine supported `auto`, `min-content`, and `max-content` row sizes.
- Text wrapping at desktop, tablet, and mobile widths changes Grid row and container height correctly.
- Mixed fixed, fractional, auto, and supported intrinsic tracks have focused browser-parity coverage.
- Supported implicit rows and fixed-count `repeat()` patterns have focused coverage.
- The project dashboard summary no longer declares breakpoint-specific row heights where supported Grid reflow can determine them.
- Every renderer change has focused unit and parity regression coverage.
- Every representative render has SSIM at or above `0.95`; full-corpus median is at or above `0.98`.
- At least 95% of measured edges are within `2px`, with no unexplained error above `5px`.
- Visible text and line counts match exactly, with no runtime errors.
- Unit tests, Angular application build, and library build pass.
- Supported behavior, rejected syntax, and remaining limitations are explicit.
- The final tree is clean and committed, and `parity:check` passes three consecutive times without changes.

## Increment log

| Increment | Browser expectation | Baseline | General repair | Focused result | Representative/full result | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Nested flex content contributing to an auto row | A height-auto nested flex card contributes its text-sized children, gap, padding, and border to an `auto` Grid row; pre-layout and final placement use the same contribution. | New `grid-auto-nested-flex-row` fixture: SSIM `0.9696`; `80%` of edges within `2px`; maximum edge error `74.0285px`; the parent Grid was pre-measured correctly, but final placement discarded the nested contribution and assigned a zero-height row. | Extract pure track helpers to remove the Grid/Flex module cycle; expose Flex's recursive outer-height measurement; inject it into final Grid placement and measure each item at its resolved column width before resolving intrinsic rows. | SSIM `0.9987`; `100%` of edges within `2px`; maximum edge error `0.0730px`; exact text/line counts; runtime clean; focused flex/Grid suites `25/25`. | All nine representative renders unchanged and above `0.95`. Full corpus: 89 fixtures / 101 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean. | Accepted |
| Width-constrained wrapped text contributing to an auto row | Grid-item text wraps against the item's resolved track width, so narrower responsive columns increase both the `auto` row and height-auto Grid container. Pre-layout and final placement must use the same track resolver and available width. | New `grid-auto-wrapped-text-row` desktop/tablet/mobile renders: SSIM `0.8975 / 0.8945 / 0.8716`; only `62.5%` of edges within `2px`; maximum edge error grew `10.0043 / 20.0084 / 30.0102px` as the viewport narrowed because pre-layout measured the text against the full Grid content width. | Move the existing fixed/percentage/fractional/definite-min `minmax()` track algorithm into a shared pure resolver; use it in Grid placement and height-auto Grid pre-layout; measure each item contribution against its resolved column width. | SSIM `0.9917 / 0.9952 / 0.9869`; `100%` of edges within `2px`; maximum edge error at most `0.0476px`; exact responsive line counts/text; runtime clean; focused flex/Grid suites `26/26`. | All nine representative renders unchanged and above `0.95`, with every measured edge within `2px`. Full corpus: 90 fixtures / 104 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean. | Accepted |
| Content-sized implicit rows and definite Grid items | Items beyond the explicit column structure create implicit `auto` rows. Each row uses its largest contribution, while a fixed-pixel item keeps its authored size and aligns at the track start instead of being forcibly stretched. | New `grid-implicit-auto-rows` fixture: SSIM `0.9844`; `92.9%` of edges within `2px`; maximum edge error `15.9889px`. The implicit row sizes and positions were correct, but Astylar stretched the shorter fixed-height item in each row to the tallest contribution. | Allow layout-assigned dimensions to override each axis independently; omit the Grid height override for supported definite-height items so the central dimension service preserves box sizing; align the resulting item within its track through the normal coordinate transform; retain the actual used size for nested layout. | SSIM `1.0000`; `100%` of edges within `2px`; maximum edge error `0.0631px`; exact geometry/text; runtime clean; focused flex/Grid suites `28/28`. | All nine representative renders unchanged and above `0.95`. Full corpus: 91 fixtures / 105 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean. | Accepted |

## Starting baseline

Phase 5 completed with 88 fixtures / 100 renders across three viewports, median SSIM `0.9966`, minimum SSIM `0.9509`, `99.9%` of measured edges within `2px`, maximum edge error `3.9921px`, exact text, no runtime errors, 107 passing unit tests, and passing application/library builds.

Representative desktop/tablet/mobile SSIM: project dashboard `0.9743 / 0.9802 / 0.9603`; data management `0.9891 / 0.9898 / 0.9804`; account settings `0.9609 / 0.9664 / 0.9509`.

## Supported subset and deferred syntax

Current supported intrinsic rows are fixed pixel rows and explicit or implicit `auto` rows whose item contributions can be measured recursively. Fixed-pixel Grid item sizes are preserved; percentage item sizes and complete Grid self-alignment remain deferred. Phase 6 will extend this subset through focused evidence. `auto-fit`, `auto-fill`, named lines/areas, arbitrary placement, spanning, subgrid, and masonry remain out of scope. Unsupported intrinsic combinations must return an explicit unsupported result rather than silently using zero-sized tracks.

## Verification log

- Focused nested-flex Grid contribution tests: 25 passing across Flex and Grid services.
- Focused `grid-auto-nested-flex-row` parity: SSIM `0.9987`; all measured edges within `2px`; maximum edge error `0.0730px`; exact text; runtime clean.
- Representative project dashboard, data management, and account settings: all desktop/tablet/mobile results unchanged; every measured edge within `2px`.
- Full unit suite after nested-flex contributions: 108 passing.
- Full parity corpus after nested-flex contributions: 89 fixtures / 101 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of measured edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean.
- Angular application production build and library TypeScript build: passing (existing Angular budget warnings only).
- Focused responsive wrapped-text Grid contribution: desktop/tablet/mobile SSIM `0.9917 / 0.9952 / 0.9869`; all measured edges within `2px`; maximum edge error `0.0476px`; exact text and line counts; runtime clean.
- Focused Flex/Grid tests after sharing track resolution: 26 passing; full unit suite: 109 passing.
- Representative applications after width-constrained contribution sizing: project dashboard `0.9743 / 0.9802 / 0.9603`; data management `0.9891 / 0.9898 / 0.9804`; account settings `0.9609 / 0.9664 / 0.9509`; all measured edges within `2px`; exact text; runtime clean.
- Full parity corpus after width-constrained contribution sizing: 90 fixtures / 104 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of measured edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean.
- Angular application production build and library TypeScript build after width-constrained contribution sizing: passing (existing Angular budget warnings only).
- Focused implicit-row fixture: baseline SSIM `0.9844`, `92.9%` of edges within `2px`, maximum error `15.9889px`; repaired SSIM `1.0000`, all measured edges within `2px`, maximum error `0.0631px`, exact text, runtime clean.
- Focused Flex/Grid tests after implicit rows and definite item sizing: 28 passing; full unit suite: 111 passing.
- Full parity corpus after implicit rows and definite item sizing: 91 fixtures / 105 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of measured edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean. All nine representative renders remain at their established values.
- Angular application production build and library TypeScript build after implicit rows and definite item sizing: passing (existing Angular budget warnings only).

## Next candidates

Continue from fresh baselines for nested block/control/image content, mixed intrinsic tracks, intrinsic keywords and bounds, and fixed-count `repeat()`. Remove dashboard row-height declarations only after the underlying contribution behavior is covered and green.
