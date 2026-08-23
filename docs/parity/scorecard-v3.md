# Representative Application Parity v3

This phase validates that ordinary application-development patterns transfer from browser HTML/CSS to equivalent Astylar JSON DOM and `StyleRule` data at desktop (`800x600`), tablet (`640x720`), and mobile (`390x844`) viewports.

## Coverage matrix

| Coverage area | Project dashboard | Data management | Account settings |
| --- | --- | --- | --- |
| Block flow | All viewports: headings and metadata | Headings, table card, pagination, and empty-state message | Form introduction, help text, headings, and modal copy |
| Nested Flexbox | All viewports: shell, toolbars, lists | Shell, navigation, wrapped toolbar, pagination, and responsive detail panel | Shell, navigation, form rows, fieldsets, actions, plan card, and dialog |
| Multi-row/column Grid | Summary cards; tablet uses two rows | — | — |
| Fixed and fractional sizing | Sidebar, content, and summary tracks | Fixed table columns with flexible shell and search sizing | Fixed sidebar/form/plan tracks with flexible workspace sizing |
| Responsive media conditions | Desktop/tablet/mobile reflow | Side-by-side desktop, stacked tablet, horizontal-nav mobile | Side-by-side desktop, stacked tablet, horizontal-nav mobile |
| Tables | — | Semantic `colgroup`/`thead`/`tbody` table with fixed tracks and striped/status cells | — |
| Forms and control states | Search, buttons, checked and disabled tasks | Text input, filter/export actions, disabled export/previous, active page | Semantic form/fieldsets, required/read-only inputs, textarea, select, checked checkbox, and disabled action |
| Text wrapping | Summary and activity copy | Multi-line detail-panel copy | Bio label, modal copy, and responsive plan content |
| Ellipsis | Long task titles | No-wrap and ellipsis rules on compact data cells | — |
| Overflow and nested clipping | Shell, main, task and activity regions | Narrow table card clips the fixed-width table on mobile | Shell, main, form, fieldsets, checkbox slot, and plan card |
| Relative/absolute/fixed positioning | Absolute shell and fixed help action | Relative main with absolute table and detail panels | Absolute legends plus fixed backdrop and confirmation dialog |
| Stacking contexts and overlays | Fixed help action | Positioned detail panel with explicit z-index | High-opacity backdrop and modal stacking context with occluded page content |
| Semantic selectors/combinators | Descendant, child, compound active selectors | Descendant, compound active, `nth-child`, and high-specificity status selectors | Child selectors plus `:required`, `:read-only`, active, checked, and disabled states |
| Local deterministic imagery | — | Responsive `object-fit: cover` inventory preview | — |
| Three-viewport reflow | Horizontal shell to compact shell to stacked mobile | Sidebar/detail split to stacked panel to horizontal-nav mobile | Sidebar/form/plan split to stacked form and plan to horizontal-nav mobile |

## Application results

| Application | Desktop | Tablet | Mobile | Geometry/text/runtime | Decision |
| --- | --- | --- | --- | --- | --- |
| Project dashboard | SSIM `0.9766` | SSIM `0.9830` | SSIM `0.9620` | 100% of measured edges within 2px; max `0.4721px`; exact text; runtime clean | Accepted after general depth-precision and text-baseline repairs |
| Data management | SSIM `0.9668` | SSIM `0.9721` | SSIM `0.9528` | 100% of measured edges within 2px; max `0.2743px`; exact text; runtime clean | Accepted after general wrapped-flex first-line repair |
| Account settings | SSIM `0.9610` | SSIM `0.9665` | SSIM `0.9509` | 100% of measured edges within 2px; max `1.9338px`; exact text; runtime clean | Accepted after general out-of-flow flex sizing and depth-tested text/control paint repairs |

## Renderer decisions

| Behavior exposed | Evidence | General repair | Regression coverage |
| --- | --- | --- | --- |
| Dense nested surfaces intermittently lost parent/card paint at tablet and mobile camera distances | Initial application screenshots exposed parent colors through correctly measured child boxes, with baseline SSIM as low as `0.6495` | Bound the Babylon camera clipping range to one viewport height around the UI plane, preserving authored stacking while improving depth-buffer precision | `BabylonCameraService` unit coverage for the UI clip envelope; all legacy stacking and composed fixtures remain green |
| Ordinary text and control labels painted above Chromium baselines | Cross-correlation across headings, task labels, metadata, buttons, and inputs showed consistent baseline offsets by typography size/weight | Apply browser-aligned leading to ordinary text planes and a 2px control-label inset, including clipped text inputs | `BabylonDOMRendererService` unit coverage for compact-bold, body, and display text; full parity suite remains green |
| The first line in a wrapped flex container was centered across the whole cross axis and overlapped later lines | The mobile search/filter row began about 17px too low while the second wrapped row was correctly positioned | Distinguish an actual multi-line layout from a single line instead of inferring it from `crossOffset === 0` | `FlexService` unit coverage asserts the first wrapped row starts at the content-box top and the next row follows the row gap |
| Absolutely/fixed-positioned and hidden children changed flex sizing | Positioned fieldset legends compressed form rows, while responsive `display:none` plan copy still consumed horizontal space | Classify flex children as flow, positioned, or hidden; size only flow children and render positioned children separately | `FlexService` unit coverage checks all three classifications; settings geometry is within 2px at every viewport |
| Text and control glyphs behind a modal painted through its background | The initial settings screenshot showed form labels and input values on top of the confirmation dialog despite correct z-index geometry | Keep ordinary text, input text, and checkbox/radio paint in the depth-tested render group and use the shared positive local content depth | `BabylonMeshService` unit coverage asserts depth-tested text grouping; legacy stacking fixtures and the full parity suite remain green |

## Verification log

- Project dashboard focused run: desktop `0.9766`, tablet `0.9830`, mobile `0.9620`; exact visible text and line counts; no runtime errors.
- Data management focused run: desktop `0.9668`, tablet `0.9721`, mobile `0.9528`; 100% of measured edges within 2px; maximum edge error `0.2743px`; exact visible text and line counts; no runtime errors.
- Account settings focused run: desktop `0.9610`, tablet `0.9665`, mobile `0.9509`; 100% of measured edges within 2px; maximum edge error `1.9338px`; exact visible text and line counts; no runtime errors.
- Full enforcing run after the renderer repairs: 66 fixtures, 74 renders, three viewports, median SSIM `0.9966`, minimum SSIM `0.9556`, `99.8%` of edges within 2px, maximum edge error `3.9921px`, exact text, and no runtime errors.
- Full enforcing run with the data-management application: 67 fixtures, 77 renders, three viewports, median SSIM `0.9965`, minimum SSIM `0.9529`, `99.9%` of edges within 2px, maximum edge error `3.9921px`, exact text, and no runtime errors.
- Full enforcing run with all three representative applications: 68 fixtures, 80 renders, three viewports, median SSIM `0.9962`, minimum SSIM `0.9509`, `99.9%` of edges within 2px, maximum edge error `3.9921px`, exact text, and no runtime errors.
- All 81 unit tests, the Angular application build, and the library TypeScript build pass.
- Renderer repair commit: `3f526c1` (`fix: stabilize application paint and text baselines`).

All three representative applications are accepted. Final unchanged-tree stability runs are recorded after the application commit.
