---
name: astylarui-maintainer
description: Diagnose, modify, test, and evolve AstylarUI itself. Use for renderer internals; document validation; cascade, defaults, responsive evaluation, layout, typography, paint, scrolling, controls, interaction, semantics, reconciliation, Angular surface lifecycle, Babylon resources, plugins, diagnostics, public API and packaging, compatibility evidence, parity fixtures or harnesses, and maintaining the astylarui-developer skill. Do not use for ordinary consuming-application creation or public-API integration unless reducing an application report before core investigation.
---

# AstylarUI Maintainer

Maintain AstylarUI from evidence. Treat Angular as the platform foundation,
Babylon.js as an owned rendering substrate, and the checked browser-parity
contract as the observable product boundary.

## Establish the case

1. Inspect the branch, worktree, package versions, project status, latest
   scorecard, relevant sources, and existing tests. Preserve unrelated work.
2. Record the exact authored input, host setup, versions, viewport/runtime,
   diagnostics, expected behavior, and actual behavior.
3. For an application report, use the `astylarui-developer` skill to validate
   public authoring and reduce the case before inspecting private services.
   A deterministic application-scale reference is valid diagnostic evidence,
   but reduce a confirmed discrepancy to its smallest equivalent fixture before
   modifying renderer internals.
4. Classify the case as an application-authoring error, intentional difference,
   unsupported behavior, application-plugin opportunity, stale application
   guidance, public API defect, or confirmed core defect.
5. Stop or route to `astylarui-developer` when no core change is justified.

## Load only the references needed

- Read [architecture.md](references/architecture.md) to trace public entry
  points, surface construction, the render/reflow pipeline, and ownership.
- Read [subsystems.md](references/subsystems.md) to select the responsible style,
  layout, paint, interaction, semantic, reconciliation, resource, or plugin
  subsystem and its nearest tests.
- Read [maintenance-workflow.md](references/maintenance-workflow.md) when
  classifying a report, designing a minimal proof, choosing an implementation
  boundary, or selecting proportional verification.
- Read [application-skill.md](references/application-skill.md) when receiving a
  public reproduction, checking application authorship, changing observable
  behavior, or synchronizing/improving `astylarui-developer`.
- Read [public-api-plugins.md](references/public-api-plugins.md) for exports,
  package compatibility, plugin registration, recovery, migrations,
  invalidation, and packed-consumer proof.
- Read [lifecycle-resources.md](references/lifecycle-resources.md) for Angular
  browser/SSR boundaries, surface injectors, render settlement, Babylon and
  plugin resource ownership, cancellation, diagnostics, and disposal.
- Read [parity-release.md](references/parity-release.md) when changing observable
  output, adding fixtures, investigating a parity failure, or preparing release
  acceptance and the project handoff.
- Inspect current source and tests after using these maps. File paths and symbols
  are navigation aids; implementation remains authoritative.

## Build proof before implementation

- For browser parity, create the smallest equivalent HTML/CSS and Astylar
  `SiteData` inputs. Define observable text, geometry, state, semantics, paint,
  runtime, and ownership expectations before editing implementation.
- Locate the public entry point, responsible subsystem, and nearest existing
  proof. Add the narrowest failing unit, browser, packed-consumer, or parity
  case that owns the behavior.
- Reproduce public defects through package-root APIs. Never use source-tree or
  package deep imports in application evidence.
- Distinguish compilation, NullEngine behavior, real browser/WebGL behavior,
  SSR/prerender behavior, and visual parity. Do not use one as proof of another.
- Match reference/Astylar input, state, viewport, DPR, fonts, and settlement.
  Standalone screenshots, file-size checks, builds, semantics, geometry alone,
  or whole-page SSIM alone cannot prove sharpness, clipping, or reachability.

## Implement at the owning boundary

1. Trace inputs through validation, registry resolution, style/default/media
   evaluation, layout, scene construction, interaction/semantics,
   reconciliation, and surface/resource ownership as relevant.
2. Fix the general rule at the narrowest responsible abstraction. Do not add a
   fixture-name or authored-ID special case.
3. Preserve authored intent, stable identity, surface isolation, SSR safety,
   diagnostics, async settlement, and deterministic cleanup.
4. Keep Angular injection context and surface-owned child injectors explicit.
   Treat DI as a lifetime boundary, not a security sandbox.
5. Keep Babylon resources, observers, callbacks, delayed work, and late async
   completions attached to a generation or surface owner.
6. Avoid unrelated refactors. Make public API changes only with an explicit
   compatibility decision and package-boundary proof.

## Synchronize observable contracts

When behavior changes, update every affected source of truth in the same bounded
increment:

- focused implementation tests and parity fixtures;
- public types, exports, diagnostics, and consumer proof;
- `docs/compatibility/html-css.md` and `capabilities.json`;
- verified translation examples where application authors need a pattern;
- canonical plugin or reconciliation documentation;
- synchronized references and procedural guidance in `astylarui-developer`.

Update canonical sources before regenerating bundled application-skill evidence.
Change the application skill's instructions or trigger only when the recommended
application workflow or ownership boundary genuinely changes. Validate both
skills after every cross-skill change.

## Verify proportionally

- Run the closest focused test while iterating.
- Run all unit tests for cross-cutting renderer or lifecycle changes.
- Run capability and translation checks when observable support changes.
- Run the packed consumer for public API, package, Angular integration, SSR,
  plugin, or lifecycle changes.
- Run focused and enforced full parity for layout, responsive, typography,
  paint, controls, interaction, semantics, scrolling, or reconciliation changes.
- When a maintained application benchmark covers the changed path, run its
  report mode while diagnosing and its unfiltered enforced command for release;
  `npm run parity:release:check` combines the general and TTS visual gates.
- Run both builds and both skill validators before release acceptance.
- Record exact commands, results, metrics, limitations, and accepted warnings.

Never weaken a threshold, delete or hide a fixture, alter browser reference
truth, omit unsupported behavior, or broaden a compatibility claim to make a
check pass. A legitimate metric change must follow from a tested general change
and be explained.

## Commit bounded increments

Before each commit, inspect the diff, run `git diff --check`, and confirm that
focused proof passes. Commit one coherent maintenance outcome at a time. Run the
complete release matrix only after all required focused evidence is green, then
update the current scorecard and project handoff and leave a clean worktree.
