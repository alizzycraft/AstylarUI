# AstylarUI Project Status

Last reconciled: 2026-08-20

This is the authoritative handoff for the repository. Older planning documents
remain design history; their unchecked items are not automatically active work.

## Current milestone

Phase 18, reference-driven application parity infrastructure, is complete. The
pinned AI-TTS-MP3 source now has an offline deterministic adapter, paired app
benchmark, application-specific viewport/DPR profiles, explicit visibility and
scroll evidence, calibrated local sharpness measurement, durable artifacts, and
report-only versus enforcement modes. Its intentionally failing visual baseline
and Phase 19 backlog are recorded in `docs/parity/scorecard-v18.md`.

Phase 17 added the packaged Angular TTS application demo and deterministic mock
speech workflow. Phase 19 owns correcting that demo's source translation and
general renderer fidelity before promoting the new benchmark to enforcement.

## Phase 16 skill baseline

Phase 16, AstylarUI Maintainer Skill, is complete. Its contract, seven bounded
implementation increments, twelve independent forward-test categories,
correction, and final acceptance evidence are maintained in
`docs/parity/scorecard-v16.md` and `docs/parity/forward-tests-v16.md`.

The repository now owns two complementary checked skills. `astylarui-developer`
transfers HTML/CSS, Angular, Babylon surface, and application-plugin knowledge
through the public package contract. `astylarui-maintainer` owns renderer and
platform diagnosis, bounded core changes, public/package compatibility, parity
and release evidence, and synchronized improvement of the developer skill.

## Phase 16 completion baseline

- `astylarui-maintainer` is a 119-line evidence-first router backed by seven
  progressive references for architecture, subsystems, maintenance workflow,
  application-skill cooperation, public API/plugins, lifecycle/resources, and
  parity/release acceptance. It explicitly excludes ordinary application work.
- Deterministic validation checks both skills' metadata, links, unfinished
  content, trigger boundaries, required workflows and safeguards, important
  paths/scripts, package-root application imports, cross-skill handoff, and
  eleven synchronized application evidence sources.
- Twelve fresh-agent forward-test categories passed in isolated worktrees.
  Compiling cases covered layout, focus/semantics, async ownership, plugins,
  public API/package/SSR, capability promotion, parity diagnosis, and a Phase 15
  public reproduction. All raw requests and exact results are recorded in
  `parity/forward-tests-v16.md`; disposable product changes were not merged.
- Forward testing corrected one stale application statement: an explicit
  direct `surface.update(siteData)` rereads a reused object, while Angular
  `[siteData]` delivery still requires replacement identity. Canonical docs were
  updated before regenerating and validating the developer skill.
- The final matrix passes both standard and repository skill validators,
  capability/example checks, all 282 Chrome tests, the library build, and the
  production browser/SSR build. Production prerender covers two routes with
  only the accepted initial-bundle and `src/app/app.scss` budget warnings.
- The fresh packed consumer remains 415 files, produces browser and SSR output,
  prerenders one route, and passes all three real-Chrome tests against its
  independently resolved Babylon.js `8.56.2`.
- The enforced full parity corpus remains 155 fixtures and 522 renders over
  three viewports. Median SSIM is `0.9900079622614616`, minimum SSIM is
  `0.9501815836061078`, edge-tolerance ratio is `0.9998168050806058`, maximum
  edge error is `3.99209364194121 px`, visible text matches exactly, runtime is
  clean, and all completion thresholds pass.

## Phase 15 completion baseline

- The `astylarui-developer` skill is a concise 118-line router backed by focused
  application, Angular/Babylon, diagnosis, plugin, compatibility, public-API,
  translation, and consumer-proof references. It uses package-root imports and
  explicitly excludes renderer, registry, layout, paint, reconciliation, and
  parity-harness maintenance.
- Deterministic validation covers skill and UI metadata, local links, unfinished
  content, eleven synchronized authoritative sources, source/bundle hashes,
  AstylarUI version, 105 public root exports, catalogued element/style names,
  all ten verified translations, and forbidden private/deep-import guidance.
- Ten fresh-agent forward tests passed: compatibility lookup, responsive app
  creation, HTML/CSS conversion, Angular state and accessibility, application
  plugin authoring, intentional differences, unsupported behavior, flawed-code
  review, probable core-defect handoff, and negative-trigger core maintenance.
  The plugin test caused two evidence-led corrections for geometry invalidation
  and migration preservation before its successful rerun.
- 282 repository tests pass; library and production application builds pass.
  Production prerender covers two routes with only the accepted initial-bundle
  and `src/app/app.scss` budget warnings.
- The packed external consumer still contains 415 files, builds successfully,
  and passes all three real-Chrome tests against independently resolved
  Babylon.js `8.56.2`.
- The full parity corpus remains 155 fixtures and 522 renders over three
  viewports. Median SSIM is `0.9900079622614616`, minimum SSIM is
  `0.9501815836061078`, edge-tolerance ratio is `0.9998168050806058`, maximum
  edge error is `3.99209364194121 px`, visible text matches exactly, runtime
  checks are clean, and all completion thresholds pass.

## Phase 14 completion baseline

- Plugin API v1 remains additive and compatible. Definitions can declare
  Astylar/package compatibility, constrained dependencies, and independently
  versioned document schemas; `SiteData.plugins` persists document requirements.
- Explicit pure migrations operate only on frozen plugin-owned element data and
  namespaced extensions. Successful output is detached/idempotent, while any
  failure returns the complete original document without partial mutation.
- Strict recovery remains the default. Tolerant recovery aggregates typed
  affected-path diagnostics and renders stable owned leaf placeholders without
  deleting source data; a compatible new surface restores the real renderer.
- Generation/surface resource owners track Babylon and custom resources,
  cleanup callbacks, cancellable delayed work, settlement, stale completion,
  and zero-count disposal. Property `affects` domains drive coalesced safe public
  invalidation with recursion guards and attributed diagnostics.
- The packed Angular consumer contains 415 files, builds browser and SSR targets,
  prerenders one route, and passes three real-Chrome tests against independently
  resolved Babylon.js `8.56.2`. It proves schema migration, incompatible-version
  placeholder recovery, delayed material cancellation/readiness, two-surface
  isolation, update plateaus, independent disposal, and final zero resources.
- The checked compatibility catalog covers 91 built-in elements, 62 public
  `DOMElement` fields, 84 public `StyleRule` fields, and 82 unique evidence
  references. Ten paired translations cover the required web-to-Astylar topics;
  seven reuse executable parity fixtures and three document platform boundaries.
- 282 repository tests pass; library and production application builds pass.
  Production prerender covers two routes with only the accepted initial-bundle
  and `src/app/app.scss` budget warnings.
- The full parity corpus remains 155 fixtures and 522 renders. Median SSIM is
  `0.9900079622614616`, minimum SSIM is `0.9501815836061078`, edge-tolerance
  ratio is `0.9998168050806058`, maximum edge error is `3.99209364194121 px`,
  visible text matches exactly, runtime checks are clean, and all thresholds pass.

## Phase 13 completion baseline (historical)

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
- `npm run capabilities:check`
- `npm run examples:check`
- `npm run skill:check`
- `npm run parity:check`

## Document map

| Document | Status | Use |
| --- | --- | --- |
| `compatibility/html-css.md` | Current | Human HTML/CSS-to-Astylar translation contract |
| `compatibility/capabilities.json` | Current and checked | Machine-readable capability/evidence source |
| `compatibility/examples/manifest.json` | Current and checked | Ten Phase 15-ready paired translations |
| `plugins.md` | Current | Public Angular-native plugin API and authoring guide |
| `../.agents/skills/astylarui-developer/SKILL.md` | Current and checked | Phase 15 application-development agent workflow |
| `../.agents/skills/astylarui-maintainer/SKILL.md` | Current and checked | Phase 16 AstylarUI core-maintenance workflow |
| `parity/scorecard-v16.md` | Complete | Maintainer skill contract, increments, and release evidence |
| `parity/forward-tests-v16.md` | Complete | Twelve isolated raw requests, results, metrics, and corrections |
| `parity/scorecard-v15.md` | Complete | Application-development skill contract and evidence |
| `parity/scorecard-v14.md` | Complete | Durable plugin and compatibility-contract evidence |
| `parity/scorecard-v13.md` | Complete | Extension kernel contract and Phase 13 freeze evidence |
| `parity/scorecard-v12.md` | Complete | Consumer integration and Phase 12 freeze evidence |
| `parity/scorecard-v11.md` | Complete | Reconciliation and Phase 11 freeze evidence |
| `parity/scorecard-v2.md` through `scorecard-v10.md` | Complete | Earlier parity milestone evidence |
| `reconciliation.md` | Current | Authored identity and replacement contract |
| `renderer-layout-roadmap.md` | Historical roadmap | Original parity direction |
| `architectural-refactor-plan.md` | Partially completed historical plan | Technical-debt context |

## Scope boundary

Phase 16 created maintenance knowledge and validation, not a speculative
renderer rewrite. It did not merge the disposable feature/API patches used for
forward evaluation, add framework-neutral adapters, replace Angular DI, add
dynamic plugin discovery/installation, marketplaces, hot loading, permissions,
sandboxing, a generic CSS engine, dirty-subtree rendering, a Babylon
abstraction, or a Babylon.js major upgrade. Registered media-like identities do
not imply native browser playback/embed behavior. Future rendering changes must
remain general, measured, reflected in the checked capability contract, and
compatible with the fixed parity gates.
