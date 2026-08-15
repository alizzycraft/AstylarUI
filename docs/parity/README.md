# AstylarUI Parity Harness

The parity harness renders equivalent native HTML/CSS and Astylar `SiteData` in
the same Chromium environment at an 800 × 600 CSS-pixel viewport and DPR 1. It
captures screenshots, element geometry, computed visual styles, text content,
and line counts.

## Run

```bash
npm run parity
```

This starts the Angular development server, launches installed Chrome headlessly,
and writes current artifacts to `artifacts/parity/`. Use `npm run parity:check`
to enforce the final Core Web Parity v1 thresholds; that command is expected to
remain red until the full 40-fixture goal is complete.

Set `ASTYLAR_PARITY_BASE_URL` to measure an already-running server. Set
`ASTYLAR_PARITY_BROWSER_CHANNEL` if the local Chromium channel is not `chrome`.

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
metrics are maintained in `scorecard.md`; active Application Web Parity v2
progress is maintained in `scorecard-v2.md`.
