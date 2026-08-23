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

Chromium's operating-system popup behavior is not uniform across the isolated
fixture and the application-shaped reference: the generic expanded-select
proof keeps arrow navigation tentative until Enter, while the application
reference commits ArrowDown immediately. The application keyboard scenario
therefore exercises native closed-select focus/navigation/commit; separate
scenarios retain real open, pointer-choice, Escape, click-away, and popup
lifecycle coverage. The resulting declared matrix contains 60 captures.

## Declared matrix

| Scenario | Captures per two profiles | Evidence |
| --- | ---: | --- |
| Generate pointer | 6 | Hover, held active, release, paint, transform, cursor |
| Generate keyboard focus | 2 | Focused identity and visible focus ownership |
| Title caret | 2 | Focus, value, collapsed selection, caret, focus paint |
| Editor selection/edit | 8 | Caret, forward/backward direction, replacement |
| Voice keyboard | 4 | Keyboard focus, closed-select ArrowDown commit, value/index/events |
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
- Preserve tentative expanded-select arrows with Enter commit while matching
  immediate closed-select keyboard mutation.
- Preserve stable focused non-text controls when Angular updates authored value.
- Reapply preserved hover/active paint to replacement meshes after a rebuild.

Each core correction has focused unit evidence; the application benchmark
proves the composed public behavior.

## Verification evidence

- Focused core suites: 71/71 passed before the final contract correction; the
  rebuild-state runtime suite passed 26/26. The final full unit run passed
  327/327.
- `npm run parity:harness:check`: 19/19 passed, including six interaction
  calibration cases.
- Unfiltered interaction-only enforcement: 60/60 passed; minimum raw local
  SSIM was `0.526838`. That minimum belongs to a browser UA focus-ring step
  accepted through exact focus ownership; ordinary authored local crops use the
  calibrated scalar/edge/sharpness thresholds.
- `npm run tts-demo:check`: passed with 419 packed files, 23/23 demo tests, a
  production build, and 0 live API calls.
- `npm run parity:release:check`: passed. The general suite covered 165
  fixtures / 538 renders / three viewport profiles, with median SSIM `0.9898`,
  minimum SSIM `0.9547`, 100% of measured edges within `2px`, maximum edge
  error `3.9921px`, exact text, clean runtime reports, and every completion
  threshold met. The packed TTS suite retained all 10/10 static scenarios,
  minimum SSIM `0.967522`, maximum geometry edge error `1.978px`, 10/10
  visibility/scroll-owner/scroll-reachability/text matches, 36/36 sharpness
  regions, and 60/60 interaction steps with minimum local SSIM `0.526838`.
- `npm run capabilities:check`, `npm run examples:check`, and
  `npm run skill:check` passed. Both repository skills also passed the standard
  `quick_validate.py` validator.
- `npm run build:lib` and `npm run build` passed. The application build retains
  the existing initial-bundle and `app.scss` size-budget warnings.
- `npm run consumer:check` built the clean packed consumer and passed 2/3
  browser cases. The existing plugin-recovery case again exceeded Jasmine's
  5000ms timeout; this is the same isolated timing failure recorded before the
  Phase 21 changes, not an interaction-parity regression.

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
- `6b4c693` - `docs(parity): require application interaction evidence`
- `0e17f14` - `fix(interaction): preserve browser select and hover contracts`

The final scorecard commit records the release evidence above.

## Post-completion hardening

A manual pass over the packaged TTS demo found four interaction details that the
original matrix did not reject: authored focus shadows were rendered as square
bars around a rounded control, a dark input received a black default caret,
Copy did not transfer visually selected document text, and a card lost `:hover`
when its text child became the pointer target.

The renderer now builds authored focus shadows with the shared rounded-border
geometry, resolves the default caret from the control's text color, handles
document selection through the native `copy` event, and tracks the complete
hover target ancestry. Focused general fixtures exercise native copy in both
selection directions and movement from a parent surface onto nested text. The
TTS title-caret scenario now requires local raster acceptance and exact
focus-radius/caret-color evidence instead of accepting mesh presence alone.

Post-hardening verification passed 331/331 unit tests and 19/19 parity-harness
tests. The unfiltered general corpus passed 165 fixtures / 541 renders with
median SSIM `0.9898`, minimum SSIM `0.9547`, 99.9% of measured edges within
`2px`, maximum edge error `3.9921px`, exact text, clean runtime reports, and all
completion thresholds met. The packed TTS corpus passed 10/10 static scenarios,
36/36 sharpness regions, and 60/60 interaction steps; its minimum static SSIM
remained `0.967522` and minimum interaction-local SSIM remained `0.526838`
under the documented structural UA-focus exception.

The library, root browser/SSR application, and packed external consumer all
built successfully. The first consumer run exposed and the consumer fixture now
closes an existing readiness race by requiring both mounted surface handles.
After that correction, the consumer reached the later delayed-plugin proof and
passed 2/3 browser cases; its asynchronous cancellation counter remained zero,
the same known plugin-timing limitation already recorded above. No OpenAI
credential was read and no live API request was made.

## Second post-completion hardening

A further manual TTS pass exposed five gaps that the first interaction matrix
still did not isolate: blank card padding could resolve to a layout ancestor
instead of the nested interactive card, a focused editor caret retained its
pre-focus color, a zero-blur authored focus halo had square inner artifacts,
scene-selected text did not reliably reach the system clipboard from Ctrl/Cmd+C,
and the translucent fixed selection tint could disappear against some surfaces.

The runtime now searches overlapping eligible descendants when a directly
picked layout ancestor owns interactive children, propagates live pseudo-state
text color into an existing caret material, paints an authored spread shadow as
a rounded silhouette behind the opaque control, writes a scene selection during
the keyboard user activation while retaining the native copy-event path, and
chooses an opaque selection background with at least 3:1 contrast against both
the resolved surface and glyph color. The selection mesh sits behind the glyph
plane, so existing text remains legible.

The TTS matrix adds blank-padding card hover and document selection/copy at both
DPR profiles. It now asserts authored halo radius/color/opacity, editor caret
color, selection contrast metadata, and an exact browser-reference clipboard
payload. Selection raster acceptance is structural until the renderer owns
selected glyph spans: browser-style per-glyph foreground recoloring is recorded
as future work for the next text-paint phase rather than hidden behind a looser
image threshold.

Focused changed suites passed 39/39 tests, the parity harness passed 19/19, the
library build passed, and the complete application interaction matrix passed
66/66 captures with minimum non-structural local SSIM `0.526838` under the
existing UA-focus exception. The repository-wide unit run passed 333/334; the
sole failure is the pre-existing `astylar-isolation` rebuilt-scene readiness
timeout, which also reproduces when that six-test file runs alone and is outside
this interaction-paint change. The full general parity corpus passed all 165
fixtures / 541 renders across three viewport profiles with median SSIM `0.9896`,
minimum SSIM `0.9542`, 99.9% of measured edges within `2px`, maximum edge error
`3.99209364194121px`, exact text, clean runtime reports, and every completion
threshold met. The root browser/SSR build and packed TTS demo check also passed;
the latter contained 419 package files, passed all 23 demo tests, and recorded
zero live API calls.

## Selection paint follow-up

A manual TTS editor pass then showed that control selection geometry was
applying padding twice, leaving only a baseline strip, and that selected glyphs
still retained their normal color. Highlight geometry now stays in the text
mesh's local coordinate system; the control's mesh placement remains the sole
owner of padding. A cropped texture-mask shader repaints only selected glyphs
with a black-or-white foreground chosen against the adaptive highlight, while
preserving the original glyph alpha, kerning, and rasterization.

The application benchmark now treats selection as a paired paint contract. It
requires at least 3:1 highlight-to-surface contrast, 4.5:1 selected-foreground
contrast, a highlight height covering the glyph line, a one-to-one foreground
mesh, and matching foreground pixels in the captured canvas. The textarea,
search input, and ordinary history-text scenarios pass at DPR 1 and DPR 2; the
ordinary text scenario continues to prove the native clipboard payload. No
OpenAI credential was read and no live API request was made.

## Selection glyph alignment correction

Manual packed-demo testing exposed that the cropped foreground pass reflected
the selected interval around the full text texture. Once that mapping was
corrected, Babylon's transparent pass could still let the original glyph plane
overpaint the recolor. The foreground now maps the exact selected interval with
the source texture's scale and offset, discards transparent texels, and writes
depth only for the nearer recolored glyph fragments. The selected foreground
therefore retains the source glyph order, position, kerning, and clipping while
reliably replacing the original glyph color.

The TTS editor scenario now types and selects the full 81-character sentence
from the manual report at DPR 1 and DPR 2. The harness retains the preceding
unselected frame and requires at least `0.70` bidirectional glyph-mask alignment
using the source and selected foreground/background color pairs. This threshold
passes the correctly aligned DPR-1 antialias raster while a synthetic shifted
mask fails; the benchmark also uses a meaningful `SELECTION` sample for the
backward-selection/edit cycle instead of calibrating against two glyphs.

The focused factory suite passed 5/5 tests, the full unit suite passed 337/337,
and the parity harness passed 22/22. The general corpus passed all 165 fixtures /
541 renders with median SSIM `0.9901`, minimum SSIM `0.9542`, 99.9% of measured
edges within `2px`, maximum edge error `3.9921px`, exact text, clean runtime
reports, and every completion threshold met. The unfiltered packed TTS run
passed 10/10 static scenarios, 36/36 sharpness regions, and 66/66 interaction
steps across both DPR profiles; minimum static SSIM remained `0.967522` and
minimum interaction-local SSIM remained `0.526838` under the documented
structural UA-focus exception. No OpenAI credential was read and no live API
request was made.
