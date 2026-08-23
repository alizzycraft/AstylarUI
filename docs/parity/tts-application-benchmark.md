# TTS application parity benchmark

The offline application benchmark compares the AstylarUI speech demo with a
repository-owned presentation adapter derived from
`https://github.com/alizzycraft/ai-tts-mp3` at pinned commit
`35695edc53a5d848dd60255b902b6a1986e809a5`. Detailed source provenance and
intentional adaptations are recorded in
`tests/tts-parity/reference/PROVENANCE.md`.

## Commands and modes

- `npm run parity:harness:check` validates custom application viewport profiles,
  visibility/scroll primitives, and synthetic static/interaction raster
  calibration.
- `npm run tts-parity:report` rebuilds the local demo, captures all states and
  profiles, and succeeds when complete deterministic evidence was produced. It
  reports visual targets honestly but does not enforce them.
- `npm run tts-parity:check` uses the same evidence and enforces the immutable
  acceptance configuration in `tests/tts-parity/benchmark.config.mjs`.
- `npm run parity:release:check` runs the unfiltered fixture corpus followed by
  the enforced TTS application benchmark. It is the combined visual release
  gate; neither constituent command may use a diagnostic fixture filter.
- `node tests/tts-parity/run-tts-parity.mjs --interactions-only --skip-build`
  runs only the application interaction matrix against an already-built demo.
  Set `ASTYLAR_TTS_INTERACTION=<scenario-id>` only for focused diagnosis; never
  use that filter for release evidence.

Phase 19 promoted the enforced command after every declared state, viewport,
and DPR profile passed the unchanged calibrated targets. Missing measurements,
runtime errors, malformed artifacts, capture-size differences, font-readiness
failures, or nondeterministic repeat captures fail both modes. A poor fidelity
score alone fails only enforcement.

The static application thresholds are: maximum geometry edge error `4px`, at least
`95%` of edges within `2px`, screenshot SSIM at least `0.965`, gradient-energy
retention at least `0.82`, local edge alignment at least `0.82`, gradient RMSE
at most `0.12`, and at most `1px` of incidental scroll extent. Visibility and
scroll ownership must match exactly.

Phase 21 adds an interaction-local contract: SSIM at least `0.74`, mean RGB
error at most `0.08`, color-edge alignment at least `0.65`, luminance-edge
alignment at least `0.70`, gradient-energy retention at least `0.75`, and
gradient RMSE at most `0.12`. Exact normalized state styles and structured
behavior remain independently enforced, so a small crop cannot pass by merely
being sharp or sharing a flat background.

## Evidence contract

The deterministic states are `initial` and `generated`; generated contains the
representative `hello` speech result. Profiles cover the supplied 1919x870
desktop reference, 1280x800 at DPR 1 and 2, tablet at DPR 1, and mobile at DPR
2. No API, storage, credential, timestamp, audio, or external asset is used.

Each scenario records browser/version, viewport/DPR, state, font readiness,
capture bounds, settlement, runtime diagnostics, element geometry/text,
initial visibility, clipping ownership, scroll ownership/extents/reachability,
ordinary SSIM, and focused raster metrics. It writes `reference.png`,
`astylar.png`, `side-by-side.png`, `overlay.png`, `difference.png`, and focused
crop sheets under `artifacts/tts-parity/<state>/<profile>/`, plus
`latest-report.json` and `latest-summary.md`.

## Interaction matrix

The source-derived matrix runs at the 1919x870 desktop profile at DPR 1 and the
1280x800 profile at DPR 2. It captures every meaningful action boundary for:

- Generate Speech hover, held `:active`, release, and keyboard focus-visible.
- Title-input and editor caret state, forward/backward selection, and selection
  replacement.
- Voice-select open, keyboard commit, pointer commit, Escape, click-away, and
  three repeated dismissal cycles.
- History-search caret/selection and play/download/delete hover.
- Effective cursors, focused identity, exact normalized paint, all relevant
  border sides, focus shadow, geometry, control values/endpoints/direction,
  event state, diagnostics, settlement, and popup resource ownership.

Interaction evidence is stored under
`artifacts/tts-parity/interactions/<scenario>/<profile>/<step>/`. Each measured
step contains full reference/Astylar captures and a padded target crop sheet.
Native select popup pixels and cursor paint are host-platform UI and are not
raster-observable in headless Chromium. Those steps instead enforce native
value/index/events/focus/dismissal plus Astylar popup targeting and cleanup;
the final closed control paint remains locally compared.

Tablet/mobile interaction targets are not declared because the pinned source's
fixed three-column shell clips those controls. Static visibility and clipping
evidence still covers those profiles; the benchmark never attempts to interact
with an off-screen control.

## Sharpness metric

The local metric computes luminance gradients inside identified text or border
crops. It reports the reference/candidate high-gradient energy, retained energy
ratio, one-physical-pixel-tolerant spatial edge alignment, and gradient RMSE.
Acceptance requires all three calibrated bounds. Using the strongest local
gradients prevents a large flat background from dominating the measurement,
while the local alignment tolerance keeps raster phase separate from blur.

Calibration proves exact copies pass while a five-sample text blur and a
softened/displaced one-pixel border fail. The metric is diagnostic rather than
a complete perceptual model: antialiasing color differences can affect it,
off-screen regions cannot be sampled and are reported as non-applicable, and a
high energy ratio alone can be caused by incorrectly sharp noise. Native-scale
crop review, geometry, and edge alignment therefore remain required.

The interaction calibration separately proves an exact crop and a one-pixel
raster-phase change pass, while a wrong hover color, missing focus ring,
four-pixel-shifted ring, and blurred control text fail. Exact state/cursor and
control assertions cover non-raster degradation.
