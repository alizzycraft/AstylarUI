# AstylarUI Project Status

Last reconciled: 2026-08-19

This is the authoritative handoff for the repository. Older planning documents
remain design history; their unchecked items are not automatically active work.

## Current milestone

Phase 12, Consumer-Ready Application Integration, is active. Its contract,
starting evidence, increments, and acceptance gates are maintained in
`docs/parity/scorecard-v12.md`.

The objective is to make the proven renderer usable from an independently
installed Angular application through a small public API. The work includes a
committed consumer example, tarball install verification, explicit lifecycle and
diagnostics, SSR-safe Angular integration, and simultaneous-surface isolation.

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

## Phase 12 starting constraints

- The package has no external tarball install/build/test workflow.
- Its dry-run tarball contains 367 files and exposes compiled `dist/lib/app/**`
  internals in addition to the public entry point.
- The exported `SiteComponent` is coupled to the repository demo and router.
- `Astylar` has per-scene session maps but also an implicit active session and a
  graph of root-provided mutable services. Disposing a scene invokes global
  service cleanup, so independent simultaneous consumers are not guaranteed.
- Resize observation exists in the renderer, but there is no explicit public
  mount/resize/dispose handle or focused consumer diagnostics contract.
- Debug logging is extensive and not production-aware.
- One baseline test invocation transiently failed two tests and two immediate
  reruns passed all 221. Phase 12 must leave repeated acceptance deterministic.

## Active verification commands

- `npm test -- --watch=false`
- `npm run build:lib`
- `npm run build`
- `npm run consumer:check` (to be added in Phase 12)
- `npm run parity:check`

## Document map

| Document | Status | Use |
| --- | --- | --- |
| `parity/scorecard-v12.md` | Active | Phase 12 contract and evidence |
| `parity/scorecard-v11.md` | Complete | Reconciliation and Phase 11 freeze evidence |
| `parity/scorecard-v2.md` through `scorecard-v10.md` | Complete | Earlier parity milestone evidence |
| `reconciliation.md` | Current | Authored identity and replacement contract |
| `renderer-layout-roadmap.md` | Historical roadmap | Original parity direction |
| `architectural-refactor-plan.md` | Partially completed historical plan | Technical-debt context |

## Scope boundary

Phase 12 does not add an arbitrary HTML/CSS parser, broad CSS features, advanced
animations, XR, physics, post-processing, dirty-subtree optimization, a demo
redesign, or npm publication. Rendering changes must remain general, measured,
and compatible with the fixed Phase 11 parity gates.
