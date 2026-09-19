# Public range value mapping: native travel versus full control width

The original public range capture now has a raster-backed explanation for its
intermediate value differences. This is an audit finding, not a slider fix or a
claim about every browser/native range theme.

## Measured geometry and independent prediction

In all eight DPR/host-origin/stack-tracing combinations, the native thumb center
reaches **8px at minimum** and **152px at maximum** inside the shared 160px CSS
control width. The endpoint-derived travel span is therefore **144px**. These
centers come from the original PNGs, not a fit to the intermediate value data.
The minimum is observed on the second control and maximum on the first; both
have identical dimensions and ordered declarations apart from position.

The collector measures 64 original reference screenshots: initial and released
states for every one of the 32 public cases. It excludes the central eight CSS
pixels containing the filled track and measures the blue thumb's upper and
lower protrusions. Initial thumb locations independently agree with the
endpoint-derived model within 0.5 CSS pixels of raster rounding. Synthetic
positive/negative controls show that the measurement detects a four-pixel
shift, excludes the filled track and rejects track-only, one-sided or ambiguous
thumb shapes at both DPRs.

Using only those measured endpoints, the model
`clamp((localX - lowCenter) / (highCenter - lowCenter))`, followed by the shared
0–100 domain and step-5 rounding, predicts **all 256 captured native move
values**. The full-control-width model predicts the wrong native value in
**80 of 256 samples**. Examples:

| CSS-local pointer X | Native value / endpoint model | Full-width model / core value without update |
| ---: | ---: | ---: |
| 127.375 | 85 | 80 |
| 44.5 | 25 | 30 |

For all **128 no-update candidate move samples**, the captured Astylar value
matches the full-width model exactly. There are 40 paired value mismatches in
those cases. Update cases remain governed by the separately proven premature
pointer release and are not used as evidence that candidate dragging continues.

## First divergence and ownership

The [original source-bound public proof](material-public-range-drag-audit.md)
already establishes that public event-local X matches the shared CSS coordinates
at both host origins and DPRs. Its served bundle executes `localX / width` in
`InputElementService.setRangeFromPointer`. The source entry is
`src/app/services/dom/input/input-element.service.ts:549`.

`RangeManager.updateVisual` likewise positions its thumb using the full width,
while `createRange` calculates a nonzero thumb size separately. This source
observation does not establish painted candidate thumb bounds: the retained
public candidate screenshots are blank. The subsequent
[passive paint proof](material-public-range-paint-audit.md) establishes opaque
owner-material replacement and reversed active-track/thumb depth ordering.
Native-like presentation and the coplanar unfilled-track GPU mechanism remain
unproved; neither is inferred from pointer-value agreement.

For these captured value samples, the demonstrated divergence is **the travel
geometry supplied to pointer-to-value conversion**, not a CSS-to-Babylon unit
or host-origin error. This narrows the previous unresolved native-metric
question but does not establish a universal native thumb box or default size.

The owning correction belongs in the core range layout/interaction contract:
derive the relevant track/thumb travel geometry in CSS space and use a coherent
contract for pointer mapping and presentation, with final projection kept at
the rendering boundary. Do **not** add a hard-coded 8px Material offset or
change step/domain values to conceal the discrepancy. Determine the intended
native/default/custom appearance contract before choosing general metrics.

## Limits and next discriminating checks

This is a replay of authenticated existing evidence, not a new browser run. It
covers Chromium 152.0.7977.76, its captured blue native theme, 160px horizontal
LTR ranges, DPR 1/2, host origins (0,0)/(64,40), and the sampled pointer paths.
Native endpoint centers are raster measurements, not pseudo-element DOM boxes.

Before implementing a general rule, vary control width and height, native versus
custom thumb appearance, and pointer grab position; check RTL/vertical ranges
and transformed/scrolled containers separately. The captured endpoint model
does not explain overlapping Material thumb selection, the black ring, or blank
core range paint; that last symptom has separate bounded paint-order evidence
linked above. Preserve the separate focus-update/release findings and the
Material half-domain/step/peer-hit-region authoring findings.

Implementation order remains: preserve the native gesture through core focus
synchronization; correct captured release routing; correct core range paint
ownership and establish the CSS-space travel/appearance contract; then re-test
the Material composition with equivalent domain, step, structure and hit-region inputs. None of those
implementation changes are made during this audit increment.

## Evidence and verification

The collector first revalidates the complete original range report, served
bundle inputs, native/public events and all 256 screenshot hashes using the
existing verifier. It then independently decodes the 64 selected PNGs and
checks every native move against the measured travel. The original report
SHA-256 remains
`8c298293efb0e464af4a3ba73bf80055fcbab469c196e666e22b02f17ad85962`.
The new [machine report](material-public-range-travel-audit.json) SHA-256 is
`92b4001a548d913db065251fac3fd03c7ec99c99009488eeeb052ffa1f4941ad`.

```text
node scripts/audit-public-range-travel.mjs
node --test --test-concurrency=1 tests/material-parity/public-range-travel.spec.mjs tests/material-parity/public-range-drag-evidence.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. Independent write-prohibited replay, synthetic raster and
numeric checks, nine changed-original-evidence rejection controls and inventory
checks initially pass **8/8**, exit 0, in **9,928.4679ms**. The combined run with
the three unchanged original range evidence tests passes **11/11**, exit 0,
zero failed/skipped/cancelled/TODO, **11,097.4525ms**.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`public-range-travel-generation.log`, `public-range-travel-verification.log`
and `public-range-travel-combined-verification.log`.

No renderer, plugin, canonical comparison, browser reference, original artifact,
normalizer, classification or visual threshold changed. The audit and its full
enforced verification remain incomplete.
