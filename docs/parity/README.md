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
to enforce the final Core Web Parity v1 thresholds; that command is expected to
remain red until the full 40-fixture goal is complete.

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
normalized event order, focus, supported control state, geometry, text, paint,
runtime errors, and Astylar interaction registrations.

Set `ASTYLAR_PARITY_BASE_URL` to measure an already-running server. Set
`ASTYLAR_PARITY_BROWSER_CHANNEL` if the local Chromium channel is not `chrome`.
Set `ASTYLAR_PARITY_FIXTURE` to a fixture ID for a focused diagnostic run; omit
it for every enforcing or completion run.

## Fixture Contract

Each fixture lives under `src/parity/fixtures/` and contains:

- stable ID, category, expected behavior, and measurement element IDs;
- optional expected-absent IDs for behavior such as `display: none`;
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
continues in `scorecard-v10.md`.
