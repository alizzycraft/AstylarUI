# Phase 13 Angular-Native Extension Kernel

Phase 13 turns the isolated consumer runtime proven in Phase 12 into an
Angular-native extension platform. Angular is an intentional foundation of the
plugin contract: application registration uses providers, injectable plugin
services are constructed in a surface-owned `EnvironmentInjector`, and
injector destruction participates in cleanup. The phase does not create a
framework-neutral service container or portability layer.

This scorecard is the active implementation contract and evidence log. Work is
delivered as bounded commits that keep the plugin-free renderer compatible with
the fixed Phase 12 parity baseline.

## Completion contract

- The package root exports a separately versioned, strongly typed plugin API
  and an idiomatic Angular provider function.
- Immutable application-level plugin definitions are validated and resolved
  deterministically before a surface begins rendering.
- The capability registry rejects incompatible API versions, duplicate plugin
  or contribution identities, ambiguous aliases, missing dependencies,
  dependency cycles, invalid renderer claims, and implicit overrides.
- Every mounted surface owns a sealed registry snapshot and independently
  constructed mutable plugin services. Angular multi-provider order never
  decides contribution precedence.
- Plugin element and style-property definitions participate in runtime
  validation, defaults, and renderer selection without turning the public
  document model into `any`.
- Missing or invalid plugin-owned data is preserved and produces actionable
  typed diagnostics rather than silent deletion or unrelated core fallback.
- Injectable renderer contributions receive a curated public context rather
  than Astylar's private service graph. Babylon resources and Angular cleanup
  remain owned by the surface.
- Core element rendering passes through the same capability resolver by means
  of a compatibility contribution; Phase 13 does not rewrite every core
  renderer.
- A committed project-local plugin in `examples/angular-consumer/` uses only
  the packed package root. It proves Angular DI, a plugin configuration token,
  surface-scoped mutable state, `DestroyRef`, a namespaced element and property,
  validation/defaults, Babylon rendering, updates, SSR safety, and cleanup.
- Focused tests cover graph failures, DI context, renderer failures, partial
  initialization, two-surface isolation, repeated-update resource stability,
  and final zero-resource disposal.
- Unit tests, library and application builds, packaged consumer verification,
  and the full parity harness pass. After the final change, parity passes three
  consecutive times at one unchanged commit and the worktree is clean.

## Architectural boundaries

### Angular-native runtime

- Angular 20 is a required platform dependency for Astylar plugins.
- Plugin definitions may contain Angular `Provider` or
  `EnvironmentProviders` recipes and injectable contribution types.
- Mutable surface services must be provided by the plugin and instantiated in
  the surface scope; they must not use `providedIn: 'root'`.
- Root application services may be injected intentionally through normal
  hierarchical resolution.
- The public API documents valid injection contexts. Astylar resolves plugin
  services only after their providers exist in the surface injector.
- Injector destruction is the authoritative Angular cleanup boundary.
  `DestroyRef` handles observers, subscriptions, and other non-Babylon state.

### Capability registry

- Canonical plugin, element, property, and renderer IDs are namespaced.
- Author-facing aliases are optional and must be globally unambiguous.
- Definitions are collected first, resolved by an explicit dependency graph,
  validated, and sealed before rendering.
- Registration order and Angular provider order are not precedence mechanisms.
- Plugin API v1 rejects renderer replacement. A later API may add explicit
  host-selected replacement without changing this rule implicitly.

### Renderer ownership

- Renderer plugins may use documented Babylon.js types and facilities. The
  plugin API is Angular-native, not Babylon-agnostic.
- A renderer receives only the scene, resolved element/style data, layout and
  identity information, diagnostics, invalidation facilities, and documented
  resource helpers needed by the public contract.
- Plugin-created meshes, materials, and textures are tracked by the same scene
  replacement/disposal boundary as core output. Plugin observers and other
  services are destroyed with the surface injector, including failed mounts.

### Trust model

Phase 13 plugins are trusted Angular code running in the host application.
Angular DI is an ownership boundary, not a security sandbox. Permissions,
worker/WASM isolation, safe mode, and restricted plugins are future work.

## Starting evidence

The clean starting commit is `4a05f66` (`docs: record phase 12 consumer
readiness`). The locally resolved platform versions are Angular `20.0.6` and
Babylon.js `8.15.1`; Phase 13 does not upgrade either major version.

The complete pre-change matrix passed on 2026-08-19:

- `npm test -- --watch=false`: 235 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed and prerendered two routes. The only warnings were the
  previously accepted initial-bundle and `src/app/app.scss` budgets.
- `npm run consumer:check`: passed both real-Chrome tests against 379 packed
  files, including browser/SSR builds and prerender.
- `npm run parity:check`: passed 155 fixtures and 522 renders across three
  viewport profiles with no runtime errors and exact required text.

Starting parity metrics:

| Metric | Baseline |
| --- | ---: |
| Median SSIM | `0.9900079622614616` |
| Minimum SSIM | `0.9501815836061078` |
| Edges within 2 px | `0.9998168050806058` |
| Maximum edge error | `3.99209364194121 px` |
| Exact required text | Yes |
| Runtime clean | Yes |
| Completion thresholds | Met |

## Planned increments

1. Public plugin types, tokens, provider registration, graph validation, and a
   sealed registry.
2. Per-surface plugin provider construction, injection context, activation,
   failure cleanup, and diagnostics.
3. Registry-backed element/property validation and deterministic renderer
   selection.
4. Core compatibility contribution and public renderer context/resource
   ownership.
5. External Angular proof plugin plus packaged browser, SSR, isolation, update,
   and disposal acceptance.
6. Documentation, full release matrix, and three unchanged-commit parity runs.

Each increment must add focused evidence, pass the relevant broader gates, and
end in a reviewable commit.

## Explicitly deferred

- Framework-neutral runtimes and React, Vue, Svelte, or vanilla adapters
- A custom dependency-injection system
- Tailwind, SCSS, and other authoring adapters
- Editor UI contributions
- Asset, physics, behaviour, ECS, XR, and game-system registries
- Dynamic discovery, marketplaces, and hot loading
- Sandboxing, permissions, restricted plugins, and safe mode
- Full schema migrations
- Babylon abstraction or a Babylon.js major-version upgrade
- Wholesale migration of all built-in rendering code
- Unrelated rendering and parity expansion

## Evidence log

### Increment 0: contract and baseline

Status: complete.

- Confirmed a clean `4a05f66` starting tree.
- Verified the complete Phase 12 release matrix and recorded exact parity
  metrics above.
- Fixed Angular-native architecture, DI ownership, deterministic registry,
  renderer trust, and scope boundaries before implementation.

### Increment 1: public contract and sealed registry

Status: complete.

- Added the versioned Angular-native plugin definition, contribution, renderer,
  lifecycle, validation, configuration, and provider-helper API.
- Added immutable definitions and a sealed per-surface capability registry with
  deterministic dependency ordering and namespaced element, property, renderer,
  and lifecycle lookup.
- Added typed failures for malformed or duplicate identities, incompatible API
  versions, dependency failures, ambiguous aliases, invalid renderer claims,
  missing renderers, and attempted late mutation.
- Added nine focused tests covering Angular multi-provider collection,
  immutability, deterministic ordering, lookup, conflicts, graph failures, and
  sealing. The complete suite passes with 244 tests.
- `npm run build:lib` passes with the new public declarations.

### Increment 2: Angular surface scope and activation

Status: complete.

- Every mount now installs plugin providers, renderer types, and lifecycle types
  into that surface's child `EnvironmentInjector`.
- The registry is built and sealed before plugin activation. Lifecycle hooks run
  in deterministic plugin dependency order, renderer services resolve lazily,
  and all plugin code executes in the surface injection context.
- Plugin activation and rendering failures are normalized into typed diagnostics
  with plugin and contribution identities while retaining the original error as
  the cause.
- Surface diagnostics expose the immutable capability snapshot for inspection.
- Added three browser-backed tests proving simultaneous-surface service identity,
  independent disposal, typed activation failure, and injector cleanup after
  both plugin and core mount failures. The complete suite passes with 247 tests.
- Removed 14.4 GB of ignored historical output from `dist/test-out` after it
  exhausted the development drive during the gate; no source or tracked files
  were removed.
