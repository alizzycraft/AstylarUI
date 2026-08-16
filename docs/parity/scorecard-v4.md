# Content-driven layout parity v4

This phase removes renderer-specific dimensions from the representative applications by implementing the browser's ordinary intrinsic and content-driven sizing behavior one coherent feature at a time. Each feature begins with a browser/Astylar baseline, adds focused regression coverage, repairs the general renderer behavior, and is verified against the full parity corpus before commit.

## Completion thresholds

- Every one of the nine representative application renders has SSIM at or above `0.95`.
- Full-suite median SSIM is at or above `0.98`.
- At least 95% of measured edges are within `2px`, with no unexplained error above `5px`.
- Visible text and line counts match exactly, with no runtime errors.
- Unit tests, Angular application build, and library build pass.
- Representative application workaround dimensions are removed where normal block, text, control, image, flex, grid, and responsive sizing can determine them.
- Final committed-tree `parity:check` succeeds three consecutive times without changes.

## Increment log

| Increment | Browser expectation | Baseline | General repair | Focused result | Full-corpus result | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Auto-height block containers and block `width:auto` | An in-flow block fills the containing content width, and a height-auto parent encloses child border boxes, collapsed sibling margins, padding, and borders. Positioned descendants do not contribute to its height. | New `auto-block-height` fixture: SSIM `0.9245`; `75%` of edges within `2px`; maximum edge error `440px`; parent incorrectly remained viewport-height; child blocks shrink-wrapped and text wrapped to two lines. | Resolve nested in-flow descendants before measuring their parent; compute normal block flow and collapsed sibling margins; resize non-root auto-height meshes while preserving the top border edge; defer positioned descendants until the containing block has its final height; make block `width:auto` fill available content width; update the generated border frame when geometry changes. | SSIM `0.9954`; `100%` of edges within `2px`; maximum edge error `0.0006px`; exact text/line count; runtime clean. | 69 fixtures / 81 renders / three viewports; median SSIM `0.9958`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean. | Accepted |
| Width-constrained text driving auto height | A block with `height:auto` grows to the wrapped line count at its resolved content width, including padding and borders. | New `auto-wrapped-text` fixture: SSIM `0.9463`; `75%` of edges within `2px`; maximum edge error `450px`; text wrapped correctly but its block retained the containing viewport height. | Preserve the unconstrained measurement for shrink-to-fit width, then remeasure text at the resolved content width for height; apply that result to explicit and implicit auto height; include border insets in the intrinsic border box. | SSIM `0.9879`; `100%` of edges within `2px`; maximum edge error `0.0003px`; exact four-line text; runtime clean. | 70 fixtures / 82 renders / three viewports; median SSIM `0.9958`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean. | Accepted |
| Intrinsic text height in flex pre-layout | A height-auto text flex item contributes its line-box height before `justify-content` positions the item group. | New `flex-auto-text` fixture: SSIM `0.9906`; `66.7%` of edges within `2px`; maximum edge error `15.0200px`; the heightless label was assigned the renderer's legacy `50px` fallback. | Measure text-bearing flex items at their resolved content width and include padding/borders; retain the legacy fallback only for non-text descendants pending general content-sized flex containers. | SSIM `0.9985`; `100%` of edges within `2px`; maximum edge error `0.0310px`; exact text; runtime clean. | 71 fixtures / 83 renders / three viewports; median SSIM `0.9958`; minimum SSIM `0.9509`; `99.9%` of edges within `2px`; maximum edge error `3.9921px`; exact text; runtime clean. | Accepted |

## Current representative application floor

| Application | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Project dashboard | `0.9743` | `0.9802` | `0.9603` |
| Data management | `0.9668` | `0.9721` | `0.9528` |
| Account settings | `0.9610` | `0.9665` | `0.9509` |

All nine representative renders remain above the `0.95` floor after the current content-driven layout repairs.

The project dashboard title and metadata now derive their heights from typography rather than explicit `28px` and `20px` declarations. Its summary labels also derive their responsive one-, two-, or three-line heights without desktop/tablet/mobile height overrides. Dashboard SSIM remains unchanged at all three viewports.

## Verification log

- Focused block-layout unit tests: 9 passing.
- Focused dimension unit tests after wrapped-text repair: 8 passing.
- Full unit suite after wrapped-text repair: 84 passing.
- Full unit suite after flex text sizing: 85 passing.
- Angular application production build: passing (existing bundle/style budget warnings only).
- Library TypeScript build: passing.
- Full non-enforcing parity run: completion thresholds met.

## Next candidates

The next increment should be chosen from fresh browser/Astylar baselines, prioritizing the behavior that removes the largest amount of representative-app workaround sizing. Likely candidates are wrapped text driving block height, intrinsic form-control/replaced-element sizing with min/max constraints, then content-driven flex and grid cross sizes. Do not remove an application workaround until its underlying general behavior has focused regression coverage and passes the full corpus.
