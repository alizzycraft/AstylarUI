# AstylarUI Project Status

Last reconciled: 2026-08-20

This is the authoritative handoff for the repository. Older planning documents
remain design history; their unchecked items are not automatically active work.

## Current milestone

Phase 13, Angular-Native Extension Kernel, is complete. Its contract,
implementation increments, architectural boundaries, and acceptance evidence
are maintained in `docs/parity/scorecard-v13.md`.

The renderer is now an extensible Angular-native platform. Applications install
plugins through the public provider API; each mounted surface resolves an
immutable, deterministic capability graph in its own `EnvironmentInjector`.
Plugins can contribute namespaced elements, style properties, injectable
renderers, and lifecycle services without importing private Astylar code. The
committed external consumer proves the complete packed-package path with an
Angular DI-based Babylon.js plugin.

## Phase 13 completion baseline

- The package root exports plugin API v1, `provideAstylar(...)`, and
  `provideAstylarPlugin(...)`. Plugin metadata and document extension data stay
  strongly typed and serializable while runtime construction uses Angular DI.
- Every surface owns isolated plugin services, a sealed registry, lifecycle
  activation, diagnostics, Babylon resources, and injector/`DestroyRef`
  cleanup. Deterministic dependency resolution is independent of Angular
  multi-provider order.
- The registry rejects incompatible APIs, graph failures, duplicate or
  ambiguous identities, invalid contribution values and renderer claims,
  overrides, post-seal mutation, initialization failures, and renderer
  failures with typed diagnostics.
- Core elements use the same registry and renderer resolver through the
  `astylar.core` compatibility contribution, preserving the mature Phase 12
  rendering implementation.
- The external Angular consumer installs the packed package and contributes
  `consumer.proof:badge` plus `consumer.proof:depth`. Its two real-Chrome tests
  prove DI configuration, distinct simultaneous-surface service instances,
  updates, stable resource counts, disposal, and SSR-safe registration.
- 254 repository tests pass; library and production application builds pass.
  Production prerender still covers two routes with only the accepted bundle
  and application-style budget warnings.
- The packed consumer contains 395 files, builds its browser and server targets,
  prerenders one route, and passes both browser tests against its independently
  resolved Angular and Babylon.js dependencies.
- The full parity corpus remains 155 fixtures and 522 renders. Median SSIM is
  `0.99000796`, minimum SSIM is `0.95018158`, edge-tolerance ratio is
  `0.99981681`, maximum edge error is `3.99209364 px`, visible text matches
  exactly, runtime checks are clean, and all completion thresholds pass.

## Phase 12 completion baseline (historical)

- The clean external consumer installs the packed root entry point and declared
  peers, then produces browser and SSR builds and prerenders its route.
- Its two real-Chrome tests cover responsive reflow, semantic controls, nested
  table actions, keyboard editing and retained state, scrolling, modal focus,
  independent surfaces, repeated-update resource plateaus, disposal, remounting,
  and final zero-resource cleanup.
- 235 repository tests pass; library and production application builds pass.
- The package contains 379 files and the verifier rejects source leakage, deep
  imports, workspace/local dependency specs, undeclared peers, or symlinked
  package installs.
- Three consecutive parity runs on one unchanged commit pass all 155 fixtures
  and 522 renders. Median SSIM remains `0.99000796`, minimum SSIM remains
  `0.95018158`, edge-tolerance ratio remains `0.99981681`, maximum edge error
  remains `3.99209364 px`, visible text matches exactly, and runtime checks are
  clean.

## Completed parity baseline

Phases 2 through 11 established the browser/Astylar comparison harness and then
expanded layout, paint, typography, responsive behavior, controls, interaction,
semantics, scrolling, assets, lifecycle ownership, representative applications,
and identity-aware reconciliation.

The Phase 11 final commit is `94d95d6`. Its unchanged-commit acceptance baseline
is:

- 155 fixtures and 522 renders across desktop, tablet, and mobile.
- Median SSIM `0.99000796`; minimum SSIM `0.95018158`.
- Edge-tolerance ratio `0.99981681`; maximum edge error `3.99209364 px`.
- Exact visible text and required state/semantic checks, no runtime errors, and
  all completion thresholds satisfied.
- 221 unit tests, the library build, and the production application build pass.
- Production prerender covers two routes. The only expected build warnings are
  the initial bundle and `src/app/app.scss` budgets.

## Resolved Phase 13 starting constraints

- Angular is an explicit platform foundation for Astylar and its plugin
  ecosystem; there is no framework-neutral runtime, custom DI container, or
  speculative portability layer.
- Application-level plugin definitions are immutable provider recipes. Mutable
  runtime state is created in a surface-owned child injector and cannot gain
  precedence through provider order.
- Closed element dispatch now passes through a capability registry. The public
  document model preserves namespaced element data and property declarations
  without an `any` escape hatch.
- Plugin renderers receive a curated public context, use the existing scene
  transaction for Babylon ownership, and cannot replace core or plugin
  renderers implicitly.
- Phase 13 plugins are documented as trusted in-process Angular code. DI is an
  ownership boundary, not a permissions or security sandbox.

## Resolved Phase 12 starting constraints (historical)

- `npm run consumer:check` now provides the external tarball workflow and always
  removes its temporary installation.
- The package exposes one documented root entry point; repository sources,
  examples, tests, parity artifacts, and node modules are excluded.
- `AstylarSurfaceComponent` replaces the demo/router component as the Angular
  integration export.
- Every mounted surface owns a child injector and isolated mutable renderer
  graph; the public handle provides update, resize, settlement, diagnostics, and
  idempotent disposal.
- Diagnostic codes, callbacks, retained messages, validation, and
  production-aware logging replace routine debug output.
- Background-tab initial rendering has a cancellable timer fallback, removing
  the scheduling stall found by packaged browser acceptance.

## Release verification commands

- `npm test -- --watch=false`
- `npm run build:lib`
- `npm run build`
- `npm run consumer:check`
- `npm run parity:check`

## Document map

| Document | Status | Use |
| --- | --- | --- |
| `plugins.md` | Current | Public Angular-native plugin API and authoring guide |
| `parity/scorecard-v13.md` | Complete | Extension kernel contract and Phase 13 freeze evidence |
| `parity/scorecard-v12.md` | Complete | Consumer integration and Phase 12 freeze evidence |
| `parity/scorecard-v11.md` | Complete | Reconciliation and Phase 11 freeze evidence |
| `parity/scorecard-v2.md` through `scorecard-v10.md` | Complete | Earlier parity milestone evidence |
| `reconciliation.md` | Current | Authored identity and replacement contract |
| `renderer-layout-roadmap.md` | Historical roadmap | Original parity direction |
| `architectural-refactor-plan.md` | Partially completed historical plan | Technical-debt context |

## Scope boundary

Phase 13 deliberately did not add framework-neutral adapters, a custom DI
system, editor extensions, asset/game/XR systems, dynamic discovery,
marketplaces, hot loading, permissions or sandboxing, full schema migrations,
Babylon abstraction, a Babylon.js major upgrade, or authoring-framework
adapters. It migrated only the core dispatch needed to dogfood the registry;
the remaining mature built-in implementation stays behind a compatibility
contribution. Future rendering changes must remain general, measured, and
compatible with the fixed parity gates.
