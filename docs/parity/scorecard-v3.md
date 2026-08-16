# Representative Application Parity v3

This phase validates that ordinary application-development patterns transfer from browser HTML/CSS to equivalent Astylar JSON DOM and `StyleRule` data at desktop (`800×600`), tablet (`640×720`), and mobile (`390×844`) viewports.

## Coverage matrix

| Coverage area | Project dashboard | Data management | Account settings |
| --- | --- | --- | --- |
| Block flow | All viewports: headings and metadata | Planned | Planned |
| Nested Flexbox | All viewports: shell, toolbars, lists | Planned | Planned |
| Multi-row/column Grid | Summary cards; tablet uses two rows | Planned | Planned |
| Fixed and fractional sizing | Sidebar, content, and summary tracks | Planned | Planned |
| Responsive media conditions | Desktop/tablet/mobile reflow | Planned | Planned |
| Tables | — | Planned | — |
| Forms and control states | Search, buttons, checked and disabled tasks | Planned | Planned |
| Text wrapping | Summary and activity copy | Planned | Planned |
| Ellipsis | Long task titles | Planned | Planned |
| Overflow and nested clipping | Shell, main, task and activity regions | Planned | Planned |
| Relative/absolute/fixed positioning | Absolute shell and fixed help action | Planned | Planned |
| Stacking contexts and overlays | Fixed help action | Planned | Planned |
| Semantic selectors/combinators | Descendant, child, compound active selectors | Planned | Planned |
| Local deterministic imagery | — | Planned | Planned |
| Three-viewport reflow | Horizontal shell → compact shell → stacked mobile | Planned | Planned |

## Application results

| Application | Desktop | Tablet | Mobile | Geometry/text/runtime | Decision |
| --- | --- | --- | --- | --- | --- |
| Project dashboard | SSIM `0.9768` | SSIM `0.9832` | SSIM `0.9622` | 100% of measured edges within 2px; max `0.4721px`; exact text; runtime clean | Accepted after general depth-precision and text-baseline repairs |
| Data management | Pending | Pending | Pending | Pending | Not started |
| Account settings | Pending | Pending | Pending | Pending | Not started |

## Renderer decisions

| Behavior exposed | Evidence | General repair | Regression coverage |
| --- | --- | --- | --- |
| Dense nested surfaces intermittently lost parent/card paint at tablet and mobile camera distances | Initial application screenshots exposed parent colors through correctly measured child boxes, with baseline SSIM as low as `0.6495` | Bound the Babylon camera clipping range to one viewport height around the UI plane, preserving authored stacking while improving depth-buffer precision | `BabylonCameraService` unit coverage for the UI clip envelope; all legacy stacking and composed fixtures remain green |
| Ordinary text and control labels painted above Chromium baselines | Cross-correlation across headings, task labels, metadata, buttons, and inputs showed consistent baseline offsets by typography size/weight | Apply browser-aligned leading to ordinary text planes and a 2px control-label inset, including clipped text inputs | `BabylonDOMRendererService` unit coverage for compact-bold, body, and display text; full parity suite minimum SSIM `0.9556` |

## Verification log

- Project dashboard focused run: desktop `0.9768`, tablet `0.9832`, mobile `0.9622`; exact visible text and line counts; no runtime errors.
- Full enforcing run after the renderer repairs: 66 fixtures, 74 renders, three viewports, median SSIM `0.9966`, minimum SSIM `0.9556`, `99.8%` of edges within 2px, maximum edge error `3.9921px`, exact text, and no runtime errors.
- All 78 unit tests, the Angular application build, and the library TypeScript build pass.
- Renderer repair commit: `3f526c1` (`fix: stabilize application paint and text baselines`).

Final phase metrics and the remaining application commits will be recorded as each coherent application increment is accepted.
