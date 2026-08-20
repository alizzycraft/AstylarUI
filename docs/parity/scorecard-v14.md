# Phase 14 Durable Plugins and Agent-Ready Compatibility

Phase 14 hardens the Angular-native extension kernel so plugin-backed documents
survive version changes, unavailable capabilities, failed upgrades, asynchronous
work, and repeated updates. It also creates the maintained compatibility facts
that a later Phase 15 agent skill can consume without reverse-engineering the
renderer.

This scorecard is the active implementation contract and evidence log. Work is
delivered as bounded commits and must preserve the Phase 13 package and parity
baseline.

## Completion contract

- Persisted `SiteData` can declare required and optional plugins, compatible
  plugin versions, and plugin-owned document schema versions.
- Plugin definitions can declare Astylar compatibility, version-constrained
  dependencies, and a current document schema version without breaking valid
  Phase 13 plugins.
- A deterministic explicit preparation API upgrades only plugin-owned element
  data and style extensions. It never mutates the authored document and commits
  no partial result when a migration fails.
- Strict recovery retains the Phase 13 fail-fast behavior. Explicit tolerant
  recovery preserves unresolved data, aggregates actionable diagnostics, and
  renders deterministic owned placeholders rather than unrelated core output.
- Plugin render generations and surface services can explicitly own Babylon
  resources, custom disposables, callbacks, observers, and delayed work. Stale
  generations are cancelled and late completion cannot leak into newer output.
- Public, surface-scoped invalidation requests coalesce through the existing
  render session. Plugin property `affects` metadata selects the required
  domains without exposing private renderer services.
- The packed Angular consumer proves compatibility metadata, migration,
  recovery, asynchronous ownership, invalidation, surface isolation, SSR,
  update plateaus, and final cleanup using package-root imports only.
- A checked machine-readable catalog and a human compatibility reference
  classify the current HTML/CSS-to-Astylar surface as direct, compatible,
  different, unsupported, or plugin-provided.
- Six to ten maintained paired examples provide raw web/Astylar translation
  evidence for Phase 15. Phase 14 does not create the skill itself.
- Unit tests, both builds, packed-consumer acceptance, catalog/example checks,
  and the fixed parity harness pass. The final unchanged commit passes parity
  three consecutive times with a clean worktree.

## Architectural decisions

### Additive plugin API v1

Phase 13 plugin API v1 remains valid. New metadata and contribution fields are
optional and additive. A plugin that does not own persisted schema continues to
register exactly as before. Angular remains the construction and lifetime
foundation; no second service container is introduced.

Plugin package versions and compatibility ranges use semantic-version rules.
Plugin-owned document schema versions are positive integers. Migration steps
form an explicitly versioned directed graph. Registration rejects duplicate
transitions, cycles, and multiple paths between the same versions, removing
ambiguous path selection from the runtime.

### Explicit document preparation

Migrations are pure, non-injectable document transforms. They receive only the
plugin-owned element data or namespaced extension declaration being migrated,
plus immutable identity/path context. They cannot mutate or inspect unrelated
project data.

Preparation is an explicit public host operation that returns a result
containing the original document, an upgraded clone when successful, applied
steps, and diagnostics. Rendering never invisibly rewrites caller-owned data.
Mounting data with an old installed schema reports that preparation is required.

### Recovery policy

Strict mode remains the default for compatibility. Tolerant mode is an explicit
mount/preparation policy intended for authoring and recovery hosts. It treats a
missing or incompatible required capability as unavailable, retains all source
data, aggregates affected paths, and substitutes a diagnostic element renderer.

An unresolved element is a leaf for rendering purposes: its authored children
remain in `SiteData` but are not rendered because their layout semantics may be
owned by the missing parent plugin. The placeholder uses resolved core sizing,
paint, positioning, and identity where safe and carries missing-capability
metadata. A fresh compatible surface renders the original real contribution.

### Ownership and invalidation

The render context receives a generation owner with an `AbortSignal`, resource
tracking, cleanup registration, and active-generation inspection. Rebuild or
replacement aborts and disposes the generation. The injectable surface context
provides surface-lifetime cleanup and coalesced invalidation requests. Angular
services continue to use `DestroyRef` for their own subscriptions and state.

Invalidation domains reuse the existing full, safe reflow path in Phase 14; this
phase does not implement a dirty-subtree renderer. Coalesced domain-specific
reasons make the public contract real without overstating optimization.

## Compatibility taxonomy

The Phase 15 source material uses five stable classifications:

| Classification | Meaning |
| --- | --- |
| `direct` | Ordinary web knowledge transfers without a meaningful qualification. |
| `compatible` | The authored model differs, but observable behavior matches within a documented subset. |
| `different` | Astylar supports the concept with intentionally different syntax, defaults, lifecycle, or 3D semantics. |
| `unsupported` | The current public model cannot express the feature; an honest limitation and alternative are recorded. |
| `plugin` | The concept is not core but can be supplied through the public plugin contract. |

Every positive compatibility claim must name implementation or executable
evidence. The catalog is derived from or checked against authoritative element,
style, validation, and fixture definitions so documentation cannot silently
become a second source of truth.

## Starting evidence

The clean starting commit is `79adb1d` (`docs: record phase 13 completion`).
Resolved versions on 2026-08-20 are Angular `20.0.6`, Angular CLI `20.0.5`,
Babylon.js `8.15.1`, and TypeScript `5.8.3`.

The complete pre-change matrix passes:

- `npm test -- --watch=false`: 254 tests.
- `npm run build:lib`: passed.
- `npm run build`: passed and prerendered two routes. The only warnings are the
  accepted initial-bundle and `src/app/app.scss` budgets.
- `npm run consumer:check`: passed a fresh 395-file package install, browser and
  SSR build, one prerendered route, and both real-Chrome tests. The consumer
  independently resolved Babylon.js `8.56.2`.
- `npm run parity:check`: passed 155 fixtures and 522 renders across three
  viewport profiles with exact required text, clean runtime checks, and every
  completion threshold met.

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

1. Contract, baseline, and compatibility taxonomy.
2. Plugin/document compatibility metadata and versioned dependency graph.
3. Pure non-mutating migrations and explicit preparation results.
4. Strict/tolerant recovery, aggregate diagnostics, and placeholders.
5. Asynchronous generation/surface ownership and public invalidation.
6. Substantial external packed-consumer proof.
7. Machine-readable capability catalog and freshness gate.
8. Verified paired web/Astylar examples.
9. Final public documentation, release matrix, and three unchanged-commit
   parity runs.

## Explicitly deferred

- The Phase 15 skill itself
- Framework-neutral runtimes or custom dependency injection
- Tailwind, SCSS, or a general authoring-rule registry
- Editor, component-library, behaviour, asset, physics, ECS, game, or XR
  contribution systems
- Dynamic discovery, installation, package management, hot loading, and safe
  mode UX
- Sandboxing, worker/WASM isolation, permissions, and restricted plugins
- Renderer marketplaces or implicit overrides
- A dirty-subtree/incremental renderer rewrite or generic CSS engine
- A Babylon.js major-version upgrade or unrelated parity work

## Evidence log

### Increment 0: contract and baseline

Status: complete.

- Confirmed a clean `79adb1d` tree and resolved platform versions.
- Passed the complete Phase 13 release matrix and recorded exact evidence above.
- Fixed additive API compatibility, explicit pure migrations, strict-default
  recovery, leaf placeholders, generation/surface ownership, and compatibility
  classification before implementation.

### Increment 1: versioned plugin and document contracts

Status: complete in `4de6cee`.

- Added public Astylar/package, plugin dependency, and persisted plugin schema
  compatibility metadata while preserving Phase 13 string dependencies.
- Added deterministic semantic-version enforcement and compatibility statuses
  for installed, missing, version-mismatched, migration-required, and
  unsupported-schema requirements.
- Passed the public library build and all 257 tests.

### Increment 2: pure document migrations

Status: complete.

- Added validated explicit migration graphs and a public non-mutating document
  preparation result.
- Limited callbacks to frozen plugin-owned element payloads and namespaced style
  extensions, with no Angular injection context.
- Proved atomic rollback, unrelated-data preservation, ownership enforcement,
  missing-path diagnostics, already-current stability, and idempotence.

### Increment 3: strict and tolerant recovery

Status: complete.

- Preserved strict fail-fast behavior while distinguishing missing, incompatible,
  old-schema, future-schema, and removed-contribution cases.
- Added explicit placeholder recovery with aggregate affected-path diagnostics,
  normal layout/paint participation, render-leaf child policy, and metadata.
- Proved source immutability, repeated-update resource plateaus, final zero
  resources, and real-renderer restoration on a compatible new surface.

### Increment 4: asynchronous ownership and invalidation

Status: complete.

- Added generation and surface resource owners for Babylon resources, custom
  disposables, cleanup callbacks, observers/listeners, and tracked delayed work.
- Integrated tracked readiness with settlement, abort-on-replacement, stale
  completion disposal, async Babylon adoption, and public zero-count diagnostics.
- Made property `affects` domains operational through validated, surface-scoped,
  coalesced invalidation requests while retaining the safe complete-reflow path.
- Prevented synchronous renderer recursion and bounded repeated plugin-only
  invalidation loops with attributed diagnostics.
- Proved plugin-root replacement, settled semantic-only generation retention,
  async failure cleanup, Angular destruction, and harmless post-disposal calls.

### Increment 5: substantial packed external plugin

Status: complete.

- Evolved the committed Angular consumer plugin to schema v2 with persisted
  requirements and a pure, non-mutating v1-to-v2 element/style migration.
- Added deterministic delayed Babylon material ownership, abort-aware stale
  cancellation, service ownership through `DestroyRef`, and one property-derived
  invalidation per authored revision.
- Added installed-but-incompatible tolerant placeholder and aggregate diagnostic
  proof, alongside repeated updates and two independent configured surfaces.
- `npm run consumer:check` passed a fresh 415-file packed install, browser and SSR
  builds, one prerendered route, and all three real-Chrome tests. The consumer
  independently resolved Babylon.js `8.56.2` and finished with zero scene and
  plugin-owned resources.
