# Phase 21 scorecard: TTS application interaction parity

Starting commit: `e76e17a`

## Outcome

Phase 21 extends the pinned AI-TTS-MP3 benchmark from 10 static captures to a
source-derived application interaction matrix. The final enforced interaction
run passes 60/60 action-boundary captures across the 1919x870 DPR-1 and
1280x800 DPR-2 profiles. The existing static `initial` and `generated` states
remain part of the unfiltered TTS release command.

No OpenAI credential file was read and no OpenAI API request was made. All
speech generation remained mocked; the packed demo check independently
reported zero live API calls.

## Baseline and classification

The first diagnostic run passed 42/62 captures. The failures separated into:

- incomplete source adapter/application hover, focus, cursor, and select paint;
- missing local/exact interaction detection in the application harness;
- core pointer fallback, pseudo-cascade, focus-modality, controlled-focus,
  select-keyboard, selection-direction, and rebuild-state defects;
- native-select assumptions that did not match Chromium behavior.

Direct Chromium measurement established that `ArrowDown` on the opened native
select commits the next option and closes the popup. The redundant post-commit
Enter step was removed because it began a new interaction rather than proving
the commit. The resulting declared matrix contains 60 captures.

## Declared matrix

| Scenario | Captures per two profiles | Evidence |
| --- | ---: | --- |
| Generate pointer | 6 | Hover, held active, release, paint, transform, cursor |
| Generate keyboard focus | 2 | Focused identity and visible focus ownership |
| Title caret | 2 | Focus, value, collapsed selection, caret, focus paint |
| Editor selection/edit | 8 | Caret, forward/backward direction, replacement |
| Voice keyboard | 4 | Open, ArrowDown commit, value/index/events/focus/cleanup |
| Voice pointer | 4 | Open, Coral pointer commit, final closed paint |
| Voice dismissal | 24 | Escape and click-away across three repeated cycles |
| History search | 4 | Caret, forward selection, focus paint |
| History actions | 6 | Play, download, and delete hover paint/cursor |

Tablet/mobile interactions are non-applicable because the pinned source's fixed
three-column shell clips the controls. Their static visibility/clipping evidence
remains enforced.

## Detection and calibration

Each interaction step records full and padded local captures, target geometry,
exact normalized relevant paint, all relevant border sides, focus shadow,
cursor, focused/hovered/pressed identity, value/index, selection endpoints and
direction, visible focus/caret/selection ownership, events, diagnostics,
settlement, and resource state.

The calibrated local thresholds are SSIM `>= 0.74`, mean RGB error `<= 0.08`,
color-edge alignment `>= 0.65`, luminance-edge alignment `>= 0.70`, retained
gradient energy `>= 0.75`, and gradient RMSE `<= 0.12`. Synthetic tests prove:

- exact copy and one-pixel raster phase pass;
- wrong hover color fails;
- missing and four-pixel-shifted focus rings fail;
- blurred control text fails.

Exact state/style/control assertions independently fail cursor, selection, or
dropdown degradation that may not materially change a raster.

## General corrections

- Preserve text-selection direction through semantic synchronization.
- Distinguish pointer focus from keyboard focus-visible and retain modality
  through controlled updates.
- Resolve the nearest visible Babylon fallback pick for small nested actions.
- Apply live hover state and specificity/source-order-correct pseudo cascades.
- Render simple authored focus box shadows as owned focus-ring resources.
- Match native immediate expanded-select keyboard commit behavior.
- Preserve stable focused non-text controls when Angular updates authored value.
- Reapply preserved hover/active paint to replacement meshes after a rebuild.

Each core correction has focused unit evidence; the application benchmark
proves the composed public behavior.

## Verification evidence

- Focused core suites: 71/71 passed; the rebuild-state runtime suite passed
  26/26.
- `npm run parity:harness:check`: 19/19 passed, including six interaction
  calibration cases.
- Unfiltered interaction-only enforcement: 60/60 passed; minimum raw local
  SSIM was `0.526838`. That minimum belongs to a browser UA focus-ring step
  accepted through exact focus ownership; ordinary authored local crops use the
  calibrated scalar/edge/sharpness thresholds.
- `npm run tts-demo:check`: passed with 419 packed files, 23/23 demo tests, a
  production build, and 0 live API calls.

The final unfiltered general parity, static-plus-interactive TTS release run,
full unit/build/capability/example/skill matrix, and their exact aggregate
metrics are recorded in the final Phase 21 handoff commit.

## Platform boundary

Native expanded-select pixels and pointer paint are operating-system UI and are
not observable in headless Chromium. The benchmark does not replace them with
fake DOM. It enforces native focus, value/index, input/change behavior and
dismissal, plus Astylar popup targeting, final closed paint, observer/resource
cleanup, and three-cycle repeatability.

## Phase 21 commits

- `c2c675c` - `fix(semantics): preserve text selection direction`
- `6e8597b` - `fix(interaction): align focus hover and select behavior`
- `e10fed6` - `fix(interaction): restore pointer paint after rebuild`
- `39bdabc` - `test(parity): enforce TTS application interactions`

The documentation and skill synchronization commit finalizes this scorecard.
