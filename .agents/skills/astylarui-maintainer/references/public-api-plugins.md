# Public API, packaging, and plugins

Use this reference for any change that can affect an installed consumer or the
Angular-native plugin contract. Read the current implementation and
[`docs/plugins.md`](../../../..//docs/plugins.md) before changing behavior.

## Contents

- [Package boundary](#package-boundary)
- [Compatibility decisions](#compatibility-decisions)
- [Packed-consumer proof](#packed-consumer-proof)
- [Plugin registry and Angular scope](#plugin-registry-and-angular-scope)
- [Documents, recovery, and migration](#documents-recovery-and-migration)
- [Rendering, invalidation, and trust](#rendering-invalidation-and-trust)

## Package boundary

[`src/lib/index.ts`](../../../..//src/lib/index.ts) is the sole supported import
root. `package.json` exports only `.` and points JavaScript and declarations at
`dist/lib/lib/index.*`. The Angular compiler builds the public root plus the
private services and types selected by [`tsconfig.lib.json`](../../../..//tsconfig.lib.json),
but compilation into the package is not a promise that a private path is public.

Application reproductions and examples must import from `astylarui`, never from
the repository `src` tree, generated `dist` paths, parity code, or a package
subpath. Add a root export only for a consumer-supported capability. Keep
private implementation types private when a narrower public data contract will
work.

## Compatibility decisions

Before changing a public symbol, document shape, diagnostic, plugin definition,
or runtime behavior, classify the change:

- additive and backward compatible;
- a corrected implementation of an already documented contract;
- a deliberate breaking change that needs migration and versioning;
- a deprecation with a supported transition period; or
- private-only and not observable to installed consumers.

Check source compatibility, persisted `SiteData` compatibility, plugin API
compatibility, runtime behavior, SSR behavior, and emitted package contents
separately. The npm package version, `ASTYLAR_PLUGIN_API_VERSION`, document
schema versions, plugin versions, and `astylarVersionRange` express different
compatibility dimensions. Do not advance or reinterpret one as a substitute for
another.

For an observable additive change, update public types/exports, API docs,
capability evidence, translation examples, the developer skill, and the packed
consumer wherever those surfaces are affected. For removal or replacement,
provide an explicit migration path and tests rather than silently accepting old
input with different meaning.

## Packed-consumer proof

Run `npm run consumer:check` for public API, package, Angular integration,
plugin, SSR, or lifecycle work. [`scripts/consumer-check.mjs`](../../../..//scripts/consumer-check.mjs)
builds the library, packs it, rejects repository leaks and local dependencies,
installs it into a copied Angular consumer, verifies peer dependencies and
root-only imports, then builds browser and server output and runs the consumer
tests. This is stronger than compiling a repository source import.

Extend [`examples/angular-consumer`](../../../..//examples/angular-consumer)
when a public contract needs an installed-package proof. Keep the example
realistic and SSR-safe. Assert behavior and lifetime outcomes, not merely that a
symbol is importable. Do not weaken its boundary checks to accommodate a deep
import or an undeclared dependency.

## Plugin registry and Angular scope

Plugin API v2 is Angular-native. `provideAstylar(...)` and
`provideAstylarPlugin(...)` register frozen definitions and provider recipes.
Each `Astylar.mount()` builds a child `EnvironmentInjector`, combines configured
plugins with `astylar.core`, validates dependencies and identities, and seals a
deterministic surface registry. Provider order is not a conflict-resolution
mechanism.

Preserve these registry invariants:

- canonical lowercase plugin IDs and namespaced contribution IDs;
- semver-valid versions, compatible dependencies, and an acyclic graph;
- exact `contributes` declarations and globally unambiguous aliases;
- one renderer for every custom element, owned by the same plugin;
- no replacement of built-in aliases or another plugin's contribution; and
- stable typed diagnostics retaining plugin and contribution identity.

Mutable plugin services belong to the surface injector, not `providedIn:
'root'`. Renderer and lifecycle classes are surface providers. Provider
factories, injectable construction, and field initializers are valid injection
contexts; definition and validation callbacks are not. Root application
services may still be resolved intentionally through Angular's hierarchy.

## Documents, recovery, and migration

`SiteData.plugins` is authored compatibility metadata, not evidence that an npm
package happens to be installed. `DOMElement.data` and
`StyleRule.extensions` are unknown-safe plugin boundaries; do not weaken core
types to `any`. Preserve unavailable or invalid authored data for diagnostics
and recovery rather than mutating the caller's document.

Strict recovery fails on required unavailable capabilities. Placeholder
recovery is an authoring/recovery mode: it creates deterministic diagnostic
meshes while keeping the original namespaced data, normal box behavior, and
typed aggregate diagnostics. It does not dynamically install a plugin, and an
unresolved custom element remains a render leaf because its missing parent may
own child layout semantics.

Plugin migrations are explicit, pure schema edges. They can transform only the
owning plugin's element fragment and namespaced extensions. They receive frozen
data without Angular injection, network access, or full-document authority.
Preparation is atomic: a failure returns the original complete document, a
success returns a detached migrated document, and current input remains
idempotent. Never invent a migration path or partially commit successful edges.

## Rendering, invalidation, and trust

A plugin renderer receives only the public scene, layout, style, diagnostics,
resource-owner, abort-signal, and invalidation facilities. It returns a live
Babylon `Mesh` in the supplied scene; Astylar owns common placement, paint,
border, transform, interaction, dimension, and text bookkeeping.

Property `affects` domains are scheduling contracts. Validate and coalesce
plugin requests, retain their identities in diagnostics, and keep them isolated
to the surface. Today every valid plugin domain uses a complete safe reflow; do
not describe it as dirty-subtree rendering. Reject synchronous invalidation
from inside `render()` and preserve the recursive invalidation guard.

Plugin API v2 is trusted in-process JavaScript. Angular DI provides scoping and
lifetime ownership, not permissions or a security sandbox. Dynamic discovery,
installation, hot loading, workers/WASM isolation, and marketplaces are outside
the current contract. Do not imply those properties in documentation or tests.
