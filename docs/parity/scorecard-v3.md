# Representative Application Parity v3

This phase validates that ordinary application-development patterns transfer from browser HTML/CSS to equivalent Astylar JSON DOM and `StyleRule` data at desktop (`800×600`), tablet (`640×720`), and mobile (`390×844`) viewports.

## Coverage matrix

| Coverage area | Project dashboard | Data management | Account settings |
| --- | --- | --- | --- |
| Block flow | All viewports: headings and metadata | Headings, table card, pagination, and empty-state message | Planned |
| Nested Flexbox | All viewports: shell, toolbars, lists | Shell, navigation, wrapped toolbar, pagination, and responsive detail panel | Planned |
| Multi-row/column Grid | Summary cards; tablet uses two rows | Planned | Planned |
| Fixed and fractional sizing | Sidebar, content, and summary tracks | Fixed table columns with flexible shell and search sizing | Planned |
| Responsive media conditions | Desktop/tablet/mobile reflow | Side-by-side desktop, stacked tablet, horizontal-nav mobile | Planned |
| Tables | — | Semantic `colgroup`/`thead`/`tbody` table with fixed tracks and striped/status cells | — |
| Forms and control states | Search, buttons, checked and disabled tasks | Text input, filter/export actions, disabled export/previous, active page | Planned |
| Text wrapping | Summary and activity copy | Multi-line detail-panel copy | Planned |
| Ellipsis | Long task titles | No-wrap and ellipsis rules on compact data cells | Planned |
| Overflow and nested clipping | Shell, main, task and activity regions | Narrow table card clips the fixed-width table on mobile | Planned |
| Relative/absolute/fixed positioning | Absolute shell and fixed help action | Relative main with absolute table and detail panels | Planned |
| Stacking contexts and overlays | Fixed help action | Positioned detail panel with explicit z-index | Planned |
| Semantic selectors/combinators | Descendant, child, compound active selectors | Descendant, compound active, `nth-child`, and high-specificity status selectors | Planned |
| Local deterministic imagery | — | Responsive `object-fit: cover` inventory preview | Planned |
| Three-viewport reflow | Horizontal shell → compact shell → stacked mobile | Sidebar/detail split → stacked panel → horizontal-nav mobile | Planned |

## Application results

| Application | Desktop | Tablet | Mobile | Geometry/text/runtime | Decision |
| --- | --- | --- | --- | --- | --- |
| Project dashboard | SSIM `0.9768` | SSIM `0.9832` | SSIM `0.9622` | 100% of measured edges within 2px; max `0.4721px`; exact text; runtime clean | Accepted after general depth-precision and text-baseline repairs |
| Data management | SSIM `0.9668` | SSIM `0.9722` | SSIM `0.9529` | 100% of measured edges within 2px; max `0.2743px`; exact text; runtime clean | Accepted after general wrapped-flex first-line repair |
| Account settings | Pending | Pending | Pending | Pending | Not started |

## Renderer decisions

| Behavior exposed | Evidence | General repair | Regression coverage |
| --- | --- | --- | --- |
| Dense nested surfaces intermittently lost parent/card paint at tablet and mobile camera distances | Initial application screenshots exposed parent colors through correctly measured child boxes, with baseline SSIM as low as `0.6495` | Bound the Babylon camera clipping range to one viewport height around the UI plane, preserving authored stacking while improving depth-buffer precision | `BabylonCameraService` unit coverage for the UI clip envelope; all legacy stacking and composed fixtures remain green |
| Ordinary text and control labels painted above Chromium baselines | Cross-correlation across headings, task labels, metadata, buttons, and inputs showed consistent baseline offsets by typography size/weight | Apply browser-aligned leading to ordinary text planes and a 2px control-label inset, including clipped text inputs | `BabylonDOMRendererService` unit coverage for compact-bold, body, and display text; full parity suite minimum SSIM `0.9556` |
| The first line in a wrapped flex container was centered across the whole cross axis and overlapped later lines | The mobile search/filter row began about 17px too low while the second wrapped row was correctly positioned | Distinguish an actual multi-line layout from a single line instead of inferring it from `crossOffset === 0` | `FlexService` unit coverage asserts the first wrapped row starts at the content-box top and the next row follows the row gap |

## Verification log

- Project dashboard focused run: desktop `0.9768`, tablet `0.9832`, mobile `0.9622`; exact visible text and line counts; no runtime errors.
- Data management focused run: desktop `0.9668`, tablet `0.9722`, mobile `0.9529`; 100% of measured edges within 2px; maximum edge error `0.2743px`; exact visible text and line counts; no runtime errors.
- Full enforcing run after the renderer repairs: 66 fixtures, 74 renders, three viewports, median SSIM `0.9966`, minimum SSIM `0.9556`, `99.8%` of edges within 2px, maximum edge error `3.9921px`, exact text, and no runtime errors.
- Full enforcing run with the data-management application: 67 fixtures, 77 renders, three viewports, median SSIM `0.9965`, minimum SSIM `0.9529`, `99.9%` of edges within 2px, maximum edge error `3.9921px`, exact text, and no runtime errors.
- All 79 unit tests, the Angular application build, and the library TypeScript build pass.
- Renderer repair commit: `3f526c1` (`fix: stabilize application paint and text baselines`).

Final phase metrics and the remaining application commits will be recorded as each coherent application increment is accepted.
