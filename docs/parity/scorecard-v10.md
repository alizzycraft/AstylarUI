# Semantic Application Behavior and Accessibility Parity — Phase 10

Phase 10 adds a browser-integrated semantic counterpart to Astylar's Babylon-rendered interface. Babylon remains the only visual renderer. The semantic bridge derives native, visually clipped elements from the same serializable `SiteData`, maintains them with the scene lifecycle, and routes future semantic input into the existing typed interaction system rather than creating a second application implementation.

## Acceptance gates

- Chromium accessibility snapshots for every requested authored ID match the equivalent HTML reference exactly.
- Authored hierarchy, roles, accessible names/descriptions, values, states, focus, activation, navigation, dialog modality, table relationships, and status updates are compared only where the harness observes them.
- Stable, unique authored IDs retain semantic-node identity across compatible updates; removal, incompatible replacement, and disposal release owned nodes and registrations.
- Babylon implementation meshes are not exposed as semantic nodes, and the semantic tree is not a visual renderer.
- Existing screenshot, geometry, text, interaction, lifecycle, build, and full-corpus thresholds do not regress.

## Increment scorecard

| Increment | Browser expectation | Unsupported baseline | General solution | Focused result | Full result | Status |
|---|---|---|---|---|---|---|
| Native semantic structure and accessibility harness | Authored header/footer/navigation/main landmarks, heading levels, paragraphs, lists, links, buttons, captions, table row groups, column/row headers, and cells appear in the browser accessibility tree with the same hierarchy and names as equivalent HTML. Renderer implementation details remain absent. | The HTML reference exposed all 11 requested authored snapshots. Astylar exposed only its labelled canvas and had no authored semantic nodes, roles, hierarchy, heading levels, list structure, link, button, or table relationships. Existing parity reports could not observe the browser accessibility tree. | Added a scene-owned, nonvisual `AstylarSemanticBridge`, enabled by default with an explicit opt-out and optional host. It creates native semantic elements from `SiteData`, prefixes native IDs to avoid document collisions, preserves unique stable-ID nodes across compatible updates, removes stale nodes, hides the visual canvas from accessibility, restores its prior state on disposal, and reports semantic ownership. Playwright's browser-backed `ariaSnapshot()` now compares requested authored IDs exactly; mismatches are ordinary runtime failures. | The focused structural fixture has SSIM `0.9947`, every measured edge within `2px`, maximum error `0.0004px`, exact visible text, and exact accessibility snapshots for all 11 requested IDs. Chromium reports matching banner/navigation/main/contentinfo landmarks, heading levels, list/listitem hierarchy, fragment link, button, captioned table, row groups, column headers, row header, and cell. Three focused bridge lifecycle tests pass. | 145 fixtures / 414 renders / three viewports; median SSIM `0.9920`; minimum `0.9503`; every measured edge within `2px`; maximum error `3.9921px`; exact visible text and requested semantic snapshots; clean runtime/lifecycle reports; every completion threshold passes. All 195 tests and both builds pass; only the two accepted application size-budget warnings remain. | Accepted |

## Supported public Phase 10 boundary so far

- Browser semantics are enabled by default for `Astylar.render()`. Consumers may pass `accessibility: false` or provide `accessibility: { host }` when the semantic root must live in a specific DOM container.
- The Babylon canvas is marked `aria-hidden="true"` while its semantic bridge is active, preventing its implementation surface from duplicating authored content. Its previous `aria-hidden` value is restored during disposal.
- The bridge creates a visually clipped native subtree and mirrors the authored `SiteData` hierarchy for supported native element types. It does not reproduce visual layout or paint.
- Native semantic IDs are instance-prefixed to avoid collisions between a page, multiple scenes, and surrounding application DOM. The original ID is retained as `data-astylar-id` for deterministic inspection.
- A unique authored ID is the compatibility key for native semantic-node identity. Unkeyed or duplicate-ID elements use deterministic structural paths; removed and hidden elements are removed from the semantic subtree.
- The initial supported structure includes headings; header, footer, navigation, main, section, article, and complementary landmarks; paragraphs; lists; anchors; buttons; forms and labels; and native table structure. Control values/states and explicit ARIA naming are not yet claimed by this increment.
- The parity harness requests browser accessibility snapshots only for explicit `semanticIds`. It compares the browser-produced role/name hierarchy exactly and does not infer or claim unobservable screen-reader speech.
- Semantic node, event-registration, and observer-registration ownership are present in runtime diagnostics and semantic nodes reach zero after scene disposal.

## Intentional exclusions at this point

Phase 10 is still in progress. Accessible control names/descriptions and live values/states, semantic/scene focus and activation synchronization, anchors/navigation outcomes, modal top-layer behavior, status and validation announcements, representative application workflows, and repeated semantic lifecycle stress remain to be implemented and verified. The final Phase 10 exclusions remain exact speech across browser/screen-reader combinations, complex ARIA widgets, `contenteditable`, multi-select, drag-and-drop, IME composition, full mobile virtual-keyboard behavior, exhaustive native validation wording, a complete application router, and advanced CSS animations/transitions.
