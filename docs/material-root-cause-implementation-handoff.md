# Material audit: evidence-led implementation priorities

## Current audit checkpoint — September 30

**Timepicker wheel versus scrollbar paint, ordinary dark/mobile:** real input
click opens both pickers at 390×844 DPR 2, without benchmark mode or state
injection. Wheel delta 144 produces scrollTop 0→144 and first-option y movement
of 144 CSS px on both sides. Panel boxes are both 260×256, at x65/y237.08.
Candidate scroll diagnostics and measured option boxes agree with the movement.
Its live scrollbar mesh is enabled/visible with #8B878D paint; exact matching
pixels in the rightmost 12-CSS-pixel strip move from device rows 479–529
(816 pixels) to 506–561 (896 pixels). This rules out an absent/stationary
candidate thumb for this state, not incorrect shape, thickness, travel ratio,
dragging or other profiles. Mesh localY is recorded only as paint-boundary
evidence, not used for layout or CSS-space calculations. Reference scrollHeight
is 2,320px, candidate 2,312px, both clientHeight 256px: preserve this unresolved
8px extent difference for padding/content-bound tracing. It is not normalized
away or assigned to core without equivalent-input proof. Clicking the input
opens both here, unlike historical reports; no datepicker behavior is changed.
`node --test --test-name-pattern="dark mobile timepicker wheel" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 6,116ms initial, 6,651ms with live thumb/pixel inspection and
5,393ms with explicit scroll/pixel assertions,
zero page errors. Screenshots remain in-memory, no new retained capture or
canonical rebuild. Next: trace trailing-padding/extent ownership and exercise
end reachability, rather than repeating the already-working wheel action.

**Comparison-page overlay scope:** a new boundary in the existing frozen-build
browser spec opens bottom-sheet/dialog in the actual `/compare` iframe host at
1440×900 DPR 1. Six cases cover candidate-only, reference-only and both-open.
After finite-animation/two-rAF settlement, a real parent selector click focuses
the parent native select in every case. Escape closes its platform popup;
Home/Enter on the focused closed select changes the family to core and both
iframe sources to /reference/core and /astylar/core. Candidate open=true is
verified before the parent action, with aria-modal dialog-overlay only for the
dialog, not the sheet. Thus the historical whole-window click-blocking report
is not reproduced by these current authenticated inputs. The comparison owns
two document/iframe boundaries (`comparison.component.ts`), not two Astylar
surfaces inside one document; this does not establish general same-document
modal isolation, cross-surface focus or GPU disposal. No source/fixture changes.
Initial diagnostics timed out: native open-menu Home/Enter did not commit the
route; a both-dialog probe without explicit settlement also lost parent focus.
Isolated probes and the settled six-case probe pass; the transient focus cause
is not assigned to core or erased by the settled result. Preserve that timing
limitation rather than treating visible popup presence as settlement.
`node --test --test-name-pattern="comparison iframe overlays" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 (six configurations) in 21,946ms and 22,554ms, zero page errors.
No screenshot capture, new artifact directory or canonical rebuild. Next: same-document
surface isolation needs an equivalent public-API reduction, not an iframe result.

**Tooltip effective font and local raster phase:** the ordinary dark/mobile
test now reads the existing live texture paint-input inspection, not the hidden
semantic DOM's computed text. The single retained `Create a project` texture
records Roboto/Arial/sans-serif, size 12, weight 400, line-height multiplier 4/3,
letter-spacing .4, color #f5eff4 and textAlign left, maxWidth 90.79834 CSS px.
Thus popup-level missing fontFamily does not mean absent effective font. Left
texture alignment plus shrink-wrapped width and authored flex centering is not
the same input representation as Material's centered text; no classification
of complete structure/alignment equivalence follows from this short label.
Existing focused-raster metrics compare equal 196×32-device-pixel interior crops
from full frames, without scaling the content. Unregistered SSIM is .735369;
the existing ±1-device-pixel registration selects x=1/y=0 and yields .99999335,
gradient energy retention 1.00000391, gradient RMSE .00051064 and color error
.00015774. Raw metrics remain visible: registration must not erase the phase
observation or prove its cause. This state does not show the reported blur;
the remaining horizontal phase needs placement/texture-projection attribution
if treated as a defect. Synthetic metric tests separately reject blur and
four-pixel displacement. No generic diagnostic threshold is promoted to an
acceptance gate, and no comparison or renderer offset is changed. Other
profiles, equal-input general text reductions and final gates remain pending.
Verification: the focused ordinary-tooltip test passes 1/1 in 5,589ms diagnostic
and 7,181ms asserted; `node --test tests/material-parity/focused-raster-metrics.spec.mjs`
passes 5/5 in 200ms. No retained captures or canonical export were generated.

**Tooltip vertical ink, ordinary dark/mobile:** the existing frozen-build test
now measures full-frame PNG pixels with `measureTextInkCenter`, rather than
using a separately rounded crop origin. At 390×844 DPR 2, native/candidate ink
centers are 241.72522/241.72835 CSS px; their offsets from their own popup centers
are .647095/.648350px (difference .00125448px), with 1,226/1,224 measured ink
pixels. This rules out the reported large vertical displacement for this
settled profile/state, not for historical captures or other profiles. Optical
ink center is not CSS line-box center: do not shift text to remove the shared
.65px offset. Native computed and candidate resolved size/weight/line-height/
letter-spacing agree at 12px/400/16px/.4px, but candidate popup fontFamily and
textAlign are absent at this measurement stage, versus native Roboto/center.
Inherited/effective font and horizontal placement still require owner tracing;
these absences are not assumed defaults or demonstrated core faults. Existing
antialias palette differences remain, and ink centering cannot prove sharpness.
`node --test --test-name-pattern="ordinary dark mobile tooltip" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 5,328ms diagnostic and 7,502ms with the additional assertion;
no renderer, fixture, canonical export or retained capture was changed.
Next decisive paint check: trace effective text owner/font and apply the existing
calibrated local edge metric, separating fractional raster phase from blur.

**Ordinary tooltip focus/hover, dark/mobile:** the frozen Chrome 154 showcase is
opened with `?profile=dark` **without benchmark mode** at 390×844 DPR 2. Real Tab
focuses both triggers, but only Material opens its tooltip. Candidate authoring
opens on pointerenter and closes on pointerleave; its focus callback does not
request tooltip open. Thus the focus-opening gap persists outside the known
benchmark hover suppression and remains an application interaction gap, not
failed core focus delivery. Real pointer hover opens both, and pointer leave
removes both. Settled popup heights are 24px, gaps below each trigger are 8px
and horizontal centers agree with their respective triggers within .01 CSS px.
Widths are 106.8125px native / 106.79834px candidate; candidate's fixed 138px
trigger differs from native 137.9375px. Both local crops contain background
RGB 50/48/51 and foreground 245/239/244 (249 full foreground pixels each).
Other antialias colors differ; neither equal palette counts nor these boxes
prove identical sharpness, input structures or whole-raster rendering. The
reference uses connected-overlay placement while candidate uses authored
relative flex flow: the earlier composition findings remain, despite matching
ordinary placement here. The initial focus sample caught the reference's .8
opening scale; waiting for its finite animation yields the settled 24px box,
not a discrepancy to fix by resizing candidate output. Short-viewport fallback,
scrolling, touch, local text sharpness and other profiles remain pending.
`node --test --test-name-pattern="ordinary dark mobile tooltip" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 6,178ms diagnostic and 6,581ms with settled geometry/palette checks,
with no page errors. No renderer/fixture edits or new retained captures.

**Browser proof integration milestone:** after committed caret/selection,
modal-Tab, overlay-count/disposal and snackbar-action increments, the unfiltered
shared proof suite `node --test tests/material-parity/sort-focus-structure.spec.mjs`
passes **21/21**, zero failures/skips/cancellations, in **171,418ms** on the
authenticated 1,887-file Chrome 154 showcase. This integrates source-owner
checks, real keyboard/pointer widget boundaries, passive applicability, slider
constraints/hit ownership, calendar/editable popups, modal containment,
selection pixels and overlay/snackbar cleanup. Its diagnostic assertions
preserve unequal-input and known-failure observations; passing is not input or
output parity acceptance. No canonical export, rendering source or retained
capture changed, and no new capture directory was generated. The dependency-
validated compact tooltip query remains applicable (929 working records).
Do not repeat this complete suite for the prose-only milestone update.
Next: missing tooltip dark/responsive real focus/hover paint, remaining
text-control/profile mapping, surface-local overlay scope and equal-input
WebGL reductions; final canonical and unfiltered output/release gates remain.

**Snackbar keyboard/action visibility, dark/mobile:** on the authenticated frozen
Chrome 154 build, dark 390×844 DPR 2, real Tab/Enter opens both snackbars without
state injection. Both surfaces are visibly painted in the viewport at y=788,
height=48, bottom=836; native/candidate local regions change 71,808/66,004 device
pixels from the closed baseline. Native computed background/label color are
RGB 50/48/51 and 245/239/244, observed in pixels; candidate resolved requests are
`#322f35`/`#ffffff`, also observed in pixels. Width differs: native 374px at x=8,
candidate fixed 344px at x=23. Candidate `.snack-surface` explicitly authors
that width and palette, so classify these first differences as unequal
application styling, not a demonstrated core position or color conversion fault.
Tab reaches UNDO on both; Enter dismisses both. Candidate restores its trigger
via the explicit `id.endsWith('-dismiss')` focus callback; native ends at BODY
when the action is removed. This is another authored interaction distinction.
The initial probe sampled Material before asynchronous exit detachment and
failed its zero-popup assertion; waiting for actual container detachment closes
that instrumentation timing gap, without changing actions or reference truth.
The existing spec now checks visible foreground/background pixels, geometry,
resolved paint inputs, action focus, dismissal and page errors. It does not
establish screenshot/input parity, timed expiry, repeated action cleanup, other
profiles, or explain historical missing-snackbar reports with different inputs.
`node --test --test-name-pattern="dark mobile snackbar keyboard" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 5,521ms after detachment synchronization and 5,429ms with resolved
paint evidence. Screenshots remain in memory; renderer/fixtures/export unchanged.

**Retained texture ownership and final disposal:** the same frozen dark/mobile
overlay-cycle test now reads the existing internal inspection's text-cache
statistics/retained texture identities before calling public `surface.dispose()`.
All five menu/sheet textures and all seven dialog textures belong to that
surface text cache (configured max size 100). Reference-count distributions are
0,0,1,1,1 and 0,0,0,0,1,1,1 respectively: the first-open increases are idle
cached popup text, not unowned texture objects. This matches
`TextRenderingService.beginRenderCycle`/`getRetainedTextures`/`releaseTexture`,
which preserve zero-reference idle entries for reuse. After public disposal,
surface/scene/engine report disposed; scene meshes/materials/textures, engine
loaded textures, text-cache size, plugin owners/resources/cleanups/pending and
all seven sampled observer lists are zero. This classifies the bounded texture
retention in these runs as owned cache behavior and proves final runtime-count
cleanup, not GPU-driver byte accounting, independent two-surface disposal,
late asynchronous completion or all-profile lifetime correctness. The retained
material counts are not independently attributed to cache ownership, although
they plateau and disappear on disposal. No source/fixture changes; public
disposal is a test-only lifecycle action on the transient browser instance.
The existing focused overlay-cycle check passes 1/1 in 20,985ms with disposal
diagnostics and 22,430ms with exact ownership/zero-count assertions. Command:
`node --test --test-name-pattern="dark mobile overlay cycles" tests/material-parity/sort-focus-structure.spec.mjs`.

**Overlay resource-count plateau:** the existing dark/mobile open/Escape-cycle
test now reuses public surface diagnostics for scene/plugin counts and reads
Babylon's loaded-texture cache plus seven scene observer lists. It samples the
settled initial state, every opening and every dismissal for menu, bottom-sheet
and dialog in the authenticated Chrome 154 build, dark 390×844 DPR 2. Initial
scene counts are 12 meshes/12 materials/3 textures in all three. Each of three
post-dismissal states is identical: menu/sheet 12/14/5, dialog 12/13/7; loaded
texture counts are respectively 5/5/7. The popup adds meshes/materials while
open; dialog's open materials change 27→29→29, but all closed counts return to
13. Plugin counts remain owners=2/resources=0/cleanups=1/pending=0. All seven
observer lists remain fixed: pointer=2, dispose=3, pre-pointer/keyboard/
pre-keyboard/before-render/after-render=0. Exact plateau assertions reject
cumulative count growth and preserve the existing focus/semantic cleanup checks.
This closes the previously unmeasured post-dismissal count question for these
cycles; it does not establish zero retained resources, cache ownership, GPU
driver allocation release, full surface disposal or other overlay/profile
coverage. The first-open retained texture/material increases remain explicit
and require lifetime/ownership review before being classified as legitimate
caching. No renderer/fixture/export/artifact changes. Verification:
`node --test --test-name-pattern="dark mobile overlay cycles" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 (21,141ms diagnostic; 21,094ms with plateau assertions and initial
snapshot), with no page errors.

**Dark/mobile modal Tab boundary:** the authenticated frozen showcase in Chrome
154.0.8037.58, dark 390×844 DPR 2, is pointer-opened and sampled after every
one of five real Tab and five Shift+Tab actions. Dialog cycles Cancel/Save in
both directions on both sides; candidate marks the trigger inert and exposes
`aria-modal=true`. This is positive evidence for the authored modal-dialog
containment path, not dismissal restoration or global/surface-local isolation.
Material bottom-sheet cycles Share/Copy link throughout, but candidate starts
on the trigger, enters its two options, then escapes to BODY/canvas/trigger.
It is authored `div role=dialog`, with no open/modal dialog contract, unlike
candidate dialog's `type=dialog, open=true, modal=true`. The core runtime's
`buildActiveModalDialog` and semantic bridge's `applyModalInertness` select that
explicit contract; a role does not implement a focus trap. Material's
`MatBottomSheetContainer._trapFocus` explicitly invokes CDK trapping even though
the reference container exposes `aria-modal=false`. First divergence is the
missing application/plugin focus-scope contract, not proof that core modal
dialog Tab handling is broken. Do not blindly change aria-modal or replace the
reference container to obtain equal output; preserve its surface-local scope
and determine the equivalent supported focus-scope authoring at implementation.
The candidate's repeated backward Tab at the outside trigger remains an
observed secondary behavior, not assigned a cause by this probe. Surface-local
modality, popup paint and internal observer/GPU cleanup remain pending.
`node --test --test-name-pattern="dark mobile modal Tab cycles" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 twice (10,748ms initial, 8,170ms with exact focus/containment assertions),
with no page errors. No captures, canonical export, fixture or renderer edits.

**Forward/backward selection paint, dark/mobile:** the existing frozen-browser
test helper authenticates all 1,887 served files, then real Tab/Control+A/type
`Atlas`/Home/Shift+Right×3 selects 0–3 on both form-field controls in Chrome
154.0.8037.58, dark 390×844 DPR 2. ArrowRight collapses the range before End,
then Shift+Left×3 selects 2–5 backward on both. This deliberately excludes the
already-proven End-on-existing-selection fault from a paint question; it does
not fix, waive or change that fault or the canonical action sequence. Both
logical and semantic direction endpoints agree and remain focused. Local
caret-hidden rasters prove actual selected background/foreground pixels, not
only mesh presence: HTML uses RGB 46/97/205 with white glyphs; candidate uses
154/213/255 with black glyphs, backed by its visible opaque `#9AD5FF` highlight.
Collapsing restores the identical unselected crop and removes the highlight.
Input boxes agree within .01 CSS px. The palette difference matches the explicit
contrast-aware black/white selection policy in `docs/compatibility/html-css.md`
and `TextHighlightMeshFactory.chooseSelectionColors`/`createHighlightRecord`:
classify as documented paint limitation, not browser-equivalent paint or a new
direction/missing-highlight defect. Background/foreground authoring still differs
in the showcase, so these crops do not establish full equal-input shaping,
clipping or sharpness. Other profiles, controls, pointer selection and general
line-box coverage remain pending. Existing test only; screenshots are in-memory,
no new artifact run or canonical export. Verification:
`node --test --test-name-pattern="dark mobile real-key selections" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 twice (4,974ms initial, 4,338ms with explicit palette/direction/cleanup
assertions), with no page errors. Renderer and comparison fixtures unchanged.

**Caret geometry isolated from color:** the existing input-boundary spec executes
the four complete caret methods extracted from authenticated served chunk
`chunk-3JXWRYJY.js` (SHA `f366533b…`) with actual Babylon 8.15.1 NullEngine
meshes and records the CSS inputs passed to projection. An isolated empty native
input in Chrome 154.0.8037.58 uses the same explicit `#d0bcff` caret, 16px Arial,
24px line height and 228px input width. At DPR 1/2 its visible caret is exactly
1 CSS px wide (1/2 device pixels), at the insertion edge; the shipped method
requests width 2 CSS px, height 19.2px, and centers the box at that edge, extending
one CSS px left and right. Both materials resolve the same caret color. Thus the
width/left extension originates in `TextSelectionService.createTextCursor` and
`projectCursorX` before projection, not the Material caretColor omission or a
Babylon world-coordinate conversion. This confirms the local geometry policy
discrepancy; NullEngine does not prove final WebGL clipping, raster height or
whole-surface alignment. The previously observed 4-device-pixel canvas footprint
is consistent with this policy, but full equal-input paired WebGL paint remains
pending. Do not compensate with input padding or shift the comparison text.
Verification: `node --test --test-name-pattern="shipped caret geometry" tests/material-parity/input-boundary-evidence.spec.mjs`
passes 1/1 in 31,766ms; a repeat combined with the retained
`current paired caret-visible capture` check passes 2/2 in 9,342ms (geometry
8,309ms, retained proof 140ms). Native six-sample rasters stay in memory; no renderer,
fixture, retained producer or canonical package changed.

**Dark/mobile focused-empty caret boundary:** the existing hash-bound caret
producer and retained light capture remain unchanged. The existing input-boundary
spec extends only missing form-field/input dark, 390×844, DPR 2 coverage on the
authenticated 1,887-file build in Chrome 154.0.8037.58. Real Tab/Control+A/Backspace
is followed by six settled 125 ms samples per side, paired `caret: initial/hide`
local rasters and bidirectional temporal raster differences. Both empty controls
remain focused; email selection endpoints are null, not invented indices.
Native caret-on pixels are RGB 208/188/255 over 76 pixels, a 2×38 device-pixel
footprint. Canvas on/off changes cover 156 pixels, 4×39, including RGB 29/27/32;
its crop-relative left edge is two device pixels farther left. Input boxes agree
within .01 CSS px. Blink phases are not matched by index, and both temporal
directions are inspected so off-phase background color is not misreported as
caret color. First color divergence remains authored input: HTML explicitly
resolves primary caret color, while candidate resolved color is `#1d1b20` and
caretColor is absent. The wider/offset canvas footprint remains a separate
suspected paint issue needing minimal equal-input reduction; unequal color
inputs do not prove a general core defect. No renderer or fixture was changed.
`node --test --test-name-pattern="dark mobile empty inputs" tests/material-parity/input-boundary-evidence.spec.mjs`
passes 1/1 in 15,285 ms, with no page errors. The retained
`--test-name-pattern="current paired caret-visible capture"` proof in the same
spec still passes 1/1 in 977 ms. Raster checks run in memory: no additional
capture directory or repeated decoded report is retained. Forward/backward
selection paint, other profiles and the other input families remain pending.

**Canonical receipt leaf reconciliation:** the remaining September 30 refresh
question was a provenance-only update versus changed measurements hidden in the
four receipt sections. The existing section-digest utility now compares selected
paths, scalar values and container shape in bounded memory, rejecting missing
sections, duplicate root sections, changed path/order and changed container shape.
An explicitly opt-in integration
test authenticates both compressed and decoded predecessor/current packages
(`db1b33c9…`/`c93c4ad1…` → `3ec576a3…`/`f28c3bd7…`) and checks
263,567 controlLineBoxes entries, 590,705 ownerCaretInputs entries,
343,859 reviewedSourceBatchInputs entries and 3,684,597 controlTypography entries.
There are exactly 99 changed scalar leaves and no path/container changes:
48 line-box normalization receipts, one owner-caret complete-source receipt,
one source-conservation transition receipt and 48 control-typography review
receipts change module SHA `2328c461…` → `a787e493…`. The remaining leaf is the
source-conservation report hash `3c1f5992…` → `bcc50d1d…`. Independently rerunning
its existing collector reproduces the current hash; substituting only the old
normalization source receipt reconstructs the exact predecessor hash. That
focused hash-transition test passes 1/1 in 29,914 ms. No measurement, case,
classification or evidence value changed within these four sections beyond
those provenance leaves. This closes the previously unreviewed receipt scope,
not complete source/state coverage or final browser acceptance. The comparator
is audit instrumentation only; renderer/fixtures/canonical package are unchanged.
Verification: `node --test tests/material-parity/audit-section-digests.spec.mjs`
passes 3/3 fast tests (119 ms), with the two explicit integrations skipped by
default. With `ASTYLAR_AUDIT_RECEIPT_COMPARE=1`, the
`--test-name-pattern="published current-ancestry receipt"` test passes 1/1 in
211,558 ms; the `--test-name-pattern="source-conservation report hash transition"`
test passes 1/1 as recorded above. Both commands use that same existing spec.
These milestone checks generate no decoded report or scratch capture on disk;
do not repeat them for subsequent review prose alone.

**Paginator control contract:** the unresolved question was missing native key
activation versus unequal authored disabled-state behavior. A paired Chrome
154.0.8037.58/light/1440×900/DPR 1 proof on the authenticated frozen showcase
uses real Tab/Enter/Shift+Tab/Space/Tab, then nine Enter activations. Both sides
produce the same page indices 0→1→0→1…9 and exact range labels. At the return
to page 0, Material retains Previous focus; at page 9 it retains Next focus.
Candidate loses focus to BODY at both boundaries. The first relevant input
difference is Material paginator's `disabledInteractive` contract: its button
remains natively enabled, exposes aria-disabled=true and tabindex=-1, retaining
existing focus while preventing navigation. Candidate authors native
`disabled: state.pageIndex === 0/9`, yielding disabled=true, no aria-disabled,
and loss of focus. This is an application control-contract mismatch, not proof
that core should retain focus on a natively disabled button. Whether the public
API can fully express Material's disabled-interactive semantics remains an
implementation-stage question; do not compensate with fixture-specific focus
requests. Page-size selection is inapplicable to this example: Material's
default empty options produce only size 10 text, as does candidate authoring.
Neither live DOM contains a page-size select. Names/live-region semantics,
icon/focus paint and other profiles remain pending.
`node --test --test-name-pattern="paginator keyboard transitions" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 6,794 ms with no page errors. Renderer, comparison input,
canonical findings and original captures are unchanged. The full suite was
already checked at the preceding overlay milestone; only this new standalone
proof was rerun. Canonical receipt leaf-diffs and final acceptance remain open.

**Dark/mobile repeated overlay boundary:** reuse review found the retained
`overlay-keyboard-4d782df-settled` evidence already answers light/900×700/DPR 1
keyboard questions, but not dark/mobile repetition. A focused test on the
authenticated frozen build uses Chrome 154.0.8037.58, dark, 390×844, DPR 2,
and three real pointer-open/Escape cycles per menu, sheet and dialog. Competing
explanations were a profile-dependent focus difference, stale controls after
reconciliation, or the already known authored focus requests. After settlement
and finite browser animations, Material opens with focus on Rename/Share/Cancel;
candidate opens on the menu/sheet trigger and dialog Cancel. On dismissal,
Material restores all three triggers; candidate restores menu/sheet triggers
but dialog ends at BODY. Each cycle contains one popup with exactly two
controls, then zero popup controls; candidate canvas count remains one.
This extends the known focus observations to dark/mobile, without reclassifying
the shared cause or treating distinct sheet/menu/dialog requests as one bug.
It proves a DOM-control/canvas-count plateau, not observer, Babylon allocation,
GPU memory, visual clipping or local modality parity. Those ownership checks,
dark Tab containment and intermediate local rasters remain required.
`node --test --test-name-pattern="dark mobile overlay cycles" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 19,920 ms with no page errors. No renderer, comparison input,
canonical finding or original capture changed; no new capture directory was
created. Preserve the outstanding canonical receipt leaf-diffs and final
integration/browser gates rather than exporting again for this test-only batch.
The accumulated keyboard-boundary suite
`node --test tests/material-parity/sort-focus-structure.spec.mjs` also passes
17/17 in 126,841 ms. This integrates these focused source/state proofs, not the
complete audit harness or full rendering acceptance matrix.

**Sidenav Escape applicability:** a source check and paired Chrome
154.0.8037.58/light/1440×900/DPR 1 probe resolve the previously pending
focus-origin question. The HTML authors an initially opened `mode="side"`
drawer containing only Navigation text; the candidate authors a static aside.
Neither panel has tabindex or focusable descendants. A real click inside the
panel followed by Escape leaves Material open; calling `focus()` on either
unchanged node cannot focus it. Candidate records the panel click, not a panel
keydown. Material's inherited drawer-local Escape handler is real, but the
side-mode host deliberately omits tabindex and this example supplies no route
for a real focused key event into it. Thus dismissal is inapplicable to this
authored example, not an established renderer failure or a general claim that
sidenav cannot dismiss. Do not add tabindex merely to make an audit action
applicable. The existing focused test
`node --test --test-name-pattern="side-mode sidenav Escape" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 3,974 ms without page errors. Input/style/semantic mapping and
other-profile checks remain. No renderer, fixture, canonical data or original
capture changed and no scratch capture was retained.

**Tree navigation and native-button positive controls:** the unresolved question
was whether leaf-tree navigation fails before key delivery or after it in widget
authoring. On the authenticated unchanged frozen showcase, Chrome
154.0.8037.58/light/1440×900/DPR 1, real Tab/ArrowDown/ArrowDown/Home/End moves
Material focus through nodes 0→1→2→0→2. Candidate focus remains at node 0 while
all four navigation keydowns reach the application callback. Current
`astylar.component.ts` authors fixed node tabindex 0/-1 and `handleKeydown`
handles only Escape; the first demonstrated divergence is missing tree
interaction authoring, not core key delivery. As positive controls, real
Tab/Enter/Space focuses and activates `core-primary`, `toolbar-action` and
`card-open` on both sides. Reference DOM click events and candidate application
click callbacks each record two correctly attributed activations. Candidate
activation is routed through its bridge, not an identical native DOM click
stream; exact ordering, held states, focus/ripple paint and other profiles
remain open. The existing focused test
`node --test --test-name-pattern="tree navigation and native" tests/material-parity/sort-focus-structure.spec.mjs`
passes 1/1 in 12,011 ms with no page errors. No renderer, comparison input,
original capture or canonical classification changed; no new capture directory
was generated. Remaining priorities are overlay/focus lifecycle and missing
state boundaries, then unresolved style/paint mapping and final integration.
The canonical refresh below is validated, but its remaining receipt leaf-diffs
and complete harness/browser gates are not waived by this focused result.

**Current canonical export:** a cold
`node scripts/export-material-input-audit-current-ancestry.mjs` completed the
full production build, validation, evidence-session verification and canonical
publication with exit code 0. Its verified session read 1,205 files /
89,154,859 bytes with two collectors, ten memory hits, zero disk hits and zero
invalidations. The package manifest authenticates 62,820,320 compressed bytes
(`3ec576a3…`) and 2,222,799,930 decoded bytes (`f28c3bd7…`). The derived compact
index imports and verifies the same package: 8,483 scalar discrepancies,
389,202 occurrences, 39,904 control differences and 135 source findings. The
configured capture inventory remains 436/436 static and 1,875/1,875 interaction
cases across 36 families; those counts do not establish input equivalence.
The cold run's wall time includes a host suspension and is not a CPU-time measure.
The [source-derived state checklist](material-state-coverage-inventory.md)
accounts for all 36 families, validates every per-family 436/1,875 case count
against the hash-pinned full report, and distinguishes real action boundaries
from programmatic focus or final-only mobile Escape observations. Every family
still has pending input/state applicability review; the output pass is not
promoted to audit completion.

**Sort real-key boundary:** the remaining question was whether two passing
pointer activations also represent Tab/Enter/Space sort behavior. Competing
explanations were a missing keyboard event in core, an application/plugin
handler omission, or a paint-only arrow difference. A focused paired browser
test authenticates the unchanged 1,887-file frozen showcase build against the
Chrome 154 checkpoint, then drives real Tab, Enter, Space and Enter at
1440×900, DPR 1, light profile. Both triggers receive Tab focus and all three
key-down events; the Astylar application event callback records all three.
The Material directive changes `aria-sort` from `none` to `ascending`,
`descending`, `ascending`, with store direction `asc`, `desc`, `asc`.
The Astylar trigger retains absent `aria-sort` and `asc` throughout. Neither
DOM path synthesizes a click; Material's sort directive owns key activation.
Current candidate source declares a focusable `div` with `role="button"` and
updates sort state in `handleClick`, while its `handleKeydown` handles only Escape
(`examples/material-showcase/src/app/astylar.component.ts`). Thus the first
demonstrated divergence is application/plugin interaction authoring after
delivered key events, not a proven core key-delivery or arrow-paint defect.
The focused `sort-focus-structure.spec.mjs` suite passes 3/3. This does not
resolve sort focus paint or other profile/DPR states and does not authorize a
fixture-only parity workaround; implementation should first define equivalent
keyboard behavior through the appropriate public interaction contract.

**Checkbox native-control boundary:** following the sort result, the specific
question was whether a role-only checkbox has the same first divergence, or
whether core drops its Space key. On the same authenticated frozen build and
Chrome 154 light 1440×900 DPR 1 host, real Tab focuses both targets. Real Space
changes Material's native `input:checkbox` and store selection from true to
false. Astylar's authored `div role="checkbox"` retains `aria-checked="true"`
and selection true; its application event log records the keydown. The
comparison only changes checkbox state in `handleClick`, and `handleKeydown`
handles only Escape (`examples/material-showcase/src/app/astylar.component.ts`).
The public compatibility contract supports an input with
`inputType: 'checkbox'` and Space activation. Thus this case is an application
control-kind/activation authoring gap before any demonstrated core paint or
keyboard-delivery fault, not proof that all role-based controls share one cause.
The existing focused browser suite passes 4/4. Focus-ring paint, exact event
ordering, other profiles/DPRs and the other selection families remain open.
No fixture, renderer or reference input was altered.

**Radio group arrow boundary:** the unresolved question was whether the
checkbox's role-only control-kind gap also applies to radio group navigation,
or whether Astylar drops Arrow keys before application handling. A focused
paired Chrome 154/light/1440×900/DPR 1 probe authenticates the frozen served
build, then sends real Tab, ArrowLeft and ArrowRight. Both sides initially
focus the selected Team option. Material's native `input:radio` moves focus and
selection Team → Solo → Team; the candidate `div role="radio"` retains Team
focus and selection. Its application event log records both Arrow keydowns on
`radio-team`. The candidate's `handleKeydown` handles only Escape; its radio
selection updates on click/input, not Arrow keydown
(`examples/material-showcase/src/app/astylar.component.ts`). Public Astylar
supports `inputType: 'radio'` and native-style radio Arrow navigation
(`src/app/services/dom/input/input-element.service.ts`), which this fixture
does not author. The first demonstrated divergence is control-kind and
interaction authoring after key delivery, not a confirmed core radio-navigation
defect. The focused browser suite passes 5/5. Space activation, exact event
order, focus paint, other profile/DPR states and other role-based components
remain open. No fixture, renderer or reference input was altered.

**Composite-control keyboard boundary:** a single paired Chrome 154/light/
1440×900/DPR 1 test on the same authenticated frozen showcase build drives
real Tab/Space on chips and slide-toggle, Tab/Space/Enter on expansion, and
Tab/ArrowLeft/Enter/ArrowRight on button-toggle, tabs and stepper. Material
chip 0 changes selection on Space; its switch changes checked; its expansion
header changes `aria-expanded` false → true → false on Space/Enter. Material
button-toggle moves focus and selection Grid → List → Grid. Material tabs and
stepper move focus to the second option on ArrowLeft, select it on Enter, then
move focus back on ArrowRight without changing the selection. In all six
candidate cases the application callback records every driven keydown but the
initial selection/focus/expanded state persists. Candidate source authors role
nodes (tabs use buttons, the other five use divs), handles their state changes
in `handleClick`, and handles only Escape in `handleKeydown`
(`examples/material-showcase/src/app/astylar.component.ts`). The first observed
divergence is therefore missing composite activation/navigation authoring after
key delivery, not a proven core key-routing fault or a paint-only discrepancy.
The Material tab/step and expansion components own internal selection/expanded
state; the showcase store alone cannot measure them, so the proof asserts focus
and ARIA state at each action boundary. The focused suite passes 7/7. This
classification is restricted to the six controls, three driven key sequences,
light desktop DPR 1 and the pinned build; focus/selection paint, other keys,
profiles, content visibility and full input mapping remain open. Do not patch
fixtures for screenshot similarity or infer that all ARIA roles should acquire
Material composite behavior from core.

**Slider keyboard-step and state-contract boundary:** the next unresolved
question was whether the reported short/jerky slider movement begins in core
range key routing, authored range constraints, or the showcase state adapter.
The same authenticated frozen Chrome 154/light/1440×900/DPR 1 build drives real
Tab and three ArrowRight presses on the start thumb, then Tab and three
ArrowLeft presses on the end thumb. Material's `mat-slider` authors min 0, max
100, step 5; its current native inputs expose start max equal to the end value
and end min equal to the start value. Both thumbs progress in 5-unit steps,
30→35→40→45 and 65→60→55→50. The candidate authors two distinct range
inputs with fixed 0–50 and 50–100 bounds and step 1
(`examples/material-showcase/src/app/astylar.component.ts`). Its input/change
callbacks receive 31/32/33 and 64/63/62, but `ShowcaseStore` normalizes each
patch to a multiple of 5 (`showcase.store.ts`), retaining 30 and 65 for the
first two presses and then jumping to 35 and 60. The first divergence is
authored input constraints and step, compounded by application state
normalization/re-render; core does deliver the keys and 1-unit range changes
requested by those inputs. This scoped proof does not establish the cause of
the reported swapped-thumb pointer drag, pointer hit testing, continuous
travel, or local thumb paint. Those remain separate investigations. The
focused browser proof passes 1/1; no renderer or fixture input was changed.

**Slider visible-thumb pointer ownership:** the competing explanations for
the reported swapped handles were stale historical behavior, core routing to
the wrong authored owner, or a mismatch between the candidate visual and its
invisible hit inputs. A paired real-pointer Chrome 154/light/1440×900/DPR 1
proof uses the authenticated frozen build and presses the actual visual thumb
centers. At default start=30/end=65, both candidate down/up events retain the
correct owner and both short drags move only that thumb to the same final
values as Material (40/65 and 30/75). This does not explain every historical
swap. At start=60/end=80, however, the candidate draws the start thumb at 60%
while its authored start input is clamped to 50% and occupies only the left
half. Pressing that visible start thumb routes to `slider-primary`, immediately
changes the end input from 80 to 60, and ends with candidate store 60/65;
Material moves the start thumb to 65/80. The symmetric start=20/end=40 case
draws the end thumb at 40% while its end input is clamped to 50% and occupies
only the right half. Pressing it routes to `slider-start`, ending with store
40/40; Material moves the end thumb to 20/45. Paired pointer X positions differ
by under 2 CSS pixels. The first demonstrated swap is therefore candidate
input/visual hit-region authoring, not a proven core inversion of the two
authored owner IDs. The separate equal-input core range capture, release,
paint, and travel-geometry defects remain confirmed by their own reductions;
this proof neither repairs nor invalidates them. Both focused pointer tests
pass 2/2. Other states, crossing transitions, profiles/DPRs, and complete
pointer-cancel/release ownership remain open. No fixture or renderer was edited.

**Select custom-combobox keyboard boundary:** the remaining question was
whether candidate keyboard opening/navigation/commit was missing because core
dropped the keys, application authoring omitted their behavior, or the reference
popup was uninspectable native UI. Current reference source authors Material
`mat-select`, not a native `select`; the paired Chrome 154/light/1440×900/DPR 1
test observes its actual `mat-option` DOM. The earlier state-inventory native
popup limitation was incorrect for this comparison and is corrected. On the
authenticated frozen build, real Tab focuses both triggers. Enter opens
Material with Team active, ArrowUp changes its active descendant to Solo, and
Enter commits Solo and closes. The candidate readonly text input remains
closed with Team selected, although its application callback receives every
key. After resetting both to Team and real pointer opening, candidate ArrowUp
and Enter still leave Team active and the popup open. Escape removes its semantic options and retains
trigger focus. Material's component implements those keyboard transitions;
candidate `handleKeydown` only handles Escape, and `handleClick` owns opening
and option commit (`examples/material-showcase/src/app/astylar.component.ts`).
Thus the first demonstrated divergence is interaction authoring after key
delivery. This does not establish a core delivery defect or authorize replacing
reference behavior with fixture-specific keys. Define equivalent custom
combobox behavior through the public interaction contract during implementation.
`node --test tests/material-parity/sort-focus-structure.spec.mjs` passes 11/11
in 47,489 ms. The final same-state reset refinement passes its focused
`--test-name-pattern="select real keyboard"` command 1/1 with zero page errors.
Other keys, disabled/dark/responsive states, local paint and repeated observer/resource
cleanup remain open; option DOM removal alone does not prove resource disposal.
No renderer, fixture, or original capture was changed.

**Editable-popup keyboard boundaries:** the unresolved question was whether
autocomplete/timepicker input focus and option navigation diverged in key
delivery, application handlers or popup reconciliation. A paired real-key
Chrome 154/light/1440×900/DPR 1 proof uses the same authenticated frozen build
and records Tab, ArrowDown, Enter and Escape boundaries. Autocomplete opens on
Tab on both sides with the same two unselected option labels. Material then
activates Cape Town on ArrowDown and writes it/closes on Enter; candidate
receives both keys but retains an empty value, no active descendant and an
open list. Escape removes candidate options and retains input focus.

Timepicker differs earlier: real Tab leaves Material closed but opens the
candidate. Material ArrowDown opens with 12:00 AM active, and Enter writes it
and closes; candidate receives the keys but retains empty value/open list.
All 48 option labels agree. Material has no selected option for the empty
input; candidate marks option 0 selected regardless of input value. A final
closed Escape clears Material's committed time: installed Material's
`MatTimepickerInput._handleKeydown` explicitly clears a non-null value there,
so this observation is not treated as unexplained data loss. Its input opens
on Arrow keys or clicks on the form-field overlay origin, without a focus
listener. Candidate authors unconditional opening in its focus callback,
Escape-only keyboard handling, constant empty time value and fixed option-0
active/selected attributes (`examples/material-showcase/src/app/astylar.component.ts`).
The first demonstrated boundaries are therefore interaction/state authoring,
not missing core key delivery. Real Tab on datepicker is a negative control:
both inputs focus without any calendar DOM. Clicking into timepicker and
Tab-focusing it are distinct reference actions; do not generalize the user's
click-to-open expectation to all focus origins or change datepicker behavior.

The focused `--test-name-pattern="editable popup keyboard"` browser proof
passes 1/1 with zero page errors across all six pages. The complete focused
`node --test tests/material-parity/sort-focus-structure.spec.mjs` suite passes
12/12 in 60,015 ms. This establishes light
desktop keyboard state/semantic boundaries only. Pointer-origin scope,
disabled/other navigation/edit keys, dark/responsive states, local caret/popup
paint, scrollbar reachability and repeated observer/resource cleanup remain.
No renderer, comparison input or original capture was changed.

**Datepicker opening, navigation and commit:** the next unresolved question
was whether calendar actions failed in routing or in authored calendar state.
The paired Chrome 154/light/1440×900/DPR 1 frozen-build proof records real Tab,
Alt+Down, Escape, pointer opening, Home/Right, Next and day-1 click boundaries.
Tab keeps both calendars closed. Alt+Down reaches the candidate input callback
but only Material opens. After pointer opening, Material focuses a calendar
cell and Home/Right moves its active day 1 → 2; candidate retains icon focus
and receives both keys there. Material Next advances the displayed month,
then choosing day 1 writes the date and closes. Candidate clicks target
`datepicker-next` and `datepicker-day-1` exactly, but its month, empty input
value and open state remain unchanged.

Current candidate source only changes the month/year **view**, handles Escape
and toggles popup opening. Calendar labels/contents derive from the current
date, its input value is constant empty, and Next/day handlers and calendar
focus requests are absent (`examples/material-showcase/src/app/astylar.component.ts`).
The first demonstrated differences are application interaction/state authoring;
correct target delivery does not establish calendar behavior equivalence or
prove a core routing failure. Preserve the separate confirmed coordinate/grid
and paint findings. Implementation needs equivalent calendar state and behavior
through the public interaction contract alongside those core corrections.

`node --test --test-name-pattern="datepicker keyboard opening"
tests/material-parity/sort-focus-structure.spec.mjs` passes 1/1 with zero page
errors in 7,499 ms. The probe waits for actual calendar focus and completion of
Material's opening animation before dismissal/navigation: Material explicitly
ignores close while animating, so an immediate Escape was a premature harness
action. Secondary year/month selection, keyboard commit and other navigation
keys, disabled/dark/responsive states, local calendar/caret paint and repeated
resource cleanup remain open. No renderer, comparison input or capture changed.

**Passive/composite state applicability:** current reference/candidate sources
and a paired Chrome 154/light/1440×900/DPR 1 Tab probe review twelve families.
Sidenav, grid-list, divider, badge, icon, list, table, progress-bar and
progress-spinner have no sequential keyboard controls on either side.
Their source consists of text/layout content or determinate progress, so control
activation is inapplicable in these examples. The generic configured
focus/activate cases for several of them do not establish meaningful keyboard
interaction. Core, toolbar and card each expose one corresponding native
button (`core-primary`, `toolbar-action`, `card-open`); real Tab focuses that
button on both sides, and activation/focus paint remains to review.

Sidenav specifically requests initial `opened`/`mode="side"` and no toggle;
candidate emits its static side panel independently of open state. A modal
focus trap/toggle action is therefore inapplicable, but installed Material's
drawer inherits an Escape handler on its own element. The relevant focus-origin
and dismissal path remains pending; neither absence of Tab stops nor the
configured mobile flow closes it. Tree source has three leaves and no
children/toggle: expansion is inapplicable, but inherited tree focus/navigation
is still relevant. Both progress examples request determinate 64/100; their
candidate `.64` ratio is the corresponding progress fraction, and the browser
probe checks both semantic min/max/now as 0/100/64. Indeterminate animation
phase is inapplicable here; this does not certify arc geometry, loaded paint,
general progress-mode support or plugin/core ownership.

The state checklist now distinguishes these inapplicable actions from pending
layout/style/semantics/paint and applicable child/tree keyboard work. This is
source-derived applicability plus a light desktop runtime check, not a full
profile/DPR output claim or input-equivalence acceptance. No renderer,
comparison source, original capture or configured case count was changed.
`node --test --test-name-pattern="passive comparison applicability"
tests/material-parity/sort-focus-structure.spec.mjs` passes 1/1 across 24 pages
with zero page errors in 28,143 ms.

**Independent replay:** a separate cold
`ASTYLAR_AUDIT_COLD=1; ASTYLAR_AUDIT_PROGRESS=1; node scripts/export-material-input-audit-current-ancestry.mjs --check`
completed with exit 0. It revalidated the full audit, rehashed the evidence
session (two collectors, ten memory hits, zero disk hits or invalidations;
1,205 files / 89,154,859 bytes), and confirmed canonical and readable report
equality. Its 2,485,351 ms wall time includes host suspension. This closes the
independent canonical-check gate, not interaction coverage, the full harness,
or browser gates.

**Native Tab selection boundary:** the retained Chrome 153.0.8010.53 capture
records the HTML form-field selecting `[0,5]` and the Astylar scene retaining
`[0,0]` after real Tab focus. A new focused test authenticates the exact served
showcase assets and drives both sides in current Chrome 154.0.8037.58. Native
Tab initially selects `[0,5]` in the Astylar semantic input. A subsequent
`AstylarSemanticBridge.applyControlState` / `syncControlStates` call writes
`setSelectionRange(0,0)`, leaving semantic DOM and scene collapsed. This places
the first demonstrated divergence at core semantic/scene synchronization, not
fixture CSS, missing native selection, or Babylon projection. The focused proof
passed 1/1; it covers only form-field light desktop DPR 1. Other input families,
dark/responsive states and actual text-selection paint remain to review. The
existing Home/End browser-version assertion stays pinned to its historical
capture; the current-browser test does not pretend to replay Chrome 153 rasters.

**Caret-capture limitation and next coverage order:** the authenticated
input-boundary producer calls `page.screenshot({ clip })`. Installed
Playwright 1.62.1 defaults to `caret: 'hide'`; a focused Chrome
154 native-input control twice confirmed that explicit `caret: 'initial'`
reveals a narrow blinking caret that `hide` suppresses. Thus the retained
reference focused-empty rasters cannot establish native caret visibility or
caret-paint parity. The Astylar canvas caret in those crops is not subject to
that native-caret suppression. This is a capture-instrumentation limitation,
not evidence that the renderer lacks or correctly paints a caret. The focused
test passed twice, 1/1 each, without modifying the original capture. Priority:
(1) extend caret-visible paired boundaries from the new form-field proof to
the other text-input families and applicable dark/responsive states, then
evaluate empty caret and forward/backward selection paint;
(2) extend the narrower light/DPR1 overlay keyboard evidence only for states
not already covered by existing authenticated captures; (3) reconcile the
remaining source-derived family/state checklist; (4) run the complete current
audit harness and unfiltered browser gates. Do not recapture old evidence in
place or interpret the current 436/1,875 matrix counts as that checklist.

**Current caret-visible form-field proof:** a report-only, form-field/light/desktop
checkpoint was captured with Chrome 154.0.8037.58 against the frozen showcase
build. Its 1,887 browser-file hashes and installed-dependency receipt exactly
match the Chrome 153 baseline; the browser version differs. The filtered
checkpoint's case inventory and current harness receipts are not asserted to
match that full baseline. A new producer
uses the existing supplemental capture/verifier, real Tab and delete actions,
six 125ms focused-empty samples, full input trees, and paired
`caret: 'initial'`/`'hide'` local rasters. The immutable report is
`artifacts/material-parity/caret-visible-form-field-154/latest-report.json`
(SHA-256 `8111da2c…`). It records no runtime errors and validates as
checkpoint-bound. The reference caret is visible in three samples (a 1px
purple line, RGB 103/80/164; 19 changed pixels); Astylar's canvas caret is
visible independently and its on/off raster changes two columns, including
RGB 29/27/32. Blink phases are not synchronized and are not compared as if
they were. The paired input boxes have the same measured x/width/height to
the captured precision.

The first color divergence is **input authoring**: the reference input's
matched Material rule declares `caret-color` from
`--mat-form-field-filled-caret-color` / `--mat-sys-primary`, resolving to
RGB 103/80/164. The Astylar input's authored/resolved style omits
`caretColor` and retains text color `#1d1b20`; core's `auto` path uses that
text color. Do not change the fixture as an audit fix or attribute this color
difference to projection. The candidate's wider caret may also expose a
general core paint mismatch (`TextSelectionService.createTextCursor` requests
2 CSS px), but equal-caret-color public proof is still needed before that
separate cause is confirmed. This one family/profile/DPR does not establish
the other text-input states or full caret parity. The focused authenticated
capture test (`node --test --test-name-pattern='current paired caret-visible
capture' tests/material-parity/input-boundary-evidence.spec.mjs`) passed 1/1;
the selected four input-boundary tests passed 4/4 and the new producer passed
`node --check`. The checkpoint's report-only static case passed 1/1; it is not
an enforced matrix result. Complete harness and browser gates remain pending.

**Export reconciliation and remaining gates:** streaming package authentication
found 79 sections before and after, with no added or removed sections. Exactly
seven changed: `sourceFingerprints`, `controlLineBoxes`, `discrepancies`,
`ownerCaretInputs`, `reviewedSourceBatchInputs`, `controlTypography` and
`focusedProofs`. The source inventory grew from 534 to 535 with
`scripts/material-container-font-targets.mjs`; the 107 focused proofs retain
their membership and descriptions, with source line shifts. Old/new compact
finding shards contain identical raw values, cases, classifications and
attributions; 49 complete rows changed only proof hashes or the current
normalization-module SHA-256. The readable report likewise changes proof line
references, not substantive findings. The full audit validator passed during
export, independent cold `--check` passed, and `npm run audit:findings:verify`
passed for the published package.
The initially unreviewed receipt sections have now been independently leaf-diffed
as documented in the current checkpoint above; their exact changes are provenance
only. The complete current audit-harness run, remaining
state/coverage review and unfiltered browser gates
remain required before audit acceptance. No renderer, fixture or original capture
was changed in this export.

**Publication guard:** the preceding `--check` had built and verified evidence
but reported a stale checked-in package after 3,035,518 ms. Because the old
runner compared package bytes before printing validation errors, that stale
result alone did not prove validation. The runner now reports invalid audits
before comparing or publishing and leaves canonical bytes untouched. Its focused
CLI transport test passes 1/1 across valid, stale, malformed and
invalid/no-overwrite cases; the workflow-focused suite passes 6/6.

**Source-inventory assertion reconciled:** the historical 409-source producer
and its original 356-source test assertion are now replayed from pinned Git
revisions, with the prepared assertion accepting exactly the 53 reviewed
additions. Its two focused tests pass, including missing, duplicate, reordered
and forged-receipt mutations. The current producer registers 535 unique paths;
the focused current test verifies the original 424 paths retain their relative
order and identifies exactly 111 additional paths interleaved in the registry,
then checks all current path/order and file-hash receipts. That focused test
passes 1/1. The old "append-only" assumption was a test defect, not an input
equivalence finding. The newly exported canonical package includes this
535-source inventory; the independent check passed, while coverage gates remain.

**Slider-border historical integration reconciled:** the original two-case capture
still yields all 32 reviewed native range border groups (64 observations): the
original width, style and radius rows plus eight exact side-color rows. The
current non-border set has 213 rows because those eight colors moved into the
reviewed group while precise color normalization exposed one fractional
slider-root background difference. The test independently replays the complete
`165ec492` pre-border builder and requires its unchanged 220-row SHA-256
`4e1f09fc…`. Against that authenticated predecessor, every raw scalar, case,
state and authored example is identical. Twenty-five later owner-style rows,
one shadow row, six grid rows, six gap rows, two range-caret rows and one
owner-caret row are checked at their specific boundaries; the remaining 48
differences are pinned to 21 exact reviewed-attribution categories and change
metadata only. The retained first-failure and row-projection diagnostics led to
this source-based comparison; no historical digest, original capture, renderer
or fixture was changed. The targeted production integration passed **1/1** in
800,043.779 ms (`artifacts/material-parity/slider-border-canonical-reconciliation-v6.log`).
This closes recorded full-harness failure 1356 for its selected population; the
four later mutation tests passed in the historical full harness but were not
rerun in this batch. Source-inventory/export reconciliation, missing interaction
boundaries, full canonical validation and final browser/release gates remain
pending. Current discovery is 302 audit files (294 Material and eight other),
one more than the last complete harness run; old inventory counts are not
current proof.

**September 30 — tooltip historical integration row attribution:** the retained failure from
test 1495 was narrowed without changing its original digest. The reduced
tooltip-popup capture has 96 unrelated scalar rows after the two wrapping rows
and independently checked later gap rows are set aside. Exactly 23 of those 96
have later reviewed metadata; all 23 retain identical scalar, cases, states and
authored examples. The reviews cover appearance (1), border color (4), caret
(1), display (1), flex shrink (1), font family/style (2), grid template (2),
overflow (2), pointer events (1), text alignment/transform (2), transform
origin (1), vertical alignment (1), width (1), word break (1), word spacing
(1) and stacking (1). Their predecessor attribution was unresolved. The first
diagnostic log is `tooltip-row-reconciliation-53b37e3.log`, with exact changed
rows retained at `tooltip-wrapping-integration-5XYcCB/changed-unrelated-rows.json`.
Two subsequent runs exposed overbroad test selectors: property names alone
selected 30 rows; matching attribution still selected 41 because some rows had
already been reviewed by the predecessor. The test now selects only complete
rows that actually changed, requires the exact property/attribution/classification
pair, unchanged raw fields, 18 observations per reviewed row and false input
equivalence. Every remaining complete row stays under the historical digest.
The exact-delta run reached and passed those row checks; production validation
then returned nine full-population prerequisites that cannot bind to this
popup-only diagnostic. Those nine errors are now pinned exactly, with any
additional validator error failing the test. The bounded final test passed 1/1
in 869,964.7554 ms (`artifacts/material-parity/tooltip-row-conservation-final.log`).
Successful scratch was removed; failed diagnostics remain retained. This closes
the recorded test 1495 complete-row discrepancy for its selected tooltip
population. Its five validator mutations passed in the historical full harness
but were not rerun here. Source-fingerprint/export reconciliation, full canonical
validation and browser gates are still pending. No renderer or fixture changed.

**Root-shadow integration retry / overflow receipt:** the first targeted retry
stopped before row conservation because the table overflow proof still required
the complete pre-`559f95c` test-source hash. Log:
`artifacts/material-parity/root-shadow-reconciliation-c83ed6d.log` (one passed,
one failed, 405,879.4633 ms). Its failure capture is retained at
`root-shadow-integration-hAL8dQ`; the helper now uses `withAuditScratch` rather
than deleting failure evidence. Table/range source gates now reverse only the
two exact snackbar-stage extraction substitutions and require the complete
original hash `8008b11…`; recorded receipts and proof fields remain unchanged.
Changed assertions, extraction text and unrelated edits are rejected. Focused
dependency/normalization tests passed 2/2 (3,618.3813 ms). The original range/tab,
52-table and combined snackbar/overflow tests passed 3/3 (36,241.0927 ms), log
`overflow-stage-receipt-c83ed6d.log`. Scratch retention passed 1/1 (147.5286 ms).
The production conservation test now checks the exact 36 additional background
groups / 277 observations, their captured authored examples and unresolved
classification, preserving the complete unrelated-row digest. The retry log is
`root-shadow-reconciliation-overflow-receipt.log`: all three selected tests
passed (719,899.3272 ms total; production conservation 716,253.701 ms).
This closes recorded failure 1340: the original scalar population is conserved
after accounting for those exact new backgrounds, the root-shadow/root-flow
attributions pass, every unrelated complete-row digest remains identical, and
the production validator reports no shadow/flow error. Successful scratch
`root-shadow-integration-JRg9Nx` was removed automatically; the failed capture
remains retained. The five mutation cases from previously passing test 1341
were not rerun in this bounded batch. No renderer, fixture, saved finding,
color normalization or threshold was changed. Next: remaining tooltip complete-row
conservation and slider-border precision-population reconciliation, followed by
the outstanding inventory/export and interaction-coverage work; final gates remain
required.

**Root-shadow scalar failure isolated:** a focused check now authenticates the
original capture and both normalization contracts at the integration's exact
`502ea44` predecessor. Its same `selectStates` boundary selects 277 root inputs
across all 36 families. Every reference changes only `backgroundColor`, from
`rgba(246,241,249,1)` to `rgba(245.879925,240.73989,248.60001,1)`; complete
normalized objects outside that property, candidate effective/normal/interaction
stages, and shadow values are unchanged. The candidate background remains the
older rounded value, so these are newly visible differences, not evidence that
the colors are equivalent. Command: `node --test --test-name-pattern='independently
authenticated normalization transition'
tests/material-parity/root-shadow-canonical-integration.spec.mjs` passed 1/1
(3,357.9164 ms total). No full builder, browser capture, saved evidence or live
normalizer changed. This closes the selected-input normalization question only;
production test 1340 remains open. Next: account for these exact additional
background observations in production conservation, then inspect any remaining
complete-row metadata changes without refreshing or weakening its digest.

**Case-index heading dependency:** the input-tree test receipt `c2d0884…`
predates `1660b67`'s four heading-overflow cases (`e442a49…`). An exact reverse
projection now authenticates the complete predecessor, preserving every original
div case/assertion while rejecting changed defaults, margins, missing assertions,
duplicate fragments and unrelated edits. The focused conservation test passed
1/1 (1,042.4435 ms); the unchanged browser input-tree suite passed 10/10
(6,095.1366 ms). The case-index collector uses this proof and now reaches the
next distinct boundary: policy source `3256863…` versus expected `44461b3…`.
The policy transition is now authenticated: removing the exact three added source
findings and the non-intentional `documented-limitation` category restores the
complete recorded policy (`7e939ae…`). The runner's later interaction geometry
and paint diagnostics reuse `restoreGapCaptureDiagnostics`; its complete
predecessor is conserved, not treated as a fresh capture. All nine case-index
reports now pass source and non-receipt conservation. No historical receipt or
finding was rewritten. Focused policy/heading/rejection checks passed 3/3 in
24,714.0073 ms; the existing capture-diagnostic reversal test passed 1/1 in
1,086.6351 ms. The rejection test now verifies a passing original collector first
and expects the earlier strict stacking-source rejection for its renamed mapping
mutation. Assertion migration now authenticates the two exact added border-test
imports and all eleven added, filtered-out callbacks while preserving the entire
original suite. Its mutation checks reject changed import names/modules, eager
side effects, forged source bytes and altered historical assertions (2/2 passed,
7,643.9134 ms). The first membership replay passed 10/11 and isolated the remaining
generated-mapping runner receipt; that check now reuses the same exact diagnostic
reversal. Its 387-boundary replay passed separately (1/1, 3,098.6514 ms).

`node scripts/audit-material-case-index-conservation.mjs` then completed all 11
write-disabled membership tests with zero failures (69,163.3929 ms), checked that
the nine saved evidence files remained unchanged, and refreshed only the existing
conservation report. The complete conservation suite passed 4/4 (26,534.0369 ms).
This closes case-index source/membership reconciliation, not canonical acceptance
or rendering equivalence. Remaining priority: other recorded source/inventory and
normalization reconciliation failures, missing Material interaction boundaries,
then export/cold verification and final acceptance gates.

**Remaining typography bindings:** host-token proposal, leaf-family tests and
leaf weight/tracking tests now bind their own recorded historical revisions.
The three existing suites passed 10/10 in 239,970.9222 ms
(`remaining-typography-normalizer-reconciliation.log`), preserving complete
no-write payload replays and mutation checks. No stored proposals, raw evidence
or live normalization changed. Next: remaining source-receipt/integration
failures, then missing Material interaction boundaries and final gates.

**Font/leaf/motion replay boundaries verified:** historical font-ownership,
leaf-font and motion proposals now use their own pinned normalizers. The first
batch passed all four leaf-font tests but exposed two source-receipt boundaries.
The shared-font inventory registration now has an exact reversible producer
transition, with duplicate/renamed/unrelated additions rejected; the existing
producer-transition suite passed 27/27 in 25,475.715 ms. Motion replay differed
only in three source receipts, with every non-receipt field identical. Its
collector now uses the existing `verifyMotionSourceConservation` instead of
requiring obsolete source bytes: this authenticates source opt-ins, all twelve
mapping declarations and every original finding without rewriting receipts.
The font-ownership, owner-motion and motion-conservation suites passed 10/10 in
234,782.0538 ms (`font-motion-source-reconciliation.log`), including full
historical no-write replays and negative controls. Stored proposal bytes,
live normalization and original evidence remain unchanged. Export/fingerprint
reconciliation and the other recorded integration failures remain open.

**Container/font and layout replay reconciliation:** both container font
proposals and the layout-request proposal now use the normalizer from their
own pinned canonical revision, retaining unchanged proposal bytes and checks.
The first combined run passed eight tests but exposed a distinct container-size
module-initialization failure: size collector → border evidence → origin alias
mapping → full audit builder → reviewed-input binding → family collector →
uninitialized size target list. The shared 21-owner list now lives in the
dependency-free `scripts/material-container-font-targets.mjs`, re-exported from
the original module; family filtering still excludes only stepper. This removes
the eager data dependency without copying or changing the evidence population.
Both import orders have an explicit subprocess regression check.

`node --test --test-concurrency=1 tests/material-parity/container-font-family-stages.spec.mjs
tests/material-parity/container-font-stages.spec.mjs` passed 11/11 in
197,445.5004 ms (`container-font-reconciliation-import-order.log`), including
original 1,082/1,150 observations, complete historical payloads and mutations.
All three layout-request tests passed in the preceding combined run
(`container-layout-normalizer-reconciliation.log`), including the no-write
complete-source/payload replay. No renderer or fixture was changed. The new
shared data module is explicitly registered in the source inventory; the next
inventory reconciliation must account for this addition, not assume the earlier
534-file population is still current. Canonical export remains pending.

**Slider integration and historical authoring replay verified:** the unchanged
`slider-input-box-integration.spec.mjs` rerun passed 2/2 in 914,183.1216 ms
(`slider-input-box-integration-7708b8e.log`). Both production builders conserve
all scalar and unrelated complete rows; all eight validator mutations remain
effective. This closes the synthetic height applicability failures 1373–1374.
The historical authoring proposal now binds normalization at its already-pinned
`06e50db` canonical revision, rather than binding its historical digest against
current code. Live normalization, original evidence and proposal bytes are
unchanged. `node --test tests/material-parity/authoring-input-attribution.spec.mjs`
passed 5/5 in 87,170.7746 ms, including independent source replay, complete
historical payload authentication, nine groups / 136 observations, 8,330
unrelated rows and all rejection controls. The corresponding button-paint and
font-style reconciliation also passed: `node --test --test-concurrency=1
tests/material-parity/button-hover-composition.spec.mjs
tests/material-parity/button-paint-attribution.spec.mjs
tests/material-parity/control-font-style-attribution.spec.mjs` completed 12/12
in 260,024.0095 ms (`historical-normalizer-reconciliation.log`). Each historical
proposal uses its own pinned revision and unchanged normalization digest;
source replays, entire frozen payload checks, no-write guards, membership and
mutation assertions remain intact. No proposal bytes, expected counts, live
normalization or canonical classifications were refreshed. Current export
source fingerprints must still be reconciled at the next integration milestone.

**Full harness completed; first bounded reconciliation:** the unfiltered
`full-audit-harness-834258e.log` ended with 1,571 tests, 1,449 passed, 122 failed,
zero cancelled/skipped/todo, in 31,184,564.6298 ms. No harness child remains live.
The fixed-height review now leaves declared-height rows outside its evidenced
owner/family population unresolved, instead of invoking an inapplicable proof.
`node --test tests/material-parity/control-height-request-review.spec.mjs`
passed 2/2 (32,550.0389 ms): the new unknown-owner/family boundary test and the
unchanged original 43-group / 1,414-observation replay, including mutations and
raw/unrelated-row conservation. Direct proofs still reject unknown owners and
changed heights. This is an audit applicability correction, not a renderer fix;
the complete synthetic slider integration rerun remains required. Historical
failure notes below describe the completed run, not a currently live process.

**Tooltip integration conservation:** test 1495 failed after 369,555.4078 ms
at the unrelated complete-row digest against `65487ae`: current
`cba874acbb2b76ed194451814ee65694296777a4214b33ec7b57b579572e04fd`,
historical `a78828e86f00f5e49c92bb7954fa79abc1de91c628f819779e2b8f3ebd4b3d0c`.
Its two wrapping groups / 36 observations, exact values, unchanged raw capture,
complete scalar projection and source-validated later-gap checks passed first.
Unlike the root-color failures, this establishes a complete-row metadata
conservation discrepancy without scalar divergence in the selected tooltip
population. The exact changed rows remain to be isolated; do not assume a
particular later attribution or refresh the digest. Test 1496 passed all five
production-validator mutation controls in 1,841,419.3532 ms; source-binding
tests 1497–1502 passed. Tests 1396–1494 introduced no additional failures.
The same full harness has advanced to tracking-input population tests.

**Synthetic slider integration boundary:** tests 1373 and 1374 failed after
221,412.4451 and 218,138.4239 ms during production audit construction, before
their slider assertions or mutation checks. The stack reaches
`proveFixedHeightRequest` (`control-height-request-review.mjs:73`), whose
`fixedHeightOwners` does not include either slider input. The synthetic helper
supplies candidate `height: '44px'` and omits reference height; the later generic
height-review pass attempts to classify every unresolved height row through
that original-owner-only proof. Reconcile the proof's applicability boundary
without fabricating slider height evidence, removing the synthetic difference,
or weakening slider conservation/mutations. Tests 1375–1379 passed the focused
binding checks and replay of all 156 original slider owners. Tests 1380–1392
passed the peer-pointer, placement, snackbar camera-depth and sort proofs.
Inventory tests 1393–1394 separately failed on 534 sources versus their prepared
409-source expectation; include these in the existing exact inventory-transition
review rather than blindly refreshing counts. The full harness remains live.

**Slider-border integration result:** the same full harness has advanced through
test 1372 and entered `slider-input-box-integration.spec.mjs`. Test 1356 failed
after 291,748.5582 ms at its first attribution-count assertion: 32 rows versus
the historical expectation of 24. Commit `11c01f9` extended the existing native
border proof from twelve properties to sixteen, adding the four side colors;
the integration assertion still names twelve. The subsequent source-binding
test 1365 passed, verifying all 156 original owners across 78 captures, exact
preservation of every historical non-color proof, and the added color coverage.
Reconcile the integration's exact color population and historical complete-row
projection, rather than simply replacing its count or dropping conservation.
The later assertions in test 1356 were not reached. Tests 1357–1360 passed the
later-gap, grid, shadow and border mutation checks (291,534.4754;
1,353,631.3524; 1,567,870.499; and 3,189,561.4488 ms respectively).
Tests 1361–1372 also passed the border, disabled-opacity and focused native-box
proofs. These are audit-evidence checks, not a renderer fix or full acceptance.

**Full-harness reconciliation findings (run still in progress):** prioritize
historical/current normalization boundaries before treating these failures as
new renderer evidence. The authoring-attribution collector and its test still
bind the historical seven-function digest against current source. A read-only
replay using the existing `bindHistoricalAuditNormalization` at the proposal's
`06e50dbcd3594c5987d63a4ec38e792b87b08dde` revision reproduces all nine groups /
136 observations. All finding fields match except `canonicalRowSha256`, because
this small probe uses reduced join-test rows rather than full historical rows.
The subsequent complete historical-row replay passed (exit 0, 79,370.2846 ms):
`readCaretConservationRows` authenticated the pinned compressed/decoded payload
and all 8,339 rows; `planAuthoringInputAttribution` with the historical normalizer
reproduced every saved proposal field, including full-row digests and 8,330
unrelated complete rows. The saved source-proof and original-capture hashes were
verified, and the current equivalence function authenticated against its saved
descriptor. Source collectors were not independently reexecuted in this probe;
that remains part of repairing and rerunning the original collector tests.
No stored receipt was refreshed and no evidence files were written.

The explicit-gap integration test completed in 385,036.4084 ms and failed at
line 65's scalar-population equality, after its 16-group / 1,032-observation,
complete-coverage and unchanged-raw-input assertions passed. The current side
contains precise color differences such as reference
`rgba(245.879925,240.73989,248.60001,1)` versus candidate
`rgba(246,241,249,1)` that its earlier baseline did not retain. Reconcile the
reviewed precision transition explicitly; do not delete those differences or
weaken population conservation to make the historical test pass.

The owner-gap integration failure confirms the same historical precision
boundary independently: test 1061 completed in 378,630.4517 ms and failed at
`owner-gap-canonical-integration.spec.mjs:60` after gap-classification and
unchanged-raw-input checks. Its `cab0cc3` predecessor comparison guards
`normalizeValue` and `formatNumber`, which remain identical, but omits their
changed `normalizeColor` dependency. Direct function comparison confirms that
the predecessor rounded sRGB channels whereas current code preserves them.
The failure includes newly retained root background-color differences for
autocomplete, badge and bottom-sheet. Reconcile the complete normalization
transition and exact additional populations before checking unrelated-row
conservation; do not broadly exempt color properties or remove these rows.

The reviewed-authoring integration file has now completed. Test 1269 failed at
`reviewed-authoring-canonical-integration.spec.mjs:84` after 425,482.4011 ms:
its `c391a6f` scalar comparison includes the same newly preserved precise root
background colors. AST comparison confirms that its three guarded functions
(`reviewedTemplateTextMappings`, `canonicalStyle`, `equivalentValue`) match,
as do `normalizeValue` and `formatNumber`, but `normalizeColor` does not.
Apply the same explicit precision-transition reconciliation, retaining every
additional raw difference and the later, not-yet-reached precedence assertions.
Test 1270's ten mutation controls passed in 4,208,367.3425 ms. Its body builds
one audit then invokes the full validator for each clone; that measured cost
explains the long quiet interval, not a hung process. Preserve all mutations
when considering dependency-validated reuse; this is not authority to replace
their production-validator checks with weaker assertions.

The `control-overflow-observation.spec.mjs` source-extraction failure is repaired:
the three-function snackbar/overflow test now executes the actual
`beforeTypographyReviews` production declaration rather than the later final
owner-omission pipeline. Its marker must be unique; both bound and unbound paths
remain checked. The focused `combined snackbar and overflow proposal` test passed
1/1 in 28,915.994 ms with unchanged 8,483 raw rows, 31 changed groups / 1,292
observations, complete unrelated-row conservation, production validators,
forged metadata and missing/duplicated-case rejection. No production code or
acceptance expectation changed. This closes harness failure 193, not snackbar
rendering or full integration acceptance; the original full-run log is retained.

Test 1277 (`reviewed-input-canonical-integration.spec.mjs`) stopped during
expansion-owner source replay after 224,170.7933 ms. A separate read-only replay
of `collectExpansionOwnerMapping` reproduced every saved field except
`sourceFingerprints[2].sha256` for `tests/material-parity/run-material-parity.mjs`:
stored `c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10`,
current `4ed6abe8b6c8028565ffc5c0674d285a567714e19842f75672b599125bd99e6d`.
This is the existing runner-receipt transition, not a newly divergent expansion
finding. The attribution collector now shares the follow-up replay's exact
runner reversal through `conserveExpansionOwnerProof`, which returns a copy only
after every other receipt and observation matches. Its tests use the proposal's
recorded normalization revision, not the newer live normalizer. The combined
`expansion-owner-attribution.spec.mjs` and `followup-input-source-replay.spec.mjs`
run passed 7/7 in 102,516.5423 ms, including the write-disabled full historical
canonical join, 43 proposed groups, 59 preserved reviewed groups, 8,296 other
complete rows, four source proofs / 2,640 observations, and negative controls.
No stored proof/proposal bytes changed. This repairs the demonstrated dependency
boundary; test 1277's later full-population assertions still need replay in the
coherent integration batch. The direct owner-mapping CLI snapshot `--check`
still compares current receipts literally; it is not claimed current by this
historical attribution replay.

Root-shadow integration has now completed. Test 1340 failed after
331,395.6612 ms at scalar-population conservation against `502ea44`, with
newly retained precise background colors. AST comparison confirms that its
three guarded functions plus `normalizeValue` and `formatNumber` match that
predecessor, while `normalizeColor` differs. This belongs in the existing
precision-transition reconciliation, not a new shadow-rendering investigation;
later attribution-precedence assertions were not reached. Test 1341 passed
all five production-validator mutation controls in 1,819,200.1015 ms.
The following survey test (1342) stopped at its source-receipt assertion:
`border-initial-input-evidence.mjs` has current normalized hash
`a809c257d8edcd07b1261cad6f7a0a15b5245fa0832922e4bebf287e21b6eff2`
versus stored `3dbcf33ff70244a8179f438962a2549fb7e354948f084d35d433bcf82e76f9f4`.
The survey now uses the existing `readGapSurveySource` border transition proof.
Because its historical receipt also fingerprints the test itself, the edited
receipt loop and two imports must reconstruct the entire original test source
at its recorded hash; no original observation assertion or saved receipt is
refreshed. The original 2,311-observation replay and mutation proof now pass 2/2
in 11,221.2737 ms. The reused border-transition negative controls pass 1/1
(1,276.9253 ms). An initial run exposed CRLF versus normalized-source bytes in
the new reader call; preserving the original LF hash convention resolved that
without altering evidence. The independent mutation proof (1343) and
Chrome shadow-serialization checks at DPR 1 and 2 (1344–1345) passed, preserving
the distinction between browser alpha `0.133` and candidate request `0.14`.
These checks establish serialization, not candidate shadow-raster equivalence.

**Focused input boundaries captured — September 29:**
`scripts/audit-material-input-boundaries.mjs` reuses the supplemental capture
infrastructure against the unchanged build from `enforced-full-2b6cddc`.
All 1,887 browser files matched before serving; actual document/script/style/font
responses also matched the checkpoint during capture. The server was stopped.
`artifacts/material-parity/input-boundaries-keypress-559f95c/latest-report.json`
has SHA-256 `39df94e0eb87480d3824927a41a9950d1d275f7c97ab97a571c449efdc6da7d7`.
It contains 110 paired boundaries / 220 local rasters and full input trees:
form-field, email input, autocomplete, datepicker and timepicker; light desktop,
DPR 1/2; initial, real Tab, pointer focus, four timed focused-empty samples,
typing, forward/backward selection and blur. Runtime errors: zero. The existing
supplemental validator authenticates every tree and runtime asset; the new
focused evidence test additionally checks every raster, action population,
empty/focused state and equal typed value. Both tests pass (1,249.1749 ms).

New observed differences, not fixes: Tab selects the initial `Atlas` text on
the reference, while the candidate retains collapsed position zero at both DPRs.
After selecting characters 0–3, End plus three Shift+Left presses selects the
last three reference characters but candidate characters 0–3 for form-field,
autocomplete and datepicker (both DPRs). The form-field local rasters visibly
confirm opposite selected substrings. First core divergence is
`TextInputManager.moveCursor` (`text-input.manager.ts:745`): an existing selection
makes End collapse to the selection maximum instead of the text end. The served
`chunk-3JXWRYJY.js` contains that exact branch and matches checkpoint SHA-256
`f366533bd9f80b7f85379db5031c0dea8c9c1840c14fb6ec35f57f1b65ad9eab`.
The root is keyboard selection arithmetic, not CSS/world projection. Do not fix
it during the audit. A minimal native input versus the complete `moveCursor`
method extracted from the hash-bound served bundle now isolates both Home and
End: selection [0,3] + End gives native [5,5], shipped [3,3]; selection [2,5] +
Home gives native [0,0], shipped [2,2]. No-selection Home/End and selected
Left/Right controls match. This six-case source/browser proof and the existing
capture checks pass 3/3 in 4,874.092 ms. It complements the public Material
capture; it is not a replacement implementation or a renderer change.
Tab-selection ownership still needs isolation. The timepicker reference tree
at forward selection records an open combobox, listbox popup, and active option
`mat-option-0`; Material's installed `timepicker.mjs:139,378` configures
`withHomeAndEnd(true)` and routes open-popup keys through that manager. Keep this
popup-key-routing explanation separate from the confirmed core text-selection
defect; a settled boundary immediately after Home/End is not in this capture.
Native email endpoints remain null: use its retained pixels, not invented native
selection indices. A candidate form-field empty caret is visibly present in the
first DPR1 sample; this does not establish every family's caret paint or timing.

The first `insertText` attempt was stopped because it omitted keydown events and
could not establish typing parity. Its incomplete 4,608,429-byte directory
`input-boundaries-559f95c` is retained as diagnostic failure, not accepted evidence.
The completed capture occupies 46,489,602 bytes (441 files), all used by this
proof. No fixture, renderer or authored input changed. Supplemental findings
are not yet in the canonical classifications/source inventory; dark/responsive
coverage and detailed caret/selection raster review remain open.

**Remaining interaction-coverage review:** the configured matrix is not proof
that every requested interaction boundary is captured. In
`tests/material-parity/run-material-parity.mjs:525`, the `focus` action calls
`HTMLElement.focus()` on both sides, except timepicker, which receives a mouse
click. It does not establish Tab navigation. The `edit-empty-blur` action at
line 609 selects all, deletes and blurs before the final measurement; it does
not itself retain a focused-empty or noncollapsed-selection capture. Check
applicable supplemental public proofs and their exact scope before claiming
keyboard-focus, editing and selection coverage. If absent, extend existing
capture infrastructure with equal actions and intermediate input evidence;
do not substitute generic renderer tests for Material comparison/state evidence.
The main matrix does explicitly exercise both slider handles with eight motion
samples, timepicker wheel scrolling, outside/canvas dismissal for its named
families, and three repeated mobile Escape cycles. These actions are verified
in source, not a claim that all their outcomes or authoring inputs are equal.

The retained overlay keyboard capture is available for reuse review:
`artifacts/material-parity/overlay-keyboard-4d782df-settled/result.json`
(SHA-256 `2d46a54a48316404db90f1227e5d3901c43e6aa230180719697d25958914bb90`).
Read-only verification authenticates its producer against commit `07609be`
(producer SHA-256 `4fd386576d688396a80f123f41e0a07480ac15963431d46970b37774368b38a1`),
all three application-source receipts against current files, and all 104 package
receipts against both the retained source build and the currently installed
showcase package. It contains 24 plain/instrumented paired cases for menu,
bottom-sheet and dialog: ArrowDown/Escape and three Tabs/Shift+Tab/Escape,
light profile, 900x700, DPR1, with no recorded page errors. This resolves whether
these keyboard captures exist; do not recapture merely because the main matrix
uses programmatic focus. The current producer hash differs and this inspection
does not authenticate a currently served bundle or expand coverage to other
profiles/DPRs, raster visibility, or editing. Replaying the pinned producer's
observer-equivalence assertions passes for all 12 pairs / 54 settled-and-key
boundaries per observer variant, including exact sequence completeness and
final application state. The retained identities confirm the already documented
menu keyboard mismatch, sheet focus escaping to BODY, matching dialog Tab cycle,
and dialog Escape restoration mismatch. Reuse that limited light/DPR1 coverage;
do not reopen those diagnoses or count it as broader profile/editing coverage.

The supplemental tooltip keyboard question is resolved without recapture:
`node --test --test-name-pattern="real Tab reaches both tooltip triggers"
tests/material-parity/tooltip-position-composition.spec.mjs` passes 1/1
(1,435.3268 ms process). Its six paired initial/Tab-focus/Tab-blur states at
DPR 1 and 2 authenticate retained capture, tree and screenshot receipts and
104 installed/core source bindings. Both triggers receive real keyboard focus;
only the reference authors an open popup. This is a tooltip opening-state
authoring omission, not evidence that an existing popup was misplaced. It does
not establish keyboard coverage for the other families.

Focused-empty and text-selection coverage remains missing from the inspected
Material capture path: `captureBrowserInputTree` records control value but not
selection endpoints/direction; `edit-empty-blur` measures after blur; the
caret-context supplemental producers replay style/caret-color questions rather
than forward/backward text selection. The general parity runner already has
selection/control visual-state observations, but its generic fixtures are not
Material-state evidence. Next extend existing Material capture infrastructure
with explicit action-boundary observations, reusing that observation contract;
do not count existing caret-color classifications as caret/selection behavior
coverage. Do not edit tested capture dependencies while the full harness is live.

Selection instrumentation must preserve the native email boundary: the `input`
comparison authors `type=email` on both sides (`reference.component.ts:77`,
`astylar.component.ts:917`), unlike the four text-input families. A read-only
Chrome 153.0.8010.53 probe typed `Atlas`, pressed Home then Shift+ArrowRight,
and replaced the selection with `Z`. Both native text and email inputs produced
`Ztlas`; only text exposed endpoints 0/1 and direction `forward`, while email
returned null for all three selection fields. Thus null is unavailable native
evidence, not an empty selection or failure to select. Keep the email input
unchanged and verify editing behavior plus focused selection/caret paint;
compare exact endpoints/direction where the native input supports them. The
probe establishes browser observability only, not Material editing parity.

**Canonical reconciliation verified:** export from `4624a9c` passed in
2,166,050.6272 ms; independent `ASTYLAR_AUDIT_COLD=1` replay of
`node scripts/export-material-input-audit-current-ancestry.mjs --check` passed
in 2,352,821.8679 ms (exit 0), including full canonical and Markdown comparison.
Coverage remains 436/436 static and 1,875/1,875 interaction cases across 36
families, 8,483 scalar groups / 389,202 observations and 135 source findings.
Unresolved scalar attributions and unclassified groups are zero;
`inputEquivalent` remains false. This is not audit completion or renderer repair.

Conservation review against accepted `dcc6e52` authenticated both packages:
71 of 79 sections are unchanged; all 8,483 raw scalar rows are preserved.
95 newly classified groups cover 3,888 observations; one existing 60-observation
button line-box attribution updates its receipt. Other changes are source receipt
refreshes, classification totals and bounded-proof scope wording. All 534 source
fingerprints match disk (532 raw, two LF-normalized). Cold replay read and verified
1,205 files / 89,154,859 bytes, with two collectors, ten memory hits, zero disk
hits and zero invalidations. The warm export used one collector and one disk hit.
Accepted compressed SHA-256:
`db1b33c93c9169169fda86f5e6b36bf38fb1981d3c0aef0ef82cc44ef7b05b1c`;
decoded SHA-256:
`c93c4ad15d0094177b7e20651829109040446d8ec3334ee8012ab46a288de9b3`.

Compact import and `npm run audit:findings:verify` pass, preserving all 39,904
control records as well as the scalar/source populations above. Compact shards
total 72,700,471 bytes; index SHA-256 is
`96d60d33e947811518e31724a6a5843f616ea291debf98f1d210e533b4896005`.

Canonical package committed and pushed as `2b6cddc` on
`codex/material-audit-alignment-integration`. GitHub accepted the push with its
recommended-size warning for the 59.91 MiB compressed report (not a push failure).

**Fresh Material output gate passed:** unfiltered `npm run material-parity:check`
completed with exit 0 against the rebuilt packed dependency, preserving the
original input-audit baseline separately. Saved report:
`artifacts/material-parity/enforced-full-2b6cddc/latest-report.json`, SHA-256
`a6f832635e896809661dcbb35eb2447e9e6ce3fb8c718ee7d7d969e3f051892c`.
All 436 static and 1,875 interaction cases pass. Static minimum/median SSIM:
0.965296 / 0.996382; maximum edge error 0.984px. Interaction minimum/median SSIM:
0.954514 / 0.997458. Text alignment passes 428/428 static and 2,116/2,116
interaction targets (maximum center-offset error 0.722px); focused rasters pass
120/120 and 880/880, uniform backgrounds 24/24, shadow profiles 12/12.
This is output-gate acceptance, not equal-input rendering or repaired defects.

Remaining acceptance requirements, in execution order:
- `node scripts/run-material-audit-harness.mjs` is running with complete output
  retained in `artifacts/material-parity/full-audit-harness-834258e.log`.
  Current discovery finds
  301 files (293 Material, four general, four TTS), including all 46 legacy
  `parity:harness:check` files. The legacy command alone cannot prove this gate.
  Inventory/runner tests pass 4/4 in 664.3749 ms, including nested discovery,
  filter rejection and child-failure propagation; this is not the 301-file run.
- Complete the other unfiltered release-matrix constituents and record each
  outcome separately. Avoid concurrent writers to builds or captured evidence.
- Finish requirement-by-requirement deliverable review: 36-family/state inventory,
  exact source/history and element evidence, confirmed versus suspected causes,
  focused public proofs, plugin/core ownership and compensation-removal plan.
  Canonical classification completeness does not establish those broader claims
  or repair any renderer defect.

Historical output results do not satisfy fresh final gates. No renderer, fixture
or original capture has been changed.

**Deliverable reference/provenance review:** all 188 source file/line citations
and 106 focused-proof file/line citations in the canonical Markdown resolve to
existing files and in-range lines. This checks reference integrity, not semantic
proof or fresh execution. The authenticated compact summary retains 88 structure
differences and reports zero unexplained source findings / undetected definitions.
Two source findings omit `introducedBy`, rendered as `undefined`; supplementary
history was checked directly without reopening their established diagnoses:
- `fixture-tooltip-benchmark-hover-suppression`: `git show 7159b1d` adds the
  pointerenter handler excluding benchmark-open; `git show a0f3328` replaces it
  with the current allowlist of hover/held benchmark states. Thus the suppression
  originates in `7159b1d` and broadens in `a0f3328`.
- `core-border-currentcolor-has-no-color-context`: `git show 19d01be` adds the
  service's call to `parseBackgroundColor(style.borderColor)` without element
  color context. This establishes source lineage, not a first-bad runtime revision
  or proof that equivalent behavior did not exist before the service extraction.
Keep these provenance qualifications with the findings. No classification or
canonical bytes changed; a prose supplement does not justify another full export.

**Non-building acceptance checks:** `npm run examples:check` passes all 11
translation pairs (eight parity-backed, three focused inline).
`npm run skill:check` passes synchronized developer references (12 sources,
118 exports) and both repository skill validators. The standard validator
`python C:/Users/solar/.codex/skills/.system/skill-creator/scripts/quick_validate.py`
also passes for `.agents/skills/astylarui-developer` and
`.agents/skills/astylarui-maintainer` (exit 0 for each).
`npm run capabilities:check`
fails one source receipt, not a capability assertion: element-creation.service.ts
expects `2edeb33f4095e3d3bb2be889991473e153df96f6d9a46ec9af94bbc56fa87d24`
but current normalized source hashes to
`bf5fd5861c7d1b412520a41abf5bfa0aa1085d9a139a96f3d202dde6cbf8ea3a`.
Git source hashing proves the expected value is exactly `97e0da0^`, while HEAD
matches `97e0da0`. That commit adds authoritative CSS-layout select anchor and
viewport callbacks; its element-creation diff is ten added lines, not a line-ending
change. Catalog receipt and bundled developer copy still predate that commit.
Do not report the capability gate as passing or blindly refresh the hash. Review
the owning select-anchor proof with the remaining test gates before reconciling
the receipt; preserve capability claims and the accepted audit evidence.

**Full unit gate executed, not green:** `npm test -- --watch=false
--browsers=ChromeHeadless` completed 504 tests with 479 passes / 25 failures.
The first terminal output truncated failure details. One rerun with
`--reporters=dots` reproduced 479/25 and preserves its complete output in
`artifacts/material-parity/unit-acceptance-9476a03.log`, SHA-256
`fe4339cf184135984460bc024c418547b6518a909090aaeb48f3c2947f6c31a1`.
Chrome Headless 153; rerun test execution 25.639 seconds (build time separate).
All failing test names belong to the two deliberately diagnostic audit files:
- Six rounded-radius cases fail because ordinary Karma does not install
  `window.auditCapture`; this is runner integration, not six new shape diagnoses.
- Five overlay font cases fail loading `/audit-roboto.woff2`, served by the
  dedicated `scripts/audit-overlay-layout-stage.mjs` runner, not ordinary Karma.
- Twelve overlay cases report actual CSS sizing/placement differences (six chip,
  six dialog compositions); preserve assertions and mismatch evidence.
- Two fractional nested-row/flat-column cases report projected x=39.937888...
  versus CSS x=40, consistent with the existing 321.5-versus-322 viewport proof.
These categories explain why 25 is not a count of independent renderer bugs;
they do not turn the failed unit command into a pass. No tests were excluded,
assertions weakened, fixtures changed or renderer fixes made. The existing
select-anchor test rejects mesh-position reads and uses retained fractional CSS
rectangles; its suite is not among the failures. Remaining full harness and
browser gates still require their own results.

### Historical checkpoint trail (superseded status, retained evidence)

**Reporting scope reconciled before retry:** bounded caret/gap/origin/alignment
and calendar-close prose now distinguishes collector-local limitations from final
row attributions. Retained visual parity is explicitly not a fresh final-gate
result. Historical proof descriptions retain their original limits, with a scope
notice; the transformed-containing-block plan also defers to final row evidence.
No scalar observations, classifications, proof descriptions or acceptance gates
are changed. Exact text-only reversal still authenticates the complete historical
producer; the existing stacking proof also rejects unrelated producer changes.
`node --test tests/material-parity/stacking-input-review.spec.mjs` passes 1/1
in 10,115.508 ms; scoped `git diff --check` passes.
Next export includes this clarification and the vocabulary correction `987b631`;
it still requires conservation review, cold replay and final acceptance gates.

**Canonical export exposed a classification-vocabulary mismatch:** export from
`e24a85d` completed in 2,171,401.666 ms, exit 1, with one unclassified difference:
tooltip-popup `wordBreak`, 18 observations, classified `documented-limitation`.
All 8,483 scalar groups / 389,202 observations remain present; unresolved
attributions are zero, with 436/436 static and 1,875/1,875 interaction coverage.
The support-gap proof deliberately does not claim an intentional design limit;
the canonical vocabulary now recognizes this distinct category. The bound-tail
test also checks reviewed classifications against that vocabulary and rejects an
unknown limitation label. Focused test passes 1/1 in 40,422.5345 ms.
Export evidence-session verification read 1,205 files / 89,154,859 bytes with
one collector, ten memory hits, one disk hit and zero invalidations.
The generated report is **not accepted or imported**. Next reconcile report
prose, regenerate with the vocabulary correction, inspect conservation and source
provenance, independently replay cold, and finish deliverable/browser acceptance.
No renderer, fixture, raw evidence or classification justification was changed.

**Final owner styles integrated; canonical reconciliation next:** the five-group /
94-observation proof from `7b40c95` is in the bound production tail with replay and
unbound guards. Expanded current-checkpoint tail covers 75 groups / 3,528
observations, with conserved raw/unrelated values and reverse-order agreement.
Together with the earlier 20-group radius stage this projects **zero unresolved
scalar groups**. Canonical still reports **95** until export; this is not audit
completion or rendering equivalence.
`node --test --test-name-pattern="omitted owner paint requests preserve|final owner style boundaries" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/custom-owner-border-review.spec.mjs`
passes **2/2**, 34,981.1396 ms total. Historical producer reversal retains
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer is `9fd997b0470b18c959b5d41c3b188ce996672b5db20265a7b2d698f417f0a68f`.
`node scripts/export-material-input-audit-current-ancestry.mjs --dry-run` confirms
all five named baseline inputs exist and constructs the complete invocation;
it does not authenticate evidence or establish current source applicability.
Next run source/export reconciliation, inspect the full resulting differences,
and independently verify canonical replay before final coverage/deliverable and
browser-gate acceptance. Preserve all core/support/authoring defects and remaining
uncertainties; resolved classification is not resolved rendering behavior.
No renderer/fixture changes or new captures.

**Final five scalar questions reviewed; integration pending:** 94 observations
reuse existing custom-owner and tab ancestry proofs. Both compact tabs add 1px
top padding (34 observations), absent from native measured labels and their
containing controls; history `bc4d442` introduces this density-specific change.
Linear progress explicitly requests text-align:start, omitted by the custom host
(20); spinner instead compares computed start to omitted local alignment (20).
Do not collapse those two cases into one classification or infer inherited values.
Icon objectFit (20) compares a non-replaced mat-icon host containing SVG
`preserveAspectRatio="xMidYMid meet"` to a PNG img requesting contain. This is an
owner-measurement boundary, not proof that the previously recorded SVG-to-raster
replacement is acceptable or that assets/paint are equivalent.
`node --test --test-name-pattern="final owner style boundaries" tests/material-parity/custom-owner-border-review.spec.mjs`
passes **1/1**, 3,239.2202 ms total. Complete memberships and scalar/stage bindings,
raw/unrelated conservation, changed rules/stages, incomplete evidence and forged
membership are checked. Three groups are authoring defects, two harness-stage
boundaries. Canonical remains **95 unresolved**, integrated projection **5**;
these final five await integration. Next: integrate, reconcile source/export,
then assess all coverage/deliverables and final gates. A zero projected scalar
count will not alone establish audit completion. No renderer/fixture edits or
new captures.

**Remaining border reviews integrated; export pending:** the five-group /
252-observation proof from `3045dc9` now runs in the bound production tail with
replay and unbound-attribution guards. Expanded current-checkpoint coverage changes
70 groups / 3,434 observations, with exact raw/unrelated conservation and reverse
reducer agreement. No previous classification is reopened.
`node --test --test-name-pattern="omitted owner paint requests preserve|remaining toggle and divider borders" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/custom-owner-border-review.spec.mjs`
passes **2/2**, 35,055.1924 ms total. Historical producer reversal retains
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer is `8c2ab4c6e1372e37bda9ec70e255e65e87e53d4180db0e0d2ed03fa44e10d591`.
Canonical remains **95 unresolved**; integrated projection **5**. Remaining:
two compact-tab padding groups, two progress alignment groups, one icon fit group.
Current tab source explicitly applies 1px top padding at density <= -5; history
locates its introduction in `bc4d442`. Next inspect that change with the existing
label/control mapping rather than assume scalar label padding is control padding.
Then finish progress/icon owner boundaries and reconcile source fingerprints/export
before final gates. No captures, fixture changes or renderer edits.

**Remaining border questions answered; integration pending:** five groups / 252
observations reuse the established divider paint proof and toggle owner mapping.
Toggle top/right/bottom styles are overauthored solid versus native none, but
their widths remain zero at all three candidate stages (204 observations).
The active native left-divider token is independently preserved; these inactive
side styles are not evidence for the rounded-clipping failure. Divider top width
and style (48) extend the existing exact border/background substitution proof:
native 1px solid top border versus candidate 1px-high background with no border.
Do not conflate that authoring difference with the separately established core
empty-block height defect or claim equivalent rendered lines.
`node --test --test-name-pattern="remaining toggle and divider borders" tests/material-parity/custom-owner-border-review.spec.mjs`
passes **1/1**, 2,967.4717 ms total. Original capture is hash-pinned; all raw and
unrelated rows are conserved. Missing/forged membership, changed computed widths,
candidate stages, incomplete rules and competing border requests are rejected.
Canonical remains **95 unresolved**, integrated projection **10**; these five
classifications await integration. Next: integrate and review tab padding,
progress alignment and icon fit before source/export reconciliation and final
gates. No renderer/fixture changes or new captures.

**Expansion/tree integrated; export pending:** the four-group / 256-observation
proof from `b4ce16d` is now in the bound production tail with replay and unbound
guards. Expanded current-checkpoint coverage changes 65 groups / 3,182
observations; raw/unrelated conservation and reverse reducer order pass. Existing
historical checkpoint assertions remain unchanged; expansion/tree are additionally
exercised against their authenticated current checkpoint, not presumed historical
classifications.
`node --test --test-name-pattern="omitted owner paint requests preserve|expansion and tree formatting" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs`
passes **2/2**, 34,535.8547 ms total. Historical producer reversal retains
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer is `4ee227c37b75238aa074553a67c8eb11b8b0fc019e2dbd339c57513af5a6e66a`.
Canonical remains **95 unresolved**; integrated projection **10**. Compact queries
confirm the remaining groups: tab paddingTop (2 / 34 observations), toggle side
border styles (3 / 204), divider top border width/style (2 / 48), progress-control
textAlign (2 / 40), and icon objectFit (1 / 20). The index also retains already
integrated panel visibility until export; it is not a new investigation.
Next: review those remaining input/paint-owner distinctions, then reconcile
source fingerprints/export and execute final gates. No rendering inputs changed.

**Expansion/tree formatting reviewed; integration pending:** four groups / 256
observations distinguish three authoring substitutions from one measurement-stage
gap. Expansion omits the native title's flex alignment and 16px trailing margin
(68 observations each); tree substitutes column flex for native block flow (52).
Native tree computed row does not request row layout on a block owner. Expansion
textAlign:start versus locally omitted (68) cannot establish rendered mismatch:
candidate parent requests left, and candidate computed inheritance is unobserved.
No computed default, used placement or core failure is inferred.
`node --test --test-name-pattern="expansion and tree formatting" tests/material-parity/display-request-review.spec.mjs`
passes **1/1**, 3,089.9365 ms total. Existing display/mapping proof is reused;
all raw/unrelated rows are conserved, and changed rules, local stages, serialized
requests, missing cases and forged membership are rejected. Original capture is
hash-pinned. Current source retains title rules at
`examples/material-showcase/src/app/astylar.component.ts:663` and tree column at
`:721`; the column already exists in initial showcase commit `2f44011`, so it is
not evidence of a later compensation. Historical label edits are not evidence
that omitted flex/margin requests fixed an underlying core issue.
Canonical remains **95 unresolved**, integrated projection **14**; these four
classifications await integration. Next: integrate, then tab padding, toggle
border styles, divider substitution, progress alignment and icon fit.
Source/export reconciliation and final gates remain pending. No renderer/fixture
changes or new captures.

**Tooltip shrink integrated; export pending:** the two-group / 80-observation
proof from `be5cca9` now runs in the bound production tail with replay validation
and unbound-attribution rejection. Against the current checkpoint the tail
changes 61 groups / 2,926 observations (116 / 5,882 and 96 / 4,755 against earlier
checkpoints). Raw/unrelated conservation and reversed reducer order pass.
`node --test --test-name-pattern="omitted owner paint requests preserve|tooltip shrink preserves" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs`
passes **2/2**, 39,444.8835 ms total. The first run exposed a test selecting the
first tooltip row as the word-break limitation; it now explicitly selects
`wordBreak` and separately checks `flexShrink` authoring classifications.
Historical producer reversal retains
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer is `096d44b4ecf3f878ab713bec79ccfaab6adf6743317b1ec10dae2a07954a8219`.
Canonical remains **95 unresolved**; integrated batches project **14**.
Compact queries confirm the next structural batch: expansion title alignItems,
marginRight and textAlign (68 observations each), and tree flexDirection (52).
Distinguish missing requests from differences caused by distinct formatting
owners; do not infer computed candidate text alignment from an omitted local
field. Source/export reconciliation and final gates remain pending. No new
captures, renderer changes or fixture edits.

**Tooltip shrink question answered; integration pending:** two groups / 80
observations (62 trigger, 18 popup) bind explicit candidate `flexShrink:0` to a
shared 72px column with 8px gap. Native trigger is in block flow, so its computed
shrink:1 is not an active flex-item request; native popup belongs to a separate
inline-flex tooltip owner. This is a demonstrated composition/input substitution,
not proof of a used shrink effect, core flex defect, or tooltip blur/displacement.
The original capture hash and all three local candidate stages are checked;
missing/forged membership, changed parents/requests/stages, competing shrink rules
and raw/unrelated conservation have focused coverage.
`node --test --test-name-pattern="tooltip shrink preserves" tests/material-parity/display-request-review.spec.mjs`
passes **1/1**, 2,625.4808 ms total. History `f3c8254` introduced the shared column
and trigger shrink override while changing popup absolute positioning to relative
and adding `translate(93px, 37px)`; popup shrink:0 predates that change. Current
source retains the column/shrink contract at
`examples/material-showcase/src/app/astylar.component.ts:809` and `:1076`.
This establishes provenance, not the original rendering failure's cause.
Canonical remains **95 unresolved**, integrated projection **16**; these two
new classifications await integration. Next: integrate, then expansion/tree and
remaining styling questions. Export reconciliation and final gates remain pending.
No renderer/fixture changes or new captures.

**Panel visibility integrated; export pending:** the two-group / 138-observation
state-owner proof from `b89731a` now runs in the bound production tail with
independent replay and rejection of unbound attribution. The tail changes
59 groups / 2,846 observations against the current checkpoint (114 / 5,802 and
94 / 4,675 against the earlier checkpoints), conserving raw and unrelated rows;
reverse reducer order agrees. These are classifications, not renderer fixes.
`node --test --test-name-pattern="omitted owner paint requests preserve|panel visibility scalar review" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/panel-state-ownership.spec.mjs`
passes **2/2**, 33,223.6338 ms total. The former process handle was missing;
this result is a fresh verification, not an inferred prior pass.
Historical producer reversal retains
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer is `c88c4bdb0fdd36d58eb020e4a59c74712e342a2f4e2ed51952c88ddbb9919077`.
Canonical remains **95 unresolved**; integrated batches project **16**.
Prioritize tooltip shrink (two groups) using existing composition proofs, then
expansion/tree structure and alignment, followed by tab padding, button-toggle
border styles, divider paint substitution, progress text alignment and icon fit.
Do not infer shared root causes from similar symptoms or reopen settled overlay
coordinate/depth findings without new evidence. Source-fingerprint/export
reconciliation and final browser gates remain pending; no captures or rendering
inputs changed in this increment.

**Panel visibility scalar join verified; integration pending:** two groups / 138
observations (70 tabs, 68 stepper) now join to the existing complete state-owner
proof, rather than treating active visible/omitted values as sufficient evidence.
Exact generated-owner mapping checks all 89 reference fields, three candidate
stages and the active text node against both native linked panel owners. Native
stepper retains hidden/inert inactive text; native tabs use distinct mounting;
candidate substitutes one changing owner/custom tab painter. Selected content
matches, but authored state structure does not. Existing core hidden-state
support, live animation and accessibility/focus questions remain unwaived;
adding a visible declaration is not the inferred fix. Original state report and
its receipt replay remain unchanged and pass.
`node --test tests/material-parity/panel-state-ownership.spec.mjs`
passes **3/3**, 3,898.2021 ms total. Missing cases, forged membership, broken
inactive/linkage state, altered unrelated scalar fields and fabricated candidate
visibility are rejected; raw/unrelated rows remain unchanged.
Canonical remains **95 unresolved**, integrated batches project **18**; this
scalar join is not yet in the production tail. Next: integrate it, then tooltip
shrink and remaining styling semantics before source/export reconciliation and
final gates. No renderer/fixture changes or new captures.

**Overlay flow integrated; export pending:** the 11-group proof from `6e10415`
now runs in the bound production tail with independent replay and unbound
attribution rejection. Actual tail changes 57 groups / 2,708 observations against
the current checkpoint, or 112 / 5,664 and 92 / 4,537 against earlier checkpoints.
Raw/unrelated records remain unchanged; reverse reducer order agrees and unbound
execution runs no reducers.
`node --test --test-name-pattern="omitted owner paint requests preserve|overlay flow preserves" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/overlay-position-request-review.spec.mjs`
passes **2/2**, 33,784.5148 ms total. Historical producer reversal retains
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer is `47bd9254fb83a0983634c7d1ebcefdd304014e314e13e93ee13194b40a754a83`.
Canonical remains **95 unresolved**, integrated batches project **18**. Next:
tab/stepper visibility and state ownership using existing panel-state/ancestry
proofs, tooltip shrink, then remaining styling semantics. Source/export
reconciliation and full final gates remain pending. No renderer/fixture changes
or new captures; this is audit coverage, not an output-parity claim.

**Overlay flow proof verified; integration pending:** 11 groups / 329 observations
across 25 bottom-sheet and 34 snackbar wrapper cases distinguish row/pane native
composition from column/direct-surface candidate composition. Seven groups are
authored axis/alignment/padding substitutions; four are computed-versus-local
text/vertical alignment observations, not inferred candidate computed values.
The single child on both sides permits similar bottom/center placement but does
not prove equivalent constrained sizing or shrink axes. Snackbar wrapper adds
8px bottom padding. Existing position/mapping proofs, including the scalar
z-index rule gap, are reused; separate depth, containing-block, clipping and
missing-overlay causes are not reassigned to these style differences.
History `f3c8254` changed bottom-sheet alignment to column/end/center while
removing a 146px translation. `899c741` changed snackbar paddingBottom:8px to
padding:0 0 8px while resizing its surface; it did not originate the 8px offset.
Those changes establish provenance, not a demonstrated equal-input core cause.
`node --test tests/material-parity/overlay-position-request-review.spec.mjs`
passes **2/2**, 6,144.8061 ms total. Exact membership, original scalar/stage joins,
raw/unrelated conservation, forged/missing evidence and changed rules, children
or stages are checked. No renderer/fixture changes or new captures.
Canonical remains **95 unresolved**, integrated batches project **29**; this
proof is not yet in the production tail. Next: integrate and verify this batch,
then remaining visibility, shrink, and styling semantics before reconciliation
and full final gates.

**Dialog panel gap integrated; export pending:** the serialized-transition proof
from `86bf71f` now runs in the bound production tail with replay validation and
unbound-attribution rejection. Existing historical gap review remains unchanged
and limited to its original evidence; its validator selects only its own
attributions. The new proof has a separate explicitly checked attribution.
The actual tail changes 46 groups / 2,379 observations against the current
checkpoint, or 101 / 5,335 and 81 / 4,208 against the earlier checkpoints.
Raw/unrelated rows remain unchanged; reversed reducer order agrees and unbound
execution does not run reducers.
`node --test --test-name-pattern="omitted owner paint requests preserve|dialog action spacing binds" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs`
passes **2/2**, 32,255.2296 ms total. Exact producer reversal retains historical
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer is `d9d3e231deaed9bd0c9a991a2a87f838ad5d3c318e1009f430bf55c20b77d906`.
Canonical remains **95 unresolved**; integrated batches project **29**.
Compact-query triage confirms the remaining population, excluding already
integrated stepper flex direction: bottom-sheet/snackbar overlay flow and local
text/alignment observations (11 groups), tab/stepper visibility (2), tooltip
shrink (2), expansion alignment/margin/text (3), tab top padding (2), toggle
zero-width border styles (3), divider border substitution (2), progress text
alignment (2), icon object-fit (1), tree direction (1). Prioritize overlay
ownership, then state and remaining styling semantics. Source/export
reconciliation and full final gates remain pending. No renderer/fixture changes
or captures; these counts describe classification coverage, not repaired output.

**Dialog panel gap ambiguity resolved; integration pending:** two groups / 64
observations across all 32 panel cases retain browser-computed `normal` versus
omitted candidate local gaps. The prior gap survey stopped at empty CSSOM
transition longhands. Exact preserved CSS text names `transform` in the base
transition, followed by an active `transition:none` rule. Neither directly
requests gap motion. Reuses the original gap inspector and generated-owner
mapping without editing their earlier limited conclusions or inventing a computed
candidate zero/normal. Indirect transform effects and whole-panel rendering
equivalence remain unproven. Shared modal review adds a separate, narrowly scoped
observation-stage attribution; it is not yet wired into production.
The existing dialog population test now checks these 64 observations alongside
the 416 action-spacing observations, conserving raw/unrelated records. Missing
cases, forged membership, added gaps, a changed transition target, inactive noop
rule and modified candidate stages are rejected.
`node --test --test-name-pattern="dialog action spacing binds" tests/material-parity/display-request-review.spec.mjs`
passes **1/1**, 3,930.6722 ms total. No captures or renderer/fixture changes.
Canonical remains **95 unresolved**, integrated batches project **31** until this
proof is integrated. Next: bound-tail integration, remaining overlay/state/border
questions, then coherent source/export reconciliation and final gates.

**Dialog action spacing integrated; export pending:** the proof from `1a411ee`
now participates in the bound production tail, replay validation and explicit
unbound-attribution rejection. The actual tail changes 44 groups / 2,315
observations against the current checkpoint; comparisons with earlier checkpoints
change 99 / 5,271 and 79 / 4,144. Raw/unrelated rows remain unchanged, reversed
reducer order agrees, and unbound reducers do not run.
`node --test --test-name-pattern="omitted owner paint requests preserve|dialog action spacing binds" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs`
passes **2/2**, 32,503.9655 ms total. Exact source restoration retains historical
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer digest is
`82396e56c4ac52a80be8170e9706a103a91a2c43359ef15a44586ce51e66598a`.
Canonical remains **95 unresolved**; integrated batches now project **31**.
Next: dialog panel gap semantics and remaining overlay flow, state and border
questions, then source/export reconciliation and required full gates. These
results classify retained original input evidence, not corrected runtime output.
No renderer/fixture edits or new captures.

**Dialog action spacing proof verified; integration pending:** 13 groups / 416
observations across 32 open-dialog cases bind to omitted Material button inputs.
Native buttons request centered flex layout and zero vertical/token horizontal
padding (Cancel 12px, Save 24px); candidate action rules omit them and all three
captured local stages retain block display, stretch/start alignment and 10px/20px
padding. Native Save sibling margin is 8px; candidate margin is zero, with its
parent gap already classified separately. Reuses the existing display proof for
owner/scalar/stage joins and modal review machinery for exact coverage. Preserves
serialized variable-containing padding when expanded CSSOM fields are empty.
Initial showcase commit `2f44011` already omitted these action requests; this is
not evidence that a later alignment fix caused their omission. It does not prove
the oversized raster's cause, current used control layout, or historical intent.
`node --test --test-name-pattern="dialog action spacing binds" tests/material-parity/display-request-review.spec.mjs`
passes **1/1**, 3,765.4366 ms total. Missing cases, forged membership, competing
rules, altered native declarations and changed candidate stages are rejected;
raw/unrelated rows are conserved. No renderer/fixture changes or new captures.
Canonical remains **95 unresolved** and integrated batches project **44**; this
additional proof is not yet in production and does not change those counts.
Next: production integration and combined verification, then two dialog panel
gap groups and remaining overlay/state/border questions. Source/export
reconciliation and final acceptance gates remain pending.

**Toolbar spacing integrated; export pending:** the proof from `745c17d` now runs
in the bound production tail with replay validation and an explicit unbound
attribution rejection. The actual tail changes 31 groups / 1,899 observations
against the current checkpoint, or 86 / 4,855 and 66 / 3,728 against the two
earlier checkpoints. Raw and unrelated records remain unchanged; reverse reducer
order gives identical results and unbound execution invokes no reducers.
`node --test --test-name-pattern="omitted owner paint requests preserve|toolbar spacing preserves" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs`
passes **2/2**, 29,719.9314 ms total. Exact producer restoration returns historical
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer digest is
`018243354bf42a55453c9c2caf784553d5667e8031c20fdd805addf20963607d`.
Canonical remains **95 unresolved**, with verified integrated batches projecting
**44** after export. This is classification coverage, not corrected rendering.
Next: dialog action defaults/spacing and overlay flow ownership, then remaining
state/border differences; batch source/export reconciliation and final enforced
gates remain required. No renderer/fixture changes or new captures.

**Toolbar spacing proof verified; production integration pending:** seven groups /
364 observations across all 52 retained toolbar cases distinguish native host
padding (16px sides) and a growing spacer from candidate fixed-width,
nonshrinking children with child margins and no spacer. Reuses the existing
toolbar position proof and shared modal review machinery. Native declarations,
all 89 scalar reference fields, and all three candidate style stages are joined
to original trees. Missing cases, forged membership, extra relevant rules,
changed padding and spacer ownership are rejected; raw/unrelated rows conserved.
Historical `3bf5b4d` replaced absolute action placement with auto margin and
nonshrinking children; it does not prove a core flex defect or the motivation
for every earlier fixed dimension. Rendering equivalence remains unknown, not
asserted false merely because authored inputs differ.
`node --test --test-name-pattern="toolbar spacing preserves" tests/material-parity/display-request-review.spec.mjs`
passes **1/1**, 3,216.7082 ms total.
`node --test --test-name-pattern="all 52 toolbar|toolbar inspection rejects" tests/material-parity/toolbar-position-inspection.spec.mjs`
passes **2/2**, 491.1029 ms total. No captures or renderer/fixture edits.
Canonical remains **95 unresolved**; previously integrated batches still project
**51**. This toolbar proof is not yet in the production reducer tail and does not
change those counts. Next: wire its reducer/validator into the bound production
tail, preserve historical producer replay and verify the combined batch; then
dialog/overlay flow and remaining state/border differences. Source/export
reconciliation and full final gates remain outstanding. Current changes classify
the pinned baseline; they do not certify newer runtime output.

**Radio/checkbox spacing integrated; export pending:** seven groups / 341
observations distinguish nested native control/associated-label padding from
candidate host padding, density-dependent top margin and label left margin.
All 68 cases per family are retained. The single `static:checkbox@custom/mobile`
label-bottom-padding observation remains an explicit profile/media adjustment,
not a general core baseline diagnosis. History `662c179` replaces this label's
translation with `padding:0 0 1px`; `2f44011` introduced the radio host margin.
Those origins do not prove why each historical adjustment was chosen.
Existing choice-label and radio-position proofs are reused; native label padding
is 4px and native control padding varies by density rather than moving to the host.
Scalar/tree joins, all candidate stages, complete membership and negative controls
pass. The production tail changes 24 / 1,535 versus the current checkpoint and
79 / 4,491 or 59 / 3,364 versus the two earlier checkpoints, with raw/unrelated
records conserved. Unbound execution remains disabled.
`node --test --test-name-pattern="omitted owner paint requests preserve|choice spacing preserves" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs`
passes **2/2**, 28,177.3133 ms. Producer restoration still returns the historical
digest; current producer is `142a24f42f3a944341a5be9427027773fd81c56fde8fa7b62952237b60f10b44`.
Canonical stays **95 unresolved**; integrated batches project **51** after export.
No renderer/fixture edits or captures. Next: dialog/toolbar and remaining overlay
flow/state/border differences, then coherent source/export reconciliation.

**Chip spacing/wrapping integrated; export pending:** 11 groups / 836 observations
across all 76 cases preserve the native negative-margin wrapping wrapper,
4px/8px chip margins, and padded action/graphic descendants versus the candidate's
direct gap, zero chip margins and padded fixed-width hosts. The existing chip
composition proof is reused. This is an authored owner/structure substitution;
native host nowrap versus candidate wrap is not proof of a core wrapping bug.
Selection, nested graphic retention, scalar/tree joins and all three candidate
stages are checked. Intrinsic-size, outline and state findings remain independent.
Missing cases, forged membership, extra declarations, altered local padding and
changed wrapper margins are rejected; raw/unrelated classifications are conserved.
`node --test --test-name-pattern="omitted owner paint requests preserve|chip spacing binds|stepper spacing preserves|list spacing preserves" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs`
passes **4/4**, 27,656.9139 ms. The actual guarded production tail changes exactly
17 groups / 1,194 observations versus the current checkpoint; earlier checkpoints
change 72 / 4,150 and 52 / 3,023. Unbound reducers do not run and validators replay
the original population. Producer reversal retains the historical digest below;
current producer is `bd716bf400f8a28a3bc2b173bab42478559096a728998e41fbfec4760628fc6d`.
Canonical stays **95 unresolved**, with integrated batches projecting **58**.
No renderer/fixture changes or new captures. Next: radio/checkbox and dialog/toolbar
spacing, remaining flow/state and border semantics; then batch reconciliation.

**Stepper spacing integrated; export pending:** five groups / 340 observations
across all 68 cases now bind to the existing header-position substitution proof.
Native block host has an unpadded column wrapper; native headers own 24px side
padding. Candidate moves padding/column flow to the host while retaining padded
absolute headers at -24px edges. Native icon margin-right:8px becomes margin-left
on flattened candidate labels. This establishes authored owner substitutions,
not a core padding/flex defect or proof that nominally equal spacing renders alike.
The separate stepper visibility/state issue remains open.
Existing display review, modal membership validation, and production-tail tests
are reused. The guarded tail changes exactly six groups / 358 observations
against the current checkpoint (this stepper batch plus tooltip); its earlier
checkpoint counts are 61 / 3,314 and 41 / 2,187. Raw/unrelated records remain
unchanged; missing members, forged review membership, changed declarations/local
stages and unbound execution are rejected. Exact producer restoration retains
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer digest is
`67255f99d03a665661c48022a27aacd2a97c8c8130413e8157c619acfcd898e3`.
Verification: `node --test --test-name-pattern="omitted owner paint requests preserve|stepper spacing preserves|all stepper position cases|stepper proof rejects" tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/display-request-review.spec.mjs tests/material-parity/stepper-position-substitution.spec.mjs`
passes **4/4**, 23,130.8698 ms; scoped diff check passes.
Canonical remains **95 unresolved**, with integrated batches projecting **69**
after the next source-reconciled export. No renderer/fixture edits or new captures.
Next: other shared spacing owners (chips, radio, checkbox, dialog and toolbar),
then remaining flow/state and border semantics. Full acceptance remains open.

**Remaining full-radius input coverage integrated; export pending:** the existing
full-radius reducer/validator now includes all 20 remaining badge/sheet radius
groups, 360 scalar observations (52 badge owners and 38 noncontrast sheet actions).
It reuses the authenticated badge alias/border contract and sheet token/box proof.
Native 9999px requests are replaced with 8px badge or 24px/36px sheet requests.
The sheet's measured equal boxes establish equal CSS used radius; badge equality
remains conditional on its declared 16x16 box, not measured interaction geometry.
Classify missing renderer-input coverage, not presumed compensation intent,
different intended shapes, or original framebuffer causation. Contrast sheet
actions retain their separately classified 18-vs-24px shape discrepancy.
The shared modal validator initially rejected the sheet proof's deliberately
empty shape-attribution list. The new adapter explicitly attributes request
coverage only; it preserves unknown input/rendering equivalence and does not
change the original geometry proof or promote it to a paint verdict.

`node --test --test-name-pattern="nine stacking groups|current rounded rectangle kernel|remaining badge and sheet full-radius|full-radius action requests classify" tests/material-parity/stacking-input-review.spec.mjs tests/material-parity/modal-position-inspection.spec.mjs tests/material-parity/authored-anchor-review.spec.mjs`
passes **4/4**, 16,007.491 ms. The current source kernel still emits four vertices
for radius9999 versus 68 for radius24 at both scale1 and scale0.01, despite equal
normalized arcs. Existing historical stacking/action checks remain unchanged.
The new test preserves raw/unrelated records and rejects missing owners, forged
membership, changed native corners and changed candidate interaction radii.
It also executes the production bound/unbound radius fragment directly.
The final focused rerun of that test passes **1/1**, 6,705.1232 ms.
No renderer or fixture edits, new captures, or full export in this increment.
Canonical remains **95 unresolved**; tooltip plus this radius batch project
**74** after source-fingerprint reconciliation and the next coherent export.
Next prioritize the remaining shared spacing and layout-owner substitutions.

**Tooltip word-break support classification integrated; export pending:** the
existing wrapping review module now provides a bounded reducer/validator for the
one unresolved tooltip-popup wordBreak group (18 observations). Classification is
`documented-limitation`, not an inferred intentional policy or fixture-only defect.
Five exact current/installed contract, admission, loaded-CSS and parser fingerprints
bind the existing public-package proof; changed sources reopen the finding.
The existing modal review mechanism checks complete membership and all owner stages.
Tests preserve every raw/unrelated tooltip row and reject missing population,
forged membership, competing native/candidate requests and each changed dependency.
The existing public support test and expanded population test pass **2/2** in
20,542.4584 ms on the integration rerun with the same focused command below.
No renderer or fixture changes.
The production bound-evidence path now runs the reducer and replay validator,
with an explicit unbound-attribution guard. The existing combined-tail test
executes the actual production fragment: exactly one group / 18 observations
changes against the latest checkpoint, preserving all raw and unrelated rows.
Earlier checkpoint replays change 56 / 2,974 and 36 / 1,847 respectively;
reverse reducer order agrees, and unbound execution invokes no reducer.
`node --test --test-name-pattern="omitted owner paint requests preserve" tests/material-parity/control-state-paint-review.spec.mjs`
passes **1/1**, 25,923.1662 ms. Exact predecessor restoration still yields
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
the current producer digest is
`3163120799acd75328a2bf95e0f0e6b65aba2e2de9c1c1f51723d3bb74712334`.
No new capture, full export, or browser matrix was run for this increment.
Next address the remaining shared spacing/layout-owner and rounded-paint groups;
do not reopen established tooltip placement/paint causes to explain this support gap.
Canonical/index stays
**95 unresolved** until a later coherent batch export; this one group projects 94.

**Checkpoint published; tooltip support proof expanded:** `dcc6e52` is pushed to
`origin/codex/material-audit-alignment-integration` (remote hash verified). The
existing compact import and `npm run audit:findings:verify` preserve 8,483 scalar
groups, 135 findings, 39,904 controls, 389,202 occurrences and 95 unresolved groups;
compact shards total 72,496,031 bytes. GitHub accepted the push with its existing
large-file warning for the 59.72 MiB compressed audit. No capture evidence deleted.

Reused the existing public word-property support test instead of duplicating it.
Added full-population coverage alongside it in `wrapping-input-populations.spec.mjs`:
all 18 paired tooltip owners retain explicit word-break:normal and omitted candidate
requests; all eight unpaired open records remain separately accounted for. Every
paired case rejects a forged native break-all request and a supplied candidate
local value. `node --test --test-name-pattern="public word-property support|tooltip word-break request" tests/material-parity/wrapping-input-populations.spec.mjs`
passes **2/2**, 22,634.8216 ms. This prepares one support-boundary classification;
it changes no canonical row, renderer or fixture. Canonical remains 95 unresolved.
The new test-source fingerprint is pending the next coherent integration milestone,
not a reason to rebuild the complete audit now. Next bind this narrow supported-input
limitation using the existing review path, preserving separate tooltip placement,
font and unpaired-state findings; then continue shared spacing/layout coverage.

**Appearance/paint batch exported and independently cold-checked:** source through
`d8c7f8f` now has a verified partial canonical checkpoint: **95 unresolved groups**,
8,483 scalar groups / 389,202 observations, 135 source findings, and unchanged
436/436 static plus 1,875/1,875 interaction coverage. This is not input equivalence,
renderer repair, final browser acceptance, or completion of the audit.

`node scripts/export-material-input-audit-current-ancestry.mjs` completed in
3,204,966.6234 ms. With `ASTYLAR_AUDIT_PROGRESS=1` and `ASTYLAR_AUDIT_COLD=1`, the
same launcher with `--check` completed in 3,349,370.1796 ms. Both exited 1 solely
for the 95 unattributed groups; the cold check reported no canonical mismatch or
binding errors. Cold evidence statistics: 2 collectors, 10 memory hits, 0 disk
hits, 0 invalidations; 1,205 files / 89,154,859 bytes read and reverified. Neither
run was restarted. The full final enforced browser matrix remains required.

Conservation against accepted `fc6035d` / compact snapshot `8fbd2e22...`:
all 8,483 raw rows are identical; exactly 35 newly reviewed groups / 1,829
observations changed classification. One existing button line-height row changes
only embedded control-proof hashes: the existing `refreshScalarControlReceipts`
validator checked complete underlying proofs differ only by the producer receipt.
All 534 source fingerprints match disk (532 raw, 2 LF-normalized); precisely six
inventory entries changed with this batch. Of 79 report sections, 72 are identical.
The seven changed sections are source fingerprints, summary, discrepancies,
controlLineBoxes, ownerCaretInputs, reviewedSourceBatchInputs and controlTypography.
The latter four preserve all non-receipt evidence: three match after the exact
producer-hash transition; reviewedSourceBatchInputs changes only that receipt and
its derived report hash, independently reproduced from the authenticated historical
report. Summary changes only classification totals and 130 -> 95 unresolved.

New compressed SHA-256:
`9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab`;
decoded SHA-256:
`74bf6ec312819cd1ed49df020baa5b0689b9077da54685ead5a65c77e76c708a`.
Next: import this verified partial snapshot once into the existing compact store;
then prioritize shared overlay/control spacing and flow, radius/border semantics,
and remaining state-owner/support gaps. Do not rerun this export for ledger edits.

Read-only preparation for the tooltip wordBreak gap: an in-memory package-root
TypeScript probe resolves all 87 StyleRule properties and rejects
`wordBreak: 'normal'` with TS2353, while `wordWrap: 'normal'` passes. Installed and
current interfaces are identical. Existing `proveInheritedLocalOmission` replays
all 18 paired tooltip observations: explicit native `.mat-mdc-tooltip-surface`
word-break:normal versus omitted candidate ancestry/local stages. Eight additional
open-state records lack native counterparts and remain separate; an initial
26-versus-18 population assertion exposed this boundary rather than masking it.
No files/captures were generated or canonical classifications changed for this
preparation. Next make this a focused, negative-controlled retained proof using
existing infrastructure. This is a public support gap, not a demonstrated cause
of tooltip blur, offset, wrapping output, or the missing snackbar.

### Prior source-batch record (superseded counts retained as history)

**Remaining four modal appearance groups integrated through the existing mapper:**
all 121 original observations join native/candidate owners and retained styles;
their omitted appearance/reset requests receive only initial non-widget request
equivalence. All ten dialog transition declarations remain in evidence, including
empty CSSOM expansions and the explicit noop override. Altering that override,
owner type, appearance/reset authoring, provenance or membership rejects the proof.
Independent layout/structure, motion, text and raster findings remain unchanged.
The existing retained public proof's seven dependencies are still authenticated.

Native mapped-tag browser checks, all 232 mapped non-widget observations, and the
actual combined production-fragment check pass 3/3 (34.02s). Against current 8fbd,
35 groups / 1,829 observations now have pending classifications; against 0a30,
55 / 2,956. Raw/unrelated records are conserved. No appearance groups remain
unresolved in the pending pipeline; canonical/index remains 130 unresolved, with
**95** projected after source-receipt reconciliation/export. No new capture files,
renderer or production fixture edits. Next: reconcile the accumulated source
receipts at the coherent appearance/paint milestone, then remaining spacing/layout
coverage; do not count the pending classifications as canonical acceptance.

**Native modal non-widget appearance gap tested:** a focused real-Chrome test now
covers mat-dialog-actions, mat-dialog-content, mat-bottom-sheet-container, div, p
and section with content, explicit equal CSS boxes, DPR 1/2 and both ordinary and
variable-backed/noop transition contexts. For each tag/context, omitted/auto/none
appearance retains identical native pixels and dimensions; omitted computes none.
Changing background changes pixels in every case; native checkbox appearance:none
also changes pixels as a positive control. Test `modal non-widget native appearance`
passes 1/1 (5.97s), without disk captures or new report infrastructure.

This closes the native tag/motion-context question, not Astylar dynamic motion,
cross-renderer text/paint equivalence or complete Material input equivalence. The
retained public Astylar proof separately covers div/p/section appearance requests
with unchanged dependency receipts. Next: bind these complementary narrow proofs
to all 121 original modal observations, preserving motion and structural differences,
then classify only the omitted non-widget appearance request. Canonical 130 /
projected 99 remain unchanged until that classification is integrated and the
source-receipt/export milestone is reconciled.

**Bottom-sheet action appearance producer-integrated:** both prepared link-to-button
classifications now run and replay only with bound original evidence. The existing
combined production-fragment test preserves all raw/unrelated records and checks
forward/reverse application plus unbound rejection. Pending changes cover 31 groups
/ 1,708 observations against current 8fbd (51 / 2,835 against 0a30). Modal focused
and combined checks pass 2/2 (31.44s). Exact historical producer restoration passes;
new producer SHA256 is
`4d0bc199fdd7ad70a1418f17fa8754c6cb448f7cd286568c82295561174f6f00`.
Canonical/index still has 130 unresolved groups; **99** is the projected count
after source-receipt reconciliation and milestone export, not canonical acceptance.
Next: four non-widget modal appearance groups (121 observations), then shared
spacing/layout gaps. No renderer/fixture changes, new captures or full export.

**Bottom-sheet action appearance classifications prepared:** two groups / 50
observations now have a scoped application/plugin-authoring-defect reducer, using
the existing complete modal mapping and link/list-item composition proof. It
verifies omitted appearance/reset requests on native rules and all candidate
stages; candidate button appearance is never synthesized from native link none.
The existing 171-observation test now checks exact classification coverage,
raw/unrelated-row conservation, replay, forged membership, changed element types,
added appearance requests and changed native appearance. It passes 1/1 (3.53s).
The producer integration is still pending, so canonical 130 / projected 101
remain unchanged in this checkpoint.

Retained public non-widget proof dependencies: all seven fingerprints match.
Its types are a/div/h2/p/section/span, with checkbox/select sensitivity controls.
It covers empty explicit boxes at DPR 1, not Material custom-container mappings,
content/state behavior or the dialog transition context. Therefore the remaining
four modal groups (121 observations) are not silently cleared by reusing that
proof. Next: integrate the two prepared action groups; close the precise
non-widget mapping/motion evidence gap without claiming whole-container parity.
Then continue spacing/layout and source-receipt/export reconciliation.

**Remaining modal appearance question narrowed across all 171 observations:**
the authenticated capture and existing alias/position proofs show 50 bottom-sheet
action observations replace native `a[href="#"]` elements (with child content
and state layers) with childless value buttons. Existing action-layout evidence
independently confirms unequal authoring; omitted appearance must not be called
an equivalent default across this element-type substitution. The other 121
observations map non-widget owners: dialog actions/content/surface and sheet
container to div/p/section. None has an own native appearance/reset declaration.
The 32 dialog surfaces retain ten transition longhands, including empty CSSOM
expansions and the noop override `transition-property:none`; empty expansions
are not evidence of omitted authoring. Other mapped owners have no own motion
declarations. This distinguishes control substitution from the non-widget initial
request question; it does not infer candidate computed appearance or motion parity.

Focused test `remaining modal appearance distinguishes` passes 1/1 (2.92s total),
using original evidence only and no new captures. No classifications changed:
canonical 130 / projected 101 remain. Next decisive work: bind the two link-to-button
appearance rows to the established authoring defect; check whether retained public
non-widget appearance proof covers the four remaining owner types and their motion
context before assigning those rows. Source-receipt/export reconciliation remains
pending, followed by spacing/layout coverage and final acceptance gates.

**Chip/tab appearance review producer-integrated:** the existing production
pipeline now applies and validates the three owner-boundary classifications only
with bound original evidence. The combined test executes the actual pipeline
fragment in forward and reverse order: 49 groups / 2,785 observations change
against 0a30, and 29 / 1,658 against current 8fbd; all raw observations and
unrelated rows remain unchanged. Focused chip/tab and combined tests pass 2/2
(22.36s). Exact historical producer restoration still authenticates
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
current producer SHA256 is
`16563e25a9217ba12a2a6a690df9457821460996bdda6058876c3e0f8f4d81b0`.
Canonical/index remains 130 unresolved; projected count is **101** after the
pending source-receipt reconciliation/export milestone. Next unresolved scope:
six modal appearance groups, followed by shared spacing/layout inputs. No
renderer/fixture edits, recapture or full export in this integration increment.

**Chip/tab appearance owner review prepared, not producer-integrated:** the focused
original-evidence check passes for three groups / 222 observations (two chip
owners, 76 each; tab panel, 70). The unfinished proof initially assumed the
candidate chip was a button; the captured authoring disproved that assumption.
It is a `div` with `role=option`, whereas the native `mat-chip-option` host contains
a separate role=option button. The host computes appearance none and its nested
button auto. The candidate semantic role must not be mistaken for a native
button or used to infer computed appearance. The existing chip composition proof
and tab private-text-renderer proof bind the differing observation owners.
Native motion declarations remain evidence, not waived obligations.

`node --test --test-name-pattern="chip and tab appearance binds" tests/material-parity/control-state-paint-review.spec.mjs`
passes 1/1 (4.31s total), covering all original observations, raw/unrelated-row
conservation and rejection of altered owner/request/provenance/membership.
No renderer or fixture changes, new captures, or canonical export. Canonical
unresolved count remains 130; the already integrated batch still projects 104.
Next: integrate this prepared review into the existing production pipeline and
combined conservation check, then investigate the six remaining modal appearance
groups and spacing/layout gaps. Source-fingerprint reconciliation remains pending
at the next coherent export milestone; this preparation is not canonical acceptance.

**Range initial appearance integrated; explicit-none support gap isolated:** the
root-package range reduction compares omitted/auto/none at DPR 1 and 2, plus an
opacity-zero sensitivity control. One equal declaration map feeds both renderers.
Omitted and auto produce identical pixels within each renderer; opacity changes
both, rejecting a blank/invisible-test false pass. Native none changes pixels,
while candidate none retains the auto pixels despite public normal/effective
inspection retaining `none`. The actual installed `createRange` method matches
transpiled current source and does not branch on appearance. This confirms a
separate explicit-none paint-support gap, not a diagnosis of Material drag/hit
testing, an assertion of full native-widget parity, or a violated catalog promise
(the existing appearance assessment scopes indicator handling to select/checkbox).

Diagnostic variants use equal explicit z-index 1 and transparent background to
isolate range paint from the already identified paint-composition problem. They
are not edits to canonical fixtures or suggested compensations. The original
156 Material input owners are independently verified as type=range/inputType=range,
with omitted appearance/reset/motion requests and opacity 0 on both sides. Their
computed-native auto versus omitted-local difference is classified only as an
equivalent initial request. Neither candidate computed appearance nor complete
slider equivalence is fabricated; explicit-none support remains a separate core
implementation obligation. After a general core implementation, preserve this
equal-input reduction and require native/candidate none behavior to agree.

Focused public test `public range appearance separates` passes 1/1 (21.49s
total); it verifies the defect observation rather than declaring support fixed.
Original population and combined production-tail tests pass 2/2 (21.87s total),
including altered type/request/stage/opacity, missing provenance and forged
membership controls. All raw/unrelated rows remain conserved: 46 groups / 2,563
observations against 0a30 and 26 / 1,436 against current 8fbd. Bound-only guards
and exact historical producer restoration pass. New producer SHA256 is
`d9557d6000a33412a966c1d01cc0241c59f9a7803e5e6917446776253444ecc4`.
Canonical/index still 130 unresolved; expected **104** after milestone export.
Nine appearance groups involving changed owner types/plugins remain. No renderer
or production fixture changes; no new disk captures. Continue ownership/spacing
investigations before the pending source-receipt reconciliation/export milestone.

**Four mapped non-widget appearance groups integrated:** all 111 observations
(sheet overlay 25, snackbar overlay/surface 34 each, tooltip popup 18) independently
map to native/candidate `div` owners. Complete own rules, inline inputs and all
candidate stages omit appearance/reset/motion declarations. This is the narrow
initial non-widget request equivalence already established by the retained public
proof, whose report hash and all seven declared source/package fingerprints still
match. Dependencies are checked once per reducer call, not once per observation.
The 59 overlay mappings retain their exact missing scalar z-index rule; it is
not discarded or reinterpreted as an appearance request. No candidate computed
style or overlay placement/clipping/raster equivalence is invented.

The focused original-population test passes and rejects changed owner types,
explicit appearance, motion, reset, incomplete rule evidence and forged mapping
gaps. The existing public-proof replay also passes, including checkbox/select
indicator sensitivity controls. Production integration includes a bound-evidence
guard and exact historical producer restoration. Combined-tail conservation now
checks 44 groups / 2,407 observations against 0a30 and 24 / 1,280 against 8fbd;
all raw/unrelated records remain unchanged. Command
`node --test --test-name-pattern="omitted owner paint|mapped nonwidget appearance" tests/material-parity/control-state-paint-review.spec.mjs`
passes 2/2 (21.19s). The selected legacy `appearance public proof preserves control sensitivity`
test passes 1/1 (1.24s total). Current producer SHA256 is
`48eabe1022ef16510eeed8aa29c689196888fb82c4e56d5033e04d535cd6d2f6`.
Canonical/index still 130 unresolved; expected **106** after milestone export.
Eleven appearance groups remain: range controls, changed owner types and custom
plugin owners require separate evidence; do not extend non-widget equivalence
to them. Continue those and spacing while batching source-receipt reconciliation.

**Shadow batch producer-integrated:** both reducers and validators now run only
with bound original evidence; an explicit guard rejects unbound shadow
attributions. The existing combined-tail test executes the actual producer
fragment against two authenticated baselines: exactly 40 groups / 2,296
observations change against 0a30, and 20 / 1,169 against current 8fbd. Raw
observations and unrelated rows are conserved. Reverse-order replay, all
individual validators and the unbound execution control pass. Focused
`omitted owner paint` test passes 1/1 (15.13s body). Exact historical producer
restoration still authenticates `a986934f...`; new producer SHA256 is
`7f88bd78cc0a82e69ec234b52986c4f098488e2b7e7e06668a6e342983ce28d1`.
No full export was run for this bounded classification batch. Canonical/index
still reports 130 unresolved; expected 110 after source-receipt reconciliation
and the next export. All previously unresolved box-shadow groups now have scoped
producer classifications, not full paint-parity acceptance. Continue remaining
appearance and spacing ownership; preserve the pending receipt reconciliation
for changed review code/tests and additive core tests at the milestone.

**Eight shadow groups prepared from original owners:** new reducers in the
existing paint review classify 7 focus groups / 265 observations as an
outline-to-shadow authoring substitution, and 1 card group / 52 observations as
equivalent shadow syntax only. All original native outline resets, candidate
focus rules, normal/live stages, direct identities and complete membership are
checked; negative controls reject missing cases, duplicate owners, altered
outline/style/rules, forged membership and incomplete rule evidence. The card
review binds the native elevation token result, candidate literal and all stages,
plus the pinned actual parser tested against browser pixels. It does not approve
whole-card rendering or uncaptured token behavior. Original scalar values and
unrelated rows remain intact. `node --test --test-name-pattern="card shadow serialization|focus shadow substitution binds" tests/material-parity/control-state-paint-review.spec.mjs`
passes 2/2 (8.13s). These 8/317 classifications are prepared, not yet invoked by
the producer. Canonical/index remains 130 unresolved; after the previously
integrated 12 overflow groups and this shadow batch, expected unresolved is 110.
Next integrate the two reducers/validators with bound-evidence guards and exact
producer restoration, then continue remaining appearance and spacing questions
before the expensive reconciliation/export milestone.

**Transparent focus shadow now has public behavioral evidence:** the focused
`public button focus distinguishes` test reuses the existing root-package button
reduction in memory, adding only an equal authored focus-shadow rule and equal
z-index variants. Real Tab input focuses the first button on both sides at DPR
1/2. Native `none` and alpha-zero shadow retain identical outlines and pixels.
Astylar `none` creates eight visible-flagged fallback meshes; alpha-zero creates
none. At equal z-index 1 the candidate pixels differ, demonstrating an observable
behavioral effect without Material code. At equal z-index 0 both candidate
captures remain identical: the ring is at Z=-0.02, behind the root plane. At
z-index 1 the owner is Z=0.25 and ring Z=0.23. This sensitivity exposes why mesh
presence alone was insufficient; it is not permission to add z-index to fixtures.
The initial pixel-difference expectation failed at the original zero-depth setup;
waiting the existing 250ms capture delay did not change it. The two-depth
experiment retains that observation instead of calling it rendering equivalence.

The package is imported from `astylarui`, never source/deep imports. Installed
`dist/lib/lib/astylar.js` SHA256 is
`6ad4f51ca47a9e1956a66b6e724105a66aaff582c53b0b30374fb6051723f5f8`;
the test authenticates it and compares its complete `configureFocusIndicator`
method against transpiled current source (whitespace only normalized). It does
not claim full installed/source package equivalence. History `25e1893` explicitly
replaced `.material-button:focus` shadow `none` with transparent shadow and added
the latter to another rule set. This is a real behavioral substitution, not
harmless no-paint syntax. Native outline-reset authoring and complete original
seven-group membership still need binding before canonical attribution. The
reduction intentionally keeps the browser's native outline; it does not yet prove
the exact Material focus presentation or diagnose all focus-depth behavior.
No captures were written, no production fixtures or renderer changed. Keep this
additive test receipt in the pending milestone reconciliation batch.
Focused command `node --test --test-name-pattern="public button focus distinguishes|card shadow serialization" tests/material-parity/control-state-paint-review.spec.mjs`
passed 2/2 in 23.34s (focus body 20.16s, card body 2.04s).

**Card shadow syntax question answered, classification not yet integrated:** the
focused `card shadow serialization` test in `control-state-paint-review.spec.mjs`
authenticates the retained capture and checks all 52 card owners. Reference
computed color-first syntax, candidate authored color-last syntax and all three
candidate inspected stages parse into the same ordered three layers using the
actual core parser. A browser reduction produces identical computed shadows and
pixels for both syntaxes at DPR 1 and 2. Removing the shadow or changing the last
blur from 3px to 8px changes pixels; the latter also changes parsed layers.
Command `node --test --test-name-pattern="card shadow serialization" tests/material-parity/control-state-paint-review.spec.mjs`
passes 1/1 (2.45s test body). No scratch artifacts, renderer or fixture changes.
This proves this syntax difference is harmless, not actual WebGL shadow fidelity,
whole-card equivalence, or token equivalence in uncaptured themes. Canonical
counts remain unchanged. Next bind the scoped representation classification into
the existing review machinery; reconcile this additive test receipt at the batch
milestone. Separately retain transparent focus shadows as unresolved: core
`configureFocusIndicator` explicitly disables the fallback for alpha-zero shadow
but lets `none` reach `shouldShowDefaultFocusIndicator`. That source distinction
requires a public focus reduction, not a blanket invisible-paint normalization.

**Twelve overflow groups producer-integrated:** production now invokes all three
prepared reducers and validators under bound original evidence, with an explicit
unbound-attribution guard. The existing combined-tail test executes actual source:
32 groups / 1,979 observations change against 0a30, and exactly 12 / 852 against
the current 8fbd checkpoint; all raw and unrelated rows are conserved. Reverse
order, individual replay and unbound execution controls pass. Focused command
`node --test --test-name-pattern="omitted owner paint" tests/material-parity/control-state-paint-review.spec.mjs`
passes 1/1 (14.18s). Exact historical producer restoration still authenticates
a986934f...; current producer SHA is 9b35aa8ead9a52c99fd73e68b7951382349f2718c2f04abaf7e514f2193cf31f.
Scoped diff checks pass. No new export: canonical/index still 130 unresolved,
expected 118 after milestone reconciliation. The new shared test/source receipts
and additive range-manager spec require reconciliation at that milestone; do not
silently refresh historical evidence. Next prioritize remaining appearance/paint
applicability and shared spacing ownership; all originally pending overflow
groups now have integrated scoped explanations, not full-rendering acceptance.

**Four range-input overflow groups prepared:** all 156 original input owners
are explicitly verified as type=range/inputType=range. Dependency-bound native
thumb-pixel and actual RangeManager/shared-clip evidence explains initial visible
versus omitted overflow in four groups / 312 observations. No equal hit regions,
dimensions, appearance, ancestor clipping, plugin composition or raster claim.
The combined range/owner-boundary replay is order-independent, preserves every
raw and unrelated row, and rejects incomplete/forged membership. Browser/table/
range focused checks pass 4/4 (10.52s); scoped diff check passes. Twelve overflow
groups / 852 observations are now prepared (table 2/104, differing owners 6/436,
range inputs 4/312), none yet producer-integrated. Canonical remains 130 unresolved;
expected 118 after this batch, subject to full integration validation. Next wire
the existing three apply/validate functions into the production tail and its
historical-source restoration; reuse the existing combined-tail test rather than
creating another integration framework. Batch subsequent findings before export.

**Range initial-overflow applicability demonstrated:** native Chrome range with
an authored oversized thumb paints 1,600 red pixels, 1,200 outside the 100x10
input box, identically for omitted/visible overflow. Hidden and clip controls
retain 400 inside pixels and zero outside; box geometry is unchanged. Persisted
in the existing control-overflow spec, browser test passes 1/1 (1.84s), no raster
files retained. Actual RangeManager creates unclipped track/active/thumb meshes
for the initial modes; actual shared OverflowClipService projects no boundary
for omitted/visible and installs planes for hidden. Existing range-manager spec
run via the existing core runner retargeted in memory passes 1/1. This is not
complete pipeline/raster equivalence, hit-testing parity or swapped-drag diagnosis.
Next bind the applicability sources to the four original range-input groups;
canonical count remains 130, with eight other groups prepared for integration.

**Six control-overflow owner groups prepared:** the 78 slider visual cases reuse
the independently bound composition proof: native host owns both inputs, while
the measured candidate visual is their sibling under the range-stack parent.
The 140 tab cases prove native leaf -> text-label -> content -> role-tab control
ancestry, with two hidden-overflow header ancestors, versus a childless candidate
button. Native measured leaves can compute display:block (flex item blockification);
do not describe them as necessarily inline or use inline applicability as proof.
Six groups / 436 observations are harness measurement-owner boundaries, not an
equivalence waiver or confirmed renderer overflow defect. Candidate clipping,
plugin overflow sensitivity, inherited clipping and final raster stay unproved;
existing composition/typography findings remain. Focused replay verifies exact
population, raw/unrelated conservation and rejects broken native role ancestry,
missing cases and forged membership. Canonical remains 130 unresolved; together
with the prepared table groups, eight groups await batch producer integration.
Next investigate the four native/candidate range-input overflow groups separately.

**Remaining control overflow owners bound:** all 156 original range inputs are
native-input to candidate-input; 78 slider visual owners are mat-slider to
mesh-rendering range plugin; 140 tab owners are native text spans to candidate
buttons. Complete declarations, raw style/reset checks, scalar/tree joins and
all three candidate stages establish native visible axes versus candidate
omission for these ten groups / 748 observations. Negative controls reject
missing rules, wrong types, hidden native axes and candidate overflow additions.
Do not reuse the tab-panel private-texture explanation for the range plugin:
its tracks/thumbs/state layers are child meshes. Likewise do not infer native
range internals from ordinary block overflow. All ten groups remain unresolved
pending these distinct applicability/ownership assessments. The new focused
binding test passes 1/1 (3.51s). Updated the prepared table proof's shared-spec
receipt for this additive test; no canonical integration or renderer changes.

**Table overflow classification prepared, not yet producer-integrated:** the
existing modal-row review binds both table axes to all 52 original owners
(two groups / 104 observations). Native initial visible overflow and candidate
omission are equivalent only at the own-clipping/default scalar boundary.
The proof pins table layout, creation/dispatch, shared clipping/defaults and
the focused tests; full table sizing, structure, scrolling, ancestor clipping
and raster equivalence remain unproved. Exact raw/unrelated conservation,
replay, missing-case and forged-membership controls pass. Browser/table/heading
focused command passes 3/3 (6.09s); scoped diff check passes. Canonical remains
130 unresolved; this prepared batch would reduce it to 128 after integration.
Next inspect remaining range-input/plugin and tab-button overflow boundaries;
do not trigger a full export for these two prepared metadata groups alone.

**Table overflow applicability checks pass:** added a browser sensitivity case
to the existing control-overflow spec: a fixed-layout 60x40 table with an
absolutely positioned 120x120 cell descendant has identical visible axes and
outside-X/Y reachability for omitted and explicit-visible overflow. Hidden
overflow and a clipping ancestor both remove outside reachability without
changing the measured table box. Browser plus original-52-owner checks pass
2/2 (3.53s). Added an ElementCreationService spec exercising actual table dispatch
followed by actual OverflowClipService: real table defaults omit overflow,
omitted/visible do not project or install clip planes, hidden does both.
The table sizing callback is a controlled descendant producer, not a claim
about the complete table algorithm or browser raster. Executed this one persisted
spec with the existing audit-button-overflow-core.mjs runner retargeted in memory
(entry point and exact spec name only): 1/1 passed, no new runner/artifact.
Scoped diff checks pass. Next bind these applicability dependencies and the
reviewed table path to the two original scalar groups; keep structural, ancestor
and full-rendering equivalence explicitly unproved. No canonical rebuild yet.

**Table overflow input binding prepared:** all 52 original table owners have
complete native rule evidence, no own overflow/reset requests, visible native
axes, and omitted candidate overflow in authored and all three captured stages.
The existing overflow helper now shares these input checks without extending
the heading equivalence verdict to tables. Negative controls reject incomplete
rules, raw inline/reset declarations, hidden axes, incorrect owner type,
candidate state/rule additions and inconsistent scalar/tree evidence.
`node --test --test-name-pattern="52 original tables|84 original heading" tests/material-parity/control-overflow-observation.spec.mjs`
passes 2/2 (4.61s); scoped diff check passes. The two table groups / 104
observations remain unresolved: next prove table-specific defaults and the
actual own-clipping path with browser sensitivity controls. No renderer,
fixture or canonical classification changes. Batch these additive proof-source
receipt changes into the next justified integration milestone, not a new export.
Checkpoint fc6035d is pushed; compact index 8fbd2e22 / 6f86d55a now contains
8,483 groups, 135 source findings, 39,904 controls and 130 unresolved groups.

**Canonical reconciliation completed at a6905e2:** the named current-ancestry
export completed in 35.67 minutes, and independent `ASTYLAR_AUDIT_COLD=1`
`node scripts/export-material-input-audit-current-ancestry.mjs --check` completed
in 38.09 minutes with exact canonical payload and Markdown equality. Both exit 1
solely for the remaining **130 unresolved groups**; there are no binding failures.
This is a reproducible partial audit, not completed input-equivalence acceptance.
Coverage remains 436/436 static and 1875/1875 interaction cases, 8,483 scalar
groups / 389,202 occurrences, and 135 source findings. Cold replay executed two
collectors with ten memory hits and no disk hits; all 1,205 read files / 89,154,859
bytes were reverified without invalidation.

Conservation against preserved 0a30: all 79 sections remain, 69 are unchanged;
all 8,483 raw scalar rows are identical. Exactly 20 previously unresolved groups
/ 1,127 observations acquire the prepared classifications. Other scalar changes
are receipts only: 530 mapped-overflow and 1,432 button-overflow shared-spec pins,
plus 48 dependent control-proof hashes. All other control evidence is identical
apart from 48 producer-reconciliation receipts. Remaining section changes are
22 source fingerprints, 48 line-box producer receipts, five summary fields,
five dependent binding receipts, and the added `fixture-icon-svg-replaced-by-fixed-raster`
finding; existing source findings are unchanged. All 534 exported LF-normalized
source fingerprints match disk. Scoped canonical diff/whitespace checks pass.
Compressed payload SHA: 8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43;
decoded SHA: 1862059e3ff9ec370d2b5dc1061141c0aef8eabda5a7009540318c987fea7bcf.

Next: import this verified partial checkpoint into the compact working index,
then finish remaining control/plugin overflow applicability before cosmetic
spacing/paint differences. Preserve the original captures and failed exports;
do not rerun the completed reconciliation or reopen proven coordinate causes.
The older notes below describe superseded checkpoint states, not current failures.

**Survey generator historical-receipt inconsistency resolved:** its finding replay
used the historical contract, but sourceFingerprints recorded live hashes for the
border, generated-mapping and capture-harness modules. The generator now uses the
existing authenticated historical-source adapters for those three dependencies;
adapters still reject unreviewed live changes. Regenerated the active chain:
exactly14 SHA fields across9 reports changed; full JSON comparison againstda48448
proves every other field unchanged. No capture, finding or classification changes.
Six-case browser motion verifier passes; pending-motion membership generator passes.
`node --test --test-name-pattern="all seven gap generators|gap report refresh"
tests/material-parity/reviewed-input-gap-receipts.spec.mjs tests/material-parity/gap-survey-source-replay.spec.mjs`
passes2/2 (72.27s), including every generator's independent --check with filesystem
writes prohibited and complete historical finding conservation. Scoped diff check
passes. This resolves the broader replay failure noted below. Canonical docs still
hold the preserved UNACCEPTED37cbaaf export; fresh export/check remain next.

**Cold export completed, not accepted; receipt chain reconciled:** export at
37cbaaf took36.36min, retained436/436 static and1875/1875 interaction cases,
8,483 groups /389,202 occurrences and135 source findings. It failed the gap
binding and reported166 unresolved rather than expected130. Failed manifest,
payload and Markdown are preserved in `artifacts/material-parity/failed-input-export-37cbaaf`
(compressed SHA cc44b653d8a1813b26cd2b8d8e340016d453385f3b63bc9774293e2b4aba3dda).
The docs canonical files currently contain this UNACCEPTED export; the compact
index still points to accepted0a30/150. Do not import the failed output.
The heading addition changed input-tree-evidence.spec.mjs c2d0884f...→e442a49c...;
independent in-memory replay proved all4 gap groups /59 cases /118 observations
and17 negative controls unchanged. The original scalar-layer browser test passes
1/1. Updated exactly three active receipts: scalar-rule-loss, gap membership,
and dependent pending-motion membership. Full JSON comparison against37cbaaf
proves no other fields changed. Scalar and membership --check pass; focused gap
receipt conservation and pending-motion binding tests pass2/2 (21.73s).
The broader legacy “all seven gap generators” test fails separately because its
survey CLI regenerates three live source fingerprints where the saved survey
keeps historical border/mapping/harness fingerprints. Do not refresh that whole
survey blindly; reconcile its historical-source replay contract before final gates.
No renderer/fixture changes. Re-export and independent cold canonical check are
still required. The preserved0a30 package is hash-verified and its79 section
fingerprints were collected read-only for subsequent conservation comparison.

**Prepared overflow groups now producer-integrated:** the six heading/tab-panel
groups below join the earlier14 groups in the bound-evidence producer tail.
Combined verification changes exactly20 groups /1,127 observations, preserves raw
and unrelated rows, passes reverse-order replay and all seven validators, and
rejects unbound application. Three focused tests pass3/3 (8.62s):
`node --test --test-name-pattern="omitted owner paint|84 original heading|70 original tab panels"
tests/material-parity/control-state-paint-review.spec.mjs tests/material-parity/control-overflow-observation.spec.mjs`.
Exact historical producer restoration still authenticates a986934f...; scoped
diff check passes. No full export yet: canonical/index remain150 unresolved,
expected130 after this batch if no additional changes. The next integration
milestone must reconcile the shared heading-test receipt change described below,
the icon finding, all source fingerprints and independent cold replay. Earlier
“integration pending” notes below describe proof preparation; producer integration
is now complete, canonical publication is not.

**Tab-panel overflow boundary now bound; integration pending:** all70 original
tab-panel owners reuse the existing wrapping/alias proof and the unchanged plugin
source fingerprint. Two groups /140 observations are measurement-owner boundary
differences: native inline text versus a childless private-texture plugin. Neither
an ordinary visible-overflow normalization nor invented hidden overflow is justified.
The existing competing-plugin text-renderer finding remains; original-case raster
clipping and overflow-mode sensitivity are explicitly unproved. Focused command
`node --test --test-name-pattern="70 original tab panels"
tests/material-parity/control-overflow-observation.spec.mjs` passes1/1 (2.59s),
including exact population, raw/unrelated conservation, replay and negative controls.
No new capture, framework, renderer or fixture changes. These two groups and the
four heading groups below still need producer integration. Canonical count remains
150; source-fingerprint reconciliation, independent cold export/check and final
gates remain outstanding. Prioritize remaining control/plugin overflow boundaries
before ordinary cosmetic differences; do not reopen proven coordinate root causes.

**Heading-overflow proof now bound to original owners; integration pending:**
card-title52 and dialog-title32 original owners pass complete declaration,
identity, native-axis and all-three-candidate-stage checks. Four groups /168
scalar observations receive equivalent-initial-value attribution only; all raw
and unrelated rows remain unchanged. `node --test --test-name-pattern="84 original
heading owners" tests/material-parity/control-overflow-observation.spec.mjs`
passes1/1 (2.68s), including replay and malformed-rule/type/style/coverage negative
controls. Existing defaults/clip/scroll dependencies plus the heading browser
test and generic element-creation clipping call are hash-bound. No renderer or
fixture edits. Producer integration/export of these four rows remains pending.

**Heading applicability evidence:** the
original initial-overflow proof covered11 ordinary types but not candidate h2.
Extended its existing core spec to check h2 defaults and exercise both div/h2
through actual OverflowClipService.apply with omitted/visible overflow; both
bypass projection and leave descendants unclipped. Ran that persisted Jasmine
spec with the existing audit-button-overflow-core.mjs runner adapted in memory
to the overflow-clip spec/name (no extra script/artifact):1 passed. Extended the
existing browser omitted-overflow test with h2 omitted/visible/hidden/ancestor
controls:1/1 passed (1.30s). Existing265 mapped-owner prerequisite check also
passes1/1 (3.27s). No renderer implementation changed.
The only dependency receipt change is the additive shared overflow spec hash
1a1b9cf...→53b6723c8b7d241afdc8b610b81a9158d9f5720c79a5926f51aa0b7cbb37fac8;
live review/test pins updated, historical documents left immutable. Next export
must account for this receipt-only change in existing mapped/button observations.
Original heading binding is completed above. Do not extend this
conclusion to table, input, tab button or custom-plugin overflow without their
own applicability evidence; this proves no heading text/raster equivalence.

**Current integration status:** the9 spacing groups below now join the5 owner
omission groups in the bound-evidence production tail:14 groups /819 observations.
Four focused checks pass4/4 (13.12s), including actual-tail execution against the
authenticated checkpoint, reverse-order application independence, unchanged raw
and unrelated rows, all five replay validators, unbound guards and exact
historical producer restoration. No full export or browser recapture yet.
Canonical/index remain150 unresolved; the expected post-export count is136 if
no further changes. The icon source finding and all changed source fingerprints
still require canonical integration/cold verification. No process is running.

**List composition proof:** three groups /156 observations (52 each
for top padding, bottom padding and flex direction) reuse the existing display
owner proof. Native padded block list is replaced by unpadded column-flex list.
Both native rows are48px light/dark,40px custom,24px contrast; candidate explicit
row requests are56/48/40px respectively. Thus larger rows are not an equivalent
host-padding transfer; contrast inflation is16px per row, not8. Native row
padding0 16px is replaced with zero padding and candidate label margin-left16px.
Native computed flex-direction:row has no corresponding authored flex request
on this block host. Preserve those distinctions as composition authoring, not
proof of a core padding/flex failure. The list-item recipe originates in2f44011;
compensation intent and used/raster equivalence remain unproved.
Focused `node --test --test-name-pattern="list spacing"
tests/material-parity/display-request-review.spec.mjs` passes1/1 (2.64s), checking
all52 owners, exact rules/stages, children/text, row conservation, replay and
negative controls. Uses existing module/test and retained trees, no new report.
Spacing batch totals9 groups /520 observations including slider/badge below.
All are producer-integrated, not yet canonical. No renderer/fixture changes.

**Margin-owner proof:** six groups /364 observations are covered by
focused reusable proofs and now hooked into production. Slider left/right
margins (78 each) are a measurement-owner boundary: native mat-slider requests
8px, while the candidate visual plugin has zero and its range-stack parent
requests0 8px at all three stages. Both inputs and plugin are children of that
parent; native inputs belong to the measured native host. Classify these scalar
rows as harness owner-boundary observations, not an omitted component margin.
Compound sizing/paint/hit-test equivalence remains unproved. History3dcbdd9
added the parent margin while renaming the visual measurement target.
Badge four margins (52 each) reuse the existing authored-anchor proof: native
token-based -12px margins/percentage anchors versus candidate zero margins and
fixed top/right:-4px. They are part of the existing authoring substitution,
not new core margin diagnoses. History7945a42 changed bubble offsets -10→-4
alongside size20→16 and text offsets; it does not prove a renderer cause.
`node --test tests/material-parity/slider-position-request-review.spec.mjs`
passes2/2 (6.52s), retaining all78 original slider-position states plus new
row conservation, exact populations, replay and missing-parent/rule controls.
No new captures, framework, fixture or renderer changes. These six groups are
included in the14-group pending canonical transition summarized above.

**Owner omissions integrated into producer; export pending:** five groups /299
original observations now pass through the bound-evidence production tail and
independent replay validation: max-width100% on chip0/1 (76 each) and tabs (70),
badge text-overflow:ellipsis (52), and bottom-sheet three-layer box-shadow (25).
These are unequal authored inputs, not confirmed core/raster causes. Existing
owner mappings, exact declarations, candidate rules and all three captured
stages are checked; incomplete evidence and competing requests are rejected.
Focused tests pass3/3 (11.70s), exercising the actual production tail, raw-value
and unrelated-row conservation, unbound gating, and exact historical producer
restoration. The prior stacking/radius test retains its30-group /1228-observation
scope at the preceding stage; its first run failed on the newly extended tail,
then passed after separating the extraction boundary. Earlier paint regression
passed2/2 (34.18s), and width suite5/5 (38.81s).
No full export or browser recapture for this increment. Canonical snapshot and
compact index still report150 unresolved; these five classifications are not
yet canonical and now accompany the nine spacing groups above. Icon source finding
also awaits export. Source-fingerprint/receipt refresh and independent cold
canonical verification remain required at the next coherent milestone.
Next: shared spacing/owner composition, overflow/appearance semantics and
focus-paint behavior. Do not repeat settled projection/slider investigations.
Checkpoint505835c, icon definitione3d3693, width proof70596fc and paint proof891ed39
are pushed; previous export/check/import sessions are terminal. No run is pending.

**Current compact index refreshed:** import13953 is terminal exit0; existing
store verification passes with 8483 groups,389202 occurrences,39904 controls,
134 source findings,150 unresolved. Current generation
0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb,
index SHA edf9c2de34728dc874460796853460dd5d39bafd71d4db41cba257366ec50cc0.
Checkpoint commit505835c contains verified payload/Markdown; push session59929
was still live at last poll (no failure reported). Poll before another push.

**Icon finding integrated into producer definitions, export deferred:** added
`fixture-icon-svg-replaced-by-fixed-raster` to existing sourceAuditDefinitions,
without changing earlier definitions. The focused icon proof now checks its
classification, exact live selector/source match and absence after substituting
the original SVG URL. Test passes1/1 (2.12s). No classification threshold or
rendering input changed. This intentionally makes the producer newer than the
verified checkpoint: defer full export to the next coherent classification batch.
The checkpoint/index still has134 findings; do not present the new definition as
already canonical or the pending core SVG reproduction as complete.

**Canonical checkpoint verified (audit incomplete):** cold check4560 is TERMINAL,
exit1 after 2,313,612ms (38.56min). It passed exact regenerated payload and
Markdown equality and reported ONLY 150 unresolved scalar groups. Coverage
436/436 static,1875/1875 interaction;8483 groups,389202 occurrences,134 source
findings. No binding failures, stale output or evidence invalidations. Do not
poll/restart4560. The current 0a30ca89... compressed / f4d0e6c... decoded snapshot
can now be committed as a verified incomplete checkpoint, not full acceptance.
The completed scalar/control and 79-section conservation checks establish the
intended 30-group transition; no raw observations were discarded. Compact index
import from docs is running in session13953; poll it before querying the current
generation. Old6f0a4c... remains immutable predecessor evidence. Producer changes
may now resume in focused batches; avoid another full export per small finding.

**Cold verification advanced:** session4560 completed evidence-session checks
with 1,205 files / 89,154,859 bytes, 2 collectors, 10 memory hits, zero disk hits
and zero invalidations. It reached `check-canonical` at 2,183,386ms; still live
at last poll, not terminal. The named launch remains read-only; do not restart.
Direct diff of producer against last canonical commit5183513 confirms only
stacking/full-radius application and validation plus seven fingerprint entries
(22 additions / 1 replacement); policy source definitions unchanged at this
checkpoint. Whole-report/scalar conservation results above remain applicable.

**Remaining max-width requests bound (integration pending):** all 222 original
owners in the three unresolved groups were checked in b07ef154... full trees:
chip0/1 76 each and tabs-primary70. `.mdc-evolution-chip` and
`.mat-mdc-tab-group` explicitly request max-width100%. Candidate chip nodes
instead have fixed widths97/68 and93/64; tab group has width100%, not maxWidth.
All three candidate stages omit maxWidth at these nodes. Their ancestry has
only the separate shared root maxWidth778px, not a relocated owner constraint.
This is not evidence that a percentage maximum was ignored by core: it was not
submitted at the mapped owner. Reuse `proveControlWidthRequest` for chip identity
and existing tab composition evidence when integrating. Parent size caps and
width100% do not generally establish the same min/max-content/flex behavior;
do not equate these inputs from captured geometry. No capture or fixture edits.

**Icon focused proof added:** `node --test
tests/material-parity/icon-asset-input.spec.mjs` passes 1/1 (2.44s overall).
Reuses existing authenticated full-tree inventory and checks all 20 original
owners, actual currentColor SVG path, preserveAspectRatio, exact light/dark PNG
sources and 24×24 IHDR dimensions, plus all three scalar/style joins. Counts
15 light / 5 dark; negative controls alter source, SVG path, style dimensions,
and PNG dimensions. The proof keeps coreDefectProven/rasterVerified false.
This new isolated test is not a dependency of running cold check4560; existing
producer inputs and canonical payload remain untouched. Source-finding and
canonical integration follow after that check; public SVG loading/alpha/DPR
root-cause reproduction remains required.

**Icon input substitution uncovered (pending source finding/proof):** the one
remaining objectFit group / 20 cases is not a like-for-like replaced-element
comparison. Authenticated b07ef154... full trees show native `mat-icon` wrapper
24×24, computed objectFit fill, containing inline SVG with viewBox0 0 24 24,
width/height100%, preserveAspectRatio `xMidYMid meet`. Candidate is an img with
objectFit contain and width/height24px in all three stages. Its source is a fixed
24×24 PNG (15 light-mode cases, 5 dark), not the SVG. CurrentColor SVG paint and
fixed raster pixels are different input contracts; square sizing alone cannot
establish rendering/DPR/ink equivalence.

History 48825c4 replaced candidate `/icons/favorite.svg` with
MATERIAL_FAVORITE_ICON_LIGHT/DARK and added the icon raster target. The asset
file explicitly says the browser raster keeps transparent pixels stable in
Babylon's texture loader. Original SVG has `path fill="currentColor"`.
Current source: astylar.component.ts:850, material-assets.ts:1, reference
registration reference.component.ts:140 and public/icons/favorite.svg.
No existing dedicated source finding was found in input-equivalence-policy.mjs;
the earlier custom-owner-border proof expressly excludes generated icon content.
Add this historical asset substitution to the existing source-finding system;
reduce original SVG loading/currentColor/DPR/alpha through public APIs before
claiming a confirmed core defect. Do not replace the reference with the PNG or
normalize away objectFit without explaining wrapper versus image ownership.
No producer changed while cold session4560 runs.

**Remaining border-style/width groups tied to existing evidence (pending
integration):** accepted compact rows contain three toggle style groups (68
owners each) and divider top-style/top-width groups (24 each). Authenticated
original b07ef154... full-tree/direct-ID joins and all three scalar/stage joins
were checked, without modifying cold-run inputs.

- Divider: all 24 reference `mat-divider` nodes have static positioning,
  zero content height and a solid 1px top border. Original `.mat-divider`
  CSS requests border-top-style solid and width `var(--mat-divider-width, 1px)`.
  All candidate stages instead use an absolute div, height1px, background
  #cac4d0, borderWidth0 and borderStyle none. This is the already-documented
  `fixture-divider-replaces-paragraph-flow-with-coordinates` substitution, not
  a fresh renderer diagnosis. Reuse its existing equal-input paragraph/divider
  proof and confirmed empty-block intrinsic-height finding when attributing
  these two remaining groups; do not rerun the settled root-cause investigation.
- Second toggle: all 68 native owners author only the tokenized left border;
  top/right/bottom have width0/style none. Candidate authors width `0 0 0 1px`
  with style solid, unchanged at every stage. The three residual styles concern
  zero-width, unpainted sides, NOT the left-divider color already covered by
  `fixture-toggle-divider-literal-replaces-divider-token`. Existing
  `outlineStyles` in border-initial-input-evidence.mjs explicitly recognizes
  these zero-width sides but its color attribution does not cover their styles.
  Extend that exact witness with a narrowly scoped used-border proof if claiming
  equivalent representation; do not equate full structure, colored left edge,
  radius/clipping or future width changes from this zero-width observation.

**Remaining shadow groups investigated (not integrated):** compact accepted
index identifies 9 groups / 342 occurrences. Read-only checks against original
report b07ef154... and current source distinguish three populations:

- Card-primary, 52: executing the actual TypeScript `parseBoxShadow` via
  transpilation yields identical ordered offset/blur/spread/color layers for
  native color-first and candidate color-last strings (only color whitespace
  normalized). All 52 matched exactly, three layers each. This supports a narrow
  equivalent-serialization proof, not paint/raster equivalence. Reuse the existing
  parser and its tests when integrating rather than inventing string normalization.
- Bottom-sheet-panel, 25: all pass existing `proveBottomSheetPanelPaint` owner
  mapping. Native `.mat-bottom-sheet-container` explicitly authors the three
  computed shadow layers; candidate authored and all three captured style stages
  omit boxShadow. Extend that existing panel proof to this missing request.
- Seven focus-control groups / 265: button32, core32, menu50, sheet-trigger43,
  dialog-trigger16, snackbar-trigger51, tooltip-trigger41. Original scalar rows
  have native none versus candidate `0 0 0 1px rgba(0,0,0,0)`. Actual parser
  returns zero layers for none and one transparent spread layer for the candidate.
  History 25e1893 changed `.material-button:focus` from none to this exact
  transparent syntax during compact parity alignment. Current `astylar.ts`
  configureFocusIndicator (around line1249) recognizes that syntax and disables
  fallback focus paint for alpha0; none instead falls through to the ordinary
  fallback decision. ef62cbd added the special handling and existing isolation
  test for transparent focus shadow.

A source-extracted execution of the actual three focus methods
(`hasAuthoredFocusPaint`, `shouldShowDefaultFocusIndicator`,
`configureFocusIndicator`) with controlled style/input collaborators confirms
none→fallback enabled, transparent→disabled for an otherwise unpainted focus
rule. This is method-level branch evidence, NOT a public browser/raster proof.
Do not classify the seven groups as harmless zero-alpha normalization. Next
extend the existing public isolation proof with paired none/transparent and
reference focus/outline declarations, preserving accessibility semantics; a
browser's default outline is distinct from box shadow, so the branch difference
alone does not establish a core defect. No renderer or fixture edits made.

**Remaining overflow cohort narrowed (read-only while cold check runs):** the
authenticated accepted index has 18 unresolved overflow-axis groups / 1,160
occurrences. Original report b07ef154... and full trees identify 580 owners:
card-title 52 (`mat-card-title`→h2), dialog-title 32 (h2→h2), table-primary
52 (table→table), slider-start/primary 78 each (input→input), slider-visual
78 (`mat-slider`→range-visual plugin), tab labels 70 each (span→button),
tab-panel 70 (span→tab-panel plugin). All native axes are visible, no active
own overflow/reset declarations were found, and candidate authored plus all
three captured style stages omit the axes. Direct-ID populations matched the
scalar stages exactly; existing alias mapping identifies dialog and plugins.
An initial alias-only lookup returned unresolved for direct-ID owners; that
was an inappropriate lookup, not missing evidence, and direct identity checks
resolved it. The 18 groups are not newly classified.

Next extend existing `control-overflow-observation.mjs` only after proving
applicability by renderer kind: headings/table, native inputs, text-to-button
composition, and plugins are separate ownership questions. Its current
div/span whitelist cannot simply be broadened to all types. The tab-panel
plugin draws text into its own size-bounded texture/plane (plugin lines 338–386),
already covered by `plugin-tab-panel-competing-text-renderer`; omitted CSS
overflow does not prove ordinary text overflow or clipping equivalence there.
Do not infer equal rendering from matching initial scalar values.

**Badge ellipsis question answered, classification pending:** all 52 original
badge owners pass existing `proveControlClippingRequests` (including alias and
full-tree validation). `.mat-badge-content` explicitly requests
`text-overflow: ellipsis`, hidden axes, and computes nowrap. Candidate authored
and all three style stages omit these requests, as do captured scalar rules.
This explains the one remaining textOverflow group / 52 occurrences as unequal
authoring, not a core failure to render an equivalent ellipsis request. The
initial showcase commit 2f44011 and current `.badge-bubble` both omit ellipsis;
current location is astylar.component.ts:689. Short text `4` is not an overflow
stress proof. Reuse the existing badge clipping proof for focused classification;
do not add compensation or assert that current core ellipsis output is verified.

Cold session 4560 reached **validate-audit at 949,378ms** and remains live.
No cold-run input sources were modified during these investigations.

**Whole-report reconciliation completed; cold check running:** streaming section
comparison session 2868 ended exit 0. Authenticated predecessor decoded SHA
757fce0f... and current f4d0e6c... cover 79 sections: 70 identical, 9 changed.
No need to rescan those unchanged sections. The existing `readAudit` option
`sectionsOnly: true` hashes completed paths, primitives and container markers
before pruning; member order is significant. Its focused tests passed 3/3.
Targeted authenticated recursive comparison session 6776 also ended exit 0:

- `discrepancies` and `controlTypography`: already covered by completed exact
  stacking/radius conservation below (30 groups and 48 producer receipts).
- `controlLineBoxes`: exactly 48 `normalizationReconciliation.currentModuleSha256`
  changes, from a986934f... to 0e5654f...; no observation values changed.
- `summary`: authoring-defect count 1654→1664, harness-defect 4222→4212,
  unresolved 180→150; no other changes.
- `gapReviewInputs`: only binding proof hash dbd0d4a9...→ad227dbb..., the
  receipt-only membership refresh in ba40020 (inspected diff).
- `ownerCaretInputs`: producer hash, runner hash c3cabcf...→4ed6abe...,
  and runner verification label change to exact additive-diagnostic reversal.
  These are the binding repairs verified in c435600; all observations unchanged.
- `reviewedSourceBatchInputs`: only current report hash 93492522...→7a423807...
  and producer receipt a986934f...→0e5654f...; no source observations changed.
- `sourceFindings`: only two line shifts (+34), in `run-material-parity.mjs`:
  `harness-tooltip-open-popup-checks-omitted` 1236→1270 and
  `harness-slider-drag-stays-in-half-domains` 1116→1150. IDs, excerpts,
  classifications and other findings are unchanged; current locations verified.
- `sourceFingerprints`: comparison by file identity (not array index) finds
  527→534 files, no removals, 7 additions and 22 changed hashes. All 534 hashes
  independently match current LF-normalized files: no stale receipts. Additions
  are overlay-layout stage spec, three tooltip/snackbar diagnostic scripts,
  tooltip composition spec, and stacking review/spec. Changed entries are audit
  producers/tests/bindings and the two gap-review receipt documents, not renderer
  or comparison fixture files. Per-file historical semantic review remains
  bounded to any transitions not already covered by the recorded focused proofs;
  matching live hashes alone does not establish historical equivalence.

Independent cold canonical `--check` launched from d2545d5 with the named
current-ancestry launcher and both COLD/PROGRESS flags. **Session 4560 is running**;
last confirmed phase build-audit. Poll this handle, do not restart it. This is
read-only canonical verification, not an export. The current snapshot remains
unaccepted pending its result and final reconciliation; 150 unresolved groups
still prevent full audit acceptance. No renderer, fixture or payload changed.

**Cold export 72739 finished (not running):** terminal exit 1 after
2,204,549ms (36.74 min). The three evidence-binding errors are gone. The ONLY
reported error is 150 unresolved scalar groups; full audit acceptance therefore
still fails. Coverage is 436/436 static, 1,875/1,875 interactions, 8,483 groups,
389,202 occurrences, 134 source findings. Evidence-session verification:
1,205 files / 89,154,859 bytes, 2 collectors, 10 memory hits, 0 disk hits,
0 invalidations. Current docs payload is 62,480,189 compressed bytes, SHA
0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb;
decoded 2,208,243,072 bytes, SHA
f4d0e6c60d2440d7f5f0f002c6e382190f7beb6d04ab31c9fc213b40fc831442.
This remains an UNACCEPTED working snapshot; the accepted compact index is still
6f0a4c.... `node scripts/check-material-position-canonical-conservation.mjs
--stacking-radius` finished successfully (session 65414, exit 0): exactly 30
groups / 1,228 occurrences changed, 48 control producer receipts refreshed,
all raw scalar inputs and non-receipt control evidence conserved. Ordered row
SHA 390f795069694b5d6c5b0a390cdc2c47bb359d442d7a68f30b76fac3dda6dc88.
Its scope is scalar/control evidence, not every report section; full-payload/
source-fingerprint comparison and independent cold check remain. Neither
export nor conservation is still running.

**Remaining appearance triage:** accepted index has 15 groups / 660 observations.
Pinned raw style inputs confirm: slider start/primary are input-to-input native
`auto` (78 each), not the non-widget `none` case; tab-panel is span-to-plugin
(70); chips are mat-chip-option-to-div (76 each) with 1ms noop animation rules;
sheet panel is custom-element-to-section (25), sheet actions a-to-button (25
each), dialog copy/actions custom-element-to-p/div (32 each), and dialog panel
div-to-section (32) with transition/none override rules. Bottom-sheet-overlay
(25), snackbar overlay/surface (34 each), tooltip-popup (18) are div-to-div with
no appearance/reset request in mapped scalar authored rules. The existing
`appearance-input-evidence.mjs` deliberately requires exact matching built-in
types/IDs and rejects motion/reset rules. Do not blanket-promote these rows:
reuse alias mapping proofs for the four div-to-div cohorts, and independently
assess widget/plugin/type substitutions. Full rule/inline ancestry verification
and focused classification integration are still pending; this scan is triage,
not new equivalence evidence. The report bytes were authenticated to b07ef154....

**Historical launch details, now terminal:** export from 764e59f launched September 28 15:54:50
local with `ASTYLAR_AUDIT_COLD=1`, `ASTYLAR_AUDIT_PROGRESS=1`, and the named
current-ancestry launcher (all five required inputs). Unified session 72739,
worker PID 16712, launcher PID 2044. See terminal outcome above; do not poll the
completed export handle. Prior failed output remains unaccepted.

**Remaining spacing population triage (read-only during export):** pinned report
b07ef154... was authenticated; every listed candidate value was checked in
painted, normal-resolved and interaction-resolved stages. No source evidence was
changed. Pending classification/proof integration:

- Checkbox: 68 owners, native padding 0, candidate authored `#checkbox-primary`
  padding `0 11px`, unchanged through all stages. This establishes authored
  substitution, not equivalent composition. Follow-up authenticated all 68
  native trees: inner `.mdc-checkbox` padding is 11px light/dark, 5px contrast,
  7px custom (17 cases each), with separate `.mdc-label` left padding 4px in
  every case. Candidate host padding stays 11px with gap 14px and flattened box/
  label children. Thus this is not a universally equivalent relocation of the
  native inner padding. Reuse `proveRelativeOwnerOffsets` for exact host identity
  and extend the existing composition evidence when classifying the two groups;
  no renderer-padding cause or geometric equivalence was proved.
- Snackbar: 34 owners, native overlay padding 0, candidate `.snack-overlay`
  explicitly requests `0 0 8px` with fixed full-surface flex-end positioning.
  Join to the existing overlay placement proof; do not infer equivalence or
  conflate this with the separately proved camera-depth defect.
- Tabs: 70 cases / 140 label observations. Contrast's 17 cases / 34 labels
  request candidate `1px 0 0`, versus native 0; all other 106 label observations
  request zero. Git bc4d442 changes `.tab` padding from 0 to this density-specific
  adjustment. This is an authored historical compensation candidate, not proof
  of a remaining core typography cause.
- Slider: 78 owners preserve native `.mat-mdc-slider` authored side margins
  8px, versus candidate zero at all stages and no captured own spacing rule.
  Follow-up authenticated all 78 candidate trees: `slider-visual` is inside
  `slider-pair.range-stack`, whose authored rule and all three resolved stages
  have margin `0 8px`, width 100%, height 48px. Its children are the visual plugin
  and two absolute range inputs. The native host's margin is therefore compared
  to the wrong candidate ownership level for an omission claim: the spacing
  request exists on the parent, not the mapped visual child. Classify these two
  groups through the existing range ownership/composition proof; do not label
  them missing authoring or assert full layout/hit-test equivalence from matching
  wrapper margins. No core fix follows from this scalar signature alone.
- Badge: 52 owners / 208 side observations have computed native -12px versus
  candidate zero; candidate uses absolute top/right -4px and 16px dimensions.
  Follow-up authenticated all 52 reference and candidate trees and recovered
  native authored expressions from retained rule `cssText`: medium uses
  `margin: var(--mat-badge-container-offset, -12px 0)`; medium-overlap uses
  `margin: var(--mat-badge-container-overlap-offset, -12px)`. Every native parent
  has medium/overlap/above/after classes. No active captured rule defines either
  offset custom property; native computed margin is -12px in every case.
  Blank captured longhand declarations therefore do not mean absent intent.
  Candidate top/right -4px and margin 0 were verified in every tree. Native
  computed top/right are 8px, not the authored percentage anchors; do not
  compare those used values as authored offsets. Next join the existing badge
  anchor/structure proof to assess representation equivalence; no renderer
  margin defect or equivalent geometry has been established by this survey.
  Existing `proveAuthoredAnchor` already verifies these exact requests and all
  three candidate stages, with negative controls for changed/duplicated margin
  shorthand. Reuse it for the four pending margin groups rather than creating
  another survey. Its `compoundPlacementEquivalenceProven: false` must remain;
  existing intrinsic-width/margin-box core findings are independent evidence.

**Additional read-only spacing evidence queued:** all 68 original expansion
cases retain reference title margin-right 16px from the authored Material title
rule, versus candidate shorthand margin 0 and absent marginRight in all three
candidate style stages. Each report/tree hash was authenticated against the
pinned original report b07ef154.... The candidate title is inside the trigger;
its chevron is a separate shell child with absolute positioning, right 24px,
width/height 8px. Reference title is a growing flex item; candidate title is an
inline span. Thus this is unequal authored spacing/structure, not a demonstrated
renderer margin defect or proven equivalent redistribution. Canonical
classification and focused regression integration remain pending. Do not repeat
this population survey; continue with the existing expansion composition proof
and history (`1f2f2aa`, `354084e`) when integrating the spacing batch.

**All three rejected-export bindings now pass focused replay.** Reviewed-input
replay binds 3,325 observations in 35.97s via `collectReviewedInputAuditInputs`
against the pinned original report. The last mismatch was the retained producer's
mixed newline encoding plus the known additive diagnostics. Reused the existing
`original-overlay-runner-line-endings.json` and exact source reversal; recovered
bytes authenticate to the original b2477a12... raw receipt. Neither original
receipts nor captured observations were changed. The context reader now parses
those authenticated historical bytes; it does not claim current execution parity.
The mapping/context conservation paths independently validate the same source
transition and conserve all non-receipt data. Initial focused runs exposed those
additional downstream checks; after reconciliation, both suites pass 14/14 in
23.71s: `node --test tests/material-parity/original-overlay-runner-source.spec.mjs tests/material-parity/original-overlay-context-survey.spec.mjs`.
Coverage includes 91 states, 200 mapped owners, 17,654 root properties, all eight
reused function receipts, corrupted ownership and provenance rejection.
Next justified milestone: named cold export, then full-payload/source-fingerprint
conservation and independent cold validation before compact-index acceptance.
The failed export remains unaccepted; pending classifications and final gates
still require completion.

**Overlay surface binding repaired:** e526f85 added a separate stacking proof;
the existing surface collector and all other module bytes are conserved. The
binding now pins the complete current source (276502d9...), removes only that
addition, and verifies the complete historical digest (259d6d7b...). The original
review receipt remains untouched. Focused command:
`node --test --test-name-pattern='tooltip stacking addition preserves' tests/material-parity/modal-position-inspection.spec.mjs`
passed 1/1 in 9.34s, replaying all 13 groups / 344 observations and rejecting
unrelated edits, changes to the added function, and lost observations. Only the
reviewedInputs historical harness binding remains from the rejected export.
No full export or canonical acceptance was performed.

**Caret binding repaired after the rejected export:** the existing exact additive
capture-diagnostics reversal now authenticates the caret producer's historical
source while recording both historical and current receipts. No capture receipt,
observation, classification, or canonical output was rewritten. Focused command:
`node --test --test-name-pattern='capture diagnostic additions|owner caret source command' tests/material-parity/gap-survey-source-replay.spec.mjs tests/material-parity/owner-caret-proof-commands.spec.mjs`:
2/2 passed in 76.61s. Complete caret replay retains 2,311 source cases, 1,734
selected cases, 4,050 observations, 118 reviewed groups / 3,154 observations,
896 unresolved observations, and 13 rejection controls; the shared transition
test rejects unrelated source edits. Canonical files are unchanged by the test.
The other two bindings remain unresolved. For reviewedInputs, merely restoring
the known diagnostic additions and changing newline encoding is insufficient:
restored LF hashes to c3cabcfde..., CRLF to 958a7452..., neither the recorded
raw receipt b2477a12.... Locate its exact historical producer before reconciliation.
For overlaySurfaceAuditInputs, git e526f85 adds `proveTooltipStackingComposition`
to the pinned module; verify complete pre-existing source and replay the 344
surface observations before accepting that transition. Do not rerun the full
export yet. Coverage/classification and final acceptance remain incomplete.

**Cold export finished but is rejected; do not import it:** session 46537 exited 1
after 2,589,023ms. Coverage remains 436 static / 1,875 interaction cases,
8,483 scalar groups / 389,202 observations / 134 source findings. Evidence-session
verification passed (1,205 files, 89,154,859 bytes, no invalidations), but three
bindings failed and unresolved groups rose to 415. This is not an accepted
regression in findings: missing historical bindings must be reconciled first.
The newly written docs canonical files are unaccepted working output, not the
accepted 6f0a4c... snapshot. That accepted index has not been replaced.
The failed manifest/payload/Markdown are retained under
`artifacts/material-parity/failed-input-export-f5db369`; compressed payload SHA
e50e2504dfa5fbb1e9045455923c30a2e8fec9472e8184cd27e27f222408be82,
decoded SHA cf5873bdcfca59311cbf3d6f0d0486238092d334e348d932a4bf76aff86d2209.
Targeted streamed inspection isolated the errors without another full builder:

- ownerCaretInputs: owner-caret-source-binding rejects harness c3cabcfde... ->
  4ed6abe8...; reuse the existing exact diagnostic-source reversal with tests.
- reviewedInputs: historical overlay-context replay rejects harness raw-byte
  receipt b2477a12... -> d0ded55f.... Establish newline/raw-byte provenance;
  do not substitute a normalized hash without proving historical bytes.
- overlaySurfaceAuditInputs: its review pins tooltip-position-composition.mjs
  SHA 259d6d7b..., now 276502d9.... Determine the exact source transition and
  conserve all original observations before accepting a receipt change.

No export is running. Next: repair these bindings with focused original-source
replay, then regenerate and perform full-payload conservation plus cold checks.

**Read-only spacing investigations queued for the next classification batch:**
During the cold export launched from f5db369, its evidence/source inputs were
not changed. The following checks used the hash-pinned original report
b07ef154... and authenticated referenced trees, not new captures. These are
investigation conclusions only; focused regression integration and canonical
classification remain pending. Do not repeat these surveys without new evidence.

- Stepper: all 68 cases / 136 labels retain native icon margin-right 8px versus
  candidate label margin-left 8px. Native headers have `0px 24px` padding and
  native content has `0px 24px 24px`; candidate host padding is `0 24px`, content
  padding is `0 0 24px`, and absolute headers offset the host with left/right
  `-24px`. All three candidate stages preserve these values. This is a changed
  composition, not an isolated renderer margin error or established equivalent
  layout. bc4d442802a5f75b543b89f3a890aa3de99f5dc8 introduced the negative edge
  offsets and fixed 130px headers; e45ff92f5f52269de247dd47b3f37ec4700c5562
  removed an absolute inner wrapper and added header padding/content wrapper.
- Checkbox label: exactly static custom/mobile has `padding: 0 0 1px` in all
  three candidate stages; the other 67 cases retain zero padding. Native bottom
  padding is zero. The original candidate rule is `.checkbox-label` with
  `mediaMaxWidth: 500px`, emitted for typographyScale > 1. Current source is
  examples/material-showcase/src/app/astylar.component.ts:779. History at
  662c179399121a8d05d9235dac42c560eb255e93 replaces 0.6px/1px translations with
  this padding adjustment. This establishes unequal authored inputs and the
  compensation's history, not a currently demonstrated renderer cause.
- List: all 52 cases retain native host padding `8px 0px` versus zero in all
  three candidate stages. The native `.mdc-list` rule owns that padding.
  Candidate row heights differ: light/dark 48px -> 56px, custom 40px -> 48px,
  contrast 24px -> 40px (13 cases per profile, two rows each). A proposed
  constant +8px-per-row explanation failed on contrast; the completed survey
  preserves the +16px contrast difference. Do not classify omitted host padding
  as an equivalent height redistribution. The list-item rule originates in
  initial showcase commit 2f44011; deliberate later compensation is not proven.
- Radio: all 68 cases / 136 labels have native inner-span margin-left zero,
  native label-parent padding-left 4px, and candidate label margin-left 8px in
  all three stages. Native `.mdc-radio` padding is 10px light/dark, 4px contrast,
  6px custom; candidate group margin-top is 9px light/dark and 4px contrast/custom,
  versus native group margin zero (17 cases per profile). Candidate absolute
  options and flattened ring/label children do not preserve the native padded
  control/label wrappers. The group offset originates in initial showcase commit
  2f44011, not a demonstrated later regression. Treat these as composition and
  authored-offset evidence; no used-geometry or renderer-cause equivalence is
  established. Original report/tree hashes were authenticated during the check.

**Targeted pre-export binding check completed:** text alignment (49 groups /
2,677 observations), LTR alignment (4 / 178), reviewed-source batch (146 /
6,295), and root background (144 / 2,311) bind successfully to the retained
original capture. Alignment/font alone rejected the same changed diagnostic
harness receipt. Its existing conservation helper now verifies the exact
current-to-historical source reversal and still compares every non-receipt
field. All six conservation tests pass (19.79s), including changed observation
and unrelated source-edit rejection. Fresh alignment/font collection then
binds all 72 groups / 4,016 observations across 2,311 cases with no missing
inputs or observations (35.61s). This checks these five bindings, not every
builder stage or final canonical acceptance. Next action is the named cold
export and complete conservation checks; accepted counts remain unchanged.

**Cold-export failure traced to followup binding, not a new box-sizing finding:**
The second cold export exited before writing canonical output. Its visible
`proveBoxSizingOmission` assertion was secondary: the expansion owner-mapping
binding had failed, allowing the already-reviewed panel/header mismatch to
reach an inappropriate fallback. Isolated replay identified exactly one changed
leaf in the expansion source proof: the capture-harness receipt changed from
c3cabcfde... to 4ed6abe8.... All 68 original observations remain identical.
`followup-input-source-replay.mjs` now reuses the existing exact diagnostic-source
reversal before comparing the complete historical proof. No assertions,
classifications, captured bytes, renderer code or fixtures were weakened/changed.
Source replay tests pass (3/3, 20.57s); added expansion receipt/observation
mutation check passes (1/1). The focused builder-boundary test passes (1/1,
44.36s), independently binding and validating all 66 groups / 2,640 observations.
Accepted canonical counts remain unchanged. No export is currently running.
Next: check other pending source bindings before another expensive export, then
perform full-payload conservation and cold acceptance. Prioritize integration
provenance first, then the retained dialog/toolbar/chips spacing investigations;
remaining scalar/state coverage and final enforced browser gates are still open.

**Pending action-radius coverage classification prepared:** card, toolbar and
dialog actions account for 20 previously unresolved groups / 620 observations.
Their native 9999px requests are replaced with explicit 20px/21px requests.
These can have equivalent CSS used shapes on equal sufficiently wide boxes;
the finding is missing full-radius renderer-request coverage, not proof of
different intended shapes, historical compensation intent, or pixel causation.
The independently demonstrated unclamped-radius sampling defect makes that
coverage gap material. Input/output equivalence remains unknown, not false.
`applyFullRadiusActionReview` now follows stacking review in production, guarded
by bound original inputs, with replay validation and an unbound-attribution
rejection. Its focused test replays all original owners, preserves raw rows,
and rejects forged metadata and incomplete case coverage (1/1 passed).
The production-tail test combines both batches: exactly 30 groups / 1,228
observations, unchanged raw records, both validators passing, and neither
review executing for unbound inputs (1/1 passed, 13.26s). Exact source reversal
recovers accepted producer SHA a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393;
unreviewed producer edits are rejected. This is not full-payload conservation.
The historical `prepared 106-group followup` regression also passes (1/1,
63.39s), preserving its 8,483 scalar rows and prior classifications.
Accepted unresolved count remains 180; pending combined classifications would
leave 150 only after full export, predecessor conservation and cold replay.
Cold export attempted with the named five-input launcher and progress enabled.
During build, explicit-gap and gap-membership collectors rejected the changed
capture-harness fingerprint (current 4ed6abe8..., historical c3cabcfde...).
The still-running export was deliberately stopped after this deterministic
failure; canonical files are unchanged and no new snapshot was accepted.
`gap-survey-source-replay.mjs` now authenticates the complete current harness
and removes only the added interaction geometry/paint diagnostics to recover
the exact historical source. It does not assert new captures equal old captures.
All seven gap-source replay tests pass (9.94s total), including changed-harness,
forged-receipt and live gap-normalization negative controls.
Combined scalar/control conservation is now available in the existing command:
`node scripts/check-material-position-canonical-conservation.mjs --stacking-radius`.
It authenticates the accepted 6f0a4c... predecessor, independently replays the
original cases, permits exactly 30 groups / 1,228 observations and the existing
48 producer-receipt updates, and preserves every other scalar/control value.
Focused forged-data tests pass (1/1); actual new-export comparison is pending.
This does not by itself compare every other top-level report section or accept
source-fingerprint changes. Radius group-level equivalence flags now correctly
remain null, matching the individual observations, instead of the shared
wrapper's false default. Radius and combined production tests pass (2/2).
Explicit-gap collector `--check` now passes: 16 groups, 296 cases, 1,032
observations and 40 negative controls; canonical unchanged.
Gap-membership's scalar-rule-loss prerequisite is reconciled: its unchanged
generator advances only the harness source receipt to the authenticated current
4ed6abe8... source; the membership generator advances only that supplement's
hash. Original captures/findings are unchanged. Existing seven-report receipt
conservation proves exactly 17 permitted historical receipt changes, with all
other fields identical and mutation rejection intact (7/7 tests, 9.53s).
Membership replay passes: 38 groups / 1,902 observations / 676 cases, retaining
two unresolved motion groups. No canonical audit acceptance change.
The separate pending-motion binding's older stale CSSOM parent receipt is now
reconciled. The browser verifier uses the authenticated historical gap reader;
exact removal of that import/call restores the complete pinned verifier hash.
Real Chrome 153.0.8010.53 replay retains all six browser controls and 32 original
dialog cases. Only browser version, parent receipt and verifier receipt change
in its report; the dependent binding changes only three source receipts.
All three pending-motion tests pass (28.03s including browser replay), retaining
14 receipt mutations, 17 binding mutations, and exact original binding contents
apart from those receipts. Both motion groups remain unresolved; no rendering
or resolved-motion claim is added. Canonical audit files remain unchanged.
Next: finish dependency preflight and retry the cold integration milestone,
then verify new payload and all section/fingerprint changes before acceptance.
Do not repeat the completed corner-raster investigation.

Read-only next-batch lead: all 32 original states for each dialog action retain
candidate padding `10px 20px` in all three stages with no authored padding rule.
That matches `src/app/config/browser-defaults.ts` button defaults. Native Cancel
and Save compute `0px 12px` and `0px 24px`; Save additionally has explicit 8px
left margin. Bind historical defaults and complete native token/shorthand rules
before classifying these nine spacing groups; do not infer a renderer offset.

**Interaction used-box gap closed for a focused 20-case cohort.** The harness
already measured interaction border boxes but discarded them from its report.
It now retains `geometry` using the existing comparison function with no target
exclusions, fixture changes, or changes to acceptance gates. Historical files
are untouched; never infer these measurements for their unmeasured populations.

Capture `action-boxes-79bd3dd/latest-report.json` (SHA-256
`02576edccf740a7dcf5273ea9193ba73a4b045a8ee7558e705853e7bd458b041`)
uses frozen `tooltip-keyboard-build-813f658/browser`, Chrome 153.0.8010.53,
light/contrast, desktop DPR1/2, badge/card/toolbar hover and dialog hover/open.
Command: set `ASTYLAR_MATERIAL_BROWSER_ROOT` to that browser directory,
`ASTYLAR_MATERIAL_ARTIFACTS=artifacts/material-parity/action-boxes-79bd3dd`,
`ASTYLAR_MATERIAL_FAMILIES=badge,card,toolbar,dialog`,
`ASTYLAR_MATERIAL_PROFILES=light,contrast`,
`ASTYLAR_MATERIAL_INTERACTION_VIEWPORTS=desktop-dpr1,desktop-dpr2`,
`ASTYLAR_MATERIAL_INTERACTION_STATES=hover,open`, then
`node tests/material-parity/run-material-parity.mjs --skip-build --interaction-only`.
Report-only capture exited 0; 20/20 existing interaction checks passed, zero
runtime errors. This is not full acceptance or input-equivalence acceptance.

Twenty target controls have equal paired dimensions within 1e-6 CSS px; eight
dialog actions are correctly absent before opening. Dialog action tops differ
by -1 CSS px despite equal dimensions; preserve this observation, not a new
root-cause diagnosis. Target style records match historical cases exactly after
removing only CSSOM sheetIndex/rulePath locations from ordered authored rules.
Focused `focused interaction capture` test in `authored-anchor-review.spec.mjs`
passes 1/1, authenticating report/tree hashes and all frozen browser asset bytes.

**Corner raster followup completed for this cohort:** the same focused test now
authenticates all 40 PNGs and samples color-normalized edges relative to each
side's measured box. Sixteen controls have paired visible fill edges; four
dialog Cancel controls lack candidate contrast and cannot establish shape.
Badge uses only upper corners because neighboring label paint contaminates its
lower-left region. Other observable controls use all four corners.

Five maximum sample deltas exceed 1 CSS px: contrast card 3px at DPR1 and DPR2;
contrast toolbar 2px at DPR1; light/contrast dialog Save 2px at DPR1. Eleven other
paired controls have deltas at most 1px. These are recorded observations, not
new acceptance tolerances. The card case is consistent with the established
12-vs-9 CSS-radius mismatch. The toolbar/Save residual is not yet attributable
between tessellation, raster phase and other paint behavior. Box-relative
sampling separates it from the dialog's 1px whole-control vertical offset.
Focused test passes 1/1 in 6.69s while explicitly retaining those discrepancies.

**Mesh-boundary reduction narrows the toolbar/Save residual.** The existing
source-extracted radius-kernel test now also evaluates the actual sampled
dimensions (toolbar 65.140625x24, Save 78.671875x40; both request radius20).
At CSS scales 1 and .01, all four continuous mesh boundaries at the three sampled
insets differ from ideal CSS circular arcs by less than .07px (toolbar, 40
vertices) and .03px (Save, 68 vertices). The known 9999px catastrophic sampling
defect does not justify attributing these smaller-radius pixel residuals to a
similarly large geometric error. This is source-kernel evidence, not a replay
of runtime mesh buffers or a framebuffer-coverage claim. Focused command
`node --test --test-name-pattern="current rounded rectangle kernel"
tests/material-parity/modal-position-inspection.spec.mjs` passes 1/1 (1.17s).

A read-only sensitivity check added 1e-7 device pixel before sample-index floor
to test near-integer floating-point ambiguity: Save maxima remain 2 CSS px at
DPR1 and 1px at DPR2 in both profiles. Thus that probe alone does not remove the
residual; original sample coordinates and failing observations are unchanged.
**Runtime paint ownership/bounds now observed.** Diagnostic harness field
`controlPaintGeometry` reads registered button meshes through the surface host,
retaining projected vertices, material/texture identity, scale and visibility.
It changes no renderer/fixture state or acceptance gate. Frozen-build capture
`action-meshes-b399ba7-v3/latest-report.json` SHA-256
`54f433e715c5079c499362f9b03d7249df7c294727e17b1f7f872dce9bbcf17b`
contains 12 toolbar/dialog hover/open cases, light/contrast, DPR1/2. Use the same
capture command above with families `toolbar,dialog` and this new output path.
Existing report-only interaction checks pass 12/12, with no runtime errors.

Eight relevant toolbar/Save meshes use StandardMaterial without diffuse texture,
unit scale, and 40 vertices for contrast toolbar /68 otherwise. Projected bounds
agree with measured control boxes within .000031 CSS px; target style records
match the prior focused capture exactly. There is no observed separate fill
texture or multi-pixel projected bounds shift. The test `runtime button paint`
requires eight observations, so absent captures cannot pass. Combined with
`focused interaction capture`, 2/2 pass in 6.70s. This narrows the residual to
framebuffer coverage/composition or probe interpretation, not a proven diagnosis.

Two diagnostic attempts are retained as failures, not usable mesh evidence:
`action-meshes-b399ba7` looked up pre-normalization mesh names and recorded empty
arrays; `action-meshes-b399ba7-v2` terminated because the registry belongs to
`surface.host`, not the public handle. V3 uses the actual registry. Do not repeat
these failed approaches or the successful geometry checks.

**Raster-coverage distinction established; stop treating the small sampled-edge
residual as a geometric offset.** Across all eight saved toolbar/Save cases,
partial upper-left edge pixels cluster within .035 of quarter coverage after
normalizing each surface's fill/background colors. Every native reference case
has partial pixels more than .07 from those quarters. The existing runtime test
authenticates all 24 mesh-run PNGs and checks this distinction; no threshold of
the parity harness was changed. A single focused toolbar/light/DPR1 observation
in `action-samples-e534c82/latest-report.json` (SHA-256
`f812bd8f67c8198300ee0e273cb57ef70879abc3b6e3e4e28fa968d2ca2f0763`)
records WebGL antialias=true, SAMPLES=4, render/canvas size 1440x1000, using the
same frozen browser assets. Command uses toolbar/light/desktop-dpr1/hover and
the same runner/options above, with this output directory. Existing interaction
checks pass 1/1; focused `runtime button paint` proof passes 1/1 in 2.80s.

The native/WebGL coverage distinction is observed, consistent with four-sample
coverage quantization; it does not prove the exact sample pattern or causally
allocate every residual pixel. In particular a strict >50% probe treats half-
covered WebGL pixels as outside. Preserve original residuals and report paint
sampling separately from equal CSS used-radius geometry, not as an invented
radius correction. Further pixel tuning is outside this input audit. Next
consolidate the radius-input classifications with these explicit paint limits,
then return to remaining box/overflow populations and pending export integration.
Remaining profiles/states are not covered by this sample. Runner/spec fingerprint
changes must join pending export reconciliation. Canonical unresolved count
stays 180; the 10-group stacking batch is still pending. No renderer/fixture fix.

**Static badge/action corner evidence bounded without recapture.** The focused
`retained static badge` test in `authored-anchor-review.spec.mjs` authenticates
36 original cases and 72 PNGs: 12 each badge, card action and toolbar action.
Measured paired dimensions agree within 1e-6 CSS px. Captured native 9999px and
candidate radius inputs reduce to the same CSS radius on these measured boxes,
except the three contrast-card cases (12px native versus 9px candidate), already
classified as an authored substitution. This closes the static used-box gap for
card/toolbar; it does not extrapolate measurements to interaction cases.

The badge's two upper corner edges differ by at most 1 CSS px at the sampled
heights in all 12 cases. Lower-left paint overlaps the neighboring label and is
not a trustworthy shape sample. Static card/toolbar corner/interior probes have
zero contrast on both surfaces, so their actual corner shape remains unproved.
Color and whole-control parity are not asserted. Focused test passes 1/1;
no capture, renderer, fixture or canonical classification changed.

Next obtain used boxes for retained interaction action states and check whether
their hover/focus paint exposes corners. Do not rerun these static samples or
the completed Share samples. Preserve transparent-control/occluded-corner gaps.
Canonical 180 unresolved and pending 10-group stacking batch are unchanged;
the modified spec joins source-fingerprint reconciliation at the next milestone.

**Retained sheet rasters can partially answer the corner-paint gap.** No new
browser capture was needed. A focused test in `modal-position-inspection.spec.mjs`
authenticates the original report and all 50 paired PNGs for the 25 sheet cases.
Share has measurable fill/background contrast in both surfaces; Copy link has
zero contrast at the same corner/interior probes in all cases. Do not use the
transparent Copy link samples to claim corner-shape equivalence.

Color-normalized edge samples at six heights on **all four corners** differ by
at most 1 CSS pixel in the 19 non-contrast cases (76 corners). All six contrast
cases differ by at least 4 CSS pixels at the first sample on every corner (24
corners); upper-left remains at least 5 pixels. This is consistent with the
already established 18-vs-24 used-radius mismatch. Reference first-edge samples
are also at least 13 pixels from the side, rejecting a square-edge explanation.
This is sampled corner evidence, not input, color, antialiasing, or whole-control
equivalence, and introduces no new canonical classification.
Verification: `node --test --test-name-pattern="retained sheet corner pixels"
tests/material-parity/modal-position-inspection.spec.mjs` passes 1/1 (5.78s for
the four-corner extension).

The Share corner sampling is complete; do not repeat it. Next examine other
owners' retained images and used boxes (badge and action controls); a state
with visible corner paint is still needed for transparent controls if their
actual corner rendering is to be established. Do not repeat the existing generic
oversized-radius core proof. Accepted unresolved count remains 180, pending
stacking integration remains 10 groups; this added spec dependency must join
source-fingerprint reconciliation at the next coherent export milestone.

**Stacking production integration wired and narrowly verified, not exported.**
The main builder applies the 10-group/608-observation batch after prepared
followups only when `ownerInitialStyleBinding` is bound. Validation independently
replays it and rejects stacking attributions without that binding. Added source
fingerprints cover the stacking proof/spec, overlay reduction, tooltip spec and
three new supplemental capture producers. This registers source dependencies;
it does not promote supplemental browser samples to full canonical coverage.

The existing checkbox/radio structural proof is reused for the three applicable
owners, preserving their associated-label versus custom-layer distinction.
`restoreStackingProducer` removes only the reviewed integration/fingerprint
fragments and reconstructs the exact accepted producer LF SHA
`a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393`;
previous producer-transition checks chain through it without weakened hashes.

Verification: `node --test tests/material-parity/stacking-input-review.spec.mjs`
passes 1/1 in 11.55s. It exercises the actual production tail on retained inputs,
bound/unbound behavior, all 608 observations, unchanged compact raw fields,
independent validator replay and mutation rejection. It does not run the entire
main builder or prove full-payload export conservation. Historical
`node --test --test-name-pattern="preparedFollowup"
tests/material-parity/position-canonical-conservation.spec.mjs` passes 1/1 in
1.51s. Syntax and scoped diff checks pass. Accepted canonical remains 180;
prepared stacking result is 170, not accepted yet.

Next consolidate remaining shared box/paint attribution before paying for the
next full export (last export took about 49 minutes). Forty unresolved corner
groups are the largest coherent next population. Preserve the pending stacking
batch and supplemental/source reconciliation; full-payload conservation, cold
milestone replay, complete state/history coverage and final browser gates are
still required. Do not rerun the same short-surface captures or export merely
for a metadata checkpoint.

**Complete remaining z-index batch prepared: 10 groups /608 observations.**
Six owner-addition groups (376 observations: card surface/action, checkbox label,
two radio labels, slide-toggle label) compare native auto with candidate explicit
2. Native own inline/active rules have no z-index request; candidate applicable
rules and all three captured local stages explicitly contain 2. Three omissions
(214 observations: two chip hosts, sidenav container) retain native explicit
`.mat-mdc-chip { z-index:0 }` / `.mat-drawer-container { z-index:1 }` versus no
candidate owner request. Do not normalize omitted to zero or call different
host/child structures equivalent. The tenth group is the 18-observation tooltip
ancestor-owner substitution already proved below.

`stacking-input-review.mjs` uses existing inventory, conservative selector checks
and `applyModalBoxReview`; it adds no capture or aggregation framework. Original
full tree/source receipts and the accepted 6f0a4c1c compact generation are reused.
`node --test tests/material-parity/stacking-input-review.spec.mjs` passes 1/1 in
7.29s, replaying all 608 original observations, exact per-owner populations,
unchanged raw rows, missing-population rejection and negative controls for native
inline overrides, unknown/global candidate rules and changed local stages.
Each proof explicitly leaves ancestor equivalence, computed omission behavior,
renderer cause, deliberate compensation intent and rendering parity unproved.
This attribution batch is not yet canonically applied: 180 unresolved remains
the accepted count, not 170. No renderer or fixture changes.

Next integrate this coherent batch using existing production followup hooks and
conservation checks, together with source-fingerprint reconciliation for the new
supplemental proofs. Do not run another browser capture for these authored-rule
questions. Remaining shared box/paint populations and final state/history gates
remain required after integration.

**Remaining-work triage refreshed against authenticated compact generation
6f0a4c1c:** still 180 unresolved scalar groups. Largest shared populations:
40 corner-radius groups; 24 padding and 23 margin groups; 18 overflow groups;
15 appearance groups; 10 z-index groups; 9 shadows; remaining flex/alignment,
visibility, sizing and wordBreak questions. This is scalar attribution coverage,
not the complete interaction/history acceptance checklist. Prioritize stacking/
overlay ownership while depth evidence is fresh, then shared box/paint requests;
do not repeat the now-proven short snackbar/tooltip depth capture. Source changes
since the accepted export still require coherent fingerprint reconciliation.

**Tooltip stacking-owner mismatch proved for all 18 original cases:** the
native surface and its next two ancestors compute z-index auto; the pane,
connected-position bounding box and fixed overlay container each explicitly
request 1000. The candidate places 1000 directly on relative `tooltip-popup`
inside the local `tooltip-anchor`/`tooltip-root`/page chain, with ancestor local
z-index fields omitted in all three captured style stages. This is an authored
stacking-composition substitution, not a core failure to turn native auto into
1000, and not permission to set the candidate leaf to auto. The independently
proved high-z camera defect remains separate.

Existing `tooltip-position-composition.mjs` now exposes a focused proof of those
owners; its existing spec authenticates original tree receipts, all 18 cases,
rule/ancestry/stage evidence and negative controls. Command
`node --test --test-name-pattern="tooltip z-index scalar|short viewport exposes|real Tab reaches"
tests/material-parity/tooltip-position-composition.spec.mjs` passes 3/3 in 1.58s.
Initial proof attempted to read a completeness field from normalized inventory
on raw trees; corrected to the actual raw schema/source contract, with immutable
tree receipts preserved. No canonical row changed: the one group /18 observations
is prepared evidence pending batch integration, not a claimed reduction to 179.

Historical snackbar sizing/translation compensation is already closed in the
source-history section (0d67d46 -> f3c8254 -> 899c741). No retained matching runtime
establishes the cause of the user's old large-host missing-output report; neither
the removed 159px transform nor the new short-height depth defect may be asserted
as that cause. Keep that explicit historical uncertainty, rather than repeatedly
recapturing the current tall state which paints. Next investigate the other nine
z-index groups' authored owners before integrating a coherent attribution batch.

**Snackbar boundary evidence retained and replay-verified:**
`artifacts/material-parity/snackbar-boundary-e331e79/latest-report.json`, SHA
`51434ca9c9a9d375e778c3185881b9bb09be2e28baa8133b99f67d216d4c0994`.
Eight paired ordinary-light samples: initial/real click, width 900, heights
1000/240, DPR 1/2. Chrome 153.0.8010.53; served bytes authenticated against the
existing fresh-build checkpoint; zero runtime errors. Both input trees omit the
surface initially and contain it after clicking. Both surface boxes equal
(278,height-56,344,48), with no below-viewport placement. Tall native/candidate
dark-pixel counts are 15,707/15,576 at DPR 1 and 63,610/63,211 at DPR 2; short
native counts remain 15,707/63,610 while candidate is 0 at both DPRs. Paired
short DPR 1 screenshots were visually inspected. This is missing painted output,
not missing authored state. The short candidate mesh Z 249.949 exceeds camera
Z 207.846; the tall camera Z is 866.025. The independent equal-input reduction
above/below owns the core defect attribution; showcase authoring is not declared
equivalent merely because the surface bounds agree.

Capture command: `node scripts/audit-material-snackbar-boundary.mjs
--base-url=<local-frozen-origin>
--checkpoint=artifacts/material-parity/tooltip-keyboard-runtime-813f658/checkpoint
--output=artifacts/material-parity/snackbar-boundary-e331e79`; exit 1 honestly
reports the two short-surface visibility failures. Existing supplemental helper
retains trees, screenshots, source hashes and served-asset receipts. No separate
framework or fixture changes. Focused replay:
`node --test --test-name-pattern="ordinary snackbar opens"
tests/material-parity/snackbar-position-observation.spec.mjs` passes 1/1 in
1.66s, checking all 104 installed core/source receipts, matrix, actual clicks,
trees, screenshot hashes, bounds, independently recounted pixels and depth.
Passing replay authenticates the failure, not rendering parity.

Next: determine which historical large-host missing-output reports remain
unexplained after the already-recorded overlay compensation/lifetime history;
do not attribute them to this short-height defect without matching host evidence.
Supplemental source/export reconciliation and remaining state coverage/final
gates stay open. The following probe entry is historical preparation, now
superseded by the retained paired capture for these exact conditions.

**Snackbar applicability probe:** unchanged fresh showcase browser assets were
rehash-validated against `tooltip-keyboard-runtime-813f658/checkpoint/manifest.json`
and served locally, Chrome 153.0.8010.53. Real mouse clicks in ordinary light
mode at width 900 and heights 1000/240 open the candidate (`open=true`). At 1000
the surface box is (278,944,344,48); at 240 it is (278,184,344,48), fully within
the canvas in both cases. The surface mesh Z is 249.949; camera Z is respectively
866.025/207.846. It is enabled and visible in both. This rules out missing open
state and below-screen CSS placement for this specific short-viewport probe.

An independent repeat with in-memory screenshots at DPR 1/2 counted exact
#322f35 background pixels inside the measured snackbar rectangle: tall
15,472/62,890; short 0/0. Both remain open at sampling (300ms plus settlement).
Thus the short-surface paint loss also occurs on the actual snackbar path,
consistent with the retained equal-input depth reduction. These are exploratory
console observations, not retained paired raster acceptance; no new report or
canonical classification was produced. Do not infer that this explains the
historical missing snackbar at larger heights: the current tall case paints,
and the original audit already retains 34 visible snackbar surfaces.

Next decisive gap: retain an authenticated paired ordinary snackbar boundary
capture using existing supplemental infrastructure, including actual click,
open state, mesh/camera depth, viewport pixels and the reference. Then compare
the historical symptom's host/scale/lifetime conditions before attributing it.
Do not repeat the already-established minimal high-z proof or alter snackbar
z-index/offsets to conceal the defect. Final source/export reconciliation remains
pending for the supplemental evidence batch.

**High-z-index paint defect now independently reproduced:** the existing public-
package overlay reduction authors one identical absolute rectangle on both sides
(20,20; 120x24; background #302d32; z-index 1 or 1000), without tooltip wrappers,
text, overflow, or placement logic. At heights 240/1000 and DPR 1/2 every retained
CSS and projected rectangle exactly equals native geometry. Low-z controls and
the tall high-z control paint all 2,880/11,520 native solid pixels with zero pane
mask differences. Short high-z paints **zero** candidate pane pixels. Chrome
153.0.8010.53; zero runtime errors; each four-case run is three passes and one
honest visibility failure. No renderer or comparison changes.

Evidence: `artifacts/material-parity/overlay-depth-ba5873b-v2-dpr1` and
`overlay-depth-ba5873b-v2-dpr2` contain result, source/package receipts and paired
rasters. Runner checks all fresh emitted package bytes against installed/local
compiled bytes. Commands: set `ASTYLAR_AUDIT_SPEC_FILTER=depth-`, then run
`node scripts/audit-overlay-layout-stage.mjs <new-output> <1-or-2>
artifacts/material-parity/tooltip-keyboard-source-build-813f658`.
The filter is recorded in provenance; excluded cases are not coverage passes.

The short camera Z is 207.846, whereas the high-z pane is at world Z 250;
tall camera Z is 866.025. Thus the equal-input defect is at the CSS-stacking to
camera/paint boundary, not CSS x/y layout. Unlike the earlier showcase trace,
this primitive remains in the active mesh list (including when respecting its
logical length), despite absent pixels. Active membership is not visibility
proof. First draft captures without `v2` are diagnostic history; v2 corrects
the active-list inspection to exclude unused backing-array slots.

Remaining priorities: relate this established depth defect to actual snackbar
state/depth before claiming a shared cause; keep missing connected-placement
fallback and keyboard opening separate; complete outstanding interaction and
source-history coverage. New supplemental proofs and changed reduction/runner
fingerprints remain pending the next coherent canonical integration/export.
No full gate or canonical classification was rerun/changed for this focused proof.

Short-tooltip scene trace narrows the missing paint to camera/depth, not authored
overflow: popup/ancestors have no clipping request; both popup meshes are enabled,
visible, opacity 1, and have null clip planes. Read-only Angular debug inspection
of the same fresh build finds popup world Z 250.099 (text 250.100). At height
1000 camera Z is 866.025 and both meshes are active; at height 240 camera Z is
207.846 and both are inactive. X/Y bounds still intersect the viewport. Source
`BabylonCameraService.initialize` sets distance from viewport height and FOV,
whereas `StackingContextManager.rootContextDepth` linearly maps root z-index
(`0.01 + zIndex * rootContextStep`) without a camera-bound range. This explains
why the projected measurement can exist while the short popup is behind the
camera. The trace is diagnostic console evidence, not yet a standalone general
browser proof. Next extend the existing equal-input overlay reduction with a
fully in-viewport high-z-index pane at short/tall heights, retaining raster and
camera/mesh evidence. Do not lower the tooltip's z-index to hide the core
paint-boundary issue or conflate it with the separate missing fallback strategy.

**Tooltip boundary capture retained:** `tooltip-boundary-1f46760/latest-report.json`
under Material artifacts, SHA
`19ee234981edcf4a05a31de2f2fec9f291f25f455e899bbba62ee34c80b1e9c7`.
Twelve paired ordinary states (initial/hover/wheel, 900x1000 and 900x240,
DPR 1/2), Chrome 153.0.8010.53, existing authenticated fresh-build assets,
zero runtime errors. Capture exits 1 for genuine placement/presence differences.
At 240px height both DPRs reproduce an 80.002px top-position difference:
reference flips above, candidate stays below with bottom 253.080px. Tall controls
agree within 0.01px. Retained screenshots were inspected: candidate tooltip is
not visible, despite its retained box; the tooltip-region dark-pixel census is
0 candidate versus 2,078/8,858 reference pixels at DPR 1/2. This documents missing
paint in this state without attributing it to a specific clipping/paint stage.

The wheel sample is **not an isolated dismissal proof**: reference document
height is 286px and scrolls 46px, candidate document height is 240px and scrolls
0px. Reference popup disappears; candidate remains authored/open. Trusted wheel
events occur on both. The unequal containing/scroll structure must be addressed
in the audit before interpreting this as a shared scroll-handler core defect.
Existing composition-spec checks for `short viewport exposes|real Tab reaches`
pass 2/2 in 1.35s, replaying runtime provenance, all trees/screenshots, geometry,
wheel events and viewport pixels. No comparison or renderer edits. Next trace
the retained-but-unpainted short popup through clipping/paint ownership, and
separate the reference's pointer leave after document movement from its connected
strategy's clipping dismissal. Do not redo the now-proven fallback boundary.

Exploratory next-case selection (not accepted raster/coverage proof): unchanged
fresh showcase assets, authenticated against the keyboard-run manifest, were
hovered in ordinary light mode at width 900 / DPR 1 and heights 1000, 260, 240.
At height 1000 both popup tops are about 229.08px. At 260 and 240 the native
tooltip flips above its trigger to top 149.078px/bottom 173.078px, while the
candidate remains at top 229.080px/bottom 253.080px. Both trigger tops stay about
181.08px and both candidate states are open. At 240 the candidate box exceeds
the viewport bottom. All six pages report no page errors. This console-only
probe selects the decisive boundary case; it does not prove painted visibility,
scroll reachability or shared historical snackbar causality. Next retain paired
trees/rasters and DPR 2 for this boundary using the existing capture machinery,
then test scroll behavior separately. Do not repeat the tall generic overlay
reduction or attribute unequal placement strategies to a core coordinate defect.

**Tooltip keyboard question answered:** fresh ordinary-mode real Tab capture at
DPR 1 and 2 focuses `tooltip-primary` on both sides (trusted key/focus events),
but only the reference opens a popup. Candidate `open` stays false and its
authored tree contains no popup; this is missing opening behavior, not an
existing popup lost in placement/clipping/projection. Tab away leaves both
closed. This supports the source-level comparison-authoring omission described
below, not a general core focus defect or the old large-offset symptom.

Capture: `artifacts/material-parity/tooltip-keyboard-813f658-v2/latest-report.json`,
SHA `7bc0a3e60a7f875196b0d75ab60d63de05b1419a9c2bed1b370cfe5de4f3477a`;
Chrome 153.0.8010.53, six paired states, zero runtime errors, exit 1 for the two
honest focus mismatches. Separate keyboard producer reuses supplemental capture
validation without changing the historical pointer producer or its receipts.
Fresh `ngc` source compilation matched all 104 installed core JS files; fresh
showcase development build completed in 19.24 s with two prerendered routes.
`tooltip-keyboard-runtime-813f658/checkpoint/manifest.json` retains source/core
and served-asset provenance; this is a new browser run, not the old checkpoint.
Existing composition-spec focused checks (`real Tab reaches|tooltip focus matrix`)
pass 2/2 in 2.10 s, independently checking runtime receipts, tree/screenshot
hashes, actual focus identities and missing popup ownership. First draft capture
is retained as diagnostic history, not the accepted producer-bound proof.
No fixture/core edits or full export. Next: connected placement edge/scroll
coverage, keeping this demonstrated state omission separate from geometry.

Tooltip keyboard coverage is now distinguished from the eight historical
`focus` cases: all eight authenticated paired trees contain no tooltip popup.
The current harness's focus branch calls `target.focus()` on both sides, whereas
Material's directive opens on `origin === 'keyboard'`. Thus these cases cannot
prove real keyboard-origin opening, even with high screenshot similarity.
The focused `tooltip focus matrix` test in the existing composition spec passes
1/1 (2.01 s process), authenticating the original report and all 16 tree receipts.
This proves a coverage gap, not runtime Tab failure. Next capture ordinary real
Tab/blur states with current browser provenance. This new spec is a pending
source-fingerprint change for the next coherent integration milestone; no full
export is warranted solely for this assertion.

Next overlay question narrowed: existing tooltip state evidence covers only
initial/hover/press/release/leave, not keyboard focus, edge fallback or scrolling.
`scripts/audit-material-tooltip-state.mjs` declares exactly those five actions;
its retained supplemental report is bound to Chrome 152.0.7977.76. Do not extend
its conclusions to keyboard/scroll states or recapture under a different browser
while claiming the same checkpoint. Current reference Material directive
`module-CWxMD37a.mjs` (lines 260–269) monitors keyboard-origin focus and calls
show, and hides on loss of focus. Candidate `astylar.component.ts` focus handler
(lines 110–122) opens only autocomplete/timepicker; tooltip opening is authored
in pointerenter. This is a source-level focus-contract omission, not yet a real
keyboard reproduction or a core placement diagnosis. Next use the existing
package/browser diagnostic route with explicit current provenance to compare
ordinary Tab focus/blur, then edge and scroll behavior. Preserve the old pointer
capture and avoid rerunning its settled matrix unchanged.

The cold export from **24ff18b** finished in 2,923 seconds. Its sole reported
error is the remaining **180 unresolved attributions** (previously 286); it
retains 436 static / 1,875 interaction cases, 8,483 scalar groups, 389,202
observations and 134 source findings. Independent `--prepared-followup`
conservation passes: exactly 106 groups / 4,635 observations change attribution,
all raw inputs and unrelated control evidence remain conserved, and 48 control
source receipts reconcile. Input/rendering equivalence remains false.

Independent section reconciliation authenticates all 79 sections: 72 unchanged;
only sourceFingerprints, summary, discrepancies, controlTypography,
controlLineBoxes, ownerCaretInputs and reviewedSourceBatchInputs change.
All 527 source fingerprints match current normalized-LF files (two additions,
seven updates, no removals). The 54 metadata leaf changes are three summary
counts, 50 producer receipts and one independently reconstructed motion-report
digest (`93492522d40f27a3236314d82e44f815c66ca582a039e1ce26d73edecd135914`).
The new compressed snapshot is
`6f0a4c1c3c214695abe87bb185f6c6c392acd5fa6452d2315891854f85cc9de9`,
decoded SHA `757fce0f5455b3de19e0ef1bf93af3725a3ac01794a7d44a4feb42a4f2b6d9bf`.
Evidence logs: `artifacts/material-parity/prepared-followup-{export,conservation,sections,metadata}-24ff18b`
(export/conservation `.log`, sections/metadata `.json`). Compact import and
`npm run audit:findings:verify` pass (72,284,568 compact bytes); the current index
SHA is `a28657efd56dc23b707d09cd3148c55b4974c9385f8d47fd38cfc8cdb5754a96`.
This snapshot is accepted as an attribution/evidence update only. Next prioritize remaining
coordinate/overlay/clipping and plugin-ownership questions, then residual scalar
and history coverage. No renderer or fixture changes; final gates remain open.

Export preparation is complete for the 106-group batch. The existing canonical
conservation command now accepts `--prepared-followup`, pins accepted generation
4880964f and its decoded SHA, replays original capture membership, and requires
the ten exact attribution populations (106 groups / 4,635 observations). It keeps
raw/prior-record and 48 control-receipt conservation and false equivalence guards.
`node --test tests/material-parity/position-canonical-conservation.spec.mjs`
passes 32/32 in 119.98 s; the new focused mutation test passes separately.
Syntax and scoped diff checks pass. The named export dry-run confirms all five
baseline inputs; D: has approximately 13.1 GB free. Next run the single cold
export from this committed checkpoint with progress logging, then execute
`node scripts/check-material-position-canonical-conservation.mjs --prepared-followup`
and reconcile source fingerprints and all top-level sections before importing.
Do not accept counts or refresh the working pointer before that reconciliation.

The 106-group aggregate is now wired after the previous prepared-input stage,
only when original-case binding is bound. Producer validation replays the new
attributions and rejects their presence without that binding. The two display
proof sources are fingerprinted; wrapping and aggregate sources were already in
the fingerprint inventory. The existing source-transition chain now reverses
these exact additions to accepted producer SHA
`aaf27f96aa92742f29a736e8f0dd5d658379c3cab0ad758ce71528d676cfd234`.
`node --test tests/material-parity/position-composition-producer-transition.spec.mjs`
passes 26/26 in 6.72 s, including rejection of missing guards, missing source
entries and unrelated producer edits, plus all previous historical transitions.
Scoped diff checks pass. No export has run: canonical remains 286 unresolved.
Next extend the existing canonical conservation mode/test with the ten followup
populations and accepted 4880964f predecessor, then cold export and reconcile.

The prepared 106-group display/word/font batch now has a combined apply/replay
validator in the existing authored-anchor review module. Its focused test replays
all 8,483 accepted scalar records from authenticated generation 4880964f, changes
exactly 106 groups / 4,635 observations, checks all ten attribution populations,
preserves raw fields/order and every prior classification, and rejects forged
justification metadata. Input/rendering equivalence remains false. The explicit
tooltip wordBreak group remains unresolved. Command:
`node --test --test-name-pattern="prepared 106-group" tests/material-parity/authored-anchor-review.spec.mjs`
passes 1/1 (56.11 s test; 57.34 s process); scoped diff checks pass.

This is batch composition proof, not canonical integration. The canonical pointer
still names 4880964f and retains 286 unresolved groups. Next wire this aggregate
into the guarded producer stage, extend the existing exact producer-reversal and
canonical conservation checks, then perform one cold export and authenticate its
source/section transitions. No renderer/fixture changes, export or browser run
occurred in this increment. Remaining coverage priorities are shared coordinate,
overlay/clipping and plugin ownership causes; conditional radius paint, unsupported
tooltip wordBreak and other residual scalar questions; then full coverage/history
and the original unfiltered acceptance gates. Classification does not close those
root-cause or rendering questions.

Prepared font-family followup covers all twelve remaining groups / 619 original
observations, reusing the same ancestry/rule/local-stage proof rather than adding
another collector. Five page cases (chips, list, table, private tab; 326 observations)
retain the authored Roboto, Arial, sans-serif stack on both page ancestors and no
nearer request. They are computed/local measurement boundaries, not consumed-font
or plugin equivalence. Two toggle hosts (136) explicitly request legacy/component
family tokens while candidates retain only the page stack: token omissions, not
a substitution of current computed Roboto for authored intent. Five overlay
owners (157) are outside the styled native frame under the captured CDK overlay
root, with computed Times New Roman; candidates descend from the styled page.
This is substituted ancestry. Historical external declarations are not inferred
or reconstructed, and descendant font selection/paint is not established.

The proof checks exact page selectors/stacks, ordered token requests, serialized
declarations, complete mapped paths, all 89 native fields and three candidate
local stages. It preserves token resolution, physical font selection, motion
exclusion and rendering as unverified. Negative controls reject local insertion,
page-stack mutation, wildcard font reset, native override, changed token and
moving an overlay owner beneath the reference frame. Source locations for page
requests: reference.component.ts:106 and astylar.component.ts:471.
`node --test --test-name-pattern="font family requests" tests/material-parity/wrapping-input-populations.spec.mjs`
passes 1/1 in 23.32 s; scoped diff checks pass. No fixture/renderer changes or
browser rerun. The earlier scalar groups' raw data and classifications are retained.

Prepared display/word/font batch now totals 106 groups / 4635 observations:
28 authoring groups and 78 harness boundaries. Canonical remains 286 unresolved.
Next integrate these existing apply functions and validators as one coherent
batch, run combined raw/prior-classification conservation and source-transition
checks, then one cold canonical export with the named baseline and full receipt/
section reconciliation. Do not accept the expected 180-unresolved result merely
from arithmetic, or treat scalar attribution as final root-cause/browser acceptance.
The explicit tooltip wordBreak support question remains open outside this batch.

### Explicit weight followup

Prepared explicit-weight followup adds six groups / 263 observations. Four
overlay groups (sheet copy/dismiss/panel and dialog copy; 107 observations) retain
the exact Material component weight token requested by the owner or sheet ancestor,
while candidate ancestry and all local stages omit weight/font/reset requests.
They are authoring-request omissions, not proof that untested themes resolve to
400 or that candidate painted weight is wrong. Two range-input groups (156
observations) instead retain native font:inherit, its decomposed weight request
and computed 400 versus candidate local omission. They are measurement-boundary
attributions, not an assertion that inheritance is missing or correct in core.

The range cases reuse inspectRangeFontReset, replaying the original range owners,
types, ancestry, candidate control size and explicit size-reset omission for all
156 observations. That independent size authoring defect is preserved rather
than erased by this weight disposition. The generic inherited-local proof now
retains explicit weight requests without changing its earlier no-request scopes.
Mutation checks reject replacing tokens/inherit with literal 400, inserting a
local stage value, ancestor weight request or wildcard font shorthand.
`node --test --test-name-pattern="explicit weight requests" tests/material-parity/wrapping-input-populations.spec.mjs`
passes 1/1 in 15.78 s; scoped diff checks pass. Reference reset source is
examples/material-showcase/src/styles.scss:22. TextInputManager's weight parser
at :1246-1251 has a normal fallback, but this is not a used range-text inheritance
proof and is not cited as one.

Prepared followups now total 94 groups / 4016 observations; canonical remains
286 unresolved until batch integration. All remaining font-style and weight
scalar groups have prepared attributions, with their consumption/equivalence
limits explicit. Next: the twelve font-family groups / 619 observations, separating
page inheritance, overlay external context and toggle component token requests;
then integrate this coherent display/word/font batch. No fixture/core changes,
fresh browser pass or complete audit acceptance is claimed.

### Initial font-value followup

Prepared font followup adds 24 groups / 955 observations: 14 fontStyle groups
(536 observations) and ten fontWeight groups (419). The inherited-local-omission
proof shared with the word-property followup now rejects font shorthand as well
as the specific font field and all resets, on complete native/candidate ancestry.
All original native fields and three local candidate stages are checked. Native
normal style / 400 weight versus omitted candidate local fields is attributed
to the observation boundary only; no computed, inherited-response, descendant,
plugin paint or rendering equivalence is asserted. The existing proof helper was
renamed proveInheritedLocalOmission to describe its actual shared scope; no new
report, collector or validation layer was introduced.

The same focused population test conserves both the previous 46 word groups and
the new 24 font groups, keeps the tooltip explicit wordBreak request unresolved,
and exercises ancestor/serialized/reset/missing-path controls plus candidate font
shorthand mutations. Command:
`node --test --test-name-pattern="inherited word properties" tests/material-parity/wrapping-input-populations.spec.mjs`
passes 1/1 in 64.71 s; scoped diff checks pass. Prepared followups now total
88 groups / 3753 observations (18 display + 46 word + 24 font); the accepted
canonical still has 286 unresolved groups until coherent integration/export.

Remaining font triage is deliberately distinct: six weight groups / 263
observations include explicit sheet body-weight tokens (copy, dismiss, panel),
dialog supporting-text weight (copy), and native button/input/select font-weight:
inherit requests (both range input owners). Twelve family groups / 619 observations
split into five overlay owners with native external Times New Roman versus candidate
page-stack inheritance; two toggle owners with component family tokens; and five
chip/list/table/tab owners inheriting the page stack. These are first-case request
traces, not full-population classifications. Next reuse the existing font scope,
overlay and private-tab ownership proofs for those contexts; do not collapse
token requests into initial values just because they currently compute 400/Roboto.
RendererService.getInheritedTextStyle/pickInheritedTextProperties and
TextStyleParserService.DEFAULT_TEXT_STYLE contain normal font fallbacks, supporting
the local-versus-consumed distinction without proving all consumers use them.

### Inherited word-property followup

Prepared inherited-word followup covers 46 groups / 1764 original observations
in the existing wrapping-input-review module and population spec. It checks all
89 native scalar fields, complete ancestry, inline/active/serialized requests,
candidate applicable rules and all three local stages. These rows compare native
word-break/overflow-wrap normal or word-spacing 0px with omitted candidate local
fields, without relevant requests on either captured ancestry. Classify the
observation-stage boundary only; do not assert candidate computed defaults,
descendant/plugin consumption, inherited response or rendering equivalence.
Overlay z-index scalar-rule gaps remain exact and explicit. Negative controls
reject native ancestor requests, candidate resets/inherited fields, incomplete
ancestry, serialized-only requests and wordWrap aliases.

Tooltip wordBreak is deliberately NOT included: its 18 observations have an
explicit native .mat-mdc-tooltip-surface word-break:normal request. A fixture-only
omission classification would overlook the public support boundary. An in-memory
TypeScript probe importing SiteData from package-root astylarui proves wordWrap
is admitted, while wordBreak is rejected (TS2353) and overflowWrap is rejected
(TS2561). The installed declaration and current StyleRule agree on these fields.
No temporary source file or renderer/fixture edit is made. This proves typed
admission only: wordWrap may represent overflow-wrap semantics; absence of a
wordBreak field does not itself demonstrate a runtime normal-breaking failure.
Keep this scalar unresolved pending an equivalent-input support/consumption
reduction; do not substitute a wrapping style to match its screenshot. The prior
tooltip overflow-wrap:anywhere/nowrap findings remain separate and unchanged.

Source trace: renderer.service.ts:543-592 inherits wordSpacing/wordWrap;
text-style-parser.service.ts:41-43 supplies zero/normal defaults and :106-116
parses wordSpacing/wordWrap; text-canvas-renderer.service.ts:432 assigns canvas
wordSpacing; multi-line-text-renderer.service.ts:246 branches on break-word/anywhere.
StyleRule at src/app/types/style-rule.ts:82-86 exposes wordWrap but not wordBreak
or overflowWrap. These paths support the stage distinction, not a blanket claim
that all controls/plugins consume inherited values correctly.

Verification commands (no full exporter or browser recapture):
`node --test --test-name-pattern="inherited word properties" tests/material-parity/wrapping-input-populations.spec.mjs`
passes 1/1 in 44.91 s, preserving every prior row/classification and leaving the
tooltip request unresolved; `node --test --test-name-pattern="public word-property support" tests/material-parity/wrapping-input-populations.spec.mjs`
passes 1/1 in 14.39 s. Scoped diff checks pass. Prepared followups now total
64 groups / 2798 observations (18 display plus 46 word-property groups); accepted
canonical remains 286 unresolved. Next inspect remaining font-style/weight/family
owner/inheritance differences, preserving the explicit tooltip support question,
then integrate a coherent batch rather than regenerate for this metadata increment.

### Display followup

The three remaining display groups now have focused boundary proofs in the same
display-request-review module: radio (68 observations) substitutes an inline
mat-radio-group with two static mat-radio-button children for a locally block div
with two absolute div children; tab-panel (70) substitutes a text-bearing native
span for the childless private painting plugin; toolbar-title (52) compares
native computed block with local inline for spans without display/reset requests
under flex parents. The first two are authoring/ownership substitutions; toolbar
is a computed/local observation boundary, not proof of correct candidate used
display. All 89 native scalar fields, all three local stages, parent context,
child type/flow and text ownership are checked. Animation observations retain
native text and plugin label/data independently rather than assuming equal state.

All 18 display groups / 1034 observations are now covered by prepared proofs:
17 authoring attributions (982 observations), one harness boundary (52).
Original rows remain unchanged; structural, used-display and rendering equivalence
remain unproved. The test rejects changed declarations, resets, element types,
interaction stages, parent display and child-flow/text ownership. Command:
`node --test tests/material-parity/display-request-review.spec.mjs` passes 1/1
in 22.94 s. No browser recapture or canonical export was justified by this bounded
extension. The accepted canonical remains 286 unresolved until batch integration.

Current source corroborates the tab ownership boundary at
material-showcase.plugin.ts:337-388 (DynamicTexture, data-selected labels, private
font/baseline and fillText), astylar.component.ts:974 (plugin/data authoring), and
reference.component.ts:88 (native span). Reuse the existing tab-panel typography
and wrapping browser proofs documented below; this extension does not claim a
new browser pass or reclassify their root cause as core. Radio authoring is at
astylar.component.ts:491-492,935 and reference.component.ts:80. Toolbar local inline
comes from browser-defaults.ts:114 via StyleDefaultsService; used flex layout is a
separate core measurement, not a reason to replace its authoring with block.
Next prioritize the inherited typography/wrapping groups, reusing existing owner
proofs and examining consumption only where it is still unknown, then conditional
corner paint. Integrate these prepared display proofs with the next coherent batch.

### Explicit display-request preparation

Prepared display-request proof now explains 15 groups / 844 original observations
without changing the canonical 286-unresolved checkpoint. The existing compact
index, tree inventory, normalization and modal-review/conservation helpers are
reused; display-request-review.mjs/spec.mjs supply the missing semantic assertions,
not another collector/report/export framework. Exact active native declarations
(including serialized declarations), candidate applicable rules, all 89 scalar
fields and three local stages establish request substitution/omission. Native
dialog buttons explicitly request inline-flex before flex-parent blockification;
candidate buttons omit that request. Toggle hosts replace a native inner button
and overlay spans with direct label/check-mark children and explicit host flex.
Record these differing owners/children rather than assuming flattened wrappers
are equivalent. Expansion's native title explicitly requests flex, while the
candidate span omits display and receives the inline type default
(src/app/config/browser-defaults.ts:114, StyleDefaultsService.getElementTypeDefaults).

The focused test authenticates the original capture and current compact generation,
preserves every raw row/prior classification, covers all 844 observations and
rejects altered inline/serialized declarations, resets, types, parent context and
interaction stages. Used display, structural equivalence and rendering remain
unproved. Radio, tab-panel and toolbar's three display groups remain unresolved
by this proof; they require type-default/plugin and computed/local boundary
analysis, not the explicit-request classification. History corroborates separate
compensation work: 354084e introduced the expansion div/span label structure;
1f2f2aa later added a dense-profile translate(0, -1px) to that title. This does not
prove the display omission caused the old alignment symptom. Current authoring
locations: astylar.component.ts:513,663,977,993; reference.component.ts:86,90.
Next complete those three display boundaries, then batch integration with other
verified followups. Do not regenerate the full canonical package for this proof.
Verification: `node --test tests/material-parity/display-request-review.spec.mjs`
passes 1/1 in 20.61 s including the parent-context negative controls. Scoped
`git diff --check` passes. No renderer or canonical fixture inputs changed.

The cold export from f6e1ce6 completed in 2727.14 s with all 436 static and
1875 interaction cases, 8483 scalar groups, 389202 observations and 134 source
findings preserved. Its only reported acceptance error is 286 unresolved scalar
groups (previously 439). This is an audit checkpoint, not input/rendering parity.
`check-material-position-canonical-conservation.mjs --prepared-input` passed:
exactly 153 groups / 6909 observations changed attribution, with all raw input,
row order and unrelated control evidence conserved; one scalar receipt and
48 control receipts changed. The classification totals move 57 groups from
harness to authoring defects; 96 already-harness groups gain precise attribution.

Source/section reconciliation passed: all 525 source fingerprints match current
normalized-LF source, with exactly six added review files, three changed producer/
transition files and no removals. All 79 sections are accounted for, 72 unchanged.
The seven changed sections are sourceFingerprints, summary, discrepancies,
controlTypography, controlLineBoxes, ownerCaretInputs and reviewedSourceBatchInputs.
All 54 metadata differences are explained by three summary values, 48 control
producer receipts, two other producer receipts and the independently reconstructed
motion-report digest 4226426f40e559c8847d2c3f5ddf1354bba796be01316bd85991df6806f46730.
Evidence: artifacts/material-parity/prepared-input-{export,conservation}-f6e1ce6.log
and prepared-input-{metadata,sections}-f6e1ce6.json. Canonical compressed SHA:
4880964fc1018a1fd6409f7c7af2ddaa5fc21a82e45dab3a0cc5fce5a6019156
(62269741 bytes); decoded SHA:
f5f653def115d188c8905b75f0e41ef5a1bd0c7de7a29b8b31e8b65b494751dd
(2202607350 bytes). The historical capture remains historical, with applicability
validated by these source/proof transitions; this is not fresh browser evidence.
Compact import and `npm run audit:findings:verify` pass with all 39904 control
differences retained, 72050480 compact bytes and index SHA
5e86f89a05cd88843d7dd6130ed13c88cdb6371efb389d73a934c8d9f953511b.
The current pointer now selects the reconciled 4880964f generation. No decoded
2 GB report was retained and no additional browser capture was launched.

Remaining investigation priority: finish display/structure semantics before
inherited typography/wrapping and conditional corner paint. Display triage covers
18 groups / 1034 original observations, but does not classify them yet. It separates
explicit display substitutions (toggle groups, checkbox, expansion title, grid,
list, slide-toggle, slider, stepper and tree), browser blockification (toggle hosts,
dialog actions and toolbar title), and inline/plugin-wrapper boundaries (radio,
tab panel and tooltip). Compare candidate authored/default stages and child
structure next; copying browser computed display is not proof of equivalent input.
The generic hypothesis that inline children never stretch is unsupported:
flex.service.ts selects shouldStretchWidth before intrinsicInlineWidth. Do not
reopen that hypothesis without a minimal paired reproduction. Existing shared
coordinate, overlay, interaction, history/ownership and final unfiltered browser
acceptance requirements remain in scope; scalar attribution is not completion.

### Earlier preparation record (superseded by reconciliation above)

The existing canonical-conservation command now accepts `--prepared-input` and
pins the accepted a593d4c7 predecessor. Its independent population table requires
exactly 153 groups / 6909 observations in thirteen attribution categories, honest
classification/equivalence flags, original-row hashes and complete observation
membership. It retains the existing all-raw, row-order, unrelated-metadata and
48-control-receipt checks. `node --test tests/material-parity/position-canonical-conservation.spec.mjs`
passes 31/31 in 102.24 s, including forged expectations, changed raw/control data,
missing observations and false equivalence. Scoped diff checks and the named
current-ancestry export dry run pass. Actual exported-payload conservation and
source/section reconciliation have not yet run for this batch. Next launch one
cold export with the complete named baseline; do not accept its output until
`node scripts/check-material-position-canonical-conservation.mjs --prepared-input`
and source/section reconciliation pass. No final acceptance claim is made.

Producer integration now wires the 153-group / 6909-observation prepared batch
through the existing apply/validate/bound-case guard and source-fingerprint list.
The existing authored-anchor module composes the eight existing review functions;
no new exporter, report or validation framework was added. Combined replay against
all 8483 accepted scalar records changes exactly those 153 unresolved groups,
preserves every raw row and prior classification, and rejects altered review
metadata. The earlier focused anchor/corner mutation checks remain in the same
test. `node --test tests/material-parity/authored-anchor-review.spec.mjs` passes
1/1 in 85.34 s. The exact reverse transition restores producer SHA
887cc07d4c7ddb92f5b548c5df90e8168045ff4f23a1d254ee40958959c180d0;
`node --test tests/material-parity/position-composition-producer-transition.spec.mjs`
passes 25/25 in 5.89 s, including all historical transitions and rejected partial
integration/unrelated changes. Syntax and scoped diff checks pass.
This is verified pipeline wiring, not a regenerated canonical checkpoint.
Next extend the existing canonical-conservation command for this batch, then run
one export and reconcile fingerprints, raw/control conservation and section changes
before accepting/importing it. The old canonical remains authoritative historical
evidence (439 unresolved); it is not a current-producer export. Do not launch a
second exporter or skip receipt reconciliation. Full browser and root-cause gates
remain open; no renderer or fixture input changed.

Prepared text-transform proof covers 27 groups / 1304 observations, using the
authenticated original capture and canonical compact generation below. It joins
all 89 native fields, all three candidate local stages and complete ancestry.
Thirteen button-owner groups / 768 observations retain native token requests;
the other fourteen groups / 536 observations have no native transform/reset
request. None has a candidate ancestry request. Browser computed none versus
candidate local omission is an observation-stage mismatch, not proof of missing
authoring. The two overlay mappings preserve their exact z-index:1000 rule gap;
tooltip classification binds only its 18 original occurrences, not absent roots.
`text-transform-boundary-review.spec.mjs` conserves raw rows/prior classifications
and rejects changed ancestor declarations, local stages, wildcard rules, missing
ancestry and serialized-only overrides across all 27 owner groups. Native token
resolution, descendant consumption and painted text remain explicitly unproved.
Verification: `node --test tests/material-parity/text-transform-boundary-review.spec.mjs`
passes 1/1 in 28.98 s; scoped/staged `git diff --check` passes.

Source trace: renderer.service.ts:543 recursively inherits textTransform with a
none fallback; element-dimension.service.ts:669 and flex.service.ts:1088 also
inherit it, and text-style-parser.service.ts:46 defaults it to none. The reference
styles.scss uses mat.theme; current Material 3 transform tokens are null rather
than Material 2's none. An in-memory Sass compile (176 loaded files, 30028 CSS
bytes) emits zero filled/outlined/text transform token definitions. This supports
the invalid/unset-token explanation, not historical browser provenance or a
claim that every renderer/plugin text path is correct. No runtime or fixture
changes were made. Prepared followup now totals 153 groups / 6909 observations;
the accepted canonical still has 439 unresolved groups. Next integrate this
coherent prepared batch using existing conservation checks, then prioritize the
remaining inherited/wrapping and conditional paint gaps. No new export or browser
capture is warranted solely for this source/proof checkpoint.

Radius proof now prepares 28 chip/toggle groups / 576 observations; 44
badge/action-pill groups remain separate. The existing authored-anchor review
and spec were extended rather than adding another report or validation layer.
Authenticated replay checked 220 owners across 144 original chip/toggle cases,
exact native scalar joins and all three candidate stages. Chips retain native
`var(--mat-chip-container-shape-radius, 8px)` resolving to 8px, while candidate
`.chip` resolves 6px in contrast / 12px in custom (8px light/dark, not pending).
Toggle group retains ordered legacy and standard tokens, ending with
`var(--mat-button-toggle-shape, var(--mat-sys-corner-extra-large))`; reference
radii are 28/28/21/42px versus candidate 21/21/9.75/31.5px. These 28 groups / 576
observations have an authored-token substitution before paint, not proof that
clipping is wrong. Native duplicate/shorthand/longhand/reset mutations, inline
overrides, candidate duplicate rules, and altered interaction radii are rejected
across all twelve owner/profile combinations. The focused anchor/corner spec
passes 1/1 (33.19 s), conserving raw rows and prior classifications. Prepared
followup now totals 81 groups / 3356 observations, not yet canonical.
Do not lump the other 44 groups into the same conclusion: badge, sheet actions,
card action, dialog actions and toolbar action use native 9999px pills against
finite radii. Existing `proveBottomSheetActionCorners` explicitly preserves
conditional equal-shape-on-equal-box geometry for noncontrast actions; existing
button-pill evidence likewise distinguishes authored intent from used paint.
Reuse those proofs and resolve the conditional geometry question rather than
silently treating every numeric radius difference as either a paint defect or
equivalent rendering. No canonical classification or capture changed this turn.
The remaining sheet-radius geometry question is now bounded by original evidence:
25 open-sheet cases / 50 action owners have paired 480x48 or 868x48 border boxes,
with dimensions equal within 1e-6 CSS px. Native/candidate child order binds the
capture's Share/Copy row arrays. CSS uniform-radius reduction produces 24px for
the native 9999px radius and candidate 24px/36px radii (38 owners); contrast's
18px radius stays different (12 owners, already classified separately). The
existing proof is reused, not weakened. Altered dimensions and swapped owner
order are rejected. Focused row rasters are absent, so actual corner paint and
rendering equivalence remain unproved; no pending scalar is reclassified by this
geometry-only extension. The final combined focused spec passes 1/1 in 40.56 s.
Action-pill input replay now covers 168 card/toolbar/dialog owners. All retain
native full-corner text/filled-button tokens. Candidate card radii are 20/20/9/21px
at 40/40/24/28px declared heights; toolbar uses 20px at those heights, and dialog
actions use 20px at 40px. The contrast card's 9px request is not a full pill even
on equal wide 24px-high boxes (native reduction: 12px). Four groups / 52 observations
are prepared as authoring defects; the other action profiles remain conditional,
not paint-equivalent. Prepared followup totals 85 groups / 3408 observations.
The shared radius proof checks exact tokens, native scalar joins, three candidate
stages, and mutated declarations/heights. Focused spec passes 1/1 in 74.84 s while
two full reconciliation scans run concurrently. Initial negative checks exposed
two test-adapter mistakes, now corrected: native dialog IDs use data-parity-id,
and a mutation must target the owner's active rule index, not the first global
rule sharing its selector. No renderer/reference input was changed.
The card formula `densityHeight / 2 * theme.cornerScale` originated in 7945a42
(`fix(example): audit Material text and card`), and persists at showcase source
line 648. The commit also added profile offsets; history proves origin, not the
motivation for each change or a core paint diagnosis. Authenticated read-only badge
replay reuses the existing custom-owner/alias proof for all 52 owners: native
9999px and candidate 8px radii accompany 16x16 native/computed and candidate local
dimensions. Twelve static cases supply paired measured boxes (maximum size error
4.33e-11 CSS px); interaction cases do not supply those boxes. Do not generalize
static geometry into interaction paint equivalence. The remaining conditional
paint gaps require evidence at a justified browser milestone, not guessed closure.

Accepted owner-boundary checkpoint (export source 818e2a8): export 23967 completed
in 2414.21 s, covering all 436 static / 1875 interaction
cases, 8483 scalar groups / 389202 occurrences, 134 source findings; its only
reported error is 439 unattributed groups. All 519 current source fingerprints
match, including producer LF SHA 887cc07d4c7ddb92f5b548c5df90e8168045ff4f23a1d254ee40958959c180d0.
Prepared authored-anchor/corner files are correctly outside that export's source
set. Full conservation passed: exactly 134 groups / 3948 observations, one scalar
receipt and 48 control receipts updated, all raw inputs and other control evidence
conserved. Source reconciliation confirms four expected additions, three expected
changes, and no removals (519 verified fingerprints). Logs:
`owner-boundary-conservation-818e2a8.log` and `owner-boundary-fingerprints-818e2a8.log`
under `artifacts/material-parity`. All 79 sections reconciled: 72 unchanged and
seven expected changes (source fingerprints, summary, discrepancies, control
typography, line-box receipts, owner-caret binding, reviewed-source binding).
The 55 leaf metadata changes are exactly four summary counts, 48 line-box producer
receipts, two other producer receipts and the independently reconstructed motion
report digest. Section/metadata logs use the same owner-boundary/818e2a8 prefix.
Compact import and verification pass: 8483 scalar groups, 134 source findings,
39904 control records, 389202 occurrences, 439 unresolved groups, 71723948 compact
bytes. The immutable generation includes its manifest. Current payload
SHA is a593d4c7e804b6cf5ba863163122fde6cb31774c88c5fe6f97f6504cee2fa948;
decoded SHA d278ff1faf4d3389db64eef2cba515072a1f55b27f787ce5664acff1287cdc46.
Current compact index SHA: c5224eea34da7aa30570bcad482ac04e55c39ba0a8988a0d7ec0b88629f350c1.
This accepts the coherent audit increment, not input equivalence or final browser
acceptance. The 85-group anchor/corner followup above remains prepared, not in
this generation. No exporter or reconciliation job remains running.

Prepared minimum-size review now covers all 41 groups / 2197 observations:
eight explicit native constraints (402 observations)
(badge min-width/min-height 16px token, card/dialog/toolbar button min-width 64px,
slider min-width 112px, table min-width 100%) versus 33 computed-auto/local-omission
groups (1795 observations). Full populations, exact owner types/aliases, 89 native
scalars, serialized physical/logical/reset declarations, and all three candidate
stages now pass. Raw rows and prior classifications are conserved; injected
native declarations, candidate logical minima and stage changes are rejected for
all 41 owner/property combinations. Focused command:
`node --test tests/material-parity/minimum-size-request-review.spec.mjs` passes
1/1 in 26.80 s. One mutation setup initially assumed every native text owner had
an active rule; the test now injects a rule for unstyled owners as well.
The range plugin reads `context.dimensions.width` (material-showcase.plugin.ts:178),
not a hidden 112px minimum. No candidate used-minimum or core-layout equivalence
is inferred. Existing `applyModalBoxReview` supplies the review/conservation path;
no new exporter or capture was needed. This adds to the anchor/corner followup:
126 prepared groups / 5605 observations, not yet in the 439-unresolved canonical
checkpoint. Next address 27 textTransform groups and remaining inherited/wrapping
values, then integrate a coherent batch. Preserve conditional corner-paint gaps
for a justified browser evidence batch; do not reopen completed source questions.

Prepared anchor/position followup now totals 53 groups / 2780 observations.
The last 16 static-owner position groups add 918 observations. Fourteen are
native computed-static versus absent candidate local declarations; sort and
toolbar-primary explicitly substitute relative positioning. All exact native/
candidate types, 89 native scalar fields, three candidate stages and relevant
rules are verified. Paginator range/size, tab panel and stepper content use the
existing authenticated alias mapper; direct IDs do not bypass full scalar joins.
No structural or candidate-computed-position equivalence is claimed. Focused
anchor test passes 1/1 in 24.25 s, preserves raw/prior rows and rejects injected
native or candidate position declarations for every new owner. These prepared
reviews cover the remaining position/inset/transform scalar population after
the running 134-group batch, but are not canonical or evidence of resolved
rendering defects. Next prioritize corner clipping/radius and sizing groups
while awaiting export reconciliation. Export 23967 remains in validation.

Prepared followup now totals 37 groups / 1862 observations. Relative-owner
review adds 22 groups / 1258 observations: badge/card/checkbox host insets (four
each), sidenav and toolbar-action position plus four insets each. Exact direct
ID/type/scalar/stage joins are used, not the alias-only mapper (which correctly
returns unresolved for these direct IDs). Native hosts explicitly request
relative positioning without physical/logical insets; badge/card/checkbox match
that request locally, while sidenav/toolbar omit it. Classify the two position
omissions as authoring defects and the twenty computed-zero/local-omission
inset groups as observation boundaries, never as proof of used-layout equality.
The existing anchor spec passes 1/1 in 17.74 s with all raw/prior rows conserved
and native/candidate inset-injection controls for all five owners.
Export 23967 advanced to `validate-audit` at 925.58 s (about 15.4 minutes).
It remains active; these prepared files are still outside its dependency set.

Prepared anchor batch now totals 15 groups / 604 observations. Five core-demo
groups (260 observations) reuse `inspectButtonHostRequests`: native relative
button has no authored insets and requests `.mat-ripple:not(:empty)`
`translateZ(0px)`; candidate `#core-primary` explicitly requests absolute
top/left 28px and omits transform in all local stages. Top/left and transform
are authoring differences; right/bottom zero-versus-omitted is a computed/local
observation boundary. The existing relative-to-absolute host and fixed-width
findings remain the owning context. No used containing-block or coordinate
equivalence is claimed. Focused anchor test passes 1/1 in 15.72 s, preserving
raw/prior rows and rejecting injected native offsets or candidate transforms.
An initial test failed because the new proof omitted the existing adapter's
direct node-key fields; adding those fields corrected the integration without
changing the evidence or assertions. Export 23967 is still active; these review
files remain outside its dependencies and canonical classifications.

Prepared followup: `authored-anchor-review.mjs` attaches the existing slide-toggle
flow proof and badge mapped-owner proof to 10 pending inset groups / 344
observations (2/136 slide-toggle, 8/208 badge). It checks original scalar values,
all three candidate stages, exact authored anchors, and serialized badge margin
tokens without interpreting empty expanded declarations as absent authoring.
`node --test tests/material-parity/authored-anchor-review.spec.mjs` passed 1/1
in 14.80 s; mutation checks reject added native/candidate offsets and changed or
duplicated margin declarations. Raw compact values and prior classifications are
conserved. No equivalence or compound renderer cause is claimed. These new files
are not dependencies of export 23967 and are not yet canonical. Keep them for
the next coherent batch after the active export is reconciled.

Cold owner-boundary export launched from 818e2a8: session **23967**, log
`artifacts/material-parity/owner-boundary-export-818e2a8.log`. Last observed phase
`build-audit` at 1.05 s. Poll this handle; do not restart unless terminal status
is established. No result is accepted yet. After successful validation/encoding,
run `node scripts/check-material-position-canonical-conservation.mjs --owner-boundary`
and reconcile all sections/source fingerprints before compact import/acceptance.

While export is active, read-only followup confirmed slide-toggle label offsets
across all 68 authenticated original cases. Reused
`proveFlowPositionSubstitution` from `scripts/audit-material-flow-position-substitutions.mjs`:
native label is static inside centered inline-flex flow; no active owner inset,
position/reset/motion declarations. The sole relevant candidate rule is
`.switch-label { position: absolute; top: 6px; left: 60px }`, with identical
captured scalar and all three resolved stages. Both pending groups (136
observations; compact IDs d9fbb4e9e563c21978ebc76fd37e373decfb1271cea155d3f79f58c610c66774
and 15166bdf0c536aaf26c8fa4a55c6e336e95233d9a71fcbca5253c8c940a1f99f)
are an extension of existing authored-flow evidence, not a new renderer cause.
Source: `examples/material-showcase/src/app/astylar.component.ts:511`; blame
f566f807 (`fix(core): apply ancestor interaction state layers`). The blame locates
the declaration's introduction; it does not independently prove its motivation.
Next attach these offset rows to the existing proof after export; do not rebuild
the original position investigation. Canonical classifications remain unchanged.

Badge anchor followup also completed read-only across all 52 authenticated
original cases, reusing `proveBadgePointerRequest` for exact native/candidate
identity and full captured stage agreement. The eight pending badge-count inset
groups (208 observations) are not an authored `8px` versus `-4px` comparison:
native rules request `.mat-badge-above .mat-badge-content { bottom: 100% }` and
`.mat-badge-after .mat-badge-content { left: 100% }`, with no top/right request.
Native CSSOM computes top/right 8px and margin -12px; serialized active rules
retain `margin: var(--mat-badge-container-offset, -12px 0)` and the overlap
override `margin: var(--mat-badge-container-overlap-offset, -12px)` (expanded
captured margin declarations are empty). Candidate's sole relevant rule is
`.badge-bubble { position: absolute; top: -4px; right: -4px }`, and all three
resolved stages preserve those requests plus default margin 0. This confirms
different anchor/margin authoring, not an alias error or a measured 12px renderer
translation. Do not replace candidate offsets with native computed 8px.
Source: `astylar.component.ts:686-689`; current badge-bubble line blame 48c994e3,
fixed host and theme-width table blame 2f440115. Existing input-equivalence policy
already records independent descendant-intrinsic-width and positioned-margin-box
core reductions (near lines 490/500), and the fixture-width substitution (1084).
Reuse those causes; do not infer compound placement equivalence from them.
Next add the pending inset rows to an exact authored-anchor proof with token
serialization and mutation guards. Canonical classifications remain unchanged.
Export 23967 remains live (Node PID 12020 confirmed); no source it reads changed.

Compact coverage refresh of accepted fca6a435 snapshot confirms 573 unresolved
groups. Largest remaining areas include 72 corner-radius groups, 27 textTransform,
21 minWidth, 20 minHeight, 18 display, and shared text/flow defaults. Prioritize
explicit positioning/composition substitutions (including this label and badge
anchors), then clipping/corner and sizing constraints, then typography/default
observation boundaries. The pending 134-group batch includes all 23 remaining
transformOrigin groups and 79 side-border groups; do not investigate those again
unless integration evidence contradicts their proofs.

The existing canonical conservation command now supports `--owner-boundary`,
pinned to the accepted fca6a435 package and original capture. It checks all
twelve attribution populations (134 groups / 3948 observations), raw scalar
conservation, complete independent replay, false-equivalence guards and 48
control receipt-only updates. `node --test tests/material-parity/position-canonical-conservation.spec.mjs`
passed 30/30 in 97.81 s; the final owner-boundary property allowlist (including
transform/origin and side borders) also passed its focused mutation test in
1.47 s. Named exporter dry-run confirms all five baseline paths; no export was
running at preflight. Next run one cold integration export, then this command
plus full section/fingerprint reconciliation. Canonical acceptance remains pending.

Owner-boundary producer integration is prepared and focused verification passed:
the seven existing reviews compose under authenticated original-case binding,
independent serialized replay rejects a forged equivalent classification, and
unbound review claims are rejected. Four review/test modules enter source
fingerprints. The exact producer transition restores accepted a9a2f55 source
(LF SHA f8554c3fe36008b31acdb01afc03df2395a20b658436622ffed4104ff76b4b43),
with all older predecessor transitions still passing. Command:
`node --test tests/material-parity/position-composition-producer-transition.spec.mjs tests/material-parity/custom-owner-border-review.spec.mjs tests/material-parity/overlay-origin-request-review.spec.mjs`
passed 27/27 in 47.65 s. No canonical export started; canonical remains 573
unresolved and the combined proposal 439. Next extend the existing canonical
conservation command for this exact 134-group / 3948-observation batch, then run
one integration export and reconcile sections, fingerprints and receipts before
acceptance. This supersedes the earlier instruction to add producer wiring.

Prepared batch predecessor check passed after checkpoint a9a2f55. The existing
custom-owner-border spec now composes all seven prepared reviews against the
accepted fca6a435 compact snapshot and authenticated original capture, using all
2311 cases in original order. Exactly 134 groups / 3948 observations change;
each was unresolved beforehand, compact raw fields remain unchanged, and fresh
serialized replay matches. Proposal unresolved count is 439; canonical remains
573 until producer integration and full conservation are accepted. Command:
`node --test --test-name-pattern="prepared border/position/origin" tests/material-parity/custom-owner-border-review.spec.mjs`
passed 1/1 (24.80 s). This verifies compact scalar composition, not full canonical
section conservation or rendering equivalence. Next: integrate existing review
functions with bound producer replay/source fingerprints and predecessor checks;
then refresh remaining property coverage. Prioritize coordinate/overlay ownership
and shared border/initial-style boundaries before isolated typography differences.
The accepted source-fingerprint reconciliation below is complete; do not rerun it
for this standalone test addition. No renderer, fixture or capture changes.

Caret/position export completed: session 91866 is terminal, exit 1 solely for
573 unresolved groups, elapsed 2367.41 s. Coverage remains 436 static / 1875
interaction cases, 8483 scalar rows / 389202 observations and 134 source findings.
Package compressed SHA fca6a4354e9c006e21066f0d19ea9435afacf436d226cda1c78f5ee420bea137
(61741143 bytes); decoded SHA
37b37fbe835a9e277dc4a550b4a49433ad6a29fb2e4b9b055172f36e3c3149f4
(2176547977 bytes). **Accepted caret/position audit checkpoint.** `--caret-position` conservation passed:
exactly 64 groups / 2441 observations; one scalar receipt and 48 control receipts;
all raw inputs and non-receipt controls conserved. Log:
`artifacts/material-parity/caret-position-conservation-40980fe.log` (26384 terminal).
Metadata/source/line-box comparison passed (20053 terminal), retained as
`caret-position-metadata-40980fe.log`: all 515 fingerprints match, eleven added,
three changed, none removed. Coverage is identical; classification delta is
27 authoring groups, -27 harness groups, unresolved 637 to 573. Differences are
one owner-caret producer receipt, two source-batch producer/report receipts, and
48 line-box producer receipts only; no line-box measurements changed.
All-section reconciliation passed (12459 terminal), retained as
`caret-position-sections-40980fe.json`: 79 sections, 72 unchanged, none added or
removed. All seven changes are accounted for: reviewed discrepancy/summary rows,
fingerprints, owner-caret/source-batch receipts, control typography receipts,
and the 48 line-box producer receipts described above.
Compact import/verify passed (68886
terminal): 8483 scalar rows, 134 source findings, 39904 controls, 389202
observations, 573 unresolved groups, 71524360 compact bytes. Current generation
is fca6a4354e9c006e21066f0d19ea9435afacf436d226cda1c78f5ee420bea137;
index SHA 5a5e8c8a31681e088f432bfd23d00327cd3757b383e8ccad50d1edc45f5f4472.
Manifest is retained beside the package. This accepts the reviewed classifications,
not equal rendering or final audit completion. All processing streamed the packages; no decoded
file is written. Import logs: `caret-position-{import,import-verify}-40980fe.log`.
Do not rerun the export. Prepared later reviews remain outside this package.
Next integrate the prepared 134-group / 3948-observation border/position/origin
batch with exact serialized replay, preserving this accepted predecessor. Then
refresh remaining coverage and continue attribution; all final gates remain.

Toggle position proof adds 16 groups / 1088 observations across 68 cases and
three exact native-host/candidate-div mappings. Four groups identify relative
position / group translateZ(0px) omissions; twelve distinguish native computed
zero offsets from omitted local declarations. Shared progress request proof is
reused without weakening exact selectors, types, scalar or stage checks.
Rounded clipping, containing blocks and equal-input coordinate behavior remain
unproven. Combined focused test passes (1/1, 13.44 s), conserving raw/unrelated
rows and rejecting literal native inset/candidate position injection for all
three owners. Prepared next batch totals 134 groups / 3948 observations.
Export 91866 advanced through evidence verification (1205 files / 89151875 bytes,
ten memory hits, zero disk hits/invalidations) to encode-canonical at 2222.71 s.
Await terminal result, then run the existing caret-position conservation and
all-section/source reconciliation; do not accept the package from encoding alone.

Chip/tab origins add 11 groups / 362 observations. The existing motion-caret
proof supplies authenticated scalar/owner identity and retains competing motion
requests; the shared origin-only ancestry check independently excludes explicit
origin/reference-box/reset requests. This is a local-versus-computed observation
boundary, not settled animation, equal reference boxes or equal rendering.
All five owners reject native ancestor transform-box injection and candidate
page-origin injection. Combined focused test passes (1/1, 12.16 s), conserving
raw/unrelated rows. Existing caret collectors were not modified. Prepared batch
now totals 118 groups / 2860 observations, including seven overlay origins.
All origin groups from the accepted checkpoint now have prepared scoped reviews;
canonical acceptance still awaits export 91866, confirmed live in validation.

Badge/progress origin proof adds five groups / 92 observations. Exact measured
owners reuse the border identity/alias proofs; complete captured ancestry excludes
authored origin, reference-box and reset declarations. Native pixel origins are
kept distinct from candidate local omission. All ancestor transform/motion
requests remain in evidence, with settlement/reference-box equality explicitly
unproven. The finite pixel syntax is not used to synthesize candidate defaults.
Combined focused test passes (1/1, 8.05 s), retaining raw/unrelated rows and
rejecting injected native ancestor origins and candidate page origins for all
three families. No producer integration; prepared batch now totals 107 groups /
2498 observations including overlay-origin. Export reconciliation remains pending.

Progress position review adds 11 groups / 220 observations across 40 original
cases. Three groups are explicit relative-position / linear translateZ(0px)
request omissions; eight are computed-zero-inset versus local-omission boundaries.
Identity matrix is not accepted as transform:none equivalence: containing-block,
stacking and used-offset behavior remain unproven. Reuses authenticated border
host identity and exact motion exclusions. Focused combined test passes (1/1,
7.27 s), preserving raw/unrelated rows and rejecting candidate position injection
and native literal-top injection. No producer integration or export dependency
changes. Prepared batch now totals 102 groups / 2406 observations including the
seven overlay-origin groups. Remaining progress origins are separate from these
position requests; pending canonical export/reconciliation is still first priority.

Prepared divider inset proof binds five groups / 72 observations to the existing
historical flow-compensation finding. Across all 24 cases, native position is
static with omitted inset requests; candidate `.divider` explicitly requests
absolute, left/right 28px, top 79px (light/dark), 74.785px (contrast), or 86.785px
(custom). Reuses border identity and original inventory, not a new survey.
All candidate stages match exact requests; native computed auto is not treated
as a literal replacement instruction. Source location remains
`examples/material-showcase/src/app/astylar.component.ts:759`; history/ownership
is `fixture-divider-replaces-paragraph-flow-with-coordinates` in existing policy.
Focused combined border/inset test passes (1/1, 7.06 s), preserving raw/unrelated
rows and rejecting native inset injection/candidate offset changes in all four
profiles. No new equal-input core cause is claimed. Prepared next batch is now
91 groups / 2186 observations including overlay-origin; canonical acceptance
still waits for export 91866 and its reconciliation.

Prepared border batch is complete for the 79 originally unresolved groups /
1904 observations (not canonical acceptance). Badge adds eight groups / 208
observations from 52 authenticated generated-span alias pairs. Exact native
radius token/pending longhands, inactive forced-colors radius, transform-only
transition and explicit none override remain recorded; candidate 8px radius and
absent motion remain unequal. No default or paint equivalence is inferred from
zero/none borders. Border-color admission rejects altered radius as well as
native/candidate border injection and wrong owner types. Focused test passes
(1/1, 6.53 s); combined prepared border/origin checks pass 2/2 in 6.89 s.
Together the next prepared batch covers 86 groups / 2114 observations (79 border,
seven origin). Integrate only after the live caret/position export is reconciled;
do not change its dependencies. Existing session 91866 remains live in validation.
Next substantive coverage: remaining origin/position and typography/inheritance;
first refresh compact pending counts after accepted export reconciliation.

Tab border measurements are now joined to the existing composition proof:
native text-label span versus candidate button, 70 cases per control / 16 groups /
560 color observations. Label border requests are absent; candidate `.tab`
requests width/radius zero but exposes transparent initial color. Classified as
a measurement-owner boundary, not equivalent control paint or a missing native
button reset. Shared review now covers 71 groups / 1696 observations; focused
test passes (1/1, 5.83 s), including both controls' native/candidate declaration
mutation rejections. An initial negative selected a newly reviewed tab-control
row while invoking the panel proof; the test now selects the panel explicitly
and verifies controls separately. Raw/unrelated rows remain conserved.
Badge triage authenticated 52 alias pairs using the existing pointer identity
proof. Its native rules request radius tokens and transform-only transition
with a none override; candidate radius is 8px. Those requests must be preserved
separately from color omission, not rejected/erased as if absent. Eight border
groups / 208 observations remain to review. No canonical/export dependency edits.

Progress-host border omission review now covers both hosts' 40 captured cases /
16 groups / 160 observations. Native motion is exactly opacity 250ms; spinner
also captures transition:none !important. Neither requests border/color motion.
Candidate border/motion requests are absent and all three stages retain transparent
initial borders. This closes the local border exclusion question, not unequal
opacity behavior, settlement or generated progress paint. Existing custom-owner
review totals 55 groups / 1136 observations. Focused test passes (1/1, 5.79 s),
including rejection of transition-property:all and an appended border-color
transition. The latter negative control initially exposed a consumed-semicolon
gap in the new serializer check; a non-consuming terminator now rejects adjacent
declarations. No producer dependency edits or canonical classification changes.
Remaining border owners: badge alias and tab controls. Export 91866 is still live
in validation; poll the same handle, then perform the pending reconciliation.

Divider paint substitution is now bound across all 24 captured cases: native
solid 1px top border uses the Material outline token; candidate instead paints a
1px-high background with literal #cac4d0. The single top-color group / 24
observations is an authoring mismatch, consistent with the existing
`fixture-divider-replaces-paragraph-flow-with-coordinates` history finding.
Three unpainted sides remain a separately scoped initial-color divergence
(six groups / 72 observations); they do not erase the explicit top request.
The existing custom-owner review now covers 39 groups / 976 observations.
Focused test passes (1/1, 4.62 s), including background-mutation rejection and
raw/unrelated conservation. No new infrastructure, canonical update or renderer
change. Next border gaps are badge alias, tab controls and progress motion rules.

Table border reset now has full-state proof: 52 captured cases / eight groups /
208 color observations. The native `.mat-mdc-table` explicitly requests
`border: 0px` (four none styles/currentcolor colors plus border-image reset),
whereas candidate `.material-table` authors only `borderWidth: 0`. Exact captured
requests and all three local candidate stages establish an authoring mismatch,
not a visible paint defect or a reason to copy computed theme colors. Existing
custom-owner proof/test infrastructure now covers 32 groups / 880 observations;
focused test passes (1/1, 4.97 s overall), retaining raw/unrelated rows and
rejecting altered reset color or removed candidate width in addition to the
existing declaration/type mutations. No producer integration yet.
Export session 91866 progressed to validate-audit at elapsed 906.14 s; it remains
live. Do not restart. Full export/source/section reconciliation is still pending.

Prepared custom-host border review closes the omission question for 24 groups /
672 observations: icon-primary 80, slider-visual 312, tab-panel 280. Exact native
and candidate types, scalar/tree identity, all three candidate stages, complete
local rules and absent authored border/motion requests are verified for each
member. Native zero/none borders compute currentcolor; candidate host stages
contain transparent initial borders. This extends the existing initial-color
limitation to explicitly admitted custom/img hosts, not their generated children.
`node --test tests/material-parity/custom-owner-border-review.spec.mjs` passes
(1/1, 3.79 s overall). Raw/unrelated rows are conserved; all three owners reject
native border injection, candidate border injection and candidate type changes.
New proof files only; no running-export dependency or canonical classification
changed. Next border priorities: divider painted edge versus omitted sides,
table explicit reset, badge alias, tab controls and progress motion exclusions.

Border triage (accepted interaction snapshot, not new classifications): compact
authenticated queries find 79 unresolved color groups across ten owners, totaling
1904 observations. Smallest decisive first check used the hash-pinned original
capture and authenticated full-tree inventory for one light/desktop static case
per family (eight cases). This disproves treating all 79 as one omission cause:
divider explicitly requests a solid 1px top border with a theme color, while its
other three sides are zero/none; table explicitly resets all four colors to
currentcolor with zero/none widths/styles. Native icon, slider visual and tab
owners have no local border declarations in those samples; their candidate types
(img/custom plugin/button versus native hosts/spans) require owner-specific
admission rather than broadening the existing ordinary-element proof blindly.
Progress hosts also carry opacity transitions (spinner has a captured important
none override). Badge is a generated alias, not a direct native parity-ID match.
Next: prove complete state membership and candidate declaration exclusion for
the omission candidates using existing identity helpers; separately inspect the
divider's painted top edge and table reset requests. Sample triage does not prove
all-state omission, equal inputs, visible paint correctness, or a renderer cause.
The existing border proof and export dependencies were left unchanged.

Prepared overlay-origin review covers seven groups / 210 observations (tooltip
18, dialog 192). Existing scalar/type/ancestry and motion identity proofs are
reused, then origin/transform ownership is checked separately. The measured native
owners have no origin/reference-box requests; tooltip's center-top origin and
8px translation belong to ancestors. Candidate paths omit transform/origin/motion
requests. This is a computed/local owner boundary with unequal ancestor inputs,
not proof of misplacement, equal reference boxes or motion settlement.
`node --test tests/material-parity/overlay-origin-request-review.spec.mjs` passes
(1/1, 5.12 s), preserving raw/unrelated rows and rejecting candidate ancestor
origin injection or native measured-owner origin injection across all seven owners.
An initial test exposed absent synthetic-root style stages; the proof now verifies
that exact absence rather than inventing empty/computed styles. No producer
integration yet; these new files are outside the running export's dependency set.

Cold caret/position export is live in unified session **91866**, started from
88e7044 (producer integration 40980fe). Log:
`artifacts/material-parity/caret-position-export-40980fe.log`.
Build phase started after 0.94 s. Poll the same handle; do not restart or modify
fingerprinted producer dependencies while it runs. Expected only incomplete-audit
error: 573 unresolved groups. Then run `--caret-position` conservation, section
and source reconciliation, compact import/verify before accepting the output.

Next-batch replay is verified against the accepted cursor/pointer snapshot:
`applyCaretPositionReviews` composes existing caret, slider, grid and overlay
proofs; `validateCaretPositionReviews` checks exact serialized membership.
64 groups / 2441 observations (27 caret, 37 position) preserve all raw/unrelated
rows. Full original inventory order is retained. Missing members and fabricated
rendering equivalence are rejected in all ten attribution categories. Mutation
checks replay each category's exact original member after full-batch validation,
avoiding repeated whole-batch work without removing rejection coverage.
Six tests across component-motion-caret, slider/grid/overlay-position review specs
passed (35.31 s; combined replay 23.77 s). Producer integration is now implemented:
bound-case apply, serialized replay validation, unbound-attribution rejection and
11 added dependency fingerprints. Exact source restoration reproduces accepted
producer 348860a, including all earlier historical transitions. Combined focused
and transition suites pass 29/29 (37.07 s); producer syntax check also passes.
The existing canonical conservation checker now has `--caret-position`, pinned
to the accepted interaction package. It enforces ten exact category populations,
64 groups / 2441 observations, original-row digests, false equivalence flags,
raw-input conservation and the existing 48 control-receipt transition checks.
All 29 conservation tests pass (92.50 s), including forged expectations, missing
observations and unrelated changes. Export dry-run confirms all five evidence
paths. Next perform the milestone export/reconciliation. Canonical unresolved
count is still 637 (expected 573 only after acceptance). No renderer/fixture edits.

Cursor/pointer export completed (source 864a53f, 2362.05 s, exit 1 solely for
637 unresolved groups). Coverage remains 436 static / 1875 interaction cases,
8483 scalar differences / 389202 observations and 134 source findings.
New compressed package: 8635694f2f111b71b50ed25ce0de8947ecb16baa3aada405163b6a8be5339f49
(61470998 bytes); decoded SHA c6481d5bd32baf62366745b1ee89a6a305e302c1ff6875bc54ab96d0941072e3
(2160068166 bytes). **Accepted cursor/pointer audit checkpoint.** Conservation passed: exactly 42 groups /
1587 observations changed; all raw inputs and non-receipt control evidence remain
unchanged (one scalar receipt, 48 control receipts). Source reconciliation passed:
all 504 LF-normalized fingerprints match current files; ten added, three changed,
none removed. Coverage is identical; summary changes match the classifications.
Owner-caret and source-batch changes are only current producer/report receipts.
All-section validation passed: 79 sections, 72 unchanged, none added or removed.
The seven changed sections are discrepancies/summary, fingerprints, the owner-caret
and source-batch producer receipts, control typography receipts, and 48 line-box
producer-hash receipts only. Raw line-box measurements remain unchanged.
All reconciliation processes are complete. Outputs are retained as
`component-interaction-{conservation,metadata}-864a53f.log` and
`component-interaction-sections-864a53f.json`, plus
`component-interaction-linebox-receipts-864a53f.log`.
Compact import and verification passed: 8483 scalar rows, 134 source findings,
39904 controls, 389202 observations, 637 unresolved groups; 71403698 compact bytes.
Index SHA: d0446d1c61bec60527c34459da6a28e4af1699793c50b38fef93846627cd6aca.
Generation manifest is retained beside the immutable compressed evidence.
This accepts classifications, not rendering equivalence or final audit completion.
Next integrate prepared caret/position reviews as a coherent batch; continue the
remaining origin, border/current-color and typography/inheritance investigations.

Tooltip origin triage: exact matching of the pending scalar value selects 18
observations, not all 26 tooltip interactions (some lack a native measurement).
Authenticated inventory/alias replay shows the explicit `center top` origin is
on an ancestor, not the measured popup box; another ancestor requests
`translateY(8px)`. All 18 match. The existing origin-stage guard correctly leaves
these unresolved for explicit ancestor origin/reference-box context. Do not copy
the measured popup's pixel origin or treat this as a demonstrated misplacement
cause. Next inspect the equivalent candidate ancestry and transform-box ownership.

Prepared overlay-position review covers five groups / 141 observations: one
bottom-sheet wrapper group (25) explicitly substitutes fixed for native absolute;
two sheet right/bottom groups (50) and snackbar-surface/dialog-copy static groups
(66) compare computed native values with omitted candidate local declarations.
Original tree hashes, 89-field alias identity, three candidate stages and complete
owner rules are checked. The sheet's 25 missing scalar z-index-rule observations
remain explicit. `node --test tests/material-parity/overlay-position-request-review.spec.mjs`
passes (1/1, 3.55 s), with raw/unrelated conservation and request-injection negatives.
No containing-block equivalence or popup visibility cause is claimed. Tooltip's
remaining transform-origin row and six dialog origin rows still need box/transform
context; do not infer the snackbar's missing-output cause from its static scalar.
This batch is prepared only, not connected to the live exporter.

Prepared grid-offset review: 16 groups / 624 observations across 52 original cases.
Existing composition proof plus exact scalar/tree and three-stage identity checks
distinguish six authored top/left omission groups (208 observations) from ten
computed-versus-local inset groups (416). All original tree hashes authenticate;
native inline requests, active rules and potentially applicable candidate rules
are checked, including reset/logical-inset/motion exclusions. The native root has
no authored insets; absolute tiles request top=0 and left=0 / calc(50% + 0.5px).
Relative candidate grid items omit those requests. Computed right/bottom values
are not literal styles to copy. No additional renderer coordinate cause is proven.
`node --test tests/material-parity/grid-position-request-review.spec.mjs` passes
(1/1, 3.82 s), preserving all raw/unrelated rows and rejecting injected logical
insets, native bottom requests and scalar/tree disagreement for all three owners.
Next batch this with the prepared slider-position review after export reconciliation.
Neither review is wired into the producer yet; no canonical classifications changed.
The cursor/pointer export has completed; reconciliation is tracked above.

Caret next-batch applicability check during the cursor/pointer export:
the compact accepted-color index retains 27 caret-color groups / 896 observations.
Existing range evidence covers four groups / 156 observations in 78 cases.
The legacy `collectRangeCaretInputs()` rejects the changed border dependency;
the generated-node reader adapter is also a known source transition. A read-only
replay authenticated the parent capture and every selected tree/input, checked
all non-normalizer source fingerprints using existing
`verifyBorderEvidenceSourceTransition` and `restoreMappingReadAdapterSource`,
then reran `inspectRangeCaretInput` and exactly matched all 156 saved reviews
(3.63 s). No saved survey or canonical classification was changed. This proves
the retained range inspection remains reproducible, not computed caret or drag
equivalence. The existing range collector now authenticates both transitions,
executes pinned historical/current normalization and checks unchanged caret values.
Its check compares every saved field against the immutable `a6c98bd` survey,
allowing only the three verified current source receipts to advance in memory.
`node scripts/audit-material-range-caret-inputs.mjs --check` passes (8.30 s),
as does the existing `pending range` focused test (6.87 s): 18 negative,
six changed-evidence and 14 conservation controls. No capture or survey rewrite.
Prepared range review now uses existing `applyModalBoxReview`: four groups / 156
observations classified as `reviewed-range-caret-observation-stage`, with exact
raw-row and unrelated-finding conservation. The existing range check passes
serialized replay and rejects missing rows, false rendering equivalence and a
fabricated synthetic-root type. The focused `pending range` test passes (10.55 s).
This is prepared only, not connected to the running cursor/pointer producer;
canonical classifications remain unresolved until the next coherent caret batch.
Prepared chip/tab motion-caret review now covers ten groups / 362 observations
(152 chips, 210 tabs). Original authenticated trees show reference motion requests
through owner ancestry and no candidate caret/reset/motion requests in authoring
or three local stages. Seven request signatures include durations alone, explicit
color targets, competing `none` rules and unresolved variable-based declarations.
`applyMotionCaretReviews` in the existing motion-context script records unequal
motion input as `reviewed-motion-caret-request-omission`; it does not claim motion
caused the scalar caret difference or that computed caret/rendering is equivalent.
`node --test tests/material-parity/component-motion-caret-review.spec.mjs` passes
(10.50 s), including exact raw/unrelated-row conservation, full serialized replay,
missing-row/false-equivalence rejection and candidate-request negative controls.
No fresh-motion capture is treated as historical/current proof: this review uses
the original 362 observation boundaries directly. Not yet wired into the producer.
Prepared overlay-caret review covers the remaining 13 groups / 378 observations:
seven dialog/tooltip groups (210) have unequal captured motion requests; six
sheet/snackbar groups (168) have computed-versus-local observation boundaries.
The two wrapper groups retain all 59 scalar/tree z-index rule-gap observations.
Existing alias checks authenticate original owners, 89 scalar properties and
candidate stages; original paths, raw inline declarations and unknown external
inheritance remain explicit. No fresh external-context evidence is retroactively
treated as historical truth. Both tests in `component-motion-caret-review.spec.mjs`
pass (15.82 s), preserving raw rows and rejecting candidate caret injections.
All 27 caret groups / 896 observations now have prepared reviews and exact
combined replay validation, not accepted canonical classifications.
`applyComponentCaretReviews` composes the three existing apply functions;
`validateComponentCaretReviews` authenticates complete serialized membership.
The three focused tests pass (56.98 s), including raw/unrelated-row conservation
and dropped-row/false-equivalence rejection in each of four attribution categories.
Next integrate this coherent batch after the running cursor/pointer export is
reconciled. Keep these distinct from editable-input bugs. The subsequent compact
coverage query identifies 145 unresolved positioning/transform groups across 26
families; prioritize slider, grid and overlay owner/coordinate questions before
the remaining border/current-color and typography/inheritance groups.

Prepared slider-position review covers 16 groups / 780 observations across all
78 slider cases, including disabled states. Three groups are explicit native
edge/relative-position requests replaced or omitted by candidate authoring;
13 are computed native offsets (`auto` right, unauthored bottom/insets) versus
candidate local omission. Original full scalar/three-stage owner correspondence,
active rules and inline requests are retained. No sampled native pixel offsets
are proposed as fixture fixes; swapped/jerky dragging remains a separate causal
question. `node --test tests/material-parity/slider-position-request-review.spec.mjs`
passes (3.45 s), checking raw/unrelated-row conservation and rejecting inserted
native/candidate offset requests. Prepared only; no producer integration yet.

Cursor/pointer integration guard is ready: the existing canonical conservation
checker now supports `--component-interaction`, pinned to the accepted color
generation below. It independently constrains 42 groups / 1,587 observations,
raw inputs, classification scope, false-equivalence flags and the 48 control
producer receipts. `node --test tests/material-parity/position-canonical-conservation.spec.mjs`
passed 28/28 in 88.99 s, including joint-forgery and missing-evidence negatives.
The current-ancestry launcher dry run supplies all five required inputs.
Next run the cold export, then this conservation check, source/section
reconciliation and compact import verification. Expected unresolved count is
637, not an accepted result yet; rendering defects remain unfixed by this audit.

Accepted color checkpoint: export from `e5eb55c` completed in **2,377.28 s**. Its only reported error
is **679 unresolved groups**; all 436 static / 1,875 interaction cases, 8,483
scalar groups / 389,202 observations and 134 source findings remain.
Conservation passed: exactly **36 groups / 922 observations**, one scalar
producer receipt and 48 control receipts changed; raw inputs and unrelated
control evidence are unchanged. Section reconciliation passed: 79 sections,
72 unchanged, seven accounted-for changes, none added/removed. All **494 source
fingerprints** match current files (three added, three changed, none removed).
Metadata changes are expected producer receipts and classification counts.
Compressed generation: `7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592`;
decoded SHA: `42b34a35e7fe189255828ec976fd519af7c3d5e752fd6960956f7e77a43b88e6`.
Evidence logs: `component-color-{export,conservation,metadata}-e5eb55c.log` and
`component-color-sections-e5eb55c.json` under `artifacts/material-parity/`.
Compact import and verification passed: 39,904 control records and 71,327,029
compact bytes. Index SHA:
`b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4`.
The manifest is retained beside the indexed compressed evidence; no decoded
2 GB file was written. All export/reconciliation/import jobs are complete.
Logs: `component-color-import-e5eb55c.log` and
`component-color-import-verify-e5eb55c.log`. The previous paint index remains
pinned by standalone review tests until their batch is integrated.

Next: continue the separately prepared cursor/pointer batch. The reconciled
color checkpoint has **679 unresolved
non-color/background groups**. Prioritize
cursor/pointer/caret (69 groups), then positioning/overlay structure, followed by
border/current-color and typography/inheritance applicability. Existing public
cursor and caret proofs must be reused only after owner/request correspondence.
Read-only replay matched all **19 cursor groups / 763 observations**: 18 groups
are native `default` versus candidate `pointer`; the 70 slider-visual observations
are the reverse. Candidate own-rule inspection separates explicit pointer
requests from two dialog actions with no local request, four label-local omissions and the
plugin range visual. This is routing evidence, not a diagnosis of actual hover
cursor behavior. Native rules and candidate ancestry still require binding.

Cursor follow-up during the color export: authenticated original report SHA
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`
and 1,070 referenced trees, replayed normalized membership against compact generation
`5998d72bd0310ff4ddd8d3a44954fa5ade6655abb506f2bb85baa4935c3792d0`;
all 19 groups / 763 observations matched. Native owner-to-root requests separate:
disabled button explicit default (60), disabled checkbox owner/label default
(8 each), and slider host explicit pointer (70). Other button paths have no
captured author cursor declaration; radio labels split 60 ordinary / 8 disabled
observations each. Candidate label paths identify explicit pointer requests on
`#checkbox-primary`, `.radio-option`, and `#slide-toggle-primary`, with pointer
in all three captured label stages. Dialog cancel/save (24/32) have no captured
cursor request anywhere on their candidate path, but resolve pointer; slider
visual has no request and resolves default. These are source-routing observations,
not yet canonical classifications or actual hovered-canvas cursor proof.

Existing public cursor capture **cannot currently be reused as current browser
evidence**: `validateCursorEvidence` rejects installed
`examples/material-showcase/node_modules/@angular/common/fesm2022/common.mjs`
(recorded SHA `ecd9f39a4e63c12b088f299bc9966b113ec88949b3de4311c644ab4686a1aad9`,
current `0ec92260d1ddb26d9794a603f6ec3bb9cc662e5de5c32a48c2a603909298dd40`).
Independent `cursorSourceProof()` still passes all four source/package method
projections and eight cursor/text-owner combinations: button/label defaults are
pointer, div default, and owned text changes default/auto to text. That narrower
source proof is not a refreshed browser capture or proof of original Material
hit behavior. Next bind the exact authored/default populations to existing review
infrastructure; refresh the public capture only for claims requiring current
browser behavior. Do not reinterpret absent requests as proven default provenance.

Fresh public cursor evidence now closes that dependency-freshness gap, without
overwriting the old capture. Command:
`node scripts/audit-public-cursor-defaults.mjs --output=artifacts/material-parity/public-cursor-defaults-4cf733e`.
Chrome 153.0.8010.53, Angular 20.3.31, Babylon 8.56.2, AstylarUI 0.2.0:
36 cases / 180 action boundaries / 72 screenshots, DPR 1/2 and translated/untranslated
surfaces; zero runtime errors. Exit 1 preserves 148 real differences, not a harness
failure or parity pass. Existing `validateCursorEvidence(report, file =>
readFileSync('artifacts/material-parity/public-cursor-defaults-4cf733e/' + file))`
passes served assets, every bundle dependency, screenshots, observations and
package/source projections. The returned helper's legacy `artifactRoot` string is
not the new path; use the explicit path above when citing this replay.
Report SHA `4773eb64cb37931bfb53e2c3852b7b439eac366e2da51aaf2eb22f0c7133b9a8`;
provenance SHA `6b2da713b9b1cd1f11f8094a39c196cf4bd8cf00344268e60875ce8a7fa8de38`.
All 148 difference signatures match the historical capture: omitted button/label
defaults differ before layout, whereas explicit label default remains correct in
resolved style and becomes text at owned-text pointer selection (12 action-boundary
differences). Explicit button default/pointer and div inheritance controls agree.
This confirms the existing public root cause under current dependencies, not that
every remaining Material cursor discrepancy shares it. Retain this 20,510,567-byte
failed-case package and log; no new audit framework or fixture changes were needed.

Prepared cursor review (not yet canonical): existing `applyModalBoxReview` supports
All 19 cursor groups / 763 observations through `tests/material-parity/component-cursor-request-review.mjs`.
Three groups / 138 observations bind explicit native requests (disabled button 60,
disabled checkbox 8, slider host 70). Ten button-owner groups / 417 observations
bind native omitted author requests/default computed cursor against explicit
candidate pointer declarations (`.material-button`, `.text-button`, `.toolbar-action`).
Exact owners, ancestor paths and all three captured stages prove unequal authoring;
they do not prove that removing the request fixes output, since core defaults differ.
Two dialog-action groups / 56 observations bind omitted author requests on both
complete captured paths, native default versus candidate pointer at all three
stages, and the refreshed public button-default proof. Existing asset/dependency
validation and package/source projections run once for that evidence. They are
classified as the documented incomplete-UA-default policy, not equal rendering
or proven historical Material hover causation. Four inherited-label groups / 152
observations bind native span/label/default paths versus candidate span/div/explicit
pointer paths. Native disabled rules remain recorded; candidate parent and span
agree at all three captured stages. This is different inherited input/structure,
not a broken-inheritance claim. Actual hovered-canvas attribution remains separate.
The focused spec passes in 28.84 s, preserves raw values/unrelated rows,
and rejects missing native requests, added native/own/ancestor requests, stage
changes and lost cases. Dialog classification also rejects missing public proof;
direct positive replay precedes every mutation so missing prerequisites cannot
make negative controls pass accidentally. No stale public browser evidence is used.
Label controls additionally reject altered native parent types and candidate parent
cursor stages. The prepared partition is 17 authoring groups / 707 observations
and two default-policy groups / 56 observations; none claims rendering equivalence.
No producer integration or source-fingerprint changes while color export is live.
Combined cursor validator now independently replays original rows, owners and fresh
default evidence; it rejects a dropped review and a forged rendering-equivalence
claim. The expanded focused test passed in 43.66 s. Next integrate this with the
pointer-events/caret batch after the running color export is reconciled; accepted
unresolved count remains 715.

Prepared pointer review is complete: **23 groups / 824 observations**, all
candidate scalar fields omitted rather than synthesized as auto. The existing
`component-pointer-events-review.mjs` and its focused spec retain exact raw rows,
owner/ancestor correspondence and all three local stages. Current breakdown:

- Sheet wrapper: 1 group / 25 observations, harness owner mismatch. Native
  non-picking wrapper differs from its explicitly picking sibling backdrop;
  candidate combines those owners. Do not copy none onto that combined overlay.
- Badge: 1 / 52, authored none request omitted on the corresponding badge span.
- Disabled controls: 5 / 92, explicit native none inherited through checkbox/radio
  labels versus omitted candidate policy. Disabled event-handler guards do not
  establish equivalent CSS hit suppression.
- Slider held sibling: 1 / 8, native start sibling suppressed while end remains
  auto; candidate peer-state request omitted. Existing source-bound survey covers
  all 78 cases / 156 owners. Drag causality remains unproven.
- Chips and active tab panel: 3 / 222, no pointer requests on either captured
  ancestry; computed native auto versus omitted candidate local fields is a
  harness stage boundary, not evidence of a missing authored auto value.
- Overlay descendants: 10 / 285, native none-container/auto-pane policy omitted
  from candidate replacement composition. Classify structural/policy authoring
  substitution, not request-free defaults or a demonstrated modal-scope cause.
- Tab headers: 2 / 140, existing structural proof identifies native text labels
  versus candidate controls. Native content none is overridden by auto; those
  ancestor rules remain in evidence. Harness owner/stage boundary, not a faulty
  inheritance diagnosis or proof of equivalent hit behavior.

Command: `node --test tests/material-parity/component-pointer-events-review.spec.mjs`.
Latest result: **1/1 passed in 18.91 s**, proving exact 23-group/824-observation
coverage with no duplicate owners, raw/unrelated-row conservation and negative
controls for changed requests, peer state, ancestors and measurement owners.
The separate slider survey last passed 2/2 with exact original-source replay.
Earlier test-setup failures (non-style rules lacking declarations and duplicate
pane selectors) were corrected to mutate the exact retained owning rule; no
assertion was weakened.

Disabled source context remains separate: fixture `handleClick` guards activation;
core button handlers return when disabled, but creation makes a pickable mesh and
`setButtonDisabled` changes state rather than pickability. Five source/package
method projections matched (handler SHA
`6ca95b38753d8fe3a5f565ece6f3d5f4ff883b483034057bec47b8186e8036a9`;
creation `8648471a17f811e9b07d319a68f48606041952a92b08907872f1aac1ee27e2c8`).
The separate CSS path in `element-creation.service.ts:400` disables picking for
resolved none. No candidate computed default, actual picked mesh, event delivery,
modal scope/dismissal cause, swapped-drag cause or rendering equivalence is
claimed by these scalar reviews.

Combined replay validation now passes: **42 groups / 1,587 observations** (19
cursor, 23 pointer). The pointer validator rebuilds expectations from original
cases/inventory rather than trusting proposed classifications; JSON-persisted
reviews pass, while a dropped finding or forged rendering-equivalence claim is
rejected. The composed batch preserves raw values and unrelated rows.
Command: `node --test tests/material-parity/component-pointer-events-review.spec.mjs tests/material-parity/component-cursor-request-review.spec.mjs`;
**2/2 passed in 43.89 s**. This is a focused replay, not canonical acceptance.

Producer integration is wired: bound original cases feed both reviews, validation
replays from original rows, unbound attributions fail, and ten review/source/survey
files enter source fingerprints. Exact restoration reproduces the complete
accepted color producer (SHA
`ab0fc9df52cd03fba85791508828c8014d18a91952960186f13fa40d8e1b5365`),
rejecting missing hooks/guards or unrelated edits. Historical restoration tests
remain intact. Combined cursor, pointer and producer-transition tests pass
**24/24 in 45.38 s**. The named export dry run supplies all five required inputs.

Next: extend the existing conservation checker for this 42-group/1,587-observation
batch, then cold-export and reconcile sources/sections before compact import. These
prepared classifications are **not yet included** in the accepted 679 count.
Caret and the remaining positioning/typography/border populations stay open.
No renderer/fixture changes or new browser captures were made.

Color producer/validator integration is now wired and focused-verified against
the accepted paint compact snapshot. Validation starts from original rows and
fresh sort/sidenav retained ancestry; unbound color attributions are rejected.
The module, spec and public range-color reduction enter source fingerprints.
Exact source restoration authenticates the complete `7121d16` producer and rejects
removed proof/guard fragments or unrelated edits. Color plus producer-transition
suites passed **22/22 in 34.84 s**. The existing conservation command now supports
`--component-color`, pinned to the accepted paint predecessor and original capture.
It requires exactly 36 groups / 922 observations, preserves raw inputs and unrelated
controls, and rejects false equivalence claims even when expected metadata is forged.
Combined color replay and conservation tests passed **28/28 in 92.66 s**; the named
export dry run confirms all five evidence inputs. Next run the cold batched export,
then conservation, section/source reconciliation and compact import verification.
The full canonical validation path has not yet run with this hook; canonical
unresolved remains **715**. No renderer or comparison fixture changes.

### Prepared color work and preceding checkpoint evidence

Latest bounded investigation: the public range-color reduction now reproduces
the default-selection difference independently of Material authoring. Command:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/range-color-default-audit.spec.ts`.
Chrome Headless 153 / DPR 1 / 320×180, installed AstylarUI 0.2.0: **2 failed,
2 passed**. Both omitted-color cases resolve to `#2c3e50` in candidate normal
and effective stages; native enabled color is `rgb(16,16,16)` and disabled is
`rgb(197,197,197)`. Both explicit `#123456` cases agree. Shared style declarations,
unchanged authored inputs, empty renderer diagnostics and disposal assertions
separate this default-policy gap from a general explicit-color conversion issue.
The literal is the generic input default at `src/app/config/browser-defaults.ts:297`.
These are intentionally retained equality failures, not a passing parity claim.
They do not establish visible thumb paint, drag targeting, or raster equivalence.
The newer browser reproduces the historical sampled colors but does not replace
the Chrome 152 original capture or authenticate all historical owners by itself.
Failure log: `artifacts/material-parity/range-color-default-public-23e361f.log`,
SHA-256 `d8530e48b61ff0966a64cc88efd030de80131f3b510e226465342f54298eb4ec`.
Angular CLI build passed in 35.170 s, prerendering two routes; log:
`artifacts/material-parity/range-color-build-23e361f.log`. Its successful output
was removed by `withAuditScratch`. Next bind this proof to the four original
range-color groups / 156 observations with the existing review infrastructure;
do not infer causation for the opacity-zero input's visible Material thumb.
The original-case join now passes for **4 groups / 156 observations**, using
`component-color-request-review.mjs` and the existing modal review mechanism.
It authenticates the public failure log, owner identity, disabled state, absent
color/reset/motion requests, all three captured candidate stages and zero
opacity. Conflicting explicit color, changed disabled state and visible-input
mutations are rejected. The expanded focused test passed **1/1 in 20.32 s**,
preserving all raw fields across **22 prepared groups / 569 observations**.
Classification is the documented incomplete browser-UA-default limitation;
the evidence does not excuse unequal output or authorize fixture compensation.
The next color gaps are **14 groups / 353 observations**: overlay measurement
owners (4/123), selected chip hosts (4/120), and motion boundaries (6/110).
Prioritize overlay owner ancestry because of the repeatedly reported popup
failures, while keeping color evidence separate from position/visibility proof.
The paint export remains live and unreconciled; these standalone preparations
are outside its dependency graph and do not change canonical counts.

Overlay color-owner investigation now prepares **4 groups / 123 observations**
in the same review module. Existing structural alias mappings authenticate all
89 reference scalar fields and candidate stages. Native dialog panel/actions and
snackbar/sheet wrappers compute black along their detached overlay-root ancestry;
candidate overlays remain beneath the themed page. The dialog panel explicitly
requests `#1d1b20` even in dark cases, while the other measured container-local
colors remain omitted. Panel color is an authoring substitution; the other three
are computed/local measurement-boundary findings, not inferred candidate ink.
The native wrapper's missing scalar z-index rule is retained, as are native
dialog motion rules. No animation-settlement, label-color, position, visibility
or rendering-equivalence claim is made. Focused testing first caught a missing
review-helper owner field, then an overly broad light-page-color assumption;
the join now preserves the dark page's `#e6e1e5` independently of panel ink.
The expanded test passed **1/1 in 22.49 s** with conflicting-color and broken-root
negative controls and unchanged raw rows. Total prepared standalone color work:
**26 groups / 692 observations**. Remaining color gaps: **10 groups / 230
observations**, selected chip hosts (4/120) and motion-boundary cases (6/110).
These findings remain pending integration; the running paint export is unchanged.

Selected chip host color is now bound across **4 groups / 120 observations**.
The native selected `mat-chip-option` inherits frame ink, including the separate
dark override; candidate `.chip.selected` replaces its theme ink with fixed
`#4b4357` in every captured stage. Owner selection flags, complete scalar/tree
agreement and the ancestry requests are checked. This is host authoring, not a
claim about the inner label's Material token, text raster or interaction effect.
Native motion declarations stay in the evidence without a settlement claim.
The first focused run rejected an assumed single frame declaration in dark mode;
the proof now preserves and checks both base and dark requests. The expanded
test passed **1/1 in 23.83 s**, including changed selection and inserted native
color rejection, preserving raw rows. Prepared standalone color coverage is
**30 groups / 812 observations**; only **6 groups / 110 observations** remain in
the color routing batch (tab panel and progress motion boundaries). Export and
final acceptance remain pending; no renderer or fixture changes were made.

The last **6 color groups / 110 observations** (tab-panel, progress bar and
spinner) now have computed/local boundary proofs in the same module. The native
sampled color follows captured frame ancestry; candidate local color stays absent
through its ancestry until `#page` requests the matching theme ink. Existing tab
alias mapping checks the actual active-panel owner. The shared frame trace now
also serves chip hosts, avoiding another independent ancestry implementation.
All native motion rules are retained, including variable shorthand's empty CSSOM
longhands, height/opacity transitions and no-op overrides. They are not discarded
to make the earlier conservative inheritance proof pass: this new attribution
explicitly does **not** establish animation settlement or candidate computed ink.
The focused spec passed **1/1 in 27.71 s**, checking all **36 prepared groups /
922 observations**, exact raw-row preservation and conflicting owner requests.
The remaining color routing batch is fully prepared, not canonical. Next integrate
the combined replay/independent validation and source provenance only after the
running paint export finishes and its reconciliation is accepted. The overall
audit still has unresolved non-color coverage and final browser gates.

Combined color replay and validation now pass in the existing module, using the
same replay-from-original pattern as paint reviews. All **36 groups / 922
observations** apply together; raw fields and unrelated rows remain unchanged.
Validation rejects a removed reviewed row and a fabricated rendering-equivalence
claim. The expanded focused spec passed **1/1 in 47.34 s**. This prepares the
producer hook without editing its running dependency graph; independent source
collection and fingerprint integration are still required at that hook.
The `f9ab31c` export has passed evidence-session verification (zero invalidations,
1,205 files / 89,151,875 bytes) and reached canonical encoding. It remains live;
do not import or approve its in-progress files. Reconciliation remains next.

Accepted grid/height export: complete-input cold export from `890de9f`
finished in **2,354.82 seconds**, with 436/436 static and 1,875/1,875 interaction
cases, 8,483 scalar groups / 389,202 observations, 134 source findings and
**787 unresolved groups**. Its sole reported error is remaining unattributed
groups. Evidence-session verification invalidated zero dependencies (1,205 files,
89,151,875 bytes). New compressed generation:
`04ec615b0e97cdc75f44b817efca421d24a79cb04d7bc1f2f22969b99a4c4240`.
`check-material-position-canonical-conservation.mjs --grid-height` passed:
exactly 103 groups / 4,322 observations plus one scalar and 48 control producer
receipts changed; all raw inputs and unrelated control evidence are conserved.
Section reconciliation passed: 79 sections, 72 unchanged, none added/removed.
The seven changed sections are discrepancies, sourceFingerprints, summary,
controlTypography, controlLineBoxes, ownerCaretInputs and reviewedSourceBatchInputs.
All 486 current source fingerprints match; four grid/height helper/spec files
were added, three producer/transition files changed and none removed. Remaining
metadata changes are expected producer receipts and counts (authoring +16,
harness -16, unresolved 890 → 787). Decoded SHA-256:
`e3ea396e3ec4ab560596899657eddb63a221ede3770fe8b1801e05499b38484b`.
Compact import and verification passed: 134 source findings, 39,904 control
records, 71,253,343 compact bytes. Index SHA-256:
`7698638b57da8d8c8f4bf50902886f11c3d3304e45078771917b804c6c30a075`.
The standalone manifest is retained beside the indexed compressed evidence.
No decoded 2 GB file was written; all reconciliation/import jobs are complete. Logs use the
`grid-height-{export,conservation,sections,metadata}-890de9f` prefix under
`artifacts/material-parity/` (sections is JSON; others are logs).

Previous accepted box-sizing generation (retained predecessor evidence):
`d25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a`.
Complete-input cold export from `6a23c58` finished in **2,512.22 seconds**.
Exit 1 reports **890 unresolved groups**, not a validation error. Coverage remains
436/436 static and 1,875/1,875 interaction cases; all 8,483 scalar groups and
389,202 observations remain. Evidence-session verification invalidated zero
dependencies (1,205 files / 89,151,875 bytes).

`check-material-position-canonical-conservation.mjs --box-sizing` passed:
exactly 49 groups / 2,657 observations, one scalar producer receipt and 48 control
receipts changed; all raw inputs and unrelated evidence are conserved.
`material-audit-section-digests.mjs` authenticated both packages: 79 sections,
72 unchanged, none added/removed. All seven changed sections are reconciled:
discrepancies, sourceFingerprints, summary, controlTypography, controlLineBoxes,
ownerCaretInputs and reviewedSourceBatchInputs. All **482** current source hashes
match; two helper/spec files were added, three producer/transition files changed,
and none removed. Other changes are the expected producer receipts and counts
(authoring +10, harness -10, unresolved 939 → 890).

Evidence logs: `artifacts/material-parity/box-sizing-export-6a23c58.log`,
`box-sizing-conservation-6a23c58.log`, `box-sizing-sections-6a23c58.json`,
`box-sizing-metadata-6a23c58.log`, `box-sizing-source-hashes-6a23c58.log` in that
same directory. Compact import and verification passed: 134 source findings,
39,904 control records, 71,058,664 compact bytes. Index SHA-256:
`c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad`.
Decoded SHA-256:
`be773eb197ae0906de595ab97ac332ef09af59af2f8b4c929c8f60abb933bdc8`.
The standalone manifest is retained beside the compressed indexed evidence.
No decoded 2 GB file was written. All checkpoint reconciliation jobs are complete.

**Next:** integrate the prepared paint proofs before starting new investigations.
The combined paint replay now passes against the accepted grid/height compact
snapshot: exactly **72 groups / 618 observations** change review metadata, while
all raw fields and unrelated rows remain unchanged. Fresh source collectors match
the retained button and disabled-label evidence; the public range reduction log
is hash-checked. Missing reviewed rows and fabricated rendering-equivalence claims
are rejected. `node --test tests/material-parity/control-state-paint-review.spec.mjs`
passed **2/2 in 36.85 s**. This is a focused pre-integration check, not a canonical
export or a reduction in the 787 canonical unresolved groups. Next bind this replay
to the producer and independent validator, authenticate the producer transition,
and extend the existing conservation command before the next batched export.
The producer and independent validation path are now wired: source collectors
replay afresh, stepper retained proofs are recomputed from original cases, unbound
paint attributions are rejected, and five new evidence/test files enter source
fingerprinting. Exact producer restoration authenticates the complete `e7093a8`
predecessor and rejects deleted guards or unrelated edits. Combined paint and
producer-transition focused suites passed **22/22 in 38.40 s**. These tests do not
yet prove the full canonical validation path: the existing conservation command
still needs its paint mode, followed by the batched export and reconciliation.
The existing conservation command now supports `--paint`, pinned to the accepted
grid/height predecessor. It requires all 12 paint populations (72 groups / 618
observations), exact raw-row conservation, original-row receipts and unchanged
control evidence except authenticated producer receipts. Actual original-case
replay matches that population table. Paint plus conservation suites passed
**28/28 in 88.46 s**, including joint expected/result forgery and unrelated-record
mutations. The complete-input export launcher dry run passed. Next run the cold
batched export, then `check-material-position-canonical-conservation.mjs --paint`,
section/source-fingerprint reconciliation and compact import/verification. Do not
accept a new snapshot until these checks complete; canonical unresolved remains 787.

While the `f9ab31c` cold export runs (`paint-export-f9ab31c.log`), read-only
original-case replay resolved the next two color-owner questions. The source
capture SHA is the pinned `b07ef154...`, inventory errors are empty, and exact
compact-row membership/order matches **15 sort** and **62 sidenav** observations.
For every sort case, the reference measured header is in the already-proved
frame-inheritance chain, while the candidate measured `.sort-header` explicitly
requests `#000000`; measured and normal owner colors are black. The existing
sort-label proof concerns its immediate `.sort-trigger`, not this header, so the
scalar join must authenticate the header's own declaration separately.
For every sidenav case, the reference measured container is in the existing
content-token chain and the candidate is exactly the content proof's parent.
The container's measured/normal local color is omitted with no measured authored
color rule; the child retains `rgba(29,27,32,1)`. Do not use that child value as
the container's local/computed color. Next bind owner declarations and all three
candidate stages with negative controls, retaining the existing label findings.
These are applicability observations, not newly accepted classifications or
proof of core color conversion. No source dependency was edited during export.

Remaining color routing is now explicit: **36 groups / 922 observations** after
the ten prepared color groups. Read-only original-tree checks authenticated each
loaded tree, matched group populations, resolved owners with existing ID/template/
alias mappings, and compared all three captured candidate stages to scalar inputs.
The checks identify the next decisive proof; they do not classify these groups:

| Owners | Groups / observations | Next proof boundary |
| --- | --- | --- |
| Sort, sidenav container | 2 / 77 | Bind the owner distinctions recorded above |
| Toolbar title, enabled radio labels, enabled expansion title | 8 / 184 | Native component tokens versus candidate ancestor literals; keep omitted leaf color separate |
| Icon, paginator container/range/size | 8 / 152 | Native token/fallback declarations versus omitted candidate local color; do not invent resolved candidate color |
| Tab panel, progress bar/spinner | 6 / 110 | Preserve transition declarations and computed/local distinction; observed targets are height/opacity/none, not proof of full animation settlement |
| Dialog panel/actions, snackbar and sheet overlay | 4 / 123 | Overlay container ancestry/measurement owners, not title or action-label ink |
| Selected chip hosts | 4 / 120 | Candidate `.chip.selected` fixed `#4b4357` versus native host inheritance; label token proofs do not establish host equivalence |
| Range inputs | 4 / 156 | Generic input default ink versus native enabled/disabled defaults, separately from visible thumb paint |

For all 156 range owners, original native ink is `rgb(16,16,16)` when enabled
and `rgb(197,197,197)` when disabled; all candidate stages retain `#2c3e50`.
No applicable captured own color/reset rules were found, and both input layers
have opacity zero. The literal matches `browser-defaults.ts`'s generic input
entry. Existing public background/border reductions do **not** assert ink parity;
reuse their minimal input setup for a color assertion rather than claiming that
adjacent passing checks prove this discrepancy. The existing conservative
root-inheritance proof remains unchanged; no transition exclusions were relaxed.

The sort/sidenav applicability gap now has a focused executable join in
`component-color-request-review.mjs`, reusing `applyModalBoxReview`, the existing
selector guard and freshly replayed retained typography. It prepares **2 groups /
77 observations**: sort header black-ink substitution and sidenav container token
omission. All raw fields remain unchanged; the 62 absent sidenav local colors
remain absent. The focused spec passed **1/1 in 15.28 s**, including missing
ancestry, conflicting candidate rules, altered native declarations, invented
container color and incomplete population rejection. This module is deliberately
not imported by the producer while the paint export is running; it adds no changes
to that export's dependency graph or accepted counts. Once integrated separately,
the remaining prepared-color gap is 34 groups / 845 observations.
The same module now prepares the **8 enabled toolbar/radio/expansion groups /
184 observations** as computed/local measurement-boundary findings. Each native
token path ends at its recorded component declaration; the candidate leaf omits
local color and its ancestor explicitly requests the same normalized color in
all three stages. Neither candidate computed ink nor token-semantic/rendering
equivalence is inferred. Conflicting color declarations and color-transition
mutations reject the proof. The initial test exposed 39 matches for a 30-case
interaction group: equal-valued, already-reviewed static cases were outside that
group. Membership now uses the recorded states and still enforces exact counts
and ordered case IDs. The expanded focused spec passed **1/1 in 16.57 s**, covering
all **10 newly prepared groups / 261 observations** and preserving raw fields.
The remaining color gap beyond these preparations is **26 groups / 661
observations**. This module remains outside the live export dependency graph;
canonical counts and the pending paint batch are unchanged.
Icon and paginator now reuse that same token/ancestor boundary proof: **8 more
groups / 152 observations**, with native icon fallback or paginator component
tokens retained explicitly and candidate inheritance traced to `#page`. Every
candidate leaf stays locally omitted; the ancestor's three captured stages agree
with the native sampled color. This is not proof that replacing a token with a
literal preserves its semantics. The expanded focused spec passed **1/1 in
21.06 s**, covering **18 prepared groups / 413 observations** with the existing
raw-field and negative controls. Remaining color investigation: **18 groups /
509 observations** (motion boundaries, overlay containers, selected chip hosts
and range defaults). No additional exporter dependency or canonical update was
introduced while the cold run is live.
Prepared coverage includes 62 background groups / 450 observations and ten color
groups / 168 observations. The remaining 36 color groups need applicability work;
the existing retained-label proofs must not be generalized to container owners.
The 787 unresolved canonical groups and final
enforced browser gates still prevent audit completion. No renderer or fixture
changes were made, and this checkpoint does not establish rendering equivalence.

### Prepared work and prior checkpoint history

September 28 stepper color join prepares another **2 groups / 136 observations**
using the existing retained typography classifier and original source capture.
Every case, owner ID, precise native color, three omitted candidate local stages
and state membership matches; native wrapper token ancestry and retained page
ink remain separate from local declarations. The existing control-paint spec
passed **2/2 in 24.59 s**, including missing retained evidence, invented candidate
color and raw-row conservation. No new browser run or core diagnosis was added.
Prepared color coverage is now **10/46 groups / 168 observations**; 36 groups /
922 observations remain. A read-only census found 15 existing sort-label color
proofs but did not promote the container scalar: label-to-container correspondence
still requires binding. Existing chip label-ink evidence covers only 32 enabled,
unselected labels and must not be generalized to selected/disabled host colors.
The grid/height exporter remains live; canonical counts are unchanged.

September 28 disabled-label color preparation: fresh replay of
`collectDisabledLabelColorStages()` exactly matches the retained
`docs/material-disabled-label-color-stages.json` and all eight current unresolved
checkbox/radio/expansion disabled color groups (**32 observations**, 24 cases).
The existing control-paint module now joins those proofs with exact values,
ordered membership and row receipts. It preserves the **24 omitted local colors**
instead of substituting retained/inherited values; the prior authoring diagnosis
and local/computed distinction remain separate. No root-cause reinvestigation or
browser recapture was needed. The expanded focused file passed **2/2 in 23.17 s**,
including lost observations, invented local color, fabricated rendering parity
and unchanged raw-row checks. This prepares 8/46 remaining color groups; 38 groups
/ 1,058 observations still need existing-proof applicability review. Background
preparation remains 62/62 groups / 450 observations. None is canonical yet;
grid/height export PID 5300 remains live and reconciliation is still first in
the integration queue.

September 28 background classification preparation is now complete for the
remaining **62 groups / 450 observations**: 54/397 in the existing control-state
paint join and 8/53 overlay triggers. The two disabled-range groups now bind all
16 original owners to the public reduction committed in `93cbe54`. The join
checks disabled input identity, absent background/reset/motion requests, all
three candidate stages, matching scalar/tree values and zero input opacity.
It preserves unequal overall inputs and explicitly denies visible-thumb/raster
causation. Classification follows the existing documented UA-default limitation
(`docs/compatibility/html-css.md`, complete browser UA defaults), not an assertion
that same-input rendering is correct. The owner is core default selection and
compatibility policy, not showcase styling or plugin paint.
`node --test tests/material-parity/control-state-paint-review.spec.mjs` passed
1/1 in 21.33 seconds, including altered disabled state, authored background,
opacity and the existing raw-evidence/membership negatives. The reduction log
hash is authenticated by this check. No new framework or browser run was added.
These classifications remain prepared, not canonical; the grid/height export
is still live and must be reconciled first. Next join the prepared paint batch,
then use the existing ledger for the remaining color/layout populations.

September 28 public disabled-range default reduction closes the outstanding
background diagnosis gap, but is not yet joined into canonical classifications.
`examples/material-showcase/src/app/range-background-default-audit.spec.ts`
uses package-root APIs and one shared rule source for an isolated native iframe
and Astylar canvas (320 x 180 CSS pixels, DPR 1). The four cases distinguish
disabled state from an explicitly authored transparent background. Command:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/range-background-default-audit.spec.ts`.
TypeScript/browser compilation succeeded; **3 passed, 1 failed**. The sole failing
case is disabled + omitted background: Chrome computes `rgba(0, 0, 0, 0)` while
both normal and effective Astylar stages retain `#ffffff`. Enabled + omitted is
white on both sides; both explicitly transparent controls pass. Equality
assertions remain failing, not inverted to accept the defect. All cases report
empty renderer diagnostics, unchanged SiteData and zero meshes/materials/textures
after disposal. This narrows the first divergence to disabled-input defaults,
not a general inability to accept transparent paint.

Runtime: installed AstylarUI 0.2.0, Angular 20.3.31, Babylon 8.56.2,
Chrome Headless 153.0.0.0. This is new reduction evidence, not a replacement for
the original Chrome 152 capture. The original 16 observations remain separately
bound below and their zero-opacity owners do not explain the visible black ring.
No geometry, native range artwork, or final-pixel equivalence is claimed.
Generic `input.background` and type-only default merging remain the source
boundary; no renderer or Material fixture was modified.
Test log: `artifacts/material-parity/range-background-default-public-5ee5ae4.log`,
SHA-256 `0b44bb9b05ecb484532407f49dfd6f35b1d57e9920ec09402548182f6d629560`.
The existing zoneless/Zone.js NG0914 test-host warning remains; it is not a
renderer diagnostic or an explanation for the state-specific comparison failure.
Installed default-config JS SHA-256:
`5a0f4ced0db345b5a26b3b8606d5198c3462dfcfbd3ed842105d697bfde8530b`;
installed default-service JS:
`a11515a342f8fb441f775a16b7ad7480e711934d046084d686c0ef098ae4cafa`.
Consumer `ng build --output-path <audit-scratch>` passed in 53.593 seconds,
including browser/server bundles and two prerendered routes, without reported
warnings. Log: `artifacts/material-parity/range-background-build-5ee5ae4.log`.
The existing `withAuditScratch` helper removed successful output; absence of
`range-background-build-4swiaQ` was checked. The diagnostic failure log is retained.
Next: bind this narrow conclusion to the two original groups without expanding
its claim to visible thumb paint; reconcile the still-running grid/height export
before importing any new canonical snapshot.

September 28 prepared background coverage now reaches **60/62 groups and 434/450
observations** (52/381 in control-state paint plus 8/53 overlay triggers). The
latest six groups / 98 observations bind existing sheet-action, sheet-backdrop,
divider and selected-toggle proofs. The sheet wrapper's exact missing z-index
rule remains recorded; matching sibling backdrop RGBA is not composition parity.
Divider reuses the flow substitution proof. Selected toggle preserves the native
.08 focus layer, 18 light-foreground / six dark-foreground observations and eight
captured transient ripple descendants, separate from candidate fixed state fills.
Expanded control-state-paint spec passed 1/1 in **18.22 seconds**, including changed
backdrop opacity, focus-layer opacity, source rules and candidate stages. No
canonical counts changed. Only two background groups / 16 disabled-range owners
remain unprepared; preserve their public-reduction requirement rather than treating
invisible white default paint as the visible black-thumb-ring cause.
The grid/height cold export reached validation at 887.16 seconds; still unaccepted.

September 28 paint expansion: the same prepared control-paint join now covers
**46 groups / 283 observations**, adding toolbar action 8/24 and explicit opaque
grid-tile/group fills 12/172 to the prior 26/87. Native transparent-fill owners
have no own background/reset/motion request; exact candidate surface requests
survive all stages. Preserve the different histories documented below (original
grid fill versus later toggle-group input drift), without claiming intent.
Toolbar evidence retains the missing scalar `mediaMaxWidth:500px` projection
on the 64px rule. The first check rejected an unjustified single-rule assumption:
all eight held captures author identical hover and active fills. The completed
proof records both matching rules, not an inferred active selector. Focused
control-state-paint spec passed 1/1 in **15.88 seconds**, including the new absent
native request and altered rule negatives. Combined with the separate trigger
join, 54/62 remaining background groups are prepared, not canonical. Eight groups
remain: divider (1), disabled ranges (2), selected toggle (2), sheet action (2),
sheet overlay (1). Reuse their historical findings; disabled-range defaults still
need the explicitly recorded public-reduction limitation respected.

September 28 prepared tab/card/cancel paint join: original-case inventory replay
now binds **26 groups / 87 observations** to the existing findings below: tabs
16/42, card action 8/24, dialog cancel 1/8, and dark card surface 1/13. The proof
reuses tab-control and dialog alias mappings, matches every captured scalar field
and all candidate style stages, authenticates authored rule indices, and retains
native generated-layer rules/opacities separately from candidate opaque fills.
Tab layer counts remain 8 zero / 26 .04 / 8 .12; cancel remains 3 .08 / 5 .12.
The card surface preserves its explicit native token versus candidate fixed color
without asserting reconstructed token ancestry or historical compensation intent.
`node --test tests/material-parity/control-state-paint-review.spec.mjs` passed
1/1 in 15.00 seconds, including wrong stages/rules/layer opacity, incomplete
membership, raw-field and unrelated-row checks. This standalone prepared batch
is not imported by the running export and changes no canonical counts. Integrate
it with the eight prepared overlay-trigger groups after grid/height acceptance;
remaining paint populations still need their own existing proofs joined.

September 28 prepared overlay-trigger paint join: the standalone
`applyOverlayTriggerPaintReview` reuses the complete existing button-paint census
and its strict group-membership checks, without relaxing the active-only shared
classifier. It joins eight dialog/bottom-sheet background groups / 53 observations,
preserving native layer populations **33 zero / 16 .08 / 4 .12** and checking
candidate normal base, effective/interaction fill and exact authored hover rule.
Classification is unequal application paint composition; original-case lifecycle
cause and final rendering equivalence remain explicitly unproved. The existing
public covered-hover reductions remain separate evidence, not inferred causality
for every original observation. `node --test tests/material-parity/overlay-trigger-paint-review.spec.mjs`
passed 1/1 in 12.80 seconds, including full source-census replay, raw/unrelated-row
conservation, forged rule/base/interaction negatives and incomplete membership.
These new files are not imported by the running grid/height export. No canonical
classification changed. After that export is reconciled, integrate this prepared
join with the remaining existing paint proofs; do not recapture its root cause.

September 28 grid/height producer wiring: the combined join now follows box-sizing,
requires bound original cases, and independently replays the existing tab-control
height predecessor. Exact producer restoration authenticates the complete accepted
box-sizing source (SHA-256 `da1d8d901dbf5ab07bcaddfe3dffb38e8753fb9e50286be10a25d53e05ac862f`)
and rejects missing guards or unrelated edits. The initial focused run exposed an
eager attribution-list read through the existing evidence/producer import cycle;
the combined membership check now runs after initialization. Rerun:
`node --test tests/material-parity/position-composition-producer-transition.spec.mjs tests/material-parity/mapped-grid-template-review.spec.mjs tests/material-parity/control-height-request-review.spec.mjs`
passed **21/21 in 77.82 seconds**, including the 103-group/4,322-observation replay.
Canonical counts remain unchanged. Next extend the existing canonical conservation
mode for this batch and verify full producer replay/section reconciliation before
accepting a new export. The focused proof is not full canonical acceptance.

The existing conservation command now accepts `--grid-height`, pins the accepted
box-sizing package, and replays the batch against original captures. Its checks
require the exact five attribution populations (103 groups / 4,322 observations),
unchanged raw scalar values and unrelated evidence, scoped equivalence claims,
and only the authenticated producer receipt refreshes. The existing conservation
spec passed **25/25 in 77.64 seconds**, including forged expected-row, lost-row,
raw-input and unrelated-control negative controls. Launcher `--dry-run` confirms
all five retained inputs exist. Next run the complete-input cold export, then
`node scripts/check-material-position-canonical-conservation.mjs --grid-height`
and reconcile section/source hashes before accepting or importing that output.

The grid/height batch now has combined replay validation in the existing grid
review module, tested against the accepted box-sizing compact generation above.
It prepares exactly **103 groups / 4,322 observations**, preserving every raw
field and unrelated scalar row. JSON-persisted receipts replay from independent
predecessor rows; fabricated equivalence and missing rows are rejected. Combined
grid/height focused specs passed 2/2 in 73.82 seconds. No production classifier
or canonical counts changed in this step. Next wire the combined join after
box-sizing, reproduce existing tab-height precedence in independent validation,
and authenticate the exact producer transition before canonical integration.

September 28 next paint question: compact queries retain 62 background-color
groups / 450 observations and 46 color groups / 1,090 observations. Reusing
`planButtonPaintAttribution` with precise normalization and the accepted compact
rows proposes no additional shared-button groups: eight unresolved trigger groups
(bottom-sheet/dialog, 53 observations) mix active and inactive native layers.
`collectButtonPaintAllStates()` freshly replayed exactly against the retained
`docs/material-button-paint-all-states.json` in 9.40 seconds. Within those groups,
33 activate/open observations have native pseudo-layer opacity zero but a candidate
interaction background different from its normal background (the authored hover
color). Existing historical sections already connect these observations to the
completed public passive-cover/stationary-hover reduction. Do not reopen that
investigation: `public-hover-b8b0471-final/result.json` (SHA-256
`d11c78684fb013027e98eef8510f7d311d40847b89ca23e65d0f30b90476b0d1`)
and `public-hover-picking-cb547a8/result.json` (SHA-256
`c7d0ea5498fb156bbdd04b2c34da345dd90cb4224cb2e3bb2ce4013649a007c3`)
under `artifacts/material-parity/` prove the reduced core picking/revalidation
defects with public equal-input browser evidence. Both receipts were rehashed.
The 53-observation applicability receipt and distinct native layer populations
are already recorded under “Overlay trigger/cancel paint review” below.
Next implement the guarded scalar attribution join using those existing proofs,
not another browser or unit reproduction. A redundant new unit characterization
was removed before commit and its still-building test job deliberately stopped;
it is not a passing test. The independent canonical export was not interrupted.
The existing reduction is not proof of every original observation's causal path
or current-runtime parity. Preserve that scope and the other paint populations.

September 28 prepared height evidence: the existing height proof now covers all
43 remaining groups / 1,414 original observations. Of these, 29 groups / 1,076
observations have no own height, logical-size or reset declaration in captured
native rules, candidate rules, inline requests or the three candidate stages.
Unique direct owners are joined directly; non-direct owners reuse the existing
alias proof. Browser-computed auto/pixel heights remain distinct from omitted
candidate declarations; candidate computed/used height and rendering equivalence
are not established. The other 14 groups / 338 observations retain their fixed
height authoring proof. The expanded focused test passed 1/1 in 33.99 seconds,
including injected logical-size, native-inline and local-stage negative controls.
An initial attempt incorrectly sent direct IDs through the alias-only resolver;
the corrected join requires unique direct owners before falling back to aliases.
The standalone height batch now joins through the existing scalar infrastructure:
14 groups / 338 observations receive authoring classifications and 29 / 1,076
receive computed/local measurement-boundary classifications. Its focused test
passed 1/1 in 35.18 seconds, preserving raw fields across all 8,483 compact scalar
rows and leaving all 8,440 unrelated rows unchanged. These remain prepared, not
production/canonical classifications. Next integrate the prepared grid and height
batches after box-sizing export reconciliation; do not repeat their source surveys
or infer used-size equivalence from omission.

Previously accepted typography generation (superseded by the checkpoint above):
`e25dab5fef84be5038dc83bff954f0681c3661c86bb0dd546dd118876d842760`.
The complete-input cold export from 60df658 finished in **2,370.75 s**; exit 1
reports **939 unresolved groups**, not an export/validation error. Coverage
remains 436/436 static and 1,875/1,875 interaction cases. Session verification
reported zero invalidated dependencies (1,205 files / 89,151,875 bytes checked).

`node scripts/check-material-position-canonical-conservation.mjs --typography`
passed: exactly **91 groups / 4,862 observations**, one scalar producer receipt
and 48 control producer receipts changed; every raw input and unrelated control
record is conserved. `material-audit-section-digests.mjs` authenticated both
packages: **79 sections, 72 unchanged, none added/removed**. The seven changed
sections are discrepancies, sourceFingerprints, summary, controlTypography,
controlLineBoxes, ownerCaretInputs and reviewedSourceBatchInputs. Metadata
replay verified **480 current LF-normalized source hashes** (two added, eight
changed, no removals). Remaining metadata changes are the reviewed producer/
motion source receipts and summary counts: authoring +23, harness -23,
unresolved **1,030 → 939**. Evidence logs are
`artifacts/material-parity/typography-{conservation,metadata}-60df658.log`
and `artifacts/material-parity/typography-sections-60df658.json`.

Compact import and `node scripts/audit-findings-store.mjs verify` passed:
8,483 scalar groups / 389,202 observations, 134 source findings, 39,904 control
records; compact shards total 70,933,071 bytes. Current index SHA-256:
`230d42b303bfd104b444d5c7e42ad0f69ce79ba943adc5bc144cca89aded585f`.
Decoded payload SHA-256:
`db9b27d78de724ba1c7b36aaf7f64de7ea7f0e3965356c9b3afaceedfca11db4`.
The standalone manifest is retained beside the indexed compressed payload;
no decoded 2 GB file was created. All reconciliation jobs are complete.

**Next:** reconcile the integrated 49-group box-sizing review through a complete
canonical export and conservation check; do not repeat its completed source
investigations. Then continue remaining property/state gaps.
The 939 unresolved groups and final enforced browser gates still prevent audit
completion. This checkpoint does not incorporate the separately prepared
box-sizing classifications or claim input/rendering equivalence.

September 28 integration progress: the existing box-sizing helper now validates
submitted rows by rebuilding from the validated predecessor and original tree
evidence, comparing every row after JSON persistence (undefined omission only).
The focused join now uses the accepted typography generation above: the same
49 groups / 2,657 observations are reviewed and 8,434 compact rows are untouched.
Negative controls reject fabricated geometry/equivalence, missing observations,
changed raw values/attributions, dropped/added rows and unrelated metadata edits.
`node --test tests/material-parity/box-sizing-authoring-review.spec.mjs` passed
4/4 in 28.07 seconds. This closes the submitted-receipt validation gap, not full
canonical conservation. Production wiring must replay the existing modal/tab
box-sizing precedence before this batch; do not feed the earlier unreviewed
producer stage directly into it. Exact source-transition checks and canonical
integration remain next. No renderer or fixture changes were made.

Production integration is now wired after typography, gated on bound original
cases, with both helper/spec included in source fingerprints. Independent
validation replays six existing modal/tab box-sizing groups before applying the
new 49-group batch. Exact six-fragment restoration authenticates the complete
accepted producer predecessor (`8e47117aace4e449d5da889eff7815fcc15ed5c6e9d98ebd5632f658379c4070`)
and preserves all earlier source-transition checks. Combined box-sizing and
producer-transition tests passed 22/22 in 29.04 seconds; production position
source-binding tests passed 2/2 in 22.20 seconds. The canonical export is now
intentionally pending source reconciliation: the accepted checkpoint above is
still the 939-unresolved typography report, not a claim that today's producer
has already been exported. Next extend the existing canonical conservation
command for this batch and run the complete-input launcher at this milestone.

The existing conservation command now supports `--box-sizing`, pinned to the
accepted typography package and original capture. It replays all 49 groups and
permits only the exact producer receipt transition, checking all scalar inputs,
unrelated rows and 48 control receipts. Its full synthetic conservation suite
passed 24/24 in 73.13 seconds, including forged expected-data negative controls.
Launcher `--dry-run` confirmed all five required input paths. Next run the cold
complete export, then `node scripts/check-material-position-canonical-conservation.mjs --box-sizing`
and section/source reconciliation before importing or accepting the result.
Fresh compact queries still find 939 unresolved groups: after the 49 box-sizing
groups, prioritize shared layout/grid (43 height and 60 grid-template groups),
then paint (62 background-color and 46 color groups), retaining the remaining
position, interaction and typography coverage rather than treating these as the
entire scope. No existing investigation has been restarted.

While the box-sizing cold export runs from `6a23c58` (session 17927, exporter
PID 17000, log `artifacts/material-parity/box-sizing-export-6a23c58.log`), only
read-only grid triage and this ledger were changed. Reusing
`inspectOwnerGridInitial` against hash-authenticated original trees and current
compact membership explains all 59 none/omitted groups / 2,856 observations:
1,920 reference motion holds, 884 mapping holds, and 52 grid-list row-template
observations held because the candidate explicitly requests two columns. The
separate 52 column-template substitutions already have the historical proof.
`resolveOriginAliasPair` resolves 766 mapping observations and preserves 118
overlay `mapped-with-scalar-rule-gap` observations; do not erase that gap.
Motion declaration populations are 1,144 box-shadow + disabled-none, 272 none,
120 border + disabled-none, 40 opacity, 40 opacity + none, and **304 chips with
duration 1ms but no explicit transition target**. The last population must not
be called inactive/disjoint merely from duration. These are declaration records,
not proof of animation settlement or used-grid equivalence. Ordered triage
receipt digest: `cabed18667ac23146d5f9ba5b7ad83d84363df42ded9a50edb238279ecdbb739`.
Next reuse mapped-owner declaration checks and exact motion-target proofs for
these populations; keep chip target uncertainty and grid-list authoring distinct.
No new reports or captures were written and no canonical count changed.

Mapped grid review now has a focused executable proof in
`tests/material-parity/mapped-grid-template-review.mjs` and its spec. All **884**
original mapped observations pass own-node grid/reset absence checks, including
shorthands, inline declarations, possible candidate rules and all three local
stages. Existing alias/path and declaration tracing preserve all **118** scalar
rule gaps and motion records. Native inline grid and candidate grid/template/all
injections fail. Focused test passed 1/1 in 11.47 seconds. This proves only the
computed/local measurement boundary; candidate computed values, motion targets,
settlement, implicit tracks and rendering equivalence remain unverified. These
standalone files are not imported by the running exporter, and no existing
export dependency was changed. Integrate only after the box-sizing checkpoint
is reconciled. Export PID 17000 remained live with CPU advancing to 347.73 s.

The same grid helper now prepares **all 60 groups / 2,908 observations** through
the existing scalar join: 2 grid-list composition groups / 104 observations,
24 mapped-owner groups / 884, and 34 direct-motion groups / 1,920. Direct motion
retains 1,616 observations with explicitly disjoint declared targets and 304 chip
observations with unverified targets; settlement and indirect effects remain
unproved in both. The full compact join preserves all raw fields and every
unrelated row; per-group original-row hashes and observation counts are checked.
An initial routing failure exposed multiple stepper measurement aliases: using
the existing inspector's uniqueness decision (not any matching ID) fixes the
join without weakening the owner proof. Focused test passed 1/1 in 34.74 s after
that correction; negative controls reject explicit grid requests and prevent a
grid-targeted transition from being called disjoint. This is preparation only,
not canonical integration. The running export's dependencies remain unchanged.

Read-only height triage covers **43 groups / 1,414 observations** from the same
authenticated capture/current compact checkpoint. Captured own height/logical
size/reset declarations split into **29 groups / 1,076 observations** with no
request on either side, **13 groups / 318** with candidate fixed height and no
native own height request, and **one progress-bar group / 20** with native
token-based `max(track-height, active-indicator-height)` versus candidate 8px
(native computed 4px). Candidate-fixed owners: divider, badge, sort, checkbox,
radio, button-toggle and private tab-panel. This is declaration triage, not
used-layout or implicit/default-height equivalence; min/max, descendants,
formatting contexts and complete local stages still need their existing proofs.
Ordered receipt digest: `c6c06d06e66092dae7065224c3a1a8a1364749e8d31cff2c015ad8adbeb94985`.
Reuse `control-width-observation.mjs` owner proofs, the existing sort natural-flow
border reduction, divider paint substitution and tab-panel ownership/history.
The current showcase still has `.progress` height 8px at astylar.component.ts:787;
this corroborates authoring, not the installed plugin's used height. No new
capture or report was created. Export remains live (CPU 1,061.61 s); no restart.

`control-height-request-review.mjs` now proves the 14 explicit-height groups /
338 observations using the existing validated inventory, control-width owner
proofs and private tab-panel boundary. All 89 native scalar fields and three
candidate stages are joined; full candidate height rules (including tab media
overrides) and the progress token expression remain visible. Native inline
height, candidate logical-size and altered normal-stage injections are rejected.
Focused spec passed 1/1 in 19.99 s. Raw captured trees lack the inventory's
`ruleEvidenceComplete` assertion expected by the reused width proof, so the test
uses the existing validated inventory reconstruction rather than inventing that
flag. This proof is not yet classified in the canonical report and makes no
used-layout, compensation-intent or renderer-cause claim. New standalone helper/
spec are outside the running export dependency graph. The export reached
`validate-audit` at 903.66 seconds; reconciliation is still pending.

### Earlier preparation notes (historical job statuses)

- Prepared box-sizing proofs now run through existing `applyModalBoxReview`
  via `applyBoxSizingReviews`, without wiring a new production dependency into
  the live exporter. The focused join checks all **8,483 compact scalar records**:
  exactly **49 / 2,657 observations** receive the three bounded attributions
  (10/621 explicit candidate, 6/290 native-request/local-omission, 33/1,746
  computed/local observation-stage); **8,434 records remain unchanged**.
  Every raw field, original-row digest, complete observation/reviewed-case count
  and false input/rendering-equivalence flag is checked. Command
  `node --test tests/material-parity/box-sizing-authoring-review.spec.mjs`:
  **4/4 passed, 31.09 s**. This is working-index conservation, not whole canonical
  payload/source-receipt reconciliation. Next add independent production replay
  validation and exact producer-transition conservation after the typography
  export; do not bypass the pending canonical acceptance gates.
- Box-sizing declaration/observation preparation now covers **all 49 remaining
  groups / 2,657 observations**. The existing helper/spec additionally replays
  the **33 omission groups / 1,746 observations**, including the 52 table cases,
  with authenticated trees, full scalar joins, all candidate stages, exact
  accepted memberships/samples, absent own rules/inline declarations and explicit
  generated-owner identities. Unknown browser-UA provenance and candidate
  computed/used geometry remain false/unverified in each proof; the table's
  native border-box value is not normalized to content-box. An injected
  candidate declaration is rejected for every group. Command:
  `node --test tests/material-parity/box-sizing-authoring-review.spec.mjs`:
  **3/3 passed, 14.85 s**. This completes bounded source-proof preparation,
  not canonical classification or full rendering equivalence. Next apply the
  prepared proofs through the existing scalar join, with raw/unrelated-row
  conservation, after the live typography exporter completes reconciliation.
- The same box-sizing helper/spec now verifies the reverse declaration
  population: **six groups / 290 observations** with explicit native border-box
  requests and absent candidate local declarations. Exact selector, value,
  importance and conditions are checked, together with complete native scalars,
  three candidate stages, inline absence, accepted membership/counts and samples.
  Snackbar's generated `mapped` identity and slider's private
  `showcase.material:range-visual` owner remain explicit. Negative controls
  reject a new candidate declaration and a changed native request.
  `node --test tests/material-parity/box-sizing-authoring-review.spec.mjs`:
  **2/2 passed, 7.10 s**, covering this population plus all 621 explicit
  candidate observations. These 911 observations have reproducible declaration
  provenance, not synthesized candidate computed styles or used-box equivalence.
  Canonical integration still awaits the existing typography export; no exporter
  dependency was changed and no renderer/fixture fix was made.
- The 10 explicit candidate box-sizing groups now have an executable original-
  population proof in `tests/material-parity/box-sizing-authoring-review.mjs`
  and its focused spec. **621 observations** replay from authenticated original
  trees; exact accepted counts, states and first-12 samples are conserved.
  The proof checks every native scalar against its tree, all three candidate
  stages, exact matching authored border-box requests, absent native own
  box-sizing/all requests and inline declarations, owner types, and both overlay
  `mapped-with-scalar-rule-gap` identities. Negative controls reject an added
  candidate override, changed normal stage and new native request. Command:
  `node --test tests/material-parity/box-sizing-authoring-review.spec.mjs`:
  **1/1 passed, 4.11 s**, including all population and negative assertions.
  This is a focused declaration proof, not a production classification change;
  no used geometry, deliberate compensation intent or core cause is inferred.
  Keep the running export's dependencies frozen. Next reuse this helper in the
  existing scalar review join only after typography export reconciliation.
- Applicability check for the new omitted-sizing reproduction covers all **32
  unresolved content-box/omitted groups / 1,694 original observations**, joined
  by family, element, state and exact raw boxSizing values. Per-group occurrence
  counts match accepted `462dddc7`; original capture hash remains `b07ef154...`.
  **1,641 observations** have captured candidate padding/borderWidth zero.
  The other **53** are card-copy (52, padding `0 16px`) and one checkbox-label
  observation (padding `0 0 1px`); neither has captured candidate width/height.
  Thus none directly matches the public diagnostic's combination of declared
  width/height and nonzero insets. Do not apply its confirmed failure to this
  whole population or classify these rows as equivalent: intrinsic sizing,
  source declarations, generated/plugin owners and other used-box effects
  remain distinct. Ordered case/element/size/display/inset digest:
  `f616622aade1e5b31669acf94154d6e6195b8c86e672cbde6b5af13559182bff`.
  The original capture identifies Chromium **152.0.7977.76**, not the diagnostic's
  Chrome 153; historical UA-rule provenance is still not established merely by
  the newer browser check. Next prioritize executable authored-request findings
  (10 explicit candidate groups and six explicit native groups), retaining this
  omission population as observation-stage uncertainty until independently
  justified. No additional browser rerun, source change or canonical transition.
- Public table/block box-sizing reduction now exercises **six equal-authored
  cases** through package-root `Astylar.mount`, reusing the existing button
  diagnostic's CSS serialization and projected-border-box measurement. Command:
  `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/table-block-box-sizing-input-audit.spec.ts --progress=false`.
  TypeScript/browser bundle compiled; **5 passed, 1 failed**, exit 1. The failure
  is deliberately preserved: omitted boxSizing on a div produces candidate
  **120x44** versus native **152x60** with the same 120x44 declarations,
  6px/14px padding and 2px borders. Explicit content-box produces 152x60 on
  both, and explicit border-box produces 120x44 on both. Table omitted and
  border-box both produce 120x44; table content-box produces 152x60. Every
  tested origin is (32,32). This confirms a generic omitted-size policy
  discrepancy in the installed package, not a table used-size defect in this
  bounded example. Ownership: core defaults/dimension interpretation before
  projection; no application plugin participates. The catalog's sizing entry
  claims content-box as the default, unlike the observed div behavior.
  Environment: AstylarUI 0.2.0, Angular 20.3.31, Babylon 8.56.2,
  Chrome Headless 153, 400x180 CSS surfaces, DPR 1. Existing NG0914 warns about
  zoneless testing with Zone.js loaded. No diagnostic errors were reported.
  Failure log retained at
  `artifacts/material-parity/table-block-box-sizing-diagnostic.log`, SHA-256
  `415dbf55fd8d7528233fcef68204c8e60ba53af46f44adb51a12b149ff4033ba`.
  Installed dimension JS SHA-256
  `0a65a1659a51062ab41cda030c4f030b15bcf5328c85fb1a3597628c05cf190c`;
  installed defaults JS
  `5a0f4ced0db345b5a26b3b8606d5198c3462dfcfbd3ed842105d697bfde8530b`.
  Both installed code and current source retain the inspected fallback, but
  this does not establish complete package/source identity. Do not extrapolate
  this declared-size diagnostic to auto/intrinsic tables, Material's 52 owners,
  DPR 2, raster or interactions. Next bind applicable original observations
  through the existing review machinery; the failing diagnostic remains an
  implementation regression target, not authorization to fix core now.
  Export dependencies and canonical classifications remain unchanged.
- Isolated native-browser check resolves the table default hypothesis for
  **Chrome 153.0.8010.53**, at 800x600 CSS pixels and DPR 1/2. A plain `table`
  computes `border-box`; a `div` with `display: table` computes `content-box`.
  Chrome DevTools Protocol `CSS.getMatchedStylesForNode` identifies the exact
  `table { box-sizing: border-box }` rule as **user-agent** origin. Explicit
  `initial` and `unset` produce content-box; `revert` restores border-box.
  All assertions passed in the isolated Playwright stdin diagnostic; contexts
  and browser were closed, with no capture artifacts or source changes.
  The first diagnostic failed before assertions because it read `rule.cssStyle`
  instead of CDP's `rule.style`; the corrected diagnostic exited 0.
  This supplies a native default explanation consistent with table-primary's
  52 historical observations, not proof of the historical browser's rule or
  candidate used-box behavior. Preserve that boundary: do not classify the
  omitted candidate field as equivalent, nor invent a missing Material rule.
  Candidate source follow-up: executing the current TypeScript defaults module
  in isolation confirms table defaults contain only display table / width auto,
  with no global boxSizing field. `StyleDefaultsService.getElementTypeDefaults`
  merges that baseline; `StyleService.findStyleForElement` applies it before
  authored rules. `ElementDimensionService.calculateDimensions` (lines 312-323)
  explicitly preserves historical border-box interpretation when boxSizing is
  omitted, adding declared-size padding/borders only for explicit content-box.
  Thus an omitted captured field is not evidence that candidate table sizing
  defaults to content-box. `TableService` also consumes stored dimensions and
  performs its own row/column sizing, so this source trace alone cannot prove
  final table geometry. Defaults SHA-256:
  `c429bec0fa047e71148f4ce743868a4c89986fde28cc7d11076bb7afa89993f3`;
  dimension source SHA-256:
  `24d3c910ec0f054f0ec2de1808420f3e6571708a13348eea0887d040c9aa3d30`.
  Next bind historical browser evidence and run a minimal equal-input public
  table/div sizing contrast through the existing box-sizing proof, including
  nonzero padding/borders; do not generalize the button proof or this source
  inspection into used-size equivalence for the 52 table observations.
  Export PID 380 has advanced to `validate-audit` (901.80 s elapsed at entry)
  and was independently verified live at 1,246.50 CPU seconds. No export
  dependency or canonical classification changed during this investigation.
- Remaining box-sizing omission census now covers **39 groups / 2,036
  observations**, all mapped with scalar/native box values and complete three-
  stage candidate snapshots checked against authenticated original inventory.
  No candidate owner has a captured matching box-sizing/all request. **Six
  groups / 290 observations** have explicit native border-box requests:
  dialog-cancel/save `.mdc-button` (32 each), sidenav `.mat-drawer-container`
  (62), slider-visual `.mat-mdc-slider` (78), snack-bar-surface
  `.mat-mdc-snackbar-surface` (34), toolbar `.mat-toolbar-row,
  .mat-toolbar-single-row` (52). Preserve slider's private range-visual owner
  and snackbar's generated mapping. **32 groups / 1,694** compute native
  content-box with no captured own box-sizing/all request on either side;
  they remain computed-versus-local observations, not proven defaults or used
  box equivalence. **Table-primary / 52** computes native border-box with no
  captured author request, requiring a separate browser-default check rather
  than inventing a missing Material rule. Ordered owner/declaration digest:
  `b178cc74c852abc6e0c1ace925e191a2a5156ce98eb2c3d4e318fa722a79f779`.
  Existing button box-sizing proof provides bounded static declared-border-box
  geometry only; do not extend it automatically to these container/plugin or
  interaction owners. Next reuse its declaration/geometry separation when
  making these findings executable after the active export is reconciled.
  No canonical classification, renderer or exporter dependency changed.
- History follow-up for the 10 explicit box-sizing groups inspected **102
  revisions** of `examples/material-showcase/src/app/astylar.component.ts` and
  the introducing diffs/file lists. `.modal-overlay` and the later of two
  `.stepper` rules already request border-box in initial showcase **2f440115**
  (2 groups / 93 observations); do not describe those as later fixes.
  **c47d589ac2cf1967cc321df38339cb64dabb3732** adds it to toggle group/options,
  checkbox and chips alongside replacement selection-indicator/layout authoring
  (6 groups / 424 observations). **7159b1d5266ed4bc03b56581b8034526abae892b**
  replaces tab-panel top padding with width 100%, height 20px and border-box
  (1 group / 70). **f3c8254c2aa63197c03e0fb2bd43cc98c0e57fed** replaces the
  snackbar's 56px fixed/bottom overlay plus `translate(0, 159px)` with a full-size
  fixed column-flex border-box overlay (1 group / 34). Those three later commits
  change showcase/plugin/harness files, not renderer-core files. These are
  demonstrated fixture-input substitutions; the individual box-sizing change's
  intent and causal contribution to any hidden core defect remain unproved.
  Preserve separate initial-authoring versus later-adjustment provenance when
  adding executable classifications. Export dependencies remain unchanged.
- Read-only explicit box-sizing investigation answers authored-versus-default
  provenance for all **10 groups / 621 observations**. Original capture
  `b07ef154...` and collected tree inventory authenticate the population; exact
  states, first-12 samples and counts match accepted `462dddc7`. All native
  owners compute `content-box`, with no captured active own `box-sizing`/`all`
  request. Every candidate has exactly one matching authored `border-box` rule,
  and complete scalar snapshots equal all three captured candidate stages.
  Owners/rules: bottom-sheet-overlay `.modal-overlay` (25); button-toggle-one/two
  `.button-toggle-option` and group `#button-toggle-primary` (68 each);
  checkbox-primary `#checkbox-primary` (68); chip-0/1 `.chip` (76 each);
  snack-bar-overlay `.snack-overlay` (34); stepper-primary `.stepper` (68);
  tab-panel `.tab-panel` (70). Ordered owner/rule/mapping/scalar proof digest:
  `bde0d10c6e1a0219e8cae6e4832494e13e7e1a27edcff3220eeb6a9826aa9e4d`.
  First demonstrated difference is candidate authoring before layout, not a
  core default insertion. Preserve the native span/private tab-plugin owner
  distinction and both overlays' `mapped-with-scalar-rule-gap` status. This
  does not prove used box geometry, screenshot causality, compensation intent
  or renderer equivalence. Next retain these assertions in the existing review
  infrastructure, inspect history for intent separately, and review the 39
  omitted-candidate groups without assuming defaults. No classification or
  exporter dependency changed. Export PID 380 remains live at 439.53 CPU seconds.
- Cold complete-input typography export from **60df658** is running (session
  **8290**, exporter PID **380**, log
  `artifacts/material-parity/typography-export-60df658-complete-inputs.log`).
  Live process checks show CPU advancing from 55.95 to 210.56 seconds while in
  `build-audit`; do not restart it or accept partial output. Source/evidence
  dependencies have not been edited during this run.
  Read-only prioritization against accepted `462dddc7`: remaining box-sizing
  splits into **10 explicit content-box/border-box groups / 621 observations**,
  **32 content-box/omitted / 1,694**, and **7 border-box/omitted / 342**. Investigate
  explicit authored differences first, then distinguish declarations, defaults,
  measurement owners and used boxes for omissions; do not assume omitted means
  content-box. Grid templates split into **59 none/omitted groups / 2,856
  property observations** and **one explicit two-column substitution / 52**.
  Reusing `proveGridPositionSubstitution` on all 52 hash-authenticated original
  tree pairs confirms the latter belongs to the already-proven positioned-block
  versus zero-gap-grid authoring mismatch. Native root computed templates are
  both none; candidate columns are `1fr 1fr`. Ordered proof digest:
  `b4d3f5ba15600b5c36b230e69b39c1d3b31fcbc9bbce8564e46cbd552589fdda`.
  Reuse that ownership proof for future scalar classification; do not start a
  new grid-renderer investigation for this row. No canonical count changed.
- Existing canonical conservation checker now supports `--typography`, pinned
  to accepted `462dddc7` and the original capture hash. It independently rebuilds
  this batch from original trees and retained typography, requires the exact
  11 attribution totals (**91 groups / 4,862 observations**), preserves every
  raw row and unrelated finding, and permits only the established scalar/control
  producer-receipt transition. Original-row hashes, complete observation counts
  and false equivalence flags are enforced. All **23 conservation tests passed,
  72.23 s**, including joint forged-output/expected-row negative controls.
  This verifies the checker, not a new export. Next run the complete-input
  exporter from this committed source, then `node scripts/check-material-position-canonical-conservation.mjs --typography`,
  whole-report section/source reconciliation and compact import/verify. Do not
  accept a new checkpoint or reduce the 1,030 unresolved count before those pass.
- Typography review is wired into the production audit after existing scalar
  reviews, with original-capture binding guards and source fingerprints. Its
  validator replays the five existing typography predecessor joins instead of
  trusting submitted classifications. Persisted JSON comparison omits undefined
  keys only; no CSS defaults are introduced. Existing population proof passed
  **1/1, 103.59 s**, retaining all 91 groups / 4,862 observations, raw rows,
  prior accepted typography classifications and mutation controls. All **17
  producer-transition tests passed, 3.64 s**: exact fragment removal restores
  the complete `2281c37` producer and every older transition still validates.
  Motion conservation also passed **2/2** alongside the earlier population run.
  The export launcher dry run confirms all five required inputs. Source-batch
  preflight reproduced 146 groups / 6,295 observations and its historical
  transition preserved 8,193 unrelated rows. The complete source-batch and
  normalization suites passed **8/8, 243.02 s**, including subset rejection.
  Next extend the existing canonical conservation
  checker for this 91-group batch before export/reconciliation. Accepted
  `462dddc7` remains at 1,030 unresolved; production wiring is not canonical
  acceptance. No renderer, fixture, original capture or historical report changed.
- The complete typography batch now has one combined apply/replay entry point
  in the existing `tracking-input-review.mjs`, covering all 11 attribution kinds.
  Replay reconstructs expected findings from original rows and bound evidence;
  it rejects forged equivalence, missing observations, altered raw values,
  removed classifications and duplicate rows. The existing population test
  passed **1/1, 92.50 s**, including all **91 groups / 4,862 observations** and
  conservation of all 8,483 raw rows. After that run, one redundant full-corpus
  apply/equality assertion was removed: combined validation already performs
  that exact comparison; all negative assertions and validation remain.
  Production wiring is still pending. Its replay must use the same preceding
  scalar classifications as the application path so earlier reviewed title
  states cannot be accidentally reclassified. Next add production wiring,
  binding guards and exact producer-source restoration together, then verify
  the bounded transition before the expensive canonical export. No accepted
  count, renderer behavior, fixture input or historical evidence changed.
- Typography opt-in source reconciliation now preserves the exact predecessor
  sources for the survey, motion and delay collectors. Unrelated edits, changed
  defaults and repeated fragments are rejected rather than accepted by refreshed
  historical hashes. `node --test tests/material-parity/motion-source-conservation.spec.mjs`
  passed **2/2, 35.19 s**. `replayReviewedBatchMotion()` passed: all **121 motion
  groups / 7,254 observations**, all 12 mapping declarations, and the complete
  **35 delay groups / 2,546 observations** replay unchanged apart from explicitly
  checked source receipts. Historical reports were not rewritten. This closes
  the collector-transition gap, not production integration or rendering parity.
  Next integrate the prepared 91-group typography batch with independent replay
  and a bounded production-source transition before exporting. Accepted counts
  remain 1,030 unresolved; final canonical and browser gates remain outstanding.
- Prepared tracking/line-height review now accounts for **all 91 previously
  unresolved groups / 4,862 observations** in these two properties. The final
  four groups / 292 observations reuse existing chip host/nested-label and
  private tab-panel ownership proofs. Chip host tracking is a computed-versus-
  local observation boundary, not a label-paint conclusion; tab typography is
  owned by a childless private plugin renderer, not shared retained text.
  Every receipt retains **false motion-target/settlement/equivalence flags**.
  Explicit candidate ancestor typography requests are rejected. No motion
  uncertainty was converted into a passing default-equivalence claim.
  Existing full population/composition test passed **1/1, 59.39 s**; all raw
  fields and **8,392 unrelated complete rows** are conserved, with no remaining
  unresolved tracking/line-height row in the prepared result. This is not yet
  canonical: accepted 462dddc7 remains at **1,030** unresolved across the full
  audit. Next integrate this coherent batch with independent replay and exact
  survey/motion source-receipt conservation before another expensive export.
  Inspection confirms the existing motion-source-conservation checker uses
  exact opt-in fragment restoration; extend that bounded transition rather
  than refreshing historical hashes or weakening the complete-evidence check.
- Existing motion/owner-target checks now accept tracking and line-height only
  through explicit opt-ins. All **392** remaining observations were checked:
  **four groups / 100 observations** (badge/progress tracking and progress-bar
  line-height) have captured disjoint motion targets; changing their exact
  target declarations to typography is rejected. **Four groups / 292 observations**
  remain separate: chip-0/chip-1 tracking and tab-panel tracking/line-height.
  Duration-only/other incomplete motion evidence does not establish inactive
  motion, settlement or absence of indirect effects. Next reuse the existing
  chip host-versus-label and private tab-panel ownership proofs for these
  observation boundaries instead of weakening the motion checker.
  Combined prepared batch: **87 groups / 4,570 observations**, all raw fields and
  **8,396 unrelated rows** conserved; population test **1/1, 65.11 s**. Existing
  appearance motion opt-in check passed **1/1, 4.70 s**. Read-only replay of all
  **121 historical motion groups / 7,254 observations** matched every non-source
  field exactly; changed source fingerprints remain explicit and unreconciled
  until production integration. The initial typography negative test used pooled
  rules with unrelated shapes; corrected it to the bound motion request indices.
  No renderer, fixture, historical report, threshold or canonical count changed.
- Tracking and line-height survey modes are now separately **opt-in**; historical
  `ownerInitialValues` and production callers are unchanged. Font shorthand is
  checked for line-height. Focused survey/negative checks passed **5/5, 2.37 s**;
  a write-free replay of the existing survey reproduced **all 600 groups / 32,144
  observations / 1,734 cases** with every non-source field identical. Its source
  fingerprint differences are the edited survey and previously changed border
  evidence helper; no historical report or receipt was rewritten/waived.
  All 75 typography routing populations now have executable state-exact checks.
  Reusing this survey prepares **52 groups / 2,880 observations** as captured
  computed-versus-local observation boundaries, never candidate computed-default
  or rendering equivalence. Combined with earlier proofs, **83 disjoint groups /
  4,470 observations** now compose against all 8,483 accepted scalar rows;
  every raw field and **8,400 unrelated complete rows** is conserved. Full existing
  population test passed **1/1, 47.72 s**. The remaining typography population is
  **eight motion-bearing groups / 392 observations** (six tracking, two line-height),
  requiring the existing motion-target/owner checks rather than another census.
  Next: resolve those motion boundaries, add independent combined replay at
  production integration, and reconcile the survey source transition explicitly.
  Canonical checkpoint 462dddc7 still has **1,030 unresolved**; these preparations
  are not yet applied there. The newly edited survey changes a recorded producer
  dependency, so the checkpoint's historical source receipt must not be described
  as matching the new worktree until that transition is checked.
- Corrected wrapping generation **462dddc705e4be1cfb3be863b9707f579782f8c440759c31f59185718acbc651**
  has passed full reconciliation against accepted baf0ccb8. Conservation command
  `node scripts/check-material-position-canonical-conservation.mjs --wrapping`
  passed: exactly **30 groups / 1,478 observations**, one scalar receipt and 48
  control receipts changed; every raw input and unrelated control record is
  conserved. Whole-report section digests authenticate both compressed/decoded
  payloads: **79 sections, none added/removed, 72 unchanged**. The seven changes
  are discrepancies, sourceFingerprints, controlTypography, controlLineBoxes,
  summary, ownerCaretInputs and reviewedSourceBatchInputs, all explained by the
  bounded classification or source-receipt transition. Metadata replay verified
  all **478 LF-normalized source hashes**: three added wrapping proof/test files,
  three changed producer/transition files, no removals. Remaining metadata changes
  are producer receipts, reviewed-source report receipt, and summary counts
  (authoring +15, harness -15, unresolved **1,060 → 1,030**). The historical tab
  typography proof's source remains unchanged; no receipt waiver was used.
  Decoded SHA-256: `c1220413b2757c5729d7b53a64ae9aa380453acd639d1639b334e6edce8877d6`.
  Compact import and `node scripts/audit-findings-store.mjs verify` passed:
  8,483 groups / 389,202 observations, 134 source findings, 39,904 control records,
  1,030 unresolved groups; compact shards total 70,690,839 bytes. Current pointer
  now selects this accepted checkpoint, index SHA-256
  `093a70699e5e2016095ecc92d42a3e77ca2f9964ae7dc493d5829d9111cc2d4c`.
  The standalone manifest is preserved beside the indexed payload for future
  complete-predecessor checks. Original captures and the failed export remain
  immutable; no 2 GB decoded file was created.
  The 31-group typography batch is still prepared separately, not included in
  these canonical counts. Full audit acceptance and final browser gates remain
  outstanding; this checkpoint does not establish input or rendering equivalence.
- Overlay typography observation boundaries now have prepared classifications:
  **10 groups / 314 observations** across bottom-sheet overlay, snackbar
  overlay/surface and dialog panel/actions. Reused the exact wrapping owner
  mappings and dialog motion-override proof; separately checked tracking and
  line-height ancestry and rejected font resets. Native computed normal versus
  absent local declarations is an observation-stage mismatch, not a claim that
  candidate computed typography or popup placement is correct. Known scalar
  z-index rule gaps, external inheritance, indirect motion effects and descendant
  typography remain explicit. Full prepared composition now changes **31 groups /
  1,590 observations**, preserving all raw fields and **8,452 unrelated rows**.
  Existing population suite passed **1/1, 29.86 s**, including font-reset rejection.
  No renderer/fixture or active-export dependency was edited.
- Corrected wrapping export is **terminal**. Evidence-session verification:
  1,205 files, zero invalidations. Its only reported error is the expected
  **1,030 unresolved groups**; full coverage is 436 static / 1,875 interaction,
  8,483 scalar groups / 389,202 observations and 134 source findings. The old
  independent-source-binding failure is absent. Acceptance is still pending:
  full wrapping conservation, section digests and source/metadata reconciliation
  are running before compact import. Do not start another export.
- Prepared typography batch composition now passes against **all 8,483 accepted
  scalar rows**, not only family slices: exactly **21 disjoint groups / 1,276
  observations** transition, all raw fields and **8,462 unrelated complete rows**
  remain unchanged. Every changed row was previously unresolved and retains its
  exact original-row hash, complete observation count and false input/rendering
  equivalence flags. Reused the existing population test and seven prepared
  adapters; **1/1 passed, 36.63 s**. This is pre-integration evidence, not a new
  canonical generation or a renderer fix. No exporter dependency changed.
  Corrected wrapping exporter PID 4632 remains live (2,589.28 CPU seconds).
  Outstanding order: finish/reconcile that export, integrate conservative survey
  modes with original populations unchanged, classify the remaining motion and
  overlay boundaries, then integrate the coherent typography batch. Other
  unresolved properties and complete final gates remain in scope.
- Explicit tracking-token proofs now feed the existing classification adapter:
  **three groups / 112 observations** (toolbar title 40, card title 40, dialog
  title 32), with raw and unrelated rows conserved. Earlier static title reviews
  remain untouched. Initial adapter replay rejected 40-versus-52 membership;
  the caller now uses each accepted row's state boundary before the existing
  semantic join. No shared production adapter or exporter dependency changed.
  Population suite passed **1/1, 28.42 s**, including previous negative controls.
  Together with label and toggle-host proofs, **10 tracking groups / 588
  observations** have prepared logic; candidate computed tracking, token
  sensitivity and rendering equivalence remain unproved.
- Corrected state-filtered, read-only survey replay completed for all **75
  groups / 3,854 observations** of zero tracking and normal line-height. Tracking
  routes remain 25/1,470 captured-no-request, 6/302 motion, 2/80 explicit request,
  4/125 owner mapping and 2/64 incomplete ancestry. Line-height routes are
  27/1,410 captured-no-request, 2/156 explicit inheritance (now separately proved),
  2/90 motion, 4/125 owner mapping and 1/32 incomplete ancestry. This supersedes
  the failed divider membership recheck; neither values nor state coverage were
  normalized away. These are routing results, not candidate computed-style or
  rendering-equivalence findings. Next add separately opt-in tracking/line-height
  modes to the existing survey after the active export terminates, with negative
  controls and original survey population preserved. Keep overlay owner/ancestry
  and motion exceptions separate. Export PID 4632 remains live (2,429.03 CPU
  seconds); canonical acceptance still requires reconciliation.
- Slider line-height request omission now has a focused executable proof and
  prepared classification for **two groups / 156 observations**. Reused the
  existing range font-reset owner paths; separately proved native active
  `line-height: inherit`, normal computed ancestry, and absent candidate
  line-height/font/all requests across every captured owner-to-page path and
  all three style stages. Negative controls reject replacing native inherit
  with normal and adding an ancestor candidate line-height request. Existing
  population suite passed **1/1, 27.69 s**; all raw and unrelated slider rows
  are conserved. Prepared line-height coverage is now **11 groups / 688
  observations**, leaving **34 / 1,657** for ancestry/observation-stage review.
  This establishes an application/plugin input omission, not the cause of
  black-ring, swapped-handle, travel or gesture symptoms. No candidate computed
  line box or rendering equivalence is inferred. Helpers remain outside the
  production exporter; canonical counts are unchanged. Export PID 4632 was
  live at 2,139.30 CPU seconds; next reconcile its terminal output before
  changing shared producer dependencies or accepting a new generation.
- Normal line-height follow-up: authenticated all **156 slider-thumb observations**
  (78 per owner) and both original tree hashes per case. Every native thumb has
  the active `button, input, select` reset with explicit `line-height: inherit`;
  native scalar values compute to `normal` while candidate scalar line-height
  remains omitted. This is not a no-request/default population. The existing
  `audit-material-range-font-reset.mjs` proof establishes font-size inheritance,
  not line-height equivalence; reuse its owner paths but do not extend its claim
  without a line-height proof. Captured declarations are expanded longhands:
  font-shorthand alias detection alone does not explain this exception.
  Read-only original-report/tree-hash check passed, **156/156, exit 0, 1.52 s**.
  A broader exploratory survey recheck failed its membership assertion (24 vs 8)
  because it omitted accepted row state filtering for divider text. Its totals
  are invalid and were not imported. Next survey replay must filter `row.states`
  before checking counts. Remaining work is still the 36 normal/omitted groups,
  prepared tracking/line-height integration, other unresolved property families,
  source reconciliation and final canonical/browser gates. Prioritize request
  ownership and overlay ancestry before accepting default-like values.
  Corrected export PID 4632 was revalidated live at 1,718.78 CPU seconds; leave
  its dependencies unchanged until terminal, then reconcile before import.
- Remaining explicit line-height host requests are now prepared: **three groups /
  124 observations** (toolbar 52, paginator 52, spinner 20). Original nodes are
  textless; toolbar/paginator own active typography tokens computing 28px/16px,
  spinner explicitly requests zero. Candidate host stages/rules omit line-height;
  possible font/all resets are checked rather than assumed absent. Proofs retain
  full native rules, including spinner transition declarations. No descendant
  consumption, token sensitivity, motion activity or graphic text-placement effect
  is inferred. Existing population suite passed **1/1, 27.50 s**, including a
  candidate font-shorthand negative control and raw/unrelated-row conservation.
  Nine line-height groups / **532 observations** now have prepared logic; the
  remaining **36 groups / 1,813 observations** are normal-versus-omitted and need
  the existing ancestry/observation-stage review, not a repeated value census.
  These helpers remain outside production while corrected wrapping export PID
  4632 runs (1,195 CPU seconds at this checkpoint). Canonical counts are unchanged.
- Button-toggle host line-height distinction is now proved across **136 original
  observations**: native textless hosts and nested buttons compute 20px; label
  rules override this with control-height tokens, producing 40px (102 observations)
  or 24px (34). Candidate label normal/effective/retained values match those label
  values, while candidate hosts omit the host request. Prepared two scalar host
  classifications retain both rule sets, complete owner paths and label proof
  hashes. They do not approve fixed authoring as token equivalence or infer glyph
  placement. Copying host 20px onto the label is explicitly rejected by a negative
  control. Reused the existing host/metric helper and full population test:
  **1/1 passed, 27.28 s**, with raw/unrelated rows conserved. Together with the four
  component labels this prepares six line-height groups / 408 observations;
  canonical counts remain unchanged. Next prioritize toolbar/paginator host
  tokens and spinner zero, then the 36 normal/omitted groups. Export PID 4632 is
  still live; no producer dependencies changed.
- Line-height scope refreshed from accepted baf0ccb8: **45 unresolved groups /
  2,345 observations**, not the historical 49 / 2,524. Signatures are normal /
  omitted (36 / 1,813), 20px / omitted (6 / 408), 28px / omitted (1 / 52), 16px /
  omitted (1 / 52), and zero / omitted (1 / 20). Four labels (checkbox, both radio
  labels, slide-toggle) already have independently replayed retained omission
  proofs; their **272** complete hashes now bind prepared scalar classifications.
  Reused the existing tracking metric join with a property parameter, not another
  collector. Native token 20px versus retained normal remains an unequal request,
  not a normal-to-pixel conversion or glyph-paint diagnosis. Raw/unrelated rows
  stay unchanged; a forged retained 20px is rejected. Existing population suite
  passed **1/1, 28.64 s**, including all earlier tracking checks. New helper remains
  outside production and does not alter the running export. Next handle the two
  button-toggle host line-height rows, toolbar/paginator hosts and spinner zero
  separately from the 36 normal/omitted groups, reusing captured owners. Do not
  repeat the completed scalar census. Canonical classifications remain unchanged.
- Corrected cold wrapping export launched from **29edf43**, session **25438**,
  with all five retained evidence inputs through the named launcher. Log:
  `artifacts/material-parity/wrapping-export-29edf43-complete-inputs.log`.
  Check the existing process/session before any retry; do not change its producer
  dependencies while it runs. The baf0ccb8 compact generation is still accepted;
  no replacement is accepted until conservation and reconciliation complete.
- **Export source-binding failure resolved and independently checked.** The added
  wrapping browser diagnostic now lives in `tab-panel-wrapping-audit.spec.ts`;
  its body is byte-identical to the previous test. The historical typography spec
  again has its original `1d6bf44d…` hash; no frozen evidence or validator was
  weakened. Wrapping proof references and the producer fingerprint list include
  the separate diagnostic; predecessor restoration retains its strict full hash.
  Verification: tab proof + producer transition **18/18, 4.83 s**; reviewed-input
  source binding **6/6, 110.25 s**, independently restoring all 134 groups / 3,325
  observations; wrapping integration **6/6, 67.57 s**; both browser diagnostics
  **2/2** in Chrome Headless 153 / Babylon 8.56.2; showcase development `ng build`
  passed in **21.88 s**, two prerendered routes. Existing Zone.js and historical
  font URL warnings remain; the wrapping diagnostic loads its explicit font.
  Logs: `wrapping-receipt-binding-32f1a71.log`, `wrapping-split-focused-32f1a71.log`,
  `tab-panel-split-browser-32f1a71.log`, `tab-panel-split-build-32f1a71.log` under
  `artifacts/material-parity`. No renderer/reference fixture changed. Next run
  the complete-input export once, then all existing wrapping conservation,
  section/source reconciliation and compact verification before acceptance.
- Explicit zero-normalized tracking tokens now have a focused proof for **112
  observations**: toolbar-title 40 inherits its token from an ancestor; card-title
  40 and dialog-title 32 declare theirs directly. Native computed `normal` does
  not erase the authored variable expression; all candidate captured paths omit
  tracking requests. The proof retains full declaration traces, including motion
  for the 32 dialog observations. Token sensitivity and current glyph paint remain
  unmeasured, and no canonical classification was changed. Existing population
  suite passed **1/1, 21.04 s**, including changed candidate stages and token
  declaration rejection. Initial negative control selected an unrelated pooled
  rule and failed to throw; corrected it to the exact traced owner's rule index.
- **Wrapping export is terminal and rejected**, not ready for compact import.
  PID 3780 is absent; its log reports two errors: independently bound reviewed
  input evidence missing, and **1,164** unresolved groups rather than the expected
  1,030. Evidence-session verification itself passed (1,205 files, zero invalidation).
  Failed output is preserved under
  `artifacts/material-parity/wrapping-export-9a7f2d7-invalid-binding/`; current
  `docs` generated outputs still contain that rejected proposal. The accepted
  compact snapshot remains baf0ccb8. Do not commit/import the rejected output.
  Streamed `reviewedInputs.binding.error` identifies the frozen tab-panel proof.
  Replaying `collectTabPanelInputs()` and recursively comparing with
  `docs/material-tab-panel-inputs.json` finds **exactly one difference**:
  `/sources/2/sha256`, old `1d6bf44d12422208a523501b13b374faa8a127b6ed3b20d60a3eb766d385bce0`,
  current `cae41ea0e442f07b0cc3f9ff5ead1016e4c13de02a5e57ed7e1b0d2f6a0a84ed`.
  The appended wrapping browser test changed the historical typography spec's
  whole-file receipt. Source replay rejects all 134 reviewed-input groups, exactly
  explaining 1,164 minus 1,030. No original findings or plugin source changed.
  **Next priority:** isolate the added wrapping diagnostic from the frozen
  typography spec (whose original test body is unchanged), preserving both tests
  and their browser proof; update wrapping diagnostic references/fingerprints.
  Run the existing tab proof and reviewed-input source-binding checks before any
  new export. Do not merely update or waive the frozen hash, and do not rerun the
  expensive exporter until the source-binding failure is independently resolved.
- Zero/omitted tracking next action is now narrowed using the **existing**
  `inspectOwnerInitialStyle` survey, evaluated in memory with only
  `letterSpacing: 'normal'` added to its initial-value candidates. No production
  file or active export dependency changed. Original full trees were collected;
  scalar membership used accepted baf0ccb8 rows and their state boundaries.
  Result: **25 groups / 1,470 observations** pass the survey's captured-surface
  ancestry, exact owner/stage and no-request guards. Six groups / 302 observations
  require motion review (badge count, both chips, tab panel, both progress owners);
  two / 80 retain explicit tokens (toolbar/card titles); four / 125 require owner
  mapping (sheet overlay, snackbar overlay/surface, dialog panel); two / 64 require
  overlay ancestry (dialog actions/title). Total remains 39 / 2,041.
  This is routing evidence, not a provenance receipt or canonical classification:
  external inheritance, candidate computed tracking and current paint are not
  established. Next add a separate opt-in tracking mode to the existing survey
  and its existing negative-control tests **after the wrapping export terminates**;
  preserve the historical survey population and all 14 non-passing groups. Reuse
  the existing attribution path for the proven captured-stage scope, rather than
  creating a new survey/report framework or repeating this census. The diagnostic
  completed with exit 0; export PID 3780 remains live (CPU 2,345 s at this check).
- Button-toggle tracking boundary is now prepared for **two host groups / 136
  observations**. Both mapped hosts are textless; the native Material host's
  explicit token computes 0.096px, its nested button/span compute normal, and the
  candidate direct label retains zero. The unequal host request is classified
  separately from glyph tracking: copying 0.096px onto the label would not be
  justified by this evidence. Complete paths and retained comparison hashes are
  preserved; uncaptured reset cause, candidate computed defaults and current
  paint remain unproved. The existing tracking population suite passed **1/1,
  23.11 s**, including controls rejecting host text, changed label tracking and
  a wrong host ancestry. All raw rows and previous classifications are conserved.
  Together with the five-label join, this prepares all seven nonzero groups /
  476 observations without changing canonical counts or exporter dependencies.
  Next address the 39 zero/omitted groups with the already recorded request/motion
  boundaries, not a new census; first reconcile the wrapping export when terminal.
- Tracking scalar/retained join is now prepared for five label groups / **340
  observations**, using the existing `applyModalBoxReview` infrastructure and
  independently replayed retained typography. Exact native/candidate identities,
  all scalar fields, three declaration stages and complete retained-proof hashes
  bind each classification. Negative controls reject wrong owners/ancestors,
  altered retained tracking, invented current-paint verification and forged proof
  hashes. Focused population suite passed **1/1, 24.50 s** (no skips):
  `node --test tests/material-parity/tracking-input-populations.spec.mjs`.
  Raw rows and unrelated classifications are conserved. This closes the scalar
  join question for these labels, not the host-boundary or zero-token questions.
  `tracking-input-review.mjs` is not a production dependency yet; integration
  waits for the active wrapping export and its reconciliation. Canonical counts
  remain unchanged. Prioritize that reconciliation, then remaining tracking
  host/token boundaries, followed by shared box-sizing/line-height/grid gaps;
  preserve the final complete coverage and enforced-browser requirements.
- Wrapping milestone export was launched from source commit **9a7f2d7**, session
  **35804**, child PID **3780** (now terminal; failure disposition above).
  Command: `ASTYLAR_AUDIT_COLD=1 node scripts/export-material-input-audit-current-ancestry.mjs`.
  All five required capture/line-box/supplemental inputs are present. Log:
  `artifacts/material-parity/wrapping-export-b99f957-integration.log`.
  Do not start a duplicate or change exporter dependencies while it runs.
  The accepted snapshot below remains authoritative until reconciliation.
  The existing conservation command now supports `--wrapping`, authenticating
  baf0ccb8 as predecessor, replaying original cases, and permitting exactly the
  six wrapping attribution populations (30 groups / 1,478 observations), plus
  independently checked producer-only control receipt changes. Its negative
  controls reject joint raw-input forgery, membership changes, unrelated metadata,
  false equivalence and changed controls. Full conservation unit suite passed
  **22/22, 73.93 s** (`node --test tests/material-parity/position-canonical-conservation.spec.mjs`).
  Next, after the exporter terminates: run
  `node scripts/check-material-position-canonical-conservation.mjs --wrapping`,
  existing section-digest and source/metadata reconciliation, then compact import
  and verification only if those checks explain every change. The conservation
  command/spec are not exporter dependencies; no running inputs were edited.
- Accepted canonical: **baf0ccb8**, 1,060 unresolved groups (previous ef6da409:
  1,096). Compact import and verification passed: 8,483 discrepancies, 134 source
  findings, 39,904 controls, 389,202 occurrences, 70,612,013 compact bytes. Index
  SHA-256: `00e5b5296d3d4af5ee27086fc41db3fbc21238bb6ee8b6a36315be68d25d60e0`.
  The standalone manifest is retained beside its immutable working snapshot. The rejected
  19b21ace output remains retained as failed evidence, not accepted evidence.
- Next typography question narrowed read-only while the wrapping export runs:
  the accepted compact snapshot has **46 unresolved letter-spacing groups / 2,517
  observations**, not the older 48-group count. Of these, 39 groups / 2,041
  observations compare normalized native zero with omitted local declarations;
  do not infer equivalence from that signature. Seven groups / 476 observations
  have nonzero host/label tokens. Original-capture replay using the complete
  inventory and existing `collectRetainedTypographyEvidence` matched all **340**
  accepted complete-row hashes for five label groups: checkbox-label,
  radio-solo-label, radio-team-label, slide-toggle-label, expansion-title.
  They already carry `reviewed-omitted-component-text-metric`: native 0.256px
  (first four) / 0.144px (expansion), retained zero, normal/effective omitted.
  No classifications changed. Next extend the existing scalar/retained join
  with exact owner/stage membership and negative controls, reusing these proofs.
  The other two nonzero rows are button-toggle hosts (136 observations). Across
  all 68 captures both nested labels instead have reference/retained zero and
  omitted normal/effective values. The full native ancestry population explains the
  distinction: mat-button-toggle computes 0.096px from Material tracking tokens,
  but its nested button and span compute normal, with no captured author tracking
  rules on those descendants. Do not join host token values to leaf zero by
  assumption or call it a core spacing failure. The new focused regression
  `node --test tests/material-parity/tracking-input-populations.spec.mjs` passed
  **1/1, 15.58 s**: all seven groups / 476 observations bind exact scalar member
  counts, owner identities, every scalar style field, the three candidate stages,
  accepted retained-proof hashes, and actual host-to-button-to-label ancestry.
  All 136 native host token rules remain explicit; no captured active author rule
  supplies tracking or an all-reset on the nested button/span. This does not infer
  an uncaptured UA rule or glyph paint equivalence. The first run failed because
  the full-tree style record contains extra properties beyond the 89-field scalar
  view; the test now binds every scalar field without requiring those schemas to
  have identical keys. Classifications remain unchanged pending scalar join and
  separate host-boundary review. This new proof is not yet a producer dependency;
  no capture or source used by the active export was changed.
  The same test now covers **all 46 groups / 2,517 observations**, passing
  **1/1, 23.17 s**. The remaining zero/omitted rows split into 28 groups / 1,563
  observations with no captured tracking/reset or motion requests, eight groups /
  366 with motion only, two groups / 80 with tracking tokens only, and one group /
  32 with both. Explicit tokens resolving to zero belong to toolbar-title (40),
  card-title (40), and dialog-title (32); zero is not evidence of unauthored input.
  Initial read-only membership matching found 52 badge-count cases against a
  40-case unresolved row: its 12 static cases are already separately classified.
  The test binds state membership as well as values and validates the exact case
  sample/count, preserving those settled static rows. Next reuse the 340 retained
  label proofs for the scalar join; handle the 112 explicit-zero-token and 136
  button-toggle host observations separately from the no-request population.
  Motion and observation-stage signatures remain routing evidence, not approved
  computed defaults or rendering equivalence. No new export was started.
- Corrected export **57045 / PID 21308 is terminal**, source **00f8133**.
  Candidate **baf0ccb8** has 1,060 unresolved groups, 8,483 raw groups / 389,202
  observations, 134 source findings, and complete 436 static / 1,875 interaction
  coverage. Its only validation error is the 1,060 unattributed groups. Evidence
  session rechecked 1,205 files with zero invalidation. Use the complete-input
  launcher `node scripts/export-material-input-audit-current-ancestry.mjs`;
  never substitute a parity-report-only invocation. Log:
  `artifacts/material-parity/authored-typography-export-complete-inputs-00f8133.log`.
- Conservation **83965 passed**: exactly 36 groups / 1,951 observations changed,
  all raw inputs and non-receipt control evidence conserved, one scalar and 48
  control source receipts refreshed. Metadata comparison **79374 passed**: all
  **475** LF-normalized source hashes match disk (five added, six changed, 464
  unchanged, none removed). Added/changed sources belong to the already reviewed
  typography/overflow batch. Non-source metadata changes are exactly 48 control
  receipt hashes, four classification/remaining totals, one caret source hash,
  and two reviewed-source binding hashes. Outputs:
  `authored-typography-{conservation,sections,metadata}-dd5a1fc.json` under
  `artifacts/material-parity`. Section comparison **8686 passed**: all 79 sections
  retained, 72 unchanged; the seven changes are sourceFingerprints,
  controlLineBoxes, summary, discrepancies, ownerCaretInputs,
  reviewedSourceBatchInputs and controlTypography, all explained by the checks
  above. Compact import **2927** and verification are complete. No export or
  reconciliation process remains active. This is accepted incremental audit
  evidence, not full audit completion or rendering equivalence.
- Wrapping preparation is outside that export: all 30 groups / 1,478 original
  observations have repeatable checks; **all 30 groups / 1,478 observations** now
  have classification logic integrated behind bound original-capture provenance.
  The production-boundary replay changes exactly 30 groups / 1,478 observations,
  conserves all 8,483 raw rows and every unrelated row, and yields 1,030 unresolved
  groups. This is a tested proposal, not yet an accepted canonical export.
  Next export/reconcile this coherent batch; do not rebuild per metadata row.
  These classifications retain unequal inputs
  and uncertainty; they do not establish rendering equivalence.
- Table follow-up: all 52 original owner paths have the same pattern: the native
  table alone explicitly supplies collapse/wrap, all native ancestors compute
  normal, candidate captured ancestry omits wrapping, and neither side has motion
  requests. Source inspection locates text inheritance in renderer.service.ts
  and the normal fallback in TextStyleParserService. This is not yet proof of
  equivalent table-descendant consumption; do not infer it from a host omission.
  The 52 host rows now have a guarded observation-stage classification preserving
  the explicit native request and false computed/inheritance/descendant/equivalence
  flags. Focused table/tab test passed **1/1, 2.78 s**, including reset/motion,
  changed native wrapping and forged descendant-consumption negative controls.
  Do not repeat the completed owner-path census.
- Private tab-panel wrapping ownership now has a package-root browser proof in
  `examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts`.
  At matched 100px width, loaded Roboto 16px and 20px line height, native normal
  wraps into two lines and nowrap stays on one. The bound plugin texture receives
  the complete label at one baseline for both requests; its 200px backing texture
  uses 32px text whose measured width exceeds the texture. This confirms private
  plugin wrapping ownership, not shared-renderer failure or raster equivalence.
  All 70 original mapped childless plugin owners now have guarded classification
  logic; negative controls reject an ordinary div replacement and a forged core
  cause. Candidate computed wrapping and motion equivalence remain unverified.
  Chrome Headless 153 / Babylon 8.56.2 passed **2/2** browser diagnostics, including
  resource cleanup; the development build passed with two prerendered routes.
  Commands from `examples/material-showcase` (NG_BUILD_MAX_WORKERS=1):
  `node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include=src/app/material-plugin/tab-panel-input-audit.spec.ts`
  and `node node_modules/@angular/cli/bin/ng.js build --configuration development --source-map=false`.
  Logs under `artifacts/material-parity`: `tab-panel-wrapping-font-bound-346f6ff.log`
  and `tab-panel-wrapping-build-346f6ff.log`. Initial font-loading failure is retained
  in `tab-panel-wrapping-346f6ff.log`: a missing /base/media font URL, corrected in
  the diagnostic by loading the existing /audit-fonts asset. Existing Zone/zoneless
  and Sass warnings remain; no fixture font or renderer was changed. This changed
  diagnostic's source receipt must be refreshed at the next coherent export; the
  accepted package's source-hash match above describes its reconciliation time.
- Latest focused verification: `node --test tests/material-parity/wrapping-input-populations.spec.mjs`
  passed **6/6, 47.55 s** after production integration. The new test executes the
  actual production wiring with bound/unbound inputs, replays validators, checks
  the missing-provenance rejection and preserves all raw values/occurrences.
  `node --test tests/material-parity/position-composition-producer-transition.spec.mjs`
  passed **16/16, 3.23 s**: reversing only the exact wrapping additions reproduces
  the complete accepted producer hash `bc16b5e694461acdc18580fa5fcd1169abc752dd78c80d841fb170a9587fe3cc`.
  Initial run was 15/16: an old line-box negative control still targeted the old
  argument name and therefore mutated nothing. It now targets the current call
  and explicitly asserts the target exists before mutation. No renderer or
  fixture changes. The overall audit still includes other scalar families,
  final canonical reconciliation and enforced full browser acceptance.
- Chip label boundary strengthened: **152/152** original nested labels explicitly
  request native collapse/nowrap; candidate captured ancestry, applicable rules,
  inline declarations and retained label records omit the wrapping request.
  `node --test --test-name-pattern='chip host normal' tests/material-parity/wrapping-input-populations.spec.mjs`
  passes **1/1, 4.52 s**, including mutation rejection for candidate requests/resets
  and a changed native wrapping request. This establishes missing authored label
  input, not candidate computed normal or a core wrapping defect. It does not
  independently classify the two host scalar groups or waive motion review.
  Reuse the completed export and reconciliation; do not restart them for this work.
- Chip host classification now separately binds **two groups / 152 observations**
  to the computed-native versus local-candidate observation boundary. Exact host
  ancestry retains the active native noopable rule's transition-duration and
  animation-duration of 1ms; no transition target or animation name is inferred
  from duration alone. Motion targets, settlement, indirect effects and candidate
  computed wrapping remain explicitly unverified. Each host proof embeds the
  nested-label omission above, so a normal host value cannot conceal that defect.
  The focused chip test passed **1/1, 5.29 s** with changed duration, added target,
  inactive rule and forged settlement negative controls. Full original row counts
  are bound and unrelated compact rows remain unchanged. No new browser capture
  is needed to establish this observation-stage boundary; no motion or renderer
  equivalence is claimed. Production integration is tested; export is pending.
- Dialog wrapping motion boundary resolved for **six groups / 192 observations**:
  empty CSSOM transition longhands retain variable-dependent shorthands in
  `cssText`. Exact active same-sheet higher-specificity noopable overrides supply
  `transition: none`; remaining captured targets are none/box-shadow and animation
  names none. Preserve original declarations and false settlement/indirect-effect
  flags. The host rows classify only different observation stages, not equivalent
  rendering or candidate computed defaults. Negative controls reject inactive or
  changed overrides, changed shorthand, changed sheet/order and named animation.
  Initial focused attempts rejected unhandled animation longhands; review now
  admits only the known fields with explicit animation-name none. Full suite
  passes; wrapping changes still await the milestone export/reconciliation.
  The accepted baf0ccb8 package does not include them.

### Supporting checkpoint history (not current process status)

**Six non-motion overlay host groups prepared:** full original evidence shows
no captured wrapping/reset or motion requests for 168 bottom-sheet/snackbar
host observations. The existing scalar review mechanism classifies only the
computed-host/local-declaration observation-stage discrepancy. It preserves
59 z-index rule gaps, nested bottom-sheet nowrap label obligations, and false
candidate-computed/external-inheritance/rendering-equivalence flags. Relevant
request/reset/motion mutations and forged computed-value claims are rejected.
Dialog's 192 observations instead contain empty CSSOM transition longhands and
noopable declarations; they were not swept into this no-motion classification.

**All 30 wrapping populations now have repeatable original-evidence checks:**
`node --test tests/material-parity/wrapping-input-populations.spec.mjs` passes
5/5 in 21.41 s, covering 1,478 observations without a new capture. The last
634 comprise chips (152), twelve overlay hosts (360), table (52), and tab panel
(70). Overlay checks preserve all 59 exact z-index scalar/tree rule gaps and
all 50 nested bottom-sheet labels whose nowrap differs from their normal host.
No relevant wrapping/reset request appears on the captured overlay owner paths;
motion, external inheritance and computed candidate values remain unapproved.
Table explicitly declares collapse/wrap on `.mat-mdc-table`; do not describe it
as an absence of native authoring. Tab panel has private plugin type, no text
children, no core retained/control paint record and matching semantic content;
reuse its existing public plugin reduction, not an ordinary-text default proof.
The first fourteen groups / 844 observations have prepared classifications;
the other sixteen still need appropriately bounded classification. Tests of
their observation boundaries are not equivalence or final audit acceptance.

**Native-nowrap omission batch prepared:** `wrapping-input-review.mjs` now
reuses the same scalar application/replay mechanism for eight groups / 500
observations. Original native ancestor collapse/nowrap rules, exact owner types,
all local stages, and candidate ancestry are checked; relevant candidate inline,
alias, reset, or possible-rule requests reject an omission claim. The synthetic
root is excluded from computed/default claims. Only the 192 tab/toolbar-action
observations carry independently checked normal control-paint values. The
other 308 keep paint/computed/inherited behavior unverified. All raw and unrelated
rows remain unchanged; mutation checks reject forged membership, equivalence,
native requests and newly introduced candidate wrapping/reset rules.
Focused suite: 3/3, 14.47 s. Combined with explicit substitutions, fourteen
groups / 844 observations are prepared, not canonically integrated. The live
00f8133 export does not import this module or its test. Continue the remaining
normal/omitted wrapping review without treating host defaults as label parity.

**Six explicit wrapping groups prepared for integration:** the already-tested
owner proof was moved (not duplicated) into `wrapping-input-review.mjs` and
connected to existing `applyModalBoxReview` application/replay validation.
The focused population suite passes 3/3 in 8.01 s: exactly six groups / 344
observations receive unequal-authoring metadata; raw rows and unrelated rows
remain unchanged. Mutations of membership, equivalence flags, and selector
evidence are rejected. This preparation is not imported by the production
exporter and does not change the accepted canonical count. After the live
complete-input export is reconciled, integrate this with the remaining wrapping
batch rather than launch another canonical build for six metadata rows alone.

**Corrected cold export is live:** session **57045**, launcher PID **22792**,
exporter PID **21308**, launched from **00f8133** with all five evidence arguments.
Log: `artifacts/material-parity/authored-typography-export-complete-inputs-00f8133.log`.
Initial phase is build-audit. Keep producer/evidence dependencies unchanged,
poll this same handle, and do not restart based on quiet output. Subsequent
wrapping tests and this ledger are outside the export dependency inventory.

**c8b3ceb export rejected; invocation failure, not renderer regression:** session
96508 / PID 5144 is terminal (exit 1, 1,992.22 s). It omitted the three line-box
reports and supplemental root, repeating the previously recorded incomplete-
invocation failure. Result: 1,072 unresolved groups, 791 unclassified control
observations, missing 120 static / 671 interactive normal-line-box observations,
13 computed contexts, and unbound supplemental evidence. Its manifest/payload/
Markdown are preserved under
`artifacts/material-parity/authored-typography-export-c8b3ceb-missing-inputs/`;
compressed SHA is `19b21ace12f21ea3d0c2d064bfc83aa8ab7461dadfe834fd981163895b673db3`.
The log remains `artifacts/material-parity/authored-typography-export-c8b3ceb.log`.
The accepted pointer remains ef6da409; do not import the rejected docs output.

Use `node scripts/export-material-input-audit-current-ancestry.mjs` for the
corrected run. This small launcher fixes the complete five-path invocation,
checks file/directory existence before expensive work, forwards cold/progress
settings and failure status, and offers `--dry-run` / `--check`. It does not
weaken validation or authenticate inputs by existence alone. Syntax and dry-run
checks pass; all required paths exist. After a corrected terminal result, inspect
all errors before `--authored-typography` conservation and section/source
reconciliation. The intended result is 1,060 unresolved, not audit completion.

**Explicit nowrap history resolved:** card title/copy, paginator size/range,
and slide-toggle label already authored nowrap in the original showcase commit
`2f440115740ff76fa9e55b3f4a11568207b2af5a`. Checkbox label nowrap was introduced
by `c47d589ac2cf1967cc321df38339cb64dabb3732`, alongside replacing the native
checkbox input with a composed flex control, separate box and label. Later
card-flow (`1d74a0f1`) and paginator-flex (`7843582d`) changes retained nowrap
from their absolute-positioned predecessors; switch state-layer (`f566f807`)
and checkbox typography (`88d1090b`) edits also retained it. Verified using
selector-filtered Git patch history and the actual introduction diffs, not
latest-line blame alone. These are persistent unequal fixture inputs; this
history does not demonstrate that nowrap itself was deliberately introduced
to conceal a specific renderer failure. Preserve that distinction when binding
the six wrapping classifications. No fixture changes are authorized here.

**Wrapping population checks are now executable:**
`node --test tests/material-parity/wrapping-input-populations.spec.mjs` passes
3/3 in 6.36 s. It authenticates the original capture, reuses the full-tree
inventory and mapped aliases, and checks complete membership against accepted
ef6da409 compact rows: six explicit substitutions / 344 observations and eight
native-nowrap/local-omission groups / 500 observations. The explicit-substitution
check rejects removed author rules, forged normal-stage values, and altered
reference computed values. The omission check preserves all captured ancestry
and excludes the unstyled synthetic root from inherited-value claims. It now
also checks actual core-control-texture whiteSpace normal for all 192 tab and
toolbar-action labels, using the inventory-global paint-style index. The other
308 owners have no direct control-paint record; badge retained-text omission
remains a separate stage. The initial text-identity assertion used textContent
and correctly failed; these buttons author their label through value, and the
corrected identity check passes for the full population.

**Nested chips wrapping is not captured by host defaults:** all 152 chip hosts
compute normal natively, but their nested `.mdc-evolution-chip__text-label`
spans declare collapse/nowrap and compute nowrap. Each corresponding candidate
`chip-0-label` / `chip-1-label` is a direct span child with identical text but
omits whiteSpace in all three local stages and retained core-text-registry
styles. There is no direct control-paint record for those spans. The third test
checks the complete 76-case population and native rule/owner/text identity.
Thus even a future host initial-value classification must retain this nested
label translation gap; it cannot establish chip wrapping equivalence. Actual
long-text wrapping/raster consequences remain unproven. This is not a new
confirmed renderer defect.

No new capture or canonical classification was made; this closes the
repeatability gap in the previous read-only population investigation. The new
spec is not an input to the live c8b3ceb export. Next: integrate guarded
classifications after that export and reconciliation finish, then handle the
634 normal/omitted observations using the owner-specific routes below.

**Remaining normal/omitted wrapping review routed:** the existing conservative
owner survey does not directly accept any of the 16 groups / 634 observations.
This is not evidence of 634 renderer defects. Chips (152) are gated only by
captured 1ms animation/transition declarations; table (52) explicitly declares
`white-space-collapse: collapse` / `text-wrap-mode: wrap`; tab panel (70) has
ancestor motion declarations and the already-proven competing plugin text path.
Use the existing motion review and plugin finding, rather than repeat either
investigation or broaden the default survey to ignore these distinctions.

The other 360 observations belong to twelve overlay owners. Reusing the existing
alias and declaration-path inspectors establishes native normal throughout the
captured ancestry and candidate local omission at all captured non-synthetic
stages. No wrapping/reset request appears on those reference paths. Nine
bottom-sheet/dialog owners plus snackbar surface map without rule gaps (301
observations); bottom-sheet-overlay (25) and snack-bar-overlay (34) retain the
explicit scalar/tree rule gap for `.cdk-global-overlay-wrapper { z-index: 1000 }`.
Do not erase that unrelated gap or treat missing candidate computed values as
verified normal. Outer bottom-sheet anchor values also do not establish its
nested nowrap label's equivalence to the flattened candidate button.

Checks: read-only Node survey over the hash-pinned original capture (3.09 s),
followed by the existing full-tree inventory/owner-path join (5.14 s, inventory
errors empty). The first join deliberately requiring gap-free identity failed
on bottom-sheet-overlay; the second retained and reported both rule-gap
populations instead of discarding them. No canonical classification changed.
Next: reuse these exact owner populations in the wrapping batch, retaining
motion, nested-label and plugin obligations separately. No new framework or
capture is needed. Export session 96508 / PID 5144 was confirmed live in
validate-audit (CPU 1161.80 s, RSS 3.80 GB); reconciliation still waits for its
terminal result.

**Next wrapping batch scope established read-only:** the accepted compact index
contains 30 unresolved whiteSpace groups / 1,478 observations. Original-tree
checks separate six explicit candidate-nowrap substitutions (344 observations)
from eight native-nowrap/local-candidate-omission groups (500). The remaining
16 normal/omitted groups (634) require separate owner/default review; do not
infer equivalence for plugin text, flattened controls or containers collectively.

The six explicit substitutions are card-title/copy (52 each), paginator-range/
size (52 each), checkbox-label and slide-toggle-label (68 each). All original
scalar/tree pairs retain native normal and candidate nowrap at all three local
stages. Captured author rules are `.card-title`, `.card-copy`,
`#paginator-size, #paginator-page-size, #paginator-range`, `.checkbox-label`, and
`.switch-label`. Paginator owners use the existing exact mapped alias proof;
others use direct measurement IDs. Unequal element types remain explicit.

The eight native-nowrap groups are tab-overview/activity (70 each), toolbar-
action/primary (52 each), badge-count (52), and button-toggle one/two/primary
(68 each). Beyond the tab proof below, full populations show collapse/nowrap
declarations in `.mat-toolbar-row, .mat-toolbar-single-row`, `.mat-badge-content`,
`.mat-button-toggle`, and `.mat-button-toggle-standalone, .mat-button-toggle-group`.
Toolbar action additionally has 52 actual control-paint normal observations.
Badge uses the existing mapped alias; toggle/root wrappers do not have direct
control-paint records, so no paint value is invented for them. Next: turn these
original population/source checks into guarded wrapping classifications after
the live export closes, reusing the existing owner-declaration and scalar review
helpers. No fresh capture, full report, or parallel framework is required.

**Cold export in progress:** session **96508**, Node PID **5144**, from pushed
commit **c8b3ceb**. Log: `artifacts/material-parity/authored-typography-export-c8b3ceb.log`.
Latest live check remains build-audit, CPU 286.625 s / RSS 2.67 GB. Keep source
inputs unchanged during this evidence session; quiet output is not termination.
After it finishes, use `--authored-typography` conservation, all-section/source
reconciliation and compact import/verify. Accepted pointer remains ef6da409.

**Read-only next-question result (not in this export): tab nowrap omission.** All
70 original tab cases / 140 label instances have a native span three ancestors
below role=tab. The `.mdc-tab` active rule contributes `white-space-collapse:
collapse` and `text-wrap-mode: nowrap`; the role owner and leaf compute `nowrap`.
Every captured candidate ancestor style stage omits whiteSpace (synthetic root
has no style evidence and is explicitly excluded from that claim). All 140
candidate labels have core-control-texture paint evidence with whiteSpace
`normal`, not nowrap. Thus these two unresolved scalar groups are not an initial
value equivalence or merely differently measured boxes. Current source agrees:
`TextStyleParserService` defaults to normal; ButtonManager passes the unbounded
three-argument text call. Short single-line output cannot establish equivalent
wrapping behavior. This extends the known tab-label flattening investigation;
no fresh core cause or responsive wrapping failure is claimed. Next: bind the
complete ancestry/rule/paint population and negative controls using existing
tab scalar review infrastructure after the active export closes. No new capture,
canonical classification, or renderer/fixture edit was made for this check.

**Combined batch ready for cold export:** production application/validation now
includes 24 button initial-overflow groups (1,432 observations) and 12 typography
groups (519). Full original-membership replay preserves all 8,483 raw scalar
rows and unrelated metadata; proposed unresolved count is **1,060**. Accepted
canonical remains **ef6da409 / 1,096** until export and reconciliation complete.
The overflow conclusion is limited to initial value/no-own-clipping branch, not
structural, scrolling, ancestor-clip or raster equivalence. All ten applicable
source/spec/runner fingerprints are pinned and checked before reuse.

Verification: production replay + complete predecessor checks **16/16**, 24.28 s;
extended conservation negative controls **21/21**, 62.25 s; browser button
overflow sensitivity **1/1**, 1.35 s; exact core NullEngine clipping test **1/1**.
The existing conservation command now supports `--authored-typography` for this
36-group / 1,951-observation batch against ef6da409. After cold export: run it,
compare all sections, explain refreshed control/normalization/source receipts,
verify source fingerprints, then import/verify the new compact snapshot. Do not
mark a generated snapshot accepted merely because its expected unresolved count
is 1,060. No final browser gate or full audit completion is claimed.

**Button core clipping question answered:** `node scripts/audit-button-overflow-core.mjs`
passes the exact new Jasmine/NullEngine test (one test, 2.85 s on retained runner
replay). It bundles only local spec dependencies in memory and imports installed
packages normally. Actual ButtonManager preserves the oversized label mesh and
does not constrain its text call; omitted/visible overflow introduce no own clip
planes, while hidden does. Shared clip projection is exercised, not mocked away.
The earlier in-memory session 85211 also passed and is terminal. This is focused
core evidence, not Angular compilation, DI, browser clipping raster, ancestor
clipping or full rendering equivalence. The standard build attempts remain
cancelled, not passing. No generated bundle or successful scratch is retained.
Next: bind this unchanged implementation/spec/runner and the browser initial-value
proof to the verified 716-button population, then integrate the pending 24
overflow groups alongside the 12 typography groups before canonical export.

**Typography pipeline integrated, not exported:** twelve pending groups / 519
observations (tabs 420, toolbar/disabled buttons 99) now use the verified bridges
in production application and validation. Validation independently regenerates
the original control proofs before scalar replay and rejects altered stored
paint evidence. Focused production-fragment replay and all predecessor transition
checks pass **16/16 in 18.88 s**. The predecessor is byte-identical to accepted
9e90a85 after removing only the reviewed additions. One old negative-control
expression was updated to target the new variable; its failure condition remains.
Fingerprint/export reconciliation is now pending for these code changes; accepted
canonical stays ef6da409 / 1,096 until a coherent batch export is conserved.

**Button core-test build issue:** session 97109 was cancelled before assertions
at 7.77 GB esbuild / 383,680 KiB free memory. A genuinely narrower retry used
`tsconfig.button-audit.json` (extends spec config, includes only the button spec),
session 79982 / Angular 16060 / esbuild 19120. It also reached 8.12 GB before
assertions and was cancelled; both processes are absent. No Angular pass/fail
claim. Retain the tiny failed config and unverified spec for diagnosis. Do not
repeat either build path. An in-memory esbuild diagnostic now externalizes
installed dependencies and runs the exact new NullEngine Jasmine test under Node;
session **85211**, 40,970-byte bundle, is live at the latest poll. This narrower
diagnostic cannot establish browser compilation, font raster or Angular DI parity.

**Button overflow population bound:** all 716 retained native button instances
(12 owners, 24 pending scalar groups / 1,432 observations) have exactly the two
active `.mdc-button` visible-axis requests. Candidate authoring, applicable rules,
and all captured local stages omit overflow. Direct native/candidate button
identity, scalar/tree correspondence and full counts are checked; incomplete
rules, wrong owner kinds, altered axes, hidden inline overflow and candidate reset
requests are rejected. Full `control-overflow-observation.spec.mjs` passes 4/4 in
49.10 s, preserving the previously accepted ordinary-owner/clipping proposals.
This establishes population applicability only, not core clipping or rendering
equivalence. No new classification is integrated yet.

Reduced-memory Angular retry **session 97109**, Angular PID **4168**, esbuild
PID **10076**, is live at the latest poll. Command adds `--source-map=false` to
the focused ButtonManager test. Build still has not reached assertions; esbuild
was 5.27 GB with 1,689,260 KiB free physical memory. Check the same handle rather
than restarting. If it again exhausts memory, change compilation scope/approach
instead of repeating either previous command. The existing overlay audit runner
is package-bound and specific to overlay/radius reductions; it is not a drop-in
runner for this private control spec. The uncommitted control spec remains
unverified. Accepted canonical stays ef6da409 / 1,096 unresolved.

**Next typography binding verified:** the existing scalar bridge now proves six
additional toolbar/disabled-button groups (99 observations) against independently
replayed control evidence in accepted ef6da409. Each scalar native button host
joins its direct label with the same computed property and the exact candidate
control owner. All 99 complete control-row hashes match; raw scalar values and
unrelated rows are conserved. Wrong label/control, altered values/source finding,
and lost case membership are rejected. Combined tab/button focused replay passes
1/1 (54.04 s body, 57.90 s total); existing normal-line-box bridge tests pass 3/3.
This explains existing authoring substitutions, not new renderer causes. The new
bridge is not production-wired or canonically accepted: unresolved remains 1,096.
Batch it with the prepared six tab groups after remaining verification.

Accepted commit 9e90a85 is confirmed on the remote integration branch. Deferred
Angular test session 92832 was explicitly cancelled before assertions: esbuild
grew to 7.39 GB with only 666,304 KiB free physical memory. This is not a test
failure or pass. Its processes terminated. A retry disables source maps to lower
build memory without changing test assertions; revalidate the live session before
starting any replacement. Do not repeat the same memory-exhausting command.

**Snackbar/overflow batch accepted:** all reconciliation and import jobs are now
terminal. Section session 2608 exited 0: all 79 sections retained, 72 unchanged,
seven changes explained by the scalar review and independently checked source/
control receipts; none added or removed. Compact import session 70356 and
`npm run audit:findings:verify` pass. Accepted generation is **ef6da409** (full SHA
below), index SHA
`a25ffe1f2d083f23fafe6e615566544a9aedf7b9559e2084309551568982cca9`.
Counts: **1,096 unresolved**, 8,483 scalar groups / 389,202 occurrences, 134 source
findings, 39,904 control differences; coverage remains 436 static / 1,875
interaction cases. Compact shards total 70,519,280 bytes. Retained gzip has its
standalone manifest, without duplicating payload bytes. Do not restart any of the
completed export/reconciliation/import sessions. This accepts an evidence batch,
not equal rendering inputs or final audit completion.
Next: run the deferred ButtonManager test now that heavy export work is finished;
then combine the pending button-overflow and six-group tab proof bridges in a
coherent next review batch, subject to their remaining validation. Reuse the
99 toolbar/disabled-ink control proofs only after scalar host/label binding.

**Snackbar reconciliation progress:** conservation session 78262 and metadata
session 5212 are terminal, exit 0. Exact changes: **31 groups / 1,292 observations**,
one scalar receipt and 48 control receipts; all raw inputs and non-receipt control
evidence conserved. Ordered current row SHA:
`854435231b0f84931a62cb442a3c0195c4a5c4e59ce0f3fd7675133765d05f3c`.
All **470** LF-normalized source fingerprints match disk: four added review
module/spec files, four changed main/transition module/spec/control-width-spec
files matched independently to 8978a4b -> f5b2ece, 462 unchanged, none removed.
The 55 non-fingerprint changes are 48 control receipts, four summary counts and
three binding receipts. Both motion-report hashes were independently reconstructed
from original report contents with refreshed source receipts: before 0c10a57b...
and after a556f8c8..., matching the metadata transition. All-section comparison
**2608 / PID 6876 is still live** (CPU 332.05 s); finish it before acceptance/import.
Do not rerun the passed conservation/source checks or restart the section stream.

Additional safe proof reuse while waiting: current production control collector
regenerated **39 toolbar line-height and 60 disabled-button ink findings** with
complete row hashes exactly matching accepted f86307bd control evidence. This is
not yet a scalar bridge: bind the scalar button host to the proof's child label
and verify owner/stage correspondence before attribution. Toolbar's explicit
40/24px line-height substitutes for inherited 28px; disabled ink substitutes
opaque precomposited color for reference alpha/token input. Reuse these existing
source findings; no new renderer cause or screenshot equivalence was established.

**Snackbar/overflow export f5b2ece is terminal**, session 50788 exit 1, with only
the expected **1,096 unresolved groups** error. Do not restart it. Coverage is
436/436 static and 1,875/1,875 interaction, retaining 8,483 scalar groups / 389,202
occurrences and 134 source findings. Compressed SHA:
`ef6da409ae1162433b0419814fe7e7e33b7659805d8e672f407d8b4c84878145`
(60,359,376 bytes); decoded SHA:
`fe2ac881252eac7ed09b2f0cbc5119a13aba1fd420aff9428f130c4c2e96e987`
(2,106,785,756 bytes). It is **not accepted/imported yet**; accepted pointer stays
f86307bd / 1,127 unresolved until reconciliation completes.
Reconciliation against f86307bd is live: conservation `--snackbar-overflow`
session **78262 / PID 7772**, all-section digests **2608 / PID 6876**, and source/
metadata stream **5212 / PID 18120**. Outputs are
`artifacts/material-parity/snackbar-overflow-{conservation,sections,metadata}-f5b2ece.json`.
Revalidate these handles; do not restart quiet streams. Explain all changed
sections, verify normalized disk fingerprints and independently reconstruct
changed motion receipts before compact import/acceptance. The deferred Angular
test remains uncommitted and unverified; avoid overlapping it with reconciliation.
The older live-export notes below are chronological, not current job state.

**Prepared tab batch now covers six groups / 420 observations**, including both
font-family groups as well as line-height/tracking. The extended focused replay
passes **1/1 in 12.37 s** with all 420 complete control-row hashes matching accepted
evidence. It uses the existing canonical normalization for font serialization,
preserves raw rows and retains the same rejection controls. Still not wired or
canonically accepted. A broader complete-case compact membership shortlist also
identified disabled-button ink (four groups / 60) and toolbar action line-height
(two groups / 39) as possible existing-control-proof joins. Those are separate
attributions and need full-proof/owner-stage validation before reuse; do not
merge them solely because compact membership matches.
Export PID 16516 advanced through validation/render-markdown to
`encode-canonical` (CPU 2,599.94 s); still live, not yet accepted. Its evidence
session reverified 1,205 files / 89,151,875 bytes, two collectors, ten memory hits,
zero disk hits/invalidations. Finish this export and reconciliation before any
heavy Angular retry or production-wiring edit.

**Next reusable typography evidence:** current accepted f86307bd compact queries
leave four tab scalar groups unresolved (Overview/Activity, lineHeight and
letterSpacing), while `controlTypography.differences` already contains exactly
one `reviewed-tab-label-typography-input` authoring-defect proof per matching
case/property/owner. A read-only join authenticated original capture b07ef154,
all 70 tab cases, all four scalar pairs, each occurrence count and first-12 case
sample, and unique control membership: **280/280 matches**. Ordered
`{case,element,property,proof}` membership SHA-256:
`0379167d1b9f622d788954f83c1d58f0d920afbfa6156a908a61c9255e7f1460`.
The source classifier `reviewedTabPaintInput` already checks nested 14px label
versus 20px control line boxes and the omitted .096px tracking token against
actual control paint. Do not rerun a new typography experiment for those facts.
Next bind these scalar rows to the existing complete proof, validating full
proof contents and current source applicability, not merely this compact join.
No new attribution or input/rendering equivalence is claimed by the membership
check. Keep it separate from the already-accepted tab outer-control geometry
mapping and from the pending button overflow proof. This investigation did not
modify the live export's dependencies or create another artifact generation.
Full replay is now verified: `node --test
tests/material-parity/tab-scalar-typography-reuse.spec.mjs` passes **1/1**, 8.70 s
test body. The current production collector regenerates all **280** selected
control findings from the original globally indexed trees; every complete row
SHA matches its accepted compact evidence receipt, including source/revision,
ancestry, rules, values and justification. The same check binds all four scalar
groups to original case values/counts/sample order. This closes the full-proof
reuse prerequisite, without applying new classifications or running a browser
capture. Integrate through the existing scalar-review mechanism after the active
export, preserving the distinction between local omissions and actual paint.
That scalar bridge is now prepared in `tab-scalar-typography.mjs`, reusing
`applyModalBoxReview` for original-case binding and raw-row conservation. It
consumes independently replayed control evidence (not arbitrary detached
reports), checks exact native/candidate owners and normal/effective values, and
stores control-proof hashes instead of copying full proof trees. The extended
focused test passes **1/1 in 10.06 s**: exactly four groups / 280 observations
change; unrelated rows and raw values remain unchanged; missing/duplicate control
proofs, forged raw values, lost case membership, changed proof hashes and false
rendering claims are rejected. This standalone bridge is **not production-wired
or canonical**. Wire it only after current export acceptance, with independently
validated control evidence and the existing canonical conservation checks. No
live-export dependency was changed.

**Deferred focused verification:** `button.manager.spec.ts` now has an uncommitted
oversized-label test for omitted/visible/hidden overflow, using ButtonManager and
the shared clip service. Command: `npm test -- --watch=false
--browsers=ChromeHeadless --include=src/app/services/dom/input/button.manager.spec.ts`.
Session **62212 was deliberately cancelled**, terminal exit 1, before any test
result. At 09:08 local, esbuild PID 23356 used 5,139,394,560 bytes working set;
only 695,740 KiB physical memory was free alongside the canonical export. Ctrl-C
terminated this test's Angular/esbuild processes (18044/23356), both confirmed
absent afterward; free memory recovered to 5,543,892 KiB. This is a resource-
contention avoidance decision, not a test failure or a timeout-based restart.
Do not run another Angular build alongside this export. Retry the focused command
once export/reconciliation memory pressure permits, before committing the spec.
Only the existing spec was edited, not renderer code or export dependencies.
Export PID **16516** remains live in `validate-audit`, CPU 1,676.94 s. Recheck that
handle before launching any duplicate. The prior build-audit timestamps include
wall time and are not equivalent to process CPU time.

**Remaining button-overflow investigation:** a new independent browser probe,
`tests/material-parity/button-overflow-initial.spec.mjs`, passes **1/1** (1.57 s
test body). Native button omission and explicit visible X/Y give identical
computed axes, outside-descendant hit reachability and zero scroll offsets.
Hidden, mixed visible/hidden axes and a clipping ancestor are distinct negative
controls. This answers the browser-default question, not full rendering parity.
Source trace: `ElementCreationService.createElement` routes core buttons through
`InputElementService.createInputElement` to `ButtonManager.createButton`.
ButtonManager creates the label as a separate child mesh with intrinsic texture
dimensions, without a button-width maxWidth argument or an own overflow-clipping
branch. Shared `OverflowClipService.apply` and `AstylarScrollRuntime.reconcile`
only register clipping for hidden/clip/auto/scroll. This narrows, but does not
replace, candidate runtime proof: existing ButtonManager specs cover icon labels
and line-box centering, not oversized descendant clipping. Next extend the owning
focused control proof after the live export finishes, then bind only the 12-button
population's initial-value claim; do not waive paint, ancestor clipping or plugin
differences. No canonical classifications changed. The new standalone browser
test is not imported/fingerprinted by the running export; its dependencies were
left untouched. PID 16516 was revalidated live (CPU 506.02 s); no restart issued.

**Predecessor position batch:** all export, conservation, section/source and compact
index checks passed. New canonical compressed SHA / index generation:
`fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040`;
index SHA `672b4d61922a8ef775f4e2c723ca09c9ab70684d93822cd3fe3b53d0df6c9d57`.
All 79 sections reconcile: 72 unchanged; seven changed sections explained by
the 46-group / 3,160-observation position review and source receipts. No section
was added or removed. Import/verify pass: **1,178 unresolved**, 8,483 scalar
groups / 389,202 occurrences, 134 source findings, 39,904 control differences;
coverage stays 436 static / 1,875 interaction cases. Compact shards total
70,364,126 bytes. These counts precede the width/overflow acceptance below.

**Accepted width/overflow batch:** the production stage and
original-case validators cover the already-proved **47 width + four overflow
groups**. The focused production replay changes exactly 51 groups / 1,764
observations, rejects forged reviewed-case membership for each attribution, and
leaves unbound inputs untouched. Full canonical acceptance evidence follows below.

Verification: `node --test tests/material-parity/control-width-observation.spec.mjs
tests/material-parity/overlay-overflow-observation.spec.mjs
tests/material-parity/position-composition-producer-transition.spec.mjs
tests/material-parity/static-position-observation.spec.mjs` passed **23/23** in
49.71 s. Complete predecessor-source restoration and its mutation controls pass;
the historical position-stage test now explicitly replays that authenticated
predecessor. Width/overflow tests use the accepted fea569ed snapshot.
`npm run audit:review -- position --cold` passed in 2.75 s: two collectors, two
memory hits, no disk hits/invalidations, 1,205 files / 89,151,875 bytes reverified.

The existing canonical comparator now supports `--width-overflow`, with original
capture replay, exact 51/1,764 membership, raw-input/control conservation and
receipt-only refresh. Its full spec passes **19/19** in 48.25 s. The first run
was 18/19: an older color-batch assertion expected a routing predicate predating
the reviewed weight extension. It now checks the hash-authenticated predecessor;
no producer behavior or source-hash guard was weakened.
Full original-case-order replay across all 8,483 compact scalar rows also passes:
51 groups / 1,764 observations change, leaving **1,127 unresolved** after acceptance.
Chip and followup production collectors
both independently report `bound` (8.56 s preflight).

Cold export **a478a11 is terminal**: session 2559 exited 1, with only the expected
**1,127 unresolved groups** error. Do not restart it. Coverage remains 436/436
static and 1,875/1,875 interaction; 8,483 scalar groups / 389,202 occurrences and
134 source findings remain. Elapsed time: 2,909,828.64 ms. Evidence verification:
two collectors, ten memory hits, zero disk hits/invalidations, 1,205 files /
89,151,875 bytes reverified. Log: `width-overflow-export-a478a11.log` under
`artifacts/material-parity`. Compressed SHA:
`f86307bd22b7699155bc1e28730c1a446c825a214d97c9258555c8b33a265162`
(60,304,079 bytes); decoded SHA:
`b91fdd5c1596d79c1f401836b8cd83ba04a29103f78105c50f9b43284261e7b2`
(2,104,936,839 bytes). This export is now accepted after the checks below.
Reconciliation against fea569ed: comparator session **20009** and metadata session
**57670** are terminal, exit 0. Exactly 51 groups / 1,764 observations change;
one scalar and 48 control producer receipts refresh; all raw inputs and
non-receipt control evidence are conserved. Ordered current row SHA:
`f5c4858613f8bc0a10c27e6c389580ec7f37fe0a8e02595e04f13bd19e62b0c1`.
All 466 source fingerprints match normalized disk contents: four added width/
overflow module/spec receipts, three changed main/transition module/spec receipts
matched to d7843b4 -> a478a11, 459 unchanged, none removed. Both motion-report
hashes were independently reconstructed. The 54 non-fingerprint leaf changes
are 48 control receipts, three summary counts and three source-binding receipts.
All-section digests session **78099** is terminal, exit 0: 79 sections retained,
72 unchanged, seven expected changes explained by scalar reviews and source/
control receipts. None added or removed. Outputs use
`width-overflow-{conservation,sections,metadata}-a478a11.json` in the same artifact
directory. Compact import session 24309 and `npm run audit:findings:verify` pass:
8,483 scalar groups / 389,202 occurrences, 134 source findings, 39,904 control
differences and **1,127 unresolved**. New generation is f86307bd (full SHA above),
index SHA `9222220df3105817b2f39275395d883ff8201560f00f696320dfec0171339c8a`;
compact shards total 70,454,748 bytes. Retained gzip has its standalone manifest.
All export/reconciliation/import sessions are terminal; do not restart them.
This is evidence acceptance, not input/rendering equivalence or final audit
completion. Next integrate the pending snackbar/clipping findings and mapped
ordinary initial-value review as one coherent batch; retain other control/plugin
overflow questions separately and preserve the full final gates.
That combined proposal now passes against **all 8,483 current scalar rows**:
**31 groups / 1,292 observations**, with all raw values and unrelated rows
conserved. It combines three snackbar groups / 102 observations, sixteen
clipping/axis groups / 660, and twelve mapped ordinary initial-overflow groups /
530. Proposed unresolved count is **1,096**; accepted canonical remains 1,127.
`node --test tests/material-parity/control-overflow-observation.spec.mjs
tests/material-parity/snackbar-position-observation.spec.mjs` passes **4/4 in
26.38 s**. Full original case order, exact memberships, duplicate/missing cases,
false classifications and invented rendering claims are checked. Initial-value
reuse explicitly pins the six unchanged defaults/clip/scroll sources and tests.
The mapped proof is now reusable in the existing clipping review module rather
than duplicated in the prerequisite test.

**Combined snackbar/overflow production wiring is now verified, not exported.**
The final bound-input stage applies the three reviews, fingerprints their four
module/spec files, and validates original-case replay. Unbound inputs remain
unchanged. The focused test extracts the actual production stage and validators,
checks all 31 groups / 1,292 observations and rejects forged case membership for
each of the five attributions. Complete predecessor restoration equals accepted
8978a4b byte-for-byte (module hash d5d87c9a...), retaining historical chain guards.
The older width-stage test explicitly replays that authenticated predecessor.
`node --test tests/material-parity/control-overflow-observation.spec.mjs
tests/material-parity/snackbar-position-observation.spec.mjs
tests/material-parity/position-composition-producer-transition.spec.mjs
tests/material-parity/control-width-observation.spec.mjs` passes **22/22 in
55.96 s**. Cold position review passes (4.19 s; two collectors, two memory hits,
no disk hits/invalidations; 1,205 files / 89,151,875 bytes reverified). Chip and
followup production bindings independently remain `bound` (8.47 s).
The existing canonical comparator now supports `--snackbar-overflow`, pinned to
accepted f86307bd and the original capture. Independent original-order replay
across all 8,483 compact rows confirms 31 groups / 1,292 observations and 1,096
proposed unresolved. Its full spec passes **20/20 in 57.79 s**, rejecting jointly
forged raw/expected rows, wrong classifications, lost/reordered rows, altered
controls and unrelated source changes. No new validation framework was added.
Cold export started from **f5b2ece**: session **50788**, Node PID **16516**
(parent 20884), log `artifacts/material-parity/snackbar-overflow-export-f5b2ece.log`.
It is live in build-audit; revalidate its handle before waiting. Do not restart
on quiet output or timeout, and do not change its dependencies while it runs.
After it finishes, run `--snackbar-overflow` and all-section/source receipt
reconciliation against accepted f86307bd before compact import. Canonical
acceptance still has 1,127 unresolved groups, not the proposed 1,096.
Next unresolved overflow question, outside the live export: compact queries and
an authenticated original-tree census (6.63 s) leave **42 groups / 2,592 scalar
observations**, 21 owners / 1,296 instances. Twelve button owners / 716 instances
have exactly `.mdc-button` visible X/Y requests: toolbar action, card open, three
button examples, menu trigger, bottom-sheet trigger, dialog trigger/cancel/save,
snackbar trigger and tooltip trigger. Candidate rules and all three local stages
omit overflow. This is not automatically a defect: the existing initial-value
proof deliberately excluded controls, so verify the button's own paint/clipping
path before calling explicit visible and omission equivalent.
The other nine owners / 580 instances have no captured authored overflow request:
card/dialog headings (84), table (52), slider inputs (156), range-visual/tab-panel
plugins (148), and tab buttons mapped from spans (140). Native axes compute visible
while candidate local stages omit them. Separate observation-stage attribution
from used clipping and the already-documented structure/plugin substitutions.
Direct/alias mapping and full rules were inspected; no new classifications were
applied. Next use existing public control proofs to distinguish default-value
equivalence from control-owned clipping, without broadening the ordinary-node
waiver. Shared sizing/typography/paint questions and final gates remain open.
The accepted width/overflow export predates this new wiring. The following
proof details belong to the new batch and are not canonically applied yet.

Next pending snackbar proof: `snackbar-position-observation.spec.mjs` passes
**1/1** (3.03 s), covering all 34 original wrapper states and exactly three scalar
groups / 102 observations. Native absolute wrapper inside fixed CDK container
versus candidate fixed overlay inside the showcase section is an authored
composition substitution. Native right/bottom zeros are CSSOM observations with
no matching authored physical/logical inset requests, not zeros to copy. Existing
alias mapping's missing scalar z-index rule stays explicit. Negative controls
reject forged rules, ancestry, insets, local stages, membership and missing-paint
cause claims. Raw scalar rows and unrelated findings are conserved. This proof
does not diagnose the old missing-snackbar symptom; retained paint already shows
all 34 surfaces. Reuse the existing 0d67d46 -> f3c8254 -> 899c741 history below;
do not reopen that settled compensation history. Production integration remains
pending after width/overflow acceptance, with no new canonical count claimed.

Additional pending clipping proof: `control-overflow-observation.spec.mjs`
passes **1/1** (9.53 s), covering all **330** core/sidenav/grid/badge/icon/progress
owner instances, **16 groups / 660 scalar observations**. Fifteen groups retain
explicit hidden clipping requests versus candidate omissions; progress-bar Y is
separate computed `auto` with only X `hidden` authored. Core's visible button
rules and hidden ripple rules both remain in the proof, together with native
computed hidden. Changed DOM/plugin/replaced-element structures are not equated.
Negative controls reject incomplete rules, resets/logical axes, changed local
stages/types, duplicate owners, forged case membership and clipping claims. Raw
rows and unrelated findings are conserved. This new standalone module is not a
dependency of the running width/overflow export and is not canonically applied.
Remaining visible-overflow populations need separate treatment: explicit visible
button requests are not the same provenance as both-side omissions. Do not
collapse them into clipping defects or assume candidate computed defaults.
Full input-equivalence acceptance and final enforced browser gates remain open.
Mapped visible-overflow prerequisites now have a focused check in the same
`control-overflow-observation.spec.mjs`: **265 owners** (paginator range/size,
stepper active content, bottom-sheet wrapper and snackbar wrapper/surface) retain
both native visible axes and omit overflow/reset requests in candidate authoring,
potentially applicable rules and all three captured stages. Existing alias
mapping is reused, including scalar-rule gaps; it is not structural equivalence.
The existing default/clip/scroll proof's four implementation sources and two core
tests are pinned unchanged. Controls reject alias shadows, unknown-selector
overflow, logical-axis overrides, resets and plugin substitution. The combined
suite passes **2/2 in 13.30 s**; an initial test used the wrong mapping-result field
(`astylarNode` instead of `candidateNode`) and failed before correction. No new
canonical classifications or clipping/rendering claims were applied. The combined
proposal above now binds these mappings using the same initial-value scope;
main-builder wiring is now tested above, but canonical acceptance remains pending.
Earlier chronological notes below describe preparation, not current job state.

Position reconciliation progress: canonical conservation **passed**, session
72707 terminal exit 0. Exactly 46 groups / 3,160 observations change; one scalar
and 48 control producer receipts refresh; all raw inputs and non-receipt control
evidence are conserved. Ordered current row SHA:
`f7e9193832aecafe7cb30a80014e1238563ec79527ab44971306b238772c15ac`.
Metadata/source stream session 28844 also exited 0. All 462 source fingerprints
match normalized on-disk files: one added control-position module, six changed
files matched to d963dd2 -> 1a7c2ff history, 455 unchanged. The 54 non-fingerprint
leaf changes are 48 producer receipts, three summary counts and three binding
receipts. Both old/new motion-report hashes were independently reconstructed
from the retained report with only its source receipts refreshed.
All-section comparison session **54679 / PID 19996 remains live**; revalidate
and finish it before compact import/acceptance. Do not rerun either passed check.

**Position export 1a7c2ff is terminal**, session 21784 exited 1; do not restart.
Its only reported error is the expected **1,178 unresolved groups**. It retains
436/436 static, 1,875/1,875 interaction, 8,483 scalar groups / 389,202 occurrences
and 134 source findings. Cold evidence verification: two collectors, ten memory
hits, zero disk hits/invalidations, 1,205 files / 89,151,875 bytes reverified.
Recorded elapsed time 2,174,042.54 ms. Compressed output SHA
`fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040`
(60,238,808 bytes); decoded SHA
`98d8aada931c0f393616ffd4ddfb4177f7099d33690042cabe42db98504d0f70`
(2,103,412,390 bytes). Output is **not accepted yet**; pointer remains 77595d08.

Reconciliation is running: canonical conservation `--control-position` session
72707 / PID 18460, all-section digest comparison session 54679 / PID 19996,
metadata/source comparison session 28844 / PID 12808. Revalidate handles before
waiting. Outputs are `artifacts/material-parity/control-position-{conservation,
sections,metadata}-1a7c2ff.json`. All compare against accepted 77595d08, not the
failed 11ccc0a2 package. Finish exact section/source/receipt reconciliation,
then import/verify once and commit the canonical files. The pending 47 width
and four overflow groups are deliberately absent from this exported batch.

Overlay overflow proof complete, pending production integration:
`node --test tests/material-parity/overlay-overflow-observation.spec.mjs` passes
**2/2** (4.05 s total). Existing inventory/mapping and `applyModalBoxReview`
bind exactly four groups / 100 scalar observations across 50 owners. Tooltip
X/Y and dialog Y are omitted authored requests (three groups / 68); dialog X
is a computed-axis observation (one group / 32). Raw values, omitted candidate
fields and all unrelated findings are conserved. Controls reject incomplete
rules, added horizontal declarations, candidate logical overflow, changed local
stages/computed axes and falsely relabeled authored axes.

Native Chrome **153.0.8010.53**, viewport 800x600/DPR1, confirms the axis
distinction with five declaration variants: omitted axes compute visible;
Y auto with X omitted or visible computes auto/auto; X clip with Y auto computes
hidden/auto; hidden shorthand computes hidden/hidden. This is a native CSSOM
sensitivity proof, not a paired Astylar rendering/scrolling test. No screenshots,
new capture directories, renderer changes or export dependencies were added.
Next batch wiring can include these four findings alongside 47 width groups
after the still-live position export is reconciled. All broader gates remain.

Next high-impact question after width integration: tooltip/dialog overflow.
A read-only authenticated b07ef154 inventory trace (3.16 s) covers all 18 paired
tooltip owners and 32 dialog panels using existing alias mappings and complete
rule inventories. Tooltip's active `.mat-mdc-tooltip-surface` rule explicitly
requests `overflow-x:hidden`, `overflow-y:hidden` and `overflow-wrap:anywhere`.
Dialog's `.mat-mdc-dialog-surface` explicitly requests only `overflow-y:auto`;
CSSOM reports `auto` for both axes. Candidate owners have no inline or possibly
applicable overflow/reset requests and omit them in all three local stages.
These are two distinct proofs: omitted authored clipping requests for tooltip,
and omitted vertical scroll request plus an axis-computation question for dialog.
Do not call the dialog's horizontal `auto` an explicit authored declaration.
Next bind these distinctions to the four existing overflow scalar groups with
axis-coupling/hidden-request controls; reuse current owner/layout findings rather
than reopen dialog size or tooltip placement. No new canonical attribution or
functional clipping/scrolling claim follows from this read-only trace.

Export 1a7c2ff remains live in session 21784 / PID 2388, validation phase;
the accepted pointer remains 77595d08. Original session polling and advancing
CPU confirm a running process, not a stale log. No restart or source change.

Width batch ready for production integration: all **47** previously unresolved
width groups / **1,664** observations now have source-backed proposed reviews.
The final ten groups / 576 observations are native span CSSOM `auto` versus
candidate local omission (badge/checkbox/radio/switch labels, divider text and
stepper text/content). Both mapped owners omit width/logical axes/reset; no
candidate computed default or equal used width is inferred. Stepper's duplicate
active/inactive content spans use the existing generated-owner proof, not the
first matching node. Tests reject inactive selection, direct-ID alias shadows,
injected `auto` and forged computed-width claims.

`node --test tests/material-parity/control-width-observation.spec.mjs`: **4/4**
pass, 37.29 s total. Combined application changes exactly the complete 47-group
pending width set in the accepted compact snapshot and preserves all other
rows. Sub-batches remain distinct: 16 fixed-request groups / 544 observations,
24 observation-stage groups / 946, and seven composition substitutions / 174.
Next reconcile the live position export first, then wire this coherent width
batch once with source fingerprints, independent replay and full predecessor
conservation. Accepted canonical unresolved count remains 1,224; none of this
pending evidence authorizes renderer/fixture changes or claims audit completion.

Explicit grid/tab widths now reuse the established composition proofs rather
than the omitted-width classification. Seven groups / 174 observations bind
six grid tile width signatures (52 owners per tile) and the tab-panel percentage
signature (70). Native grid tiles explicitly request `calc(50% - 0.5px)` with
absolute placement; candidate relative tiles omit width inside a zero-gap
two-track grid. Native tab text is an inline span; the exact alias mapping binds
it to the custom showcase tab-panel renderer with an explicit `100%` request.
Both are authoring/composition substitutions, not proved core calc/percentage
defects. Existing position/gutter and plugin ownership findings remain in force.

`node --test --test-name-pattern='grid and tab width' tests/material-parity/control-width-observation.spec.mjs`
passes 1/1 (3.80 s body): full original inventory, exact case/count membership,
raw-row restoration, independent replay and changed-owner/width/logical-axis/
provenance controls. No canonical export dependency changed. Pending width
batch now covers 37 of the 47 unresolved width groups (1,088 observations);
remaining ten groups / 576 observations compare native `auto` with omitted
candidate width on label/text owners and require their own mapped-owner check.
Do not reopen settled grid composition or infer that all width work is accepted.

Omitted-width question resolved at the observation-stage boundary: 14 groups /
370 original owners (card copy/title 52 each, chip list 76, expansion title 68,
paginator range/size 52 each, tooltip surface 18) compare CSSOM resolved pixel
width with absent local declarations. Complete original rules omit width,
both logical axes and reset on both mapped owners; all three candidate stages
omit them. `control-width-observation.mjs` reuses the existing unique-ID or
origin-alias proofs and scalar/tree agreement; no default or used width is
invented. Proposed attribution is harness observation-stage mismatch, not equal
layout or equal inputs. Different composition, min/max sizing and the tooltip
flow substitution remain independent findings. Grid's explicit calc width and
the tab panel's candidate percentage width remain outside this proof.

The first full-population trial rejected tooltip `open`, correctly exposing its
already-known unpaired state. Only the 18 source-paired hover/held observations
bind the existing width row; the regression explicitly rejects `open` and does
not waive that gap. Full replay preserves all raw rows and omissions, exact
owner counts and earlier classifications; mutation controls reject hidden
requests, incomplete provenance, duplicate owners, altered stages, fabricated
defaults and equivalence claims. Both width tests pass (2/2, 21.45 s total).
Combined pending width batch is 30 groups / 914 observations; it is not yet
canonical or included in the position export, whose process remains live.

Control-width scalar membership is now reconciled in the focused proof using
the existing `applyModalBoxReview` mechanism: exactly 16 unresolved groups /
544 observations map to the full original owner set. No omitted or duplicate
case is accepted; every raw row is restored exactly from retained prior metadata,
and unrelated rows retain identity. Replay rejects deleted/duplicated findings,
truncated case membership, changed raw values/prior metadata and forged
equivalence flags. The original inventory and precise production normalization
are reused; no new evidence/report framework or capture was introduced.
Production wiring, source fingerprinting and canonical acceptance remain pending.
The position export has advanced to validation (build elapsed 842,411 ms), so
keep its source dependencies frozen until reconciliation finishes.

Control-width owner proof now covers all 544 original owners (September 26).
`node --test tests/material-parity/control-width-observation.spec.mjs` passes
1/1 (5.48 s test body). It uses the existing authenticated inventory reader and
checks eight unique owner mappings, complete rules, reference inline/rule
absence including both logical sizing axes/reset, exact candidate selector
requests and all three local stages, and original scalar/tree agreement.
All 16 candidate-width signatures have exact population counts. Thirteen
negative controls per owner reject incomplete provenance, duplicate/wrong
owners, hidden inline/logical/reset requests and changed stages; unrelated-owner
rules leave the proof unchanged. Badge/radio reference CSSOM widths are `auto`,
not pixels; the initial pixel-only assertion exposed that distinction and was
replaced with explicit owner-specific expectations, not a fabricated used width.

The new `control-width-observation.mjs` proof establishes only unequal authored
width requests. Structure, used layout, rendering equivalence and original
raster cause remain explicitly unproved. It is not wired into the running
export or any historical collector. Next reuse `applyModalBoxReview` for exact
original-case/scalar membership replay and conservation, then integrate at the
next coherent export milestone. Do not report the canonical unresolved count as
reduced by this focused proof. Corrected export PID 2388 remains live with CPU
advancing; accepted baseline remains 77595d08 pending full reconciliation.

Width-history follow-up (September 26): the remaining 13 candidate-fixed-pixel
width signatures cover 476 original owners: badge 52, chips 76 each, radio 68,
slide-toggle 68, button-toggle group 68 and second option 68. The authenticated
b07ef154 inventory trace found complete rule inventories, no reference owner
inline/active width/logical-axis/reset request, and explicit candidate widths
retained in all three local stages. This remains an observation, not a blanket
classification or proof of equal structure/used layout. Together with checkbox
68 owners this accounts for 544 candidate-pixel observations; the separate
candidate `100%` tab-panel cohort accounts for the remaining 70 of 614.

History distinguishes original authoring from later calibration: badge widths
90.953125/81.859375/104.65625px, radio 153/129/137px, slide-toggle 179px and
button-toggle group 130px already occur in initial showcase commit 2f44011.
Do not attribute the unrelated `.step-tab` 130px change in bc4d442 to this group.
The second button-toggle option originally shared a 65px rule; c47d589 replaces
that with state-dependent 80/47px widths, and 88d1090 changes 80 to 81px.
f3c8254 retains those widths while changing paint/radii. Exact diffs were checked;
the current second-option rule is at astylar.component.ts:516. These changes
establish differing authored requests, not the original visual cause or intent.
Reuse the already-recorded chip history rather than surveying it again.

Next: extend the existing fixed-width authoring proof to these control owners
with exact full-population binding and owner/logical-axis negative controls.
The existing button proof assumes native button/label structure and cannot be
applied unchanged to these controls. Keep first-divergence claims scoped to width
requests, and retain structural/intrinsic sizing uncertainty. No new capture or
framework is needed for this step. The corrected export remains live (PID 2388,
session 21784 revalidated); its dependencies are unchanged by this ledger entry.

Corrected cold export at source **1a7c2ff** is live in session 21784, PID 2388,
log `control-position-export-1a7c2ff.log`; revalidate the handle before waiting.
Do not use the prior failed 11ccc0a2 payload as the accepted predecessor.

Next explicit-width question: the three checkbox-primary signatures differ by
only 0.001px after scalar normalization, but input evidence is not equivalent.
An authenticated b07ef154 inventory assertion (2.61 s) covers all 68 owners:
reference inline/active matched rules request neither width, logical sizing axes,
nor reset; candidate #checkbox-primary explicitly requests 149.5625px in 34 cases,
137.5625px in 17, and 141.5625px in 17. Each request survives all three local
stages; both rule inventories are complete. Exact constants exist in initial
showcase commit 2f44011 (git -S history and original blob inspected), so do not
label them a later parity-fix introduction or infer intent. Current location is
`examples/material-showcase/src/app/astylar.component.ts:771`. Next bind the
existing fixed-width authoring contract to this checkbox cohort with owner and
logical-axis controls; retain formatting/structure and renderer uncertainty.
No classification, fixture, renderer or running-export dependency changed.

Binding-regression correction prepared: the new chip/button inventory reviews
now live in `control-position-observation.mjs`; historical chip/static modules
are byte-identical to accepted d963dd2. No hash exceptions, cache bypasses, or
classification weakening. The new module is explicitly source-fingerprinted,
and producer restoration removes only its exact integration fragments. Twelve
source-conservation tests pass (2.28 s); nine old/new binding, membership and
production tests pass (37.88 s); six canonical-conservation tests pass (5.15 s);
the existing focused position suite passes 3/3 (3.68 s). Both previously failed
bindings are independently bound again (chip 10 groups, followup 14). The new
batch remains 46 groups / 3,160 observations. Next commit and cold export, then
compare against accepted 77595d08, not the failed output. No canonical count is
accepted yet. Failed output is retained under `control-position-failed-5c0a5bb`
with compressed SHA 11ccc0a25a0cbb7abea8597a2ac958e4779ff1c4f39f9200547038294885f526.

**Control-position export 5c0a5bb failed reconciliation prerequisites.** Session
87004 terminated exit 1. Coverage remains 436/436 static, 1,875/1,875 interaction,
8,483 differences / 389,202 occurrences / 134 source findings, but output has
1,202 unresolved groups (not expected 1,178) and two binding errors. It is not
accepted; accepted baseline remains 77595d08 / 1,224 unresolved. Retain the failed
output and `control-position-export-5c0a5bb.log`; do not import it as accepted.
Focused collector replay (6.48 s) identifies exact causes: chip-paint source
expects chip-position-inspection hash 82921a30 but receives b3b034c0 after new
position helpers; position-followup's persistent dependency graph now reaches
untracked `origin-alias-mapping-evidence.mjs` through static-position's new modal
helper import. Ten chip and fourteen followup groups lose their old binding,
explaining the 24-group excess. Keep both guards intact. Next separate the new
control-position helpers from the existing historical/cached collector modules,
verify those modules restore exactly and all old/new focused bindings pass,
then reconcile producer-source changes before a corrected batched export.
Evidence-session verification had zero invalidations; this does not negate the
separate binding failures. Recorded export elapsed time is 24,455,013.82 ms,
including an unusually long encoding interval across a polling-host timeout;
do not present this as a normal CPU-runtime benchmark.

Tooltip width observation now has a focused regression in the existing
`tooltip-position-composition.spec.mjs` (not a running export dependency).
`node --test --test-name-pattern='tooltip pixel width' tests/material-parity/tooltip-position-composition.spec.mjs`
passes 1/1 (1.26 s). It authenticates 18 original tree pairs and the pinned compact
row, checks exact count/sample/state membership, horizontal writing mode, empty
inline requests, absence of width/both logical sizing axes/reset rules and all
three candidate stages. This locks the observed stage distinction without
claiming rendering equivalence or changing classification. Production semantic
binding and negative controls remain next after export reconciliation.

Width follow-up cohort (read-only, snapshot 77595d08): all 47 unresolved width
groups comprise 10 native-auto/candidate-omitted groups (576 observations),
17 candidate-explicit groups (614), and 20 native-pixel/candidate-omitted groups
(474). An authenticated original b07ef154 inventory check (4.48 s) separates the
last cohort across all 474 owners: grid-tile-one/two each have 52 explicit native
inline `width:calc(50% - 0.5px)` requests, covering six groups. The other 14 groups /
370 owners have no native inline/active matched or candidate inline/possibly
applicable `width`, `inline-size`, or `all` request: card-copy/title 52 each,
chips-primary 76, paginator-range/size 52 each, expansion-title 68, tooltip-popup
18. Direct unique IDs identify six owners; existing aliases identify paginator
and tooltip. Complete rule evidence holds throughout. This is a bounded trace,
not yet a classification: preserve grid's explicit sizing/composition question,
and check formatting context, local stages, logical-axis aliases and controls
before binding the other groups. No blanket omitted-width default is justified.
Reuse the existing sizing and mapping proofs; no new capture/report framework.

Cold control-position export at source **5c0a5bb** is running in session 87004,
PID 19464, log `artifacts/material-parity/control-position-export-5c0a5bb.log`.
Revalidate that handle before waiting; quiet build output is not a restart signal.
Do not change producer dependencies during this export.

Read-only next-question triage against authenticated compact snapshot 77595d08:
tooltip has 28 unresolved scalar groups, snackbar 57, bottom sheet 99, dialog
136 and slider 57 (includes the pending trigger-offset batch). Tooltip width
finding `29760bb85c7c3078944909decd0c2a255df3556790becc22158c8255753a3012`
compares native computed `106.812px` with an absent candidate local-stage width.
An inline Node assertion using `collectTooltipPositionAncestry` authenticated all
18 original tree pairs: native matched rules and inline styles have no `width`
declaration, the Material surface requests min/max widths 40/200px, and candidate
`#tooltip-popup` plus all three local stages omit width. Assertions passed; no
new report, classification or rendering claim was produced. This is not proof
of whole-cascade absence or equal used sizes. Next check existing sizing-context
evidence and complete rule provenance before binding a stage classification;
do not copy the browser's computed width into candidate authoring. The already
proved tooltip local-flow substitution and wrapping mismatch remain separate.

The next read-only inventory check (2.40 s) authenticated original report b07ef154,
retained all 62 tooltip cases and mapped all 18 popup owners through the existing
alias resolver. Both trees have complete rule evidence; no active matched native
or possibly applicable candidate rule requests `width`, `inline-size`, or `all`.
This narrows the remaining width question to observation-stage/used sizing, not
an omitted explicit pixel-width request. Existing sizing-constraint proofs at
`tooltip-position-composition.spec.mjs` already cover min/max width/height; reuse
them instead of repeating that investigation. Next extend the existing semantic
proof with inline/logical-size/reset negative controls and exact width-row binding
after the running export has reconciled. No canonical classification changes yet.

September 26 integration checkpoint: the existing canonical comparator now has
`--control-position`, independently replaying the bound original captures against
accepted snapshot 77595d08. It requires exactly 46 groups / 3,160 observations,
conserves raw rows and unrelated controls, and restricts producer-receipt changes.
Six focused conservation tests pass (2.81 s), including simultaneous mutations
of proposed and expected rows. The original-capture semantic and producer tests
remain the evidence for the classifications; these checks do not prove rendering.
Next run one cold export, then full-row/section/fingerprint reconciliation before
accepting the projected 1,178 count. Current accepted count remains 1,224.
The predecessor's standalone manifest is restored beside its existing compressed
payload for streaming comparison; no decoded report or duplicate payload is made.
Remaining priorities are shared overlay/coordinate/typography ownership and
slider interaction uncertainties, then remaining box/paint/structure input groups;
do not reopen completed chip/button censuses or treat this batch as full coverage.
Final complete canonical and enforced browser acceptance remain outstanding.

Control-position production integration now applies the prepared chip/button
reviews after modal reviews, only for bound original cases; unbound attributions
are rejected. Source-extracted producer and validator replay passes with exactly
46 groups / 3,160 observations and unchanged unbound inputs. The preceding modal
production/precedence test remains intact through exact source restoration;
both integration tests pass (7.12 s). Eleven source-conservation tests pass
(1.96 s), restoring the complete accepted modal producer hash 56532a01 and
rejecting missing guards, validation and provenance. No full export yet. Next
extend the existing canonical conservation comparator for this combined batch,
then one cold export/reconciliation. Expected unresolved count after acceptance
is 1,178; accepted count is still 1,224. All remaining audit/final gates stand.

Button-offset proposal now exists in the existing static-position observation
module/spec, reusing the same row-review helper as chips and modals. All three
tests pass (14.72 s): 36 groups / 2,400 observations retain complete membership,
raw-row recovery, and the card-open explicit-relative versus other-owner omission
distinction. Mutations cover rule completeness, provenance, inline/logical inset
requests, resets, computed offsets, position-stage changes, types and duplicate
owners; missing/duplicate cases and forged review metadata fail. Earlier seven
static-position populations remain unchanged. Combined pending batch: 46 groups /
3,160 observations including chips. Next integrate both proposals into production
with source conservation and a combined replay test before one batched export.
Accepted unresolved count remains 1,224; no renderer/fixture changes were made.

Next coherent cohort: 36 unresolved button-offset groups / 2,400 observations.
Read-only original b07ef154 inventory assertions (3.70 s) cover nine direct-ID
button owners: button-primary/secondary/disabled 60 each, card-open 52,
menu-primary 94, bottom-sheet-primary 63, dialog-primary 78, snack-bar-primary
71 and tooltip-primary 62. All 600 owners have complete rule evidence, an active
`.mdc-button` relative request, no active reference physical/logical inset or
reset, and four computed zero offsets. Candidate inline/rule/stage offsets are
omitted throughout. Crucially, card-open has `.text-button` relative positioning
in all three stages; the other eight omit it. Preserve this split: attribute
only the offset observation-stage issue, not positioning/rendering equivalence.
Next extend existing position-observation proof/tests with this exact cohort,
negative controls and complete row conservation; combine with the prepared chip
batch before the next canonical milestone. No new classification was applied.

Chip position row binding is prepared in the existing chip module/spec, reusing
the existing modal row-review helper (exported without changing its behavior).
Against accepted 77595d08, exactly ten groups / 760 observations are proposed:
two unequal position requests and eight computed-offset observation-stage groups.
Both focused chip tests pass (8.36 s), conserving raw rows/full 76-case membership
and unrelated findings, and rejecting missing/duplicate cases and forged review
data. The two adjacent dialog/bottom-sheet checks also pass (8.75 s), preserving
their earlier classifications. Not integrated into the canonical producer yet. Next compose this prepared
batch with related positioning reviews and source conservation before a full
export; accepted unresolved count remains 1,224. Do not repeat the chip census.

Chip follow-up: `proveChipPositionRequests` is now in the existing chip module,
with a focused original-capture test over 76 cases / 152 owners and 608 offsets.
It requires complete rule evidence, exact two reference-relative declarations,
no applicable candidate position/inset/reset requests, and preserved composition.
Fourteen negative mutations plus an invalid-owner check reject forged/missing
evidence. Three focused tests (new proof and existing structure checks) pass in
2.67 s. Computed/used candidate positioning and rendering equivalence remain
explicitly unproved. Next bind this proof to the ten pending chip scalar groups
(two position and eight offsets), conserve raw rows and full membership, and
batch related work before another export. Canonical accepted count remains
1,224. Chip module/spec fingerprints now differ from the accepted snapshot;
reconcile them at that next milestone, not by rerunning a full export now.

September 26: cold modal export **c454fae** terminated, session 30237 exit 1,
after 2,299.35 s. Its only error is 1,224 unresolved groups. Coverage remains
436/436 static and 1,875/1,875 interaction, with 8,483 groups / 389,202
occurrences / 134 source findings. Evidence session: zero invalidations,
1,205 files / 89,151,875 bytes verified. Log: `modal-position-export-c454fae.log`.
Complete-row conservation (session 94428 exit 0) confirms exactly 38 groups /
1,125 observations changed, preserving all raw inputs and non-receipt controls.
Section comparison (72538 exit 0) retains all 79 sections, 72 unchanged; changes
are sourceFingerprints, controlLineBoxes, summary, discrepancies, ownerCaretInputs,
reviewedSourceBatchInputs and controlTypography. Metadata extraction (84047
exit 0) plus assertions verifies all 461 current fingerprints and five exact
bc898de-to-c454fae source changes. The 50 module receipts change only the module
hash; remaining metadata differences are three expected summary values and the
validated replay-report digest. Evidence: `modal-position-{conservation,sections,
metadata}-c454fae.json`. New compressed SHA is
`77595d08eb0f857cf058eb072074a433702f11e022dac2f1bfb666375d923752`
(60,139,403 bytes); decoded SHA
`d595011706e4008ade0bc85663fbcd08fbda940b95dfc64f7cd4b3ffaf2989a6`
(2,101,378,814 bytes). Ordered rows SHA:
`a0b9604ab285de0e682443939297f8297a62ffa0ff2986945c2e9cd16ed85d0a`.
Partial batch reconciliation passed. Compact import session 38996 exited 0;
`npm run audit:findings:verify` passed with 8,483 discrepancies, 134 source
findings, 39,904 controls, 389,202 occurrences and 1,224 unresolved groups.
Import log: `modal-position-import-c454fae.log`; compact bytes 70,213,826.
Index SHA: `d84236477a9da75dc58de0e5d3d48db58c98bab5232d746cdf5d88501ced2459`.
This is not whole-audit acceptance; final browser gates remain required.
Prior accepted bfd priority counts (before the 38-group batch) were
dialog 161, bottom-sheet 112, chips 100, tabs 98; position/insets total 206.

Next chip question now has a bounded read-only answer, not a new classification:
the hash-pinned original b07ef154 capture, replayed through existing full-tree
inventory and selector applicability helpers, has 76 chip cases / 152 owners
with complete rule evidence. Each reference owner has exactly two unconditional,
non-important relative declarations (`.mdc-evolution-chip`, `.mat-mdc-chip`),
no active physical/logical inset or `all` request, and four computed `0px`
offsets. Candidate inline styles, potentially applicable rules and all three
local stages omit positioning requests. Assertions passed in 2.72 s for all
608 offset observations. Existing captured structure proof separately shows
flattened button/graphic/focus ownership; do not infer rendering equivalence.
Next extend the existing chip proof/spec with these exact declarations and
negative controls after the export dependency freeze ends; do not loosen the
modal single-declaration guard or rerun this census. Canonical rows unchanged.

Bounded chip history check: initial `2f44011` and current `.chip` owner rules
omit position; exact one-line `.chip`, `.chip.selected`, `#chip-0/1` position
history has no transitions. This is not a complete historical cascade claim.
Keep it distinct from `3d0d5ce` adding `.chip-label { position: relative;
top: -2px }` and `00de46c` removing that label offset while reducing selected
widths 98/94 to 97/93px. `db8f743` introduced selected/unselected width branches
98/68 and 94/64px. These source changes establish distinct authoring decisions,
not their intent or a demonstrated renderer cause. Owner positioning omission
must not be described as removal of the label compensation.

The existing scalar conservation comparator now supports `--modal-position`;
it authenticates bfd986bc and the new export, replays both modal proposals from
the complete original inventory, conserves every raw row/prior review and all
non-receipt control evidence, and permits only the 38-group/1,125-observation
batch with its exact per-attribution counts. Five focused comparator tests pass
(2.58 s), including forged expected-row, equivalence, membership and control
mutations. Independent replay against the original capture also passes with
38/1,125. The compact generation's standalone manifest was restored and checked
against its existing compressed payload, not a duplicated capture. Next run
one complete export and `node scripts/check-material-position-canonical-conservation.mjs --modal-position`,
then reconcile sections/fingerprints and import once. No export acceptance yet.

The combined modal-position proposal is now wired into the audit producer,
after prior reviews and only with bound original cases. Validation replays the
earlier bottom-sheet action classification before the new position/offset
checks; skipping that precedence demonstrably fails. The source-extracted
production step and validation calls pass over all 57 original modal cases,
changing exactly **38 groups / 1,125 observations**; an unbound producer keeps
the original rows. Ten source-conservation tests pass (2.16 s), restoring the
entire accepted weight producer byte-for-byte and rejecting removed binding,
validation or precedence. The combined production test passes in 5.52 s.
No canonical rebuild yet: prepare the independent predecessor conservation
comparison for this batch, then perform one complete export/reconciliation.
Expected unresolved count after acceptance is **1,224**, not yet the accepted
canonical count (1,262). Remaining audit and final browser gates are unchanged.

The related bottom-sheet proposal now reuses the same modal owner-request
proof: **13 additional groups / 325 observations** across 25 original cases.
Only the panel's position group is newly attributed as an authored omission;
the two list-item position groups keep their prior classifications unchanged.
Twelve physical-inset groups are computed-zero/local-omission stage differences.
Both focused dialog/bottom-sheet tests pass (9.74 s total), including complete
population and prior-row conservation and rejection of missing/duplicate or
forged evidence. The paired original rules are `.mat-bottom-sheet-container`
and `.mdc-list-item`, each explicitly relative without physical/logical insets.
The initial 2f44011 panel/option rules already omit position, as do current
rules; the exact one-line panel-position history query finds no transition.
This bounded history observation is not a full historical cascade claim and
does not merge the separately proven height, corners or overlay substitutions.
The pending batch is now **38 groups / 1,125 observations**; integrate these
existing-module proposals and source conservation next. No canonical export
was rerun; accepted canonical unresolved count remains 1,262.

Dialog positioning now has a focused executable proposal in the existing
modal inspection module/spec, not a new survey layer. Against accepted bfd986bc,
32 original open cases / five mapped owners prove **25 groups / 800 observations**:
five explicit reference-relative/candidate-omission groups are unequal authoring;
20 computed-zero/local-omission inset groups are observation-stage differences.
Full matched reference declarations and CSS text reject physical/logical inset
requests; potentially applicable candidate rules, inline styles and all three
local stages must omit position/insets. This does not authorize copying computed
zeros, assume an implicit candidate relative default, or prove used layout.
The focused test passes, preserves all raw rows and checks
full membership, missing/duplicate cases, forged classifications, injected
physical/logical inset rules, style-stage divergence and broken owner mappings.
Three adjacent dialog action/constraint and invalid-owner checks also pass
(7.34 s total), preserving the earlier modal proofs.
Recorded panel/action history remains distinct from older title/button omissions.
**Not integrated into the canonical producer yet**: canonical unresolved count
remains 1,262. Next compose this proposal with related positioning cohorts and
the existing source-conservation path before the next batched export. Modal
module/spec fingerprints and focused-test line receipts will need reconciliation
at that milestone; no renderer or fixture source changed.

Corrected weight export **bc898de is terminal**, session 7356 exit 1 after
2,574.62 s. Its only error is the expected **1,262 unresolved groups**; the
earlier follow-up coverage failure is absent. Coverage remains 436/436 static,
1,875/1,875 interaction, 8,483 groups / 389,202 occurrences and 134 source
findings. Evidence-session verification: zero invalidations, 1,205 files,
89,151,875 bytes. Compressed SHA-256 is
`bfd986bc6e7397d32465df25d6096d2274dfe29336924281a3f7fd0429f6f9fe`
(60,110,439 bytes); decoded SHA-256 is
`f1930fd29fd09bae2bd20e2d90e3de5ace07b1437f36185ae5833b6793fe5a24`
(2,100,556,607 bytes). **Partial batch reconciliation passed.** Conservation
session 23252 and section comparison 64949 exited 0; metadata session 11594
exited 0. Outputs are
`artifacts/material-parity/weight-{conservation,sections,metadata}-bc898de.json`.
Exactly 26 groups / 1,502 observations change classification; all raw inputs,
prior reviewed rows and non-receipt control evidence are conserved. Ordered
current rows SHA-256:
`a47e051a9afde539d059c32ea55688bd102b1bde83b7687a73d00aa781e1e052`.
All 79 sections remain present; 71 are unchanged. The eight changed sections
are sourceFingerprints, controlLineBoxes, summary, discrepancies,
ownerCaretInputs, reviewedSourceBatchInputs, ownerInitialStyleEvidence and
controlTypography. All 461 fingerprints match working files; the ten changed
fingerprints match exact 9e8de8a-to-bc898de committed source transitions.
The 48 control-line-box changes are module-hash receipts only; owner-caret and
reviewed-batch changes are the corresponding conserved source receipts.
Summary changes follow the independently replayed classifications.
`weight-owner-evidence-bc898de.json` additionally proves all 65,916 prior
observations unchanged, with exactly 5,252 added font-weight observations:
3,617 default-versus-local-omission and 1,635 still requiring specific review.
No equivalence claim is added. Compact import session **81739** exited 0;
`npm run audit:findings:verify` passed (8,483 discrepancies, 134 source findings,
39,904 controls, 389,202 occurrences, 1,262 unresolved). Import log:
`artifacts/material-parity/weight-import-bc898de.log`. New compact generation is
bfd986bc above, 70,151,415 bytes, index SHA-256
`fead09c2c08b3546503f0d4c014bd3700e03923524d7d8894b430dd5cc194381`.
Modal positioning is next; 1,262 unresolved groups, remaining coverage and
final browser/canonical acceptance gates still prevent overall completion.

Read-only dialog position history closes the origin question for the exact
component rules. `git log -G` and `git log -L` identify **7159b1d**: it removes
`position:'relative'` from `.dialog-panel` while changing content-box 232px /
min-height 112px into border-box 280px / min-height 160px and column flex. In
the same change `.dialog-actions` loses absolute/right 24px/bottom 16px and
becomes normal-flow flex with margin-top 16px and flex-end justification.
Executable assertions over **2f44011**, **7159b1d^**, **7159b1d** and HEAD confirm
that exact transition; the working rules match HEAD. `.dialog-title` and
`.dialog-action` omit position in all four checked revisions. Thus panel
position removal and action layout substitution are historical parity edits,
whereas these title/button rule omissions predate them. Do not classify all five
owners as one newly introduced change or infer the motivating core defect from
the commit title. This proves exact rule history, not all historical cascade or
rendered causality; the already-recorded full-tree current capture proof owns
the present mismatch. Integrate this distinction with the pending modal owner
classification after export reconciliation. No export dependency was changed.

Corrected cold weight export launched from **bc898de**, session **7356**, log
`artifacts/material-parity/weight-export-bc898de.log`. All five original and
supplemental input paths exist; the rejected prior payload's archived hash was
rechecked before launch. No prior audit process was running. Invocation is the
same complete cold export as 2bf4f0b, with only the verified classification
precedence correction and its proofs added. Freeze export dependencies until
terminal; do not restart on quiet output. Expected remaining unresolved count
is still 1,262, but all errors, prior-review conservation, sections and source
fingerprints must reconcile before acceptance/import. After this milestone,
continue the positioning/owner-stage priority below; final browser and complete
audit acceptance remain pending.

Weight precedence correction is now focused-test verified. Conservation session
15128 terminated with exit 1 at row 257 (`badge/badge-label/fontWeight`),
independently confirming the rejected export differs from original-source replay.
The generic owner font-weight fallback now runs after existing specific reviews,
alongside appearance/color fallback, without changing the older eight-property
precedence. The existing regression proves all four prior complete rows / 96
observations survive and that the fallback still classifies them when specific
evidence is absent. Both focused weight tests pass (16.66 s); all nine producer
source-conservation tests pass (2.08 s), including newly added rejection of either
partially changed routing predicate. Full predecessor source hashes remain exact.
No renderer/fixture changes or weaker coverage assertions. The failed export's
three files are preserved at `artifacts/material-parity/rejected-weight-2bf4f0b`,
with compressed hash checked against ac52188b below. Next rerun the corrected
coherent batch export, then perform the pending complete reconciliation; do not
reuse the rejected output as accepted evidence. No audit process remains live.

Weight export **2bf4f0b completed but is NOT accepted** (session 31672,
exit 1, 2,299.18 s). Its complete log reports two errors: expected **1,262**
unresolved groups, plus an unexpected follow-up classification coverage failure
**62 != 66**. Evidence-session verification reports zero invalidations across
1,205 files / 89,151,875 bytes. Coverage remains 436 static / 1,875 interaction,
8,483 scalar groups / 389,202 occurrences and 134 source findings.
Unaccepted output compressed SHA-256:
`ac52188b1f0aa40235fb69af2e6a68f8fc272debf457d598b48f8090c656c9e3`;
decoded SHA-256:
`788fd8162482f72f14cc6cb4564ea8e8e479dbafbe5f35eec8b8a588fc515c2b`.
Do not import, commit or call this canonical batch accepted yet; fcb remains
the accepted predecessor. The existing `--weight` conservation comparison is
running as session **15128**, output
`artifacts/material-parity/weight-conservation-2bf4f0b.json`; poll that handle,
do not duplicate it or change its source dependencies until terminal.

Specific new investigation: did the generic owner font-weight fallback preempt
already-reviewed follow-up classifications? Production ordering places that
fallback before `classifyFollowupInput`. The authenticated historical transition
contains four omitted/400 weight groups (badge-label 40, card-copy 40,
divider-above 8, divider-below 8 observations) as well as the separately
mismatched expansion weight. This explains a plausible four-group collision,
but exact exported rows still require the running conservation result. Next:
confirm the affected rows, reproduce both competing classifiers in the existing
owner-attribution spec, preserve specific prior reviews ahead of the new generic
fallback, and retain this failed export evidence. Do not lower the 66-group
coverage requirement. Remaining batch reconciliation and all final gates remain.

The focused regression now confirms that collision, not merely a count-based
hypothesis: `node --test --test-name-pattern='font-weight fallback preserves'
tests/material-parity/owner-initial-style-attribution.spec.mjs` fails in 18.08 s.
With identical original inputs and follow-up evidence, adding owner-initial
evidence replaces all four source-reviewed leaf weight groups / 96 observations.
The new test is currently an uncommitted failing proof; the production fix is
not applied while conservation session 15128 still reads its source dependencies.
Preserve specific existing reviews before the generic font-weight fallback,
then prove both preservation and fallback availability in this same test.

Post-weight investigation priority (read-only while export runs): authenticated
compact fcb still has **1,288** unresolved groups. Largest families are dialog
161, bottom-sheet 112, chips 101, tabs 99; inset properties alone account for
170 groups (top 39/right 48/bottom 41/left 42). Continue source/export
reconciliation first, then group positioning/box/typography questions by owner
and observation stage rather than classify one scalar at a time. Table's eight
reset groups are bounded but not the highest-impact remaining cluster.

New dialog scalar matched-rule check distinguishes two competing explanations:
missing position authoring versus computed-offset/local-declaration stage
mismatch. All **32** captured open dialog cases, across activate, activate-leave,
open-hover-content and open, have the same result for panel, actions, title,
save and cancel: **160 owners / 640 inset observations**, browser offsets `0px`
and explicit `position:relative`, candidate offsets/position omitted. Captured
matched rules author relative position but no inset on the reference and neither
on the candidate. Ordered witness digest
`7d05be4f6a3462bbbce93b26687273ec1b4ef796995d6b9fd92f16a97bcdd3af`.
Complete-tree follow-up now passes for all 160 owners (3.00 s), reusing
`collectFullTreeInventory`, `modalInventoryTrees`, `proveModalPositionInspection`
and conservative candidate selector exclusion. Every mapping is `mapped`, both
rule sets are complete, reference inline styles are empty, candidate inline
styles absent, and complete candidate rules plus all three captured core style
stages omit position/insets. Active reference rules explicitly request relative
position and neither declaration dictionaries nor serialized CSS request an
inset/reset. Full-tree ordered witness digest:
`b1d509dfa66998535256ea5982009341646be7d51bd80afaaf3bb9e09107d3e4`.
Thus relative-position authoring omission is established independently of the
offset-stage comparison. Current source also disproves a general implicit-relative
alias: global/type defaults do not supply position, ordinary-flow offset logic
requires explicit relative, and the actual source-extracted stacking kernel gives
local depth **0.001** for omitted/static versus **0.15** for relative under the
same controlled nested ancestry. Source
`src/app/services/dom/positioning/stacking-context.manager.ts` normalized SHA-256:
`e65f87b070f8a3941fd224b70e544f581f46afdf4097ef1c7db15533131e9a8a`.
The five production methods and their production fields/constructor were parsed
and transpiled as in the existing modal kernel proof; no algorithm was copied.
This is current-source stacking evidence, not original-bundle runtime or final
dialog raster proof. Candidate contextual descendant layout and rendered
equivalence remain unproved. Next integrate these two scopes
through the existing modal proof after export completion, with mutation rejection
for explicit/competing offsets, inline requests and detached mappings. Do not
convert missing candidate offsets to zero or waive position authoring. No
canonical classifications or export dependencies changed during these checks.

Read-only follow-up during the weight export closes the table-host reset history
question. Compact fcb findings contain **eight unresolved side-color groups /
208 observations**, two theme values per side (39 light and 13 dark), belonging
to the already authenticated 52 table owners. `git log -L` for the exact
`.material-table` rule identifies initial commit **2f44011** and sizing commit
**f980edc**. At both commits and current HEAD the host authors only
`borderWidth:'0'`, with no border color/style/reset. The initial whole-rule
equality assertion failed correctly: f980edc changes height 162/114/138 to
160/112/136 and font size 14 to 16. Restricting the historical claim to border
semantics passes all three revisions; current on-disk rule also matches HEAD.
Do not describe the whole rule as unchanged. This is a long-standing explicit
reference reset translation omission, not a new core default regression or the
separate detached-cell-border finding. Existing 52-case rule/owner evidence above
still owns capture coverage; it was not recensused. Next extend the existing
reset proof narrowly for table `0px none currentColor`, checking competing rules
and treating border-spacing separately from color. No scalar classification or
export dependency was changed during the active run.

Weight milestone cold export launched from **2bf4f0b**, session **31672**,
log `artifacts/material-parity/weight-export-2bf4f0b.log`. All five explicit
input paths were checked present; invocation matches the complete cold export
below (current ancestry, normal line box, control line box v3, supplemental line
box and supplemental root). Do not restart this run or edit its dependencies
while active. On terminal completion inspect all validation errors, run the
existing comparator with `--weight`, then reconcile sections/fingerprints and
import only after acceptance. Expected unresolved count is 1,262; that count
alone is not acceptance. The accepted snapshot remains fcb until those checks.
Latest verified phase: `validate-audit`, reached at **851.93 s**; Node PID
**2152** remains live. Do not treat that phase transition as terminal success.
Pre-export fingerprint reconciliation scope is now established: **461** prior
audited files checked against current LF-normalized bytes, **451 unchanged /
10 changed**. Every changed baseline hash was independently checked against
Git **9e8de8a**. The ten are `position-composition-producer-transition.mjs` and
its spec, `motion-source-conservation.mjs`, `input-equivalence-audit.mjs`,
`owner-initial-style-attribution.mjs` and its spec, `owner-initial-style-survey.mjs`
and its spec, and `retained-font-scalar.mjs` and its spec (all under
`tests/material-parity`). Current main producer hash is
`6c6194f17fd0651c043ec3890870d2df12158558626e49d615e65a2fd29a6bfd`.
No audited renderer or fixture source changed. Reconcile the export against this
exact delta; this preflight does not authenticate or accept the new package.

Combined original-capture replay now passes via
`node scripts/check-material-position-canonical-conservation.mjs --weight-replay`:
all **42** unresolved predecessor weight groups are accounted for; exactly
**26 / 1,502** are attributed (20/1,142 owner-stage, 4/224 interactive stage,
2/136 toggle token), and **16** remain excluded. Full canonical comparison is
wired through the same command with `--weight`; it has not run yet.

The initial combined replay failed on checkbox-label membership (`0 !== 1`):
production grouped new interactive rows with old static rows because their
classification/justification keys were identical. This lost the interactive
proof's explicit false paint/equivalence flags. Audit instrumentation now gives
interactive weight evidence a distinct scope sentence, preserving static
justification and grouping byte-for-byte. A mixed original static/interactive
test proves eight separate groups and exact independently collected evidence.
Focused interaction/source tests pass (2/2, 7.83 s), all producer-transition tests
pass (9/9, 1.78 s), and focused scalar conservation tests pass (4/4, 2.21 s).
No renderer or fixture changed. The fcb predecessor's standalone manifest was
restored from its hash-authenticated index; archived payload bytes are untouched.
Next run the coherent milestone export, then `--weight`, section/fingerprint
reconciliation and canonical import. Do not rerun this population census without
a relevant change. Canonical unresolved count is still **1,288**, not yet 1,262.

The existing scalar canonical comparator now supports the pending weight batch:
exactly **26 groups / 1,502 observations**, with the three attribution populations
checked independently. Raw rows, prior classifications, ordering, control evidence
and the 48 exact producer-receipt transitions remain protected. False rendering
equivalence and incorrect classification claims reject even when expected rows
are forged alongside the result. The existing conservation suite passes **16/16**
(`node --test tests/material-parity/position-canonical-conservation.spec.mjs`,
42.17 s). This is checker verification, not canonical acceptance. Next wire the
original-capture replay for all three weight paths into the existing comparator
CLI, authenticate the fcb predecessor, then perform the coherent export and
section/source-fingerprint reconciliation. No export or browser recapture ran.
Priority remains pending source/export reconciliation first, unresolved input
classifications grouped by subsystem next, and complete browser/final acceptance
after coverage closes. Canonical unresolved count remains **1,288**.

Weight-batch historical guards are reconciled. The initial transition test
correctly rejected the new main-module code. The existing restoration chain now
removes exactly the reviewed interactive-weight guard/evidence additions and
authenticates the complete predecessor (`ca9c7a97…`); altered guard fragments or
unrelated bytes reject. All **nine producer-transition tests pass** (1.56 s).
Historical motion replay also passes (**121 groups / 7,254 observations**, 39.55 s):
all non-receipt evidence and 12 mapping declarations are conserved. Survey
restoration removes exactly the three opt-in weight changes before checking the
prior complete source hash; it is not a wildcard fingerprint allowance. Existing
stale receipt, changed mapping and changed evidence tests remain enforced.
Next prepare the combined 26-group canonical conservation check using the
accepted fcb snapshot, preserving raw rows, earlier classifications, and source
receipt-only changes. No new export has been run for these guard edits.

Interactive control-label font-weight stage comparison now covers **four groups /
224 observations** (checkbox, both radio labels, slide-toggle). The existing
static-stage classifier admits only the reviewed control families' interactive
weight-400 comparisons, with matching case/family/state, core text-registry
provenance, nonnegative revision, omitted local declarations and equal retained
weight. It explicitly retains `currentPseudoStatePaintVerified:false`,
`inputEquivalent:false`, `renderingEquivalent:false`; other interactive typography
properties remain excluded. Five focused retained-font tests pass in 8.06 s,
including all 168 original family cases and mutation rejection for stale state,
source, revision, altered retained/normal values, text and false paint claims.
The first test invocation lacked required empty production argument wrappers and
failed before classification; corrected invocation passes without changing guards.
Combined pending weight batch is **26 groups / 1,502 observations** (20/1,142
owner-stage, 2/136 toggle token, 4/224 interactive retained stage). Next reconcile
historical source guards, complete prior-row conservation and source fingerprints
before milestone export. Canonical snapshot remains 1,288 unresolved; do not claim
the expected reduction is accepted yet.

Button-toggle host weight attribution is now implemented in the existing
retained-font scalar join (no new collector/framework): **two groups / 136
observations**, all 68 original cases. Host scalar snapshots (89 reference
properties and all three candidate stages) bind to distinct label proofs through
both actual ancestry chains. Validated Material token evidence requests 500 while
candidate declarations omit weight and the text registry retains 400. This is an
application/plugin authoring omission, not candidate host computed-style or glyph
parity. Revision, identity, chain linkage, exact token and membership guards reject
detached/forged evidence; persisted lost/duplicate classifications also reject.
All four retained-font scalar tests pass (3.19 s), including existing font-family
behavior. Production already invokes this join and validator under original-source
binding. Combined source changes remain ahead of the canonical snapshot; next
handle the four interactive control-label stage groups, then reconcile historical
collector/source guards and the combined batch before a milestone export.

Font-weight predecessor/production check passes (2.96 s): restoring the two
reviewed integration literals reproduces the complete `16e7979` attribution
module exactly. Executing that predecessor against the paired original static
and activated stepper cases yields identical non-weight observations. In the
actual scalar production chain, non-weight rows and the static retained-stage
weight row remain byte-for-byte equivalent as objects; only the unresolved
interactive weight row gains the reviewed owner-initial attribution, preserving
values, case/state lists and occurrence count. This is a bounded precedence
regression plus exact source-delta proof, not a new full-canonical acceptance.
The earlier full 42-group membership replay remains valid; do not rerun its
137-second census for this test-only change. Next address the two weight-500
button-toggle host groups using existing retained token proofs, then the four
interactive control-label stage gaps, before reconciling the combined export.

Font-weight observation-stage classification now uses the existing source-bound
owner-initial path (property selection plus the opt-in inspector). Full unresolved
membership replay passes: **42 groups / 2,184 observations**, of which exactly
**20 / 1,142** qualify and **22 / 1,042** remain excluded. Every original case,
state list and sampled ordering matches the pinned fcb compact snapshot; duplicate
evidence is rejected and neither candidate computed weight nor raster equivalence
is claimed. The full population test passed in 137.36 s; do not repeat this census
without a relevant change. Five focused binding/rejection/precedence tests pass
in 12.59 s, including lost weight observations and forged equality rejection.
Next reconcile this collector's complete predecessor (non-weight observations
must remain unchanged), verify production precedence for the new weight rows,
and integrate with the remaining weight-token/retained-stage batch before another
canonical export. Current canonical count **1,288** is unchanged; source is newer
than that accepted snapshot. No renderer, plugin or fixture changes.

Generated font-weight owner replay is now complete: **78 slider-visual and 56
interactive stepper-content cases**, each authenticated against original tree
hashes. Existing unique alias/template mappings succeed for every case, with
three rejection mutations per case (duplicate owner, broken ancestry, altered
normal stage). Six focused survey tests pass in 3.11 s. The stepper's 12 static
cases already have retained-stage attribution and are intentionally outside this
unresolved interaction population, not silently dropped. Combined with the
18 direct-owner groups, inspection now covers **20 groups / 1,142 observations**.
Next extend `owner-initial-style-attribution.mjs`'s existing source-bound property
selection, inspection and classification path with the opt-in weight evidence;
retain existing precedence and independently replay full membership. No new
survey framework or rendering claim is needed. Production/canonical integration
is still pending; the accepted partial snapshot remains at 1,288 unresolved.

Font-weight survey now has an explicit `reviewedFontWeight` opt-in; existing
survey populations remain unchanged. Five focused tests pass (2.19 s), including
30 declaration-location mutations plus ancestry, motion, provenance, unknown
selector and scalar disagreement controls. Font shorthand and variation settings
remain review blockers. No candidate computed weight or final paint is inferred.
Authenticated current compact membership plus original trees reproduces **18
direct-owner groups / 1,008 observations**. An initial expected-20 assertion
rejected the probe: it omitted `reviewedGeneratedOwners`. Representative checks
confirm the missing slider-visual and stepper-content owners use existing unique
alias/template mappings. Next replay all their 78/56 observations with those
reviewed mappings, then add complete-membership attribution through existing
machinery. Do not treat the representative checks as the complete 20-group proof.
The survey extension is not yet production classification; its source changes
also mean the last canonical snapshot predates this new inspector revision.

Cold dialog/card export has completed (2,249.6 s); its sole reported gate error
is **1,288 unresolved differences**. Coverage remains 436 static / 1,875
interaction cases, 8,483 scalar groups / 389,202 occurrences and 134 source
findings. Pending package SHA is
`fcb44846abf9e0b7a63a0277d3990b8420709765748ef27fb625c2ebf40812a9`;
decoded SHA `5bb6b2164c230ff32593d6721375f5be2379ba3a529116b6af93ba9df6df177b`.
This package is accepted as the reconciled **partial audit snapshot**, not as
input equivalence or audit completion. Compact import and index verification
completed: 8,483 discrepancies, 134 source findings, 39,904 controls, 389,202
occurrences and 1,288 unresolved. Log:
`artifacts/material-parity/dialog-card-import-9e8de8a.log`. Canonical batch
`3f74d9b` is pushed; GitHub warned about the 56.98 MB compressed report size.

Canonical conservation passed: exactly 23 groups / 896 observations changed,
one scalar receipt and 48 control receipts refreshed; all raw inputs and all
non-receipt control evidence conserved. See
`artifacts/material-parity/dialog-card-conservation-reconciled-9e8de8a.json`.
The first attempt's ENOENT log is retained: the importer stores its manifest
inside `index.json`, not a standalone file. The authenticated b74 index supplied
the restored standalone manifest; original compressed evidence was unchanged.
Metadata comparison completed in `dialog-card-metadata-9e8de8a.json`: only the
five expected source fingerprints changed, all 461 exported fingerprints match
current normalized-LF files, and remaining changes are expected summary/source
receipt updates. Whole-report comparison completed: **79 sections, 71 unchanged,
eight changed, none added or removed** (`dialog-card-sections-9e8de8a.json`).
Discrepancies/control typography reconcile through conservation; source
fingerprints, control line boxes, summary, owner caret and reviewed source batch
through the metadata comparison. The remaining focused-proof inventory has
exactly 42 source-line updates (+233 or +2), with no other field changes
(`dialog-card-focused-proofs-9e8de8a.json`). Both packages were authenticated
against compressed and decoded hashes. Do not restart export. After compact
import completes, verify the index and continue the scoped font-weight work below.

Interactive control-label weight follow-up: **four groups / 224 observations**
(56 each checkbox label, both radio labels, slide-toggle label) already have
authenticated own-text retained comparisons: browser weight **400**, core text
registry weight **400**, candidate normal/effective declarations omitted, text
and owner identities matching. Ordered case/owner/revision/value digest:
`5c5e407471acbf41e7322122754022df38361b5e56649bddc5782ac2f0bbf488`.
`classifyReviewedTypographyStage` explicitly rejects `benchmarkCase.state`,
explaining why the 12 static cases per label have stage-mismatch attribution
while these interaction cases remain unresolved. This does not by itself prove
the state exclusion is wrong: retained registry equality is not current glyph
paint equality. Next assess a property-limited stage-comparison claim with the
current-paint limitation retained; do not remove the state guard globally or
repeat the captured-label census. No producer or canonical changes in this step.

Cold dialog/card export from `9e8de8a` used session **82070**, Node PID
**22428**, log `artifacts/material-parity/dialog-card-export-9e8de8a.log`.
It is terminal with exit 1 for the unresolved-attribution gate described above.
No producer dependencies changed during the run; evidence-session verification
reported zero invalidations. Do not restart this completed export.

Read-only next-batch triage: unresolved font-weight is **42 groups / 2,184
observations**, not one homogeneous default problem. Two button-toggle hosts
(136 observations) join exactly to the existing 136 validated
`reviewed-control-label-token-input` leaf proofs: reference 500, retained 400,
candidate local stages omitted. Host identity, all scalar fields, three core
stages and both ancestry chains agree. Ordered case/host/proof digest:
`9aa39b485ed1c4fcb024b564a4795c4d02125291c9709dbf808a742d31fcd8ac`.
`c47d589` introduced the `.button-toggle-option` div/span replacement without
font-weight; current selector at `astylar.component.ts:513` still omits it.
Reuse retained typography evidence for these host rows rather than diagnosing
font rendering again. No new root-cause or raster claim is implied.

The other 40 groups / 2,048 observations were explored using an **in-memory,
uncommitted diagnostic variant** of `inspectOwnerInitialStyle`: add
`fontWeight:'400'` to initial values and `fontWeight:['font']` to aliases; all
other guards unchanged. Original full trees authenticated; membership includes
the row's states (the first probe correctly rejected 68 candidates for a
56-interaction-only label row, whose 12 static cases already have a review).
Twenty groups / 1,142 observations pass conservative surface-ancestry and
declaration checks. Other groups remain blocked by generated ownership (sheet,
snackbar, dialog panel), overlay ancestry (dialog actions/copy), motion (chips,
progress, tab panel), or explicit declarations (control labels/native slider).
Ordered complete diagnostic proof digest:
`14eb79e9160aef03083bd6733c9aee13c4d22998c28483361637cc9b8a328c5b`.
This probe is **not production support or classification** and does not verify
computed candidate inheritance or glyph paint. After the current export is
reconciled, extend the existing opt-in owner survey with negative controls and
complete membership replay; retain all failed groups and external-inheritance
uncertainty. Do not repeat the font-weight census.

Dialog/card border batch is ready for cold canonical export. Compact accepted
membership plus original-tree replay identifies exactly **23 unresolved groups /
896 observations**: card token/style 8/416, dialog initial-color sides 7/224,
dialog button reset 8/256. The card path is now wired into production application
and validation, gated by bound original cases; all raw row fields and prior
classifications remain preserved. Missing/duplicate membership and forged proof
tests pass. Existing canonical comparator now has `--dialog-card-borders`, pinned
to accepted `b74de570…`, with exact 23/896 admission and the existing 48 control
receipt constraints. Source restoration authenticates both card and dialog reset
integration against their complete predecessor modules.
Verification: seven border tests pass (47.27 s), three card/unbound tests pass
(14.21 s), source/session tests 8/8 (8.34 s), canonical conservation tests 15/15
(43.80 s). Border source SHA `a809c257d8edcd07b1261cad6f7a0a15b5245fa0832922e4bebf287e21b6eff2`.
Expected remaining count after successful export/reconciliation: **1,288**, not
yet accepted. Next run one cold export, inspect all errors, reconcile raw rows,
controls and changed sections, then import the accepted compact snapshot.

Card border input proof now passes for all **52 original hosts**, with eight
side color/style properties per host. The reference explicitly authors the
Material elevated-container border token and `solid`; the candidate omits both
and resolves transparent/none at all three captured stages. This is an
application/plugin authoring omission, not equivalent zero-width inputs or a
newly demonstrated renderer defect. The pending guard originally rejected two
table-descendant rules; reusing the existing conservative rightmost-selector
exclusion proves those rules cannot target this div, without assuming ancestor
matches or synthesizing a cascade. Unknown selectors still prevent attribution.
Each host passes 17 rejection mutations covering source rules, selectors, stage
provenance, incomplete scalar data and duplicate identity. Six focused border
tests pass (32.67 s); source-history guard passes (1.35 s). Reviewed module SHA:
`444231b27424f96024d2fc1b63198fb5446205ce34b03e71663b22a60c6b97fc`.
This is a tested inspector, **not yet production classification**: next reuse
complete-membership application/replay for the recorded 8 groups / 416
observations, then integrate with the pending dialog batch. Accepted canonical
`b74de570…` remains unchanged at 1,311 unresolved; do not repeat the card census.

Dialog border batch preparation is complete: compact accepted membership plus
authenticated original trees replays **15 previously unresolved groups / 480
observations** across actions, cancel, panel and save, with no remaining dialog
border-color groups in that population. Split: reset 8/256, panel 4/128,
action-container non-top sides 3/96. This is not yet canonical integration.

`dialogActionNonTopSides` proves only right/bottom/left omission; it retains the
explicit transparent 1px solid top border and inactive forced-colors top-only
`canvastext` rule. The initial conservative test rejected that additional rule;
the corrected proof preserves it explicitly rather than discarding inactive CSS.
All 32 owners pass nine rejection mutations each, including active/altered
forced-colors witnesses. The top side remains unclassified by this proof.
All five mapped-border/reset tests pass (29.20 s), exact source-history mutation
test passes (1.18 s). Complete border source SHA:
`bee460c11f87b7a319057bfa5e84b6521636d7f54af3aaf3eea2ca837eeb51fd`.
Accepted `b74de570…` still has 1,311 unresolved; pending production fingerprints
and this 15-group batch require export/reconciliation at the next milestone.
Next use the recorded remaining border cohorts (card token, table reset, badge/
progress motion) or shared paint-input findings; do not repeat the dialog census.

The mapped initial-color proof now admits the exact authenticated dialog-panel
motion pair through `dialogPanelMotionOverride`: two active unconditional rules
in the same author sheet, later/higher-specificity explicit `transition:none`,
exact serialized base transition and five verified pending/disabled longhands.
Other color/reset requests still reject; no variable expansion or empty-longhand
absence is inferred. The witness is retained in each proof and explicitly does
not certify animation settlement or raster output. Original **32 panel owners**
pass, with seven mutation controls per owner (inactive/conditional/reordered
override, altered serialization, important base, added transition and color rule).
Existing mapped-initial and mapped-reset coverage remains green: **4/4** tests
(26.73 s); exact complete-source/selector mutation test **1/1** (1.29 s).
Full reviewed border module SHA:
`7d8641713a314b41daf4447cc391755078ce4766732fb69fab13717de26a99c1`.
This extends the already-wired mapped-initial path; next quantify complete scalar
membership alongside the action-container non-top sides before the batch export.
Canonical `b74de570…` is unchanged; no renderer or fixture changes.

Mapped-button reset production wiring is complete: application is gated by bound
original cases, validation independently replays complete original membership,
and unbound reports carrying this attribution are rejected. Exact producer
restoration removes only the five reviewed integration fragments and reconstructs
accepted main SHA `9be3c2759e00aeda6ce6ece68423598b0a74401f2576e21d00f09aee4c85d10a`.
All historical adapters inherit that restoration through the existing chain.
Source/dependency suites pass **19/19** (14.27 s); original mapped-reset,
membership/tampering and production unbound-evidence tests pass **3/3** (13.24 s).
The full export is deliberately deferred to the next coherent batch: accepted
`b74de570…` still has 1,311 unresolved groups and is not current producer evidence.
Next address the already-recorded dialog-panel serialized motion/override and
dialog-action side-scope border questions; use their existing source witnesses,
not another census. No renderer or fixture changes.

Mapped reset classification/replay is implemented in the existing border module,
sharing complete case-membership logic with mapped initial colors. Focused tests
prove **8 groups / 256 observations**, preserve every raw field and prior review,
and reject missing/duplicated cases, deleted rows/proofs, forged values, invented
width-rule evidence and false equivalence. Both reset tests pass (11.47 s).
The existing mapped initial-color full-membership test still passes (12.92 s),
and the exact source-history mutation test passes (1.14 s). Full border module
snapshot `0a999d524abedb0ed3c6a8665630905e3b9ed3650244a84960103e0cd4ee1f41`
is explicitly authenticated by the historical-reader guard; unknown modifications
still reject and shared selector bytes remain equal. No canonical classifications
have changed yet. Next wire `applyMappedButtonBorderReset` and
`validateMappedButtonBorderReset` into the bound-original-case production path,
including unbound-evidence rejection and exact producer-source conservation;
batch the later export with remaining border/paint evidence, not this helper alone.

`inspectMappedButtonBorderReset` now extends the existing border evidence module
without changing production classifications. It reuses the complete alias and
Material reset proof, requires exactly one reviewed zero-width rule (including
`.dialog-action`), all three transparent candidate stages and zero/none geometry,
and rejects competing reset/color/motion authoring. The focused original-source
test passes for all **64 owners**, with nine rejection mutations per owner
(competing color/reset/motion, missing/duplicate width rule, inline color,
missing reference reset/no-motion evidence and missing candidate normal stage).
Existing border tests pass **6/6** (45.22 s); producer-transition tests **7/7**
and exact border-source mutation test **1/1** pass. Complete new border source
SHA is `d227f234f19e19e4f2ee3705d5fe6d239738fe5a33c49bdf44dae3822033f099`;
the source-history guard authenticates that exact addition and restores the
entire accepted `1acfdc…` predecessor, retaining the shared selector unchanged.
Next integrate this proof with full scalar membership/validation and batch it
with the remaining border questions before another export. Accepted `b74de570…`
remains historical to this pending source change; its index is not a claim of
fresh producer fingerprints. No renderer, fixture or canonical output changed.

The accepted batch push completed: `e25512f` is on the remote integration branch.
GitHub warned about the 56.91 MiB canonical gzip but accepted the push.

The remaining mapped dialog-button reset question now has complete candidate
evidence: **64 owners / 256 side observations** authenticate their original
report, full trees and alias identities. Each uses the exact `.dialog-action`
zero-width rule, omits competing color/reset/motion declarations in every
potentially applicable candidate rule and inline input, and retains transparent
border color with zero/none geometry in all three candidate stages. Reference
colors remain currentColor. Ordered case/mapping/width-rule/color digest:
`e4fba3e19f469472464e0d2a07c2b8349d9df0254a06807c7fd658dbc4fae170`.
Together with the previously authenticated reference-reset witness `ee1c3d…`,
this is the existing incomplete reset translation, not equal-input rendering.
The initial probe correctly failed its existing width-rule allowlist (zero
matches): these use `.dialog-action`, not `.material-button` / `.text-button`.
No source classifier was broadened. Next extend the existing reset proof through
the authenticated alias mapper with this exact width-rule case and rejection
tests, then batch its classifications; do not rerun the reference/candidate census.

**Accepted border batch: `b74de570…`.** All pending section conservation checks
pass (`artifacts/material-parity/border-defaults-collector-conservation-0d0e1bc.json`):
3,580 existing initial-color proofs remain byte-for-byte equal after removing
exactly 84 reviewed heading additions (52 card, 32 dialog; added-proof digest
`1a22c39ea3b1b9b010ca76f64384ee45e943c14755a622ba2260b01af8afbcf7`).
All old outline fields survive the 68 owner extensions; all old slider fields
survive the 624 color-property additions. Proof catalog differences are line
numbers only. Together with the completed scalar/control, all-section, caret,
motion and source checks below, this reconciles the complete export.

The compact index import completed: **8,483 groups, 134 source findings, 39,904
control differences, 389,202 occurrences, 1,311 unresolved**; compact bytes
70,091,865. No export or import remains running. Original `4059599c…` and failed
`e8232b90…` remain retained for their referenced evidence. The stale workflow
count was corrected in `418ba73`; both focused tests pass (0.93 s), including
the broken-pointer negative control. That test is outside canonical fingerprints.
Next continue the recorded mapped Material-button reset / dialog-panel motion
border gaps and shared paint-input gaps; do not repeat this integration. Final
full audit/browser acceptance remains outstanding; this is not renderer parity
or audit completion. No renderer/reference fixture was changed.

Caret and control receipt reconciliation passes: exactly three caret changes
(authenticated border-module hash/verification label plus current main producer
hash) and 48 control-line-box producer hashes, with no other metadata changes.
`verifyBorderEvidenceSourceTransition` authenticated complete old/new source
snapshots; producer restoration also passed. The remaining section diff completed
in session 74730 and is retained as
`artifacts/material-parity/border-defaults-proof-sections-v2-0d0e1bc.json`.
Its first invocation had a PowerShell quoting error before reading data; preserve
the earlier `border-defaults-proof-sections-0d0e1bc-error.log`, not a false pass.
Outline changes are 68 owners × five fields; slider changes are 156 owners ×
four added color properties. Heading insertions shift array indices, so the
63,724 leaf diffs must still be reconciled by stable identity, not accepted as
unrelated wholesale changes.

The proof-catalog section changes only 42 line pointers. A focused workflow test
revealed a **pre-existing stale expectation: 107 actual entries versus 106**.
Independent TypeScript extraction of both accepted `2cec292` and current
`focusedProofInventory`/`proof` functions produced identical 107-entry inventories
against current files; every pointer resolves. No catalog addition occurred in
this batch. The other workflow test passes. Correct the stale count with its
proof after retaining this failure; do not describe the unchanged test as green.
No export/import is running; candidate acceptance remains pending complete
heading/outline/slider section conservation. Reuse the completed scalar/source/
motion/section results instead of rerunning them.

Independent reconciliation of candidate `b74de570…` now passes scalar/control
conservation: **83 groups / 2,596 observations**, all raw inputs unchanged,
one existing outline proof row, one embedded scalar receipt row and 48 control
producer receipts. Ordered current rows SHA:
`6243cce40b4a0077121ba04de8c2dd87bf5bed371ccb239301875d7a4a4e559b`.
All **461** source fingerprints match current normalized-LF files. Independent
motion replay reproduces `59065eee6fd927b7be36688db357c6ace85db8a87e8e2a04151567921643316c`,
preserving 121 groups / 7,254 observations and historical receipts.
All three reconciliation sessions are terminal, exit 0. The section inventory
preserves all 79 sections with no additions/removals: 68 unchanged, 11 changed
(`sourceFingerprints`, `controlLineBoxes`, `summary`, `discrepancies`,
`borderInitialInputs`, `outlineTokenInputs`, `ownerCaretInputs`,
`reviewedSourceBatchInputs`, `sliderBorderDefaults`, `controlTypography`,
`focusedProofs`). Metadata diff is retained at
`artifacts/material-parity/border-defaults-metadata-0d0e1bc.json`.
**Next:** reconcile the complete changed border collector sections and
`focusedProofs` against the already-reviewed finite extensions, plus verify the
three caret binding changes. Do not accept/import yet or repeat completed scalar,
source-fingerprint, motion or section checks. No export is running.

Corrected export `0d0e1bc` is terminal: **exit 1, 1,988.51 seconds**.
Its sole reported error is **1,311 unresolved groups**, matching the proposed
83-group reduction from the accepted baseline. Coverage remains 436/436 static
and 1,875/1,875 interaction cases; all 8,483 groups, 389,202 observations and
134 source findings remain. Evidence-session verification read 1,205 files /
89,151,875 bytes with zero invalidations (two collectors, ten memory hits).
Candidate compressed SHA is `b74de5707d4cb62eee5da0aa540746d2da9116e4be73e80affbf5b6e2949816a`
(59,678,514 bytes); decoded SHA is
`1a0f49bd56a74128125c60f17a0d3956383dce6a78e7a74419f85a97e244836f`
(2,091,224,225 bytes). This is **not yet accepted** or imported into the index.
Independent scalar/control conservation is running in session 32955, output
`artifacts/material-parity/border-defaults-conservation-0d0e1bc.json`; section
comparison is running in session 50196, output
`artifacts/material-parity/border-defaults-sections-0d0e1bc.json`. Each has a
matching `-error.log`. Reconcile changed source/caret/producer metadata before
acceptance. Accepted `4059599c…` remains the baseline. Do not restart the export.

The existing independent conservation CLI now supports `--border-defaults`.
It authenticates accepted `4059599c…`, streams the candidate package, replays the
original captures, checks exact complete scalar rows and preserves raw fields
independently of expected metadata. Only the 83/2,596 reviewed additions,
existing second-toggle left-divider proof updates and authenticated control/
embedded-scalar producer receipts are permitted. All other control evidence
must remain identical. The existing conservation suite passes **14/14**
(39.21 s), including joint actual/expected raw-data forgery, lost/reordered
records, unrelated metadata, altered producer source and control-value mutation.
This is preparation, not a comparison result: run
`node --max-old-space-size=8192 scripts/check-material-position-canonical-conservation.mjs --border-defaults`
after the current export reaches terminal state. Section/source/caret receipt
reconciliation remains separately required; this scalar/control comparator does
not claim to cover those other top-level sections. Export `0d0e1bc` has reached
validation without the previous binding failures in its current log.

Independent border replay exposed an incomplete batch estimate: **83**, not 75,
previously unresolved groups qualify (**2,596**, not 2,324 observations). The
first accepted-baseline replay conserved every raw scalar row, then deliberately
failed the old expectation (`83 !== 75`); this was not hidden by accepting the
new export. A compact membership query isolated the additional eight groups to
`stepper-content` (68 owners / 272 side observations). The earlier 44-group
mapped test covered nine named owners, while production's reviewed alias mapper
also admits stepper content. A separate check authenticated original report and
both trees for all 68 owners; all satisfy the unchanged complete omission/stage
proof with mapping status `mapped`, reference light/dark currentColor and candidate
transparent. Ordered case/proof digest:
`e4a674d1b189be8c0e9d4b8ca89eaa0ee959f6adf1d774d9eecfd4a67342492c`.
This is additional same-proof coverage, not a new root cause or renderer change.

`replayBorderDefaultRows` now extends the existing independent conservation
script, outside the export's dependencies. It derives heading, slider-color,
outline-side and mapped-owner metadata from authenticated original tree
collectors, checks full membership/state consistency, and preserves all other
rows. The accepted full-baseline replay plus exact raw-row comparison ran before
the count expectation failed; syntax/diff checks pass. Full comparison with the
new canonical output and receipt transitions remains pending. Do not rerun the
owner census or restore the incorrect 75-group expectation; use 83/2,596 at that
integration, and keep the extra stepper proof covered in future focused tests.

Corrected cold export from `0d0e1bc` is running: session **81293**, PID **2452**,
started 19:48:51 local; log `artifacts/material-parity/border-defaults-export-0d0e1bc.log`.
All three line-box reports and supplemental root were supplied. Dependencies
remain untouched during the run; accepted `4059599c…` remains authoritative.

One remaining reference-reset question is closed without a new capture or proof
framework: all **64 dialog action owners** pass the existing exact
`materialButtonReset` function against their complete authenticated tree rules.
The check extracts that function and its two lexical dependencies from the
hash-pinned current module (no copied approximation), authenticates the original
report plus both trees, and reuses the full alias mapping for each owner.
Every witness is `.mdc-button` / `medium none currentColor`, with the existing
important no-animation/no-transition selector. Ordered case/element/node/proof/
full-rule digest: `ee1c3d712795a76f73cc508449ac10b6ab682403a8ea06cd59bb6a5d42a4785d`.
Thus the later mapped-owner extension can reuse the reset proof rather than
inventing another motion classifier. This establishes reference-reset eligibility,
not full scalar classification, used geometry, motion settlement or visual parity;
candidate-stage and exact scalar membership checks remain required at integration.

Shared border-dependency reconciliation is corrected in the existing gap, caret
and alignment readers. `verifyBorderEvidenceSourceTransition` in the existing
producer-transition module authenticates both complete historical/current
snapshots and conserves the shared standalone selector source. Historical
receipts remain historical; caret records the distinct current receipt and
verification method. Unknown module edits, changed imports/helpers, substituted
historical bytes and forged descriptor hashes are rejected.
Focused source/conservation suites pass **18/18** (12.99 s); original alignment,
text-alignment and LTR adapter replays pass **3/3** (82.16 s). Direct original
caret replay binds **4,050 observations**. Both previously failing commands pass:
`node scripts/audit-material-explicit-gap-composition.mjs --check`
(16 groups, 296 cases, 1,032 observations, 40 negative controls) and
`node scripts/bind-material-gap-review-membership.mjs --check`
(38 groups, 1,902 observations, 676 cases; the two unresolved motion groups remain).
No original reports or comparison inputs were rewritten. These focused results
repair all six observed binding paths, not canonical acceptance. Next run one
corrected combined export and independently reconcile the 75 pending groups,
existing outline proofs and all producer/caret/source receipt changes against
accepted `4059599c…`. The failed `e8232b90…` package stays retained, not imported.

Export `51fa73d` is now **terminal, exit 1, 1711.83 seconds**. All six invalid
bindings (`alignmentFontInputs`, `textAlignInputs`, `ltrAlignmentInputs`,
`ownerCaretInputs`, `gapReviewInputs`, `explicitGapInputs`) report the same changed
border-module dependency below. These binding failures leave 1,606 unresolved
groups; do not interpret that as accepted new findings or accept the expected
75-group batch. Coverage remains 436/436 static and 1,875/1,875 interaction;
8,483 groups / 389,202 observations / 134 source findings remain in the package.
Evidence-session verification reports 1,205 files / 89,151,875 bytes,
zero invalidations, two collectors and ten memory hits.
The failed manifest, payload and Markdown are retained at
`artifacts/material-parity/border-defaults-export-51fa73d-failed/`.
Compressed SHA-256 `e8232b9014953c89db654db5f6967b5a6ebb9fb3f874a8a2bcabe215265dd4a9`
(58,364,240 bytes); decoded SHA-256
`33d1c08455465ac16b01d6d2eb65a2a0f9b97b8ffb9e08f928438fc442944b6f`
(2,056,732,177 bytes). Both hashes were verified; the six binding errors were
read directly from the authenticated decoded package. The uncommitted generated
files under `docs/` are this failed output, **not the accepted baseline**.
Keep the accepted `4059599c…` compact index; do not import the failed generation.
Next reconcile the shared dependency in the existing gap, caret and alignment
source readers, run focused negative/source-replay checks, then re-export once.

The live export has now exposed a **historical gap-source reconciliation failure**
in both explicit-gap composition and gap-review membership subprocesses. The
parent remains live; do not restart it or edit dependencies before it finishes.
`readGapSurveySource` rejects the changed border module's full digest:
current `1acfdc0cccbf85ef396fac52a5a0fcf751eb1444a7676b53c1b861ff6af764cd`,
historical `3dbcf33ff70244a8179f438962a2549fb7e354948f084d35d433bcf82e76f9f4`.
All seven other survey dependency receipts authenticate through their existing
read paths. `owner-gap-input-evidence` uses `rootInitialSelectorCanApply`, whose
border-module dependency is `selectorCanApply`. TypeScript parsing of current
and authenticated `2cec292` sources proves this unique function byte-identical
(digest `b9f5350855d078cde98015f370a6a35431ca1bcfe615071c84ec842fe1ecf8ff`).
This localizes the next integration correction, but function equality alone is
not permission to waive full-module provenance or new import side effects.
After terminal output, extend the existing source-replay boundary with an exact
authenticated bounded transition and negative controls; preserve the historical
receipt and reject unrelated source edits. Run the gap checks before another
full export. The failure log above is retained; no canonical acceptance follows
from the partial run, and other terminal errors still need inspection.

Cold combined export is running from `51fa73d` (session 52267, PID 12888,
started 19:11:34 local); log:
`artifacts/material-parity/border-defaults-export-51fa73d.log`.
The process and increasing CPU time were checked directly, not inferred from
the log. Keep the accepted `4059599c…` baseline pending reconciliation.

During that export, a read-only check closed the outstanding **32 dialog-panel
serialized-transition witness** question. The original report hash
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`
and both tree hashes for every owner authenticate; existing alias mapping passes
all 32 owners. Every owner has the same two active, unconditional motion rules:
`sheet:9/7` / `.mat-mdc-dialog-surface` serializes
`transition: transform var(--mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1)`;
`sheet:9/10` / `._mat-animation-noopable .mat-mdc-dialog-surface` serializes
`transition: none`, with property `none`, duration/delay `0s`, all non-important.
The latter is later and more specific. Thus empty pending longhands are not
absence of authoring, and the captured explicit override—not an assumption about
variable expansion—is the useful witness. Ordered case/node/full-motion-rule
digest: `8a0ecfc78c77d4bc9b5e564a1d6e7ddfdec8ea9277a9f4b5114058228b0badc4`.
Next reuse the existing finite motion/reset proof with these exact witnesses
and negative controls after export reconciliation. This check does not classify
the rows, establish live animation settlement, or prove visual parity. No new
capture, report, renderer change or export dependency change was needed.

Mapped border proofs are now wired into the existing authenticated original-case
post-processing and validation path. Unbound data cannot receive or retain the
attribution. The exact added import, guarded application, original-source replay
and unbound rejection restore byte-for-byte to producer
`f2ef21859fbacba4894bdb5efdd45438f41ff05860a6206df73d9bfd325197cb`.
Existing historical alignment/overlay projections verify that bounded transition
before retaining their prior declarations; no historical receipt is rewritten.
The combined producer-transition, alignment-survey and original-overlay-context
suite passes **22/22** (20.88 s). Original mapped-owner plus heading checks pass
**2/2** (12.29 s), and the new main-validator unbound rejection passes separately.
Next run one cold combined export for the 75 pending classifications, with all
three line-box reports and the supplemental root explicitly supplied. Keep the
accepted `4059599c…` package/index until independent row/section/source
conservation succeeds; the standalone manifest beside its retained gzip now
matches the accepted manifest, enabling the existing streaming comparator.
Do not change export dependencies during the run or launch a duplicate export.

Mapped plain-border proof is implemented in the existing
`border-initial-input-evidence.mjs`, reusing `resolveOriginAliasPair`,
`originStageTrees`, declaration exclusion and precise normalization. It admits
**44 groups / 290 owners / 1,160 side observations** from the original captures.
The 59 wrapper owners retain `mapped-with-scalar-rule-gap`; the only admitted
gap is the exact missing `.cdk-global-overlay-wrapper` non-important z-index
1000 declaration, checked independently against complete tree rules. No missing
border/color rule, extra rule or arbitrary gap is accepted or manufactured.
Reference resets/motion, candidate possible color/reset/motion rules and inline
requests remain rejection conditions. Anchor-to-button replacements keep their
mapping/type evidence and are not declared structurally equivalent.
The existing spec now authenticates original capture/tree provenance, all 44
groups, all 1,160 members, and all 236 per-side wrapper gap receipts. Negative
checks reject erased gaps, forged values/equivalence, removed proofs, missing or
duplicate original cases, inventory errors, hover colors and unknown reset
selectors. Heading regression coverage also passes. Focused command:
`node --test --test-name-pattern="mapped border initial proof|border initial-color heading owners" tests/material-parity/input-equivalence-audit.spec.mjs`.
This is a tested pure application/replay boundary, **not yet called by the main
builder**. Next wire it through the existing authenticated original-case
post-processing and validation path, and extend the existing historical source
transition checks. No extra evidence format or framework is needed. Together
with the previous 31 groups, 75 classifications / 2,324 observations have focused
proof awaiting wiring/integration; canonical unresolved remains 1,394.

Generated-owner declaration routing completed for the **470 remaining owners**
after excluding the 32 dialog titles handled by the heading batch. Scope is
the compact unresolved scalar value membership, not every matching ID (some
tooltip IDs have no paired captured owner and must stay outside this population).
Original report and every read tree digest authenticate; existing alias mapping
checks all 89 reference fields, candidate stages and structure. No potentially
applicable candidate border-color/reset/motion declaration or parsed inline
color/reset appears under the existing conservative selector exclusion.
Reference witnesses divide the work into:
- **290 plain omitted-declaration owners:** paginator size/range 52 each;
  four sheet owners 25 each; snackbar wrapper/surface 34 each; tooltip popup 18.
  Preserve the existing scalar-rule gaps on 25 sheet and 34 snackbar wrappers;
  complete-tree declarations, not an assumed scalar omission, are the evidence.
  Sheet action reference anchors versus candidate buttons remain structurally
  unequal; border-default attribution cannot erase that distinction.
- **64 dialog action buttons:** explicit `.mdc-button` currentColor resets with
  important no-animation/no-transition rules; save also has a non-important
  box-shadow transition. Reuse the existing reset proof, not the omission proof.
- **52 badges:** transform transition plus explicit none/zero-duration override.
  Reuse finite motion evidence; do not globally permit unknown transitions.
- **32 dialog panels:** pending variable transition longhands plus explicit
  none/zero-duration override. Inspect the retained serialized transition witness
  before claiming disjoint motion; empty longhands alone are insufficient.
- **32 dialog action containers:** explicit transparent top-border color only.
  The 96 pending side observations exclude that already-classified top border;
  use side-specific declaration exclusion, not all-four-side omission.
Ordered case/owner/mapping-status/reference-declaration/candidate-rule digest:
`350362deec18dc72578ca301a982fbb7b1a861c83ec64391dd5b831c1456833a`.
This closes declaration routing, not canonical attribution or rendering parity.
Next extend the existing border proof over reviewed alias identities for the
290 plain owners, then reuse reset/motion/side-scope witnesses for the remainder.
Do not repeat the owner census or silently drop the known wrapper capture gaps.
No source fingerprints, canonical package or rendering inputs changed here.

Button-toggle non-divider colors are now covered by the existing outline-token
collector/classifier. It extends the 68 proven left-divider owners only when
the other reference sides are zero-width / none / currentColor and every
candidate stage is zero-width / solid / all-side `#79747e`. Exact token,
inline, complete-rule and conflict-exclusion witnesses remain required.
Original-capture replay adds **three signatures / 204 observations**. Across
196 scoped outline proofs, every predecessor field is preserved after removing
the explicit new side-color map/properties and associated scope description;
68 records gain that additional evidence. Ordered added membership digest:
`a42f03136226d03699fe127c7e6cfd0c869bb3d62a4511151349e6fb89790d6d`.
This confirms side-scope overauthoring, not the visible clipping/rounded-fill
defect and not equivalent inputs. Scalar validation now checks each proved
side's own color rather than assuming every property uses the divider token.
Its two expression changes restore byte-for-byte to the accepted producer via
the existing source-transition infrastructure; unrelated changes are rejected.
Six outline tests pass (37.77 s), including forged coverage, conflicting state
rules and altered widths; all six producer-transition tests pass (1.10 s).
Commands: `node --test --test-name-pattern="outline token" tests/material-parity/input-equivalence-audit.spec.mjs`
and `node --test tests/material-parity/position-composition-producer-transition.spec.mjs`.
Heading, slider-color and non-divider batches now total **31 pending signature
classifications / 1,164 observations**. The accepted canonical count remains
1,394 unresolved. The 68 extended existing proof records and producer receipt
changes must also be accounted for at the next combined integration; do not
mistake them for new classifications or omit their conservation checks.

Slider native border-color coverage now extends the existing border-default
inspector/binding/classifier, without a new report or framework. Authenticated
replay covers **156 owners / 624 color observations / 16 unresolved signatures**.
All existing 1,872 width/style/radius observations are preserved exactly against
the immutable prior proof after removing only the newly added color properties.
The native reference colors are `rgb(16,16,16)` or disabled
`rgba(118,118,118,.3)`; the latter is not computed text/currentColor. All three
candidate stages retain `#bdc3c7`, independently matched to the generic input
entry in `src/app/config/browser-defaults.ts`. Both input layers have opacity
zero, so this is not a diagnosis of the visible black thumb ring or drag issue.
Color admission checks all possibly applicable candidate color/reset/motion
rules using the existing conservative selector exclusion. The first overly
broad guard rejected unrelated table width-only declarations; the final guard
excludes width/style/radius from color assignment checks, not unknown selectors
or color-bearing resets. Unknown/state color declarations still reject color
attribution. Missing/changed stage or opacity evidence likewise rejects it.
The existing public range reduction proves width/style/radius default selection;
the new justification explicitly does not claim a new public color/raster proof.
`node --test tests/material-parity/slider-border-default-evidence.spec.mjs tests/material-parity/slider-border-default-source-binding.spec.mjs`
passes 8/8 (7.35 s), including original-population replay, prior-proof preservation,
forgery rejection and scalar membership checks. Independent production-normalizer
replay matches the 16 compact unresolved groups exactly; ordered membership hash
`55f5d027774cd088552d7216de0792acc757dae85b6df38df835ec7ea236da12`.
These classifications and the heading batch below await combined canonical
integration (28 groups / 960 observations total). Accepted unresolved count stays
1,394; do not present pending classifications as canonical or rendering parity.

Heading border-default coverage integrated into the existing collector: its
ordinary-element gate now includes h1–h6, with no declaration, selector, stage
or provenance check relaxed. Original capture authentication and full before/after
collector replay preserve all **3,424 existing proofs** and add exactly **84**:
52 card titles (`mat-card-title` → `h2`) and 32 dialog titles (`h2` → `h2`).
The first expected-count check failed at 84 versus 52; the additional dialog
population was explicitly examined, not silently accepted. Ordered added-proof
digest: `1a22c39ea3b1b9b010ca76f64384ee45e943c14755a622ba2260b01af8afbcf7`.
Independent scalar-classifier replay against every original member accepts all
336 side-color observations, exactly matching 12 unresolved compact signatures
(eight card / four dialog). This is the existing transparent-versus-currentColor
default finding, not a new structure/raster equivalence claim. Native controls,
tables, images and plugin types remain outside this ordinary-element extension.
`node --test --test-name-pattern="border initial-color" tests/material-parity/input-equivalence-audit.spec.mjs`
passed 5/5 (34.28 s). The expanded focused heading test also passes for all six
candidate heading types against both Material and ordinary reference headings,
rejecting state color, unknown reset selectors, inline resets, reference color
authoring and missing normal-style evidence. No fixtures or renderer changed.
These 12 classifications await the next coherent canonical integration batch;
do not subtract them from the accepted unresolved count yet. This collector
change deliberately makes the saved source fingerprint historical until that
integration, while the original capture remains immutable.
The preceding `2cec292` canonical commit is pushed, and its compact import
completed: 8,483 scalar groups / 389,202 occurrences / 134 source findings /
39,904 controls / 1,394 unresolved; compact bytes 70,020,140.

Export reconciliation: the independent font/sidenav comparison exposed a
previously unmodeled dependency, not yet a changed rendering observation.
Scalar normal-line-box findings hash complete control proofs; the 48 allowed
producer-source receipt transitions therefore also change embedded proof hashes.
The first failure was row 903, proof 12 (`controlProofSha256`), retained in
`artifacts/material-parity/font-sidenav-conservation-diagnostic.log`.
The existing conservation checker now derives these hash transitions from
predecessor control proofs, requires exact current proof equality except the
authenticated producer hash, and preserves every other scalar field. Receipt-only
rows are counted separately from newly classified and completely unchanged rows.
No rendering input or canonical output was edited to accommodate the failure.
Focused command `node --test tests/material-parity/position-canonical-conservation.spec.mjs`
passes all 13 tests (33.46 s), including altered measurement, forged receipt/hash,
wrong owner and jointly forged scalar input rejection. Full conservation replay
`node --max-old-space-size=8192 scripts/check-material-position-canonical-conservation.mjs --font-sidenav`
passed against authenticated packages: exactly 14 newly classified groups / 676
observations (10 font groups / 614, four sidenav groups / 62), all raw inputs and
all non-receipt control evidence conserved. Receipt:
`artifacts/material-parity/font-sidenav-conservation.json`, ordered current rows
`2cee668eb0f5e6ca5b40c0e286716baeb678f17fb5c12080553e4f1eb3285834`.
That run loaded the checker before its reporting-only count correction: its
`unchangedCompleteRows:8469` includes receipt-only scalar rows and must not be
interpreted as byte-identical rows. The committed checker reports those separately.
All 461 current source fingerprints were independently revalidated. Section
reconciliation preserves 72 of 79 sections, with no sections added or removed;
the seven changes are classification data/summary and traced producer receipts.
Accepted partial-audit package SHA-256:
`4059599c887ec413d7a6494d7012becb09d06ff40c1cf24b7a0c3e228631a071`.
Independent `collectMotionSourceConservation()` replay also reproduces
`d6d652a4194ef4be7b80407f37b85a443bd1971609588711ea2ed59e7549ae25`
for all 121 groups / 7,254 observations with all non-receipt evidence conserved.
Next: integrate existing border/default and
background/state-layer proofs below without repeating their investigations.
The reconciled export has 1,394 unresolved signatures; final audit acceptance
and full enforced browser gates remain outstanding.

Generated-owner border coverage: reused `resolveOriginAliasPair` for all
**502 owners / 1,976 pending side observations** across badge, paginator,
bottom-sheet, dialog, snackbar and tooltip, authenticating original report/tree
hashes. Every owner resolves through existing structure and complete scalar/
three-stage consistency checks. Counts: badge 52; paginator size/range 52 each;
four sheet owners 25 each; five dialog owners 32 each; two snackbar owners 34
each; tooltip popup 18. The 25 sheet wrappers and 34 snackbar wrappers retain
`mapped-with-scalar-rule-gap` for `.cdk-global-overlay-wrapper` (the known
missing scalar rule); all other owners map without gaps. No gap was normalized
away. Every selected reference side is zero/none/currentColor and candidate
effective border color is transparent. The initial all-four-sides assumption
correctly failed for dialog-actions' visible top border: this population contains
only its other three sides. The top is already outside the unresolved set.
Ordered case/property/alias/style/tree digest:
`8c89f0ff7da3b1370323526079a63c43766cedaec817dc4552b305ab74635cbb`.
This establishes measurement ownership, not absent authoring or rendering
equivalence. Next attach existing border-reset/initial-default declaration
proofs to these exact owners, retaining wrapper rule-gap qualifications and
dialog action side scope. No new mapper is needed; do not repeat this census.
No canonical rows or running-export dependencies changed.

Direct-owner border coverage batch: **112 owners / 448 side observations**
across table (52), icon (20), progress-bar (20), progress-spinner (20) authenticate
against original captures and full scalar/core snapshots. Each reference side
is zero/none/currentColor; candidate is zero/none/transparent throughout. No
possibly applicable candidate color/reset rule passes the existing conservative
selector exclusion. The default collector's type gate excludes table, img and
the two plugin types, but removing that gate alone would be unsafe:
- All 52 tables explicitly author `.mat-mdc-table { border:0px; }`, expanded to
  zero/none/currentColor on every side. This is reset omission, not un-authored
  initial color. Border-spacing keys are also conservatively rejected.
- All 20 progress bars declare `transition-property:opacity`; all 20 spinners
  declare the same plus matched `transition:none!important`. There are no
  reference border-color declarations. Existing motion evidence can distinguish
  these finite non-border transitions; do not permit arbitrary motion globally.
- All 20 icons pass the declaration-exclusion checks, but remain image
  replacements for Material icon hosts. Default-style evidence cannot prove
  equivalent icon rendering or erase that existing structural finding.
Full owner/stage/tree population digest:
`05d5298acf5d02318f3ce447b4bce71cb6e7a4fb647f11bc0fca5cfd3ec3e4b6`.
Independent all-92-case reference reset/transition witness digest:
`1e56f1d7458422a5f695949896da856a4453aad2d374893948edf9e7caae475f`.
Extend existing reset/motion/owner evidence with property-limited claims after
export reconciliation. Do not infer plugin paint behavior from inspected style
alone. No canonical or running-export dependency changed.

Initial-border collector gap, card titles: all **52 owners / 208 side-color
observations** have reference type `mat-card-title` and candidate type `h2`.
The existing collector admits custom Material reference hosts but excludes `h2`
from its candidate ordinary-type set. Complete authenticated owner checks match
all 89 scalar reference fields and all three candidate snapshots. Reusing its
conservative `selectorCanApply` exclusions, no candidate rule could supply a
border color/reset/motion declaration; reference matched rules and both inline
inputs likewise omit them. Every side is zero/none; reference color follows text
color and candidate retains transparent at all stages. This supports extending
the existing omission/default proof to the heading owner with explicit tests,
not relaxing declaration checks or changing the fixture type. Do not infer
whole-component equivalence from this property-specific default divergence.
Ordered case/type-owner/color/tree digest:
`aee1715970873a44011c37a508af54a7ed6c0938994a6b7ca0ce01784d00a671`.
Other sampled blockers differ: tables and plugin/`img` candidates are outside
the type allowlist; stepper content has duplicate reference IDs. Those samples
are routing hints only, not whole-population proofs. Preserve alias and plugin
ownership checks when extending coverage. Canonical/export inputs unchanged.

Toggle non-divider border sides: reused `collectOutlineTokenInputs` against
authenticated original trees for all **68 cases**. Its existing proof binds
the left token/literal substitution and deliberately lists only
`borderLeftColor`; no other-side equivalence follows. All **204 remaining
top/right/bottom observations** compute reference currentColor RGB 75/67/87,
zero width and none style. Candidate snapshots retain `borderWidth:0 0 0 1px`
but apply `borderStyle:solid` and `borderColor:#79747e` across every side, exactly
as authored by `astylar.component.ts:516`. The reference authors its divider
on the left alone. This is shorthand-scope over-authoring, not another visible
outline-strip color failure; zero side widths do not make the inputs equal.
Ordered existing-proof/case/other-side-color/tree digest:
`58840233e615cd7eb1bb64094d5af87c4039edbd9967090aadc0f0a7ef35e36e`.
Extend the same owner evidence with this separately qualified property scope
after export reconciliation. Do not broaden the existing left-only token claim
or silently classify these sides as the same visible token substitution.
Canonical rows and export dependencies unchanged.

Card border-color review: all **52 captured card hosts / 208 side observations**
have an explicit reference color request, not ordinary currentColor defaults.
Authenticated original cases/trees and all scalar/stage/rule-index checks show
one active `.mat-mdc-card` border rule: zero width, solid style, with
`border-color: var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low))`
preserved in `cssText`. All four computed colors are RGB 248/242/246 across
profiles. Expanded captured side-color declaration values are empty strings;
they must not be interpreted as absence of the variable-bearing shorthand.
Candidate authored rules omit border color/style/width (radius is separate),
and every core snapshot retains zero/none/transparent. Thus this is omitted
component border-token/style authoring, not a demonstrated equal-input color
resolution failure. The reference token is the same one already reviewed for
card surface paint. Zero widths mean no border strip in these states, but do
not establish general rendering or input equivalence. Ordered case/owner/full
border-rule/tree digest:
`0bb7c5d4a69a30055f86e57a329e226ce68d89e5f9b8e56f6e4a3aa4846eb18d`.
Keep full shorthand text in the eventual guard; do not weaken declaration
exclusion to accept empty longhand fields. Canonical/export inputs unchanged.

Slider border-color applicability: the existing complete-source
`collectSliderBorderDefaults` replay binds all **156 original native owners**,
and its declaration-exclusion proof already rejects any authored border/reset
input on either side. All **624 side-color observations** retain candidate
`#bdc3c7` at all three stages, matching generic input defaults in
`src/app/config/browser-defaults.ts:302`. Browser enabled ranges (140 owners)
compute RGB 16/16/16, equal to text color. Disabled ranges (16 owners) instead
compute `rgba(118,118,118,0.3)` while their text is RGB 197/197/197: disabled
native UA border color must not be misclassified as ordinary currentColor.
Both captured input layers have opacity zero for every owner; this is not a
visible thumb-ring diagnosis or a new drag/layout finding. The existing public
range/default selection proof is reusable for ownership, but its machine-readable
property scope currently names only widths/styles/radii, not colors. Extend
that same proof explicitly after export reconciliation rather than inventing
another collector or claiming its current assertions cover color.
Ordered case/owner/four-side/reference-text/candidate-color digest:
`8e94e80c807fc7535317d09328c7cb09d4d63dca3e989e86ac722a4ad9a2813d`.
No canonical classifications or running-export dependencies changed.

Next shared gap triage — border colors: compact accepted-baseline queries find
**181 unresolved groups / 5,188 observations**. Rejoined every group against
the authenticated original `b07ef154...` report using the existing precise
normalizer and asserted each complete occurrence count, not just sampled cases.
**4,540** observations have zero side width on both sides: 4,128 none/none,
204 reference-none/candidate-solid, and 208 reference-solid/candidate-none.
The latter 208 are card host borders whose reference color is not currentColor;
do not fold these into an omitted-initial-color proof. **624** observations have
reference zero/none versus candidate 1px/solid (the slider native inputs), and
**24** are the already-investigated visible divider top border versus no border.
Of the zero/zero population, 4,332 reference side colors equal reference text
color; equality alone does not prove absent authored declarations or defaults.
Eight unpaired observations lie outside the matched discrepancy rows and were
not synthesized into defaults. All 181 occurrence totals still reconcile.
Ordered original scalar/side-width/style/currentColor survey digest:
`0b914711ac84ca9f2a65f63caa2fa995f68d3cc0139c5a3cea9cfdcbc64092bd`.
This is triage, not new classification or a visibility/equivalence waiver.
Reuse existing divider and slider owner/default proofs first; then extend the
existing conservative border-initial evidence to specifically proved owner/type
gaps. That collector intentionally excludes possible reset/state/media rules,
unsupported selectors and unproved native-control defaults. Do not weaken it to
classify all transparent/currentColor pairs. No canonical/export inputs changed.

Overlay trigger/cancel paint review: all remaining nine background groups /
**61 observations** are now scoped to existing causes, pending guarded canonical
attribution. The 53 direct-ID dialog/bottom-sheet trigger cases authenticate
`b07ef154...` and exact paired trees, all 89 reference fields, all candidate
snapshots and authored rule/index records. Candidate effective background is
always the exact `.material-button:hover` opaque preblend; normal background
remains the unblended primary and the candidate has no child state layer.
Reference persistent-ripple `::before` is .08 in **16 hover** cases, zero in
**33 activate/open** cases, and .12 in **four mobile open-dismiss** cases.
Do not flatten those populations into one assumed hover state. The 33 covered
triggers connect to the existing passive-cover/stationary-hover ownership proof;
this read-only applicability check does not independently establish that causal
path or final raster equivalence. Shared preblend authoring originates in
`2f44011`, source `astylar.component.ts:533`. Ordered case/layer/normal/effective/
tree digest: `c28e428d3786758874614e080bb12ef91c9e23d10b310bcd26b46f7ddafd7f0b`.
Separately, all eight `dialog-cancel` open-hover-content observations pass the
existing full alias mapping without rule gaps. Reference host stays transparent;
its generated layer is RGB 125/0/250, opacity **.12 in five and .08 in three**
captured boundaries. Candidate childless button remains normal-transparent but
uses fixed hover fill `#f4e4fc`, authored by `.dialog-action:hover` at line 795
as an .08 mix. `f566f80` introduced that rule. Preserve the observed opacity
variation without inferring focus timing from state names; no fresh runtime
reproduction was needed to establish these unequal authored paint mechanisms.
Cancel case/alias/layer/fill/tree digest:
`88abbcc0ad5116dfa8a4d36c129a86c9aea73600fd4dfb24425502577966f5a2`.
The corrected export has reached validation; its results are not yet accepted.
No export dependencies, renderer code or comparison fixtures changed.

Tab background review: all **16 groups / 42 observations** retain the existing
text-span-versus-control ownership distinction. Reference `tab-activity` and
`tab-overview` IDs identify transparent inner spans, not tab hosts; candidate
IDs identify childless buttons. The alias-only resolver correctly rejected the
direct reference IDs. Subsequent direct-owner checks verified all 89 scalar
fields, all three candidate snapshots and exact candidate authored rule indices
against authenticated `b07ef154...` trees; reference ancestry independently
reaches a role=tab host and its generated `.mdc-tab__ripple::before` layer.
The host also remains transparent. Across these boundaries its separate layer
has opacity **.04 in 26 observations, zero in eight, and .12 in eight**, with
RGB 29/27/32 or dark-profile 230/225/229. In particular, captured hover and held
layers both use .04; focus/activation/leave cases must not be collapsed into one
assumed native state. Candidate effective fill exactly matches `.tab:hover`
(.08 opaque preblend), `.tab:active` (.12), or `.tab:focus` (.12 over a different
surface-container base), while its normal background stays transparent.
Current source `astylar.component.ts:728–730` and introducing commit `bc4d442`
establish this application state-layer substitution. It is distinct from the
already-proved measurement-owner mismatch; neither is an equal-input core
color-conversion failure. Ordered owner/ancestor/pseudo-rule/fill/tree digest:
`42df1a409e72499366e9e44a79256b93c2ce5d9342321eb9b7ca7f3e30316db4`.
Bind both qualifications in subsequent background attribution; do not equate
the complete row or assert final raster/ripple/focus parity. Canonical rows and
running-export dependencies remain unchanged.

Card paint review closes two distinct questions across all nine remaining
background groups / **37 observations**. Authenticated original `b07ef154...`
case/tree bytes, all 89 reference fields, all three candidate style snapshots
and every scalar-authored rule/index agree with exact owners.
For `card-open`, eight groups / 24 hover/held/activate observations use a
transparent reference host plus persistent-ripple `::before` in the profile
primary color at .08/.12/.08 opacity. Candidate normal background is transparent
but its childless button receives the exact opaque `.text-button:hover/:active`
fill. Source `astylar.component.ts:649–650` preblends against a fixed
mode-dependent card base. `7945a42` introduced these mixes; this shares the
toolbar's state-layer substitution, but not its base-color expression.
Separately, all **13 dark-profile `card-primary` cases**, including the unsampled
final interaction, resolve the reference's
`var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low))`
to RGB 248/242/246. Candidate `.material-card` explicitly requests `#fff7ff`
and preserves it at every stage. This mismatch already existed in the original
showcase `2f44011`; it is not established as a later compensation. The same
substituted dark base feeds the candidate action mixes. First divergence is
application authoring, not an equal-input core paint conversion failure.
Ordered owner/case/paint/tree descriptor digest:
`3b141bf5f32639227f01ecfcf1d66f7dbb8338ab3f05bf5c8e7537055d7b9d3d`.
Keep token replacement and state-layer composition separate in subsequent
guarded attribution. Neither static blend similarity nor matching opacity
proves equivalent clipping, focus, animation or final raster. No canonical
rows or running-export dependencies changed.

Toolbar action background review: all eight remaining background groups /
**24 observations** (hover, held, activate; four profiles; DPR 1/2) are a
state-layer ownership substitution, not evidence of core color conversion
failure. Original `b07ef154...` capture and all 48 tree hashes authenticate;
all 89 scalar reference fields and three candidate snapshots match their
exact owners. Reference button host stays transparent and its persistent-ripple
child generates `::before`: profile-primary RGB 103/80/164, 208/188/255, 0/0/0
or 0/106/106, opacity .08 for hover/activate and .12 for held. No transient
`mat-ripple-element` exists at these captured boundaries. Candidate has no
child state layer: normal background is transparent, effective background is
the exact captured `#toolbar-action:hover/:active` opaque rule. Current
`astylar.component.ts:676–679` preblends `theme.surface` with `theme.primary`;
`92067a1` introduced the class hover/active mixes while aligning toolbar states.
Matching opacity fractions do not prove equivalent composition over ancestors,
rounding, clipping, focus or animation. Do not label the whole row equivalent.
The scalar authored-rule projection omits `mediaMaxWidth:500px` on the 64px
toolbar width rule in all 24 cases; complete trees retain it. The initial
strict rule comparison rejected that omission; follow-up checks explicitly
accounted for exactly that extra tree field, preserving the evidence limitation.
Ordered case/pseudo paint/candidate fill/tree descriptor proof digest:
`dfd0f408432feb11c347c3eb9ad08c0c5ad190d53ffd07f148163b6724a3089b`.
Next attach property-specific ownership evidence to the existing state-layer
classification infrastructure; canonical rows and export inputs are unchanged.

Font/sidenav export reconciliation: the cold `babb1e1` run finished in
1,890.634 seconds with exit 1 and is **rejected**, not a new accepted baseline.
Its invocation supplied only `--parity-report`, omitting the three line-box
report arguments and `--supplemental-root` from the complete command recorded
below. Consequently it reported 1,406 unresolved groups, missing 120 static /
671 interactive natural-line-box observations, missing computed context and
unbound supplemental captures. These are invocation/evidence omissions, not
new renderer findings. Preserve its three generated report files and full log
under `artifacts/material-parity/font-sidenav-export-babb1e1-missing-inputs/`;
payload SHA-256 is
`7c745b24d98e6ee6b8d858f82c0ea020c1bc83593c5a987157834fe790f47f27`.
The accepted baseline remains `4ddf218e...` (1,408 unresolved groups); generated
docs are unaccepted until reconciliation succeeds. A corrected cold run uses
all five recorded evidence arguments, after checking each path exists, with log
`artifacts/material-parity/font-sidenav-export-complete-inputs-574eb2a.log`.
Do not start another export while that process is live. Inspect terminal errors,
then run the existing `--font-sidenav` conservation check and source/section
reconciliation before importing or committing canonical data. Expected 14-group /
676-observation attribution is a test expectation, not an accepted result.

Bottom-sheet first-action background review: both groups / **25 observations**
have complete existing alias mappings (no scalar rule gaps), authenticated trees
and matching scalar/style owners. Reference `bottom-sheet-dismiss` maps to the
first list link: transparent host plus generated focus-dependent `::before`,
computed RGB **29,27,30** at opacity **0.12** in every captured open state.
Candidate `#bottom-sheet-dismiss` instead authors an unconditional opaque
background already present in its normal style, unchanged at all three stages:
`#e6e1e5` (19 cases), `#312f35` (six). Source line 803 pre-mixes at **0.08**, with
a mode-dependent base and `theme.onSurface`; this is not equivalent focus-layer
authoring or a proved core blend failure. `0d67d46` introduced the unconditional
ID fill using `theme.surface`; `8505c3b` changed its base to fixed mode-dependent
panel colors. Keep this visual-state substitution separate from the existing
runtime proof that the candidate first action does not receive focus correctly.
Ordered case/owner/pseudo/fill/tree-reference digest:
`8cd4fa005ea4b5ef5fd400aa41615f6c31b66574af469eef872d5fb3cdb25fdd`.
No raster-equivalence claim follows from the blend or matching static screenshots.
Canonical rows and export dependencies remain unchanged.

Bottom-sheet overlay background review: all **25 observations** map the scalar
reference to the transparent `.cdk-global-overlay-wrapper`, not its separate
sibling `.cdk-overlay-backdrop`. That sibling computes `rgba(0,0,0,0.32)` with
opacity 1, matching the candidate's authored `.modal-overlay` background at all
three core style stages. Therefore the raw transparent-versus-dim scalar is an
owner/composition distinction, not evidence of a missing reference backdrop or
incorrect alpha conversion. It does not establish equivalent stacking, hit
testing, lifetime or rendering for the candidate's merged wrapper/backdrop.
Strict `checkGeneratedMappingPair` rejects these cases because scalar authored
rules omit `.cdk-global-overlay-wrapper { z-index:1000 }`. The existing
`resolveOriginAliasPair` independently verifies owner identity, all 89 reference
fields and all candidate stages while reporting `mapped-with-scalar-rule-gap`.
All 25 cases have exactly that missing rule and no extra rules; the gap remains
explicit and was not normalized away. Original capture/tree hashes and candidate
authored paint-rule identity were verified. Ordered case/wrapper/backdrop/owner/
gap/input/tree-reference digest:
`fe294f1eb96312e91ff612a0ade742c64ed3081c7174b17aeb18f46ddbfc947e`.
Next connect to the existing overlay-composition finding with property-specific
owner evidence, preserving the rule-gap qualification; do not relabel the
complete row as equivalent from matching backdrop RGBA alone. Canonical data
and running-export inputs are unchanged.

Disabled slider background review: the two remaining range-input background
groups cover exactly **16 observations** (two native owners in eight disabled
cases). Complete original owner/scalar/tree checks against `b07ef154...` prove
both sides are disabled range inputs. Reference has no authored background/all/
motion declaration and computes transparent; candidate likewise has no authored
background request but all three inspected core style stages retain white.
Both reference and candidate input layers have **opacity zero** throughout, so
this is not evidence of a visible white fill or the reported black thumb ring.
`src/app/config/browser-defaults.ts:298` explicitly supplies white for generic
inputs; `StyleDefaultsService.getElementTypeDefaults` merges by element type
only, without a disabled/type-specific parameter. First observed divergence is
default-style semantics, separate from the already investigated slider thumb
ownership/drag path and fixture value/domain substitutions. A minimal public
disabled-range/defaults reduction remains necessary before extending this to a
general browser-support claim; do not fix it with a showcase-only background.
All 16 authored rule records match their captured rule indices and all 89
reference fields / three candidate snapshots match exact owners. Ordered
case/owner/input/tree-reference proof digest:
`2f19520ee088811d6226292651405de6e26b0eb47010876acbc02f2aef32de3d`.
Canonical classification remains pending; no renderer change or raster claim.

Divider background applicability: reused all **24** saved
`material-flow-position-substitutions.json` divider proofs instead of reopening
the confirmed empty-block used-height investigation. Each saved case/input hash
and original tree descriptor matches `b07ef154...`; fresh pure proof replay equals
the existing proof, and full scalar/reference and three candidate style snapshots
match those owners. The reference is a transparent zero-content-height block
painted through a solid 1px top border, whose authored color is
`var(--mat-divider-color, var(--mat-sys-outline))` and computed RGB **123,117,127**.
The candidate's exact `.divider` rule substitutes an absolutely positioned 1px
content-height strip with background `#cac4d0` (**202,196,208**) and no border.
Thus both the paint model and paint color differ; this cannot be classified as
an equivalent border-to-fill representation merely because both create a line.
The existing flow proof already owns the positional substitution; connect its
background/top-border/height scalar findings to that cause rather than creating
a duplicate core diagnosis. Other zero-width border-side currentColor differences
remain separate initial-style questions. Ordered case/input/proof/token digest:
`d53901aa1f4eddcc3696cf38c2523bcf0aca9d64feb8ef4c64c1236d033dfef3`.
No canonical classifications changed in this applicability check; combined
font/sidenav export remains in validation.

Read-only grid-list background review closes the cause question for eight
unresolved groups / **104 tile observations in 52 cases**. Every original tree
file is hash-authenticated against `b07ef154...`; each tile has unique reference
`mat-grid-tile` and candidate `div` owners. All 89 reference fields and all three
candidate snapshots match their captured trees. Reference tile backgrounds are
transparent throughout, with no inline or matching-rule background/all/motion
declarations. Each candidate tile has one `.grid-tile` authored rule, identical
to its captured rule, requesting opaque `theme.surfaceContainer`; literal colors
`#f6f1f9`, `#27252c`, `#f0f0f0`, `#e5f2f1` each occur 13 times per tile and survive
all core style stages. This is unequal authoring before paint. Ordered case,
owner, input hash and tree-reference digest:
`4321966571424d69f02c4a35f96d647f56728cb33215b653253cfb4c814d606d`.
History differs from button-toggle: initial showcase `2f44011` already authored
opaque light/dark tile fills; `d3ff236` replaced that expression with
`theme.surfaceContainer`, and `2f63b52` restored flex centering without changing
the background. Do not label the original fill a later compensation or infer
intent from these commits. Future classification can share the demonstrated
transparent-reference/opaque-authored-fill proof pattern, preserving distinct
owner rules and history. No canonical rows changed. Combined export progressed
to `validate-audit` at 730.784 seconds; acceptance remains pending.

The separate selected-button background question now has complete read-only
evidence for both unresolved groups / **24 observations**: eight hover, eight
held, eight activate. Hash-authenticated original trees and complete scalar
snapshots show reference `button-toggle-two` retaining `rgb(234, 222, 247)` while
a distinct descendant `mat-button-toggle-focus-overlay` has opacity 0.08. Its
foreground is theme-dependent: `rgb(29, 27, 32)` in 18 cases and
`rgb(230, 225, 229)` in six. A first light-only foreground assertion failed on
dark captures; the completed proof preserves both populations, not a weakened
single-color premise. Held captures also contain a separate `mat-ripple-element`
(all eight); hover/activate have none at the captured boundary. Candidate owners
have no corresponding overlay/ripple descendants. Candidate normal background
is `#eadef7`; authored `.button-toggle-option.selected:hover` and `:active`
rules instead replace the host background with a rounded blend using fixed
foreground `#4b4357` at 0.08 / 0.12, respectively. Exact blend arithmetic and
all three captured core style snapshots agree (`#ddd2ea` / `#d7cbe4`).
Thus this is an application state-layer/structure substitution with different
authored foregrounds, not evidence that core converted equal color inputs
incorrectly. Commit `ae9cdad226ea19f05c0a791e4fba23e8de5f60a0` introduced both
selected pseudo-state blend rules while restoring interaction affordances.
Ordered case/owner/overlay/color/rule/tree-reference proof digest:
`6148f0757c276f6f4ac74b99ff0107fb234e630d55d9762bb1563e3992ee9632`.
No claim about whole-control raster equivalence or ripple timing follows from
these sampled states. Next classification should preserve this distinction and
reuse existing background proof infrastructure; canonical rows remain unchanged.

Read-only next-gap investigation while the combined export runs: button-toggle
backgrounds contain two distinct questions, not one shared color cause. Four
unresolved `button-toggle-primary` groups / **68 observations** are opaque
candidate group fills versus transparent reference groups. All original 136 tree
files were hash-checked against report `b07ef154...`; unique reference
`mat-button-toggle-group` and candidate `div` owners match all 89 reference
fields and all three candidate snapshots. Reference computed background is
`rgba(0, 0, 0, 0)` throughout, with no inline or matching rule declarations for
background/all/animation/transition. Candidate has one exact authored ID rule,
equal to its captured tree rule, requesting `#f6f1f9`, `#27252c`, `#f0f0f0`, or
`#e5f2f1` (17 cases each); those values survive every style stage unchanged.
First divergence is component authoring, not demonstrated core color conversion.
History identifies `3d0d5ce7b3e08462e779cea6725a6093ddc6a0eb` adding opaque
`#eadef7` to the previously unfilled group in a compact-control parity change;
`88d1090` retains it while changing density dimensions, and `f3c8254` substitutes
`theme.surfaceContainer`. This establishes later input drift, but does not by
itself prove the author's intent or the hidden renderer defect. Keep its eventual
removal separate from core clipping/selected-child investigation. Two additional
selected-child background groups (24 observations) remain a separate state-layer
question. No canonical classification or production source changed in this review.

Cold combined export launched from `babb1e1`; log:
`artifacts/material-parity/font-sidenav-export-babb1e1.log`. Its session was
confirmed live during preparation of the conservation check; last observed phase
was `build-audit`. Do not restart from an unchanged progress log alone.
The existing canonical comparator now accepts `--font-sidenav`, independently
replays the original font/sidenav proofs, requires exactly 14 groups / 676
observations (10 font / 614, four background / 62), and conserves all raw values,
unrelated rows and non-producer control evidence. Its 12 tests passed in 34.332
seconds, including eight new rejection controls. This checker is not an export
dependency and no running-export source was changed. Actual canonical comparison,
section/source reconciliation and compact import remain pending export completion.

Combined font/sidenav integration milestone: sidenav application and validation
are now wired into the main producer alongside retained-font classification.
Both require bound original cases. The existing exact source-transition chain
restores the complete predecessor and both mapping projection guards reject
aliases, extra imported members and coupling into retained mapping behavior.
Verification: 10 producer/alignment tests, one selected overlay projection test,
one full-population sidenav join test and three font tests passed (15 total).
Next is one combined cold canonical export, expected to attribute 14 groups /
676 observations, followed by unrelated-row/control/section conservation and
compact-index reconciliation. This expectation is not an accepted result;
the current canonical snapshot still has 1,408 unresolved groups.

Sidenav scalar preparation now reuses `inspectSidenavBackgroundInputs` and
`modalInventoryTrees` inside the existing background classification module.
`applySidenavBackgroundScalar` selects complete original membership (not the
sampled row cases), checks counts/uniqueness and replays every captured owner and
declaration proof. Failed or ambiguous proofs stay unresolved. Its paired
validator rejects missing or altered persisted classifications. The focused
`sidenav scalar join` test passed in 2.423 seconds, including incomplete/duplicate
membership, damaged proof, invalid inventory and unrelated-element controls.
A separate applicability replay against the authenticated accepted compact
generation `4ddf218e...` changed exactly **four groups / 62 observations**, leaving
all **128 other sidenav scalar rows** identical. No canonical data was changed.
Next: wire these existing exports into the producer/validator and its exact
historical source guards, then verify the combined pending font/sidenav batch.

The sidenav background's previously read-only finding now has an executable
owner/declaration check in the existing background audit module:
`inspectSidenavBackgroundInputs`. It verifies unique owners, the complete 89-field
reference snapshot, all three candidate snapshots, core inspection provenance,
the sole active reference token rule, and exact authored candidate rule identity.
Inline overrides, competing paint/motion declarations and equal colors fail the
check. `root-background-inputs.spec.mjs` authenticates the pinned original capture
and all 124 tree files, proves the four color populations across 62 observations,
and rejects 13 evidence mutations without modifying inputs. Full existing suite:
4/4 passed in 11.475 seconds, including unchanged replay of all 144 root groups /
2,311 observations. This is a reusable proof for scalar integration, not a new
report or canonical classification. Next: attach this exact check to original
scalar membership through existing inventory adapters and validation. The
canonical unresolved count remains 1,408; pending font wiring is also not yet
exported. Keep root fractional-color and sidenav token causes separate.

Retained-font integration is now wired into the existing scalar classifier and
original-case validator, with both historical mapping import guards updated in
the same increment. Its prior full-population proof covers 10 groups / 614
observations; this wiring does not itself make those rows canonical. Focused
verification: retained-font plus producer-transition suites 7/7; alignment source
conservation 5/5; selected overlay mapping-projection test 1/1. New negative
controls reject import aliases, extra imports and coupling into retained mapping
logic. Exact whole-source restoration returns the accepted `8065221` producer
hash, so unrelated source changes cannot pass this transition. The retained
font proof is still independently validated by the existing inherited-component
font-stack validator; raw scalar values and false equivalence claims are kept.
Canonical data remains the accepted **1,408-unresolved-group** snapshot below.
Next integration milestone must replay this wiring, conserve unrelated rows and
refresh source fingerprints; do not describe the pending source as already
represented by that snapshot. Prioritize the four proven sidenav background rows
next, then remaining shared layout/typography/paint gaps by their demonstrated
owner. No new browser capture is justified by this metadata-only integration.

Line-height canonical reconciliation: the corrected export from `8f8ddbd`
completed in 1,940.157 seconds, with only the expected unresolved-attribution
failure: **1,408 unresolved groups**. Coverage remains 436/436 static and
1,875/1,875 interaction cases, 8,483 groups / 389,202 observations and 134 source
findings. `line-height-scalar-conservation.json` proves exactly 12 groups / 716
observations changed attribution, all 8,471 unrelated scalar rows remain equal,
and raw values and false equivalence claims remain unchanged.
`line-height-scalar-sections.json` authenticates the canonical package and finds
72 of 79 complete sections unchanged. The other sections are the intended
scalar/control evidence, summary and source-binding receipts. Metadata review
(`line-height-metadata.json`) verified all 459 LF-normalized source fingerprints
against disk: seven changed audit sources/tests, two added line-box audit files,
and no removed sources. All 48 control receipt changes are producer hashes;
owner-caret and reviewed-source bindings carry the same updated producer hash.
Independent `collectMotionSourceConservation()` replay confirms the remaining
derived report hash `d3afe436ce07d1a43a63af6e05fa2878b16809b86c4069fb1790764b06bb281b`
for 121 groups / 7,254 observations. No renderer or fixture changes are included.
Canonical gzip: `4ddf218eb8caa20408c06a300568e7a8a17dcc2bbe5ebbc0527030846127776d`;
decoded: `297f35095389029a79dcda35dfe0a9a64816c9fd40219d4aef926ca0e92b0914`.
Compact import and `audit:findings:verify` passed with the counts above
(70,019,613 compact bytes). Next: integrate the already-proven
10-group / 614-observation retained-font join and four-group sidenav background
classification. Broader unresolved coverage and final enforced browser acceptance
remain open; this export is not audit completion or input-equivalence acceptance.

Read-only next-gap review of the preceding 1,420-unresolved-group snapshot:
backgroundColor is its largest property population (66 groups
/ 512 observations). Do not merge its state-layer, theme and overlay-owner
symptoms into one cause. A bounded sidenav-container review now explains **four
background groups / all 62 original observations**, without changing canonical
classification. Competing explanations were wrong owner mapping, unequal token
authoring, or a later color conversion. All 124 original tree files were
hash-authenticated against original report `b07ef154...`; unique reference
`mat-sidenav-container#sidenav-primary` and candidate `div#sidenav-primary` match
all 89 reference scalar fields and all three candidate style snapshots.
The sole active reference background declaration is `.mat-drawer-container`:
`var(--mat-sidenav-content-background-color, var(--mat-sys-background))`, computing
`rgba(254,248,252,1)` throughout this capture. Candidate `.sidenav-container`
explicitly requests `theme.surface` (astylar.component.ts:680), yielding
`rgba(255,251,254,1)` (16), `rgba(28,27,31,1)` (16), `rgba(255,255,255,1)` (15),
and `rgba(244,251,250,1)` (15). Each captured authored candidate rule matches
the tree rule and normal/effective/resolved background; this is unequal
component authoring before rendering, not inherited text-color evidence or a
confirmed core color defect. Ordered {case, referenceNode, candidateNode,
referenceToken, candidate, inputSha256, trees} digest:
`5b30c0a26fcd50fbc6d3d8f6aa22c58e7c191b8e0952b82253f34c63f48e2bb9`.
History review: `git log -G 'sidenav-container'` identifies only initial showcase
commit `2f440115740ff76fa9e55b3f4a11568207b2af5a`; its complete container rule
equals the current rule (trimmed line comparison). All 62 reference owners also
have no inline background/background-color override. This is an original
fixture-authoring mismatch, not a demonstrated later compensating fix or proof
of the author's intent. Remaining boundary: bind these four rows through the
existing classifier with the same owner, authored-rule and stage checks.
No claim is made that all 66 background groups share this cause.

The guard correction is committed/pushed as `8f8ddbd`. Its corrected five-input
cold export is live (session 39535, Node PID 17164), log
`artifacts/material-parity/line-height-scalar-export-8f8ddbd.log`; verify that
handle before treating it as live on continuation. Do not edit its dependencies.

The next font join is prepared but deliberately **not integrated**:
`retained-font-scalar.mjs` reuses the existing inventory adapter and generated
owner mapper, consumes independently validated retained typography, and requires
complete original membership and unique matching reference/candidate owners.
Three focused tests pass, including wrong-owner, incomplete/duplicate membership,
changed-stage and altered persisted-proof rejection. A replay against accepted
`02f8a47b...` compact rows and the hash-pinned original capture changes exactly
ten candidate groups / 614 observations; every owner and complete retained-proof
hash matches `font-scalar-owner-replay-7bf37de.json`. No new capture or changed
font equivalence claim was needed. This is a prepared join, not canonical
conservation or final acceptance. Connect it only after the live line-height
export is accepted; update both historical import guards and the producer
transition alongside that integration to avoid repeating the failure below.

The `77eb6cb` line-height export is terminal and **rejected**, not live or
accepted. It completed in 1,797.15 seconds with 436/436 static and 1,875/1,875
interaction coverage, but four source-binding errors and 1,667 unresolved groups.
All 1,205 evidence-session files verified without invalidation. The failure is
in historical source guards, not changed original captures: adding the scalar
helper import left two exact orchestration-import lists incomplete
(`alignment-survey-conservation.mjs` and `historical-audit-module-source.mjs`).
Their retained-mapping comparisons rejected the new import. They now permit only
its three exact names; unchanged retained-statement checks still reject aliases,
extra members and non-orchestration coupling. Five alignment guard tests and the
focused overlay mapping-projection test pass, including six added mutations.
Independent original-source replay now binds all affected populations: alignment
and font 72 groups / 4,016 observations, text alignment 49 / 2,677, LTR alignment
4 / 178, and reviewed inputs 134 / 3,325. No classification or renderer rule was
changed to suppress the failure.

Failed generated docs and log are preserved at
`artifacts/material-parity/line-height-unbound-export-5664d6df`; copied gzip SHA-256
verified as `5664d6df404e1dd1cda9fd8f5f5db05fb93d6dd3339ba9b4b31bac3964d64b93`.
The working generated docs still contain that rejected export; do not commit or
import them. Accepted predecessor remains `868f9de` / payload `02f8a47b...`, with
1,420 unresolved groups. Next: commit the guard correction, rerun the same full
five-input cold export, then inspect terminal errors and run line-box conservation,
section/source reconciliation and compact import. Expected 1,408 is unverified.
The earlier in-flight descriptions below are superseded by this checkpoint.

Next evidence-reuse opportunity (read-only while the export runs): ten unresolved
fontFamily scalar groups have complete original membership joined one-to-one
to accepted `retainedTypography.differences` with attribution
`reviewed-inherited-component-font-stack`. Population: card-title 52;
checkbox-label, expansion-title, radio-solo-label, radio-team-label,
slide-toggle-label, step-details-text, step-review-text and stepper-content
68 each; tooltip-popup 18. Total **614/614 observations in ten groups**.
The query authenticated compact shards at accepted generation `02f8a47b...`,
used existing canonicalStyle normalization, and reconstructed membership from
the complete original report (SHA-256 `b07ef154...` rechecked), not sampled case
lists. It required both sides' style inputs; missing input objects were not
treated as empty styles. Source is the existing retained font-token/ancestry
proof, not a new font measurement. No new attribution is claimed yet.
Exact reference/candidate mapping and raw-versus-retained replay now passed for
all 614 observations. Fresh `collectRetainedTypographyEvidence` over the original
full inventory reproduced every accepted complete-row hash exactly, with one
comparison per owner, scalar reference Roboto, omitted normal/effective candidate
font-family, and both proof chains rooted at the mapped text owners. Receipt:
`artifacts/material-parity/font-scalar-owner-replay-7bf37de.json` (168,366 bytes),
SHA-256 `7abecfc83f957423871e6b169e1cdf8c7dc5e6e386c805d53beb182d5108e163`.
It records all case/owner/proof hashes. This establishes applicability of the
retained proof, not new canonical classification. After the live export is
accepted, reuse this evidence through the existing classifier/validation path.
The scalar selector boundary also passed for all 614 observations (820
hash-checked original tree files): 528 unique direct-ID owners have exact
reference scalar style subsets and candidate resolved-style equality; 86
generated owners (68 active stepper content, 18 tooltip surfaces) pass existing
`checkGeneratedMappingPair`, including original scalar/tree style, rule,
structure and active-panel checks. In every case the selected keys equal the
retained proof's reference/candidate keys. Reuse this existing alias validator
for those two targets rather than assuming a matching font value proves owner
identity. No mapping errors or unexplained cases remain in this ten-group batch.
These proofs explain
omitted component font overrides retaining the page fallback stack, not equal
font lists, selected physical fonts or raster parity. Do not reopen that
already investigated root cause or alter producer dependencies mid-export.

The line-height scalar production export is running from `77eb6cb` with cold
evidence replay and all five original/supplemental input paths. Log:
`artifacts/material-parity/line-height-scalar-export-77eb6cb.log`.
Do not change producer dependencies or restart while it is live. Terminal
validation must be inspected before accepting the generated docs; 1,408 remaining
unresolved groups is the expected result, not a verified result yet.
Then run `node --max-old-space-size=8192 scripts/check-material-position-canonical-conservation.mjs --line-box`.
This existing comparator now pins accepted predecessor `02f8a47b...`, requires
exactly 12 groups / 716 observations, preserves raw fields and every unrelated
row, and allows only the existing 48 control-producer hash updates. Its eleven
tests passed in 28.97 seconds, including seven new line-box negative controls.
Section/source reconciliation, compact import and final browser acceptance
remain separate gates. Canonical accepted unresolved count remains 1,420.

The corrected origin-motion export is terminal (2,022.78 seconds). Its only
validation error is **1,420 unresolved scalar groups**; static/interaction
coverage remains 436/436 and 1,875/1,875, with 8,483 groups, 389,202 occurrences
and 134 source findings. Evidence-session verification read 1,205 files with
zero invalidations. This is not full audit acceptance.

Independent `--origin-motion` conservation passed: exactly 36 groups / 704
observations changed, all 8,447 unrelated scalar rows are identical, and the
existing control-proof producer reconciliation passed. Receipt:
`artifacts/material-parity/origin-motion-conservation.json`.
All 79 sections remain present; 70 are unchanged. The nine changed sections
are sourceFingerprints, controlLineBoxes, summary, discrepancies,
originStageEvidence, ownerCaretInputs, reviewedSourceBatchInputs,
controlTypography and focusedProofs; see `origin-motion-sections.json` in the
same directory. Detailed metadata/source reconciliation passed
(`origin-motion-metadata-check.mjs`, output `origin-motion-metadata.json`).
All 457 source fingerprints match current normalized source bytes: exactly seven
existing sources changed and the origin-motion focused test was added. The
704 origin proofs gained the reviewed stage evidence; other changes are 48
control-line-box producer hashes, derived owner/source binding hashes, the
unresolved count and the inventory test's line reference (91 to 93). No other
section changed. Canonical integration is accepted as this bounded audit
increment, not complete input equivalence. Committed/pushed as `868f9de`.
Compact import and verification passed: 8,483 discrepancies, 134 source findings,
39,904 controls, 389,202 occurrences and 1,420 unresolved groups. Current compact
index SHA-256 is `1fc871effede80e9817ff17a843f2e6e37bad281143e9265ad7c6d23e5bc6362`.
New payload SHA-256:
`02f8a47b90b39a9b43afd79d59ec3ee68a336b05f651f658dde67735e1d4b420`;
decoded SHA-256:
`e63b9370e5ce46d33514ad5982408f25a11155d6be66d3a36fe3296d2c5f8985`.

Next classification batch can reuse existing normal-line-box proofs rather than
recapture typography. The narrow `normal-line-box-scalar.mjs` join is now
connected to production classification and original-case validation replay.
The source-transition guard reconstructs accepted producer `383e243a...` exactly
and preserves the earlier origin/position transition chain. Six focused tests
pass (scalar join/validation and producer transitions), including persisted-JSON
comparison without supplying defaults for omitted fields. Its join spec includes
including 16 rejection mutations (missing/duplicate/wrong owner, changed stage,
incomplete/duplicate cases, differing host/label style and pre-reviewed rows).
It preserves raw fields and consumes independently validated control proofs;
it cannot validate detached measurement reports by itself. The full accepted-
snapshot replay passed with exactly the intended 12 groups / 716 observations,
each with complete proof membership:
`artifacts/material-parity/line-height-scalar-replay-868f9de.json`.
The replay authenticated the canonical compressed/decoded payload and rebuilt
the inventory from original cases. Full production precedence, export and
canonical conservation checks remain next; no new canonical count is claimed.
The tested helper is committed separately as `5f3a714`; current integration
does not change any renderer or fixture.

The next classification batch can reuse existing normal-line-box proofs rather than
recapture typography. A complete original-tree ownership check now passes for
all 716 shortlisted observations (1,064 hash-authenticated tree files): each
reference host has one direct `mdc-button__label` child; host and label match
lineHeight, fontSize, fontWeight, fontStyle, fontFamily and letterSpacing, and
the candidate owner has core-control-texture paint. Reference identity uses
`data-parity-id` when present, otherwise `id`; requiring only data-parity-id
incorrectly misses ordinary opener buttons. The ordered
{case,element,host,label,candidate} membership SHA-256 is
`ecde2b482be5b693b76805c5937bc06c31ecfb96586c68370ed512f98952df39`.
This answers the host/label comparability question, not overall typography
equivalence. The classifier still needs to bind each exact label/candidate to
its existing accepted observation and reject missing/duplicate/wrong-owner
proofs. No scalar attribution has been changed for this next batch.

The existing line-box evidence avoids the need to
recapture typography. Twelve unresolved scalar `lineHeight: normal / omitted`
groups have **716/716 original-capture members** with exactly one accepted
per-case control-text line-box attribution. This includes dialog Cancel/Save
(32 each), dialog opener (78), sheet opener (63), three button owners (60 each),
card/core actions (52 each), menu opener (94), snackbar opener (71) and tooltip
opener (62). These line-height candidate rows are still unresolved canonically:
no integration or count reduction is claimed for that next batch.

Read-only join receipt:
`artifacts/material-parity/line-height-reuse-complete-membership-ed555089.json`,
SHA-256 `23b1b4adf61e684369d450678afd92913300045728de2f140e77394ee7dc5be9`.
It pins accepted generation/index and the full original capture hash, lists all
716 distinct control evidence IDs and exact case membership, and checks every
group's raw occurrence count. Both compact and canonical scalar `cases` arrays
are samples (12 entries), **not complete membership**. An initial summary-only
join did not establish coverage; the final join reconstructs members from all
original static/interaction style observations and rejects count mismatches.

Applicability: `attributeObservedNormalLineBoxes`,
`attributeObservedInteractiveLineBoxes` and `candidateTypographyOmissionChain`
are unchanged from accepted `6606d13`; all 14 supporting normal/control-line-box,
input-tree and capture-validation source fingerprints checked against the
accepted metadata receipt still match. Existing proofs explain browser normal
versus measured candidate paint, with explicit omission-chain checks; they do
not establish input equivalence, inherited-font equality, baseline, wrapping or
raster parity. Dialog's sampled control paint is 17px, while the local resolved
lineHeight field is omitted; these are distinct diagnostic stages.

After importing the accepted origin export, add the narrow scalar-to-existing-
control-proof bridge in the existing classifier. Require complete original case
membership, mapped button/label identity, matching raw values and validated
per-case evidence; reject missing/duplicate/wrong-owner proofs. Preserve unrelated
classifications and all raw values. Do not add new browser runs or a separate
line-height census merely to reproduce these already retained measurements.

The passive-cover causal path is now observed, not just inferred from source.
Probe `--public-hover-picks` adds a read-only observer to the public surface's
scene, records incoming picked-mesh names and native CSS offsets, and reads the
live move predicate and mesh eligibility. It changes no predicate, mesh,
coordinate or renderer state. All eight observer-on/off pairs have identical
hover, resolved background and point pixels. All four candidate observers are
removed explicitly, restoring the original count (2). The server is stopped.

Receipt: `artifacts/material-parity/public-hover-picking-cb547a8/result.json`,
SHA-256 `c7d0ea5498fb156bbdd04b2c34da345dd90cb4224cb2e3bb2ce4013649a007c3`.
Sixteen cases and 64 hash-verified screenshots cover two variants, two sides,
two DPRs and observer controls. Zero page errors; all 517 served JavaScript
hashes match the earlier public reduction. The live predicate's AST matches
installed Babylon **8.56.2** `Inputs/scene.inputManager.js` in all four observed
candidate cases (source SHA-256
`18245b7fa202883d17a5d9b4154dc7d35b70757090fc259df866d00f276ed349`).

The passive cover is visible, ready, enabled and pickable, but has no action
manager, no explicit move eligibility, and fails that predicate. At native
offsets (181,130), and after reentry at (180,130), the incoming move event names
the obscured `audit-target`. The hoverable cover differs only in its shared
authored hover rule; it acquires an action manager, passes the predicate and is
the incoming picked mesh. Both variants preserve the old target during the
stationary update; no pointer event is dispatched by that update.

Ownership is core interaction/picking, not Material plugin paint. The earlier
direct-blocker safeguard (`0e17f146`, `resolvePointerTarget`) cannot help when
the backend already skipped the front box and core accepts the eligible direct
hit behind it. Plan the general fix around CSS-visible pointer ownership,
independent of whether a hover style exists, plus stationary-pointer revalidation
after layout/stacking changes. Keep these separate from retained paint continuity
on unchanged owners. Do not add dummy hover rules or a plugin-owned hit-test path.
This closes the reduced picking-path question, not every Material observation,
pointer-down/touch behavior, nested clipping case or final acceptance gate.

The public hover reduction now separates two failures without Material controls.
`scripts/audit-material-overlay-focus-runtime.mjs --public-hover` replaces only
the runtime document through public `surface.update()`; native HTML uses the
same generated declarations in an isolated shadow root. One absolutely positioned
box is covered by an opaque sibling. A second variant adds only a cover :hover
rule on both sides. No click, modal, animation, transform or private scene update
is involved. Existing host handlers only record these unrelated IDs.

Accepted supplemental receipt:
`artifacts/material-parity/public-hover-b8b0471-final/result.json`, SHA-256
`d11c78684fb013027e98eef8510f7d311d40847b89ca23e65d0f30b90476b0d1`.
Eight cases cover native/candidate, passive/hoverable cover, DPR1/2. All 32
screenshots were rehashed; paired authored inputs are equal; all 517 served
JavaScript URL/hash pairs match the prior authenticated runtime; diagnostics
and page errors are empty. The host is exactly 900x700 CSS pixels on both sides.
Native geometry and point pixels establish that the cover occupies the pointer
location; candidate pixels also show the cover there, excluding a missing or
off-position cover at that point. Semantic proxy rectangles are not layout proof.

- Hoverable cover: native immediately drops the old hover; candidate keeps it
  after settled update, painting the cover's normal gray instead of hover gray.
  A 1px move retargets correctly, as does leaving and reentering. Both DPRs agree.
- Passive cover: candidate keeps targeting the obscured original box even after
  the 1px move and a complete leave/reenter, while native targets the cover.
  Adding the hover rule changes this moving-pointer outcome, distinguishing
  eligibility/picking from the stationary-update problem.

These are public-reproduction interaction defects, not proof that every historic
Material paint mismatch shares a cause. Next trace the served runtime's hover
reconciliation and non-interactive blocker eligibility separately; source-only
inspection is not yet proof of the exact served branch. Preserve the current
reproduction, and do not compensate by adding fixture hover styles. Full-state
coverage and final browser acceptance remain pending. The diagnostic server is
stopped. The initial attempts are retained as non-acceptance evidence: the first
used unsupported backgroundColor; the corrected intermediate controls reused
screenshot filenames across variants. The final run uses supported background,
unique filenames and hash-verified images. No renderer or canonical inputs changed.

The stale-hover runtime question now has direct evidence. Existing probe mode
`--hover-retarget` opens sheet/dialog at a stationary pointer, settles, then moves
one CSS pixel within the same covered opener location. Eight captures (two
families, native/candidate, wrappers off/on) pass settled-boundary controls with
zero page errors. Receipt:
`artifacts/material-parity/hover-retarget-65d6d2c-ready/result.json`, SHA-256
`d6e95fc6f3120e926c509da95b7fd27a9247eff34465296afa43cd1d1f21610b`.
All 517 served JavaScript URL/hash pairs match the earlier authenticated opening
probe; all 104 installed core files and three served app sources are checked.

Native opener :hover becomes false when the backdrop covers the stationary
pointer, and elementFromPoint identifies the backdrop before/after the 1px move.
Candidate diagnostics retain the primary ID and effective #735eab while open;
the 1px move retargets the overlay ID and restores #6750a4. Focus stays unchanged.
Explicit checks confirm all eight boundaries, unchanged pointer position during
opening, 1px displacement, and both candidate state/paint-input transitions.
This demonstrates stale hover in the current showcase rather than a color-mix
arithmetic failure. It is still not an equal-input minimal core reproduction,
historical-capture causality, all-state coverage, or final raster parity. Next
reduce stationary-pointer occlusion through a minimal public surface update;
do not fix it by adding per-overlay button background overrides.

The first attempt timed out before collecting any cases while waiting for page
load; `hover-retarget-65d6d2c/failure.json` is retained. The successful retry waits
for DOM readiness (60s navigation bound), then the same app-ready/font/renderer
settlement contracts. No behavior threshold was weakened. The diagnostic server
has been stopped. The probe and this ledger are outside canonical source inputs;
the running origin export's dependencies were not changed.

The first cold origin export (session 39159) finished in 1,996.12 seconds but
is **not accepted**. Its invocation omitted the four supplemental input options
used by the accepted baseline. Besides 1,420 unresolved scalars, validation
therefore reports missing/unbound supplemental and line-box evidence. This is
an execution mistake, not a proved collector or renderer regression. The failed
manifest/payload/Markdown are preserved in
`artifacts/material-parity/origin-motion-incomplete-invocation-65d6d2c`;
payload SHA-256 is
`280dd6171aadd1fe27e2fdd7ed3a237d0f6b106fb208670f888c9b723258cf73`.
Do not import that snapshot or stage its current unaccepted docs changes.

All five evidence paths were checked present before the corrected cold run.
It is now active in **session 27712, Node PID 21052**, started at `196ff42`;
log: `artifacts/material-parity/origin-motion-export-complete-inputs-196ff42.log`.
The audit producer dependencies remain those of `65d6d2c`; later runtime probes
and this ledger are outside that source inventory. Preserve the live run and
do not change its dependencies. The complete invocation (with
`ASTYLAR_AUDIT_COLD=1` and `ASTYLAR_AUDIT_PROGRESS=1`) is:

```powershell
node --max-old-space-size=8192 scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
```

After terminal completion, inspect **all** validation errors before running the
existing `--origin-motion` canonical comparator, section/source/metadata
reconciliation and compact import/verification. The accepted predecessor remains
`ed555089...`; an expected scalar count alone does not accept a replacement.

Hover source follow-up: the fresh served core chunk and map still have hashes
`ce7cd7a2fa62ab7abaf9b89045ec9d9390463477a25f8ed40773f841ad90a15d`
and `dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4`.
Method AST comparisons (structure, identifiers and literal values, excluding
formatting/comments) match served map, installed JavaScript and transpiled current
source for interaction `setSiteData`, `reconcileModalState`, `resolvePointerTarget`,
`firstEligiblePointerTarget`, `firstVisiblePointerElement`, and element creation
`createElement`. A whole-method `setupMouseEvents` comparison did not match and
must not be reported as verified. Its inspected served prefix creates the action
manager, while `createElement` calls it only when hover declarations exist.

The demonstrated stationary failure is consistent with retained hover being
reapplied during `reconcileModalState` without a new hit check. The passive-cover
failure has a distinct candidate cause: installed Babylon's pointer-move predicate
filters for an action manager / explicit move eligibility, while core accepts an
eligible direct hit before checking blockers or performing a full multi-pick.
Thus a skipped front box cannot be rescued by the later direct-blocker branch.
The subsequent observer-controlled receipt at the top of this checkpoint now
verifies the live Babylon predicate and incoming event path. No source change,
private runtime intervention or fixture compensation was made.

Read-only paint follow-up while that export runs: exact original-capture and
tree hashes plus compact finding `2644ae20256f938f1b0970d3dc1b85013d83cdde819e0a0781748548484a5147`
bind all eight light bottom-sheet-primary observations in order. They are a
mixed population, not one safe color-equivalence classification. Reference host
is rgb(103,80,164), candidate normal #6750a4, and effective/hover rule #735eab.
The native persistent-ripple ::before layer is white at .08 for two desktop
hover cases, zero for five activate/open cases (desktop DPR1/2 and comparison
pane activation), and .12 for mobile DPR2 open-dismiss. The two .08 composites
round to the candidate RGB(115,94,171), but this arithmetic proves neither input
nor raster equivalence. Candidate retains its .08 mix across all eight cases;
the native state layer does not. All eight group members and their occurrence
count were asserted, not inferred from the first screenshot.

Current source narrows the next investigation: `.material-button:hover` was
authored in `2f440115`, and :active's .12 mix in `1dde7be9`; :focus supplies only
a transparent shadow. Core `setSiteData()` retains hover while the ID remains
enabled, and `reconcileModalState()` reapplies it to rebuilt meshes without
re-picking at the stationary pointer. The existing authenticated dialog Escape
runtime receipt also contains hoveredElementId=dialog-primary concurrently with
modalDialogId=dialog-overlay. These are evidence for a stale-hover hypothesis,
not proof that all sheet behavior shares that cause. Next decisive public check:
open an occluding overlay without moving the pointer, inspect the hover target,
then move slightly at the same covered location and compare native/candidate
retargeting. Keep missing focus-state paint and state-layer ownership separate;
do not waive the entire eight-observation color group.

Origin motion integration is now wired through collection, classification,
inventory validation and independent original-source replay. Producer-selected
mode is checked against the evidence marker, so a report cannot disable the
review or enable it on its own. Exact captured motion requests remain part of
the proof; forged requests and invented settlement/equivalence claims fail.
The integration suite passes 5/5 in 178.81 seconds: default historical results
remain intact, independent source replay passes, and actual aggregation of the
origin-bearing capture population preserves 8,314 complete rows except exactly
36 classification groups / 704 observations. This is not the full canonical
8,483-row conservation claim; the full export/comparator remains the next gate.

The existing canonical comparator now supports `--origin-motion`, using the
authenticated `ed555089...` predecessor and independent full-inventory replay.
It requires exactly 36/704 changes, unchanged raw inputs and all unrelated rows,
and only the authenticated producer receipt change in 48 control records.
Its synthetic mutation suite passes 11/11 in 23.96 seconds. Producer-transition
tests pass 2/2 in 0.71 seconds: reversing only the five intended integration
edits restores the exact accepted `16de9bd1...` main producer; missing collection,
validation, replay, source registration or unrelated edits are rejected.
Seven existing canonical source receipts now differ intentionally and one
focused-test source is newly registered. Reconcile these at the next cold export,
with section/metadata conservation and compact-index refresh after acceptance.
No canonical count reduction is claimed yet; full browser acceptance remains
pending, and no renderer or canonical fixture behavior changed.

The direct origin-motion question now has a focused proof, using an opt-in
`reviewedDisjointMotion` branch of the existing stage inspector. The default
collector remains unchanged. Exact original capture/tree authentication and the
pinned compact predecessor reproduce all 59 groups / 1,368 observations;
36 complete groups / 704 observations qualify for measurement-stage attribution,
and 23 / 664 remain guarded. Forty-two negative controls reject transform/origin
targets, all, variables, unknown fields, incomplete targets, named animations,
explicit/ancestor origins, missing ancestry, candidate motion, changed scalars
and missing provenance. No capture is mutated or motion rule deleted to pass.
The proof retains exact motion requests and explicitly denies verified animation
settlement, absence of indirect effects, computed candidate origins, reference-box
equality, input equivalence and raster parity.

Verification: `node --test tests/material-parity/origin-motion-stage-review.spec.mjs`
passes (1/1, 13.02 seconds). The unchanged default-mode inventory/source-binding
suite passes (4/4, 100.53 seconds), preserving all 6,938 historical dispositions.
The focused and integration commands are now available through
`npm run audit:test:focused -- origin` and `npm run audit:test:integration -- origin`.
Next integrate the opt-in proof into the existing collector, independent source
replay, validation and canonical membership checks as one coherent batch. The
canonical count is still 1,456: the 36-group proposal is not yet exported.
This edit changes the inspector's source receipt; reconcile it at integration
rather than misrepresenting the earlier 456/456 freshness check as current.
No renderer, reference or candidate fixture changes, browser recapture, or
successful scratch artifacts were produced.

Resume triage after the overlay-focus investigations: compact queries against
canonical generation `ed555089...` still report 1,456 unresolved groups. The
largest families are dialog (186), bottom sheet (132), chips (101), tabs (99),
card (87), slider (74), snackbar (69), and button-toggle (68). Largest property
populations include backgroundColor (66), lineHeight (61), transformOrigin (59),
color (50), boxSizing (49), and letterSpacing (48). These are prioritization
counts, not evidence of shared causes. Current-file LF-normalized SHA-256 checks
against the accepted `color-motion-metadata.json` receipt reproduce all 456
source fingerprints with zero mismatches; no canonical export is needed merely
to resume. Supplemental runtime probes remain separately scoped evidence.

The next bounded question is whether the remaining origin observations with
explicit, disjoint motion targets can receive an observation-stage attribution
without assuming computed candidate origins or equal rendering. Competing
explanations remain a browser-used/local-declaration measurement mismatch,
unequal origin authoring, and motion/reference-box effects. Reuse the existing
origin stage inspector and direct motion-target review infrastructure, not a
new origin census or blanket motion waiver.

An exact compact-index join now validates applicability of the historical
`docs/material-origin-request-contexts.json` (SHA-256
`8cd9950f3dc692509f1b8fd897fe60b9239281acfeac482c07e48e62a4d55696`):
all 1,368 observations reproduce the occurrence counts of all 59 current
unresolved transformOrigin groups. Join by family, element, and origin through
`bindPreciseAuditNormalization()`; literal raw-string joining correctly failed
on `32.5703px` versus canonical `32.57px`, so do not invent a new rounding rule.
Contexts 0, 1, and 4 cover 704 observations / 36 groups across nine families.
Their complete captured motion rules name box-shadow, border, or none, with
explicit animation-name none wherever animation metadata occurs. This selects
the next direct-target proof, not an accepted classification: first validate
the exact owners/stages and negative controls for transform-origin, transform,
all, variables, missing targets, named animations, and changed ancestry. Keep
the other 664 observations / 23 groups guarded; transform-target motion,
incomplete declarations and explicit tooltip ancestor origin need their own
proof. Historical reference-only motion samples must not be extrapolated to
every state. No origin classifications or canonical inputs changed this turn.

Dialog Escape restoration is now isolated by the existing probe's explicit
`--dialog-escape` mode. Eight captures compare unchanged routes with a separately
labeled runtime control that bypasses only `AstylarShowcaseComponent.handleKeydown`
for Escape. Both variants are repeated with public-method wrappers disabled and
enabled; all settled-boundary controls and causal assertions pass, zero page errors.
Receipt: `artifacts/material-parity/dialog-escape-07609be/result.json`, SHA
`cc1d89c684b71dfff83356a48ab0e1d7a2b28f4197ef5494211cb541884a4fce`.

The unchanged candidate closes but ends on BODY. Its opener-focus request returns
false while public diagnostics still show `modalDialogId=dialog-overlay`. Bypassing
the app's Escape handler lets core restore `dialog-primary` before the app's close
callback updates state; that callback's focus request succeeds with no active modal.
Native restores its opener in both controls. This establishes the competing
application dismissal path as causal in this showcase, rather than a generally
broken core Escape-restoration path. `handleKeydown` patches closed state and
focuses too early; core `update()` synchronously replaces interaction data, while
`dismissActiveModal()` owns modal removal, opener restoration and the close event.
Do not implement a fixture offset or duplicate focus manager. Future implementation
should respect the existing core modal lifecycle and synchronize app state from
its close notification, with focused regression proof. Exact reentrant Angular
stack ordering is not fully established by the captured limited-depth stacks;
no broader guarantee about arbitrary callback-time updates follows from this test.

The causal variant is deliberately **not equal-input parity evidence** and never
changes checked-in showcase authoring. All source/provenance receipts remain in
the capture. Opening, traversal and Escape questions for this light/DPR1 subset
are now answered; next return to remaining material input classifications and
coverage, reserving complete browser/state gates for final integration.

The same runtime probe now supports `--keyboard`: ArrowDown/Escape and three
Tabs/Shift+Tab/Escape after pointer opening. Twenty-four captures (both surfaces,
three families, two sequences, wrappers on/off) pass every settled-boundary
instrumentation control with zero page errors. Receipt:
`artifacts/material-parity/overlay-keyboard-4d782df-settled/result.json`, SHA
`2d46a54a48316404db90f1227e5d3901c43e6aa230180719697d25958914bb90`.
Native Escape settlement now waits for overlay removal before sampling focus;
the first `overlay-keyboard-4d782df` capture is retained as failed timing evidence
because a 400ms delay raced Material's 375ms sheet exit plus scheduling.

- Menu ArrowDown stays on the candidate opener instead of native Delete; native
  Tab closes the menu, while candidate Tab traverses both items then escapes to
  BODY with the menu still open. Material `menu.mjs` wires `FocusKeyManager` and
  `tabOut`; candidate authors menu roles but only an Escape key handler. These
  interaction inputs are unequal, not proof that matching inputs render wrongly.
- Bottom sheet's third Tab escapes to BODY, while native Share/Copy link cycle
  inside the sheet. Material's container inherits a focus trap; candidate authors
  a plain `div` with `role=dialog`, not core's `type=dialog/open/modal` contract.
  ARIA role alone does not supply modality. Classify the missing modal interaction
  contract at application/plugin authoring, without inventing per-sheet core keys.
- Dialog Tab and reverse-Tab cycling match native Cancel/Save. Escape removes both
  overlays, but candidate focus ends on BODY rather than the opener in both
  sequences and both instrumentation modes. The app requests opener focus while
  the old modal remains active, receives false, then removes its focused child.
  This proves an early application restoration request. The subsequent causal
  control above isolates the competing application path; do not assign a general
  core defect from the failed showcase path alone.

Escape closes menu and sheet and restores their openers once focus is back inside
the surface. No claim is made for Escape after focus has already left the surface,
all themes/DPRs, disabled items, or full output parity. Next decisive check:
dialog Escape control is now completed above; preserve canonical fixture behavior.

Current-runtime overlay focus now has direct action-boundary evidence, not only
the earlier scheduling reduction. `scripts/audit-material-overlay-focus-runtime.mjs`
drives unchanged served Material routes with real pointer down/up, recording DOM
focus and public update/settlement/focus calls. Twelve captures (three families,
both implementations, wrappers disabled/enabled) preserve identical final focus
and application state with zero page errors in Chrome 153.0.8010.53, light/DPR1.
Receipt: `artifacts/material-parity/overlay-focus-current-6606d13-controls/result.json`,
SHA `cc12796e722e1415263f84f542104897b5836913d7783bb6c30526da1e9c1e0c`.
Three served app sources match disk; 104 installed core JS files match the retained
source build. `served-core.json` separately binds nine focus/update/settlement
methods from the served chunk's source map to installed code after syntax-only
format normalization. It does not claim byte equality of Angular-linked modules.

- Menu: native focuses Rename; candidate keeps its opener. The new tree contains
  Rename, but application code makes no focus request. This is an authored
  interaction-contract omission, not proof that core rejected a valid request.
- Bottom sheet: native focuses Share. Candidate's `focus('bottom-sheet-dismiss')`
  returns false **before** the first open-tree `update()` call; settled old-tree
  IDs lack that target. The subsequent tree contains Share, but focus stays on
  the opener. The first demonstrated divergence is application scheduling:
  `whenSettled()` observes the old surface before Angular delivers the new input.
- Dialog: the same early call also requests nonexistent `dialog-dismiss`.
  Nevertheless the modal's authored autofocus later focuses `dialog-cancel`,
  matching native Cancel. Preserve this working core behavior; do not diagnose
  all three as a shared core focus failure.

Timeline/order assertions pass. The first diagnostic attempt incorrectly called
settled-only style inspection during an update; that instrumentation failure is
not application evidence. The corrected observer records unavailable inspection
without throwing, and wrapper-disabled controls establish matching end states.
These results cover pointer opening only, not historical-bundle causality,
keyboard traversal, dismissal, all themes/DPRs, or raster parity. Next close the
remaining overlay interaction-state coverage and geometry/typography/paint gaps;
do not repeat the completed opening-focus census or canonical color export.

Combined color/motion export preflight is complete. The existing canonical
conservation comparator now has `--color-motion`, pinned to accepted generation
`65c72350...` and its decoded SHA. Independent replay authenticates the original
capture/inventory, preserves row state membership (including static exclusions),
and requires exactly 51 changed groups / 1,428 observations: 46 color / 1,196
plus five appearance/motion / 232. All unrelated complete rows and raw inputs
must remain unchanged; exactly 48 control records may change only authenticated
producer receipts. Comparator/producer mutation tests pass 12/12 in 22.03s;
independent historical motion conservation passes 1/1 in 32.11s. The five
explicit export inputs and retained predecessor manifest exist. The single cold
export from `b77284d` completed in 1,940.68 seconds; its log is
`artifacts/material-parity/color-motion-export-progress.log`. Exit 1 reports only
the expected incomplete-audit gate: 1,456 unresolved groups. Coverage remains
436/436 static, 1,875/1,875 interaction, 8,483 groups / 389,202 occurrences and
134 source findings. Evidence-session verification recorded zero invalidations.
The accepted compressed SHA is
`ed555089857385f46871703032b3fda742ce58f47a081b44200bc1133e8d3a2f`
(59,481,073 bytes); decoded SHA is
`f75431e6dcdd6ffe80c793d79cd74026c733e636654501a3f18f771ff27f30bc`
(2,084,690,305 bytes). Independent `--color-motion` conservation passes: exactly
51 groups / 1,428 observations changed; 8,432 complete rows and all raw inputs
are conserved. All non-receipt control evidence is unchanged; exactly 48 producer
receipts changed. Section hashing also completed: 70/79 sections are unchanged,
none added or removed. Receipts are `color-motion-conservation.json` and
`color-motion-sections.json` under `artifacts/material-parity`. The latter reuses
the accepted predecessor's existing section receipt instead of decoding it again.
All nine changed sections are now reconciled:
sourceFingerprints, controlLineBoxes, summary, discrepancies, ownerCaretInputs,
reviewedSourceBatchInputs, ownerInitialStyleEvidence, controlTypography and
focusedProofs. The authenticated `color-motion-metadata.json` comparison preserves
all 60,921 prior non-color observations/proofs, adds 4,995 color observations and
454 explicit motion reviews (only 232 qualify for this classification batch).
All 456 source fingerprints match disk. Its 64 metadata changes comprise 48
control-line-box producer hashes, one summary count, one caret producer hash,
eight motion source-conservation receipt fields, and six proof line shifts.
The motion reader's exact opt-in transition and unchanged historical observations
were already independently verified; reordered receipts do not rewrite history.
All six proof pointers move by 44 lines to identical test declarations in the
same file; no proof description or status changed. Source findings remain intact.
Accepted unresolved is now **1,456**, not input or rendering equivalence. Compact
store import and verification pass with 8,483 groups, 134 source findings, 39,904
control records and 389,202 occurrences; compact shards total 69,980,975 bytes.
The accepted index SHA is
`2da3f7843d9b033afc86a29608c1a4865304094552eb4ad18822d46559bfaf48`.
This checkpoint accompanies the canonical integration; do not rerun the completed
export or conservation checks without changed dependencies.

Descendant color is now connected to the existing independently source-bound
observation collector/classifier. Original-source validation reconstructs the
authenticated inventory and all observations, including negative color cases;
missing color membership or altered ancestry is rejected. The production fallback
handles appearance/color only after all specific reviews. A complete scoped
production-chain check supplies original retained-typography evidence and changes
exactly 46 groups / 1,196 observations, preserving all other complete rows,
including earlier static reviews. It passes in 87.66 seconds. An earlier test
omitted retained-typography evidence and incorrectly exposed 80 already-reviewed
static observations to the fallback; corrected inputs prove actual precedence.
The 460 source/owner mutations remain covered. Five focused source/appearance
checks pass across the two runs, plus the producer transition check. Both new
descendant files are registered in the producer source inventory, and the exact
fallback/inventory transition restores the complete prior producer hash.
The combined export is accepted through independent conservation as recorded
above. Next is current-runtime overlay-focus provenance and action-boundary
capture, followed by remaining coverage and final full browser acceptance.

Descendant-color owner/scalar binding now passes the complete scoped population:
46 groups / 1,196 original observations qualify; 22 groups / 446 remain excluded;
152 previously reviewed static siblings are kept outside this proposed batch.
`inspectDescendantColor` uses validated inventory trees and independently replayed
root color proofs, unique IDs or existing reviewed generated mappings, complete
parent chains, captured text, and exact normal/comparison/effective scalar stages.
No candidate computed color is synthesized. All 460 mutations reject changed
case/family/revision, scalar text/styles, broken ancestry, duplicate candidate
keys, inline overrides and hover color requests. The duplicate-owner mutation
initially exposed an undefined-mapping dereference; it now returns no proof.
`node --test --test-reporter=spec tests/material-parity/root-color-descendant-evidence.spec.mjs`
passes in 28.78 seconds. Test mutations share untouched reference style/rule
pools rather than repeatedly cloning the entire audit. This extends the existing
root reader; no second CSS resolver or fixture compensation was introduced.
Canonical attribution remains pending (accepted unresolved count: 1,507).
Next: connect this evidence to the existing scalar fallback after more-specific
classifications, verify static precedence and source replay, and perform the
combined color/motion integration milestone. Do not rerun the population census.

Historical dependency reconciliation is now complete for the case-index replay.
The policy change adds exactly two source findings (rounded-radius sampling and
sampled dialog geometry); removing those additions reproduces the entire recorded
policy hash. No original definition was changed. The generated-mapping reader's
only changed dependency is its already-reviewed file-read adapter import; the
existing `restoreMappingReadAdapterSource` authenticates that transition and the
original mapping observations replay unchanged. The test migration check permits
new literal focused callbacks excluded by the historical replay filter, but still
conserves every original statement and rejects eager setup, new membership tests,
changed assertions, or a bypassed mapping adapter.
`node scripts/audit-material-case-index-conservation.mjs` now passes all 11
original membership tests with writes forbidden during replay; all nine saved
historical receipts remain unchanged. The existing conservation report records
current source provenance and the exact additive policy transition. Migration
checks pass 2/2; source-assertion checks passed 2/2, and policy mutation checks
passed. The earlier failures below are superseded by this verified replay, not
waived. Canonical classifications and renderer/fixture inputs remain unchanged.
Next substantive work: bind descendant ancestry to original mapped owners,
scalar occurrences and static-review precedence, then integrate the combined
color/motion batch. Current-runtime focus and final browser gates remain open.

Inherited-color ancestry guard is now executable: the focused descendant test
passes for light/dark and rejects 22 mutations in each theme (broken parent
links, changed root evidence, intervening color/reset/motion and state rules).
The existing root-color behavior test also passes. This is only ancestry proof:
owner correspondence, original scalar membership and prior-static precedence
must still be bound before any of the proposed 46 groups / 1,196 observations
can be attributed. No canonical count changed (accepted: 1,507).
The extension in `root-color-descendant-evidence.mjs` imports the unchanged
historical root-color collector; keeping the extension separate avoids a
new historical source-projection mechanism or rewriting root receipts.

Additional integration gap found by the historical root-color case-index test:
the shared case-index conservation gate rejects the already-committed
`input-equivalence-policy.mjs` dependency (current LF SHA `44461b31f8e1dfa20b6d80614ac2412cbcb32e24b1979d144284f32cad524f9d`,
recorded `7e939aece26dd69b846b78fc6d21aa332463b53068f488cf19343578306d80d8`).
The policy has no working-tree diff; latest touching commit is `eb5de6a`.
Command: `node --test --test-reporter=spec --test-name-pattern="descendant color ancestry|root color separates|root color case index" tests/material-parity/input-equivalence-audit.spec.mjs`:
two pass, one fails at this dependency guard, before membership replay. Do not
report the historical membership gate as passed or refresh its receipt blindly.
Next: inspect the policy transition's applicability to the historical case
indexes, preserve all original assertions, then bind descendant owner/scalar
evidence using existing source inventory. Batch with pending motion integration;
do not export solely for this ancestry helper.

The five appearance/motion groups are now connected to the existing source-bound
owner-initial collector and classifier. Original motion issues are retained with
their review, not erased; source replay reconstructs the attached proof from the
original tree. The appearance fallback still runs after specific classifications.
Final focused run: five tests PASS in 95.00 seconds, including exact original
membership/state samples, panel/header precedence, source tampering and attached
motion-proof tampering. Against the pinned pre-appearance population, 39 groups /
2,427 occurrences now qualify (previous 34 / 2,195 plus five / 232); 13 groups /
504 occurrences and both native-auto groups / 156 occurrences remain excluded.
No candidate computed value or rendering equivalence is claimed. Accepted
canonical count stays 1,507: this code/evidence increment still needs the next
coherent export and conservation check. Continue the inherited-color batch before
that milestone instead of exporting for five groups alone.

Appearance/motion follow-up is now executable in the existing readers, through
an explicit `reviewedAppearance` opt-in (historical collectors do not opt in).
The existing motion test authenticates the accepted compact generation
`65c72350...`, original capture and every tree, then checks all eight scoped
groups / 454 observations. Five groups / 232 observations have disjoint targets
(badge count, both progress owners, both tab labels); chips and tab panel remain
excluded (222). All 232 target mutations to `appearance` are rejected. This is
target-set evidence, not inactive motion, computed candidate style or rendering
equivalence. Source/occurrence binding is now implemented as described above;
canonical export acceptance remains pending.
Historical replay is preserved: exact source transitions admit only the opt-in
change; the delay replayer reconstructs and authenticates the original reader
before replaying its original report. No historical receipt is rewritten.
All eight tests across owner-initial-motion-review, motion-source-conservation,
and motion-delay-target-review pass in 39.38 seconds. Accepted count stays 1,507.
Batch this reader/source-fingerprint transition with the next coherent integration;
do not run a new canonical export merely for this leaf-reader increment.

Current overlay authoring is now distinguished by executing the actual
`handleClick`, `familyElements`, and outside-dismiss methods with a mocked public
surface (source SHA `2c2979adc26453138e25dffeaeed18d3669514994eea662236ca8649ea00a863`).
Menu only patches open state: no focus request or autofocus node. Sheet authors
an autofocus Share button in a role=dialog div and requests its valid ID through
`whenSettled()` immediately after state mutation. Dialog instead requests the
nonexistent `dialog-dismiss`, while its actual modal dialog authors autofocus
on `dialog-cancel`. Core `buildActiveModalDialog` selects autofocus descendants
only for open modal `type: dialog` owners. These are separate authoring paths,
not evidence of one shared core focus failure. The source-execution check proves
requests and target existence, not current browser timing; the existing public
signal/update reduction remains the timing evidence, without historical bundle
attribution. Six focus tests pass in 6.63 seconds. Next current-runtime capture
must bind the served build and record focus before/after Angular update delivery;
do not repeat the already-established historical identity inventory. No authoring
or renderer correction was made.

Overlay focus inventory now accounts for all 199 retained interactions (menu
82, sheet 51, dialog 66). In addition to the 73 opening and 30 dismissal records
below, the remaining 96 comprise 24 explicit-focus records with matching opener
identities, 24 hover and 8 disabled records with both identities omitted,
24 held records measured after release, and 16 open-hover-content records with
reference identity omitted (candidate menu opener / dialog Cancel). Unknown
identities are not evidence of no focus. The capture-pinned harness AST confirms
that measurements and screenshots precede held release, whereas both focus
reads follow it: those scalar values cannot establish held-state focus.
Next instrumentation must sample focus at the same action boundary as the tree
and raster, retaining raw and mapped identities. Open-hover-content reference
focus is now recovered through the same authenticated exact selectors: eight
menu cases focus Rename while candidate focus remains on the opener; eight
dialog cases focus Cancel on both sides. This extends the recovered population
to 89 records: 57 sheet/menu discrepancies and 32 matching dialog observations.
It does not establish the current-runtime cause. No additional capture was needed.
The existing retained-overlay-focus suite passes all five tests in 6.41 seconds;
no renderer, fixture, capture or active-export dependency changed.

Retained focus evidence narrowed without recapture: all 25 bottom-sheet and
32 menu open/activate/activate-leave/open-hover-content records have one reference action matched
by an exact non-pseudo single `:focus` selector (`.mdc-list-item:focus` on Share,
`.mat-mdc-menu-item:focus` on Rename). Original capture and each tree SHA are
authenticated; the actual tree-reader bytes match the captured reader receipt
`06197eda...` and record these rules only after `element.matches(selector)`.
The same records report candidate opener focus and incorrectly `matches: true`.
This recovers reference focus at tree-capture time: it strengthens 57 historical
observations beyond merely missing scalar identities, but is not an event
timeline or proof of the current runtime cause. Dialog has now been checked
separately: all 32 records match the exact focus-indicator selector list whose
five branches each require a focused direct parent button. That parent's
`data-parity-id` is `dialog-cancel`, matching the recorded candidate identity.
Do not use the other ripple selector list containing `cdk-program-focused`
classes as proof: those branches do not all require actual focus. Thus the 73
missing opening reference scalar identities, plus 16 open-hover-content records,
comprise 57 sheet/menu discrepancies and 32 dialogs with matching captured focus,
not 89 behavioral failures. The existing retained-overlay-focus test covers all
of this recovery, including reader-byte authentication. No active-export
dependency or capture changed; the test is outside its source fingerprint list.
Next focused capture must distinguish retained-runtime mismatch from current
signal/update settlement behavior; do not recapture simply to rediscover these
57 historical reference focus owners.

Dismissal focus coverage is separately inventoried: two menu and two sheet
`open-dismiss` records identify the opener on both sides. Twenty-six records
identify the reference opener but omit the candidate identity: menu outside
(8), menu canvas (8), dialog outside (8), dialog `open-dismiss` (2). The retained
gate skips these states, accepting even an explicitly wrong candidate identity.
Do not label omission as body focus or proven focus loss: the old measurement
cannot distinguish body from an unidentified active element. Corrected capture
must record both raw active-element identity and mapped identity immediately
after dismissal, with explicit unknown/missing status rather than `undefined`
equality. Four retained-overlay-focus tests now pass in 5.56 seconds. This closes
the inventory question for those 30 records, not their current-runtime cause.

Corrected cold export from `b8c58ae` is TERMINAL, session **95217**, exit 1
after 2,074.90 seconds solely for 1,507 unresolved groups. The previous displaced
followup-classification error is gone. Coverage remains 436/436 static and
1,875/1,875 interaction, 8,483 groups / 389,202 occurrences / 134 source findings.
The evidence session verified 1,205 files / 89,151,875 bytes, zero invalidations,
two collectors and ten memory hits. Log: `appearance-b8c58ae-progress.log`.
Candidate compressed SHA `65c72350ed907939fbbbdae030f4aebcb7e83f1039de66fb4b3cb2c747a30c56`,
decoded SHA `45d4d3129ea5a13522bcd54e89f27bb80ce620e37f9e7a710c048fb1e1ce668a`.
Independent `--appearance` conservation is TERMINAL/PASS (session **83835**):
exactly 34 groups / 2,195 occurrences changed; 8,449 unrelated complete rows and
all raw inputs are preserved. Forty-eight control records change only the
authenticated producer receipt. Evidence: `appearance-b8c58ae-conservation.json`.
Section comparison is TERMINAL/PASS (**67600**), `appearance-b8c58ae-sections.json`:
71/79 sections unchanged, eight require explanation: sourceFingerprints,
controlLineBoxes, summary, discrepancies, ownerCaretInputs,
reviewedSourceBatchInputs, ownerInitialStyleEvidence, controlTypography.
Predecessor digests were reused from `dialog-tab-7c7beef-sections.json`.
Targeted authenticated metadata comparison is TERMINAL/PASS (**15177**): all
454 source fingerprints match disk; 54,139 non-appearance observations are
unchanged; 6,782 appearance observations are added, preserving exclusions.
All 55 metadata changes are reconciled: 48 control-line-box producer receipts,
one owner-caret producer receipt, the unresolved count, and five motion receipt
fields. The historical motion report reconstructed with current authenticated
source receipts hashes to `d6c98047bd06a82010b70674fdb278c3c20b91886d3e81c539eca8eae2674ff3`;
the previously passed independent motion replay preserves its non-receipt evidence.
Evidence: `appearance-b8c58ae-{metadata,receipts}.json`. The unchanged section
digests preserve all 134 source findings and 107 ordered proof entries.
Compact import (**99125**) and `npm run audit:findings:verify` both PASS:
8,483 groups / 389,202 occurrences / 39,904 control records / 134 source findings,
1,507 unresolved, 69,907,914 compact bytes. The small manifest is retained beside
the new generation's compressed payload for subsequent authenticated comparisons.
The appearance batch is accepted as a bounded evidence transition, not completion
of input equivalence or the final browser gates. Next shared batch: inherited
color ancestry and disjoint appearance/motion populations already scoped below;
do not repeat their surveys. Current-runtime overlay focus remains a separate gap.

Corrected-export preflight passes: the existing producer-transition helper now
removes only the exact appearance fallback relocation and authenticates the
complete predecessor module SHA (`1a88cf50...`). The appearance comparator uses
that transition and requires exactly 48 control records to change only their
producer receipt, with all other control data unchanged. Mutation tests cover
forged receipts, changed values, lost records, changed raw inputs and unrelated
producer edits. All 12 comparator/source-transition tests pass in 23.19 seconds.
Independent historical motion replay passes in 37.25 seconds with unchanged
findings; its current producer receipt changes, not historical evidence.
A broad fragment-detection condition initially rejected older producer sources;
the final helper detects the exact new condition and all historical comparisons
pass. No failed preflight is claimed as passing.

Precedence correction is now implemented in the audit producer: generic
appearance observation-stage attribution is a final unresolved fallback after
the existing specific classifiers. The historical eight-property position is
unchanged. A production-chain regression first failed with the displaced
owner-mismatch finding, then passed after the change; it now covers all 68
original expansion observations across static/focus/hover/held/activate/
activate-leave/disabled/open. It verifies unchanged raw input and retained
owner-mismatch attribution, plus fallback reachability without the competing
proof. All four focused owner/appearance tests pass in 8.40 seconds.

Independent comparator session 32166 is terminal, exit 1:
`appearance rows differ from source replay`, confirming rejection of the
previous export. Do not repeat comparison against that unchanged rejected
payload. Next: reconcile the comparator's formerly unchanged-producer condition
and affected producer receipts for this narrowly scoped source transition,
run the relevant focused preflight, then perform one corrected cold export and
full independent batch reconciliation. The retained rejected generation and
accepted compact predecessor remain intact. No canonical acceptance is claimed.

Appearance export `18d4239` is now TERMINAL, exit 1 after 2,155.50 seconds.
Do not poll/restart session 4759 or PID 3020. The evidence session authenticated
1,205 files / 89,151,875 bytes with zero invalidations, two collectors and ten
memory hits. Coverage is still 436/436 static and 1,875/1,875 interaction;
8,483 groups, 389,202 observations and 134 source findings remain.
**This export is rejected**, not the new accepted baseline: besides 1,507
unresolved groups it reports `followup group count changed: 65 !== 66`.

Root cause localized: newly enabled generic appearance attribution runs at
`collectStyleDiscrepancies` before the existing followup classifier. The retained
`expansion-primary` appearance row already has
`reviewed-expansion-panel-header-owner-mismatch` (68 observations): the reference
panel and candidate header are different owners. The generic collector accepts
their ID-to-tree bindings but must not supersede that specific mismatch proof.
Fix classification precedence for the newly admitted property, preserving the
existing eight-property behavior and all earlier reviews. Add a focused test
through the actual production classification chain, not only the new leaf
classifier; the previous 54-unresolved-group test missed already reviewed rows.
Do not weaken the 66-group validator or alter fixtures to make this pass.

Rejected files are retained in
`artifacts/material-parity/appearance-18d4239-rejected/`;
compressed SHA `94668481c2452eea7fa8b153a70b3894da440b2d673bfdb0d85b38cb15ddbbca`,
decoded SHA `681fbc382f7468a36c3b016b0fc48c88f8880a80fa16cf6483eca958d4f34f73`.
The working `docs` export currently contains this rejected generation; do not
import it or describe it as accepted. Compact pointer `0a6c0f6d...` remains the
accepted predecessor. Independent comparator session **32166** is still running
against these files; verify its terminal result before overwriting them. Output
path is `artifacts/material-parity/appearance-18d4239-conservation.json` (not a
passing receipt until the command succeeds). Source changes to fix precedence
will also require explicitly reconciling producer-hash receipts at integration.

Resumption coverage triage: authenticated compact generation `0a6c0f6d...`
still contains 1,541 unresolved scalar groups. Largest families are dialog
(186), bottom-sheet (132), chips/tabs (104 each), card (96), slider (77),
button-toggle (73), snack-bar (69), and tooltip (37). These are unresolved
input-classification counts, not counts of rendering defects or proof that
families with few unresolved scalars have correct interactions.

Priority order remains: (1) finish/reconcile the active appearance export;
(2) close the overlay focus measurement/source-applicability gap without
attributing historical captures to a different runtime bundle; (3) integrate
the already investigated inherited-color and disjoint-motion populations using
existing readers and focused negative controls; (4) continue remaining
geometry/typography/paint and state coverage from compact finding IDs.
Color is the largest property population (96 groups / 2,346 observations),
followed by background color (66 / 512), line height (61 / 3,240), and transform
origin (59 / 1,368). Counts guide batching, not automatic shared-cause claims.
The full browser matrix and source/ownership/reproduction deliverables remain
required even after scalar classification. Do not repeat the existing color
ancestry or motion census merely to rediscover these candidate populations.

Historical launch details (superseded by the terminal outcome above):
Appearance cold integration launched from `18d4239`: session **4759**, Node PID
**3020**, log `artifacts/material-parity/appearance-18d4239-progress.log`.
The tool handle and process were confirmed live after launch; last emitted phase
was `validate-audit`; the process was revalidated live with increasing CPU time
during resumption. Revalidate this handle/process before acting: this entry is not
permanent proof of liveness. Do not start another export or alter its source
dependencies while it runs. The accepted baseline remains the dialog/tab export
below until the new result is terminal and independently reconciled. Expected
appearance scope is 34 groups / 2,195 observations, with all earlier rows/raw
inputs preserved. Compare against retained compact generation `0a6c0f6d...` and
reuse the predecessor section-digest receipt; do not re-expand that baseline just
to recover already recorded digests.

The existing canonical comparator now has an `--appearance` mode, prepared
outside the active export's explicit source/dependency list. After the export
is terminal, run `node scripts/check-material-position-canonical-conservation.mjs --appearance`.
It authenticates the retained predecessor and new payload, replays original
appearance owner proofs, and requires exactly 34 groups / 2,195 observations,
unchanged raw inputs, unchanged control evidence and the unchanged audit producer.
All 11 comparator tests pass in 26.95 seconds, including eight appearance mutation
checks. The actual new-payload comparison and section/receipt reconciliation have
not run yet; passing checker tests is not acceptance of the exported batch.

The corrected dialog/tab cold export from `7c7beef` is terminal: session 80004
finished in 2,057.03 seconds, exit 1 solely for **1,541 unresolved groups**.
Coverage remains 436/436 static and 1,875/1,875 interaction; all 8,483 groups /
389,202 observations and 134 source findings remain. The evidence session verified
1,205 files / 89,151,875 bytes, zero invalidations, two collectors and ten memory
hits. Do not restart this completed export.

Independent reconciliation passes: exactly 19 groups / 708 observations changed
(nine dialog-flow and ten tab measurement-owner groups); 8,464 unrelated complete
rows and all raw inputs are preserved. Of 79 sections, 72 are unchanged. The seven
changes are fully accounted for: 454 source fingerprints match disk, all 134
source findings and 107 ordered proofs are unchanged, and 48 control receipts
change only the producer hash. The motion receipt was independently reconstructed
as `36eabe2a79977c89379f59458bb49b92716caccddee74af6273113b049792495`.
Receipts: `artifacts/material-parity/dialog-tab-7c7beef-{conservation,sections,metadata,receipts}.json`.
Canonical compressed SHA is
`0a6c0f6defafd4e27f0b93f3d4e732621a8f8a7d4807fc516f09c21270091296`;
decoded SHA is `185cecca3e2dbd07000dcb8a952639fe4df39811b4e0833f9330ec91355ea18c`.
Compact import and integrity verification pass: 8,483 scalar groups, 134 source
findings, 39,904 control differences, 389,202 observations and 1,541 unresolved;
compact shards total 69,797,762 bytes. Index SHA is
`ed6ddb547a1f61c6c7fecb37a1efaf8df602d504e8927b16b0ac2fee6809bea0`.
The small manifest is preserved beside the indexed payload for the next bounded
transition. This accepts only this audit increment, not complete input equivalence
or current browser acceptance. Final enforced gates remain required.

### Follow-up investigations outside the accepted classification batch

Appearance declaration question answered (September 25): the existing owner
survey now supports an explicit `reviewedAppearance` opt-in, without extending
the historical property list or production attribution population. Vendor
aliases (`-webkit-appearance`, `-moz-appearance`, camel-case forms), explicit
defaults and `all` resets are rejected on captured ancestry; native `auto`
remains excluded. Five focused tests pass in 2.23 seconds, including the
historical 600-group membership check and 30 alias/location negative controls.
Command: `node --test --test-name-pattern='appearance review|owner survey keeps|owner survey rejects|retains all raw' tests/material-parity/owner-initial-style-survey.spec.mjs`.

The full 2,311-case inventory and authenticated original capture reproduce
52 `none` groups / 2,931 observations with exact per-group occurrence counts:
34 groups / 2,195 observations eligible, 18 / 736 still excluded for the same
motion, ancestry or mapping reasons. No additional vendor declaration changed
that population. The existing proposal store retains all positive and negative
observations at `artifacts/material-parity/working-audit/proposals/2bcc18a4e94fb54c6389010ee25ce78d07b6d925bf493f791ddb04de994b5300.json`.
This is a proposal, not canonical attribution or a dependency-complete reusable
cache; replay from authenticated inputs when integrating. No renderer, fixture,
canonical classification or historical report was changed.

The existing source-bound attribution now includes appearance without changing
the historical survey property list. Its original-capture binding and independent
source replay reject removed appearance observations, changed reference values,
explicit candidate values, vendor declarations and false equivalence claims.
Three focused attribution checks pass in 3.28 seconds. A separate full-population
integration check rebuilds the complete original inventory and production owner
evidence, then verifies all 54 predecessor groups' occurrence counts, ordered case
samples and state lists. It confirms exactly 34 / 2,195 eligible, 18 / 736 excluded
and two native range `auto` groups / 156 observations unclassified. The four-check
run passed in 124.34 seconds; do not repeat the full-population check for prose or
unrelated edits. Focused command: `node --test --test-name-pattern='owner initial attribution|appearance attribution' tests/material-parity/owner-initial-style-attribution.spec.mjs`.
Explicit population command: `node --test --test-name-pattern='full-population appearance integration' tests/material-parity/owner-initial-style-attribution.spec.mjs`.
The population test pins the retained `0a6c0f6d...` compact predecessor and its
authenticated original capture; preserve that generation while this test uses it.

Next: batch canonical classification/export integration and verify earlier rows
are unchanged. The survey and attribution source fingerprints have changed:
historical survey `--check`, canonical evidence and source receipts require
explicit reconciliation at that boundary; none is claimed current after this
extension. The accepted canonical unresolved count remains 1,541 until then.
The two native range `auto` groups stay separate. The existing motion reader can
review disjoint targets but currently permits only the original eight properties;
it cannot yet clear the appearance motion exclusions. No renderer or fixture
changes, new survey framework or full browser run were introduced.

This replaces the earlier in-memory trial with an executable opt-in check.
The permitted claim remains computed-reference versus local-declaration
observation stage, not a synthesized candidate default, authored-input waiver,
or paint equivalence.

Appearance integration preflight exposed an import-order failure when entering
through the historical motion reader: attribution eagerly read survey constants
inside the existing audit/survey import cycle. The lookup is now lazy; three
focused attribution checks pass (4.10 seconds). The existing motion conservation
check permits only the exact opt-in survey source transition from `77ea9fd3...`
to `4c6d0bc3...`, after replaying every non-receipt value unchanged. Its test passes
in 41.70 seconds: all 121 groups / 7,254 observations and 12 mapping declarations
are preserved, and stale receipts remain rejected. Historical reports were not
rewritten. This clears the demonstrated preflight dependency failure; it is not
yet a successful canonical export or acceptance of the appearance batch.

Read-only follow-up while that export runs: admitting appearance to the unchanged
motion reader in memory (reader SHA `c0bc61f1...`, authenticated original trees and
the retained appearance proposal) distinguishes the eight motion-only exclusions.
Badge count 52/52, progress bar 20/20 and spinner 20/20 have disjoint named targets.
The first-pass tab labels are mixed: activity 52/70 and overview 18/70 pass; their
remaining cases lack a transition target in the delay-only rule. Both chips (76 each) remain unproven for
transition targets and animation names; tab panel (70) retains unresolved motion
values/targets. This is diagnostic evidence only, not production reader support
or canonical attribution. A second read-only pass reuses the unchanged delay
reader (SHA `5004f99e...`) with appearance admitted only in memory: all 70 activity
and 70 overview cases have explicit same-node disjoint targets. Delay witnesses
occur in 18 activity and 52 overview cases; 70 mutations replacing the target
with `appearance` are rejected. This resolves the specific delay-rule uncertainty
without asserting a cascade winner, inactive motion or rendering equivalence.
Next preserve source/occurrence binding while extending the existing motion
attribution for five whole groups / 232 observations (the three above plus both
tab labels). Chips and tab panel remain excluded. Do not modify the active export
to include this follow-up batch.

Next shared color investigation (read-only census during export): the accepted
compact index has 96 unresolved color groups. Of these, 68 / 1,642 observations
are the light/dark on-surface color versus local omission. Original scalar lookup
finds 1,794 matching occurrences: the extra 152 belong to 24 already-reviewed
static `reviewed-stage-mismatch` siblings, confirmed in the same compact index.
Preserve that partition rather than reclassifying all raw matches. Six groups
(icon, paginator host and expansion title, each light/dark) contain explicit
reference variable-based color declarations, so matching computed theme colors
do not establish absence of authored color. The remaining groups still need
complete ancestor/request checks. Reuse root-color ancestry evidence and existing
membership/precedence validation; do not synthesize candidate inherited colors or
infer parity from equal visible colors. No color classification changed.

The follow-up read-only ancestry probe reuses all 2,311 root-color proofs,
existing mapped-owner paths and the precise normalization contract. After
excluding exactly the 152 reviewed static siblings, all 68 unresolved groups'
occurrence counts and ordered case samples match the original capture. Forty-six
whole groups / 1,196 observations have the same proven root color and no
intervening color/reset/motion request on either side. Twenty-two groups / 446
observations remain excluded: toolbar title, icon, paginator host/range/size,
radio labels, tab panel, expansion title, progress bar and spinner (light/dark).
This is a diagnostic proposal, not canonical attribution, computed candidate
inheritance or paint equivalence. After the active export terminates, extend the
existing root-color reader to descendant owners with source-bound membership and
negative controls for intervening requests, missing ancestry, state changes and
reviewed-static precedence. Preserve the 22 exclusions; do not add fixture colors.

The retained overlay focus harness gap is now an executable, source-pinned proof:
`node --test tests/material-parity/retained-overlay-focus.spec.mjs` passes 2/2
in 2.92 seconds. The original capture SHA `b07ef154...` pins the harness's raw
SHA `b2477a12...`; its current bytes match that receipt and match Git `58ce15f`
after CRLF normalization (Git blob SHA-256 `c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10`).
The test extracts the actual historical measurement and acceptance expression,
then exercises native browser focus. An authored `id` is identified correctly;
an actually focused `data-parity-id="dialog-cancel"` or generated Share anchor
returns no reference identity. Open/activate/activate-leave states still accept
unequal identities, and even state `focus` accepts two undefined identities.
The authenticated capture contains 73 affected open/activate/activate-leave
records: sheet 25 (candidate opener), menu 24 (candidate opener), dialog 24
(candidate cancel). All omit reference identity and report a match. This proves
an instrumentation/acceptance gap, not 73 actual focus defects; dialog's candidate
cancel may be the correct target. No historical report was rewritten.

Next instrumentation correction should reuse the reference measurement's existing
target aliases and parity IDs, record identifiable actual focus at relevant action
boundaries, and require meaningful target comparison for overlay opening/dismissal.
Do not simply compare undefined values or assume that every missing reference ID
means focus remained outside the overlay. Keep this correction separate from any
application focus scheduling fix. Production harness changes and fresh paired
capture remain pending until the live export's reconciliation boundary.

Pending focus-state investigation now has a public-package scheduling reduction.
`scripts/audit-material-sheet-focus.mjs` drives a real browser click in an Angular
host using the exported `AstylarSurfaceComponent`. In three independent mounts,
changing the input signal and immediately awaiting `surface.whenSettled()` calls
`focus('share')` before Angular submits the changed document: focus returns false
and the inspected document still contains only `opener`. The trace then records
the update submission; the settled document contains `opener`, `sheet`, `share`.
Both controls succeed: focus after Angular stability, and focus after awaiting an
explicit public `surface.update()`. There are zero browser errors. This confirms
the ordering failure in the reduction, not a core focus failure after a submitted
update. No private renderer API or fixture/style compensation is used.

Evidence: `artifacts/material-parity/sheet-focus-probe-repeated/result.json`, SHA
`8a9ddf86ab0e940113bc9ef05b23434f2815f22fb9bd256037ff5c2eb0b23a93`.
It retains three traces, 104 compiled-package receipts matched to the existing
radius diagnostic build, complete bundle input hashes, and the entry source.
Run `node scripts/audit-material-sheet-focus.mjs <new-evidence-directory>`.
This is diagnostic failure evidence and remains retained. Its initial exploratory
result is separate under `sheet-focus-probe`; neither result is a canonical
classification or proof of Material rendering parity.

Applicability limit: the current showcase still uses this immediate wait/focus
sequence at lines 274–278 (origin `2f440115`). Its bottom sheet is a `div` with a
dialog role, not the `type: dialog`, `open`, `modal` branch that owns core modal
autofocus. The current showcase browser build cannot stand in for the September
12 capture: only one of its 971 pinned browser files matches, three differ and
967 are missing. Historical bundle attribution remains unproven. Next obtain
matching retained application code or instrument a fresh Material reproduction,
including the focus return value and update boundary. Keep the unconditional
8% baseline paint, focus-transfer race and harness focus-acceptance gap separate.

The standalone focus reduction and retained-harness proof were developed without
changing the export's dependencies and are outside its explicit source inventory.
Their later canonical classification remains pending. Remaining high-population
families include dialog (186), bottom sheet (132), tabs (104) and chips (104).

### Earlier batch history — retained provenance, not current status

Dialog/tab cold export at `99bea34` is terminal: session 26516 completed in
2,070.83 seconds with exit 1. Coverage and raw totals remain 436/436 static,
1,875/1,875 interaction, 8,483 groups / 389,202 occurrences, 134 source findings.
It reports 1,541 unresolved plus ten unclassified rows: the new tab classification
used `harness-instrumentation-defect` rather than schema `parity-harness-defect`.
This output is rejected, not accepted canonical progress. Its manifest, markdown
and payload are retained in `artifacts/material-parity/dialog-tab-99bea34-unclassified-export`;
payload SHA `c8bef810fb56d5ffe323dbe311b592629ba81f3c26f4740be2efd38f9cfc71df`.
The log is `dialog-tab-cold-progress.log`. Accepted canonical files were restored
from `c53bd80`; no failed snapshot was imported. Correct both proof and row labels,
assert schema membership in the focused test, then re-export/reconcile. The failed
run's evidence session verified 1,205 files / 89,151,884 bytes, zero invalidations.

Read-only next-batch evidence: the two remaining bottom-sheet-dismiss background
groups (19 light/contrast/custom + 6 dark observations) are not simply transparent
versus filled paint. Existing modal mapping authenticates all 25 original owners:
native anchor background is transparent, but its generated `::before` focus layer
computes `rgb(29, 27, 30)` at opacity `0.12` throughout. Candidate normal/effective/
interaction backgrounds all retain `#e6e1e5` (19) or `#312f35` (6). Current fixture
line 803 authors an unconditional ID-specific 8% mix; line 804 separately authors
a 12% focus mix. Both originated in `8505c3b` (match bottom sheet overlay geometry).
This distinguishes state-layer ownership and baseline authoring from a simple
missing native fill. Next prove applicable cascade/selector precedence and bind
the two rows with existing owner-review infrastructure; do not infer renderer
paint equivalence or classify from host color alone. No canonical attribution or
fingerprinted source was changed during this read-only investigation.
Follow-up narrows the state question: all 25 authenticated original sheet records
have `focus.astylar = bottom-sheet-primary`, omit reference focus identity, and
report `focus.matches = true`. The native generated action has an active focus
layer, while the candidate stays on its baseline background. Current harness
`run-material-parity.mjs:422` gates equality only for state `focus`; open/activate
records therefore do not prove autofocus equivalence. Current core also resolves
live pseudo rules separately (`style.service.ts:539`), so ordinary CSS specificity
alone is not evidence for why the candidate focus mix was absent. Track distinct
questions: unconditional authored fill versus native pseudo ownership; actual
overlay focus target/transfer; and missing open-state focus acceptance. Original
bundle attribution and public focus reproduction remain pending. Do not promote
the green focus flag or a missing reference ID to proven focus parity.

Corrected `e857030` cold export is terminal (1,853.48 seconds, exit 1 solely
for 1,560 unresolved groups). Strict canonical reconciliation passes: 8,483
groups / 389,202 occurrences, exactly 18 changed groups / 298 occurrences,
8,465 unrelated complete rows preserved, all raw inputs preserved. Of 79 report
sections, 70 are unchanged; the other nine are fully reconciled. All 454 source
fingerprints match disk, prior 133 source findings and 106 ordered proof entries
are preserved, with one radius finding/proof added. Forty-eight control receipts
and the independently reconstructed motion receipt change only producer hashes.
Evidence: `artifacts/material-parity/sheet-action-e857030-{conservation,sections,metadata,receipts}.json`.
Candidate compressed SHA is
`ed33d97cd19daa01bdfa984abfaac85e5a5f1dafc6e31fa739400e58b14835e7`;
decoded SHA is `185b07a93db39edb341e39af31476333e5facb3b0fba3a00df393f645352ef9c`.
Compact import completed: 8,483 scalar groups, 134 source findings, 39,904 control
differences, 389,202 occurrences and 1,560 unresolved groups; 69,762,238 compact
bytes. This accepts only the bounded evidence transition, not full input
equivalence or final browser gates.
Next canonical batch: dialog flow plus tab label/control stage comparison.
The existing modal module now proves/applies/replays the nine dialog groups /
288 occurrences against all 64 original owners and all three candidate stages.
It preserves empty CSSOM expansions beside the authored padding tokens, binds
the existing compensation finding, and leaves unrelated/default rows unchanged.
The focused ID-less-row, raw-conservation and mutation checks pass in 5.51 seconds.
This proof is not wired into production aggregation yet; canonical counts remain
1,560 unresolved. Batch integration/export with the tab proof, rather than
exporting for nine rows alone. Do not repeat the completed surveys below.
Dialog proof is committed/pushed as `5d2bbcd`; a fresh focused replay passes
in 5.20 seconds. Tab control-stage proof now covers all 140 owners across 70
authenticated retained cases: height, box-sizing and shrink agree with the
native role=tab ancestor in all 420 candidate stages. The measurement IDs name
native text labels but candidate controls. The existing tab suite passes all
three tests in 0.91 seconds, including changed-stage and ancestry negative cases.
This narrowly resolves the box-owner question, not typography or rendering
equivalence. Exact-row binding now uses the existing owner-review implementation:
ten scalar groups / 420 occurrences are bound to the tab proof, with all raw
values preserved and four line-height/padding groups left untouched. Missing or
duplicate cases, forged values and unsupported renderer-cause metadata fail replay.
All four tab tests pass in 3.96 seconds; the shared helper's default dialog
classification remains covered by its passing 5.19-second focused check.
The position-focused suite initially rejected a new untracked reader dependency
when the row binding imported the shared modal helper into the cached collector.
Binding now lives beside that helper instead, leaving the collector graph intact;
all three position-focused tests pass in 5.01 seconds and four tab tests in 3.97
seconds. No cache guard was weakened and no new report was generated.
Tab control-stage and dialog flow are now integrated together into production
aggregation, independently replayed validation and the exact predecessor guard.
Ten checks pass in 19.00 seconds: the combined binding uses the complete original
2,311-case inventory, covers exactly 19 groups / 708 occurrences, preserves raw
values and unrelated typography rows, and rejects changed source boundaries.
The existing canonical comparator now has `--dialog-tab`, pinned to accepted
`c53bd80` / decoded `185b07a93db39edb341e39af31476333e5facb3b0fba3a00df393f645352ef9c`.
All ten comparator tests pass in 22.19 seconds, including jointly forged raw
inputs, invented defaults, receipt changes and mixed-batch rejection. The small
accepted manifest is preserved beside its already-retained `ed33d97...` payload;
the payload hash was rechecked, with no new payload copy. Next cold-export once
and run `node scripts/check-material-position-canonical-conservation.mjs --dialog-tab`,
then reconcile all changed report sections. The expected unresolved count is 1,541 only if full reconciliation
succeeds; the accepted canonical count remains 1,560. No browser recapture or
renderer/fixture implementation was performed for this metadata integration.

### Prior export recovery and pending investigation evidence

Cold export at `decc53f` finished in 1,873.05 seconds, exit 1, with widespread
coverage replay failures. It is rejected, not an accepted snapshot. The corner
review joined replacements by compact-store `id`, absent from canonical rows;
all 8,483 rows consequently became the final six-occurrence contrast row.
A focused regression using ID-less canonical-shaped rows plus an unrelated
dialog row reproduced the failure, then passed after joining by selected input
object identity. The original 24 radius groups and raw-row conservation remain
checked. Failed manifest, payload and markdown are retained in
`artifacts/material-parity/sheet-action-decc53f-failed-export` (payload SHA
`cf75902c6e147240da64134a8811c74ade208c1106a3f82a71306742a57118bd`);
the progress/failure log remains `sheet-action-decc53f-progress.log`.
Focused corner regression passes in 4.39 seconds after failing on the old join;
all nine canonical-conservation tests pass in 18.06 seconds. Canonical files
were restored to accepted `1cd2b7e`: 1,578 unresolved scalar
groups. No failed snapshot was imported. Pipeline correction is committed/pushed
as `e857030`. Its corrected cold export subsequently completed and was reconciled
and accepted in `c53bd80`, as recorded above; session 20096 / PID 1340 are historical,
not live handles. The log remains `sheet-action-e857030-progress.log`.

Next bounded question: do dialog title/content layout differences originate in
authored inputs or renderer placement? Read-only replay authenticated both input
trees in all 32 retained dialog observations from
`docs/material-position-input-population.json`. One identical rule/value signature
per owner proves native title padding `6px 24px 13px` versus candidate
`7px 24px 12px`, and an explicit native adjacent-title content `padding-top: 0px`
versus candidate `2px 24px 0`. Native content also declares block flow,
`overflow: auto` and `max-height: 65vh`; candidate uses flex and omits those
constraints. Native title declares block flow and shrink zero versus candidate
flex and shrink one. Compact baseline lookup identifies nine unresolved groups /
288 occurrences. Bind these to existing `fixture-dialog-text-flow-substitution`,
not a duplicate finding. All 64 candidate owners have no inline style and all
192 normal/effective/interaction stages preserve the stated padding, flex flow,
shrink one and omitted maximum-height/overflow constraints. This is retained-input
evidence, not proof of current browser output or renderer causality. A read-only
join against the authenticated complete 2,311-case capture verifies all nine
raw scalar pairs, v2 candidate-style evidence, 32 distinct matching cases per
group, occurrence totals and the exact first-12 case lists. Persistent replay
integration remains pending. Missing initial/default properties are outside
this proposed batch.

Next tab mapping caution: authenticated all 70 `tabs-primary` population tree
pairs and both direct tab IDs (140 owners). Reference IDs name rule-free nested
`span` labels, not their role=tab ancestors; candidates name `button` controls.
Reference label height/line-height are 14px and box-sizing content-box throughout;
candidate normal styles use 20px line-height and border-box, with heights 48px
(72 owners), 32px (34), or 40px (34). These are different semantic boxes, not
evidence of a core height or box-sizing error. Reuse existing
`fixture-tab-label-typography-flattened` and its text-owner proof; next bind exact
scalar rows to label/control ancestry before classifying these signatures.
The generic origin alias helper deliberately refuses direct-ID cases and must
not be used as evidence that these direct IDs are missing. No canonical change.
Following each reference label to its actual role=tab ancestor resolves the
height, box-sizing and flex-shrink comparison: all 140 controls match all 420
candidate normal/effective/interaction stages on those three resolved values.
The compact index binds ten currently unresolved groups / 420 occurrences to
the label-versus-control comparison. This does not prove authored width/layout
equivalence or paint parity. Keep the two 14px-versus-20px line-height groups
(140 occurrences) and two density padding groups (34 occurrences) separate;
they are not excused by matching outer-control sizes. Next add this ancestor
binding to the existing tab proof and independently replay complete row coverage.

Sheet-action batch integration preparation is complete. The existing canonical
conservation comparator now supports `--sheet-action`, pinned to accepted
`1cd2b7e` and decoded predecessor SHA
`b1a7073b5c52fe2453580704afa678c1994c9201e01334031474148836c94ccc`.
It independently replays ten layout and eight contrast-corner groups from the
original complete tree inventory and requires exactly 18 changed groups / 298
occurrences, unchanged raw inputs and all other complete rows, plus only the
48 known producer-hash receipts in control evidence. All nine comparator tests
pass in 18.40 seconds, including lost/forged input, unjustified radius closure,
unrelated control and producer mutation controls. The small accepted manifest
is preserved beside the already retained compressed predecessor; no 55MB payload
copy was made. Next is one cold full export using all five original input paths,
then strict row/control conservation, all-section comparison, exact source finding
addition/fingerprint reconciliation and compact-store import. Expected counts
remain projections: 1,560 unresolved and 134 source findings, not acceptance.

Radius root cause is now in the existing `sourceAuditDefinitions` inventory as
`core-rounded-radius-sampling-uses-unclamped-request`, with source location,
owning subsystem, public proof and explicit historical limits. Producer proof
inventory and source fingerprints include the diagnostic and existing runner.
The existing exact producer-transition guard admits only these additions.
Focused replay authenticates the retained bundle, 104 source receipts, both
diagnostic source files, all 12 case outcomes, observed mesh counts and each PNG;
it independently recomputes solid shape-mask differences rather than trusting
the saved pass/fail text. Two radius tests pass in 2.41 seconds, and all six
producer/alignment guards pass in 18.46 seconds. No browser rerun was needed.
Canonical source finding count remains 133 until reconciliation (134 proposed);
unresolved count remains 1,578 (18 additional classified groups proposed).

Application-build session 17662 is now terminal, exit 1 after the verified Node
13708 and owned esbuild 12580 were stopped. At 21:23 local the child used about
4.86GB working set and only 1.6GB physical memory remained. It never left
Building; this repeats the known broad-bundle resource issue, not a test result.
Do not restart it unchanged. Successful fresh library compilation, standalone
test typecheck and installed-package browser evidence remain separate valid
checks. No active build handle remains. Next coherent milestone: extend the
existing canonical conservation comparator for the 18-group / 298-occurrence
sheet-action batch and the one new source finding, then perform one cold export
and full source/section reconciliation. Full audit coverage and final gates are
still incomplete; no renderer changes or parity acceptance are claimed.

Public-package/browser proof now confirms the oversized-radius failure on both
`div` and `button`. New isolated diagnostic
`src/parity/rounded-radius.audit.spec.ts` imports only the `astylarui` package root
for authoring and renders equal 480x48px, 24/36/9999px-radius inputs beside native
HTML. The existing package runner accepts this spec as optional fifth argument;
its old default and assertions remain unchanged. No canonical fixture edits.

Fresh `ngc -p tsconfig.lib.json --outDir artifacts/material-parity/radius-source-build-f95a265`
passes, and the runner verifies all 104 emitted JS files against both installed
showcase package and local dist. Runs retained at
`artifacts/material-parity/radius-public-f95a265-dpr1` and `-dpr2` contain six
cases each, four passes and two expected diagnostic failures, zero page errors.
Chrome 153.0.8010.53 / Angular 20.3.31 / Babylon 8.56.2 / AstylarUI 0.2.0.
At both DPRs, 9999px produces a square-ended four-vertex rectangle versus a native
capsule. Solid shape-mask differences are 588 pixels at DPR1 and 2,136 at DPR2;
24/36px controls differ by only 44/36 and 40/20 pixels respectively. The observed
68/44/4 vertex counts agree with the source-derived kernel proof. Native and
candidate surface backgrounds differ (white/default red), so whole-image pixel
differences are explicitly not a parity metric here; the diagnostic compares
only the opaque #302d32 shape mask. The 1% mask criterion is a local shape
diagnostic, not complete antialiasing equivalence. Failure screenshots were viewed.

Reproduce with `node scripts/audit-overlay-layout-stage.mjs <new-output> <1-or-2>
artifacts/material-parity/radius-source-build-f95a265 src/parity/rounded-radius.audit.spec.ts`.
Standalone TypeScript check passes with `--noEmit --module preserve
--moduleResolution bundler --target es2022 --skipLibCheck --experimentalDecorators
--types jasmine`. Renderer remains unchanged. This demonstrates the current
public rendering defect, not historical author motivation or original-bundle
behavior. Next: include it in the existing machine-readable root-cause inventory
and batch reconciliation; preserve the sixteen unclassified historical radius
groups until their input-contract classification is independently justified.

Angular application build required by the Angular testing workflow is running:
session 17662, Node PID 13708, command `node node_modules/@angular/cli/bin/ng.js
build --output-path artifacts/material-parity/radius-app-build-f95a265`.
Last check confirmed the process live at Building; no build success is claimed.
Poll this same handle before restarting or claiming completion.

New owning-kernel evidence: current `BabylonMeshService.createPolygonVertexData`
routes rounded rectangles to `createRoundedRectangleVertexData`; round-polygon
normalizes requested 24/36/9999 radii to 24 for a 480x48 box, but the renderer
chooses segment length from the original radius (`max(0.001, radius / 10)`).
Executing these production methods extracted through TypeScript, with the actual
installed round-polygon and Babylon VertexData, produces respectively 68/44/4
outline vertices and 66/42/2 triangles. The same result holds at scale 1 and .01.
Thus normalized arcs do not imply equivalent candidate polygon boundaries; an
oversized full-round request degenerates to a four-vertex outline. This is a
demonstrated current geometry-kernel defect, not yet a public-API/framebuffer
reproduction or a diagnosis of the original captured bundle. No renderer fix.
Source SHA-256: `a1a1adab9ffdc0e9edbc43a6d4c835ee7b2f6094b9cbd3a13484ccd0923f0a2c`.

Existing modal spec now contains the source-extracted kernel proof. Focused
command `node --test --test-name-pattern="current rounded rectangle kernel|bottom-sheet action corners"
tests/material-parity/modal-position-inspection.spec.mjs` passes both tests in
5.45 seconds. Next decisive proof is a minimal public-API rounded control with
equal 9999px inputs, compared with the browser and a bounded-radius diagnostic;
do not change canonical authoring to hide the sampling defect.

Historical row-mapping limitation: original capture pins harness hash
`b2477a124293aec6bba3a2413ff58d41f409288dcf0cb53a54ed17d162b9fa97`;
current harness hashes to `c3cabcfde7b9a0cd911eb919774e258145aefc629ff308a48f1f51ece0f34e10`.
No matching whole-source hash was found among the last 60 committed revisions of
that file. Therefore current collector order is not silently certified as the
historical mapping. Reuse preserved source snapshots if available; otherwise
document the gap and use fresh bounded evidence for runtime claims. Do not repeat
that same revision scan. Accepted count remains 1,578, with batched reconciliation
and broader coverage/final gates still outstanding.

The eight-group contrast-corner replay is integrated into the bound producer,
independent original-row validation, unbound-attribution rejection and exact
source-restoration guards. All six producer/alignment tests pass in 14.15 seconds;
the first run caught missing additions to the two import allowlists, corrected
before the passing run. No canonical export or accepted-count change yet.

Retained geometry closes part of the remaining corner-equality evidence gap:
the hash-authenticated original capture contains `overlayPlacement.astylarRows`
and `referenceRows` for all 25 sheet states / 50 owners. Desktop DPR1/2 rows are
480x48 CSS pixels; comparison-pane rows are 868x48. Maximum paired width/height
difference is 4.44e-11px. Current collector source at
`tests/material-parity/run-material-parity.mjs` maps candidate rows in explicit
Share/Copy-link ID order, native rows by the first two list items. Before using
this mapping to classify historical rows, bind its historical applicability and
the captured native owner order. Next: reuse this retained geometry in the
existing corner proof and trace the relevant candidate corner-paint normalization;
do not treat matching boxes alone as proof of identical paint or all-profile
token semantics. No new capture is needed just to obtain these dimensions.

Corner investigation now has a focused semantic proof in the existing modal
module: `proveBottomSheetActionCorners` binds all 50 original action owners,
their ordered native token requests (including preserved empty CSSOM expansions),
candidate radius requests and three resolved stages. All 24 unresolved corner
groups / 200 occurrences are joined to their original cases. Only the eight
contrast groups / 48 occurrences are proposed as authoring substitutions by
`applyBottomSheetContrastCorners` and its independent original-row validator:
18px is not full-round on an equal 48px-high wide box. The sixteen 24px/36px
groups remain unchanged because CSS radius normalization can make their shapes
equivalent; candidate used-box and paint equivalence are still unproved.
The proof makes no renderer defect or measured candidate geometry claim.

Focused command: `node --test --test-name-pattern="bottom-sheet action (corners|layout)"
tests/material-parity/modal-position-inspection.spec.mjs`; both tests pass in
8.39 seconds. Negative controls cover token/declaration changes, competing state
and unknown-selector requests, stage overrides, missing cases, duplicate/deleted
classified rows and fabricated measured-layout claims. Reuses the existing modal
replay helper; no new survey/report framework, fixture change or browser capture.
Next: integrate the eight-group replay into the producer guards, then resolve
remaining radius-equivalence evidence in the adjacent sheet action sizing batch.
Canonical count stays 1,578; these eight groups and the prior ten action-layout
groups await batched export/reconciliation. Modal proof/test fingerprints changed.

Action-layout producer wiring is committed and pushed as `55d7bcd`.
Read-only corner-token inspection now covers both actions in all 25 original
sheet states (50 owners), using the authenticated modal capture and existing
inventory adapter. Every native owner retains two ordered radius requests:
`.mdc-list-item` uses `var(--mat-list-list-item-container-shape,
var(--mat-sys-corner-none))`; the later `.mat-mdc-nav-list .mat-mdc-list-item`
uses `var(--mat-list-active-indicator-shape, var(--mat-sys-corner-full))` and
the same expression for its focus-indicator radius. Native computed radius is
9999px throughout; candidate resolved radius is 24px light/dark, 18px contrast,
36px custom. The original cssText therefore supplies the token expressions
missing from expanded CSSOM values; no new browser capture is needed to recover
them. This check took 4.2 seconds. It does not prove candidate used corner shape,
complete competing/reset requests, or rendering equivalence. Next decisive check:
extend the existing semantic proof to bind all relevant candidate radius requests
and stages, preserving empty native expansions, then distinguish input-token
substitution from geometry-dependent radius normalization. No new classifications
or accepted-count changes are claimed by this inspection.

The ten-group / 250-occurrence sheet action-layout replay is now wired into the
bound-original producer branch and independent original-row validator. The
unbound guard rejects its attribution without provenance, and exact source
restoration admits only the added integration. Mutation controls reject bypassing
the classifier or validating against its own output. All six producer/alignment
checks pass in 13.83 seconds. Canonical integration and source reconciliation
remain pending; accepted count is still 1,578 (1,568 is only a projection).
No full export was run for this wiring step.

Adjacent read-only radius check: Copy link has native 48px height and 9999px
computed corners across 25 states; candidate height is also 48px, with radii
24px in light/dark, 18px in contrast and 36px in custom. Native owner rules retain
empty expanded radius CSSOM values, so preserve and inspect their original
shorthand/token expressions. Do not classify all unequal radius numbers as
unequal rendering: overlap normalization and actual candidate box dimensions
require separate proof. Next: examine both action owners' complete corner-token
requests and distinguish input substitution from any bounded used-shape equality.

Sheet action-row investigation is now a durable semantic proof and replay in
`modal-position-inspection.mjs`: `proveBottomSheetActionLayout`,
`applyBottomSheetActionLayout` and `validateBottomSheetActionLayout`. All 50
owners / 25 original states bind exactly ten unresolved groups / 250 occurrences
for display, position, X/Y overflow and box-sizing on Share and Copy link. Native
anchor list items explicitly request flex, relative, hidden and border-box and
contain span/div wrappers. Candidate childless value buttons omit these authored
requests and retain block display. Complete relevant native requests, potentially
applicable candidate state/unknown-selector rules, inline inputs and all three
candidate stages are checked. This locates an input-authoring divergence before
rendering; it does not demonstrate used layout, equivalent interaction semantics,
or a core defect. Reuse existing source finding
`fixture-bottom-sheet-list-structure-and-token-substitution`; no duplicate finding.

The replay reuses the existing modal helper and conserves original scalar fields.
Negative controls reject inline/default substitutions, state and unknown-selector
resets, changed child structure/native rules, missing or duplicate cases/rows,
forged prior metadata and invented layout-measurement claims. Three focused
action/paint/flow tests pass in 13.26 seconds. This ten-group preparation is not
wired into the canonical producer; accepted unresolved count remains 1,578.
Store and modal proof/test source changes await the next batched fingerprint
reconciliation. No renderer/fixture edits, full export or browser recapture.
Next: wire this replay into existing producer/independent validation guards and
investigate adjacent action-item sizing/paint inputs before a coherent batch.

Compact family lookup correction: `queryFindings` previously used a suffix match,
so querying `list` also loaded all `grid-list` shards. The existing store test now
includes both families in all four supported sections and historical-snapshot
queries. It reproduced the defect (eight records instead of four) before the fix,
then passes with exact section/family filenames (0.18 seconds). Real current-index
queries across all 36 families yield exactly 8,483 distinct scalar IDs and 1,578
unresolved groups without an extra caller-side family filter; complete index
verification also passes. Canonical bytes and classifications did not change.
The store source and test fingerprints require reconciliation at the next batch
export; do not describe the accepted package as matching those edited sources.
No full export or browser recapture is justified for this isolated lookup fix.
The next investigation remains the 50 sheet action owners described below.

The sheet-panel cold export at `7e71c96` is independently reconciled against
accepted `9b0ec36`: **1,578 unresolved groups**, 8,483 scalar groups / 389,202
occurrences, 133 source findings and 39,904 control differences. Coverage remains
436/436 static and 1875/1875 interaction. The export took 1,867.168 seconds;
exit 1 reports only the still-unattributed groups, not full audit acceptance.
Its evidence session reverified 1,205 files / 89,149,474 bytes, with two collectors,
10 memory hits, no disk hits and zero invalidations. Export session 62436 is
terminal; do not restart it. Log: `artifacts/material-parity/sheet-panel-7e71c96-progress.log`.

Independent `--sheet-panel` conservation passed: exactly 17 groups / 279
occurrences changed, 8,466 complete rows are identical, raw scalar inputs remain
unchanged, and all control evidence is conserved except 48 producer-hash receipts.
Section reconciliation authenticates all 79 sections: 72 unchanged, seven changed,
none added or removed. All 452 ordered source fingerprints match disk; seven
expected audit-source hashes changed, with no source inventory changes. All 133
source findings are byte-structurally unchanged. The 54 metadata leaf changes
are three counts, three binding receipts and 48 line-box producer hashes. The
motion-review hash was independently reconstructed using only the producer
fingerprint change: `67373385b1149e123598660da59312e40f0fcf6317f8738ba04773549669e187`.
Evidence: `artifacts/material-parity/sheet-panel-{conservation,sections,metadata-sources,receipts}-7e71c96.json`.
Canonical compressed SHA: `b05e2adcec67d05f5371246d6aa527df4f4528cfb75a2fcc5ed027da86ab9b9d`;
decoded SHA: `b1a7073b5c52fe2453580704afa678c1994c9201e01334031474148836c94ccc`.
Compact import and verification pass with the same counts; shards occupy
69,742,490 bytes. The current generation is the compressed SHA above and its
index SHA is `7623877cb5b0b5e4fec5edb62f8f8cd433e7e616a68aa36e8c7ff5cf59a2c9c7`.

Next bounded questions: correct the compact-query family suffix collision
(`list` also returns `grid-list`; exact-family filtering confirmed the previous
1,595 total, so stored findings are not corrupt), then formalize sheet action-row
input evidence. A read-only check of all 50 action owners / 25 original states
found native flex/relative/hidden-overflow/border-box requests with span/div
children, versus childless candidate block buttons omitting position, overflow
and box-sizing in all three captured stages. This needs a durable complete-rule
semantic proof before attribution; it is not a renderer or visual-equivalence
claim. Continue broader overlay, typography/control and interaction coverage;
all final full canonical/browser acceptance gates remain open. Earlier notes
below retain chronological preparation history, not current running-job status.

The combined sheet milestone is ready for cold export. The existing canonical
comparator now has `--sheet-panel`, independently replaying the three proofs
against accepted `9b0ec36` and its authenticated `78ed94a2...` payload. It requires
exactly 17 changed groups / 279 occurrences, unchanged raw scalar evidence and
all unrelated control data, allowing only the 48 existing producer-hash receipts.
Eight comparator tests pass (13.99 seconds), including invented defaults and
jointly forged expected/actual evidence. Eight semantic sheet/neighboring dialog
tests pass (26.24 seconds); the real retained sheet composition produces exactly
17 groups / 279 occurrences and each independent validator accepts it. The small
accepted manifest was preserved beside the already retained compact-generation
payload without duplicating that payload. Next command is one five-input cold
canonical export, followed by `node scripts/check-material-position-canonical-conservation.mjs --sheet-panel`,
section/source reconciliation and one compact-index import. No new canonical
result is accepted yet, and historical output parity is not final acceptance.

Latest preparation: bottom-sheet paint attribution is now wired into the bound
original-capture producer branch and independently replayed from original rows.
The unbound guard rejects paint attribution without provenance. Exact source
transition checks reject bypassing the paint classifier or validating against
its own output. Six producer/alignment checks pass (14.66 seconds), and both
paint semantic/replay checks pass (6.17 seconds). Combined pending sheet scope
is 17 groups / 279 occurrences: constraints, flow and paint. Accepted canonical
unresolved count remains 1,595; 1,578 is only a projection, not an accepted result.
Next: extend the existing canonical conservation comparator for this combined
batch against accepted commit `9b0ec36`, then perform one batched cold export and
source-fingerprint reconciliation. No renderer or comparison fixture changed;
no full export or browser recapture was run for this wiring increment. Broader
overlay, typography/control, input-equivalence coverage and final gates remain
open. Older preparation notes below describe their chronological checkpoints.

Accepted canonical commit: `9b0ec36`, pushed to
`codex/material-audit-alignment-integration`. New focused bottom-sheet proof
`proveBottomSheetPanelConstraints` authenticates all 25 original owner captures
and binds eight unresolved groups / 149 occurrences. Native responsive min/max
width, 80vh max-height, border-box and automatic X/Y overflow are explicit
requests; candidate owner rules replace sizing with fixed width/height plus a
max-960px width override and omit those six properties in all captured stages.
The compact native max-width:none case is deliberately excluded from attribution
because it is an initial value, not an explicit request. Minimum-height is also
outside this proof. Six negative controls reject candidate resolved/default
substitution, inline or rule constraints, native overrides and breakpoint drift.
The focused check passes (4.01 seconds). This is authoring evidence, not measured
candidate used layout, functional scrolling proof or a new core diagnosis.
Canonical unresolved count remains 1,595; this proof is not wired into the
producer yet. Its two source fingerprints must be reconciled at the next batched
export, not treated as matching the accepted package after this preparation edit.
Neighboring transition checks exposed a moving-index assumption after the last
integration: the panel test found zero unresolved rows rather than its expected
six because those rows had already been attributed. Dialog transition tests and
the new sheet population check now use the authenticated `ed35a9c` compact
predecessor, preserving all original assertions and mutation controls. The five
focused sheet/action/panel tests pass in 14.81 seconds with no skips. This is a
test-input provenance correction, not a classification waiver.

Bottom-sheet classification preparation now reuses `applyModalBoxReview` rather
than adding another review pipeline. `applyBottomSheetPanelConstraints` binds
the eight groups / 149 occurrences; `validateBottomSheetPanelConstraints`
independently replays from the original rows and owner inputs. Tests conserve
raw fields and missing candidate values, leave compact max-width:none untouched,
and reject removed/duplicate rows or cases, invented defaults, forged native
requests and prior metadata. Promoting the compact initial-value row to the
explicit-request population is rejected too. Six focused sheet/dialog checks
pass in 18.56 seconds. Producer wiring and batched canonical reconciliation are
still pending; no export or browser recapture was launched for this preparation.

The eight-group sheet replay is now wired into the producer's bound-original-
capture branch and independent original-row validator. The unbound guard rejects
its attribution without capture provenance. Existing exact producer restoration
and import guards admit only this addition; negative controls reject bypassing
the classifier or replaying against its own output. Six producer/alignment checks
pass in 14.52 seconds, and three sheet/dialog classification checks pass in 9.55
seconds. Canonical integration is still pending (expected eight fewer unresolved
groups only after full conservation); no full export was run for wiring alone.
Next coherent panel question: native block/list flow with 8px vertical padding
versus candidate column-flex/direct-button flow with 16px vertical padding.
The current index retains display, flex-direction, padding-top and padding-bottom
groups across 25 states each. Trace their explicit owner/child requests before
deciding attribution; do not infer flow equivalence from matching outer height.

That flow question is now proved across all 25 original paired owners:
`proveBottomSheetPanelFlow` verifies a native block container with 8px vertical
padding, a single block `mat-nav-list` child with another 8px vertical padding,
and two href="#" anchor children. Candidate has 16px panel padding and a
column-flex owner with two direct value buttons. All three captured candidate
style stages agree. This explains the relocation of spacing while preserving
the unequal owner/child requests; it is not proof of actual candidate layout,
scrolling or semantic equivalence. Native computed flex-direction:row is inactive
on the block owner, not evidence of a horizontal native arrangement. Four
unresolved scalar groups / 100 occurrences are joined exactly (display,
flex-direction and vertical padding). Five negative controls reject altered
list padding, child ownership/type, candidate longhand overrides and flex-flow.
The flow proof, constraint proof and constraint replay pass 3/3 in 11.66 seconds.
Flow attribution is not wired yet; batch export and source reconciliation remain
pending. Reuse `fixture-bottom-sheet-list-structure-and-token-substitution`, not
a duplicate source finding. No renderer or fixture changed.

Flow attribution is now wired into the same bound-original producer branch and
independent replay, using the existing modal classification helper. Combined
sheet preparation covers **12 groups / 249 occurrences** (eight constraint groups
plus four flow groups), with unchanged raw rows and separate attributions. Six
sheet/dialog semantic and composition checks pass in 19.74 seconds; six existing
source-transition/alignment checks pass in 16.39 seconds. Source guards reject
bypassed flow classification and self-validating replay. The current canonical
count is still 1,595; 1,583 is only the projected count if this batch integrates
without other changes. No full export was run for this wiring increment.
Continue gathering the adjacent panel paint/theme evidence before the next
expensive export: the compact index retains four top-corner radius groups (24
occurrences) and one dark-background group (six occurrences). Check native token
resolution against candidate theme scaling rather than assuming either side's
theme matches. Existing full final acceptance and all other coverage remain open.

Paint check now authenticates all 25 original panel pairs and exactly joins those
five groups / 30 occurrences. Native desktop radius remains 28px in every
profile; its explicit request is `var(--mat-bottom-sheet-container-shape, 28px)`.
Candidate owner authoring and all three stages use 21px in contrast and 42px in
custom, with the preserved compact zero-radius override. Native background stays
rgb(248,242,246), including six dark states, while candidate directly authors
#211f26 there. The native background var expression is present in captured
cssText but expanded background-color has an empty CSSOM value; neither that
empty value nor a capture-root null parent establishes token provenance.
The focused paint check passes (2.79 seconds) without changing classifications.
Source inspection places reference theme bindings on `.frame` and the base
Material theme on `html`; the existing overlay-root-context proof establishes
why frame-local values cannot simply be assigned to a sibling overlay. Reuse
retained external-ancestor evidence next to distinguish actual token ancestry
from a capture limitation. Do not label this a renderer color/radius defect or
claim that the two sides received the same dark/custom theme inputs.

Retained supplemental ancestry is applicable and authenticated by the existing
`collectOverlayAncestorContextSurvey`: all 48 static case records / 96 samples,
capture source hashes and frozen served assets replay successfully. Its 12
bottom-sheet real-click samples cover four profiles at desktop/tablet/mobile.
Overlay ancestry is div/body/html, outside the frame. All three ancestors retain
`--mat-sys-surface-container-low:light-dark(#f8f2f6, #1d1b1e)`, color-scheme:normal,
and the general extra-large corner token 28px. Contrast/custom frame tokens alone
are 21px/42px. Component-specific sheet shape/background tokens are not enumerated
in these computed snapshots; that absence is preserved rather than assigned a
guessed value. Five ancestry tests pass in 1.46 seconds, including stale-source,
changed-runtime, missing-coverage and altered-ancestry rejection. No recapture.

Keep the two input mismatches distinct: native sheet radius references its own
component shape token with literal 28px fallback, not the general corner token
scaled by candidate authoring. Native retained surface token's dark branch is
#1d1b1e, whereas candidate directly authors #211f26. Moving reference theme scope
alone therefore would not make these requests equivalent. This supports a
benchmark authoring/theme-contract investigation, not a renderer paint defect.
Supplemental activation is not original interaction replay; do not generalize its
complete ancestry to every original DPR/state. Next attribution should bind the
original five paint groups to their explicit differing requests while retaining
this supplemental-only provenance limit and the distinction between component
tokens, general tokens and actual scheme selection. Canonical count is unchanged.

The five original paint groups / 30 observations now have a reusable semantic
proof and attribution replay in the existing modal module. It checks all possibly
applicable candidate paint rules, native owner declarations and cssText, empty
expanded CSSOM values, profile-specific literals and all three candidate stages.
`applyBottomSheetPanelPaint` / `validateBottomSheetPanelPaint` preserve raw rows
and independently reconstruct the classification from original owner inputs.
Negative controls reject changed var expressions, invented native/candidate
resolved colors, candidate literal substitutions, missing/duplicate cases or
rows, forged prior metadata and claims to have reconstructed original token
ancestry. Both paint checks pass in 7.07 seconds. Supplemental ancestry is not
fed into this original-state proof. These are benchmark theme/token authoring
differences, not confirmed renderer paint faults. Producer wiring remains next;
combined preparation is 17 sheet groups / 279 occurrences, while canonical
unresolved stays 1,595 until a verified batch export.

Current canonical milestone: modal sizing export from `01fab20`, independently
reconciled against `ed35a9c`: **1,595 unresolved groups**, 8,483 scalar groups /
389,202 occurrences, 133 source findings. Coverage remains 436/436 static and
1,875/1,875 interactive captures. This is attribution progress, not equal-input
or rendered-parity acceptance. Renderer and comparison fixtures are unchanged.

The cold export completed in 1,870.156 seconds, exit 1 solely for the 1,595
unresolved groups. Its session reverified 1,205 files / 89,149,474 bytes with no
invalidated dependencies. Export session 43247 / PID 20816 is now terminal.
Independent `--modal-box` conservation passes: precisely 12 groups / 384
occurrences change, all raw scalar evidence and 8,471 other complete rows stay
unchanged; only 48 control producer receipts change. Section reconciliation
preserves 71 of 79 sections, with no additions/removals. The eight changed
sections are source fingerprints, summary, discrepancies, source findings,
control typography, control line boxes and the two producer-binding sections.
All 452 source fingerprints match disk; eight expected source hashes update,
none are added/removed. All 132 prior source findings remain identical and in
order, with only `fixture-dialog-sampled-panel-and-action-geometry` inserted.
The 55 remaining metadata leaf changes are four summary counts, three binding
receipts and 48 line-box producer receipts; the motion report hash was
independently reconstructed from its preserved source plus the producer receipt.

Evidence under `artifacts/material-parity/`: `modal-sizing-01fab20-progress.log`,
`modal-sizing-conservation-01fab20.json`, `modal-sizing-sections-01fab20.json`,
`modal-sizing-metadata-sources-01fab20.json`, and `modal-sizing-receipts-01fab20.json`.
Canonical compressed SHA-256 is
`78ed94a2e6c8ff322a344cfdd583f3aa65a94cf94d3c2f944b1de0c0a6807161`;
decoded SHA-256 is
`70918584660365c90dc8de69532c56304423283090175e3849b55c5224a19e4a`.
Compact import and verification both pass: 8,483 discrepancies, 133 source
findings, 39,904 control differences, 389,202 occurrences and 1,595 unresolved
groups. Compact shards total 69,724,909 bytes. No second import or full browser
recapture was needed for this metadata-only integration.
Next: bind the remaining
bottom-sheet responsive constraint and overflow rows to the existing fixed-size
source finding and original 25 owner captures. History `8505c3b` is reconfirmed;
do not duplicate the existing source finding or rerun its intrinsic-size proof.
Other families and full final canonical/browser acceptance remain outstanding.

The following preparation entries describe the predecessor milestone and are
historical, including their live-process and pending-export statements.
Predecessor canonical checkpoint: `ed35a9c` (1,607 unresolved groups). New focused
evidence, not yet canonically attributed: `proveDialogActionBoxSubstitution` in
`tests/material-parity/modal-position-inspection.mjs` proves six dialog-actions
input differences across all 32 original states (192 scalar occurrences).
Native border-box height 73px with a 1px top border and 16px vertical padding
places the CSS content interval at [17,57]; candidate 73px with no border and
16px top / 17px bottom padding implies [16,56]. Both content heights are 40px;
equal outer height therefore does not establish equivalent content placement.
Wrapping, shrink and minimum-height differences are recorded separately.
This is an authored CSS-contract calculation, not measured candidate layout or
a confirmed core/raster defect. Four mutation controls reject changed native
border, candidate resolved padding, authored rule padding and inline overrides.
The focused dialog-box, dialog-typography and sheet-typography tests pass 3/3
(17.98 seconds). No renderer or fixture edits. History `bc0e449` was rechecked:
it introduced the asymmetric padding while matching dialog geometry.

Dialog panel follow-up now proves a hidden equal-scalar input mismatch across
all 32 original states: native computed width/height are 280px/161px, but the
surface requests 100%/100% and explicit `inherit` for all four min/max size
constraints. Candidate `.dialog-panel` directly authors 280px/161px and omits
those constraints in all three captured style stages. Native min/max width and
max-height resolve to 280px/560px/100%. The focused `dialog panel equal captured`
test passes (2.98 seconds); hashes and existing owner mapping authenticate each
paired tree. Matching width/height scalar values therefore conceal unequal
authoring and must not be counted as input-equivalence evidence. This adds no
new renderer diagnosis. Reuse the existing intrinsic-percentage and explicit-
inheritance public reductions documented below; their applicability is the
same requested mechanisms, not proof of their contribution to every modal pixel.
Implementation order remains: fix those general core rules, then restore the
reference constraints and remove sampled dimensions; do not tune fixture sizes.

The six action-box groups are now wired into the existing producer under its
bound-original-capture gate. `applyDialogActionBox` matches complete scalar
populations and checks owner proofs; `validateDialogActionBox` replays from
independently reconstructed original rows, never from saved prior metadata.
Focused tests prove six groups / 192 occurrences, unchanged raw fields and
unrelated row identity, and reject removed/duplicate cases or classifications,
forged content intervals and prior metadata. Modal focused checks pass 3/3
(7.37 seconds), existing alignment/source conservation checks pass 5/5
(13.63 seconds), and exact producer-transition checks pass 1/1. The latter
reject bypassed action classification and self-validating replay. No full export
was run for this wiring change, and canonical unresolved count remains 1,607.

The existing source-finding registry now includes
`fixture-dialog-sampled-panel-and-action-geometry`, matching the two actual
`.dialog-panel` / `.dialog-actions` authored rules and identifying `bc0e449`.
It records the equal-scalar/unequal-request panel case and the action-box
substitution without declaring candidate used layout or core causality proven.
The existing focused panel test verifies both current source locations alongside
all 32 authenticated original owner captures. The three modal sizing/action
checks pass (8.55 seconds). This adds one source finding to the next export;
the accepted canonical package still contains 132 source findings.

Panel constraint attribution is now wired too: four explicit native inherited
min/max constraints, explicit border-box, and zero flex shrink differ from the
candidate's five omissions and default shrink one. All 32 states are proved,
six additional groups / 192 occurrences. `applyModalBoxReview` shares complete
population selection, owner-tree adaptation, scalar matching and original-row
receipts between action and panel checks; semantic proofs remain separate.
`validateDialogPanelConstraints` independently reconstructs expected rows and
rejects missing/duplicate classifications, substituted defaults, forged native
inherit requests and candidate authored constraints. No omission becomes null
or a default. Four modal focused tests pass (10.97 seconds); six existing
producer/alignment conservation tests pass (14.46 seconds).

Combined modal sizing cold export is now live: exec session `43247`, Node PID
`20816`, log `artifacts/material-parity/modal-sizing-01fab20-progress.log`.
It uses the exact five-input command below, with both COLD and PROGRESS enabled.
The process and command line were checked; log reached build-audit. Keep export
dependencies frozen and poll this handle rather than starting another run.
Read-only next-question check during the export: all 25 original bottom-sheet
panel tree pairs were hash-authenticated (24 desktop states, one comparison-pane
state). Native `max-height:80vh` computes to 800px/640px; native min-width is
512px/900px and max-width 1184px/none respectively. Native overflow X/Y is auto
and box-sizing border-box. Candidate normal/resolved/interaction stages retain
height 128px and width 512px/100%, with min/max width, max-height, box-sizing and
all overflow keys omitted. The active desktop `.mat-bottom-sheet-container-large`
rule supplies `min-width:512px; max-width:calc(-256px + 100vw)`; the compact
reference retains the base `min-width:100vw`. This identifies the next responsive
constraint/scroll authoring question, not a new core diagnosis or canonical
classification. Reuse the existing equivalent-input sheet intrinsic-size proof;
do not recapture it merely to establish these omitted declarations. No export
dependency changed for this read-only check. Export PID 20816 remained live with
CPU increasing from 84.98 to 126.64 seconds during inspection.
This milestone covers 12 groups / 384 occurrences plus one new source finding.
The predecessor package hash was verified and its small manifest copied alongside
the retained compact payload; no duplicate payload was created. Start from accepted
`ed35a9c` and compact generation `064777d79c6b85219285c85b97fb38edac27d069c8ddec67e0ae2da5b61099e5`.
Expected unresolved count is 1,595 only if full replay and conservation pass;
accepted count remains 1,607. Reuse full original inventory order and JSON
persistence-boundary comparison learned in the preceding milestone. Preserve
the five required export inputs above; do not rerun the obsolete 24-group
`--modal` gate as if it were the new 12-group batch. The existing comparator now
supports `node scripts/check-material-position-canonical-conservation.mjs --modal-box`:
it independently replays the 12 groups from the retained predecessor/original
capture, checks all raw scalar inputs and complete rows, and permits only 48
control producer receipts. All seven comparator tests pass (11.50 seconds).
After export completion run that gate, reconcile section/source/source-finding
changes (one deliberate new source finding, no lost prior findings), import and
verify the compact index, then commit the canonical increment. Current accepted
counts are not updated until those checks pass. Only the standalone comparator,
its test and this ledger changed during the export; they are not export dependencies.
The helper, producer and narrow source guards now differ from the accepted checkpoint's
source fingerprints; those are deliberate pending evidence changes, not current
canonical source reconciliation. Do not rebuild the full export for this proof alone.

Combined dialog/sheet export session `89157` / PID `21480` is terminal: exit 1
after 1,802.040 seconds. It reached 1,607 unresolved groups but is REJECTED:
the invocation omitted all four supplemental/line-box options, producing missing
coverage and 791 unattributed control differences. This was an invocation error,
not lost source evidence. Failed JSON/gzip/Markdown are retained under
`artifacts/material-parity/modal-typography-export-20edff9-missing-options`;
the original progress log remains. The accepted canonical files were restored.

Corrected cold export session `24111` / PID `11708` is terminal: exit 1,
reporting only 1,607 unresolved scalar groups. Coverage remains 436/436 static
and 1,875/1,875 interaction entries, with 8,483 differences / 389,202 occurrences
and 132 source findings. Log:
`artifacts/material-parity/modal-typography-export-20edff9-complete-inputs.log`.
Evidence-session completion verified 1,205 reads / 89,149,474 bytes with no
invalidations. This is a conserved classification increment, not audit completion.
The independent `--modal` conservation check session `66976` failed exact
expected-row equality; diagnostic replay `4560` identified row 473,
bottom-sheet-copy/letterSpacing, reviewEvidence only, with identical serialized
contents. In-memory proofs carry `astylar: undefined`; decoded JSON omits it.
The comparator now serializes the independently replayed modal expectations at
this persistence boundary, matching the production validator. Raw predecessor /
current scalar preservation remains direct and strict. All six focused tests
pass, including rejection of null, zero, empty-string and default substitutions
for omission. The diagnostic failure is retained in
`artifacts/material-parity/modal-typography-conservation-20edff9-error.log`.
Replay `50286` then identified a dialog-cancel/fontFamily proof-hash mismatch.
Decisive check: collecting the original 2,311-case inventory rather than only
modal cases reproduces the exported hash exactly
(`da5a4f15f601c4197b3f8c9d243a4902b2740555a4ab36f07683b413a9bc1304`,
32 proofs, no inventory errors). Proof nodes retain global style/rule indices;
the subset inventory renumbered them. The comparator now preserves original
inventory ordering while replaying only modal semantics. Six focused tests pass.
Full corrected replay session `81663` passed (exit 0), writing
`artifacts/material-parity/modal-typography-conservation-20edff9-full-inventory.json`
and its corresponding empty error log. Exactly 24 groups / 588 occurrences
changed, 8,459 complete rows are unchanged, and all other control evidence is
conserved except the 48 permitted producer receipts. Earlier diagnostic logs
remain retained.
Section reconciliation `22121` and metadata/source reconciliation `56207` pass:
72/79 sections unchanged, none added/removed; all 452 source fingerprints match
disk (two added dependencies, five changed, none removed). The remaining metadata
changes are three classification summary counts, 48 line-box producer receipts,
and three source-binding receipts. The motion-report hash is reconstructed by
changing only its producer receipt. Evidence: `modal-typography-sections-20edff9.json`,
`modal-typography-metadata-sources-20edff9.json`, and
`modal-typography-receipts-20edff9.json` under `artifacts/material-parity`.
Compact import `79212` and `node scripts/audit-findings-store.mjs verify` pass:
8,483 discrepancies, 132 source findings, 39,904 control differences, 389,202
occurrences, 1,607 unresolved groups. Compact shards total 69,703,206 bytes;
index SHA-256 `7e3141128b5728007cf478b5d37b7820ac6a9cd56d34e0242d4f10842ce4e745`.
This bounded canonical increment is verified. All export/conservation jobs are
terminal. All five export input paths were
checked before launch. Exact export command:

```powershell
$env:ASTYLAR_AUDIT_COLD='1'
$env:ASTYLAR_AUDIT_PROGRESS='1'
node --max-old-space-size=8192 scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
```

These are required explicit inputs, not CLI defaults. The predecessor payload is already
retained in compact generation `4601de6aeedf0595894e22de28052ee989a163320af4464337a69302c3a04aa2`;
its compressed hash was checked and its small manifest copied alongside it for
streaming conservation, without copying the payload again. The existing position
conservation comparator's `--modal` mode independently replayed
the combined 24-group / 588-occurrence batch independently from the pinned
original capture and retained predecessor. It checks raw scalar preservation,
all complete rows, and the 48 permitted control producer receipts. Comparator
tests pass 6/6; actual canonical conservation passes.
The old `--overlay` mode is not the correct gate for this new batch. Only the
standalone comparator, its test and this ledger changed while the export ran;
none is an export evidence dependency.

Modal question identified during the export (now covered by the focused proof above): the
`dialog-actions` 17px bottom padding is not an equivalent serialization of the
native 1px top border. All 32 hash-authenticated owner captures in
`docs/material-modal-position-inspection.json` agree: native height 73px,
border-box, 16px top/bottom padding and 1px solid transparent top border;
candidate height 73px, border-box, `padding: 16px 24px 17px`, `borderWidth: 0`,
`borderStyle: none` in normal/resolved/interaction stages. The native also uses
`flex-wrap: wrap`, `flex-shrink: 0`, `min-height: 52px`; candidate stages use
nowrap/shrink 1 and omit min-height. Source commit `bc0e449` introduced the
fixed action geometry and asymmetric padding (`fix(material): match dialog
content geometry`). This establishes historical unequal authoring, not a core
cause or output-equivalence claim. Existing owner mappings now prove these
scalar inputs without new captures. Canonical attribution has not changed for
these six groups.

Current package hashes: compressed
`064777d79c6b85219285c85b97fb38edac27d069c8ddec67e0ae2da5b61099e5`;
decoded `11bfe85672fb9a1a87db562d68b4eb1a2d6adb4349a55dc5ecb92675f230980a`.
Source/export reconciliation passed for the combined dialog/sheet milestone at `ed35a9c`.
Do not rerun the full export for each preparation edit. There remain 1,607
unresolved groups; full audit acceptance and the final browser gates remain open.

### Predecessor overlay checkpoint (historical)

The overlay batch is integrated and conserved. Cold export at `55d9945`
completed in 2,088.454 seconds; exit 1 reports only **1,631 unresolved scalar
groups** (previously 1,644), not a source-binding failure. All 8,483 differences,
389,202 occurrences, 132 source findings, 39,904 control differences and
436/436 static / 1,875/1,875 interaction inventory entries remain accounted for.
This is bounded classification progress, not complete input or output acceptance.

- `node scripts/check-material-position-canonical-conservation.mjs --overlay`
  passes: exactly 13 groups / 344 occurrences change; 8,470 complete rows and
  all other control evidence are unchanged except 48 authenticated producer receipts.
- Of 78 predecessor sections, 71 are unchanged, seven change, and one overlay
  binding section is added. The other metadata changes are exactly 48 line-box
  producer receipts, three summary counts and three source-conservation receipts.
  The motion report hash is independently reconstructed by replacing only its
  producer receipt. No original capture or reference input changed.
- All 450 current source fingerprints match disk: three added dependencies,
  seven reviewed producer/guard changes, no removed or reordered prior entries.
- Compressed package SHA-256:
  `4601de6aeedf0595894e22de28052ee989a163320af4464337a69302c3a04aa2`;
  decoded SHA-256:
  `4ad34a695e2268a96a505d86af93bd396d897a5d996dd6dbf28b67a3199fb291`.
  Compact import and `node scripts/audit-findings-store.mjs verify` pass;
  index SHA-256 `028f8a938c925bf868926e43253d46199ad0d66c82e7bf60bc1222a6cfa13cde`.
- Evidence under `artifacts/material-parity/`: `overlay-surface-export-55d9945-progress.log`,
  `overlay-surface-conservation-55d9945.json`, `overlay-surface-sections-55d9945.json`,
  `overlay-surface-sources-55d9945.json`, `overlay-surface-metadata-55d9945.json`,
  and `overlay-surface-receipts-55d9945.json`. All associated jobs are terminal.

Next: integrate the independently established dialog/sheet typography evidence
as a coherent later batch, preserving the owner/stage distinctions below.
The sheet proof now consumes the existing indexed inventory through a pure
storage adapter, reusing one tree view per case. All 300 typography observations
(15 scalar groups across 25 states) retain the exact container/anchor declaration
and ancestry checks; all 75 owner mappings match the authenticated original-tree
position proof. Invalid inventory diagnostics, forged style-side ownership, and
changed panel width are rejected. Combined sheet/dialog focused tests pass 2/2
in 8.671 seconds. The semantic checks now live in the existing shared module;
production classification and independent original-case replay are wired under
the original-capture binding. Focused replay changes exactly 15 sheet groups /
300 occurrences, preserving raw values and unrelated rows. Missing/duplicate
classifications, forged observations/prior metadata, and altered case populations
are rejected. Sheet/dialog focused tests pass 2/2 in 15.105 seconds; five
alignment preservation checks pass, and the exact producer-boundary check passes
after updating its source-binding negative control for the combined call.
Together with dialog this prepares 24 groups / 588 occurrences. Canonical
classification remains at the accepted checkpoint until the combined export
and conservation checks; 1,607 unresolved is an expectation, not a verified
canonical count. No capture, renderer, or reference input changed.
Remaining high-impact families include dialog (216), bottom-sheet (182), tabs
(114), chips (104), slider (77), snackbar (69) and tooltip (37). Counts describe
unresolved signatures, not independent bugs. Final complete canonical and browser
acceptance remain pending; no browser recapture was needed for metadata integration.

Dialog title reuse boundary closed for font-family and color: the existing
typography proof identifies the native heading and the candidate title span's
direct `h2` parent in all 32 states. Exact scalar values, omitted local font
declarations, explicit parent color and inherited label values are checked;
an altered parent link is rejected. The focused `nine dialog scalar` test passes
(2.474 seconds), extending seven groups / 224 occurrences to nine / 288 without
new captures or a new collector. Title tracking remains unresolved: there is no
matching retained difference proof, so the owner mapping alone does not classify
it. Follow-up now explains that absence across all 32 states: scalar tracking
compares normalized native computed `0` with an omitted candidate local value;
retained tracking has reference/retained `0` with both normal/effective fields
undefined. The exact fields are preserved in the test (2.525 seconds), together
with title-label parent checks. Equal retained tracking is not proof of token
input equivalence or raster output. Canonical attribution is unchanged pending
a later coherent batch.

Integration preparation: `proveDialogScalarTypographyJoin` now lives in the
existing `modal-position-inspection.mjs`, moved out of the test's local join.
It consumes already-collected inventory/control/retained evidence; it performs
no file reads or normalization and restricts reuse to the nine proven pairs.
The build already has these inputs before scalar attribution, so no new capture
collector or report/binding layer is required for that join. The original
negative checks plus forged-attribution rejection pass. Combined dialog/sheet
focused checks pass 2/2 in 5.600 seconds. Canonical classifications are unchanged;
production application and validation of this later batch remain pending.

The same module now has `applyDialogScalarTypography`: it selects the complete
scalar population from the supplied cases with the existing authenticated audit
normalizer, then invokes the semantic join. Focused replay changes exactly nine
groups / 288 occurrences, preserves all unrelated row identities and raw fields,
and restores every changed row from recorded prior metadata. Missing/duplicate
states and changed candidate font input are rejected. In-memory `astylar:
undefined` and JSON's omitted key both represent omission, not a computed default;
both forms are tested. The focused test passes in 2.662 seconds. This helper is
now wired into the production builder only when original-case binding is valid.
Validation reuses the existing independently loaded original cases and scalar
replay, not saved prior metadata; missing/duplicate classifications and forged
proof/prior-metadata receipts are rejected. The canonical unresolved count remains
1,631 until the next export. No additional report, collector or capture was added.
Focused proof passes (3.092 seconds); six source-preservation checks pass
(14.350 seconds). Additional exact-integration negative controls pass (0.615 s)
and the historical mapping projection passes (6.533 s). Retained functions and
normalization remain unchanged. Next: finish the sheet portion, then run one
combined canonical conservation milestone rather than exporting this nine-row
portion separately.

Bottom-sheet ownership check: the focused `bottom-sheet scalar typography`
test authenticates 25 retained states and joins 15 scalar groups / 300 occurrences
for the panel and two item anchors. Native font, line-height, tracking and color
originate at `.mat-bottom-sheet-container`; the anchors inherit them. Earlier
inner-list-label typography proofs therefore cannot classify these scalar owners
by value equality alone. Candidate line-height/tracking requests are absent across
the mapped ancestry, including inline style strings and possibly matching rules.
The same proof now checks exact candidate font/color declarations across all
typed mapped ancestors and all three resolved stages: button fonts come from
`button, input, select`, panel fonts are locally omitted with a page-level font
stack, and panel/options explicitly substitute `#1d1b20` (19 states) or
`#e6e1e5` (six dark states). The native container token resolves to
`rgb(29, 27, 30)` in these retained states. This establishes unequal color inputs,
not a renderer color defect. Font fallback equivalence/token dependency and
canonical integration remain pending; local font omission must not be mistaken
for absence of an inherited font.
Command: `node --test --test-name-pattern="bottom-sheet scalar typography" tests/material-parity/modal-position-inspection.spec.mjs`;
1/1 passes (3.081 seconds test time). No renderer or capture changes. Next: use
these exact container-token owners when classifying the remaining sheet rows,
rather than transferring the existing inner-label attribution.

## Prior integration history (superseded by the current checkpoint above)

Resume from the existing evidence, using [the incremental workflow](audit-workflow.md).
The canonical package with decoded SHA-256
`276bcd838575bcce26f06ab922eeacd880152c3585dee929f4635c778338767e`
contains **1,644 unresolved scalar signatures**, not that many confirmed bugs.
The compact index preserves all 8,483 differences / 389,202 occurrences and
132 source findings. Static/interaction inventory is 436/436 and 1,875/1,875;
inventory completeness is not attribution or rendering acceptance.

Current integration result: the cold chip export at `73e0d58` completed in
1,921.086 seconds. Exit 1 reports only the 1,644 remaining attribution gaps;
the four earlier source-binding errors are cleared. This is an accepted bounded
classification integration, NOT complete audit acceptance or output parity.
Compressed SHA-256:
`d70aa37e4e14a9bfdc6183e0c2a7c383638d83050fc76b2d556a26b510691fa4`.

- Complete conservation passes: ten chip groups / 32 occurrences classified as
  application/plugin authoring defects; 8,473 other complete rows unchanged.
  Exactly 48 control producer receipts change, with all other control evidence
  conserved. Command: `node scripts/check-material-position-canonical-conservation.mjs --chip`.
- Of 77 predecessor sections, 70 are unchanged, seven change and one chip-input
  section is added. All 54 remaining metadata leaf changes are accounted for:
  48 line-box receipts, three summary counts, three source-conservation receipts.
  Both motion-report hashes were independently reconstructed by substituting
  only the authenticated producer receipt in the preserved motion report.
- Source inventory retains ordering and all old entries; five chip dependencies
  are added and seven reviewed integration/guard receipts update. All 447
  current fingerprints independently match disk. No reference capture changed.
- Evidence: `artifacts/material-parity/chip-paint-export-73e0d58-progress.log`,
  `chip-paint-conservation-73e0d58.json`, `chip-paint-sections-73e0d58.json`, and
  `chip-paint-metadata-73e0d58.json` in the same artifact directory.
- The exporter revalidated 1,205 files / 89,149,474 bytes in its evidence session
  (two collectors, ten memory hits, no disk hits). This does not imply all
  collectors are cached. Final full canonical/browser acceptance remains pending.

Resume verification: the compact index now authenticates to the current package;
`node scripts/audit-findings-store.mjs verify` passes with 8,483 discrepancies,
132 source findings, 39,904 control differences and 1,644 unresolved groups.
The focused `chip paint proposal binds` test passes after that index transition
(47.721 seconds), replaying the explicitly pinned historical predecessor.

Next priorities, from the refreshed unresolved index: dialog (216 groups),
bottom-sheet (182), snack-bar (77) and tooltip (42) share overlay ownership and
intrinsic-size questions but must not be assumed to share every cause. Integrate
the already-proven snackbar authoring and tooltip constraint omissions as a
coherent batch, then investigate remaining overlay typography/constraints at the
first divergent stage. Reuse the existing intrinsic-percentage and inheritance
proofs; do not repeat total-absence or large-displacement investigations against
captures that already disprove those symptoms. Tabs (114), chips (104), and
slider (77) remain explicit subsequent coverage, not waived by overlay priority.

Overlay batch preparation: snackbar surface declaration evidence now joins all
eight complete canonical rows (272 occurrences) to the 34 authenticated paired
states. The join checks exact scalar values, omitted-value presence, counts,
representative ordering and all state names. Candidate inline declarations,
possibly matching competing rules, shorthand/reset and motion requests are
excluded before attributing the `.snack-surface` substitution. The focused test
passes in 14.074 seconds. This closes the row-membership gap; it does not change
canonical classifications or establish renderer correctness. Together with the
existing five tooltip constraint rows (72 occurrences), this defines a pending
13-group / 344-occurrence authoring batch. Reuse these tests for integration;
no new browser capture or full export is justified for this proof-only change.
Combined verification: `node --test tests/material-parity/modal-position-inspection.spec.mjs tests/material-parity/tooltip-position-composition.spec.mjs`
passes all 13 checks in 25.641 seconds, including existing mapping/constraint
negative controls and retained raster evidence. Canonical unresolved count stays
1,644 until the pending classification batch is integrated and conserved.

The combined proposal is now saved in `docs/material-overlay-surface-review.json`.
`tests/material-parity/overlay-surface-review.mjs` reuses the exact snackbar and
tooltip semantic checks moved from their existing test files; it pins the
post-chip predecessor/index and authenticates every paired tree and selected
complete row. No new capture or alternative reference is used. Eight snackbar
surface substitutions and five tooltip constraint omissions are proposed as
application/plugin authoring defects, explicitly not confirmed rendering causes.
`node tests/material-parity/overlay-surface-review.mjs --export` produces 13 groups
/ 344 observations. The existing two suites still pass all 13 prior checks after
extraction (25.731 seconds). The added `overlay surface proposal replays` check
passes in 46.489 seconds: saved proposal equals fresh source replay, all selected
rows restore exactly, unrelated row identity survives, and missing/duplicate/
changed predecessors, double application, competing inline/state rules and
unknown-selector resets are rejected. Next integration step: bind this proposal
to the production capture and apply its metadata after the chip transition,
reconcile exact producer/source guards, then perform one conserved batch export.
Canonical files remain unchanged; do not count these 13 groups as integrated yet.

Production integration is wired after the chip transition through
`overlay-surface-audit-source-binding.mjs`. The adapter authenticates the pinned
capture/proposal/source receipts, independently replays all 52 paired states,
and verifies group membership before application. Focused replay/binding passes
in 65.118 seconds, including foreign/incomplete capture and forged review
rejection. Exact producer/import guards pass (six tests in 19.350 seconds;
historical mapping guard in 9.389 seconds). The existing conservation CLI now
supports `--overlay`: 13 reviewed rows / 344 occurrences plus exactly 48 producer
receipt updates, every other row/control field unchanged. Its five synthetic
positive/negative tests pass in 6.920 seconds. The predecessor is the existing
compact generation `d70aa37e4e14a9bfdc6183e0c2a7c383638d83050fc76b2d556a26b510691fa4`;
only a small manifest was added beside its already-authenticated package.
No canonical export or acceptance is implied by these preparation checks.
Direct preflight collectors all bind successfully to the original capture:
alignment-font 72 groups / 4,016 observations (31.842 s), text-align 49 / 2,677
(31.585 s), LTR 4 / 178 (30.323 s), reviewed-source batch 146 / 6,295 (51.426 s).
The next required milestone is a cold export with the five explicit pinned
inputs and a 4096 MiB Node heap, followed by `--overlay` conservation and section/
source checks. Do not rerun the completed chip integration or overwrite its
predecessor. Full renderer/browser acceptance remains pending until audit completion.

That export was started at `55d9945`: session 6688, Node PID 15056, log
`artifacts/material-parity/overlay-surface-export-55d9945-progress.log`. The same
handle/process was confirmed live during follow-up, still in `build-audit`.
Poll this run, do not restart it because a poll produces no new output. Its
producer and capture dependencies remain unchanged. Terminal result and full
conservation are still required before accepting the 13 classifications.

Read-only next-question triage found existing reviewed typography evidence for
seven still-unresolved dialog scalar groups: `dialog-copy` fontFamily,
letterSpacing and color; `dialog-cancel` and `dialog-save` fontFamily and
letterSpacing. All seven match the same 32 ordered cases in the hash-bound
position population and the compact retained/control evidence (224 observations).
The ordered join of scalar-row and reviewed-observation hashes is
`5316ab015696ed9b38fc4e954e2709ae3ad0b77fd52a1b1517505693b316d88c`
against compact generation `d70aa37e4e14a9bfdc6183e0c2a7c383638d83050fc76b2d556a26b510691fa4`.
This establishes population correspondence only. Next inspect/reuse the existing
`reviewedDialogTextMetric`, `reviewedDialogTextInk` and
`reviewedDialogActionPaintInput` proofs to bind scalar declaration values without
re-investigating token omissions. Title evidence uses `dialog-title-label`, not
the scalar `dialog-title` owner, so those rows require an explicit parent/child
mapping proof and must not be swept into this join. No classifications changed.
An unnecessary repeated full-payload sample reader was stopped (PID 21748);
compact joins answered this triage question without serially parsing the 2 GB
payload three times. Do not restart that reader. Export PID 15056 was untouched.

The seven-group dialog join now has focused executable proof in
`modal-position-inspection.spec.mjs` (`seven dialog scalar groups`). It reuses
`collectFullTreeInventory`, `collectControlTypographyEvidence` and
`collectRetainedTypographyEvidence` on only the original 32 open dialog states:
all original token/ink proofs replay, then exact reference owner, candidate node,
scalar value and normal/effective declaration stages are joined. Missing local
font/tracking declarations stay missing; retained defaults are not substituted.
All seven groups / 224 observations pass; 28 negative joins reject lost/reordered
cases, forged reference values and wrong owners. Command:
`node --test --test-name-pattern="seven dialog scalar groups" tests/material-parity/modal-position-inspection.spec.mjs`
passes in 2.188 seconds (3.355 seconds process elapsed). This proves reuse is
applicable to these scalar authoring discrepancies, not typography output parity.
Title-label/owner rows remain excluded. Keep the seven groups for a later coherent
batch; do not restart the live overlay export or trigger a separate full rebuild
for this test-only increment. The changed test is not an exporter source/input
dependency; producer, binding, proposal and capture files remain untouched.

Historical integration checkpoint: the chip batch at `3a4b350` required cold export
and complete conservation. The first invocation mistakenly selected the default
`latest-report.json`; it terminated after 226.339 seconds with missing-source
binding errors. Its generated files are retained in
`artifacts/material-parity/chip-paint-export-3a4b350-wrong-input`, with log
`chip-paint-export-3a4b350-progress.log`. The canonical baseline was restored and
its compressed SHA-256 verified as
`7793336da954e94fd2f03ff48a92a1d3a174f545532f631baf00df805b80216e`.
The corrected invocation explicitly selects `current-ancestry-audit`, the
normal/control-v3/supplemental line-box reports and supplemental ancestry root;
its log is `chip-paint-export-3a4b350-bound-progress.log`. Do not accept the first
run or restart a live run solely because a polling interval expires.
The corrected run is now terminal: PID 7576 exhausted its 3 GiB heap during
validation at approximately 1,454 seconds, before encoding/writing. Its log
records 2,317,022,008 heap bytes at validation entry and about 3,024 MiB after
the final unsuccessful collection. The canonical gzip still authenticates to
the baseline hash above; no audit Node process remained when checked.
The prior successful `position-followup-export-5c5d5e6-progress.log` recorded
3,613,119,064 heap bytes after validation, already above this failed cap.
The earlier ledger also records a completed export with a 4 GiB cap. Therefore
retry with 4096 MiB, not 3072, using the same explicitly pinned inputs and a new
`chip-paint-export-3a4b350-bound-4gb-progress.log`. At preflight the machine had
6,969,848 KiB physical and 14,708,296 KiB virtual memory free. This corrects an
undersized runtime limit; it does not establish the allocation/retention owner
or prove that repeated full-capture parsing in the chip adapter caused the OOM.
Do not change collector dependencies while that retry is live. Acceptance still
requires terminal results, exact conservation and source-fingerprint checks.
After conservation, keep the chip proposal regression tied to its preserved
pre-classification evidence: its current working-index query expects ten
unresolved rows and cannot be reused unchanged after refreshing that index.

Reconciliation update: the 4 GiB retry is terminal, not running. It completed
serialization after 1,752.678 seconds but failed alignment/font, text-align,
LTR-alignment and reviewed-input source bindings, reporting 1,903 unresolved
groups. Its outputs are preserved in
`artifacts/material-parity/chip-paint-export-3a4b350-binding-failure` and are NOT
canonical. The baseline above was restored and its compressed hash reverified.
Two historical AST-projection guards omitted the exact five-name chip adapter
import added at `3a4b350`. Focused tests reproduced both rejection errors before
the correction. Accept only that exact import; retain all historical statement,
normalization and source-receipt checks. Added alias, extra-member and retained
coupling negative controls to the existing suites. The overlay alias rejection
also exposed an assertion formatter OOM from comparing a parent-linked AST node
with undefined; a boolean assertion preserves rejection without expanding that
graph. The focused command below passes all three tests (11.07 seconds):

`node --test --test-name-pattern="alignment integration permits|audit projection rejects|mapping projection rejects changed retained" tests/material-parity/alignment-survey-conservation.spec.mjs tests/material-parity/original-overlay-context-survey.spec.mjs`

Direct sequential calls to `collectAlignmentFontAuditInputs`,
`collectTextAlignAuditInputs`, `collectLtrAlignmentAuditInputs` and
`collectReviewedInputAuditInputs`, each supplied the parsed pinned
`current-ancestry-audit/latest-report.json` and that same `parityPath`, now return
`binding.status: bound` and complete coverage. Respectively: 72/49/4/134 groups,
4,016/2,677/178/3,325 observations, 36.60/29.33/32.31/38.07 seconds. All cover
2,311 cases and 6,946 inputs without missing cases or inputs. This proves the
four failed binding paths replay; it is not full export/classification
conservation. Before export, address the chip proposal regression's dependency
on the mutable unresolved working index noted above. Full canonical conservation
and final browser gates remain outstanding; no renderer or fixture changed.

The chip proposal now pins its pre-classification working generation
`7793336da954e94fd2f03ff48a92a1d3a174f545532f631baf00df805b80216e` and index receipt
`97be6b2aa7342f017d3284b1410b1065189af854e5d0873af67eb7b858ddcc7c`.
Retain that generation (including its authenticated payload and chip shards)
after advancing `working-audit/current.json`: it is referenced transition
evidence, not stale disposable scratch. No extra package or index was copied.
The existing findings-store API accepts an explicit snapshot for historical
retrieval while current queries retain their default behavior. Its regression
advances a synthetic current generation, verifies old full-row retrieval is
unchanged, and rejects forged index receipts and traversal generations.
Regenerated chip review data differs only in the collector-source receipt;
all ten groups / 32 observations are exactly unchanged. Its new file SHA-256 is
`a942d0d83df0a19efdd84f88f691f5a35cdc0f6123597024242020d14671d3ef`.
Verification: `node --test tests/material-parity/audit-findings-store.spec.mjs`
passes 1/1 (0.16 seconds); `node --test tests/material-parity/chip-position-inspection.spec.mjs tests/material-parity/position-composition-producer-transition.spec.mjs`
passes 6/6 (65.12 seconds), including full predecessor restoration, original
76-state inspection, foreign/incomplete/forged evidence rejection and exact
producer transition. This clears the mutable-index regression prerequisite,
not the outstanding full canonical export/conservation milestone.

Integration export checkpoint: launched the cold export at `73e0d58` with the
same five explicit input paths documented above, `--max-old-space-size=4096`,
`ASTYLAR_AUDIT_COLD=1` and `ASTYLAR_AUDIT_PROGRESS=1`. Log:
`artifacts/material-parity/chip-paint-export-73e0d58-progress.log`.
Execution session 84439 / Node PID 7952 was verified live in `build-audit`.
Poll that handle or inspect the actual process before deciding whether to
resume or restart; this checkpoint is not itself proof the process is still
alive. Do not mutate collector dependencies while running. Preflight verified
both canonical and preserved pre-chip gzip hashes against the baseline above,
9,885,916 KiB physical / 15,544,624 KiB virtual memory free and 5,401,718,784
bytes free on D:. Acceptance still requires terminal output, exact ten-row
conservation, source receipts and all unaffected section comparisons; expected
remaining unresolved signatures are 1,644, not zero or audit completion.

Snackbar retained-raster gap closed independently of the running export:
`node --test --test-name-pattern="all 34 retained snackbar rasters" tests/material-parity/modal-position-inspection.spec.mjs`
passes 1/1 (4.25 seconds). All 34 captured open-surface states across light,
dark, contrast and custom profiles have the candidate's exact opaque
`#322f35` surface paint across more than 98% of a text-free, in-viewport lower
interior strip. Screenshot dimensions agree with viewport/DPR; blank raster
controls fail the same paint measurement despite unchanged coordinates.
The ordered file/hash receipts are pinned by SHA-256
`52f3cf2cd4c63a1e352cb8445f2654b66a99d633072c9e3700492264179574f5`;
the original capture is independently authenticated. Desktop/light/open was
also visually inspected: the message and action are visible near the bottom.
This closes actual surface-paint presence for these retained states, not text
sharpness, input equivalence, complete clipping correctness or the older manual
failure. Do not keep investigating total snackbar absence using these captures:
they do not reproduce it. A historical cause claim requires matching earlier
runtime/input evidence or a new reproduction of that symptom. No new capture,
renderer edit, fixture edit or running-export dependency change was needed.

Conservation preparation while that export runs: the existing
`scripts/check-material-position-canonical-conservation.mjs` now accepts
`--chip`. It authenticates the preserved full predecessor through the existing
stream reader, independently replays the pinned chip proposal, and requires
exact full-row equality with that application: ten groups / 32 observations,
all other scalar rows unchanged. It also requires exactly 48 control producer
receipt changes, with every other control field conserved. Current and previous
producer modules must both reduce through the existing exact-fragment restorer
to the same pinned predecessor; no mapping or normalization exclusion was added.
`node --test tests/material-parity/position-canonical-conservation.spec.mjs`
passes 4/4 (4.22 seconds), including prior six/fourteen-group cases and chip
negative controls for row loss, value changes, unrelated control changes and
forged producer transitions. This is checker verification only: run
`node scripts/check-material-position-canonical-conservation.mjs --chip` after
the export is terminal, then verify all section/source changes separately.

Tooltip retained-ink follow-up (no fresh capture): all 18 paired hover/held
rasters were measured with the existing `measureTextInkCenter` metric and
authenticated with ordered file/hash digest
`249d82e2152cf05fd58742674310332210862725f26a05ea8e56c165f64abc6c`.
Four contrast/custom DPR-2 cases retain vertical ink-center differences of
0.509991 and 0.486896 CSS px respectively; the other fourteen are below 0.03 px.
This metric samples the popup interior. It is not a full clipping, horizontal
centering or sharpness proof, and these diagnostic bounds are not acceptance
threshold changes. The earlier large downward displacement is not reproduced
in these paired samples; the smaller DPR-dependent residual remains explicit.
Do not classify it as a core defect before proving equivalent typography and
tracing paint placement. The separate candidate-only `open` screenshots match
the already-classified benchmark state defect and are not paired hover evidence.
`node --test --test-name-pattern="paired tooltip rasters" tests/material-parity/tooltip-position-composition.spec.mjs`
passes 1/1 (3.96 seconds), preserving the four nonzero residuals rather than
asserting rendering equivalence. No running-export dependency was modified.

Dialog width follow-up (separate from the height clamp): the existing reduction
now observes `measureIntrinsicFlowChildOuterWidth` and
`calculateIntrinsicContainerWidth` through call-through spies. In
`dialog-intrinsic-explicit-autoheight-nolimit`, container `width:100%` is resolved
against available width 640, then clamped to max-width 560; wrapper intrinsic
width returns 560. Native wrapper/pane width is 280. In the paired auto-width
control the same available width produces intrinsic container/wrapper width 280,
matching native width. `FlexService.measureIntrinsicFlowChildOuterWidth` takes
the authored percentage branch before recursive intrinsic child measurement
(flex.service.ts around lines 593-637). This locates the over-width contribution
in intrinsic percentage resolution, not a later projection or font operation.
The existing `none` height clamp remains independently failing; auto-width is a
diagnostic change to BOTH inputs, not a proposed fixture compensation.

Evidence: `dialog-width-trace-66af77e-dpr1/result.json` SHA-256
`ba1dc0c26b15a831dd2e15396011fd91736251692b75e9edc9439c4a7fdcbfda`, and
`dialog-width-trace-66af77e-dpr2/result.json` SHA-256
`cec8297fa51defc8ff9a9944287319b74444dba56c335891364426990adaa644`, under
`artifacts/material-parity`. All 104 library source receipts match the earlier
validated build; installed/dist/compiled equality is checked by the runner.
TypeScript no-emit check passes. Both browser runs terminate exit 1 with the
honest existing failures: 12 pass/14 fail at DPR 1, 11 pass/15 fail at DPR 2,
no page errors. Exact comparison confirms all 26 cases' geometry is unchanged
from the preceding height trace. Width/available-width assertions pass at both
DPRs. No producer dependency or canonical fixture changed during the live export.
Remaining uncertainty: this reduction proves the intrinsic-sizing rule failure,
not its full contribution to every Material dialog signature or all popup types.

Dialog explicit-inheritance boundary: the same reduction now records settled
`elementStylesMap.normal` constraints alongside native computed constraints.
For container/inner/pane, native min-width/max-width resolve to 280px/560px and
max-height to 100%; candidate retains literal `inherit` for all three, even
after settlement. Thus the failure is not solely an early-prelayout cache gap.
`StyleService.findStyleForElement` merges winning values and returns them without
general explicit-inherit resolution; the intrinsic parser subsequently coerces
these tokens to zero. Ordinary non-inheritance of layout properties does NOT
explain an explicitly authored CSS-wide `inherit` request. Treat this as a
core style-resolution support gap plus the separate intrinsic keyword/indefinite
percentage defect, not an instruction for plugins to resolve layout themselves.

The existing browser diagnostic now asserts these three resolved constraints
for three descendants in both inherited compositions (18 honest failures).
Evidence `dialog-inheritance-proof-310208e-dpr1/result.json`, SHA-256
`549accc3b6fea948a2c2b2b93c2ddd1fb67446e3b18f31f6eb8721beecaf9902`:
12 passed/14 failed cases, exit 1, no page errors, all 26 cases' geometry exactly
unchanged from the prior width trace. TypeScript no-emit passes. Initial raw
constraint capture is retained in `dialog-inheritance-trace-310208e-dpr1`.
Only DPR 1 was needed for this style-token assertion; earlier width/height
geometry remains independently reproduced at both DPRs. Do not generalize this
result to every CSS-wide keyword/property or claim all dialog rows classified.

Snackbar surface request batch: the existing modal inspection test authenticates
all 34 original open-state paired trees and generated surface mappings. Native
active rules request min-width 344px/max-width 672px, padding-left 0px/right 8px,
justify-content flex-start and a three-layer shadow. Native theme-variable paint
resolves to background rgb(50,48,51), text rgb(245,239,244). Candidate's captured
`.snack-surface` rule and all three local style stages instead use width 344px,
height 48px, padding 0 18px, space-between, background #322f35 and white text,
with no min/max-width or shadow. The current source rule at
`examples/material-showcase/src/app/astylar.component.ts:806` retains those
substitutions. These are application/plugin authoring differences, not proof
of a core paint failure or the earlier missing-snackbar symptom.

Focused command `node --test --test-name-pattern='all 34 retained snackbars'
tests/material-parity/modal-position-inspection.spec.mjs` passes 1/1 (1.06s).
The generation-checked compact lookup and authenticated full-row retrieval find
eight still-unresolved canonical signatures / 272 occurrences for background,
color, min/max-width, left/right padding, justification and shadow. Classification
integration remains pending; do not rebuild or modify the running producer just
for this batch. The historical 34-state geometry match does not establish input
equivalence, paint visibility, or current browser acceptance. This test reuses
the pinned position population and original tree receipts; no new capture/report.
History closure: reuse the existing `fixture-snackbar-fixed-width` source finding
and `material-input-audit-investigation.md` snackbar section rather than opening
another sizing investigation. `2f44011` already authored #322f35/white and
space-between (original mismatch, not a later paint compensation). `0d67d46`
changed 360px/min-height48 to fixed294x41 and added translate(0,159px) on the
wrapper; `f3c8254` removed that transform in favor of full-height column flow;
`899c741` changed to fixed344x48 and added a unit assertion for those literals.
That assertion verifies candidate authoring, not intrinsic input equivalence.
Do not attribute the old missing-snackbar report to the removed 159px transform
without a matching historical runtime reproduction. No new capture is needed
to restate the already-established fixed-width mismatch.

Equal-input snackbar sizing reduction now exposes a shared intrinsic-percentage
failure without the fixture's fixed surface width/height. At 800x400, paired
min-width344/max-width672 flex surfaces with a width100% label produce short
native content 344x48 at (228,352), candidate 672x48 at (64,352). Long wrapping
content matches 672x108 at (64,292). Call-through trace locates the same core
`measureIntrinsicFlowChildOuterWidth` branch as the dialog: the label receives
792px available width and returns 792 for width100%, before adding the 64px
action and 8px surface padding and clamping the surface maximum. A paired
width:auto control measures the label at 109.0048828125px and both surfaces
return 344x48. The auto control is NOT an authorized fixture workaround.

This reduction deliberately uses the same pinned Roboto500 diagnostic asset
and a fixed 64x36 action block on both sides to isolate intrinsic sizing; it
does not claim full Material font/button/tree parity, or explain missing paint.
It demonstrates why replacing the fixed344 fixture rule with equal intrinsic
inputs requires a general core sizing correction, not another calibrated width.
The short percentage case fails and both controls pass at DPR1 and DPR2.
Evidence under `artifacts/material-parity`:
`snack-intrinsic-control-ea138b0-dpr1/result.json` SHA-256
`acbbc783c476b4450b9bf2b3b3dd08789c7185e68c6f04f46b538ddb08274649`;
`snack-intrinsic-control-ea138b0-dpr2/result.json` SHA-256
`fbd32cfda7a4db8f1cd38cf70573384d241a5e47daa025a3f0b174e923d56dac`.
TypeScript no-emit passes. Both runner invocations exit1 honestly (DPR1 14 pass/
15 fail, DPR2 13 pass/16 fail), no page errors, earlier 26 geometry cases exactly
unchanged. Initial failure retained in `snack-intrinsic-ea138b0-dpr1`. No renderer,
canonical fixture, or running-export dependency was changed.

Next tooltip sizing batch: a read-only replay using
`collectTooltipPositionAncestry` and `inspectOverlayOwnerDeclarations` authenticated
all 18 paired open-state trees. All 72 property observations retain active native
`.mat-mdc-tooltip-surface` requests for `min-width:40px`, `max-width:200px`,
`min-height:24px`, and `max-height:40vh`. The candidate popup omits each constraint
in inline input, possible matching rules and all three retained local stages.
These are unequal sizing inputs, not evidence that the limits explain the
short-label offset or blur: native captured width is 106.812px and height 24px.
The existing `tooltip-position-composition.spec.mjs` now checks this population
and 28 altered-reference/candidate-request controls. Its five tests pass (exit 0,
1,289.1075 ms), including the prior placement and public-contract assertions.
This test file is not a producer dependency of the running chip export; no
export input was changed. Next classify the five signatures / 72 observations
in a coherent later batch. Do not re-investigate established local flow
placement or wrapping substitutions. No classification changed here.

The same test now authenticates the five full canonical rows through the compact
store and joins their values, occurrence counts, retained case lists and states
to all 72 original observations. It preserves the absent candidate values and
does not depend on an unresolved attribution label. All five tests pass again
(exit 0, 13,502.874 ms); the full-row reads explain the extra runtime. This closes
the population check for the proposed sizing batch, not its production integration.

Dialog sizing reduction: `overlay-layout-stage.audit.spec.ts` now preserves a
nested surface/container chain with percentage sizing and inherited constraints,
using identical three content blocks (40/24/40px) on both sides. At 640x400,
native panel geometry is 280x104 at (180,148); candidate retained CSS and projected
geometry is 0x0 at (180,200), at DPR 1 and 2. This confirms divergence before
projection, not a Babylon coordinate error or a font measurement explanation.
Paired explicit-constraint controls produce 560x0; replacing percentage heights
with auto and removing descendant max-height limits does not restore height.
With auto widths as well, width matches 280 but height remains zero. Thus a
percentage-height-only diagnosis is insufficient. Next trace intrinsic child
measurement and constraint resolution in the preserved failing chain, not more
fixture calibration. These controls change both inputs and are not proposed fixes.

Final diagnostic evidence: `artifacts/material-parity/dialog-sizing-controls-277af68-v2-dpr1`
and `-dpr2`, result SHA-256 respectively
`e9d7de8c09da408370e09c5795728efb93a0efac8b65823f2532d835a7ebc679`
and `ba0e58054d262e84f5437142877af1977e616ab76a3b468f8bc9a2f15558034d`.
Both have 25 cases, no page errors, exit 1; DPR1 is 11 pass/14 fail, DPR2 is
10 pass/15 fail, retaining earlier known failures. All six dialog cases fail
unchanged native geometry expectations. Earlier dialog-only/control captures
are retained failure evidence. All 104 library-source receipts match the prior
verified package reduction; the runner also checks emitted/installed equality.
The initial reduction hit TS2561 because public `StyleRule` lacks `overflowY`.
The geometry reduction requests `overflow:auto` on both sides instead, explicitly
excluding vertical-only scrolling parity. No renderer or canonical fixture changed.

Dialog runtime trace now identifies a concrete first-divergence path in
`FlexService.measureIntrinsicFlowChild` / `parseIntrinsicPixelLength`:
`inherit` reaches the numeric parser unresolved and becomes zero; percentage
height uses a zero percentage reference. In auto-height controls,
`calculateIntrinsicContainerHeight(pane)` correctly returns 104, but the following
max-height clamp reduces it to zero. Even explicit `max-height:none` becomes zero
through `parseFloat(value) || 0`. A paired control omitting max-height entirely
matches native 280x104 geometry, CSS position and projection at both DPRs; its
otherwise identical explicit-none counterpart remains 280x0. This confirms the
keyword/clamp defect independently of percentage height. Explicit width controls
also retain a separate 560-versus-280 intrinsic-width mismatch; do not claim that
fixing max-height alone restores the original chain or Material dialog parity.
Fix general CSS keyword resolution and indefinite-size constraint semantics at
the owning core boundaries; never replace fixture `none`/`inherit` with omissions
to hide these defects. The call-through spies only observe the installed runtime.

Final trace: `artifacts/material-parity/dialog-sizing-trace-80efa42-v2-dpr1`
and `-dpr2`, SHA-256
`9d543522ec810326a21a70f2380927e89004bdeaa76b1e39bb0e16e524384aaf`
and `328717504126767c10146f819650f6de4afb905db948a80003b1b87a385dd058`.
Each has 26 cases and no page errors; DPR1 has 12 passes/14 failures, DPR2
11 passes/15 failures. Both exit 1 with the original six dialog failures intact
and the omitted-limit control passing. Earlier diagnostic failures remain retained.

Prioritize remaining questions by impact and shared ownership, not by creating
one investigation per scalar property. Component counts below are refreshed from
the verified compact index:

1. Overlay boxes/ownership: dialog has 216 unresolved signatures, bottom sheet
   182, snackbar 77 and tooltip 42. The 59-state wrapper inspection now rules
   out **position keywords alone** as a sufficient diagnosis: reference absolute
   wrappers have a fixed parent; candidate fixed wrappers flatten that layer.
   See [the modal inspection](material-modal-position-inspection.md). Next trace
   used CSS boxes, containing blocks and reachability without repeating proven
   external reference-ancestor capture. Shared tooltip/snackbar causality is
   still a hypothesis.
   Follow-up: direct rectangle checks across all retained open snackbar (34),
   tooltip (18), and bottom-sheet (25) observations show reference/projected
   candidate deltas below 0.04 px. These historical states do not reproduce
   off-screen placement; they must not be cited as reproductions of the earlier
   manual reports. The collector's `borderBox` is projected mesh geometry, not
   retained CSS layout geometry. Next instrument the existing repository-only
   inspection boundary to pair retained CSS boxes with projection in a minimal
   equal-input overlay reduction; do not repeat this historical position survey
   or infer paint visibility/input equivalence from it. See the scoped evidence
   and limits in [the modal inspection](material-modal-position-inspection.md).
   Build follow-up: the narrow `tsconfig.overlay-audit.json` test build with
   `NG_BUILD_MAX_WORKERS=1`, `NG_BUILD_PARALLEL_TS=0`, `GOMEMLIMIT=768MiB`,
   `GOGC=50`, Node heap 1536 MiB and sourcemaps disabled still did not reach a
   browser. Node stabilized near 0.6 GB, but its owned esbuild child exceeded
   6 GB after about nine minutes, leaving roughly 1 GB physical memory free.
   Both owned processes were explicitly stopped; session exited -1. Retained log:
   `artifacts/material-parity/overlay-layout-single-worker-build.log`.
   This is no rendering result. Do not repeat this build unchanged. Installed
   Angular Karma builder source confirms optimization is forced off and supports
   `externalDependencies`; next evaluate serving the exact installed Babylon ESM
   modules to the browser instead of bundling their full graph, retaining the
   same renderer source, public authoring and test assertions. No substitution
   of NullEngine evidence for browser geometry is acceptable.
   Native-ESM follow-up: the same four-case draft reduction was attempted with
   `--external-dependencies=@babylonjs/core --karma-config=karma.overlay-audit.cjs`
   and the same single-worker/heap settings. The configuration parses successfully;
   its import map points to the installed root Babylon **8.15.1**, not the
   historical consumer's 8.56.2. No package version or renderer source was changed.
   esbuild initially stayed small but reached 2,943,475,712 working-set bytes
   (Node 532,410,368 bytes) without leaving `Building...`. Owned Node 5152 and
   child 5984 were identity-checked and stopped; session 11098 is terminal,
   exit 1. Log: `artifacts/material-parity/overlay-layout-native-esm-build.log`.
   **Externalizing Babylon alone is insufficient** to make this build usable;
   neither browser loading nor any geometry assertion executed. Do not repeat
   either build unchanged or treat the draft configuration as browser-verified.
   Next use the existing package/consumer diagnostic path, first establishing
   compiled-source provenance and inspection availability, instead of another
   root Karma bundle attempt. `dist/lib` already contains retained CSS layout
   accessors, but its freshness has not yet been verified. The minimal reduction
   and native-ESM loading drafts remain uncommitted diagnostic work, not acceptance
   evidence. This does not attribute the user's overlay symptoms to a build issue.
   Package-route result: fresh `ngc -p tsconfig.lib.json --outDir
   artifacts/material-parity/overlay-source-build-bb5a07c` completes (exit 0).
   All **104 emitted JavaScript files** exactly match both `dist/lib` and the
   installed showcase package. The existing public-package browser approach now
   runs the same Jasmine reduction through `scripts/audit-overlay-layout-stage.mjs`
   in about three seconds, without Karma. Public authoring uses the package root;
   private access is read-only retained-layout instrumentation. No renderer edits.

   Current accepted diagnostic evidence (not accepted parity) is
   `artifacts/material-parity/overlay-package-stage-bb5a07c-v6-dpr1` and `-dpr2`.
   Chrome 153.0.8010.53, Angular 20.3.31, Babylon 8.56.2, AstylarUI 0.2.0;
   each run has four cases, two passes, two honest failures, zero page errors.
   Result SHA-256 values respectively:
   `9fb8de9ec9fb06c6893e57ba3ead5cd48b0b341a5d19c36e7198e70dd267f54b` and
   `0cb87e74db5bc88da78507624dbecc26937247483b8f1441323cf6cb3b2788cf`.
   Provenance retains all bundle-input hashes, runtime asset hashes, source/emitted
   receipts, and package versions. Recompile the source before reusing the runner's
   fresh-build directory; matching package versions alone is not source proof.

   **Question answered:** with identical minimal authored inputs, both nested-row
   and flat-column overlays agree at 320x200. At 321.5x201.25, the reference iframe
   viewport and retained CSS boxes use 322x201; the canvas CSS rectangle remains
   321.5x201.25. Projected boxes scale by 321.5/322 horizontally and 201.25/201
   vertically, at both DPRs. A 120px pane becomes 119.81366459627328px wide.
   `src/lib/astylar.ts` reads integer `clientWidth/clientHeight` for its viewport;
   `BabylonCameraService.updateViewport` uses those same values as orthographic
   bounds. This demonstrates fractional-surface projection distortion, not a
   layout-wrapper defect. Geometry alone does not prove text blur or paint loss.
   Do not attribute the earlier large tooltip offset or absent snackbar to this
   subpixel result: those symptoms remain un reproduced by this reduction.
   Next trace the actual modal/popup inputs through retained boxes, clipping and
   paint at their representative surface dimensions; the usable package runner
   removes the need for another root Karma build attempt.

   Reproduce: `node scripts/audit-overlay-layout-stage.mjs <new-output-dir> <1-or-2>`
   after the fresh compilation above; exit 1 preserves the demonstrated failures.
   `tsc -p tsconfig.overlay-audit.json --noEmit` passes. Earlier v1/v2 startup
   failures omitted Jasmine's HTML boot dependency; v3/v4 accidentally styled
   the native document head with the shared universal rule. Final v5/v6 scopes
   the same reset to the four authored IDs on both sides (head stays hidden),
   retaining the identical geometry result. No canonical fixture was altered.

   Sheet auto-sizing follow-up: the existing modal inspection now checks the
   active authored rules and inline declarations in all 25 authenticated sheet
   states. None authors panel width/height; 24 use min-width 512px/max-width
   `calc(-256px + 100vw)`, one uses min-width 100vw. All retain border-box,
   8px vertical panel padding, max-height 80vh and a separate nav-list with
   8px vertical padding. The candidate instead requests height 128px. This is
   an intrinsic-to-fixed sizing substitution, not equivalent authored intent.
   The unchanged 128px computed reference height was not an authored constraint.

   The same browser reduction now preserves that geometry contract: absolute
   bottom-aligned wrapper, auto-sized relative sheet, padded list, and two 48px
   block items. Both reference and candidate produce pane (464,872,512,128) at
   1440x1000 and (0,572,900,128) at 900x700; all seven owner boxes match in retained
   CSS and projection at DPR 1 and 2. No fixed panel width/height is supplied.
   This rules out needing the candidate's fixed height for this reduced sizing
   contract, not every original text/paint/interaction path. Controls are reduced
   to geometric blocks; clipping, visible text and pointer ownership are unproven.
   Source provenance is unchanged from the 104-file verified package above.
   Evidence directories: `artifacts/material-parity/overlay-sheet-auto-e7b1b5f-dpr1`
   and `-dpr2`; result SHA-256 respectively
   `965b990c12cb24049c98ae41738161ffad5feb366c76c4fa58ed2f9523e471b1` and
   `aa0a89be787be59ddb418ec5eb9ca82920d7b8b7cdc9e6ce4292bec36432ce24`.
   Each full diagnostic run has four passes/two retained fractional-projection
   failures, exit 1 and zero page errors. Modal inspection passes 5/5 (5.55s),
   The initial TypeScript check caught widened string inference in
   the conditional diagnostic styles; preserve the constrained literal types
   (`position`, `overflow`, `boxSizing`) with `as const`. The corrected
   `tsc -p tsconfig.overlay-audit.json --noEmit` passes, exit 0 (5.23s).
   This is a test-authoring correction and does not change browser input values.
   Canonical classifications/counts
   are unchanged; this is a bounded authoring/sizing proof, not acceptance.
   Next investigate the remaining modal paint/clipping or connected-tooltip
   placement contract; do not repeat these settled auto-sizing cases unchanged.

   Clipping follow-up: two controls now cross a boundary by 20px. With identical
   input, a fixed overlay escapes its `overflow:hidden` authored ancestor and
   clips only at the viewport; an absolute overlay clips at its positioned host.
   Retained CSS/projection boxes agree, and actual pane-pixel masks agree exactly
   at DPR 1 and 2: 3,360/13,440 painted pixels respectively, zero mask differences.
   `OverflowClipService` traverses mesh descendants; the fixed owner is reparented
   out of that host. This simple ancestor-clipping hypothesis is not reproduced.
   It does not cover transformed containing blocks, text clipping, rounded edges,
   live popup state or pointer routing, and does not explain old manual failures.
   Full-image differences remain 60,640/242,560 pixels: the known default candidate
   root is red versus native white. The mask check does not hide or accept that
   background mismatch as full paint parity.
   Evidence: `artifacts/material-parity/overlay-clip-eaf8142-v2-dpr1` and `-dpr2`;
   result SHA-256 respectively
   `1400e533da6e3763fcdc75e0321e0088aac2d0338fb9b52576eb7d15c1632ba4` and
   `b024f3e1b3b740138495fbf6955a9ad5e7ec43bb1870074143a6fb09778f4e20`.
   Both runs: six geometry passes, two retained fractional-projection failures,
   zero page errors, exit 1; all four clipping raster checks pass. Screenshot
   hashes are retained in each result. Diagnostic TypeScript passes (5.33s).
   Next prioritize the actual connected-tooltip placement/state input contract,
   rather than another unchanged generic overlay-position/clipping reduction.

   Connected-tooltip ownership check: Material 20.0.5's installed directive
   constructs a flexible connected strategy, supplies main/fallback position
   pairs, disables flexible sizing, sets a viewport margin, registers scrollable
   ancestors and hides when that strategy reports clipping. Its module
   `module-CWxMD37a.mjs` SHA-256 is
   `75d4207bc0b6e97105c0ff88f80c5017e4df00af13f92b5bdaa19a80bcb81a2a`.
   The 18-case tooltip composition/history proofs already establish that the
   candidate substitutes a local 138x72 flex wrapper; do not reinvestigate that.
   Current source and installed declarations expose only the current element's
   dimensions/projection in `AstylarPluginRenderContext` and lifetime/invalidation
   facilities in `AstylarPluginSurfaceContext`, not a cross-element connected
   placement contract. `inspectResolvedStyles` is declarations, not used boxes.
   Existing CSS-space anchor/viewport and above/below logic is private to
   `SelectManager` (`positionDropdown`, `shouldPlacePopupAbove`,
   `choosePopupDirection`); it is not exported from the package root.

   Implementation boundary recommendation: review/generalize the core-owned
   CSS-space placement primitive and its lifetime/scroll invalidation before
   restoring the tooltip's original connected behavior. Do not deep-import the
   select manager, reconstruct anchors from Babylon meshes, or add a second
   plugin positioning engine. This identifies a reusable-contract gap relative
   to the comparison's needs, **not a demonstrated CSS layout defect** or a final
   API design. Actual edge fallback, scroll dismissal and focus behavior need
   browser verification; the existing state audit remains authoritative for its
   already-proven benchmark and click-release input mismatches.
   Existing composition/history suites pass 4/4 in 0.66s, including the added
   source/declaration ownership check. No browser recapture or canonical rewrite
   was needed for this source-contract question.
2. Control structure/geometry: slider 77, chips 114 and button-toggle 73. Reuse
   the existing gesture, range-travel and paint reductions; do not reopen those
   diagnoses or assume they explain every original symptom. Isolate unreviewed
   owner selection, clipping and sizing inputs.

   Rounded-toggle follow-up: the existing package browser reduction now tests
   identical authored CSS: a 130x42 border-box flex parent at (10,10), 1px solid
   `#79747e` border, 28px radius, hidden overflow, and square white/dark children
   of 48x40 and 80x40. No child corner compensation or Material fixture change.
   Native, retained CSS and projected bounds match for all three owners at DPR
   1 and 2 (the initial nine-case run's geometry assertions pass). Raster does
   not: the candidate loses the curved border beneath child fill. At DPR 2,
   **176 of 952 exact solid native border pixels become exact white/dark child
   pixels**. For example device pixel (247,22) changes from [121,116,126,255] to
   [48,45,50,255]. This is a confirmed equal-input core paint/clipping defect,
   not a used-size or fractional-surface projection error in this reduction.

   The source trace identifies the leading mechanism:
   `OverflowClipService.apply` uses `resolveCssViewportRect` (the retained border
   box) and the outer `astylarBorderRadiusWorld` for descendant clipping, without
   border-width insets or an inner-radius calculation. Thus its clip permits
   child paint in the rounded border band. The transparent-child control below
   separates measured child overpaint from an absent border mesh. Do not
   restore child-radius workarounds; a future general correction belongs to
   core overflow/paint ownership. Hover/pressed layers and all historical toggle
   observations remain separate obligations, not automatically classified here.

   The DPR 1 exact-solid-border control finds no overwritten pixels (176/176
   match), but dark fill masks differ by 86 pixels; it is not full raster parity.
   DPR 2 dark masks differ by 268 pixels. Whole-image differences include the
   separately known red candidate root versus white native root; those are not
   normalized away. The new border assertion intentionally fails at DPR 2 and
   retains sampled pixels and screenshot hashes in the existing result format.
   This assertion detects solid-border replacement, not every antialiasing error.

   Evidence: `artifacts/material-parity/toggle-round-deb3f15-v2-dpr1` and `-dpr2`.
   Result SHA-256 respectively
   `6ef448cdad77901853a7137cbd87bc6fe9b9aff2ad9b4e7eff1f3bb566a22dd0` and
   `afcc6b47cad6fad3bb6ebfdcde809514437f087f99f6ac708abae4bb14a52205`.
   Both runs exit 1: DPR 1 has seven passes/two known fractional-projection
   failures; DPR 2 has six passes/those two failures plus the new border failure.
   No page errors. The prior `toggle-round-deb3f15-dpr1`/`-dpr2` captures retain
   the successful geometry assertions independently of the new paint failure.
   All 104 compiled/source receipts exactly match the earlier clipping run;
   current installed/local/fresh-build emitted code also matches. Diagnostic
   TypeScript passes (5.74s command including source inspection). The canonical
   classification checkpoint is unchanged; these new diagnostic proofs still
   require integration and final canonical/browser acceptance.

   Border-only control (same CSS except both child backgrounds are transparent):
   all 176/952 solid native border pixels match at DPR 1/2, with no dark child
   paint. At DPR 2 the opaque case still loses exactly 176 of those same 952
   pixels to the child colors. Thus the measured border loss is child overpaint,
   not missing border geometry. This does not certify antialiasing, every border
   width/radius, or border paint outside the exact-solid reference samples.
   Geometry assertions now run before raster capture, so a paint failure cannot
   prevent their execution; all three rounded-case boxes match in both variants.
   No renderer mutation was used to reach this conclusion.

   Evidence: `artifacts/material-parity/toggle-border-control-a5d3420-v2-dpr1`
   and `-dpr2`, result SHA-256 respectively
   `372bde9ddde2776af94a018c8160db85115f703017f4457fb335da9e3e4c3432` and
   `2bd85db7a531147edacf607a30dba3ddbd3a6858b69dc851dafa667829ced1c4`.
   Ten cases each: DPR 1 eight passes/two known projection failures; DPR 2 seven
   passes/two projection failures/one opaque-border failure. Both exit 1, no
   page errors. Transparent-border assertions pass at both DPRs; diagnostic
   TypeScript exits 0. All 104 source/compiled receipts remain identical to the
   previous rounded run. Full-image mismatch remains recorded, including the
   unrelated root background. Stop repeating this settled control. Next audit
   the still-unreviewed hover/pressed paint-owner inputs or intrinsic chip
   sizing; integrate this core finding with the existing toggle history without
   claiming it explains all 73 unresolved signatures or changing canonical input.

   Chip intrinsic-layout reduction: preserved the nested chip/cell/button/graphic
   structure in a diagnostic with identical public inputs on both sides. The
   cell requests `flex-basis:100%`; the graphic retains 6px side padding and
   0px/24px selected-state content width. Label blocks are 50px/100px to isolate
   sizing from fonts; no measured Material width is authored onto the chip.
   Native chip widths are 74/98/124/148px. Candidate chip and cell widths remain
   300px (the available host width) in all four cases. Candidate button width
   remains 58.2578125px regardless of label width; child labels shrink to
   34.2578125px unchecked or 22.2578125px selected. All discrepancies are already
   present in retained CSS geometry; projection agrees with that wrong geometry.

   A fifth diagnostic changes the action from button to div on **both** sides:
   native selected width stays 98px, candidate action becomes 86px and label
   retains 50px, while outer chip/cell remain 300px. The graphic border box is
   still 24px instead of native 36px. This isolates control-specific sizing from
   additional nested-flex/content-box failures; replacing the canonical button
   with a div would not be an equivalent fix.

   Source trace: `FlexService` routes buttons through `calculateIntrinsicWidth`
   ahead of recursive child measurement; that method measures literal fallback
   `Button` when direct text/value is absent. `ElementDimensionService` has the
   same fallback. `measureIntrinsicFlowChildOuterWidth` replaces the recursively
   measured width with a definite percentage flex basis against available width;
   it returns explicit child widths without adding content-box padding. These
   paths are now exercised by the runtime trace below. Font
   measurement, actual labels, hover/focus, and all 76 historical chip states
   remain separate; this geometry-only test is not complete chip parity.

   Evidence: `artifacts/material-parity/chip-intrinsic-5f10bda-dpr1` (four chip
   cases, result SHA-256
   `2a640fd147982b8f17f9aa9363c0367527ba0e948f0d1e6b6204c65d7f1b070d`)
   and `chip-intrinsic-5f10bda-v2-dpr2` (adds the div control, result SHA-256
   `fb268ad9a8a60a8cace7e66ae587aba935e04759dc7e657693e14f805c5cabf3`).
   Both exit 1: DPR 1 eight passes/six failures, DPR 2 seven passes/eight failures;
   existing fractional-projection and DPR 2 border failures remain, every new
   chip case fails unchanged native expectations. No page errors. TypeScript
   exits 0; all 104 source/emitted receipts match the preceding reduction.
   Canonical fixture styles and the 1,654-signature checkpoint remain unchanged.

   Discriminating controls and runtime trace: with a div action, changing only
   cell basis from `100%` to `auto` reduces candidate chip/cell width 300 to 86px;
   native remains 98px. Removing only the graphic's 12px side padding then makes
   every measured owner agree at 86px. Both sides receive each diagnostic change.
   Call-through spies on the actual installed `FlexService` preserve every return
   value: `parseDefiniteIntrinsicFlexBasis` receives `100%`, reference 300 and
   returns 300; the cell outer-width measurement returns 300. With auto basis,
   `measureIntrinsicFlowChildOuterWidth` returns 24 for the padded graphic,
   unchanged when padding is removed, and 86 for action/cell. Button cases call
   `calculateIntrinsicWidth` and receive 58.2578125; div controls never call it.
   This ties the observed percentage and lost-padding effects to core intrinsic
   measurement, independently of projection. Do not repair them by changing
   canonical flex basis, removing graphic padding, or substituting div actions.

   Final controls: `artifacts/material-parity/chip-sizing-trace-6f0b8ab-v2-dpr1`
   and `-dpr2`, result SHA-256 respectively
   `d391596710ccd55a33adb2372857d6c2f612c87ac553a00164802c877ae34a3b` and
   `db7ff2a95635992ebf5a33627dc803a432861c7ca34242f954df943631638d8b`.
   Seventeen cases each: DPR 1 nine passes/eight failures, DPR 2 eight passes/nine
   failures, both exit 1 with no page errors. Six chip variants retain failing
   native geometry expectations; the auto/no-padding control passes both DPRs.
   Spy-path assertions pass; TypeScript exits 0 (5.29s). The first trace draft
   incorrectly expected the text-sizing method to run in div controls; its
   retained failure led to the correct explicit no-call assertion, not a renderer
   change. All 104 source/emitted receipts match the preceding reduction.
   Next integrate these bounded findings into the chip ownership/history review
   and retain actual-label/font and interaction coverage as open obligations;
   do not repeat the now-settled block-sizing controls.

   Actual-label measurement control: `Angular`, `Astylar`, and `Angular Material`
   are intrinsic span flex items with equal Roboto 500/14px, 20px line height,
   nowrap and either zero or 0.096px tracking. The same local font bytes load and
   pass `FontFaceSet.check` in both realms before mounting; runtime asset SHA-256
   is `5bcc3aa180e7f26f643cd5b2621cd7c2de193d0661d913a94afd3d4881a7a34b`.
   All label and host CSS/projected rectangles agree within 0.02px at DPR 1/2.
   Tracked native widths are 49.421875, 44.75 and 105.34375px; candidate widths
   are 49.41218566894531, 44.74324035644531 and 105.339599609375px. Both sides
   retain exact 20px height and y=16. This reproduces the historical chip-label
   width scale without a several-pixel measurement error; it does not prove
   raster sharpness or correct placement inside the unequally authored chip.
   Keep fixed chip widths and nested layout faults separate from label metrics.

   Evidence: `artifacts/material-parity/chip-label-6c335dc-dpr1` and `-dpr2`,
   result SHA-256 respectively
   `8f8ebf22aff18b0acf27273fabef4107deba90f51deaae7bf793c271c2d1f582` and
   `a57f96d7ca365826254558960e1baadf673a799af4f50de84e74e1b01d28e4c5`.
   The two new label cases pass both DPRs; the full diagnostic remains failing
   on its preserved defects (DPR 1: 11 passes/8 failures; DPR 2: 10/9; no page
   errors, exit 1). TypeScript passes, 5.69s. Source/emitted receipts remain
   identical. The existing runner now serves and hashes the pinned font asset;
   no new harness or canonical fixture changes. Next address interaction-layer
   input ownership and integrate these chip findings; do not rerun unchanged
   label measurement as a substitute for the outstanding paint/state evidence.

   Interaction-input ownership replay: the existing chip inspection suite now
   authenticates all 76 paired states/152 owners for layer paint. Every native
   chip retains an absolute, pointer-transparent focus/hover overlay; 48 captured
   layers have nonzero opacity. The candidate has only label/check children and
   substitutes flat background colors. Across eight `focus` and eight
   `activate-leave` observations, native opacity is 0.12 while candidate normal
   and interaction backgrounds remain identical. This proves unequal authored
   layer/state inputs, not the absence of every possible core-generated focus
   effect or a fresh visual reproduction of the manual hover complaint.

   All eight selected-hover observations use native ink rgb(73,69,78) at 0.08
   over rgb(234,222,247); candidate uses `#ddd2ea`, from different ink #4b4357.
   Rounded source-over channels from the native declarations would be #ddd2e9;
   this arithmetic is not a screenshot/raster assertion. All eight held states
   retain native ink rgb(75,67,87) at 0.12 versus candidate flat #d7cbe4. That
   matching flat-color arithmetic alone does not prove layer equivalence through
   clipping, state transitions or focus. Current source still contains these
   selected hover/active substitutions and no chip focus selector.

   Classify missing reference state-layer composition and changed hover ink as
   application authoring differences, separately from the proven core sizing
   and rounded-clipping defects. Future implementation must restore equivalent
   layer/owner inputs after general support is demonstrated, not tune another
   chip-only color or offset. Existing `chip-position-inspection.spec.mjs` passes
   3/3 in 0.93s, including all paired receipts and five earlier negative controls.
   No canonical export or browser recapture was run for this historical-input
   replay. Live focus/hover/held raster and source-fingerprint integration remain
   open; the 1,654 unresolved canonical signatures are unchanged.

   Chip paint classification is now prepared against complete canonical rows:
   `node tests/material-parity/chip-position-inspection.mjs --paint-review`
   uses the existing compact store and authenticated full-row retrieval, binding
   ten background signatures/32 observations to their exact predecessor hashes
   and paired trees. The two selected hover/held groups cover eight observations
   each; eight unselected activation groups cover two each. Each case proves a
   visible reference state layer and a changed flat candidate owner background.
   Proposed classification is application/plugin authoring defect, not core
   color error or rendering equivalence. The deterministic proposal is saved by
   the existing store as `working-audit/proposals/`
   `a15ac639b18540b5b18ffaab2b0c51fb481a9d57c346b89ee9cea1707c138150.json`.
   This is **not canonical integration**. Reuse the existing producer/application
   and whole-row conservation pattern to integrate it; preserve all unrelated
   rows and add its source receipts at that milestone. Focus-only missing layers
   are separate structural findings, not invented background-difference rows.

   Freshness check at `3cea2e8`: authenticated the canonical compressed payload,
   streamed its source receipt section, and compared all 442 LF-normalized hashes
   with disk: zero mismatches. New browser diagnostics and chip proposal are
   supplemental, not silently covered by those receipts. Existing chip suite
   passes 4/4 in 11.29s, including complete-row authentication; this is not a
   full canonical check or current-browser acceptance. No export/recapture was
   justified for proposal preparation. Next canonical batch must incorporate
   these new proofs explicitly; unresolved canonical total remains 1,654.

   Application preparation: `applyChipPaintProposal` replays the authenticated
   proposal before applying its ten decisions. It requires each complete original
   row hash, rejects missing/duplicate predecessors, replaces only the six review
   metadata fields, and retains their previous presence/values. Reconstruction
   must equal the complete original row. The existing focused suite verifies
   all ten real canonical predecessors plus an unrelated canonical appearance
   row, preserving that row's identity and leaving inputs unmodified. Suite:
   4/4 passed, 34.03s; syntax and scoped whitespace checks pass. The longer check
   explicitly authenticates full rows for collection and application, so reserve
   it for integration changes rather than prose updates.

   Production remains synchronous and unchanged: next provide its source-bound
   collection/validation adapter using this prepared review, then test the
   complete canonical population and whole-report conservation. The tested
   eleven-row application is not evidence that all 8,483 canonical rows are
   conserved. The preceding stored proposal is historical (its collector-source
   receipt predates this application helper); regenerate it before integration,
   rather than accepting the old receipt. No canonical export was run here.

   Production integration now present (following `2a35d34`): the synchronous
   chip adapter uses checked-in `docs/material-chip-paint-review.json`, SHA-256
   `6f0e944909cae42864a67d886b9420e8c17b3127caec4d25a3c24e9b731ac2cb`, not
   the mutable working-index pointer. It authenticates the original capture,
   current review-source receipts and all paired layer observations before
   applying classifications. Collection, output section, validation and five
   source-inventory entries are wired into the existing producer. Historical
   producer restoration strips only these exact additions before checking its
   original pinned hash; three chip-specific mutation controls are included.

   Six focused tests pass (72.04s while the full-row read ran concurrently),
   including malformed predecessors, incomplete/foreign captures, forged review
   metadata and source restoration. The final transition suite also passes
   independently (0.52s). A separately authenticated full canonical read and
   in-memory application verifies **8,483 rows: exactly 10 changed, 8,473 passed
   through unchanged, 32 reviewed observations; unresolved 1,654 -> 1,644**.
   This did not write the canonical export. Snapshot baseline is preserved at
   `artifacts/material-parity/pre-chip-paint-2a35d34` for exact post-export
   conservation. Next run cold canonical export/check at this integration
   milestone, reconcile all changed sections/source receipts, then refresh the
   compact index. Until that succeeds the canonical checkpoint above remains
   1,654, not 1,644. Full browser acceptance and the rest of the audit stay open.
3. Remaining typography and paint: line-height 67, tracking 57, font-family 31
   and color 111 unresolved groups. Reuse explicit ownership/stage proofs and
   separate missing computed evidence from unequal declarations. These property
   totals overlap the component populations above.

Position subset: fourteen groups / 768 observations are now wired through the
existing followup adapter into production collection and validation, with source
fingerprints registered. Cold focused integration preserves all 8,362 raw rows,
changes exactly fourteen classifications and leaves 8,348 complete rows unchanged.
The source-transition test restores the exact pinned pre-position producer and
rejects dropped collection, validation, evidence or fingerprint fragments.
Export/scalar conservation now passes; whole-report reconciliation is below.
Seven groups are authoring defects and seven are measurement/harness defects;
none is promoted to equivalent rendering or a confirmed renderer cause.
Verification: source adapter checks 2/2; final cold transition/integration 2/2
in 23.20 seconds. Seventeen position groups have
owner inspection, and twenty-one retain open investigations. The six already
exported groups now pass full scalar/control conservation (8,477 other complete
rows unchanged); whole-report section reconciliation is recorded separately in
[the transition record](material-position-canonical-conservation.md). The new
wrapper inspection narrows two of the twenty-one investigations but does not
promote their position scalars to resolved classifications.

Source-fingerprint reconciliation remains open: at the preceding checkpoint,
using the producer's LF-normalized hash convention, **12 of 424** stored source
receipts differed after the workflow changes. The new followup integration also
changes the producer/transition proof and registers eighteen additional receipts
(seventeen followup files and the moved slider integration proof);
do not reuse that earlier difference count as a current measurement. The prior
twelve concerned collection/session imports, test splitting and scratch
retention. The showcase source and browser harness still match after correct
line-ending normalization. Do not rewrite historical receipts to claim currency.
At the next integration milestone reconcile the changed producers and proof
inventory, perform cold replay, then export/check once for the coherent batch.
No full current-builder or enforced-browser acceptance is claimed here.

Export preflight follow-up: the first cold run exceeded its 1.5 GiB V8 heap cap;
the 3 GiB retry reached a real stale dependency and was stopped before export.
Both logs are retained as `position-followup-cold-export.log` and
`position-followup-cold-export-3gb.log` under `artifacts/material-parity`.
The old canonical package is unchanged and preserved in
`pre-position-followup-509dbf4`; its authenticated section baseline is complete.
The gap-survey dependency failure is now reconciled by undoing exactly the
mapping module's read-adapter import and requiring its entire remaining source
to retain the old hash. Mapping mutations still fail. Gap/session checks pass
7/7; both failed collectors now replay unchanged (16 composition groups / 1,032
observations and 38 membership groups / 1,902 observations). Separately, the
slider proof pointer now follows its moved integration test; all 106 canonical
proof entries resolve, with a missing-target negative control. Workflow/source/
conservation checks pass 6/6. These are preflight corrections, not a completed
canonical export or a reason to change original receipts in historical reports.

The subsequent cold export at `ab69de3` also terminated (exit 134), after about
19 minutes, at the 3 GiB V8 heap limit. Its terminal log is retained as
`position-followup-cold-export-ab69de3.log`. Repeated mark-compacts reclaimed
little memory; the exact allocation/retention owner is not yet identified.
The canonical manifest remains unchanged. Do not repeat this export unchanged
or describe it as waiting/running; conservation and freshness remain pending.
The existing runner now supports `ASTYLAR_AUDIT_PROGRESS=1`: eight lightweight
phase checkpoints report elapsed time and process memory to stderr. The CLI
transport test proves identical canonical bytes with tracing on/off and retains
unresolved, stale and malformed failure checks (1/1 passes). It also now copies
the evidence-session dependency into its isolated workspace. The next export
attempt must use these diagnostics; no exact allocation owner is proved yet.

Instrumented follow-up at `2e21c57` finished under a 4 GiB heap cap (exit 1):
construction 808 s, validation/evidence verification through 1,763 s, complete
export at 1,895 s. The session rehashed all 1,205 files / 89,148,435 bytes it read;
only two collectors were memoized, with ten memory hits. The resulting package
was **rejected**, not integrated: five bindings failed and unresolved groups rose
to 2,031. It is preserved in `failed-position-followup-2e21c57`, compressed SHA
`d99a9830b506dfb55d97aa6aadb7e8f24b87b5dd0b231dbff43a92a4951479e5`.
The three canonical files were restored from the authenticated predecessor;
the count at the top of this ledger remains 1,668.

All five invalid bindings (`ownerCaretInputs`, `reviewedInputs`,
`alignmentFontInputs`, `textAlignInputs`, `ltrAlignmentInputs`) reject the same
mapping-reader import change: recorded hash `c21d439f...`, current `51f017cc...`.
The earlier gap-specific reconciliation did not cover these consumers. Next
extend the existing exact import-only/full-source conservation proof to these
bindings, retaining historical receipts and rejecting any mapping-body change.
Replay the affected collectors before another full export. Do not rerun the
canonical export unchanged or accept the failed package as new evidence.

Binding reconciliation progress: the exact mapping-reader import transition is
now shared with caret and alignment validation. It requires the pinned historical
mapping hash and complete source equality after reversing only that import;
wrong files/hashes, mapping-body edits and unrelated additions still fail.
Caret records the actual current hash separately from its historical receipt.
The alignment projection also recognizes the exact already-integrated followup
import; alias/member mutations remain rejected. Cache/gap tests pass 7/7 and
alignment/gap tests pass 10/10. Full caret source replay passes all 4,050
observations (118 reviewed groups / 3,154 observations, 896 retained) and 13
negative controls, with canonical files unchanged. Direct collect-and-validate
replays now bind alignment/font 72 groups / 4,016 observations, text alignment
49 / 2,677, and LTR alignment 4 / 178.

The final `reviewedInputs` overlay dependency is now reconciled too. The reader
accepts only the pinned complete mapping source with the reviewed reader import
reversed; mapping receipts record actual current hashes separately. Historical
context conservation independently reconstructs both changed-source proofs and
rejects missing, duplicate or forged checks. Font snapshot conservation reverses
only the exact added reader branch/import, then requires the previous full-source
hash and unchanged complete observations. The exact followup orchestration import
is allowed; import aliases and unrelated retained-source changes still fail.
`node --test tests/material-parity/original-overlay-context-survey.spec.mjs tests/material-parity/disabled-ink-source-transition.spec.mjs`
passes 13/13, including all 91 original states / 200 owners and negative controls.
It took 171 seconds; a concurrent PowerShell process could not initialize CoreCLR
under memory pressure. The subsequent direct collect-and-validate replay used
`node --max-old-space-size=1536 --input-type=module` with
`collectReviewedInputAuditInputs` / `validateReviewedInputAuditInputs` against
`current-ancestry-audit/latest-report.json`: **134 groups / 3,325 observations**
bound, independent validation returned no errors, process exit 0.
All five previously rejected bindings have successful direct replay. The following
cold export and conservation checks supersede that binding-only checkpoint.

Cold export at `5c5d5e6` completed in 1,963.978 seconds (32.73 minutes).
Construction took 771.225 seconds; validation ended at 1,835.180 seconds.
The evidence session reverified 1,205 files / 89,149,474 bytes, with two collectors,
ten session hits and no invalidations. Exit 1 reports only **1,654 unattributed
resolved-style differences**; all five stale-binding errors are gone. Log:
`artifacts/material-parity/position-followup-export-5c5d5e6-progress.log`.
The generated package's decoded SHA-256 is
`0f8935c3a5a7b2b54195cb3402bb70cd357c33245aa5c9719e33a134ea64b1de`;
it is a conserved historical-evidence classification checkpoint, **not full audit
acceptance or current-browser evidence**.
`node --max-old-space-size=1536 scripts/check-material-position-canonical-conservation.mjs --followup`
passes: exactly 14 groups / 768 observations change, all other 8,469 complete
scalar rows remain identical, unresolved falls from 1,668 to 1,654, and control
evidence changes only in 48 authenticated producer receipts. Ordered scalar-row
SHA-256: `4398fb757eb9e5aa44bdf8fba4d0676391e13195e3294d336a3820637bbc78c2`.
Whole-report section reconciliation completed, reusing the saved predecessor
section hashes: one addition, nine changed sections, none removed. Complete
field-level comparison accounts for every remaining change:

- `sourceFingerprints`: 424 to 442 entries (17 followup dependencies and the
  moved slider integration proof), no removed entries, retained order unchanged.
  All 442 current LF-normalized hashes independently match disk. The 24 refreshed
  old receipts cover the reviewed followup producer/projection, evidence-session
  readers and bindings, progress instrumentation, test split and scratch retention.
- `controlLineBoxes`: only the same 48 producer-hash transitions already proved
  in control typography; every other field is unchanged.
- `summary`: authoring classifications +7, harness classifications -7, unresolved
  -14; no other summary fields change.
- `ownerCaretInputs`: only two current source hashes (mapping reader and producer)
  and the explicit mapping-import verification label change.
- `reviewedSourceBatchInputs`: only the producer hash and its derived motion
  report digest change. All observations remain identical; the full cold validator
  independently replays this binding. New report digest:
  `7c2cfbb0de3c8b4e4bc52c7b2752f3a2207bae1afc16e76e61556f5e77093d7b`.
- `focusedProofs`: one line advances 50 to 51; the slider integration proof moves
  from its old mixed suite at line 168 to the split integration suite at line 9.
  No proof text or membership changes.
- `environment`: installed consumer Angular changes **20.3.29 to 20.3.31**,
  independently confirmed on disk. This is the collector's installed environment,
  not a recapture: original browser assets remain hash-bound historical evidence.
  Current-browser acceptance requires fresh capture; do not infer it from this
  metadata update. Other environment fields are unchanged.
- Added `positionFollowupAuditInputs`: independently extracted and replayed with
  dependency-validated reuse (the full export above used cold collection);
  all 768 observations and the complete section match (no validation errors).

The authenticated section and field diffs are retained under
`artifacts/material-parity/position-followup-sections-5c5d5e6.json` and
`position-followup-metadata-5c5d5e6.json`. Together with the scalar/control check,
they account for the entire package; no raw captured inputs change. Compact index
import and verification pass: 8,483 scalar records, 132 source findings, 39,904
control/typography records, 389,202 occurrences, 1,654 unresolved; 69,653,983 bytes.
Full current `--check` and enforced browser acceptance remain
required at final acceptance; this still contains 1,654 unresolved signatures.

Small live samples are retained as `position-followup-validation-cpu-sample.log`
and `position-followup-validation-allocation-sample.log`; no heap dump was taken.
Selector exclusion checks were prominent in the CPU sample (GC 1,180/6,603
samples); the allocation sample observed inherited-font validation and heap
falling from 3.20 to 2.86 GiB. These are scoped performance observations, not a
proof of a leak or the exact owner of the preceding 3 GiB OOM.

Overlay runtime-probe status: the uncommitted draft
`src/parity/overlay-layout-stage.audit.spec.ts` has not reached browser execution.
Three focused Angular builds were stopped after build-worker memory growth
(roughly 3 GB, 5.3 GB and over 6 GB respectively); disabling source maps and a
768 MiB Go soft limit did not solve it. All three sessions are terminal, not
background work to poll. Do not repeat those builds unchanged or count the draft
as evidence. A separate native-browser check found that a 321.5 x 201.25 px
canvas has client size 322 x 201 and the equal-sized iframe's fixed 100% child
also measures 322 x 201. Thus `clientWidth` rounding alone does not demonstrate
unequal layout in this reduction. Full paired CSS/projection evidence and the
Angular build check remain outstanding; no core/fixture repair was attempted.

Build-scope follow-up: the CLI test filter selects one entry point, but the
original `tsconfig.spec.json` still supplies 359 compiler roots, including 69
specs. The installed Angular 20.0.6 builder passes that config separately to
compilation. The uncommitted `tsconfig.overlay-audit.json` limits compiler roots
to the existing overlay draft while inheriting Jasmine options. Config parsing
and `tsc --project tsconfig.overlay-audit.json --noEmit --incremental false`
pass (7.2 seconds, 768 MiB V8 cap). This does not prove the cause of the build's
memory growth or runtime parity. The narrowed browser-build attempt was
interrupted when the tool host closed; its process/session are absent and
`overlay-layout-narrow-build.log` contains only `Building...`. There is no
captured exit code or browser result. Do not count it as passed or still running.

The sections below retain the detailed root-cause evidence and implementation
order. Renderer/fixture repairs remain outside this audit's authorization.

This is an audit handoff, not authorization to implement fixes and not a claim
of completed input or output parity. It supplements the detailed
[62-item implementation inventory](material-input-equivalence-audit.md#root-cause-implementation-order).
It does not replace that inventory or drop its lower-priority findings.

The newer public reductions distinguish several independently demonstrated core
defects from Material authoring differences. Those distinctions change the order
of work: do not restore a composition and then tune it around known broken core
contracts, or treat a passing evidence verifier as corrected rendering.

## 1. Preserve real gestures across public updates

**Confirmed in public reductions.** An identical update on the reuse path, or an
unrelated sibling change on the rebuild path, can transfer native focus from the
canvas to its semantic counterpart. Babylon's blur handling then generates a
release while the user still holds the pointer. The core dispatches pointer-up
and, for buttons, premature activation. This is not merely missing active paint.

Owners: core reconciliation, semantic focus synchronization and device-input
integration. The [button causal proof](material-button-held-update-root-cause.md)
pins both paths and actually served instructions; the
[range reduction](material-public-range-drag-audit.md) independently records the
same release path. Preserve keyboard/assistive focus and genuine blur/cancel
semantics. Disabling semantic synchronization, suppressing public updates, or
moving gesture lifetime into the Material plugin is not a correction.

Acceptance for the future fix: replay both existing public matrices, then cover
real cancellation, owner removal/disable/replacement, dragging outside, repeated
updates and multiple surfaces. Verify native events, public events, pressed
identity and held paint at each boundary. Revisit the earlier pointer-focus
finding (inventory item 17) with this evidence; simply removing its transaction
guard could reproduce the proven premature release.

## 2. Route release to the captured owner

**Separately confirmed.** In all 16 no-update public range cases, the gesture
retains capture and native release/change, but release outside the hit target
loses the original owner's public pointer-up. The core runtime dispatches based
on the current hit rather than preserving captured-owner routing.

Owner: core interaction dispatch/capture. Preserve the distinction between
pointer-up delivery, click eligibility and cancellation; do not synthesize a
click whenever a captured gesture ends. Add release over another owner, outside
the surface, cancel/lost-capture and removal cases. Passing update preservation
does not close this independent defect.

## 3. Correct range paint ownership and ordering

**Confirmed for active track/thumb occlusion in the public reduction.** Generic
input material application replaces the range manager's interaction-only
material with an opaque, depth-writing white background. Active track and thumb
depths put them behind that owner and the root for the actual positive-Z camera.
The [passive scene and raster proof](material-public-range-paint-audit.md) retains
all-white candidate crops despite live presentation meshes, without mutating the
public application. Exact coplanar unfilled-track GPU behavior remains unproved.

Owners: core control/material composition and final paint-depth projection.
Define which layer owns the authored background, hit testing and presentation;
make general paint ordering consistent. Do not introduce a Material-only
transparent background, CSS displacement, private depth adjustment or a second
plugin convention. A range-manager-only guard is insufficient if subsequent
generic material application overrides it.

Acceptance: actual visible rasters with opaque ancestors, authored transparent
and opaque backgrounds, opacity zero, stacking, updates, DPR and host movement.
Mesh existence alone is not visibility. This proof does not establish the cause
of the Material black ring or swapped handles, or native range paint parity.

## 4. Share CSS-space range travel geometry

**Confirmed for the captured pointer paths and native appearance.** Independent
native endpoint rasters establish 144px thumb-center travel inside a 160px
control. The core pointer conversion instead divides by the entire 160px width.
The measured model predicts all 256 native moves; all 128 no-update candidate
moves follow the full-width model. Public event-local coordinates already match
the shared CSS coordinates. See the [travel proof](material-public-range-travel-audit.md).

Owners: core range used geometry, pointer mapping and presentation. Derive one
CSS-space travel contract and project only at paint time. Do not hard-code the
observed 8px inset, change step/domain values, or patch world-space coordinates.
Before selecting general metrics, extend width/height, native/custom appearance,
grab position, RTL/vertical, transforms and scroll coverage. This diagnosis is
not universal native thumb sizing or an explanation of overlapping-thumb choice.

## 5. Apply vertical alignment in its CSS formatting context

**Confirmed in the public reduction.** Core `positionTextMesh` interprets
`verticalAlign` as inner-box placement even for block/flex-item/absolute owners,
and approximates baseline as bottom. Explicit baseline and omission disagree
before Babylon projection. The [64-pair proof](material-public-vertical-align-audit.md)
retains 36 failing baseline-relative comparisons and a recording-projection
evaluation of the installed and source methods.

Owners: core formatting-context/line-box layout and text placement. Do not
replace the default with global centering or add text/world-space offsets.
Extend inline siblings, table cells, wrapping and updates. Separately reproduce
the original checkbox/radio/switch label compositions: this core defect is not
yet proved to cause those Material symptoms. In the non-inline reductions,
omission is already vertically correct and adding middle makes it worse.

## 6. Continue the other shared core tracks, not component calibration

The [public cursor reduction](material-public-cursor-defaults-audit.md) adds a
confirmed interaction-boundary defect: explicit resolved default becomes text
when owner-box selection prefers an owned text mesh. Preserve explicit cursor
intent in core pointer resolution. Separately review the documented legacy
button/label pointer defaults against the measured browser baseline. Neither
finding justifies unconditional pointer styles or per-fixture cursor patches.
Recheck actual owner/state targets; one passing family hover probe is insufficient.

Keep the detailed inventory's transform reference-box/units/origin/order,
transformed fixed containing blocks, intrinsic inline sizing, anonymous flex
text, positioned margins/heights, grid-none parsing, computed-font length
resolution, fallback fonts, line boxes and border color/alpha work. Use their
existing minimal proofs and extend composition coverage at the owning boundary.

The calendar span primitive passes; that evidence does not justify calling all
column spans unsupported. Restore and test the actual conditional table/week/
label composition rather than replacing it with manually calculated grid cells.

Input-stage observability is a prerequisite for attribution, not a license to
write a parallel CSS cascade in the harness. Preserve authored requests, local
normal/effective styles, computed/inherited values, used layout and retained
paint as separate evidence stages. The prepared
[72-group alignment/font adapter](material-alignment-font-source-adapter.md) and
[49-group text-alignment proposal](material-text-align-canonical-plan.md) are
classification work, not proof of equal computed values or repaired consumers.

## 7. Restore equivalent Material authoring alongside the owning fixes

Use the historical/input findings to restore the reference contract, not a new
visually calibrated representation. Each restoration needs paired input proof
and a renderer regression test if it exposes a core failure. Specifically:

- Range: restore 0–100/step 5, peer-dependent bounds and hit regions, and remove
  fixed halves and reliance on direct-mesh update bypass. Test both thumbs across
  the midpoint, including start=60/end=80 and start=20/end=40, plus keyboard and
  disabled/hover/held state. Native peer suppression is a separate authoring
  finding; do not assume that it alone diagnoses historical swapped handles.
- Text: restore component tokens, actual child/line-box structure and equivalent
  alignment requests. Remove label-middle and font/spacing substitutions only
  with a proof of the original composition, not a blanket reset.
- Calendar: retain original table/colspan, conditional month-label structure,
  text tokens, vectors, hidden descriptions and focus-reveal close control.
- Options, dialogs, sheets and snackbars: restore original message/action/list/
  label ownership and theme scope before attributing size or baseline symptoms
  to core. Do not copy sampled RGB values or use fixed sizes to simulate tokens.
- Plugin text: remove the competing tab-panel texture/baseline implementation
  in favor of core text ownership. Legitimate Material visuals and state
  orchestration remain plugin work, with CSS geometry and core resource lifetime.

The [slider history](material-slider-input-history.md) records what changed;
historical source facts alone are not browser bisect results or author intent.

## 8. Establish overlay position and lifecycle from authoritative CSS boxes

The connected-overlay path that projects mesh geometry and feeds it back into
authored CSS top is a confirmed ownership violation. Use an existing suitable
public CSS-layout query, or justify an API gap, instead of reusing rendered
output as layout input. Do not repair it with offsets, scale division, a flow
anchor, or plugin-specific world conventions.

**The proposed shared tooltip/snackbar low-position cause is still a hypothesis.**
For each popup, establish equivalent content, state and ancestry first; record
the core CSS box, containing block, scroll/collision decisions, projection,
clipping, paint order and viewport reachability. Distinguish an absent owner from
an off-screen, clipped or occluded owner. Tooltip missing center/wrap/structure
and forced-open benchmark states remain distinct from placement and blur.

Verify first-open/reopen, update, scroll, resize, DPR, real hover/focus/dismissal,
and surface-local modality. Preserve the different datepicker/timepicker focus
contracts. A passing isolated bottom-overlay primitive does not prove the
unequally authored Material bottom sheet, and changing its fixture size is not
a general rendering fix. Keep resource/lifecycle checks separate from rasters.

## 9. Preserve asymmetric borders in natural flow before removing sort paint substitution

The [complete sort structure review](material-sort-focus-structure.md) verifies
60 original cases. In eight focus cases, the reference paints an in-flow bottom
border while the candidate paints a separate absolute child under a fixed-height
relative host. State agreement does not justify that structural translation.
Commit `994da86b` introduced the host position and paint child together, but its
motivation has not been demonstrated.

The [equal-input public reduction](material-sort-focus-border-public-proof.md)
now reproduces a related core failure at two widths in two independent browser
runs: adding a 1px bottom border leaves the candidate flex owner and ancestor
1px too short, leaves the following sibling 1px too high, and shifts the content
up 0.5px. Initial and restored zero-border geometry matches. Normal/effective
style inspection retains the border request; the exact internal causal path
after that stage remains to be traced. Both browser runs fail unchanged
expectations, rather than accepting the current incorrect output.

Owner: core asymmetric border contribution, intrinsic/automatic flex sizing and
cross-axis positioning. The follow-up extracted-method proof demonstrates that
`calculateIntrinsicContainerHeight` in both repository and installed sources
doubles the first border-width scalar, losing bottom-only width and doubling
top-only width. This matches the public failure but is not yet its full runtime
call trace. Trace the reproduction through the actual installed path and
investigate cross-axis displacement separately. Also clarify the public catalog's
precise border-width value subset.

Future acceptance: preserve the public reduction, add text and real focus-state
coverage, verify border raster separately, then restore the Material border
authoring and remove the extra paint child plus its dependent host geometry as
one reviewed change. Do not correct sibling placement with another offset.
Proof commits: `1592ce3` (source structure) and `5c56000` (public reduction).
The six evidence/inventory checks for the reduction pass; the two browser tests
still fail in each run. No canonical attribution or full output parity claim is
made by this handoff addition.

Handoff addition verification:
`node --test tests/material-parity/sort-focus-structure.spec.mjs tests/material-parity/sort-focus-border-public-proof.spec.mjs`
passed **4/4**, exit 0, 1,694.4133ms, with no skips or cancellations. This
replays source and retained failing browser evidence, not new renderer fixes.

## Integration and completion gates

No renderer implementation has been performed by this handoff. Canonical scalar
classification and integration are now verified at the current checkpoint above;
full harness, browser and deliverable acceptance remain separate obligations.
Historical proposed counts below are not current counts. Do not roll back
unrelated work or alter a running verification job's inputs.

For each future fix: preserve the failing equivalent-input reproduction, test
the general correction at its owner, restore associated compensations with
explicit input review, verify the actual served package, then commit the bounded
result. Verify nearby compositions rather than closing every similar symptom
from a single primitive pass.

Audit completion still requires the full discovered audit harness and complete
unfiltered enforced parity matrix. Current package scripts define
`npm run parity:release:check` as general, TTS and Material enforced gates in
sequence. If an earlier gate prevents a later gate from executing, run and
record the missing constituent separately; do not count it as executed. Retain
honest output failures without loosening thresholds or implementing fixes under
audit scope. Input classifications, evidence-verifier passes and output-parity
results must remain separately reported.

## Handoff verification

The existing evidence suites were replayed unchanged; no extra documentary
validator or duplicate machine dataset was added:

```text
node --test --test-concurrency=1 tests/material-parity/button-held-update-evidence.spec.mjs tests/material-parity/public-range-drag-evidence.spec.mjs tests/material-parity/public-range-travel.spec.mjs tests/material-parity/public-range-paint.spec.mjs tests/material-parity/public-vertical-align-evidence.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Result: **24/24**, exit **0**, no failures, skips, cancellations or TODOs, in
**29,845.5369ms**. Log:
`artifacts/material-parity/field-host-flow-input-audit/root-cause-handoff-verification.log`.
These are evidence-replay and negative-control passes; the underlying public
rendering/interaction failures remain retained and unfixed. This is not a fresh
browser capture, the complete audit harness, or enforced output-parity acceptance.

## Audit integration follow-up after canonical regeneration

The canonical report at `6833850` retains **1,689 unresolved scalar groups**.
A complete authenticated streamed read confirms these are distributed across
many properties, including color (105 groups), background color (78), line
height (64), transform origin (59), position (58), box sizing (55), appearance
(54) and letter spacing (54). These are review signatures, not counts of core
bugs. The remaining groups and every original observation stay in the canonical
payload; this summary is not a replacement for their classification.

The separate **60 unresolved control-texture records** are all disabled-button
color. The [classifier diagnosis and prepared replay](material-disabled-button-ink.md)
identify an integer-only RGB guard rejecting the precise normalizer's fractional
channels. An in-memory one-regex correction passes the complete classifier for
all 60 authenticated original owners while preserving exact color values and
ten negative controls. This is an audit classifier defect, separate from the
underlying already-reviewed unequal foreground authoring. Integration must:

1. Wait for the active full legacy run to finish; preserve its complete result.
2. Apply only the demonstrated numeric-syntax correction, preserving alpha and
   all source, owner and stage requirements.
3. Explicitly account for that correction in historical-source conservation.
   `verifyAlignmentAuditProjection` currently requires the entire retained
   classifier to match the historical declaration. Do not bypass that check by
   treating arbitrary changed code or a fresh hash as equivalent.
4. Regenerate canonical evidence and verify exact affected membership plus
   unchanged unrelated records, followed by the full audit and enforced gates.

The [overlay ancestry check](material-position-input-population.md) establishes
that all 59 sheet/snackbar mapped absolute reference wrappers have fixed parents.
The candidate uses a directly fixed overlay. This rules out treating the keyword
mismatch alone as sufficient proof of a positioning defect; actual containing
blocks, surface boundaries, clipping and interaction remain separate obligations.

The [snackbar sensitivity proof](material-snackbar-placement-sensitivity.md)
demonstrates that its placement comparator accepts horizontal and size errors
when containment, bottom gap and semantics pass. This is a confirmed limitation
of that comparator, not a demonstrated full-harness false pass or a renderer
diagnosis. Add calibrated horizontal/size checks before relying on its green
result as complete geometry evidence. Keep visibility/raster proof separate.

## Legacy source-inventory assertion (now integrated)

The full 388-test run after case-index migration finished with 387 passes and
one failure: the source receipt test still expects 356 entries while the then
current builder supplies 392. All 356 expected paths remain; the original
308-file baseline order is preserved. The missing expectation comprises 36
reviewed batch, alignment, precision, root-background, line-box and gap/caret
dependencies. The later disabled-ink correction adds three more, for 395.

`tests/material-parity/source-inventory-assertion-preparation.spec.mjs` independently
enumerates those 39 additions and runs the entire existing test callback with
only five exact in-memory assertion changes. Reversing those substitutions must
restore the original callback. All original membership, receipt and visual-field
checks remain; every additional file's current digest is checked. Four negative
controls reject missing, duplicate, reordered or forged receipts.

`node --max-old-space-size=1024 --test tests/material-parity/source-inventory-assertion-preparation.spec.mjs`
passes **2/2**, no failures or skips, **8,062.6889 ms**. This prepares the exact
test correction; it does not change the checked-in legacy test or claim the full
suite is green. Apply the bounded assertion update after canonical regeneration
finishes, explicitly preserve the earlier nine case-index assertion migrations,
and rerun the affected conservation checks before the full suite.

Update: `b452ed6` applied this bounded assertion correction, preserving the
complete historical suite outside the nine receipt replacements and exact
inventory extension. The focused legacy assertion and conservation tests pass;
a fresh complete suite remains required. See
[the integration record](material-source-inventory-assertion-integration.md).

## CSS visibility support gap: preserve state semantics

The [remaining visibility census](material-visibility-input-population.md)
contains 17 groups / 668 observations. All compare browser computed `visible`
against a missing local candidate field; they must not be default-normalized
into equivalence. Across 138 tab/stepper observations, full reference ancestry
contains active hidden and visible state rules, even though the mapped text
node has no direct visibility declaration.

`scripts/audit-material-visibility-support.mjs` establishes a public input-support
gap: the current `StyleRule` interface, core validation allow-list and loaded-CSS
mapping lack `visibility`. A package-root TypeScript reduction rejects
`visibility: 'hidden'` with TS2353 while accepting `overflow: 'hidden'`. The
installed and source interfaces are compared in full; the imported type must
resolve to its actual 87 properties rather than `any`. Machine evidence is
`docs/material-visibility-support.json`.

The first demonstrated boundary here is public authoring/support, before layout
or Babylon projection. This does not prove a raster fault for omitted visible
values, explain the missing snackbar, or classify every census row. Implement
the general CSS visibility contract before replacing reference state rules with
conditional text or custom plugin painting. Prove layout retention, inherited
hidden state, explicit visible descendants, paint suppression and interaction
behavior with equivalent public-API/browser fixtures. Audit tabs' private text
painting separately; do not add a component-specific visibility workaround.

The [public browser reduction](material-public-visibility-audit.md) now confirms
hidden boxes remain painted and hoverable at DPR 1 and 2, including inherited
hiding. The omitted/explicit-visible controls match at the sampled points.
This is evidence of the unsupported core contract, not a Material overlay cause.

The [complete owner ancestry replay](material-visibility-ancestry.md) extends
the trace to all 668 observations / 646 distinct captured trees. Only tabs and
stepper (138 observations) have ancestor visibility declarations. The other
15 groups / 530 observations have none, including snackbar and tooltip. Do not
attribute their placement or absence to an observed hidden rule. Classify their
visible-state representation separately from the missing hidden-state capability;
retain geometry, clipping, lifecycle and custom-paint investigations.

The [complete panel-state replay](material-panel-state-ownership.md) checks all
138 tab/stepper cases, including inactive owners and bidirectional header links.
Stepper retains two reference text nodes, one hidden; tabs retains two outer
panels but only mounts active text. Both candidate implementations substitute
one owner. Tabs additionally bypasses core text paint through a custom texture.
Classify these structural substitutions as application/plugin authoring defects,
separate from the core visibility support gap. The benchmark pins tab phase to 1;
it supplies no proof of live intermediate animation. Restore equivalent owner
structure only after general core support is proven, not through another custom
paint or offset adjustment.
