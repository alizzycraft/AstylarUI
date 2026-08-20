# Application-Level Plugin Workflow

## Contents

- [Decide whether to use a plugin](#decide-whether-to-use-a-plugin)
- [Define the public contract](#define-the-public-contract)
- [Register through Angular](#register-through-angular)
- [Author persisted data](#author-persisted-data)
- [Validate contributions](#validate-contributions)
- [Render and own resources](#render-and-own-resources)
- [Handle asynchronous work](#handle-asynchronous-work)
- [Request invalidation](#request-invalidation)
- [Version and migrate documents](#version-and-migrate-documents)
- [Recover unavailable plugins](#recover-unavailable-plugins)
- [Preserve SSR and isolation](#preserve-ssr-and-isolation)
- [Verify the plugin](#verify-the-plugin)
- [Keep the maintainer boundary](#keep-the-maintainer-boundary)

Read `plugins.md` for the exhaustive public contract and
`consumer-badge.plugin.ts` for the maintained package-boundary implementation.
Use this file as the application-authoring sequence.

## Decide whether to use a plugin

Use supported core structure and styles when they can express the requirement.
Use Angular composition outside the canvas when the content belongs to the host
page. Use an Astylar plugin when the application genuinely needs a namespaced
in-scene element, style property, renderer, surface service, schema migration,
or owned Babylon behavior.

Do not create a plugin merely to emulate unsupported CSS syntax, replace a core
renderer, or bypass the public document model. Do not change core registries from
an application task.

## Define the public contract

Choose stable globally namespaced identities:

- plugin: `organization.capability`;
- element: `organization.capability:element`;
- property: `organization.capability:property`;
- renderer/lifecycle/migration: distinct canonical contribution IDs.

Aliases are authoring conveniences, not precedence. They must be globally
unambiguous. Prefer canonical IDs in persisted documents and migration logic.

Declare:

- plugin semantic version;
- `ASTYLAR_PLUGIN_API_VERSION`;
- compatible `astylarVersionRange`;
- positive `documentSchemaVersion` when persisted plugin-owned data exists;
- version-constrained dependencies;
- exact contribution kinds and definitions;
- only the providers needed per mounted surface.

## Register through Angular

Expose an idiomatic provider helper that freezes application configuration and
returns `provideAstylarPlugin(defineAstylarPlugin(...))`. Register the helper in
application providers before Astylar is first injected or mounted.

Renderer and lifecycle classes are injectable types instantiated inside each
surface-owned child injector. Keep mutable state in surface-scoped injectable
services, not module globals or root singletons. Configuration tokens may hold
immutable application-level values.

## Author persisted data

Record the plugin requirement explicitly in `SiteData.plugins`:

```ts
const data: SiteData = {
  plugins: [{
    id: 'example.badges',
    versionRange: '^1.0.0',
    schemaVersion: 2,
  }],
  root: {
    children: [{
      type: 'example.badges:badge',
      id: 'status-badge',
      data: { label: 'Ready', revision: 3 },
    }],
  },
  styles: [{
    selector: '#status-badge',
    width: '160px',
    height: '40px',
    extensions: { 'example.badges:depth': 0.08 },
  }],
};
```

The npm installation does not imply this persisted requirement. Keep core data
in typed core fields; put only plugin-owned serializable values in `data` and
`extensions`.

## Validate contributions

- Define each custom element's allowed children, defaults, and data validator.
- Define each property's initial value, inheritance, invalidation domains, and
  deterministic value validator.
- Select every domain the observable output can change. A value that changes
  mesh dimensions, placement, or geometry includes `layout` (and normally
  `paint`); a material/color-only value uses `paint`; accessible names/state use
  `semantics`; hit/focus behavior uses `interaction`.
- Return `true` for success or useful user-facing messages for rejection.
- Never rely on coercion by a private renderer service.
- Treat validation inputs and context as readonly.

The registry rejects conflicting identities, ambiguous aliases, invalid graph
dependencies, incompatible API/version declarations, invalid values, implicit
overrides, and changes after sealing.

## Render and own resources

An injectable renderer receives `AstylarPluginRenderContext` and returns one
Babylon `Mesh`. Use only its curated fields:

- `scene`, `parent`, and `meshId`;
- readonly `element`, resolved `style`, and plugin `properties`;
- measured pixel dimensions and `pixelToWorldScale`;
- generation `resources`;
- attributed `requestInvalidation()` and `report()`.

Size custom geometry using `dimensions.width`, `dimensions.height`, and
`pixelToWorldScale`. Preserve the supplied `meshId`, scene, and parent
relationship. Do not retain core element meshes or access private services.

Use `context.resources.own(resource)` for a synchronously created disposable
Babylon or custom resource that is not already returned as the root mesh. Use
`addCleanup()` for observers, listeners, callbacks, and other teardown actions.
The generation owner aborts and disposes when its render is replaced.

For complete-surface service resources, inject
`ASTYLAR_PLUGIN_SURFACE_CONTEXT`, call `createResourceOwner()` with the plugin
and contribution identity, and dispose that owner from the service's
`DestroyRef` cleanup.

## Handle asynchronous work

Use `context.resources.track(promise, options)` so readiness participates in
`surface.whenSettled()`. Observe `context.resources.signal` and cancel timers,
requests, decoders, or loaders promptly.

Supply a disposal callback when the resolved object lacks an idempotent
`dispose()`. Apply the result in `onReady`; it runs only while the owner is
current. A late stale result is disposed instead of attached to a newer
generation. Report or propagate real failures rather than leaving pending work.

## Request invalidation

Declare accurate `affects` domains (`layout`, `paint`, `semantics`, or
`interaction`) on each plugin property. A renderer may request invalidation by
property or explicit domain after state or async readiness changes.

Do not request invalidation synchronously from `render()`. Avoid unbounded
request loops: make each request correspond to a distinct application/plugin
revision or readiness transition. Requests are coalesced and surface-scoped;
they are harmless after disposal.

## Version and migrate documents

Increase `documentSchemaVersion` only when persisted plugin-owned element data
or style extensions change. Add explicit directed migration edges.

Migration callbacks:

- run without Angular injection;
- receive frozen plugin-owned fragments and immutable path/version context;
- return detached plugin-owned replacements;
- remain deterministic and pure;
- preserve every unchanged plugin-owned field/extension, removing only keys the
  migration explicitly replaces;
- preserve unrelated document data;
- are idempotent once the document is current.

Use `Astylar.prepareDocument(siteData)` or the public preparation function
explicitly before rendering old data. Inspect status, diagnostics, applied
steps, original document, and upgraded copy. Never mutate caller-owned data or
silently migrate during rendering. A failed migration must commit no partial
document.

## Recover unavailable plugins

Strict recovery is the default and appropriate when all required capabilities
must exist. An authoring/recovery host may mount with
`pluginRecovery: 'placeholder'` to preserve source data, aggregate typed paths,
and render deterministic unresolved leaves for missing, incompatible, old, or
future schema capabilities.

Do not render an unresolved element's children independently; their layout may
belong to the unavailable plugin parent. Do not delete or rewrite source data.
A fresh compatible surface should receive the original/prepared document and
use the real renderer.

## Preserve SSR and isolation

Module evaluation, definition construction, migrations, provider declarations,
and validation must not access browser globals, canvas, WebGL, scenes, or
storage. Create Babylon resources only inside renderer execution.

Test at least two simultaneous surfaces when the plugin has mutable services.
Their instances, signals, resources, invalidations, diagnostics, and disposal
must remain independent.

Plugins are trusted in-process Angular code. DI is an ownership boundary, not a
permissions boundary. Do not claim sandboxing, dynamic installation, hot
loading, or restricted execution.

## Verify the plugin

Use focused unit tests for definitions, validation, migrations, and failure
paths. For a substantial reusable plugin, verify a freshly packed AstylarUI
consumer using root imports only:

- browser and SSR builds plus prerender;
- real-browser render and interaction;
- compatible preparation and idempotence;
- strict failure and tolerant placeholder recovery;
- delayed work readiness and stale cancellation;
- property-derived invalidation without recursion;
- repeated-update resource plateaus;
- two-surface isolation and independent disposal;
- final zero scene and plugin-owned resources.

## Keep the maintainer boundary

If the public plugin API cannot express a legitimate contribution, document the
smallest missing public capability and a public reproduction. Hand it to Phase
16. Do not import internal registry/renderer services, patch core dispatch,
claim an undocumented override, or add a private escape hatch from this skill.
