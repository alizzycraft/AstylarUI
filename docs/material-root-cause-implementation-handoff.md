# Material audit: evidence-led implementation priorities

## Current audit checkpoint — September 24

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

No implementation has been performed by this handoff. The main audit still has
unresolved classifications and pending canonical integration; proposed group
reductions must not be reported as accepted current counts. Do not roll back
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
