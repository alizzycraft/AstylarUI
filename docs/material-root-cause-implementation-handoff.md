# Material audit: evidence-led implementation priorities

## Current audit checkpoint — September 25

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
