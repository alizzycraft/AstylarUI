# Browser parity and release acceptance

Use this reference for observable renderer changes, fixture work, parity
diagnosis, and Phase or release completion. The browser reference is the
comparison truth; Astylar's output is the implementation under test.

## Contents

- [Fixture contract](#fixture-contract)
- [Focused diagnosis](#focused-diagnosis)
- [Enforced acceptance](#enforced-acceptance)
- [Release matrix](#release-matrix)
- [Evidence and handoff](#evidence-and-handoff)

## Fixture contract

A fixture defines equivalent HTML/CSS and Astylar `SiteData`, its viewports and
state sequences, and explicit expected behavior. Register it in both
[`src/parity/fixtures/index.ts`](../../../..//src/parity/fixtures/index.ts) and
[`public/parity/fixtures.json`](../../../..//public/parity/fixtures.json). Keep
IDs, viewport coverage, dynamic/interaction step counts, semantic targets, and
authored values synchronized.

Prefer the smallest fixture that isolates a general rule. Include ordinary
composition coverage when a primitive passes alone but may interact with
nesting, overflow, transforms, responsive evaluation, controls, or dynamic
updates. Reference and Astylar inputs must remain genuinely equivalent; do not
edit reference markup merely to imitate an implementation limitation.

For interaction work, drive the paired surfaces with the same real Playwright
pointer and keyboard actions. Use `enforcedStyleProperties` for computed paint
that must match exactly after normalization; border proofs should name every
relevant side width, color, and style plus radius rather than relying on a
screenshot scalar. Use `textSelectionIds` for selectable non-control text.
Interaction reports always record the effective pointer cursor and control
caret/highlight state for diagnosis. Declare `enforcePointerCursor` when cursor
parity is part of the fixture contract, and list controls in
`controlVisualStateIds` when selection direction plus visible caret/highlight
ownership must match. `textSelectionIds` compares document-text selection text,
offsets, direction, collapse, and highlight state. A collapsed control selection
has no meaningful direction and is normalized to `none`.

Expanded native select pixels and its transient active-option presentation are
operating-system UI, not inspectable authored browser DOM. Prove that boundary
through the native control's focus, expanded state, committed value/index,
keyboard/pointer event order, dismissal behavior, final closed paint, and the
Astylar popup's exact observer/resource ownership. Do not invent a browser
active-option field or replace the native reference with custom markup merely
to make internal popup pixels inspectable.

## Focused diagnosis

Use `ASTYLAR_PARITY_FIXTURE=<id> npm run parity` to shorten investigation after
the failure exists in the complete manifest. Inspect generated screenshots,
geometry, computed style, text, semantics, page errors, renderer diagnostics,
viewport metadata, and sequence steps. A screenshot mismatch can originate in
layout, text metrics, paint, clipping, camera/surface setup, readiness, or stale
resources; similarity alone does not identify the owner.

Repeat a surprising failure before changing code, particularly for delayed
assets or a catastrophic capture. Compare a fresh render with update/resize
sequences where relevant. Keep the failing general fixture while implementing
the narrowest owning-boundary fix.

For fast interaction artifacts such as hover, active press, caret placement,
selection, and popup transitions, capture after every action boundary and
inspect the structured report as well as the screenshot. A screenshot can miss
a transient state or show similar pixels while cursor, direction, ownership,
or cleanup is wrong.

A focused run is diagnostic evidence only. It cannot establish the aggregate
median or prove that other fixtures did not regress.

Application benchmarks are valid diagnostics when their source provenance and
test-state adapter are pinned and offline-deterministic. Record browser version,
viewport/DPR, font readiness, capture bounds, settlement, runtime errors,
geometry, text, initial visibility, clipping owners, scroll ownership/extents,
bottom/right reachability, screenshot similarity, and local raster evidence.
Use identified typography and one-pixel-border crops with a synthetically
calibrated edge/gradient metric; large flat backgrounds can hide blur in a
whole-page scalar. A report command may intentionally succeed while calibrated
visual targets remain unmet, but missing evidence, malformed reports, runtime
errors, or nondeterminism must fail. Promote such a benchmark to release
enforcement only after every declared state, viewport, and DPR passes unchanged
targets.

## Enforced acceptance

[`tests/parity/run-parity.mjs`](../../../..//tests/parity/run-parity.mjs) is the
authoritative harness. Its `minimumMedianSsim` and related current enforced
thresholds are:

| Measure | Requirement |
| --- | ---: |
| Edge tolerance | 2 px |
| Maximum edge error | 5 px |
| Edges within tolerance | at least 0.95 |
| Per-result screenshot SSIM | at least 0.95 |
| Median screenshot SSIM | at least 0.98 |
| Fresh/update geometry tolerance | 0.5 px |

Acceptance also requires matching text, styles and requested semantics, no
reference or Astylar page/report runtime errors, and every result meeting its
geometry constraints. Run `npm run parity:check` without a fixture filter for
release evidence and report exact fixture, render-result, and viewport counts,
minimum and median SSIM, aggregate edge ratio, maximum edge error, text/runtime/
semantic status, and threshold status.

The pinned TTS application benchmark is also enforced release evidence. Run
`npm run tts-parity:check` without changing its reference or calibrated targets;
it requires all declared states, viewports, and DPR profiles to pass geometry,
visibility, scrolling/reachability, exact visible text, local sharpness, SSIM,
runtime, completeness, and repeatability. Use `npm run parity:release:check` to
run the unfiltered fixture corpus and this application gate sequentially.

Never weaken a threshold, delete or hide a fixture, filter the release run,
change reference truth to match Astylar, omit an error, or broaden a capability
claim to obtain green output. A legitimate metric change follows from a tested
general implementation change and is recorded even when it is a small decline.

## Release matrix

Run focused checks during each bounded increment. Once all work is integrated,
run this complete matrix from a clean dependency state appropriate to the
project:

1. Standard validator for each repository skill and `npm run skill:check`.
2. `npm run capabilities:check` and `npm run examples:check`.
3. `npm test -- --watch=false`.
4. `npm run build:lib` and `npm run build`.
5. `npm run consumer:check` for a fresh packed installation, browser tests, and
   browser plus SSR output.
6. `npm run parity:release:check` with no diagnostic fixture environment
   variable. This runs both `parity:check` and `tts-parity:check`; record each
   constituent result separately.
7. `git diff --check`, documentation review, and `git status --short`.

Run build/package checks in a sequence that avoids concurrent writers to
`dist`. Treat new warnings as failures until understood. Record existing
accepted Angular budget or CommonJS warnings exactly; do not allow their
existence to excuse a new warning.

## Evidence and handoff

Update the current parity scorecard as work proceeds, including baseline,
bounded commits, commands, results, failures, corrections, forward-test
evidence, final metrics, accepted warnings, and remaining limitations. Update
the root README, project status, compatibility/plugin/reconciliation docs, and
the developer skill when their observable claims or instructions changed.

Before each logical commit inspect the scoped diff, run `git diff --check`, and
run its focused proof. Before completion inspect the whole branch diff from the
recorded starting commit, verify all intended commits exist, and leave no
generated artifacts or unrelated edits in the worktree. A green check without
an auditable command/result record is insufficient release evidence.
