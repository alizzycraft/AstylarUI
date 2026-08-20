# AstylarUI Architecture

Use this map to find the current implementation boundary. Confirm symbols in the
source before editing; this reference deliberately avoids line numbers.

## Contents

- Public surface and injector boundary
- Document and plugin preparation
- Render and reflow pipeline
- DOM-style renderer pipeline
- Runtime state and reconciliation
- Ownership invariants
- Navigation searches

## Public surface and injector boundary

The published root is `src/lib/index.ts`. Treat its exports as public only when
they are also present in the generated declaration package. The primary runtime
entry points are:

- `AstylarSurfaceComponent` in `src/lib/astylar-surface.component.ts`: SSR-safe
  Angular component ownership, signal input updates, browser-only mount,
  settlement output, zone transitions, and `DestroyRef` disposal.
- `Astylar` in `src/lib/astylar.ts`: root-injected public facade. `mount()` owns
  one canvas and creates a child `EnvironmentInjector`; `render()` is the legacy
  scene-returning facade. `prepareDocument()` runs plugin compatibility and pure
  migrations without rendering.
- `AstylarSurface` and `AstylarSurfaceHandle` in
  `src/lib/astylar-surface.ts`: explicit update, resize, settlement, diagnostics,
  and idempotent disposal contract.

Every mount builds a fresh child injector named `AstylarSurface`. The complete
core provider set is `ASTYLAR_SURFACE_SERVICE_PROVIDERS` in
`src/lib/astylar-surface-providers.ts`; plugin renderers, lifecycle classes, and
providers are added per surface. `AstylarCapabilityRegistry`,
`ASTYLAR_PLUGIN_SURFACE_CONTEXT`, and `AstylarPluginRuntime` are also surface
scoped. Do not move mutable renderer state to root providers.

`AstylarRenderer` is private inside `src/lib/astylar.ts`. It composes the legacy
renderer services with the newer session, plugin, interaction, semantic,
scrolling, reconciliation, resource, diagnostic, and recovery layers. The
repository-only `ASTYLAR_INTERNAL_INSPECTION` symbol supports the parity harness;
it is not a consuming-application API.

## Document and plugin preparation

`Astylar.mount()` constructs and activates a sealed surface registry before the
private renderer starts. Follow these boundaries:

1. `ASTYLAR_CORE_PLUGIN` in `src/lib/astylar-core-plugin.ts` registers built-in
   element identities through the same registry used by application plugins.
2. `AstylarCapabilityRegistry` in `src/lib/astylar-plugin.ts` validates plugin
   metadata, dependencies, contributions, compatibility, aliases, and conflicts.
3. `AstylarPluginRuntime` activates lifecycle contributions and resolves element
   renderers through the sealed registry.
4. `prepareAstylarDocument()` in `src/lib/astylar-document-preparation.ts`
   validates persisted requirements and applies pure plugin-owned migrations to
   detached data.
5. `AstylarDocumentRecovery` optionally replaces unavailable owned leaves with
   stable visible placeholders; strict recovery remains the default.
6. `AstylarDiagnostics` validates the public document shape and retains typed
   messages. Do not replace structured diagnostics with routine console output.

Rendering must not silently mutate authored `SiteData` or partially apply a
failed migration.

## Render and reflow pipeline

`AstylarRenderer.createScene()` in `src/lib/astylar.ts` is the composition root
for one WebGL surface:

1. Create `Engine`, `Scene`, camera, lighting, mesh service, and the render
   action/context adapter.
2. Initialize `BabylonDOMRendererService` with the actual canvas dimensions.
3. Create `AstylarSceneResources`, `AstylarVisualReconciler`,
   `AstylarVisualResourceReconciler`, `AstylarScrollRuntime`, and optional
   `AstylarSemanticBridge`.
4. Create `AstylarRenderSession`. All initial, update, resize, asset, plugin, and
   manual work converges on its coalesced invalidation/reflow callback.
5. Ask `AstylarVisualReconciler.plan()` whether the update can reuse the visual
   tree or requires a rebuild. Semantic-only updates reconcile without rebuilding
   meshes.
6. On rebuild, begin a plugin generation, capture control and scroll state,
   resize, retain image sources, stage visual-resource reconciliation, and call
   `BabylonDOMRendererService.createSiteFromData()` inside
   `AstylarSceneResources.replace()`.
7. Reconcile retained visual owners, scrolling, semantics, controls, focus, and
   modal state; await plugin generation settlement; commit ownership and the
   visual plan only after success.
8. Bind typed interaction and semantic adapters, resize observation, asset
   invalidation, render loop, and cleanup to the session/scene lifetime.

On failure, invalidate the current plugin generation. Do not commit staged
ownership or visual identity before all required async work settles.

## DOM-style renderer pipeline

`BabylonDOMRendererService.createSiteFromData()` in
`src/app/services/dom/renderer.service.ts` owns each full rebuild:

1. Clear prior text cache, input state, element registries, interactions, and
   ancestry for the replaced tree.
2. Parse active author styles with `StyleService`.
3. Create the viewport root with `RootService`.
4. Register the complete authored ancestry before intrinsic pre-layout so
   descendant and sibling selector resolution is stable during measurement.
5. Recursively process children through `ElementService` and
   `ElementCreationService`.

`ElementCreationService` resolves the contribution renderer, creates element
geometry/material/borders/text/controls, stores element dimensions and styles,
and dispatches child layout. Core elements still reach specialized core branches
through `AstylarCoreCompatibilityRenderer`; plugin elements use their public
renderer contribution.

The renderer keeps authored IDs as the shared identity for meshes, control
state, scrolling, events, semantics, and reconciliation. Generated positional
identity is fallback behavior, not a substitute for stable public IDs where
state continuity matters.

## Runtime state and reconciliation

- `AstylarRenderSession` serializes/coalesces invalidations, owns cleanup
  callbacks and settlement waiters, and rejects work after disposal.
- `AstylarVisualReconciler` compares stable projections and records whether the
  update reused, rebuilt, created, replaced, disposed, or reflowed nodes.
- `AstylarVisualResourceReconciler` stages compatible mesh/control owner reuse
  and commits ownership only after a successful render generation.
- `AstylarReconciliationIdentityIndex` defines authored-ID and positional
  fallback compatibility. Read `docs/reconciliation.md` before changing it.
- `AstylarSceneResources` snapshots, adopts, replaces, releases, and disposes
  Babylon meshes/materials/textures for one scene.
- `AstylarPluginHost` owns surface/generation/plugin resource owners, tracked
  async work, invalidation domains, recursion guards, and diagnostic attribution.
- `ImageResourceService` owns asynchronous image state per scene and triggers
  asset invalidation through the session.
- `AstylarScrollRuntime`, `AstylarInteractionRuntime`, and
  `AstylarSemanticBridge` reconcile their observable state around visual rebuilds.

## Ownership invariants

- One live canvas has at most one surface.
- One surface has one child injector and isolated mutable renderer graph.
- The surface/scene owns its engine, session, runtime adapters, renderer
  registries, and scene resources; disposal is idempotent and reaches zero.
- A render generation owns plugin resources and pending async work until commit,
  replacement, cancellation, or disposal.
- Late async completion cannot attach to a stale generation.
- Semantic DOM is an accessibility/input bridge for the canvas output, not the
  source of visual layout.
- `SiteData` remains serializable and replaceable; executable handlers stay in
  render options and resources stay outside authored data.
- Angular DI scopes construction and lifetime. It is not a permissions sandbox.

## Navigation searches

Start with targeted searches rather than reading the entire tree:

- Public entry: `rg "export .*Astylar|class Astylar|mount\(" src/lib`
- Surface scope: `rg "ASTYLAR_SURFACE_SERVICE_PROVIDERS|createEnvironmentInjector" src`
- Reflow: `rg "invalidate\(|whenSettled|performReflow|beginGeneration" src`
- DOM build: `rg "createSiteFromData|processChildren|createElement" src/app/services/dom`
- Identity: `rg "reconciliation|stable.*id|visual.*owner" src/lib src/parity`
- Cleanup: `rg "addCleanup|onDestroy|dispose\(|onDisposeObservable" src`
- Diagnostics: `rg "AstylarDiagnostic|diagnostics\.report|code:" src/lib`
- Public declarations: inspect `src/lib/index.ts`, run `npm run build:lib`, then
  inspect `dist/lib/lib/index.d.ts`.
