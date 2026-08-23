# Angular-native plugins

Astylar plugin API v1 lets an Angular application add validated JSON element
types, style extension properties, per-surface lifecycle services, and Babylon.js
element renderers. Angular is a required foundation of the plugin ecosystem, not
an implementation detail hidden behind a second container.

The supported platform line is Angular 20, Astylar plugin API `1`, and
Babylon.js 8. Plugin API compatibility is checked independently from the npm
package version.

## Registration

Define immutable plugin metadata and install it in the application environment:

```ts
import { Injectable, InjectionToken, inject } from '@angular/core';
import { MeshBuilder, type Mesh } from '@babylonjs/core';
import {
  ASTYLAR_PLUGIN_API_VERSION,
  defineAstylarPlugin,
  provideAstylar,
  type AstylarPluginElementRenderer,
  type AstylarPluginRenderContext,
} from 'astylarui';

const BADGE_CONFIG = new InjectionToken<{ minimumDepth: number }>('BADGE_CONFIG');

@Injectable()
class BadgeRenderer implements AstylarPluginElementRenderer {
  private readonly config = inject(BADGE_CONFIG);

  render(context: AstylarPluginRenderContext): Mesh {
    const depth = Math.max(
      this.config.minimumDepth,
      context.properties['badgeDepth'] as number,
    );
    return MeshBuilder.CreateBox(context.meshId, {
      width: context.dimensions.width * context.dimensions.pixelToWorldScale,
      height: context.dimensions.height * context.dimensions.pixelToWorldScale,
      depth,
    }, context.scene);
  }
}

const badges = defineAstylarPlugin({
  id: 'example.badges',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  astylarVersionRange: '^0.1.0',
  documentSchemaVersion: 2,
  dependencies: [{ id: 'astylar.core', versionRange: '^1.0.0' }],
  contributes: ['elements', 'properties', 'renderers'],
  providers: [{ provide: BADGE_CONFIG, useValue: { minimumDepth: 0.05 } }],
  contributions: {
    elements: [{
      id: 'example.badges:badge',
      alias: 'badge',
      defaults: { data: { label: 'Badge' } },
      children: 'none',
      validate: (element) =>
        typeof (element['data'] as { label?: unknown } | undefined)?.label === 'string'
          ? true
          : 'Badge data.label must be a string.',
    }],
    properties: [{
      id: 'example.badges:depth',
      alias: 'badgeDepth',
      initial: 0.08,
      inherits: false,
      affects: ['layout', 'paint'],
      validate: (value) => typeof value === 'number' && value > 0
        ? true
        : 'badgeDepth must be a positive number.',
    }],
    renderers: [{
      id: 'example.badges:renderer',
      elements: ['example.badges:badge'],
      renderer: BadgeRenderer,
    }],
  },
});

export const appConfig = {
  providers: [provideAstylar({ plugins: [badges] })],
};
```

`provideAstylarPlugin(badges)` is the equivalent single-plugin helper and is
convenient for a plugin package to wrap in its own `provideExampleBadges(...)`
function.

Application registration stores frozen definitions and provider recipes. Before
mounting each surface, Astylar combines them with `astylar.core`, validates the
dependency graph and all contribution identities, and seals a deterministic
surface registry. Angular multi-provider order never selects a winner.

## Identity and conflicts

- Plugin IDs are lowercase namespaced identities such as `example.badges`.
- Contribution IDs use the plugin ID and a colon, such as
  `example.badges:badge`.
- Versions use semantic-version syntax. `pluginApiVersion` must equal the
  exported `ASTYLAR_PLUGIN_API_VERSION`.
- `astylarVersionRange` optionally constrains compatible Astylar package
  versions. `documentSchemaVersion` is a positive integer and defaults to `1`.
- `dependencies` accepts Phase 13 canonical ID strings (meaning any version) or
  `{ id, versionRange }` requirements. Missing, version-incompatible,
  self-referential, and cyclic dependencies fail before activation.
- `contributes` must exactly describe the non-empty contribution collections.
- Aliases are optional author-facing names. They must be globally unambiguous.
- Plugin API v1 does not support renderer replacement. A renderer may claim only
  elements contributed by its own plugin, and each contributed element must have
  exactly one renderer.
- `astylar.core` reserves the supported built-in element aliases. A plugin
  cannot replace `div`, `input`, or another built-in element through alias or
  provider ordering.

Configuration errors throw `AstylarDiagnosticError` with stable codes plus
`pluginId` and `contributionId` where available. The same diagnostic is retained
in the surface diagnostics callback/snapshot when a surface exists.

## Document data

The core document types remain strongly typed. Plugin-owned values use two
unknown-safe boundaries rather than weakening the model to `any`:

```ts
const siteData: SiteData = {
  plugins: [{
    id: 'example.badges',
    versionRange: '^1.0.0',
    schemaVersion: 2,
  }],
  root: {
    children: [{
      type: 'badge',
      id: 'release-badge',
      data: { label: 'Ready' },
    }],
  },
  styles: [{
    selector: '#release-badge',
    width: '160px',
    height: '40px',
    extensions: { badgeDepth: 0.12 },
  }],
};
```

`SiteData.plugins` is persisted authored metadata, not inferred from the npm
installation. A requirement records the canonical ID, accepted plugin version
range, plugin-owned schema version, and an optional `required: false` marker.
Required is the default. Plugin-free documents and Phase 13 string dependency
declarations remain valid.

`DOMElement.data` holds a custom element's payload. The element definition may
provide defaults and validates the effective default-plus-authored object.
`children` may be `any`, `none`, or a list of allowed canonical identities.

`StyleRule.extensions` holds canonical property IDs or aliases. Each extension
declaration cascades independently using the same selector specificity and
source-order rules as core styles; renderer context overrides and inline styles
retain their existing precedence. A property definition declares its initial
value, inheritance behavior, invalidation domains, and validator. Canonical IDs
take precedence over aliases if both are present in one effective style.

Unknown source data is not deleted or mutated. Strict recovery is the default:
an unavailable custom element or required persisted plugin fails with a typed
diagnostic rather than falling back to an unrelated core renderer. Unavailable
extension properties remain in authored `SiteData`, are reported, and are
ignored for rendering. Canonical identities let diagnostics identify the
expected plugin and contribution.

For an authoring or recovery host, pass `pluginRecovery: 'placeholder'` to
`mount()`. Missing plugins, incompatible document/plugin versions, old schemas
that require explicit preparation, future schemas, and removed contributions
then produce warning diagnostics and deterministic diagnostic meshes. A
placeholder:

- keeps the original namespaced type and plugin data in its element metadata;
- uses the normal cascade, box dimensions, positioning, borders, transforms,
  stacking, and resource transaction;
- uses authored background paint, or a dark diagnostic fallback when the
  resolved background is transparent;
- exposes `metadata.astylarMissingPlugin` with plugin/contribution identity,
  authored path, incompatibility reason, child count, and relevant versions;
- remains stable across repeated updates and is fully disposed with its surface.

An unresolved element is intentionally a render leaf. Its authored children
remain unchanged in the caller's document but are absent from the internal
render-only clone, because the missing parent may own their layout semantics.
The real renderer and normal children are used on a newly mounted compatible
configuration. Phase 14 does not dynamically install or hot-load plugins.

Diagnostics include the specific compatibility failure plus one
`plugin-capability-unavailable` summary per plugin. The summary records affected
element/style counts and sorted authored paths, the required schema, and the
installed version when available. Invalid persisted requirement syntax remains
an error in both policies; tolerant mode does not guess malformed metadata.

## Document migrations

Plugins can add explicit schema edges through the additive `migrations`
contribution. A migration may transform only its own canonical element
`type`/`data` fragment and namespaced `StyleRule.extensions` entries:

```ts
const v1ToV2 = {
  id: 'example.badges:v1-to-v2',
  fromSchemaVersion: 1,
  toSchemaVersion: 2,
  migrateElement: (element: AstylarPluginElementMigrationData) => ({
    ...element,
    data: { ...element.data, label: element.data?.['text'] },
  }),
  migrateStyle: (style: AstylarPluginStyleMigrationData) => ({
    selector: style.selector,
    extensions: {
      'example.badges:depth': style.extensions['example.badges:zDepth'],
    },
  }),
};
```

List the step under `contributions.migrations` and include `migrations` in
`contributes`. IDs and transitions are explicit. The sealed registry rejects
invalid or duplicate edges, cycles, and graphs with more than one path between
the same schema versions. Preparation reports a missing path rather than
guessing.

Call `Astylar.prepareDocument(siteData)` (or the lower-level exported
`prepareAstylarDocument(siteData, registry)`) before saving or mounting old
plugin data. The result is `ready`, `migrated`, or `blocked`, and includes the
document, compatibility facts, applied steps, and typed diagnostics. A
successful migration returns a detached clone and advances only the matching
persisted schema requirement. An already-current document returns its original
reference. Any failure returns the complete original document with no partial
steps committed; a second preparation of successful output is idempotent.

Migration callbacks are deliberately pure and non-injectable. Astylar supplies
deeply frozen fragment data and immutable identity/path context. There is no
Angular injection context, full-document access, network/resource facility, or
permission to alter another plugin's extension keys. Authored children and all
unrelated element/style fields are retained. Use canonical namespaced IDs in
persisted plugin data so ownership remains durable across alias changes.

## Angular scope and injection

Each `Astylar.mount()` creates a child `EnvironmentInjector`. Astylar installs
the plugin's providers, renderer types, and lifecycle types there before it
resolves any contribution implementation.

Valid Angular injection contexts are:

- plugin provider factories instantiated from the surface injector;
- constructors and field initializers of injectable plugin services;
- injectable renderer and lifecycle services.

Plugin definition factories and validation callbacks are ordinary data/code
callbacks and are not Angular injection contexts. Do not call `inject()` from
them.

Mutable plugin services must not use `providedIn: 'root'`. Put them in the
plugin's `providers` collection so each surface gets a distinct instance. Root
application services may still be injected intentionally through normal Angular
hierarchical lookup. Renderer and lifecycle contribution classes are
automatically made surface providers; list their plugin-owned dependencies and
configuration tokens in `providers`.

Plugins may inject `ASTYLAR_PLUGIN_SURFACE_CONTEXT`. It contains:

- a unique `surfaceId` symbol;
- the immutable sealed capability snapshot;
- the surface diagnostics reporter;
- a surface-lifetime resource owner;
- `createResourceOwner(...)` for named plugin/service ownership;
- `requestInvalidation(...)` for safe surface-scoped work requests.

The capability snapshot is also available as `surface.diagnostics.plugins`.
Resource counts are exposed separately as `surface.diagnostics.pluginResources`
with owner, resource, cleanup, and pending-work counts.

Lifecycle services may implement `activate()`. Activation runs once per surface
in deterministic plugin dependency order. Angular services continue to use
`DestroyRef` for service-state cleanup. A service that needs owned Babylon or
custom resources can create a named child owner and dispose it from `DestroyRef`;
surface destruction is the final idempotent fallback. Failed synchronous
mount/activation also destroys the partially initialized injector.

## Rendering and resource ownership

An injectable renderer receives `AstylarPluginRenderContext`, containing only
the supported public facilities:

- current Babylon `Scene` and layout parent `Mesh`;
- stable `meshId` and resolved element data;
- resolved core style and plugin property values;
- pixel layout dimensions, padding, and pixel-to-world scale;
- a generation-scoped resource owner and `AbortSignal`;
- an automatically attributed invalidation requester;
- a diagnostics reporter.

It does not expose Astylar's private renderer services. The renderer must return
a live Babylon `Mesh` created in the supplied scene. Astylar applies its common
identity, layout parent/position, paint, border, transform, hover, dimension, and
text bookkeeping to the returned primary mesh.

Meshes, materials, and textures created synchronously in the renderer participate
in the same scene transaction as core output. A renderer service persists for
the life of its surface and may retain Angular state across updates; the renderer
method is called again when the element is rebuilt.

`context.resources` owns work for that element's current render generation:

- `signal` is aborted and `active` becomes false when the generation is replaced;
- `own(resource, disposer?)` adopts a synchronously or asynchronously created
  resource. Objects with `dispose()` need no explicit disposer;
- `addCleanup(callback)` owns an observer removal, event-handler removal, timer,
  or other callback and returns an unregister function;
- `track(promise, options)` extends settlement through delayed readiness, adopts
  the resolved resource only while current, disposes stale late completion, and
  can run `onReady` plus one coalesced invalidation;
- `dispose()` is idempotent.

For example, a deterministic delayed dependency can be owned without making the
renderer itself asynchronous:

```ts
void context.resources.track(loadMaterial(context.resources.signal), {
  onReady: (material) => {
    mesh.material = material;
  },
  invalidate: { properties: ['badgeDepth'] },
});
```

Tracked failure reports `plugin-async-resource-failed` and releases the failed
owner. Replacing a pending generation aborts settlement immediately; if the
underlying operation ignores its signal and resolves later, its resource is
disposed without invoking `onReady`. Plugin roots remain generation replacement
units rather than being transplanted onto an older mesh, so delayed callbacks
never target a disposed replacement. Async Babylon resources are adopted into
the public scene-resource counts as well as the plugin owner counts.

`ASTYLAR_PLUGIN_SURFACE_CONTEXT.resources` lasts for the mounted surface.
`createResourceOwner({ pluginId, contributionId? })` creates an independently
disposable child suitable for a surface-scoped Angular service. Use explicit
disposers for objects without `dispose()`. The facility supports Babylon meshes,
materials, textures and render targets, custom disposables, cleanup callbacks,
observers, event handlers, and cancellable delayed work without exposing private
Astylar services.

## Plugin invalidation

Property `affects` declarations are operational. A renderer can use its bound
requester:

```ts
context.requestInvalidation({ properties: ['badgeDepth'] });
```

An injected service uses the surface context and states its identity:

```ts
surface.requestInvalidation({
  pluginId: 'example.badges',
  contributionId: 'example.badges:state',
  domains: ['semantics'],
});
```

Explicit `domains` and the `affects` domains of owned canonical property IDs or
aliases are combined. Requests are validated against the sealed registry and
coalesced into reasons such as `plugin:example.badges:layout,paint`. Phase 14
uses the existing complete, safe reflow for every plugin domain; the domain is a
real scheduling contract, not a claim of dirty-subtree optimization. Requests
are isolated to their surface and become harmless after disposal.

Synchronous invalidation from inside `render()` is diagnosed and ignored. A
tracked async `onReady` request is valid because renderer execution has ended.
Eight consecutive identical plugin-only reflows are stopped with
`plugin-invalidation-recursive`; an update, resize, asset event, or other host
reason resets the guard. Invalid requests and reflow failures report
`plugin-invalidation-invalid` and `plugin-invalidation-failed` with plugin and
contribution identities.

Renderer and lifecycle construction failures become
`plugin-initialization-failed`; renderer exceptions or invalid returned meshes
become `plugin-render-failed`. Astylar retains the responsible identities and the
original error as the cause.

## SSR and trust boundary

Registration must be SSR-safe. Module evaluation, plugin definition creation,
and provider declaration must not access `window`, `document`, canvas, WebGL, a
Babylon scene, or browser-only storage. Put rendering work in the injectable
renderer's `render()` method. The Angular surface component does not mount a
Babylon surface during server rendering.

Phase 13 plugins are trusted in-process Angular code. DI is a lifetime and
ownership boundary, not a security sandbox. A plugin can execute arbitrary
JavaScript and access anything its imports or the host environment permit.
Permissions, workers/WASM isolation, restricted plugins, discovery, hot loading,
and marketplaces are not part of plugin API v1.

## Complete proof

[`examples/angular-consumer/src/app/consumer-badge.plugin.ts`](../examples/angular-consumer/src/app/consumer-badge.plugin.ts)
is the maintained package-boundary example. In addition to configuration-token
injection, signals, `DestroyRef`, lifecycle activation, and surface identity, it
proves persisted schema v2 metadata, a pure v1-to-v2 migration, namespaced
elements/properties, a delayed owned Babylon material, stale-generation
cancellation, property-derived invalidation, repeated updates, and distinct
two-surface state.

Its real-Chrome acceptance also mounts an incompatible-version placeholder,
checks aggregate diagnostics, verifies scene and plugin-owner plateaus, disposes
one surface independently, remounts it, and reaches final zero counts. SSR and
prerender remain safe because registration and module evaluation are browser
independent. `npm run consumer:check` packs Astylar and tests that application
from a fresh install without source or deep imports.
