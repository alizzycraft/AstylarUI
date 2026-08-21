# TTS application parity benchmark

The offline application benchmark compares the AstylarUI speech demo with a
repository-owned presentation adapter derived from
`https://github.com/alizzycraft/ai-tts-mp3` at pinned commit
`35695edc53a5d848dd60255b902b6a1986e809a5`. Detailed source provenance and
intentional adaptations are recorded in
`tests/tts-parity/reference/PROVENANCE.md`.

## Commands and modes

- `npm run parity:harness:check` validates custom application viewport profiles,
  visibility/scroll primitives, and synthetic sharpness calibration.
- `npm run tts-parity:report` rebuilds the local demo, captures all states and
  profiles, and succeeds when complete deterministic evidence was produced. It
  reports visual targets honestly but does not enforce them.
- `npm run tts-parity:check` uses the same evidence and enforces the immutable
  acceptance configuration in `tests/tts-parity/benchmark.config.mjs`.
- `npm run parity:release:check` runs the unfiltered fixture corpus followed by
  the enforced TTS application benchmark. It is the combined visual release
  gate; neither constituent command may use a diagnostic fixture filter.

Phase 19 promoted the enforced command after every declared state, viewport,
and DPR profile passed the unchanged calibrated targets. Missing measurements,
runtime errors, malformed artifacts, capture-size differences, font-readiness
failures, or nondeterministic repeat captures fail both modes. A poor fidelity
score alone fails only enforcement.

The application thresholds are: maximum geometry edge error `4px`, at least
`95%` of edges within `2px`, screenshot SSIM at least `0.965`, gradient-energy
retention at least `0.82`, local edge alignment at least `0.82`, gradient RMSE
at most `0.12`, and at most `1px` of incidental scroll extent. Visibility and
scroll ownership must match exactly.

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
