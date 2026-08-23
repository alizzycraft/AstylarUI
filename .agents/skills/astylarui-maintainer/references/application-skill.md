# Application-Skill Cooperation

Use this reference whenever a core-maintenance case begins or ends at the public
application boundary. Do not copy the application skill's detailed authoring
instructions into the maintainer skill.

## Contents

- Choose the owning skill
- Receive a public reproduction
- Use the developer skill during maintenance
- Synchronize after observable changes
- Improve developer guidance safely
- Verify the two-skill contract

## Choose the owning skill

Use `.agents/skills/astylarui-developer` for:

- creating or converting an Angular application with public AstylarUI APIs;
- translating HTML/CSS intent into `SiteData` and supported styles;
- responsive application composition, events, accessibility, SSR, and assets;
- using or authoring an application-level Angular plugin;
- diagnosing authored input and public lifecycle behavior;
- producing a minimal public reproduction when evidence suggests a core defect.

Use `.agents/skills/astylarui-maintainer` for:

- inspecting or changing private renderer/platform implementation;
- changing document validation, registries, cascade, layout, paint, controls,
  semantics, reconciliation, ownership, settlement, or diagnostics;
- changing public API/package behavior after an explicit compatibility decision;
- adding or changing parity fixtures, measurements, harness behavior, or gates;
- changing canonical compatibility claims or maintaining downstream skill
  evidence after implementation changes.

An ordinary application request stays with the developer skill. A maintainer
may invoke it as a supporting workflow without turning application code into a
core task.

For an existing web application, require the developer workflow to inspect the
authoritative source and preserve its structure, sizing, density, overflow,
responsive rules, fonts, and states. If paired application evidence still
differs after that audit, classify the delta and reduce probable core defects;
do not use an independently redesigned application as renderer proof.

Require the application workflow to preserve source interaction styling as
well as static layout. A reference conversion must inventory hover, active,
focus/focus-visible, caret, selection, dropdown, cursor, and dismissal behavior
and verify representative states at their actual pointer/keyboard boundaries.
Passing initial/generated screenshots is not evidence for those states.

## Receive a public reproduction

A useful developer-to-maintainer handoff contains:

- package, Angular, Babylon.js, browser, and host versions;
- package-root imports and the smallest complete host/mount setup;
- serializable `SiteData`, stable authored IDs, and render options;
- equivalent HTML/CSS when browser behavior is claimed;
- viewport/canvas dimensions and responsive sequence where relevant;
- expected versus actual geometry, paint, text, state, semantics, or lifecycle;
- diagnostics and exact reproduction/settlement steps;
- the capability-catalog classification and evidence used;
- disclosed unsupported declarations or application-level alternatives already
  considered.

Re-run or reduce the case before editing private services. If the reproduction
uses a deep import, internal inspection symbol, mesh mutation, mutable nested
document update, or unowned surface/resource, repair the public case first.

## Use the developer skill during maintenance

Consult or invoke the developer skill to:

1. Validate that the report uses supported element/style/value families.
2. Translate a minimal browser reference into representative public `SiteData`.
3. Determine whether supported composition or a public plugin already expresses
   the intent.
4. Produce a clean consumer case that can survive package installation.
5. Review a proposed API or core behavior from the application author's point
   of view.
6. Update a public example after implementation and canonical evidence agree.

Do not use the developer skill as evidence that private implementation is
correct. Its role is to establish public intent and supported use; core tests
and parity evidence prove the implementation.

## Synchronize after observable changes

Update in this order:

1. Implementation and the failing/now-passing focused proof.
2. Public types/exports, diagnostics, package consumer, and version decision if
   the public contract changed.
3. `docs/compatibility/html-css.md` for the human classification and constraints.
4. `docs/compatibility/capabilities.json`, including authoritative-source
   fingerprints and executable evidence.
5. `docs/compatibility/examples/manifest.json` when application authors need a
   new or changed translation pattern.
6. Canonical `docs/plugins.md` or `docs/reconciliation.md` when those contracts
   changed.
7. Run `npm run capabilities:check` and `npm run examples:check`.
8. Run `npm run skill:developer:references:sync` to regenerate portable copies.
9. Review the generated diff; never hand-edit a generated reference as the
   source of truth.
10. Run `npm run skill:check` to validate freshness and both skill boundaries.

The developer reference manifest records the AstylarUI version and SHA-256 of
eleven canonical sources/bundles. `sync-references.mjs --check` must fail when a
canonical source changed without regeneration or a bundled copy was edited.

## Improve developer guidance safely

Edit `astylarui-developer/SKILL.md` or its authored workflow references only
when evidence changes how application agents should act. Examples include:

- a newly supported public feature changes the preferred translation;
- an API is added, replaced, or deprecated;
- lifecycle, settlement, SSR, event, ownership, or plugin procedure changes;
- an evaluation reveals a misleading classification or unsafe application
  pattern;
- the application/core trigger boundary changes.

Do not edit procedural guidance merely because source filenames or private
implementation changed. Do not broaden a claim based on an implementation path
alone. Require typed/public evidence and executable proof.

When trigger meaning changes, regenerate or update
`astylarui-developer/agents/openai.yaml` and verify its default prompt still
selects application work. Keep the description explicit that core renderer and
parity-harness maintenance is excluded.

When an independent evaluation exposes a weakness, record the raw request,
incorrect or incomplete behavior, correction, and fresh rerun in the current
scorecard. Do not teach the skill the literal expected answer to one test.

## Verify the two-skill contract

Run:

- `npm run skill:developer:references:check`
- `npm run skill:developer:check`
- `npm run skill:maintainer:check`
- `npm run skill:check`
- the standard `quick_validate.py` validator separately for each skill

The combined check must prove:

- both metadata descriptions select their intended side of the boundary;
- developer guidance links to the live maintainer skill;
- maintainer guidance names the developer skill's reproduction and sync roles;
- canonical compatibility changes cannot leave portable application evidence
  stale;
- consuming examples use only the `astylarui` package root;
- all local links, important repository paths, and named package scripts exist;
- neither skill contains placeholder or contradictory threshold guidance.
