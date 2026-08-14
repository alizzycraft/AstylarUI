# AstylarUI Project Status

Last reconciled: 2026-08-15

This is the authoritative handoff for the state of the repository. Older planning
documents are retained for design history, but their unchecked items are not all
active work.

## Last Completed Work

The last committed development effort was the May 2026 Phase 1 architecture
refactor:

1. `BabylonDOMService` was replaced internally by focused renderer, element
   manager, and interaction services. The old service remains as a deprecated
   compatibility facade.
2. The follow-up commit repaired the renderer and mesh-action type/build errors
   exposed by that split.
3. Phase 1.2 extracted element defaults from `StyleDefaultsService` into
   `src/app/config/browser-defaults.ts`. That extraction was left uncommitted and
   initially omitted five defaults; the reconciliation work restored them and
   added regression coverage.

Phase 1 is now complete. It is not necessary to finish the later architecture
proposal before beginning rendering-parity work.

## Ready Baseline

- Angular 20 standalone application with zoneless change detection and SSR.
- Babylon.js 8 renderer exposed through the `Astylar` service and
  `astylar-render` component.
- Browser-only engine creation is guarded by `afterNextRender` and
  `isPlatformBrowser` in the Angular component.
- Paired browser/Astylar diagnostic fixtures exist for inline-flex and header
  alignment.
- The production application build, library type-check, and unit tests are the
  required baseline checks before parity work.

## Known Constraints, Not Unfinished Refactor Work

- Renderer state is held by root-provided services and currently assumes one
  active Astylar rendering surface.
- Debug logging is extensive and has no production-aware logging abstraction.
- Babylon.js types are intentionally still used directly throughout the renderer.
- Several services remain large and contain `any` values.
- The production bundle exceeds its warning budget.
- Browser-default values are legacy compatibility values. Some are intentionally
  styled Astylar defaults rather than accurate browser user-agent defaults; parity
  work must measure and revise them instead of assuming the filename guarantees
  browser accuracy.

These are backlog or parity concerns. They are not evidence that the May service
split is incomplete.

## Document Map

| Document | Status | Use |
| --- | --- | --- |
| `architectural-refactor-plan.md` | Phase 1 complete; Phases 2-7 future backlog | Architecture proposals and technical-debt context |
| `phase-1.1-implementation-summary.md` | Historical implementation record | Details of the completed service split |
| `renderer-layout-roadmap.md` | Future parity roadmap | Starting point for layout-parity work |
| `debug-inline-flex.html` | Active browser reference fixture | Compare with the `debug-inline-flex` Astylar scene |
| `debug-header-alignment.html` | Active browser reference fixture | Compare with the `debug-header-alignment` Astylar scene |
| `html-kitchen-sink-reference.html` | Active broad browser reference | Compare with the `html-kitchen-sink` Astylar scene |
| `enhanced_features_plan.md` | Historical, partially implemented | Original feature vision; not a current checklist |
| `refactor_layout.md` | Historical design direction, partially implemented | Pixel-first layout principles |
| `seperation_of_concerns_improvement.md` | Superseded analysis | Motivation for the completed Phase 1 split |

## Recommended Next Work

Begin the measurable HTML/CSS parity initiative rather than another broad
architecture refactor:

1. Establish deterministic side-by-side browser and Astylar fixture capture.
2. Record element geometry and screenshot baselines for the existing focused
   fixtures.
3. Fix the highest-impact layout discrepancy with a focused regression test.
4. Expand fixture coverage incrementally while keeping the build and unit tests
   green.

## Reconciliation Verification

Verified on 2026-08-15:

- `npm test -- --watch=false --browsers=ChromeHeadless`: 24 tests passed.
- `npx tsc -p tsconfig.lib.json --noEmit`: passed.
- `npm run build`: passed and prerendered two routes.
- Production build warnings remain for the 5.99 MB initial bundle and the 4.59 kB
  app stylesheet. These are documented backlog items, not Phase 1 failures.
