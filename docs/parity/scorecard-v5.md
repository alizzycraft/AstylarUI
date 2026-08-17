# Responsive intrinsic layout and paint fidelity parity v5

This phase extends browser parity across responsive intrinsic flex/grid layout and then addresses the largest evidence-backed typography and paint differences. Work proceeds one coherent behavior at a time: capture a focused browser/Astylar baseline, repair the general renderer rule, add regression coverage, run the representative applications and full corpus, document the evidence, and commit the increment.

## Completion thresholds

- Wrapped flex intrinsic height and supported intrinsic grid behavior have focused coverage.
- Common percentage and `minmax()` flex/grid cases match browser layout within the supported CSS subset.
- The largest representative typography and paint gaps are either repaired or explicitly explained; negligible rasterization and antialiasing differences are not chased.
- Every one of the nine representative application renders has SSIM at or above `0.95`.
- Full-suite median SSIM is at or above `0.98`.
- At least 95% of measured edges are within `2px`, with no unexplained error above `5px`.
- Visible text and line counts match exactly, with no runtime errors.
- Unit tests, Angular application build, and library build pass.
- Representative application workaround dimensions are removed where supported normal reflow can determine them.
- Every renderer change has a focused regression and an entry in this scorecard.
- The final tree is committed and `parity:check` succeeds three consecutive times without changes.

## Increment log

| Increment | Browser expectation | Baseline | General repair | Focused result | Full-corpus result | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Wrapped row flex intrinsic height | A height-auto wrapped row flex container forms lines using definite item bases and available content width, then sums the largest outer cross size per line, row gaps, padding, and borders. | New `flex-wrap-auto-height` fixture: SSIM `0.9823`; `93.8%` of edges within `2px`; maximum edge error `15.9999px`; child placement was correct but the container used block-style item-height accumulation and became `132px` instead of `116px`. | Measure definite widths and flex bases during intrinsic pre-layout, form wrapped row lines including margins and column gaps, and sum their outer cross sizes with row gaps and container insets. | SSIM `1.0000`; `100%` of edges within `2px`; maximum edge error `0.0280px`; exact geometry/text; runtime clean; focused flex suite `17/17`. | 85 fixtures / 97 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean; all nine representative renders unchanged. | Accepted |
| Percentage grid tracks from the content box | A percentage grid track resolves against the full content-box dimension before gaps are removed; fractional tracks then receive the remaining track space. | New `grid-percentage-content-width` fixture: SSIM `0.9890`; `83.3%` of edges within `2px`; maximum edge error `8.0052px`; Astylar resolved `40%` against the gap-reduced track space, making the first column `8px` too narrow. | Resolve percentage tokens against `availableSize`; continue subtracting gaps when computing the free space distributed to `fr` tracks. | SSIM `1.0000`; `100%` of edges within `2px`; maximum edge error `0.0246px`; exact geometry/text; runtime clean; focused grid suite `4/4`. | 86 fixtures / 98 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean; all nine representative renders unchanged. | Accepted |
| Definite-minimum `minmax()` grid tracks | A `minmax(<length>, <flex>)` track participates in fractional allocation but freezes at its minimum when its proportional share would be smaller; whitespace inside the function does not create extra tracks. | New `grid-minmax-tracks` fixture: SSIM `0.9278`; `75%` of edges within `2px`; maximum edge error `439.0223px`; the whitespace tokenizer split one `minmax()` function into multiple bogus tracks. | Tokenize track lists at parenthesis depth, parse common definite `minmax()` bounds, and iteratively freeze constrained flex tracks before redistributing the remaining fraction space. Intrinsic keyword bounds remain unsupported pending content-contribution sizing. | SSIM `1.0000`; `100%` of edges within `2px`; maximum edge error `0.0246px`; exact geometry/text; runtime clean; focused grid suite `5/5`. | 87 fixtures / 99 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean; all nine representative renders unchanged. | Accepted |

## Representative application baseline

The accepted Phase 4 baseline remains the starting point: project dashboard desktop/tablet/mobile SSIM `0.9743 / 0.9802 / 0.9603`; data management `0.9891 / 0.9898 / 0.9804`; account settings `0.9609 / 0.9664 / 0.9509`. All nine renders are above the `0.95` floor.

## Verification log

- Focused wrapped-flex unit tests: 17 passing.
- Focused `flex-wrap-auto-height` parity: SSIM `1.0000`; all measured edges within `2px`; maximum edge error `0.0280px`; runtime clean.
- Full unit suite: 103 passing.
- Full parity corpus: 85 fixtures / 97 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of measured edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean.
- Angular application production build: passing (existing bundle/style budget warnings only).
- Library TypeScript build: passing.
- Focused percentage-grid unit tests: 4 passing.
- Focused `grid-percentage-content-width` parity: SSIM `1.0000`; all measured edges within `2px`; maximum edge error `0.0246px`; runtime clean.
- Full unit suite after percentage-grid sizing: 104 passing.
- Full parity corpus after percentage-grid sizing: 86 fixtures / 98 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of measured edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean.
- Angular application production build and library TypeScript build after percentage-grid sizing: passing (existing Angular budget warnings only).
- Focused `minmax()` grid unit tests: 5 passing.
- Focused `grid-minmax-tracks` parity: SSIM `1.0000`; all measured edges within `2px`; maximum edge error `0.0246px`; runtime clean.
- Full unit suite after `minmax()` sizing: 105 passing.
- Full parity corpus after `minmax()` sizing: 87 fixtures / 99 renders / three viewports; median SSIM `0.9966`; minimum SSIM `0.9509`; `99.9%` of measured edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean.
- Angular application production build and library TypeScript build after `minmax()` sizing: passing (existing Angular budget warnings only).

## Next candidates

After each accepted increment, select the largest fresh measured mismatch. Current required candidates are intrinsic grid sizing, percentage/`minmax()` track behavior, responsive representative-app workaround removal enabled by those repairs, and evidence-led typography/paint fidelity.
