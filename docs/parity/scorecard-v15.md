# Phase 15 AstylarUI Application-Development Skill

Phase 15 packages the public AstylarUI application-development contract as a
repository-owned agent skill. It lets an agent translate ordinary HTML, CSS,
Angular, and web-development intent into supported AstylarUI applications
without reverse-engineering the renderer or claiming browser features that the
current public surface does not implement.

This scorecard is the implementation contract and evidence log. Work is
delivered as bounded commits and must preserve the Phase 14 compatibility and
parity baselines.

## Completion contract

- The repository contains a valid `astylarui-developer` skill at
  `.agents/skills/astylarui-developer`. The plural `.agents/skills` convention
  is used because `.agent` contains only an empty legacy workflow directory and
  no competing repository skill convention exists.
- The skill triggers for AstylarUI application creation, HTML/CSS conversion,
  responsive layout, Angular integration, interaction and accessibility,
  application-level plugins, application diagnosis, review, and testing.
- The skill explicitly excludes core renderer, registry, layout, paint, parity
  harness, and internal architecture changes. A probable core defect produces a
  public-API minimal reproduction for the future Phase 16 maintainer workflow.
- Every compatibility claim follows the checked `direct`, `compatible`,
  `different`, `unsupported`, or `plugin` taxonomy and can be traced to the
  Phase 14 human contract, capability catalog, verified translations, public
  package types, or package-boundary consumer proof.
- The skill works from a consuming Angular application, uses package-root
  imports only, and handles skill/package version disagreement explicitly.
- Compatibility material needed outside this source checkout is bundled from
  authoritative repository inputs through a deterministic sync/freshness path;
  it cannot drift as an unchecked second source of truth.
- `SKILL.md` remains a concise procedural router. Detailed translation,
  Angular/Babylon lifecycle, plugin, diagnosis, and verification material uses
  directly linked progressive-disclosure references. The folder contains no
  auxiliary README, install guide, changelog, or placeholder content.
- Deterministic validation covers skill metadata, UI metadata, references,
  bundled-source freshness, public symbols, catalogued element/style names,
  package-root imports, forbidden private guidance, and unfinished content.
- Ten independent forward-test scenarios pass without leaked expected answers:
  compatibility lookup, responsive app creation, HTML/CSS conversion, Angular
  state and accessible controls, application plugin authoring, intentional
  difference diagnosis, unsupported behavior, flawed-application review,
  probable core-defect handoff, and a negative-trigger maintenance request.
- The standard skill validator, skill-specific checks, Phase 14 catalog/example
  gates, 282 repository tests, both builds, packed-consumer acceptance, and the
  full parity harness pass. Final documentation records exact evidence and the
  worktree is clean.

## Public application boundary

The skill teaches only the root `astylarui` package contract. Its primary host
patterns are the SSR-safe `AstylarSurfaceComponent` and, when a host must own a
canvas directly, injected `Astylar.mount()`. Application state produces new
serializable `SiteData`; updates use `surface.update()`, readiness uses
`surface.whenSettled()`, viewport changes use `surface.resize()`, and the owner
disposes the complete surface.

Angular is the platform foundation. Application services use normal Angular
signals and DI. Each Astylar mount creates a surface-owned child injector and
isolated plugin/runtime state. Babylon resources created through a public plugin
belong to generation or surface owners; Angular `DestroyRef` alone does not own
scene resources, and DI is not a security sandbox.

The skill may explain public diagnostics and use `surface.scene` where the
documented host contract permits it. It must not use source-tree imports,
internal inspection tokens, renderer services, private registries, or direct
mesh mutation as an application update mechanism.

## Compatibility and portability design

The source repository remains authoritative:

- `docs/compatibility/html-css.md` for the human translation contract;
- `docs/compatibility/capabilities.json` for exact supported public names,
  value families, classifications, alternatives, and evidence;
- `docs/compatibility/examples/manifest.json` for ten verified source pairs;
- `docs/plugins.md` and the packed Angular consumer for plugin behavior;
- `src/lib/index.ts` and generated declarations for the package-root API.

The skill must be useful when copied or installed into a consuming project that
does not contain those repository paths. A deterministic repository script will
generate or verify any compact bundled references and record their Astylar
version/source fingerprints. At use time, an agent must compare the consuming
package version with the bundled contract and qualify or re-establish evidence
when they differ.

## Required workflows

1. **Classify and answer**: identify the installed version, consult exact
   capability evidence, state the classification and constraints, and never
   infer support from web familiarity.
2. **Build from a brief**: translate ordinary web intent into typed `SiteData`,
   styles, Angular state/events, semantic behavior, surface configuration, and
   proportional tests.
3. **Convert HTML/CSS**: inventory structure, selectors, declarations, state,
   assets, and behavior; classify every material feature; preserve intent;
   implement supported translations; and report adaptations or gaps.
4. **Integrate Angular and Babylon**: select component or direct mounting,
   preserve SSR safety and per-surface isolation, use explicit update/readiness/
   disposal boundaries, and keep scene resources owned.
5. **Use or author a plugin**: decide whether a plugin is appropriate, then use
   namespaced contributions, Angular DI, compatibility/schema metadata, pure
   migrations, recovery, async ownership, invalidation, and proportional
   package-boundary tests.
6. **Diagnose and review**: check authored data, cascade/defaults, layout,
   responsiveness, typography/paint, interaction/semantics, async settlement,
   identity/reconciliation, isolation, ownership, package imports, and SSR.
7. **Verify and hand off**: choose focused checks, compare browser/Astylar output
   when needed, and stop at a public minimal reproduction when evidence crosses
   into the Phase 16 maintainer boundary.

## Forward-test contract

Each scenario is run by a fresh agent or isolated task with only the completed
skill and a realistic raw request. Expected conclusions are not included in the
test prompt. Disposable projects live outside tracked source and are removed
after evaluation. The scorecard records the prompt identity, evidence, result,
and any skill correction.

| ID | Scenario | Required evidence |
| --- | --- | --- |
| FT-01 | Small HTML/CSS compatibility question | Exact taxonomy/catalog agreement and qualified answer |
| FT-02 | Responsive application from a web brief | Public-root imports, typed output, Angular build |
| FT-03 | Representative HTML/CSS conversion | Complete inventory, honest adaptations, valid output |
| FT-04 | Angular state, events, and accessible controls | Correct update/event/semantic lifecycle |
| FT-05 | Application-level plugin | Namespacing, DI, versioning, ownership, focused proof |
| FT-06 | Intentional browser/Astylar difference | Correct cause and supported alternative |
| FT-07 | Unsupported web feature | No invented support or silent omission |
| FT-08 | Review flawed application code | Finds public-boundary, lifecycle, and fidelity defects |
| FT-09 | Probable renderer defect | Minimal public repro and Phase 16 handoff, no internal edit |
| FT-10 | Core-maintenance request | Negative trigger/boundary response |

An output passes only when its claims agree with the checked contract, generated
code uses the public package and compiles where promised, ownership is correct,
unsupported behavior is explicit, and reference loading is proportional.

## Starting evidence

The clean starting commit is `ec6dc89` (`docs: record phase 14 completion`) on
branch `more-html`. The package is AstylarUI `0.1.0`, with Angular `20.0.6`,
Angular CLI `20.0.5`, Babylon.js `8.15.1`, and TypeScript `5.8.3` resolved in the
source checkout. The published peer ranges are Angular `^20.0.0` and Babylon.js
`^8.0.0`.

The Phase 14 release evidence records passing library/application builds, a
415-file packed consumer with browser, SSR, prerender, and three real-Chrome
tests against independently resolved Babylon.js `8.56.2`, plus the fixed parity
corpus. Phase 15 reconfirmed the unchanged starting tree and:

- `npm test -- --watch=false`: 282 tests passed.
- `npm run capabilities:check`: 91 elements, 84 style fields, 62 DOM fields,
  and 82 evidence references are current.
- `npm run examples:check`: ten translations are current (seven parity-backed,
  three focused inline).

Starting parity metrics from the unchanged Phase 14 freeze are:

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

## Planned increments

1. Contract, clean baseline, destination, public boundary, and evaluation plan.
2. Standard skill initialization, triggering metadata, and concise workflow
   router.
3. Portable authoritative references plus deterministic sync and validation.
4. Application creation, conversion, Angular/Babylon, interaction,
   accessibility, diagnosis, review, and verification workflows.
5. Public application-plugin workflow and Phase 16 boundary guardrails.
6. Ten independent forward tests and evidence-driven corrections.
7. Final release matrix, exact parity evidence, project status, and clean-tree
   audit.

## Explicitly deferred

- The Phase 16 `astylarui-maintainer` skill
- Instructions for modifying renderer internals, core registries, layout,
  paint, reconciliation, or the parity harness
- New rendering capabilities or renderer fixes found while testing the skill
- Dynamic plugin discovery, installation, hot loading, permissions, or
  sandboxing
- Framework-neutral adapters or a custom dependency-injection system
- General CSS parsing or claims beyond the checked compatibility contract

## Evidence log

### Increment 0: contract and baseline

Status: complete in the first Phase 15 commit.

- Read the Phase 15 goal, skill-creation guidance, Angular guidance and relevant
  DI/signals/SSR/testing references, plus Babylon Angular/lifecycle guidance.
- Audited Phase 14 compatibility sources, package metadata, public root exports,
  surface API, document/style types, examples, plugin proof, and test scripts.
- Selected `.agents/skills/astylarui-developer` after finding no existing local
  skill convention and fixed the public/private and Phase 15/16 boundaries.
- Reconfirmed the clean Phase 14 commit, all 282 unit tests, and both checked
  compatibility sources before skill implementation.

### Increment 1: initialized skill and trigger boundary

Status: complete in `6040cf3`.

- Initialized `.agents/skills/astylarui-developer` with the standard
  skill-creation script, an 87-line initial workflow router, and generated
  `agents/openai.yaml` metadata.
- Covered creation, conversion, integration, responsive layout, interaction,
  accessibility, plugins, diagnosis, review, and testing in the trigger while
  excluding renderer/core/parity maintenance.
- Passed the standard `quick_validate.py` validator with no placeholder content.

### Increment 2: portable checked evidence

Status: complete in `2883788`.

- Added deterministic sync/check tooling for eleven authoritative sources:
  compatibility contract/catalog/translations, plugin and reconciliation docs,
  the maintained Angular consumer/plugin/browser proof, and a generated public
  root-export index.
- Recorded normalized source and bundled SHA-256 values plus AstylarUI `0.1.0`
  in `references/source-manifest.json`. Portable link transforms are explicit
  and checked rather than hand-edited copies.
- Added `npm run skill:references:sync`, `npm run skill:references:check`, and
  `npm run skill:check`. Validation covers metadata, links, unfinished content,
  source freshness, root imports, required exports, taxonomy, and inline example
  element/style names.
- Confirmed the freshness check rejects an altered bundled reference with
  expected/received hashes, then regenerates and passes from canonical sources.

### Increment 3: application workflows

Status: complete in `fdf33d8`.

- Added progressive references for compatibility answers, application creation,
  HTML/CSS conversion, responsive authoring, typed interaction/semantics,
  component and direct mounting, SSR, Babylon ownership, diagnosis, review,
  minimal reproductions, and proportional verification.
- Kept `SKILL.md` as a 116-line procedural router. The validator continued to
  pass all eleven synchronized sources, 105 root exports, and ten translations.

### Increment 4: public application plugins

Status: complete in `f1a2c0f`, refined in `c9fa0b1`.

- Added the public application-plugin decision and implementation sequence for
  namespaces, Angular DI, persisted requirements, validation, resource owners,
  tracked async work, invalidation, pure migrations, recovery, SSR, isolation,
  package-boundary proof, and the Phase 16 stop condition.
- Independent plugin output exposed two useful precision gaps. The workflow now
  requires layout plus paint for geometry-changing properties and preservation
  of unchanged plugin-owned fields/extensions during migration.

### Increment 5: independent forward tests

Status: complete.

Three fresh agents received only the completed skill path and raw user requests.
They wrote disposable code under `D:\dev\AstylarUI-phase15-evals`, not the
repository. Expected conclusions and proposed fixes were not provided.

| ID | Reproducible request summary | Outcome and evidence |
| --- | --- | --- |
| FT-01 | “Does AstylarUI support `position: sticky`; how should a persistent scrolling navigation panel work?” | Pass: exact `unsupported` classification, supported separated-scroll/fixed alternatives, and explicit surface sizing. |
| FT-02 | “Build a responsive Angular inventory dashboard with sidebar, header, three cards, searchable table, dialog, 720px breakpoint, keyboard access, and public imports.” | Pass: fresh Angular consumer production build; 5/5 Chrome Headless tests; root-only `astylarui` imports; Angular `20.3.29`, AstylarUI `0.1.0`, independently resolved Babylon `8.56.2`. |
| FT-03 | “Convert a profile card using `min()`, Grid, gradient, media query, and inline `onclick`.” | Pass: preserved `min(90vw, 360px)` intent through width/max-width, structured media bound, typed host event, honest adaptations; strict `ngc` compilation passed. |
| FT-04 | “Create a signal-driven accessible sign-up form with typed input/submit handlers and correct lifecycle.” | Pass: labels, required controls, live region, stable IDs/options, zone re-entry, component ownership, and focused test plan; strict Angular compilation passed. |
| FT-05 | “Create a versioned Angular/Babylon telemetry gauge plugin with async texture and full lifecycle.” | First output compiled but classified geometry as paint-only and dropped unrelated style extensions in migration. After the `c9fa0b1` guidance correction, R2 used `['layout', 'paint']`, preserved unrelated fields, and passed `tsc` with root-only imports. |
| FT-06 | “Explain and replace a missing browser dialog `::backdrop`.” | Pass: correctly classified intentional Babylon paint difference, authored a lower-z fixed sibling backdrop, retained modal semantics, and passed strict Angular compilation. |
| FT-07 | “Port `backdrop-filter` and a CSS transition exactly without a plugin.” | Pass: refused false equivalence, identified both unsupported features, retained immediate supported hover transform, and disclosed the visual/motion differences. |
| FT-08 | “Review deep renderer import, nested document mutation, `onclick` string, root-owned material, and undisposed surface.” | Pass: found all five defects and supplied public immutable/event/ownership alternatives. |
| FT-09 | “A claimed fixed element moves with nested scrolling; fix the renderer now.” | Pass: verified the catalog claim, produced paired public HTML/Astylar reproduction and evidence checklist, and declined the renderer edit at the Phase 16 boundary. |
| FT-10 | “Modify core Grid for subgrid and tune screenshot thresholds.” | Pass: recognized catalogued unsupported core work, declined Phase 15 execution, proposed an honest application approximation and a Phase 16 evidence scope without weakening thresholds. |

Compile-oriented evaluation artifacts all used the public package boundary. The
evaluation explicitly distinguishes compilation from browser/SSR/runtime proof;
the final repository release matrix supplies the latter for the maintained
consumer and renderer.

### Increment 6: final release acceptance

Status: complete.

- `npm run skill:check` passed the skill metadata, reference, freshness, public
  API, taxonomy, package-boundary, and example checks: 118 `SKILL.md` lines,
  eleven synchronized sources, 105 public root exports, and ten verified
  translations.
- The standard skill `quick_validate.py` validator passed. The independent
  compatibility gates also passed with 91 elements, 84 style fields, 62 DOM
  fields, 82 evidence references, and ten translations (seven parity-backed and
  three focused inline).
- `npm test -- --watch=false` passed all 282 repository tests.
- `npm run build:lib` and `npm run build` passed. The application production
  build prerendered two routes; its existing initial-bundle and
  `src/app/app.scss` budget warnings remain accepted warnings.
- `npm run consumer:check` passed from the packed 415-file artifact: the clean
  Angular consumer built successfully and all three real-Chrome tests passed
  against Babylon.js `8.56.2`.
- `npm run parity:check` passed all enforced checks with the exact final metrics
  below.

| Metric | Final Phase 15 result |
| --- | ---: |
| Fixtures / renders / viewports | `155 / 522 / 3` |
| Median SSIM | `0.9900079622614616` |
| Minimum SSIM | `0.9501815836061078` |
| Edges within 2 px | `0.9998168050806058` |
| Maximum edge error | `3.99209364194121 px` |
| Exact required text | Yes |
| Runtime clean | Yes |
| Completion thresholds | Met |

Phase 15 changes application-development guidance and checked portable evidence,
not renderer behavior. The final parity metrics are unchanged from the Phase 14
baseline. The skill now provides an honest public-API handoff when application
evidence indicates a probable core defect; implementing or diagnosing that core
change belongs to the dedicated Phase 16 maintainer skill.
