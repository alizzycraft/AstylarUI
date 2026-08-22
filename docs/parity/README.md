# AstylarUI Parity Harness

The parity harness renders equivalent native HTML/CSS and Astylar `SiteData` in
the same Chromium environment at an 800 × 600 CSS-pixel viewport and DPR 1. It
captures screenshots, element geometry, computed visual styles, text content,
line counts, supported interaction state, and requested browser accessibility
snapshots.

## Run

```bash
npm run parity
```

This starts the Angular development server, launches installed Chrome headlessly,
and writes current artifacts to `artifacts/parity/`. Use `npm run parity:check`
to enforce the current release thresholds across the complete manifest. The
latest accepted corpus size and metrics are recorded in the newest
scorecard; a focused fixture run is diagnostic evidence and is never release
acceptance.

Fixtures default to the deterministic `desktop` profile (`800x600`). A fixture
can set `viewportIds` to any combination of `desktop` (`800x600`), `tablet`
(`640x720`), and `mobile` (`390x844`); each selected profile is measured as a
separate render case while the fixture is counted once.

A fixture can additionally set `responsiveSequence` to drive those named sizes
through the same browser page and Astylar scene. Every settled state is captured
and compared with Chromium and its equivalent fresh render, including live
resource counts.

Fixtures with interaction steps are driven through real Playwright pointer and
keyboard input in the existing native page and Babylon scene. Each step captures
normalized event order, focus, supported control state, effective pointer
cursor, caret/selection visuals, requested non-control text selection,
geometry, text, paint, runtime errors, and Astylar interaction registrations.

Set `ASTYLAR_PARITY_BASE_URL` to measure an already-running server. Set
`ASTYLAR_PARITY_BROWSER_CHANNEL` if the local Chromium channel is not `chrome`.
Set `ASTYLAR_PARITY_FIXTURE` to a fixture ID for a focused diagnostic run; omit
it for every enforcing or completion run.

## Fixture Contract

Each fixture lives under `src/parity/fixtures/` and contains:

- stable ID, category, expected behavior, and measurement element IDs;
- optional expected-absent IDs for behavior such as `display: none`;
- optional exact computed-style properties per element, pointer-cursor
  enforcement, control visual-state owners, and non-control text-selection
  owners;
- native HTML and CSS reference content;
- equivalent Astylar `SiteData` using the same content and style values.

Add the same metadata to `public/parity/fixtures.json` so the runner discovers
the fixture. Keep fixtures small and focused; do not add fixture-specific renderer
logic or mask meaningful screenshot regions.

## Measurements

- Browser border/content boxes come from `getBoundingClientRect()` and computed
  padding/border values.
- Astylar border boxes are projected from Babylon mesh world bounds into canvas
  CSS pixels. Internal renderer dimensions and text-layout metrics are recorded
  alongside them for diagnosis.
- Screenshots use SSIM without broad masks or normalization.
- Fixtures can enforce normalized computed paint exactly. Interactive border
  proofs name all four side widths/colors/styles and radius explicitly.
- Control reports always compare logical selection endpoints and record visual
  diagnostics. Fixtures use `controlVisualStateIds` to enforce direction plus
  owned caret/highlight visuals and `enforcePointerCursor` to enforce the
  effective cursor. Requested document-text selections compare selected text,
  anchor/focus and ordered offsets, direction, collapse, and highlight state.
- Expanded selects compare focus, open/closed state, value/index, events, and
  Astylar popup observer/resource ownership. Native operating-system popup
  pixels are not replaced with custom reference markup.
- Browser page exceptions, missing meshes, timeouts, and non-finite geometry fail
  the parity run.

Generated screenshots and reports are intentionally untracked. Accepted Phase 1
metrics are maintained in `scorecard.md`, completed Application Web Parity v2
results in `scorecard-v2.md`, representative-application parity in
`scorecard-v3.md`, content-driven layout parity in `scorecard-v4.md`, and the
active responsive intrinsic layout and paint-fidelity phase in `scorecard-v5.md`.
Application-grade intrinsic Grid work continues in `scorecard-v6.md`.
Reactive layout and reflow work continues in `scorecard-v7.md`.
Stateful interaction and form parity continues in `scorecard-v8.md`.
Scrolling, pointer selection, and popup interaction parity is completed in
`scorecard-v9.md`. Semantic application behavior and accessibility parity
continues in `scorecard-v10.md`. Incremental rendered-tree reconciliation and
state continuity continue in `scorecard-v11.md`.
Packed-package consumer integration and owned Angular surfaces are completed in
`scorecard-v12.md`. The Angular-native plugin kernel is completed in
`scorecard-v13.md`. Durable plugin documents, recovery, asynchronous ownership,
and the agent-ready compatibility contract are completed in `scorecard-v14.md`.
The application-development skill is completed in `scorecard-v15.md`. The
maintainer skill, its release evidence, and its twelve isolated forward-test
categories are completed in `scorecard-v16.md` and `forward-tests-v16.md`.
Reference-driven application measurement infrastructure is recorded in
`scorecard-v18.md`; the enforced TTS application parity milestone and its final
per-profile evidence are recorded in `scorecard-v19.md`.
Interactive visual-state evidence and document-text selection continue in
`scorecard-v20.md`. Source-derived TTS application interaction parity is
recorded in `scorecard-v21.md`.

The shared authored-ID, positional fallback, compatibility, and replacement
rules are documented in `../reconciliation.md`.
