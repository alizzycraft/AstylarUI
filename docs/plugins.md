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
  dependencies: ['astylar.core'],
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
- `dependencies` contains canonical plugin IDs. Missing, self-referential, and
  cyclic dependencies fail before activation.
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

`DOMElement.data` holds a custom element's payload. The element definition may
provide defaults and validates the effective default-plus-authored object.
`children` may be `any`, `none`, or a list of allowed canonical identities.

`StyleRule.extensions` holds canonical property IDs or aliases. Each extension
declaration cascades independently using the same selector specificity and
source-order rules as core styles; renderer context overrides and inline styles
retain their existing precedence. A property definition declares its initial
value, inheritance behavior, invalidation domains, and validator. Canonical IDs
take precedence over aliases if both are present in one effective style.

Unknown source data is not deleted or mutated. An unavailable custom element
fails validation rather than falling back to an unrelated core renderer. An
unavailable extension property is retained in the authored `SiteData`, reported
as unsupported, and ignored for rendering. Canonical missing identities allow
the diagnostic to identify the expected plugin/contribution. Plugin API v1 does
not render a missing-element placeholder because the current mount validation
boundary cannot guarantee one without destabilizing layout.

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
- the surface diagnostics reporter.

The snapshot is also available as `surface.diagnostics.plugins`.

Lifecycle services may implement `activate()`. Activation runs once per surface
in deterministic plugin dependency order. Use Angular `DestroyRef` for
subscriptions, observers, timers, and other non-Babylon cleanup. Destroying a
surface destroys its injector. Failed synchronous mount/activation also destroys
the partially initialized injector. `dispose()` remains idempotent.

## Rendering and resource ownership

An injectable renderer receives `AstylarPluginRenderContext`, containing only
the supported public facilities:

- current Babylon `Scene` and layout parent `Mesh`;
- stable `meshId` and resolved element data;
- resolved core style and plugin property values;
- pixel layout dimensions, padding, and pixel-to-world scale;
- a diagnostics reporter.

It does not expose Astylar's private renderer services. The renderer must return
a live Babylon `Mesh` created in the supplied scene. Astylar applies its common
identity, layout parent/position, paint, border, transform, hover, dimension, and
text bookkeeping to the returned primary mesh.

Meshes, materials, and textures created synchronously in the renderer participate
in the same scene transaction as core output. They are released on replacement,
rebuild, and final surface disposal. A renderer service persists for the life of
its surface and may retain Angular state across updates; the renderer method is
called again when the element is rebuilt. Use `DestroyRef` for resources that
are not Babylon scene resources.

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
is the maintained package-boundary example. It demonstrates configuration-token
injection, signals, `DestroyRef`, lifecycle activation, surface identity, element
and property validation/defaults, Babylon output, repeated updates, two-surface
isolation, SSR/prerender safety, resource plateaus, and zero-resource disposal.
`npm run consumer:check` packs Astylar and tests that application from a fresh
install without source or deep imports.
