# Angular lifecycle and resource ownership

Use this reference for mounting, updates, asynchronous work, diagnostics,
cleanup, SSR, and Babylon ownership. A passing render is incomplete evidence if
resources grow across updates or work survives disposal.

## Contents

- [Angular and browser boundary](#angular-and-browser-boundary)
- [Surface lifetime](#surface-lifetime)
- [Render sessions and settlement](#render-sessions-and-settlement)
- [Resource ownership](#resource-ownership)
- [Diagnostics and lifetime tests](#diagnostics-and-lifetime-tests)

## Angular and browser boundary

Angular is the framework foundation. Keep dependency injection explicit and
use `inject()` only in an injection context. Per-surface mutable state belongs
in the child `EnvironmentInjector`; moving it to root providers couples surfaces
and changes destruction order.

[`src/lib/astylar-surface.component.ts`](../../../..//src/lib/astylar-surface.component.ts)
is the component integration boundary. Browser-only canvas, engine, scene,
observers, and animation-loop work must start only after browser detection and
the render host is ready. Keep module evaluation, provider declarations, and
server rendering free from `window`, `document`, canvas, WebGL, Babylon scenes,
and browser storage. Use Angular lifecycle facilities such as `afterNextRender`,
`isPlatformBrowser`, `NgZone`, and `DestroyRef` at their intended boundaries.

## Surface lifetime

One mount creates one `AstylarSurface`, one live scene/canvas relationship, and
one child injector containing the core and configured plugin services.
[`src/lib/astylar.ts`](../../../..//src/lib/astylar.ts) owns construction and
[`src/lib/astylar-surface-providers.ts`](../../../..//src/lib/astylar-surface-providers.ts)
defines the surface-scoped provider graph. Failed partial construction must
destroy what was already created. `dispose()` is idempotent and must stop the
render loop, cancel work, remove registrations, dispose scene resources, and
destroy the child injector without affecting another surface.

Treat `Astylar.render()` as a compatibility convenience and `mount()` as the
explicit ownership API. Tests involving multiple canvases, plugins, or cleanup
should retain surface handles and dispose them deliberately.

## Render sessions and settlement

[`src/lib/astylar-render-session.ts`](../../../..//src/lib/astylar-render-session.ts)
coalesces invalidations and exposes settlement. An accepted update resolves only
after the current generation's required rendering and tracked asynchronous work
has settled. A newer generation cancels or supersedes stale work; a resize,
asset, plugin, manual, or data invalidation remains attributed in diagnostics.

Preserve these properties when changing scheduling:

- repeated compatible invalidations coalesce without losing a required pass;
- a promise never waits forever for work whose owner has been disposed;
- stale late completion cannot mutate a replacement generation;
- failures surface as typed diagnostics and release pending ownership; and
- work requested during rendering cannot recurse without the documented guard.

## Resource ownership

[`src/lib/astylar-scene-resources.ts`](../../../..//src/lib/astylar-scene-resources.ts)
and the renderer's resource transaction stage own core Babylon output. Every
mesh, material, texture, render target, observer, DOM listener, timer, cleanup
callback, and asynchronous resource must have a generation or surface owner.
Adopt resources when created, release replacements, and dispose abandoned
staged output on failure.

Plugin render contexts provide generation-scoped `resources` and an
`AbortSignal`. `track()` extends settlement, adopts current results, disposes
stale late results, and may request one coalesced invalidation after readiness.
The injected plugin surface context owns longer-lived services and can create
named child owners. A `DestroyRef` cleanup should dispose such a child; surface
destruction remains the idempotent fallback.

Image loading, text textures, semantic owners, interactions, scroll and modal
registrations, and visual reconciliation all participate in this ownership
model even when their implementations live in different services. Preserving a
primary mesh identity does not permit leaking the discarded candidate's child
resources or callbacks.

## Diagnostics and lifetime tests

Use surface snapshots to observe sessions, scene resources, plugin resources,
registrations, reconciliation, and retained diagnostics. A robust lifecycle
proof includes initial mount, multiple updates, replacement while async work is
pending, late completion, resize or invalidation, independent disposal in a
two-surface case, remount, and final disposal.

Assert a stable resource plateau after repeated equivalent operations and zero
owned resources/registrations after final disposal. Also assert that one
surface's update or destruction leaves the other surface live. For public or
plugin changes, keep the package-boundary Chrome test and SSR build in
`npm run consumer:check`; NullEngine unit tests cannot prove WebGL, DOM, or SSR
behavior by themselves.
