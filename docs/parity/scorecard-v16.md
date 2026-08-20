# Phase 16 AstylarUI Maintainer Skill

Phase 16 packages AstylarUI core-maintenance knowledge as a repository-owned
agent skill. It enables a fresh maintainer to classify a report from public
application evidence, navigate the renderer and platform architecture, make a
bounded general change, choose the correct proof, and keep public compatibility
and application guidance synchronized.

This scorecard is the implementation contract and evidence log. Work is
delivered as bounded commits and must preserve or improve the Phase 15 release
baseline.

## Completion contract

- The repository contains a valid `astylarui-maintainer` skill at
  `.agents/skills/astylarui-maintainer`, including concise triggering metadata,
  `agents/openai.yaml`, progressive references, and only useful deterministic
  scripts.
- The skill triggers for AstylarUI core work: document validation, style and
  responsive resolution, layout, paint and typography, interaction and
  semantics, reconciliation and invalidation, Angular surface ownership,
  Babylon resources and settlement, plugins, public API/package compatibility,
  parity infrastructure, capability evidence, and application guidance.
- The trigger excludes ordinary consuming-application work owned by
  `astylarui-developer`; the two skills have explicit, non-overlapping default
  ownership and a documented handoff in both directions.
- The maintainer follows an evidence-first loop: establish versions and public
  reproduction, classify the issue, locate the responsible subsystem and
  existing proof, add a minimal failing test, implement a general fix, run
  proportional gates, synchronize observable contracts, and commit the bounded
  change.
- Guidance preserves authored intent, supported behavior, Angular surface
  isolation, SSR safety, diagnostic quality, public package boundaries,
  deterministic Babylon/async cleanup, and fixed parity integrity.
- The skill explicitly rejects fixture-only special cases, concealed public API
  expansion, private application imports, ownership leaks, unrelated refactors,
  unsupported compatibility claims, manually drifting evidence, and parity
  threshold weakening.
- Progressive references cover durable entry points, invariants, search terms,
  subsystem ownership, and test-selection rules without copying the source tree
  or relying on fragile line numbers.
- Deterministic validation covers both skills' metadata, UI metadata, links,
  unfinished content, required workflows, important repository paths and
  scripts, trigger boundaries, application package imports, cross-skill handoff,
  and application-reference freshness.
- Twelve independent forward-test categories pass without leaked expected
  answers. Some produce compiling changes and focused proof in disposable
  worktrees; all preserve source and evaluation isolation.
- The standard validators, repository-specific skill checks, compatibility
  gates, all unit tests, both builds, packed consumer, and enforced full parity
  run pass. Final documentation records exact evidence and the worktree is clean.

## Skill boundary

`astylarui-developer` owns application creation, HTML/CSS translation, public
surface integration, application plugins, and public-boundary diagnosis. It may
produce a minimal public reproduction and expected browser comparison, but it
must stop before changing private renderer services or the parity harness.

`astylarui-maintainer` owns investigation and changes inside AstylarUI. It must
use the application skill when application correctness or public reproducibility
is uncertain, then cross the boundary only after evidence indicates stale
guidance, a public API defect, or a core defect. Ordinary application requests
must route back to the application skill.

The maintainer also owns downstream synchronization. When observable behavior
changes, update canonical documentation, capability data, tests, and verified
translations first; regenerate the application skill's checked references;
change its procedure or trigger only when the recommended application workflow
actually changed; and validate both skills together.

## Required maintenance workflow

1. Establish the exact behavior, affected versions, viewport/runtime, authored
   inputs, diagnostics, and expected result.
2. Use `astylarui-developer` to validate or reduce a public application case
   where appropriate.
3. Classify the report as application-authoring error, intentional difference,
   unsupported behavior, plugin opportunity, stale application guidance,
   public API defect, or confirmed core defect.
4. For parity behavior, pair minimal HTML/CSS and Astylar `SiteData` inputs and
   define observable expected output before editing implementation.
5. Trace public entry points into the responsible validation, registry, style,
   layout, paint, interaction, semantic, reconciliation, lifecycle, resource,
   packaging, or parity subsystem.
6. Add the narrowest failing unit, browser, consumer, or parity proof that owns
   the behavior.
7. Implement a general correction at the responsible abstraction boundary and
   avoid unrelated cleanup.
8. Run focused proof, then expand verification according to affected domains.
9. Synchronize public types, diagnostics, compatibility evidence, verified
   translations, consumer examples, and both skills when observable contracts
   changed.
10. Run regression gates, record evidence, and commit the coherent increment.

## Progressive reference design

The skill should route maintainers to focused references for:

- architecture and public-to-private entry points;
- document preparation, plugins, configuration, and diagnostics;
- cascade, defaults, responsive evaluation, and authored types;
- box/intrinsic/Flex/Grid/table layout and positioning;
- paint, typography, assets, stacking, clipping, and scrolling;
- controls, events, focus, selection, navigation, semantics, and accessibility;
- identity, reconciliation, invalidation, settlement, and resource ownership;
- Angular child injectors, SSR, surface isolation, and lifecycle;
- public API, packaging, consumer compatibility, and versioning;
- unit, browser, consumer, parity, capability, example, and release gates;
- application-skill reproduction, synchronization, and improvement.

References should name stable files, symbols, invariants, and search terms. The
source checkout remains authoritative. Generated snapshots are appropriate only
where deterministic validation provides more value than direct repository
navigation.

## Forward-test contract

Fresh agents receive the completed skill path, repository or isolated worktree,
and a realistic raw request. They do not receive intended classifications,
suspected causes, expected patches, or prior conclusions. Disposable artifacts
remain outside the main worktree and are removed after evidence is recorded.

| ID | Scenario | Required evidence |
| --- | --- | --- |
| FT-01 | Public report caused by application authoring | Uses application guidance, proves the cause, and routes without a core edit |
| FT-02 | Layout or responsive parity defect | Paired reproduction, correct subsystem, general fix, focused proof |
| FT-03 | Typography or paint discrepancy | Correct classification and paint/text evidence without fixture special-casing |
| FT-04 | Interaction, focus, control, or accessibility regression | State/lifecycle proof and preserved semantics |
| FT-05 | Reconciliation, invalidation, settlement, or resource leak | Ownership evidence, plateau/disposal proof, no stale completion |
| FT-06 | Plugin registry, migration, isolation, or renderer lifecycle defect | Correct plugin boundary and surface-scoped proof |
| FT-07 | Narrow public API change | Explicit API decision plus declarations, package, consumer, and compatibility proof |
| FT-08 | Promote unsupported or partial behavior | Implementation, executable evidence, catalog, translation, and application guidance agree |
| FT-09 | Parity failure | Finds cause without weakening thresholds, hiding fixtures, or editing reference truth |
| FT-10 | Phase 15 minimal reproduction | Carries public evidence through internal diagnosis and proportional verification |
| FT-11 | Core change affects application knowledge | Updates canonical sources, synchronizes or improves the developer skill, validates both |
| FT-12 | Ordinary application request | Defers to `astylarui-developer` and avoids unnecessary core work |

An evaluation passes only when classification, subsystem selection, proof,
implementation boundary, ownership, public evidence, and cross-skill updates are
correct. Compile-oriented scenarios must compile; runtime claims require runtime
evidence. A correction is rerun with fresh context.

## Starting evidence

The clean starting commit is `a64e323` (`docs: record phase 15 completion`) on
branch `more-html`. The worktree was clean. The package is AstylarUI `0.1.0`,
with Angular `20.0.6`, Angular CLI `20.0.5`, Babylon.js `8.15.1`, and TypeScript
`5.8.3` resolved in the source checkout. Repository versions override generic
skill defaults.

Phase 16 reconfirmed the unchanged starting tree and fast evidence:

- `npm test -- --watch=false`: 282 tests passed in real Chrome.
- `npm run capabilities:check`: 91 elements, 84 style fields, 62 DOM fields,
  and 82 evidence references are current.
- `npm run examples:check`: ten translations are current (seven parity-backed,
  three focused inline).

The exact Phase 15 final parity evidence on this unchanged starting commit is:

| Metric | Baseline |
| --- | ---: |
| Fixtures / renders / viewports | `155 / 522 / 3` |
| Median SSIM | `0.9900079622614616` |
| Minimum SSIM | `0.9501815836061078` |
| Edges within 2 px | `0.9998168050806058` |
| Maximum edge error | `3.99209364194121 px` |
| Exact required text | Yes |
| Runtime clean | Yes |
| Completion thresholds | Met |

The final Phase 16 release run must independently re-establish the full matrix;
the starting scorecard is not a substitute for final execution.

## Planned increments

1. Contract, clean baseline, current architecture audit, and evaluation plan.
2. Standard skill initialization, triggering metadata, and concise router.
3. Architecture, subsystem navigation, diagnosis, implementation, and test
   selection references.
4. Application-skill cooperation, canonical evidence synchronization, and
   deterministic cross-skill validation.
5. Public API, plugin, Angular/Babylon lifecycle, parity, and release guidance.
6. Twelve independent forward-test categories and evidence-led corrections.
7. Final release matrix, exact parity evidence, project handoff, and clean-tree
   audit.

## Explicitly deferred

- Implementing every future renderer feature or refactoring the whole renderer
- Dynamic plugin discovery or installation, marketplaces, and hot loading
- Plugin permissions or security sandboxing
- A dirty-subtree renderer rewrite or a general CSS engine
- Framework-neutral adapters or a replacement dependency-injection system
- A Babylon abstraction or Babylon.js major-version upgrade
- Threshold reductions, fixture removal, or reference-output changes used only
  to conceal a regression

Small general fixes found during evaluation may be accepted only when bounded,
well evidenced, and directly useful to proving the maintainer workflow.

## Evidence log

### Increment 0: contract and baseline

Status: complete in the first Phase 16 commit.

- Read the Phase 16 goal, skill-creation guidance, Angular DI/SSR/testing
  guidance, Babylon Angular/resource guidance, and the complete Phase 15
  application-skill router.
- Verified the clean `a64e323` starting commit and installed project versions.
- Reconfirmed all 282 unit tests and both checked compatibility sources.
- Audited the public library, internal renderer-service, parity-fixture, packed
  consumer, documentation, and existing skill file surfaces to seed the
  architecture work without treating historical plans as current truth.

### Increment 1: initialized skill and trigger boundary

Status: complete in the second Phase 16 commit.

- Initialized `.agents/skills/astylarui-maintainer` with the standard
  skill-creation script, `references` and `scripts` resource directories, and
  generated `agents/openai.yaml` metadata.
- Replaced the scaffold with a 93-line evidence-first router covering case
  establishment, classification, proof before implementation, owning-boundary
  fixes, observable-contract synchronization, proportional verification, and
  bounded commits.
- The trigger covers the named core, public API, packaging, parity, evidence,
  and downstream-skill surfaces while excluding ordinary application creation.
- The standard `quick_validate.py` validator passes and the skill contains no
  placeholders or unfinished scaffold text.

### Increment 2: architecture and maintenance navigation

Status: complete in the third Phase 16 commit.

- Added progressive architecture, subsystem, and maintenance-workflow
  references with tables of contents and stable source paths/symbols rather than
  fragile line-number descriptions.
- Mapped the package root through `Astylar`, per-surface child injectors, the
  private renderer, document/plugin preparation, render sessions, visual plans,
  resource transactions, the DOM-style renderer, runtime adapters, settlement,
  and disposal.
- Routed validation, cascade/default/media, intrinsic/Flex/Grid/table layout,
  paint/text/assets/clipping, positioning/stacking/scrolling, controls/events/
  semantics, reconciliation/resources, and plugin defects to their owning files
  and closest proof.
- Added classification, minimal paired reproduction, test ownership,
  implementation-boundary, proportional-gate, and pre-commit review guidance.
- Revalidated the skill and confirmed all three references are directly linked,
  structured for progressive loading, and contain no placeholder content.

### Increment 3: application-skill cooperation and validation

Status: complete in the fourth Phase 16 commit.

- Added a first-class two-skill protocol covering trigger ownership, public
  reproduction intake, developer-skill use during maintenance, canonical-source
  update order, generated-reference synchronization, evidence-led procedural
  improvements, metadata changes, and joint verification.
- Replaced the developer skill's “future maintainer” handoff with a live link to
  the repository `astylarui-maintainer` skill while preserving its strict
  public/private boundary.
- Split named developer reference/check and maintainer check scripts while
  retaining the Phase 15 `skill:references:*` compatibility aliases. The root
  `npm run skill:check` now validates both skills in sequence.
- Added deterministic maintainer validation for metadata, UI strings, links,
  unfinished content, required classifications/workflows/safeguards, trigger
  boundaries, important paths and package scripts, application package-root
  imports, and the developer handoff/freshness procedure.
- Both standard validators and the combined repository check pass: 119
  developer `SKILL.md` lines, eleven synchronized sources, 105 public exports,
  ten translations, 110 maintainer `SKILL.md` lines, and four maintainer
  references.
- Confirmed the combined check rejects a deliberately altered generated
  `html-css.md` reference with expected/received SHA-256 values; restored the
  file and reconfirmed both the combined check and legacy freshness alias pass.

### Increment 4: public contracts, lifetime ownership, and release acceptance

Status: complete in the fifth Phase 16 commit.

- Added progressive references for the root-only installed-package boundary,
  explicit compatibility decisions, packed-consumer proof, Angular-native
  plugin registries, persisted metadata, recovery, pure migrations,
  invalidation, and the trusted-code boundary.
- Added Angular browser/SSR, per-surface injector, render-session settlement,
  generation/surface ownership, cancellation, late-completion, diagnostic, and
  resource plateau/final-zero guidance grounded in the current implementation.
- Added parity fixture authorship, focused diagnosis, exact enforced
  thresholds, complete release matrix, metric reporting, documentation, and
  clean-worktree requirements.
- Extended deterministic validation so all seven maintainer references are
  present and directly linked and the new plugin, lifecycle, parity, and
  package-proof contracts remain represented.

### Increment 5: independent forward evaluation

Status: complete in the sixth Phase 16 commit.

- Twelve fresh agents received isolated worktrees, the committed maintainer
  skill, and raw requests without expected classifications, causes, patches, or
  prior conclusions.
- Every required category passed, including compiling layout/lifecycle/public-
  API/capability changes, browser parity diagnosis, packed consumer and SSR
  proof, public reproduction handoff, cross-skill synchronization, and ordinary
  application routing.
- FT-01 exposed an over-broad same-reference update statement. FT-11
  independently proved the direct-host versus Angular-input boundary; canonical
  reconciliation/compatibility guidance and the developer skill were corrected
  and regenerated in canonical-first order.
- Full raw requests, classifications, before/after metrics, commands, results,
  limitations, and the disposition of disposable changes are recorded in
  [`forward-tests-v16.md`](forward-tests-v16.md).

### Increment 6: release acceptance and handoff

Status: complete in the final Phase 16 commit.

The Windows evaluation-worktree cleanup removed the shared generated dependency
cache through a directory link. No tracked source or Git history was affected.
`npm ci --no-audit --no-fund` restored all 684 packages from `package-lock.json`
before the release matrix; the remaining evaluation worktrees and registrations
were removed.

Final commands and results on the real `more-html` branch:

- Standard `quick_validate.py` for both skills: passed twice with `Skill is
  valid!`.
- `npm run skill:check`: passed; the developer skill has 124 router lines,
  eleven current sources, 105 root exports, and ten translations; the maintainer
  skill has 119 router lines and seven references.
- `npm run capabilities:check`: passed at 91 elements, 84 style fields, 62 DOM
  fields, and 82 evidence references.
- `npm run examples:check`: passed at ten translations (seven parity-backed,
  three focused inline).
- `npm test -- --watch=false --progress=false`: all 282 Chrome 151 tests passed.
- `npm run build:lib`: passed.
- `npm run build`: passed with browser/server output and two prerendered routes.
  The only warnings are the existing initial bundle budget (`6.68 MB` against a
  `2.00 MB` budget) and `src/app/app.scss` (`4.59 kB` against `4.00 kB`).
- `npm run consumer:check`: passed from a fresh packed, non-symlink install;
  415 files, browser/server output, one prerendered route, and 3/3 real-Chrome
  tests. Its independent install resolved Babylon.js `8.56.2`; only existing
  transitive npm deprecation notices were emitted.
- `npm run parity:check` with no fixture filter: passed all enforced thresholds
  with no runtime errors.

Final parity evidence generated at `2026-08-20T14:27:11.214Z`:

| Metric | Phase 16 final |
| --- | ---: |
| Fixtures / renders / viewports | `155 / 522 / 3` |
| Median SSIM | `0.9900079622614616` |
| Minimum SSIM | `0.9501815836061078` |
| Edges within 2 px | `0.9998168050806058` |
| Maximum edge error | `3.99209364194121 px` |
| Exact required text | Yes |
| Runtime clean | Yes |
| Completion thresholds | Met |

The result exactly reproduces the recorded Phase 15 aggregate on the unchanged
renderer. No threshold, fixture, manifest, or browser-reference truth changed
in Phase 16.
