# Phase 12 Consumer-Ready Application Integration

Phase 12 turns the renderer proven through Phase 11 into a package that a normal
Angular application can install and operate without reaching into AstylarUI's
source tree. Work is delivered as bounded, independently tested commits. This
scorecard is the active completion contract and evidence log for the phase.

## Completion contract

- A committed `examples/angular-consumer/` application installs AstylarUI only
  through its public package entry point. It has no source aliases, workspace
  links, or imports from `src/`, internal renderer modules, or parity tooling.
- The consumer demonstrates responsive desktop, tablet, and mobile layouts;
  navigation; forms and validation; a data table with a nested control; scroll;
  modal or overlay behavior; images; dynamic updates; and pointer and keyboard
  interaction without advanced CSS animation requirements.
- The public API has a coherent lifecycle for mount, initial settlement, update,
  explicit resize, events and navigation, diagnostics, and idempotent disposal.
- Angular integration creates the browser-only renderer after its canvas exists,
  remains safe during SSR and prerender, runs renderer work outside Angular's
  zone, responds to element size changes, and releases observers and Babylon
  resources on destruction.
- Two simultaneous rendering surfaces have independent scenes, resources,
  registries, focus, input, scrolling, semantics, modal and popup state,
  reconciliation, resize handling, and disposal. Updating or disposing one
  surface cannot mutate the other.
- Deterministic typed diagnostics cover malformed roots, duplicate authored IDs,
  invalid element types, unsupported style declarations, asset failures,
  operations on disposed surfaces, and mount/dispose misuse. Default logging is
  production-aware and routine renderer operation does not flood the console.
- `npm run consumer:check` builds the library, packs it, validates the tarball,
  copies the consumer outside the repository, installs only the tarball and
  declared dependencies, builds and tests it, and always removes temporary files.
- Browser-backed consumer acceptance covers representative rendering and
  interaction, two-surface independence, lifecycle resource plateaus and final
  cleanup, responsive resize, and SSR/prerender safety.
- Phase 11 parity thresholds, fixtures, expected output, and assertions are not
  weakened. The final commit passes unit tests, both builds, the consumer check,
  SSR/prerender acceptance, the full parity gate, and three consecutive unchanged
  commit parity runs with a clean working tree.

## Starting baseline

Recorded on 2026-08-19 at commit `94d95d6` on branch `more-html`.

- Phase 11 acceptance was completed on the same unchanged commit in three
  consecutive full runs: 155 fixtures, 522 renders, median SSIM `0.99000796`,
  minimum SSIM `0.95018158`, edge-tolerance ratio `0.99981681`, maximum edge
  error `3.99209364 px`, exact text, no runtime errors, and all completion
  thresholds satisfied.
- `npm test -- --watch=false`: one first run reported two transient failures;
  two immediate unchanged reruns passed all 221 tests. Phase 12 must identify or
  remove this flake before final acceptance.
- `npm run build:lib`: passed.
- `npm run build`: passed and prerendered two routes with only the established
  initial-bundle and application-stylesheet budget warnings.
- `npm pack --dry-run --json`: produced a 367-file package, 472,418 bytes packed
  and 2,747,412 bytes unpacked. It currently exposes compiled `dist/lib/app/**`
  internals and publishes the demo-oriented `SiteComponent`; no external install
  check exists.
- `Astylar` already owns per-scene sessions and observes canvas size, but it also
  retains an implicit active session and uses root-scoped mutable services whose
  cleanup is global. That is not a safe two-surface public lifecycle boundary.
- `SiteComponent` is tied to the repository demo/router and is not an appropriate
  consumer-facing integration component.

## Planned increments

1. Package boundary and external consumer scaffold.
2. Public lifecycle handle and SSR-safe Angular surface integration.
3. Complete per-surface dependency isolation and two-surface regressions.
4. Typed validation diagnostics and production-aware logging.
5. Browser-backed consumer acceptance, repeated lifecycle audit, and packaging
   cleanup.
6. Final documentation, complete verification matrix, parity freeze, and three
   unchanged-commit acceptance runs.

Each increment begins with a failing check, fixes the general library behavior,
runs focused verification, updates this scorecard, reviews the diff, and commits
one coherent change. Fixture-specific rendering branches, reduced thresholds,
and weakened assertions are prohibited.

## Out of scope

- An arbitrary HTML or CSS parser.
- Broad new CSS features, advanced animations, XR, physics, or post-processing.
- Dirty-subtree performance work or a redesign of the repository demo.
- Publishing the package to npm.

## Increment 1: package boundary and consumer scaffold

Status: complete.

- Added a committed standalone Angular 20 consumer with SSR/prerender support at
  `examples/angular-consumer/`. Its source imports AstylarUI only from
  `astylarui` and includes responsive navigation, a form, summary grid, scrolling
  table with nested controls, a local image, updates, and modal state without
  advanced animation.
- Added a cross-platform library build and `npm run consumer:check`. The checker
  rejects source/internal/deep imports, builds and packs the library, verifies the
  root-only export map and required tarball entries, rejects repository-source
  leakage, copies the example to an OS temporary directory, installs the tarball,
  builds browser and server outputs, prerenders the route, runs the consumer unit
  test, and removes the temporary directory in a `finally` path.
- The first external check exposed two real distribution failures: CommonJS
  output broke Angular SSR route extraction, and plain TypeScript decorator
  output required the unavailable JIT compiler during prerender. The library now
  emits ESM using Angular partial compilation (`ngc`) so consumer linking and AOT
  prerender work correctly.
- Final external check: 367 packed files, consumer browser/server build and one
  prerendered route passed, and the consumer test passed.
- Repository regression checks: 221 tests passed; library build passed;
  production application build passed and prerendered two routes with only the
  established initial-bundle and stylesheet budget warnings.

## Increment 2: public lifecycle and Angular surface integration

Status: complete.

- Added `Astylar.mount()` and the public `AstylarSurface` ownership handle with
  scene-bound update, explicit resize, settlement, composite diagnostics,
  disposed-state reporting, and idempotent disposal. The legacy `render()` API
  now delegates to mount and remains source-compatible.
- Added the standalone `AstylarSurfaceComponent`. It creates the renderer only
  after its canvas exists and only in a browser, performs renderer work outside
  Angular's zone, reconciles changed `siteData` inputs, exposes mounted/failure
  outputs, and disposes its surface with the Angular component. Async completion
  callbacks are suppressed after destruction.
- Replaced the public export of the router/demo-specific `SiteComponent` with the
  consumer-facing surface component; the repository demo now imports its legacy
  component locally.
- Migrated the external example to the new component and handle contract,
  including dynamic input updates, typed event/navigation options, explicit
  resize, mount readiness, and surfaced errors.
- Added five focused lifecycle/component tests covering scene binding,
  responsive resize, deterministic disposed-operation failures, idempotent
  disposal, SSR suppression, post-canvas mounting, input updates, and Angular
  destruction.
- `npm test -- --watch=false`: 226 tests passed.
- `npm run build:lib`: passed.
- `npm run consumer:check`: 371 packed files; consumer browser/server build,
  prerendered route, and consumer test passed.

## Increment 3: simultaneous surface isolation

Status: complete.

- Refactored the root `Astylar` service into a lightweight public factory. Every
  `mount()` creates a child environment injector containing a complete private
  renderer dependency graph, and destroying the scene releases that injector.
  Mutable camera, mesh, DOM, style, input, focus, form, selection, scroll,
  clipping, resource, positioning, and text services are no longer shared across
  public surfaces.
- Added a browser integration regression that mounts two real WebGL scenes using
  the same authored IDs, settles both, updates only one, disposes it, verifies its
  resources and registrations reach zero/disposed state, continues updating the
  other, and then verifies the second surface's final cleanup. Each surface owns
  and disconnects its own resize observer.
- Fixed re-entrant Babylon engine disposal discovered by the two-surface test.
  Explicit surface disposal now disposes the scene and then the engine; legacy
  scene-only disposal defers engine cleanup until Babylon finishes its scene
  cleanup stack.
- Cancelled the camera service's delayed diagnostic callback during cleanup so it
  cannot access a disposed camera or outlive its surface.
- Expanded the external consumer to keep two responsive Astylar components live
  simultaneously, update them independently, explicitly resize the secondary
  surface, and remove/remount the primary while the secondary remains active.
- `npm test -- --watch=false`: 227 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed and prerendered two routes with only the established
  initial-bundle and stylesheet budget warnings.
- `npm run consumer:check`: 375 packed files; consumer browser/server build,
  prerender, and test passed with the two-surface application.

## Increment 4: typed validation diagnostics and logging

Status: pending.
