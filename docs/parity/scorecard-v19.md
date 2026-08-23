# Phase 19 scorecard: enforced AI-TTS-MP3 application parity

Starting commit: `7055713`

Reference: <https://github.com/alizzycraft/ai-tts-mp3> at
`35695edc53a5d848dd60255b902b6a1986e809a5`

## Outcome

Phase 19 replaced the independently composed speech demo with a public-API
AstylarUI translation of the pinned reference application, closed the general
layout and raster gaps exposed by that translation, and promoted the unchanged
Phase 18 TTS thresholds into the release gate. All 10 state/profile scenarios
now pass. No fixture was masked, no threshold was loosened, and no
fixture-specific branch was added to the renderer.

The Phase 18 diagnostic baseline accepted `0/10` scenarios, with minimum SSIM
`0.450062`, maximum edge error `1907.034px`, visibility matching `0/10`, scroll
ownership matching `5/10`, and sharpness passing `0/40`. The enforced Phase 19
result accepts `10/10`, with minimum SSIM `0.967522`, maximum edge error
`1.978px`, visibility, scroll ownership, scroll reachability, and visible text
matching `10/10`, and every applicable sharpness region passing (`36/36`).

## Enforced scenario results

Every row has 100% of measured geometry edges within 2px, matching visibility,
scroll ownership, scroll reachability, and visible text, and passes acceptance.

| State | Capture profile | SSIM | Maximum edge error | Sharpness |
| --- | --- | ---: | ---: | ---: |
| initial | reference-large-dpr1 | 0.990697 | 1.955px | 4/4 |
| initial | smoke-1280-dpr1 | 0.985398 | 1.957px | 4/4 |
| initial | smoke-1280-dpr2 | 0.986968 | 1.978px | 4/4 |
| initial | tablet-dpr1 | 0.981206 | 1.954px | 4/4 |
| initial | mobile-dpr2 | 0.969716 | 1.978px | 2/2 applicable |
| generated | reference-large-dpr1 | 0.985313 | 1.955px | 4/4 |
| generated | smoke-1280-dpr1 | 0.976586 | 1.957px | 4/4 |
| generated | smoke-1280-dpr2 | 0.982399 | 1.978px | 4/4 |
| generated | tablet-dpr1 | 0.967990 | 1.954px | 4/4 |
| generated | mobile-dpr2 | 0.967522 | 1.978px | 2/2 applicable |

The mobile captures intentionally omit the editor-text and workspace-title
sharpness crops because those authoritative fixed-shell regions are outside the
capture. This is recorded as non-applicable rather than passed or failed.

## Acceptance contract

The enforced targets remain the calibrated Phase 18 values:

- SSIM at least `0.965`.
- Maximum geometry edge error at most `4px`, with at least 95% of edges within
  `2px`.
- Gradient-energy retention and edge alignment at least `0.82`, and gradient
  RMSE at most `0.12`, for every applicable sharpness region.
- Incidental scroll extent at most `1px`.
- Exact visibility, scroll ownership, scroll reachability, and visible-text
  agreement.
- Complete runtime, screenshot, measurement, and settlement evidence; an
  infrastructure error is a failure.

`npm run parity:release:check` now runs the general parity suite followed by
the enforced TTS application benchmark.

## Changes driven by the evidence

Application translation work mirrored the pinned three-column shell and its
deterministic initial/generated states, then aligned compact controls, player
height, line boxes, the settings header, history copy, editor gutter behavior,
and the captured reference banner.

General renderer fixes covered device-pixel-ratio-aware rendering, intrinsic
and flex sizing, cross-axis stretching and used-width reflow, automatic
minimums, block margin collapse, inline intrinsic width, asymmetric positioned
edges, typographic and ideographic spaces, logical control raster sizing,
relative font sizes, high-DPR button labels, authored texture colors, select
content, and textarea wrapping/origin. Each general fix was reduced to focused
unit or paired parity evidence before being retained.

Harness changes added exact visible-text and scroll-reachability enforcement,
separated sharpness analysis from the raster phase, tolerated only projected
viewport epsilon, corrected the reference adapter against inspected pinned
source, and promoted the benchmark into release acceptance. Compatibility,
examples, and skill guidance were kept current with the resulting behavior.

## Verification

- `npm run parity:release:check`: passed. General parity covered 164 fixtures,
  533 renders, and 3 viewports; median SSIM `0.9908`, minimum SSIM `0.9523`,
  100% of edges within 2px, maximum edge error `3.99209364194121px`, exact
  text, clean runtime, and complete evidence. The TTS gate passed 10/10 with
  the results above.
- `npm test -- --watch=false`: 316/316 Chrome tests passed.
- `npm run parity:harness:check`: 12/12 Node tests passed.
- `npm run capabilities:check`: current at 91 elements, 84 style fields, 62
  DOM fields, and 82 evidence references.
- `npm run examples:check`: 10 pairs current (7 parity-backed, 3 inline).
- Developer and maintainer skill validation passed: developer skill 132 lines,
  11 sources, 105 exports, and 10 translations; maintainer skill 128 lines and
  7 references.
- `npm run build:lib`: passed.
- `npm run build`: passed and prerendered 2 routes.
- `npm run consumer:check`: packed-package Angular consumer passed 3/3 tests,
  browser build, and SSR/browser resource and lifecycle checks.
- `npm run tts-demo:check`: 22/22 tests, build, prerender, and packed-package
  checks passed with zero live API calls.

The accepted Angular warnings are the existing initial-bundle and
`src/app/app.scss` budgets. Upstream transitive deprecation warnings remain
non-failing. Babylon-backed text is still produced by a different raster path
than browser glyph rendering, but the declared DPR 1/DPR 2 sharpness and SSIM
targets now bound that difference.

No OpenAI credential file was read and no OpenAI API request was made.

## Evidence locations

- Configuration: `tests/tts-parity/benchmark.config.mjs`
- Pinned reference adapter and provenance: `tests/tts-parity/reference/`
- Harness: `tests/tts-parity/run-tts-parity.mjs`
- Machine-readable result: `artifacts/tts-parity/latest-report.json`
- Human-readable result: `artifacts/tts-parity/latest-summary.md`
- Scenario evidence: `artifacts/tts-parity/initial/` and
  `artifacts/tts-parity/generated/`, including reference and Astylar captures,
  side-by-side, overlay, difference, and focused crop artifacts.

## Phase 19 commits

- `2bc82bc` - `test(tts): tolerate projected viewport epsilon`
- `af56f22` - `fix(layout): honor browser intrinsic sizing constraints`
- `8f4d9d1` - `test(tts): enforce text and scroll evidence`
- `023d982` - `fix(rendering): honor device pixel ratio`
- `4c362a7` - `test(tts): align reference adapter with pinned source`
- `72ae20e` - `fix(flex): preserve stretched cross-axis minimums`
- `356cc4e` - `fix(flex): reflow intrinsic text at used width`
- `6b08b38` - `feat(tts-demo): mirror pinned reference interface`
- `6c00c60` - `fix(text): preserve typographic spaces`
- `cd54040` - `fix(flex): measure stretched column contributions`
- `9ccc4d9` - `fix(flex): honor overflowing content minimums`
- `5bd06bf` - `fix(text): wrap at ideographic spaces`
- `3f874cf` - `fix(tts-demo): allow editor gutter shrink`
- `bd02372` - `fix(block): collapse parent and child margins`
- `8d02ecc` - `fix(flex): reconcile grown item minimums`
- `65bac55` - `fix(inline): remove legacy intrinsic width floor`
- `c532664` - `fix(layout): honor asymmetric positioned edges`
- `d58ee20` - `fix(text): preserve logical control raster size`
- `b8aa02d` - `test(parity): separate sharpness from raster phase`
- `e61ecbc` - `fix(tts-demo): align deterministic reference states`
- `625fd94` - `fix(tts-demo): match compact reference controls`
- `cd8267e` - `fix(tts-demo): preserve generated player height`
- `ac4cf11` - `fix(text): resolve relative font sizes from parent`
- `1df0456` - `fix(tts-demo): align generated text line boxes`
- `dda3f0e` - `fix(tts-demo): restore settings header box model`
- `16c84e5` - `fix(button): preserve CSS label size at high DPR`
- `c85e4a3` - `fix(text): preserve authored texture colors`
- `8b58442` - `fix(select): align native control content`
- `e814018` - `fix(textarea): retain narrow wrapped values`
- `998307b` - `fix(tts-demo): align generated history copy`
- `e93423a` - `fix(textarea): align collapsed inline origin`
- `c9b93e7` - `docs(parity): promote TTS benchmark to release gate`
- `9f2d533` - `docs(compatibility): refresh phase 19 fingerprints`
- `e65eb42` - `test(tts-demo): include reference banner region`
- `12e6265` - `fix(flex): clamp automatic minimums by authored width`
- `fa6873f` - `test(parity): align reconciliation border style`
- `5491e97` - `test(consumer): stabilize async cancellation proof`

This scorecard is finalized in the Phase 19 handoff commit.
