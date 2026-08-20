# Renderer Subsystems

Use this guide after locating the public reproduction. Select the subsystem that
owns the violated invariant and begin with its closest proof.

## Contents

- Authored document and diagnostics
- Cascade, defaults, and responsive styles
- Dimensions and layout
- Paint, text, assets, and clipping
- Positioning, stacking, and scrolling
- Controls, interaction, and semantics
- Reconciliation and resources
- Plugins

## Authored document and diagnostics

Public authored types live in `src/app/types`: `site-data.ts`, `dom-element.ts`,
`style-rule.ts`, and control/position/text types. `src/lib/index.ts` decides which
are package-root exports.

Use `AstylarDiagnostics` for document-shape and lifecycle errors. Plugin document
requirements, migrations, and recovery belong to
`astylar-document-preparation.ts` and `astylar-document-recovery.ts`, not the
visual renderer. Nearest proof includes `astylar-diagnostics.spec.ts`,
`astylar-document-preparation.spec.ts`, and
`astylar-document-recovery.spec.ts`.

Changing `DOMElement`, `StyleRule`, or core element names also affects the
capability catalog and application-skill freshness.

## Cascade, defaults, and responsive styles

`StyleDefaultsService` models global and element-type defaults. `StyleService`
owns selector matching, specificity/source order, inheritance, media bounds,
pseudo-state declarations, shorthand expansion, inline style precedence, and
plugin extension values. `DOMAncestryService` supplies relationships required by
descendant, child, sibling, and structural selectors. `ViewportService` supplies
media and viewport-unit dimensions.

Preserve the order: defaults, matching author rules by specificity/source order,
renderer context overrides, then authored inline declarations. An interactive
pseudo state overlays the resolved normal style without destroying it.

Start with `style.service.spec.ts`, `style-defaults.service.spec.ts`, selector,
cascade, responsive, and control-state parity fixtures. A new style field needs
typed declaration, validation/catalog evidence, parsing/use at its owning
subsystem, and a paired fixture or an explicit unsupported classification.

## Dimensions and layout

`ElementDimensionService` resolves border/content boxes, padding/margins,
min/max constraints, content-box behavior, percentage and font/viewport units,
intrinsic text/control/image sizes, and positioned containing-block references.
Its result is stored in `BabylonElementManagerService.elementDimensionsMap`.

Child-flow ownership is divided by formatting context:

- `ElementCreationService`: ordinary block/inline flow, recursive creation,
  auto-height adjustment, margin handling, and positioned-child deferral.
- `FlexService`: identifies flex contexts, measures intrinsic children, forms
  lines, sizes/positions items, resizes auto containers, and integrates nested
  grid/image/text content.
- `FlexLayoutService`: grow/shrink, gaps, align-content, align-self, and order.
- `GridService` plus `grid-track-sizing.ts`: explicit/implicit tracks, repeat,
  fractional/fixed/intrinsic/minmax sizing, placement, stretch, and nested
  intrinsic measurement.
- `TableService`: table/section/row/cell construction, shared row/column sizing,
  spanning, captions, content widths, and column definitions.
- `ImageLayoutService`: natural size and object-fit box behavior.
- `ListService`: list structure, markers, and child flow.

Test the calculation service directly when possible, then use a minimal parity
fixture for browser-observable geometry. Nested/auto/intrinsic behavior usually
requires a fixture because local dimensions can be correct while parent flow is
wrong. Search the matching `*.service.spec.ts` and fixture prefix (`flex-`,
`grid-`, `table-`, `auto-`, `intrinsic-`, or `responsive-`).

## Paint, text, assets, and clipping

`ElementMaterialService`, `ElementBorderService`, and `BabylonMeshService` own
geometry/material/border/background/gradient/shadow construction and pixel-to-
world placement. Stacking depth is separate from CSS box geometry.

Text flows through `TextStyleParserService`, `TextCanvasRendererService`,
`MultiLineTextRendererService`, and `TextRenderingService`. Canvas measurement,
line breaking, transforms, spacing, alignment, decoration, shadows, ellipsis,
texture caching, and world metrics must stay consistent. Test calculated text
metrics and real browser screenshots; NullEngine cannot prove font rasterization.

`ImageResourceService` loads/caches natural image data per scene and invalidates
the session; `ImageLayoutService` resolves intrinsic/object-fit boxes. Asset
failure must produce diagnostics and settle rather than hanging readiness.

`OverflowClipService` applies intersected clip planes to materials. Clipping
must be refreshed after scroll/reflow and cleaned on replacement. Start with the
corresponding service specs and typography, image, overflow, stacking, or
composed parity fixtures.

## Positioning, stacking, and scrolling

`PositioningIntegrationService` bridges element creation to
`PositioningService`, `PositionCalculator`, `ContainingBlockManager`, mode
services for relative/absolute/fixed positioning, and `ViewportService`.
`StackingContextManager` owns context creation, paint order, effective z-index,
and world-depth mapping.

`AstylarScrollRuntime` owns scroll-container state, wheel routing, nested
consumption, viewport clipping refresh, retained offsets, and fragment targets.
Fixed positioning should remain viewport-relative while nested scroll moves
ordinary content. Absolute descendants use their containing block and remain
out of normal flow.

Use positioning/stacking service specs and `fixed-`, `relative-`, `nested-`,
`z-index-`, `opacity-`, `overflow-`, and `interaction-*-autoscroll` fixtures.

## Controls, interaction, and semantics

`InputElementService` coordinates focused and retained control state through
`TextInputManager`, `ButtonManager`, `CheckboxManager`, `SelectManager`,
`FocusManager`, `KeyboardInputHandler`, `FormManager`, and
`FormValidatorService`. It captures/restores state across compatible rebuilds.

`AstylarEventDispatcher` provides typed DOM-like propagation/default
cancellation. `AstylarInteractionRuntime` owns pointer/keyboard dispatch, focus
order, activation defaults, labels, radio navigation, form defaults, anchors,
expanded selects, modal containment, and interaction reconciliation.

`AstylarSemanticBridge` creates the browser-accessible counterpart, reconciles
authored semantics, mirrors live control/focus/modal state, connects semantic
activation back to the runtime, and disposes nodes/listeners/observers.

Prove event order and default cancellation separately from final control state.
Accessibility claims require browser accessibility snapshots or semantic DOM
evidence. Use input manager specs, `astylar-event.spec.ts`,
`astylar-semantic-bridge.spec.ts`, and interaction/semantic parity fixtures.

## Reconciliation and resources

`AstylarVisualReconciler` decides semantic-only reuse versus visual rebuild.
`AstylarVisualResourceReconciler` retains compatible authored owners across a
successful rebuild. `AstylarReconciliationIdentityIndex` owns compatibility and
fallback identity. `AstylarRenderSession` owns scheduling, coalescing,
settlement, and cleanup. `AstylarSceneResources` owns Babylon resource plateaus.

Do not preserve a mesh when element/control kind is incompatible. Do not dispose
retained textures or transfer staged ownership before success. Prove repeated
updates plateau, compatible owners retain identity when required, replacements
dispose, state continuity follows documented identity, and final disposal
reaches zero.

Start with the `astylar-visual-*`, `astylar-reconciliation-*`,
`astylar-render-session`, and `astylar-scene-resources` specs plus reactive,
replacement, lifecycle-stress, and reconciliation parity fixtures.

## Plugins

`AstylarCapabilityRegistry` owns immutable definition validation, dependency
resolution, compatibility, namespace/alias conflicts, contribution lookup, and
sealing. `AstylarPluginRuntime` owns surface-scoped lifecycle activation and
renderer dispatch. `AstylarPluginHost` owns resource trees, tracked async work,
invalidation domains, recursion protection, settlement, cancellation, cleanup,
and attributed diagnostics.

Core elements use `ASTYLAR_CORE_PLUGIN`; application plugins cannot implicitly
replace core or other plugin renderers. Migrations must be pure, detached,
idempotent, limited to plugin-owned fragments, and all-or-nothing. A property
that changes geometry must invalidate layout as well as paint.

Read `docs/plugins.md` and the plugin/document/resource specs. Run the packed
consumer when changing any public plugin type, provider, lifecycle, migration,
recovery, resource, or invalidation behavior.
