# Phase 18 scorecard: reference-driven parity infrastructure

Starting commit: `96672cd`

## Delivered contract

- Pinned, source-inspected AI-TTS-MP3 reference adapter with offline
  `initial` and representative `generated/hello` states.
- Application-owned viewport profiles including 1919x870, 1280x800, tablet,
  mobile, DPR 1, and DPR 2.
- Typed element visibility plus clipping-owner measurements and enriched scroll
  extents/reachability on browser and Astylar parity paths.
- Focused gradient/edge sharpness measurements with four deterministic
  calibration cases.
- Report-only TTS evidence command and a prepared but inactive enforcement
  command/configuration.
- Reference/Astylar, side-by-side, overlay, difference, crop, JSON, and Markdown
  artifacts with strict infrastructure-error and repeatability failure policy.
- Developer and maintainer skill guidance that treats inspected source as
  authoritative and separates geometry, sharpness, visibility, and scrolling
  evidence.

## Initial diagnostic baseline

The first complete report produced 10/10 evidence scenarios and intentionally
accepted 0/10 as visual parity. Minimum SSIM was `0.450062`; maximum measured
edge delta was `1907.034px`; visibility matched in `0/10`; scroll ownership
matched in `5/10`; and focused sharpness targets passed in `0/40`. The extreme
tablet/mobile edge values include authoritative fixed-shell regions that are
off-screen while the independently designed Astylar demo reflows vertically.

The baseline is not hidden and does not fail `tts-parity:report`.
`tts-parity:check` remains expected to fail until Phase 19.

## Phase 19 handoff, in priority order

1. Replace the independent Astylar visual composition with a faithful public-API
   translation of the pinned three-column reference, including 320px side
   panels, fixed-height shell, editor/audio/history structure, and matching
   deterministic content.
2. Correct host/surface height and remove application-level scrolling that is
   absent from the reference; match the reference's actual overflow owners.
3. Match desktop geometry, visibility, panel density, and box model before
   interpreting downstream raster metrics.
4. Match the pinned 768px responsive behavior and prove tablet/mobile clipping
   and reachability rather than substituting a new breakpoint design.
5. Align font stack, sizes, weights, line heights, wrapping, and control text.
6. Reduce remaining text blur through general framebuffer/texture sampling and
   pixel-placement fixes, proven at DPR 1 and 2 with minimal paired fixtures.
7. Reduce one-pixel border softness/alignment through a general border proof.
8. Finish backgrounds, colors, radii, and remaining paint only after geometry
   and raster density are stable.
9. Activate `tts-parity:check` in release acceptance only when every declared
   state/profile passes unchanged calibrated targets.

## Evidence locations

- Configuration: `tests/tts-parity/benchmark.config.mjs`
- Reference/provenance: `tests/tts-parity/reference/`
- Harness: `tests/tts-parity/run-tts-parity.mjs`
- Generated report/artifacts: `artifacts/tts-parity/`
- Metric documentation: `docs/parity/tts-application-benchmark.md`

Command results and final repository-wide acceptance are appended after the
Phase 18 release matrix completes.
