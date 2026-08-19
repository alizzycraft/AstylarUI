# AstylarUI Project Status

Last reconciled: 2026-08-19

This is the authoritative handoff for the repository. Older planning documents
remain design history; their unchecked items are not automatically active work.

## Current milestone

Phase 12, Consumer-Ready Application Integration, is complete. Its contract,
implementation increments, and acceptance evidence are maintained in
`docs/parity/scorecard-v12.md`.

The renderer is now usable from an independently installed Angular application
through a small public API. The repository includes a committed consumer,
tarball install verification, explicit lifecycle and diagnostics, SSR-safe
Angular integration, simultaneous-surface isolation, and real-Chrome acceptance.

## Phase 12 completion baseline

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

## Resolved Phase 12 starting constraints

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
| `parity/scorecard-v12.md` | Complete | Consumer integration and Phase 12 freeze evidence |
| `parity/scorecard-v11.md` | Complete | Reconciliation and Phase 11 freeze evidence |
| `parity/scorecard-v2.md` through `scorecard-v10.md` | Complete | Earlier parity milestone evidence |
| `reconciliation.md` | Current | Authored identity and replacement contract |
| `renderer-layout-roadmap.md` | Historical roadmap | Original parity direction |
| `architectural-refactor-plan.md` | Partially completed historical plan | Technical-debt context |

## Scope boundary

Phase 12 did not add an arbitrary HTML/CSS parser, broad CSS features, advanced
animations, XR, physics, post-processing, dirty-subtree optimization, a demo
redesign, or npm publication. Rendering changes must remain general, measured,
and compatible with the fixed Phase 11 parity gates.
