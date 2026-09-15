# Material input audit: root-cause evidence

This is an investigation record, not a declaration of completed parity or a renderer fix.
The machine report is generated separately from the full benchmark output.

## Fixed descendants ignore identity-transformed containing blocks

The [public-package context proof](material-identity-transform-context-audit.json)
separates containing-block placement from stacking. Two DPR1 runs each finish
with **5 failing / 9 passing** trials and identical structured observations.
HTML and AstylarUI receive the same trees and declarations. With `translateZ(0px)`,
an identity matrix, `translate(0px)`, `scale(1)` or `rotate(0deg)`, the browser's
fixed child is at **85,67**, while AstylarUI leaves it at **5,7**. The host remains
correct at **80,60 / 100x100**. Omitted/`none` fixed-child controls both pass.

All seven stacking controls pass geometry and final interior pixel checks:
the high-z nested red child wins without a transform; the blue sibling wins
with an identity transform. This rules out a blanket claim that identity
stacking is broken. It also prevents attributing every failure to unsupported
`translateZ`/matrix parsing: supported 2D identity functions fail fixed placement
as well.

The owning rule is `ElementDimensionService.resolveLayoutParent` (line 40),
introduced by `d3ef6dc3` ("anchor fixed elements to viewport"). It unconditionally
returns `root-body` for fixed elements. `ElementCreationService` consumes that
parent before CSS dimensions and retained layout-parent identity are established.
The core fix must select the correct CSS containing block; Material-specific
offsets or plugin-owned layout would bypass the cause.

The diagnostic spec compiles and preserves the five failing parity assertions.
The separate consumer production build exits **0**, generates its bundle in
**38.401 s** and prerenders **2 routes**. Both browser runs report empty renderer
diagnostics and dispose all surface meshes/materials/textures. The existing
NG0914 zoneless/Zone.js host warning is disclosed. DPR2 candidate evidence,
nested/update/scroll cases and attribution of the original Material observations
remain pending. No production renderer or canonical fixture was changed.

## Identity transform authorship: complete captured population

The [authorship survey](material-identity-transform-authorship-survey.json)
checks all **140** identity/omission cases against their original case lists.
Every case has exactly one captured explicit `translateZ(0px)` reference rule:
`.mat-ripple:not(:empty)` (**52 core**), the Material toggle group rule (**68**),
or `.mdc-linear-progress` (**20**). No candidate transform request or normal/
interaction resolved transform is recorded for those elements. Current installed
Material source rules independently match these captured declarations.

This establishes captured input asymmetry, not a browser-initial-value default.
It does **not** yet establish full candidate context ownership or a visible
failure in each fixture. In particular, progress-bar uses a custom plugin node;
its internal behavior must be inspected rather than inferred from omitted host
data. The three groups remain unresolved. No classification or renderer changes
are made by this survey. The record includes every case ID, exact commands,
source hashes/locations and the next ownership investigations.

## Identity transform omission: audit-rule correction

The [identity-transform evidence](material-identity-transform-omission-audit.json)
now includes a failing collector regression (**0/1**, **1,114.6511 ms**) followed
by **4/4** passing focused tests (**10,938.1738 ms**). The policy no longer treats
an identity matrix as an omitted transform. Equal explicit transforms and the
separate `none`/omission control remain; no candidate semantics are invented.

The focused captured-population replay retains all **140 observations** and
their exact case lists across core, button-toggle and progress-bar. Both DPR
browser controls replay independently. The four-test file is registered in the
complete harness, and source provenance now includes **116 files**. Prior-index
checks pass **18/18** (**157,711.651 ms**, no failures, skips or cancellations).
The complete frozen raw replay exits **0** with all expected assertions: **8,339
style groups**, **386,891 occurrences**, **30,043 root proofs** and **2,888
container-caret proofs** remain. The three identity-transform groups are now
unresolved, increasing the unresolved total from **3,210 to 3,213**. Strict
validation rejects precisely those 3,213 unresolved attributions; assertion
success does not establish input equivalence. No canonical reports were written.
Original input ownership, transform-origin review, complete harness, real report
packaging and final enforced parity remain pending.

## Identity transform is not omitted transform (historical read-only investigation)

The [identity-transform record](material-identity-transform-omission-audit.json)
finds **140** raw reference identity matrices paired with omitted candidate
transforms: **52 core**, **68 button-toggle**, and **20 progress-bar** cases.
The current scalar policy, introduced in `5e3ac33a`, labels that pair equivalent
without containing-block or stacking evidence.

Two identical Chrome **152.0.7977.76** runs at **DPR 1 and 2** demonstrate why
that general assumption is false. Changing only the host transform from omitted/
none to an identity matrix, zero translation, or unit scale keeps its own box
at **80,60 / 100x100**, but moves a fixed child from **5,7** to **85,67**. A separate
overlap control reverses the topmost hit element because identity creates a
stacking context. Restoring none/omission restores both behaviors. This matches
[CSS Transforms' rendering model](https://www.w3.org/TR/2019/CR-css-transforms-1-20190214/#transform-rendering).

The raw population and every case identity remain recorded. This is a confirmed
audit-assumption defect, not yet a diagnosis of candidate rendering or evidence
that every listed comparison visibly fails. Add the failing collector regression,
remove the unsupported waiver, and replay the population before attributing its
original authored intent and core ownership. Review the separate transform-origin
guard on its own merits; this witness does not itself prove an origin mismatch.
No renderer, canonical fixture or classification rule changed in this increment.

## Lossless streamed report transport (full capture verified)

The [transport evidence](material-input-audit-stream-transport.json) records a
bounded writer and exact-byte verifier for the existing ordinary JSON/gzip v1
format. No observation, ancestry path or repeated value is removed. The verifier
compares the full decompressed stream against regenerated canonical bytes; the
integrity hashes are additional checks, not replacements for content comparison.

The existing six codec tests and seven streaming tests pass **13/13**
(**830.5891 ms**). A forced aggregate-string boundary rejects the legacy encoder
while the streamed writer and checker pass. Native JSON differential controls
cover Unicode, property/array order, special keys and omission semantics;
negative controls reject stale nested data, corrupt transport and noncanonical
bytes with self-consistent metadata.

Two synthetic scale runs preserve **536,877,093 uncompressed bytes**, above the
runtime **536,870,888** string limit, with identical **527,781-byte** gzip payloads.
The runs complete in **5,015.0817 / 5,802.4787 ms**, with reported process peak RSS
**91,564 / 91,868 KiB**. This is a repeated-leaf scale proof, not the real audit.
Full captured-audit transport verification now exits **0**, retaining and
byte-checking **1,532,988,071 uncompressed bytes** in a **45,221,653-byte** gzip
payload. Encoding plus checking takes **234,613.2947 ms**; process peak RSS is
**3,791,020 KiB**, including the resident full audit. The report still contains
**30,043 root proofs**, **386,891 style occurrences**, and **3,210 unresolved
attributions**. This is transport success, not input-equivalence acceptance.
The maintained CLI now awaits the stream writer/checker in both generation and
`--check`. Its command-boundary regression first fails on aggregate serialization
(**0/1**, **218.4852 ms**), then passes after integration (**1/1**, **477.5883 ms**).
Combined codec, stream and command tests pass **14/14** (**1,277.9925 ms**).
The command still reports unresolved findings with exit **1**, rejects changed
nested data and unsafe manifests, and does not overwrite evidence in check mode.
This focused command proof substitutes only a small collector fixture; it is not
the final real-report CLI run. Both new test files are registered in the complete
harness, and all five transport/test sources are now fingerprinted (**114 total**).
All **85** fingerprints in **12** rolling indices match; prior-index checks pass
**18/18** (**117,457.886 ms**). Canonical report files are untouched. Exact hashes, commands, scope and
pending complete-harness/real-report/final-parity gates are in the transport record.
The legacy small-report decoder retains its string-size limit; the new checker
needs neither a second complete report object nor a new JSON parser.

## Root-proof validation string limit (focused correction)

The [serialization-boundary record](material-root-proof-validation-audit.json)
isolates the full replay failure to whole-array JSON serialization, not missing
input evidence. The focused regression fails first (**0/1**, **2,655.9084 ms**).
Validation now compares every full, ordered proof against the independent replay
one entry at a time, preserving JSON comparison semantics without constructing
one aggregate string. Existing grouped owner and complete-case checks remain.

All **6/6** focused tests pass (**5,230.0824 ms**). Controls reject changed nested
values at first/middle/last positions, reordered, missing, extra, sparse and
non-array evidence, and accept the ordinary JSON transport round trip. The
prior-index and existing root-proof checks pass **18/18** (**157,192.4884 ms**).
The complete raw replay now exits **0**, including strict validation's expected
rejection of **3,210 unresolved attributions**. All **386,891 occurrences** and
**8,339 groups** remain; every raw inherited-omission occurrence map and all
**468 root group case sets** match independently collected evidence. The report
contains **30,043 root proofs** and retains **2,888 container-caret proofs**.
The reduction from the last successful **3,534** unresolved count is exactly
the **324** newly attributed root observation-stage groups. It is not a claim
of input equivalence, inherited candidate behavior, or renderer correction.
The exact replay command and result are in the serialization-boundary record.
The complete existing harness passes **644/644**, with no failures, cancellations
or skips (**835,011.7779 ms**), using the full package file list and file
concurrency one. It includes the four inherited-root guard and two bounded-
validation tests. The seven new standalone streaming tests are not yet in that
file list and retain their separate **13/13** codec/stream verification. This
harness pass is not final enforced renderer parity, which remains pending.

Report packaging is a separate unresolved boundary: the current codec still
stringifies and parses the whole report, and explicitly rejects an uncompressed
payload above the runtime string limit. The expanded root array alone exceeds
that boundary. A lossless bounded transport is required; removing observations
or skipping integrity checks is not an acceptable correction.

## Guarded root inherited-property attribution (focused verification)

The grouped collector extension now attributes the nine surveyed properties
through the existing root observation-stage proof. It rejects explicit default
requests, changed ancestry, font/whitespace/word-wrap aliases, incomplete stages
and fabricated computed/raster claims. Captured spacing serializations remain
in the reference paths and `referenceComputed`; only the existing scalar
comparison uses zero aliases. Candidate local omissions remain unchanged.

The new positive test first failed (**0/1**, **2,019.1478 ms**) because the
collector returned zero proofs for the nine properties. After the extension,
the four focused tests pass (**4/4**, **2,401.9146 ms**); combined root,
line-height and inherited-property controls pass **21/21** (**46,191.0288 ms**).
The complete guarded index covers **30,043** observations across **2,311 cases**
and **468 groups**, including **20,799** added observations / **324 groups**.
The test independently rejoins every case/property identity from raw trees.

Refreshed prior-index checks pass **13/13** (**125,767.8869 ms**), and all **90**
current fingerprints across 12 rolling indices and this proof match. The
all-family replay builds the report and passes exact raw occurrence and root
case-set assertions, then exits **1** during strict validation with
`RangeError: Invalid string length` at `input-equivalence-audit.mjs:294`.
The validator attempts to stringify the entire expanded root-proof array.
No completed validation or post-extension unresolved count is claimed.

Correct this serialization boundary with a bounded, order-preserving comparison
and regression proof; do not truncate evidence or skip the independent replay.
Final report serialization needs a separate scale check. Expanded complete-
harness, report packaging and final enforced parity remain pending. This
is instrumentation, not a renderer or fixture change, and does not certify
candidate inheritance, descendant rendering, pointer targets or visibility.

## Root inherited-property population (historical read-only investigation)

The [grouped root survey](material-root-inherited-default-survey.json) covers
all nine inherited properties exposed by the policy correction: font style,
letter and word spacing, text transformation, whitespace, overflow wrapping,
word breaking, pointer events and visibility. Two identical runs check all
**2,311 cases** and their raw tree hashes. Every captured reference frame and
empty section has the same computed values, while the candidate page and
section omit them in normal, comparison and interaction declaration stages.
Neither captured path has relevant applicable requests or inline declarations.
An independent raw scalar check confirms all **20,799** root/property
observations across **36 families** without changing their values.

This is a population survey, not a new equivalence rule or candidate computed
style proof. It supports one grouped extension of the existing guarded root
observation-stage evidence, with per-property request/ancestry rejection tests.
Do not infer visibility, hit targets, wrapping, typography or descendant paint
from local omissions. The stricter collector and scalar joins must still reject
incomplete ancestry, ambiguous mappings, overrides and unsupported evidence.
No current classifications or renderer/fixture inputs change in this increment.

## Inherited-default policy correction (full replay verified)

The shared fallback no longer treats omitted `fontStyle`, `letterSpacing`,
`wordSpacing`, `textTransform`, `whiteSpace`, `overflowWrap`, `wordBreak`,
`pointerEvents` or `visibility` as proven initial values. Both policy consumers
were inspected. Existing guarded retained-typography attribution remains a
declaration-versus-retained-stage finding, never an inherited-value substitute.
Production renderer behavior and canonical comparison inputs are unchanged.

The grouped regression failed before the correction (**0/1**, **888.0201 ms**).
After correction all **5/5** tests pass (**3,768.6645 ms**), covering the nine
explicit/omitted cases, explicit-value controls, browser ancestry changes at
DPR1/2, and every raw property/value pair and per-property case inventory.
Combined normalization controls pass **9/9** (**14,688.6247 ms**). One legacy
test's inputs were preserved while its unsupported omitted-default assertions
were corrected; explicit normal/zero tracking equivalence remains supported.

Refreshed index and regression checks report **21/21 pass** (**100,816.1451 ms**),
including one file with no matching subtests. All **88** current fingerprints
across 12 rolling indices and this correction match the source files.

The complete 2,311-case replay exits **0** and independently matches every raw
omitted-property family/element/value occurrence for all nine properties.
All **386,891** style observations remain, now grouped into **8,339** differences:
**526** authoring, **2,678** equivalent representation, **312** limitations and
**4,823** harness findings. Strict acceptance correctly rejects **3,534**
unresolved groups, an increase of **992** from the pre-correction replay; this
is exposed uncertainty, not a renderer regression or a count of new defects.

The earlier guarded evidence remains: **9,244** root-initial proofs,
**2,888** container-caret proofs and all **6,938** raw caret omissions. Tracking
omissions retain **577** field-token and **600** button-host authoring
observations. Exact retained-typography stage evidence attributes **212**
observations each for font style, word spacing and text transform, and **128**
for tracking; these do not synthesize candidate inherited values. The machine
record preserves the full per-property attribution breakdown and exact command.

The first replay attempt failed because the verification command incorrectly
stripped units from nonzero tracking values. Correcting only that command and
rerunning the complete builder/validator passes; audit inputs were not changed.
The complete expanded harness exits **0**, **638/638 pass**, with no failures,
skips or cancellations (**841,418.1311 ms**). It uses the complete registered
file list with serial scheduling only; it does not include the subsequent
unregistered root-inherited-property proof. Final enforced parity and remaining
inherited-stage attribution are not yet verified.
Historical pre-correction evidence and commands are retained below and in the
machine record; they must not be read as current equivalence assertions.

## Inherited-default equivalence investigation (historical baseline)

The [inherited-default investigation](material-inherited-default-assumption-audit.json)
demonstrates the same diagnostic assumption beyond caret color. The policy
formerly unconditionally accepted omitted `fontStyle`, `letterSpacing`, `wordSpacing`,
`textTransform`, `whiteSpace`, `overflowWrap`, `wordBreak`, `pointerEvents` and
`visibility` when the reference computes to the listed default. A synthetic
explicit reference request is classified equivalent without candidate ancestry.

The repeated raw survey covers all **2,311 cases** for every property. Generic
policy eligibility is **6,938** observations each for font style, word spacing,
text transform, word break and visibility; **4,696** for letter spacing;
**5,836** for whitespace; **6,920** for overflow wrapping; and **6,693** for
pointer events. These are property observations, not distinct defects or final
classifications: earlier guarded classifiers may already attribute some cases.
The machine record preserves the 17 raw value probes, per-property element
inventories and complete unique-case hashes. Full-tree attribution remains due.

Two identical runs exit **0**, each covering all nine properties at **DPR1 and
DPR2**. An ancestor change causes omitted child declarations to inherit the new
value while explicit defaults retain their value; removing the ancestor request
restores the original observations. This proves the fallback policy lacks
necessary evidence. It does not prove incorrect candidate computed values,
visible pixels, pointer targeting or a defect in every real comparison.

Treat these as one related policy investigation: inventory both consumers of
`implicitReferenceValues`, separate inherited omission from legitimate explicit
aliases and non-inherited defaults, add grouped regression coverage, and review
the actual full comparison/state population. Do not discard explicit normal/zero
tracking evidence merely because omission is a different question. Do not add
fixture defaults or a showcase inheritance implementation. The current policy
was unchanged by that documentation-only finding; population attribution remained
pending. Source history and exact repeatable command are in the machine record.

## Caret-color scalar suppression corrected (full replay verified)

The retention regression failed first because the explicit-auto observation
was missing (**0/1**, **895.7276 ms**), then failed after removing only the
filter because the fallback still claimed equivalence (**0/1**, **896.1011 ms**).
Removing both shortcuts yields **4/4 pass**, **3,203.6736 ms**, including the
complete exposure index and DPR1/2 sensitivity. Prior guarded evidence and
case/source indices pass **22/22**, **102,529.7141 ms**. Full replay exits **0**:
all **229 caret-color/local-omission groups / 6,938 occurrences** match the
independent raw value/count population. The report now retains **8,278 groups /
386,891 occurrences**, an increase of exactly **1,371 occurrences**. Strict
validation rejects it solely for **2,542 unresolved attributions** (previously
2,499). The root initial, guarded container-caret and exposed line-height
populations remain unchanged. The expanded complete harness passes **633/633**,
exit **0**, no failures/skips/cancellations, **684,464.6459 ms**. This does not
include the subsequent inherited-default diagnostic or replace the final
enforced rendering matrix.
Correction commit: `be03629`, pushed to `codex/material-ui-showcase`.
No renderer or canonical
comparison inputs changed. The investigation below records the historical
blind spot, not a claim that the now-removed shortcut remains active.

The [caret-color omission investigation](material-caret-color-omission-audit.json)
identifies a separate unsafe shortcut at `input-equivalence-audit.mjs:1776`:
when browser computed caret color equals candidate text color, an omitted
candidate caret declaration disappears before ancestry review. The fallback
classifier at line 1612 repeats the same assumption. A synthetic explicit
reference `caret-color:auto` request is suppressed even without candidate
ancestry evidence. The input remains unmodified; the report remains incomplete.

At **DPR1 and DPR2**, two browser inputs with equal blue text initially have
equal blue caret colors. After their parent requests red caret color, explicit
auto stays blue while omission inherits red; removing the ancestor request
restores the initial observation. This confirms why text-color equality alone
cannot prove caret equivalence. It does not establish Astylar's computed or
painted caret behavior.

Two identical read-only survey runs exit **0**. Across all **2,311 cases**, the
actual audit builder suppresses **10 of 37 observed value pairs**, affecting
**25 element groups / 1,371 occurrences**. Full sorted case-list hashes and raw
values are recorded. None has a direct captured scalar caret/all request;
ancestor declarations, scalar capture limitations and state coverage still
require review. These counts describe audit exposure, not confirmed rendering
defects. The existing guarded container-caret evidence remains separate.

History traces the filter to `5e3ac33a`; `6dae8bd6` narrowed the fallback
classifier to matching text color without addressing inheritance. Both shortcuts
have now been removed under the retention regression. Replay must verify every
exposed observation without default injection or fixture edits. **2,499
unresolved** is the previous verified baseline, not a post-correction result.

## Guarded root line-height attribution (full replay verified)

The root initial-style collector now also records `lineHeight: normal` versus
omitted local declarations. It requires both captured reference ancestors to
compute to normal, all candidate page/section local stages to omit the property,
and no relevant line-height/font/reset/motion requests. Explicit requests—even
normal ones—changed ancestor values, incomplete stages and forged computed or
raster claims reject attribution. The scalar remains recorded as a diagnostic
stage mismatch; normal line-box metrics and descendant text remain separate.

The real captured-root positive regression failed before the extension (**0/1**,
**1,433.3413 ms**). Focused verification now passes **16/16**, **22,813.6322 ms**,
including **9,244 root observations / 144 indexed groups**, existing adverse and
forgery cases, and DPR1/2 browser sensitivity. All **84 fingerprints / 12 source
indices** match. Prior case/source index checks pass **13/13**, **74,257.1274 ms**.
The complete all-family replay exits **0**: all indexed identities, values,
counts and complete case-list hashes match. All **8,235 raw groups / 385,520
occurrences**, including all **5,000** exposed normal/omitted line-height
observations, remain. Strict validation still rejects the incomplete audit for
**2,499 unresolved attributions** (previously **2,535**); `inputEquivalent` remains
false. The expanded complete harness passes **629/629**, exit **0**, no
failures/skips/cancellations, **675,878.9266 ms**. This includes every file in
the current package harness, run serially, and does not replace the final
enforced rendering matrix. Attribution increment: `e325304`, pushed to
`codex/material-ui-showcase`. Exact commands and results are in
[the root index](material-root-initial-style-audit.json).
No production renderer or canonical fixture changed.

## Root text-property survey after exposing line-height omissions

The [read-only root survey](material-root-text-default-survey.json) checks all
**2,311 unique cases** and their raw paired tree hashes. The captured frame and
empty section compute to normal font style, whitespace, word breaking, overflow
wrapping, letter spacing and line height, with no text transformation and clipped
text overflow. The candidate page and section omit these eight properties in all
three local inspection stages. No relevant captured inline or applicable rule
requests were found on these nodes. All cases share this same observation pattern.
Two runs exit **0**, **8,637.4032 / 8,891.8482 ms**, with identical observations.

This is exploratory stage evidence, not computed candidate or renderer parity.
Next, extend the guarded root initial-style proof specifically to line height,
rejecting explicit or changed ancestor requests and preserving the normal/omitted
scalar. Other surveyed properties still need their own inheritance and formatting
context assessment. Do not treat omitted tracking as an explicit zero request.
No production, canonical input, or audit classification changed in this survey.

## Line-height audit filter correction and complete replay

The unconditional `normal`/omitted-local acceptance is now removed from the
audit's `equivalentValue` predicate. The desired missing-observation regression
failed before this edit (**0/1**, exit **1**, **1,001.0703 ms**) and passes after
it (**1/1**, exit **0**, **898.1629 ms**). The complete focused file passes
**4/4**, exit **0**, **3,059.0005 ms**, retaining DPR1/2 ancestor sensitivity and
independently checking all **5,000 observations / 85 indexed element groups**.
It is registered in the package harness and main report proof/source inventory.

The complete replay exits **0** and preserves all 5,000 observations as **92
report signatures**. **85 signatures / 4,908 occurrences** remain unresolved;
the other **seven signatures / 92 occurrences** have existing independently
reviewed diagnostic-stage mismatch evidence. All 85 raw element populations,
complete case-list hashes, occurrence totals and report sample memberships are
checked. Report totals increase to **8,235 groups / 385,520 occurrences**;
classification totals are **526 authoring / 3,670 equivalent / 312 documented
limitation / 3,727 harness**, with **131 source findings / 105 fingerprints**.
Strict validation rejects solely for **2,535 unresolved attributions**, up from
2,450. Increased counts are retained rather than normalized away.

Prior case-index checks pass (17 matching assertions plus one zero-match file,
TAP **18/18**, **159,868.5399 ms**). A separate fingerprint check exposed a stale
root-style index test-file hash, dating from `40945a1` and not refreshed by
`e0cad9c`. The root index now has an explicit regression covering its linked case
source, 6,933 observations, 108 groups and seven fingerprints. It failed for the
stale hash before refresh (**0/1**, **16,317.183 ms**); the complete root-style
file then passes **5/5**, **15,726.2943 ms**. All **83 source fingerprints / 12
affected indices** also pass a direct independent hash check. This is
instrumentation/evidence work only, not a renderer or canonical fixture change.
The complete post-correction harness passes **626/626**, exit **0**,
**679,749.22 ms**, no failures/skips/cancellations. This precedes the separate
root line-height attribution extension; final enforced parity is outstanding.
The historical section below describes the pre-correction filter.

## Audit blind spot: unconditional normal line-height omission (historical)

The [line-height omission proof](material-line-height-omission-audit.json) identifies
an unsafe shortcut at `input-equivalence-audit.mjs:1777`: browser computed
`line-height:normal` versus an omitted candidate local declaration returns
equivalent before authored requests or ancestry are reviewed. A synthetic scalar
case with an explicit reference `normal` request is suppressed. This is a
confirmed **audit filter defect**, not a confirmed Astylar rendering defect or
a claim that overall audit acceptance currently passes.

Browser controls at DPR1/2 initially both have 18px line boxes. After setting
their parent's line-height to 40px, explicit `normal` stays 18px while omission
inherits a 40px line box; removing the ancestor override restores both. The
focused command `node --test tests/material-parity/line-height-omission-sensitivity.spec.mjs`
passes **4/4 twice**, **3,401.5677 ms / 3,344.4026 ms**, with identical observations.
The first test deliberately characterizes the current blind spot and must be
inverted when correcting it, not retained as desired behavior.

The frozen capture has **5,000 matching observations / 85 element groups**;
**872 observations / 14 groups** include direct reference font/line-height/all
requests. These counts are exposure, not winning-cascade or visible-defect claims.
The linked index preserves complete case-list hashes and the raw capture hash.
Git blame traces the shortcut to initial audit commit `5e3ac33a` (source history,
not a runtime bisect). The current 2,450 unresolved count excludes these filtered
observations and must not be treated as completeness evidence.

Prioritize removing this unconditional acceptance after the current harness
terminates, then replay and classify the exposed inputs using exact ancestry
and declaration ownership. Preserve separate natural-line-box and font-metrics
findings; do not substitute normal metrics, change canonical input, or tune the
new totals back down. The standalone diagnostic is not included in the currently
running expanded harness. No production or canonical input changed, and the
filter remains unchanged in this evidence-only increment.

## Complete field-host weight/tracking request attribution

The [guarded case index](material-field-host-weight-tracking-audit.json) covers
**577 captured cases / 1,154 property observations / 12 groups** across
autocomplete, datepicker, form-field, input, select and timepicker. Independent
host typography mapping supplies the captured page/section/host paths; the new
collector then checks weight and tracking declarations separately. Reference
hosts explicitly request the original Material component/system token chains;
candidate hosts and both ancestors omit the requests in authoring and all three
captured local style stages. These are authoring omissions, not justification
for new child offsets or literal replacements for tokens.

The standalone collector and all raw scalar joins pass **4/4**, **29,317.6998 ms**.
The main report now includes the collector and replays it independently during
validation; forged classifications, reviewed cases and computed/theme-origin/
descendant/raster claims are rejected. The first integrated run passed 4/5:
its positive validator exposed three supplemental collection errors from the
new test's default directory. The test now supplies the pinned current-ancestry
supplement directory without weakening the assertion. The final integrated
tests pass **5/5**, exit **0**, **135,445.4312 ms**, including all raw scalar joins,
the durable case index, seven source hashes and seven forged-report mutations.
Prior-index, source-fingerprint, root-style and browser-token checks also pass
**18/18**, exit **0**, **53,846.3944 ms**, no failures/skips/cancellations.
The complete all-family replay now exits **0**: all **1,154 proofs / 12 groups**
match exact indexed values, classifications, occurrence and unique-case counts,
and full sorted case-list hashes. The raw **8,143 groups / 380,520 occurrences**
are unchanged. Classification totals are **526 authoring / 3,670 equivalent /
312 documented limitation / 3,635 harness**, with **131 source findings / 104
source fingerprints**. Strict validation rejects the still-incomplete audit
solely for **2,450 unresolved attributions**, down from 2,462. The expanded
complete harness finished **622/622**, exit **0**, **687,692.6543 ms**, with no
failures, skips or cancellations. It used the complete package file set with
serial scheduling only. This predates the line-height filter correction and
does not include its standalone diagnostic. It is not final enforced parity or
input-equivalence acceptance. Production and canonical fixtures are unchanged.

## Field-host weight and tracking: token requests versus omission

The [reference token-origin survey](material-field-host-token-origin-survey.json)
now confirms one actual frozen case: autocomplete/light/desktop/DPR1 has a
16px root font, inherited system token `.031rem`, no component tracking override,
and host computed tracking `0.496px`. Root/frame computed tracking stays `normal`.
The live served stylesheet is byte-identical to the frozen file; its `html` rule
owns `.031rem` and system weight `400`. This does not extend token-origin proof
to every family/theme/state or to Astylar consumers. The full case index retains
`themeTokenOriginVerified:false`. Preserve rem/token dependencies instead of
replacing the request with the measured pixel value.

The [standalone browser proof](material-field-host-token-sensitivity-audit.json)
extracts the installed Material host's exact `font-weight` and `letter-spacing`
token requests. Both explicit-token and omitted controls initially compute to
`400` / `0.496px`. Changing ancestor weight/tracking separates them: the omitted
control inherits `700` / `2px`, while the token-controlled host retains its own
requests. System-token changes and component-token overrides affect only the
explicit control. Removing overrides restores fallback; invalid component tokens
cause inherited-property fallback, not selection of the missing-token fallback.
Inherited and explicitly styled descendants are checked independently.

`node --test tests/material-parity/field-host-token-sensitivity.spec.mjs` passes
**2/2 twice**, **1,472.3743 ms / 1,517.7257 ms**, Chrome **152.0.7977.76**, DPR
**1 and 2**. This is browser sensitivity evidence with synthetic token values,
not an Astylar computed-style emulator or a core defect reproduction. The earlier
615-test harness did not include this newly added standalone file.

Current `.field-shell` authoring at `astylar.component.ts:540` and the initial
showcase commit `2f44011` omit these properties in that rule. This source history
is not a runtime bisect or a complete cascade proof. The guarded full-capture
attribution above now checks all six form-field families. Actual theme-token
provenance and descendant consumers remain separate obligations. Do not normalize `400` or
`0.496px` into omissions or substitute literal values for the original tokens.
No production inputs changed and no existing audit discrepancy was reclassified.

## Root initial/inherited observations are not local declarations

The [guarded root-style index](material-root-initial-style-audit.json) joins the
complete exploratory survey to a dedicated collector: **2,311 roots / 6,933
property observations** for `font-weight`, `text-align` and `vertical-align`.
It requires unique empty-section identity, complete captured frame/page ancestry,
reference context, absent competing requests and all three candidate declaration
stages. It diagnoses an **observation-stage mismatch**, not correct candidate
defaults, inheritance, descendants or pixels. Do not author replacement initial
values or treat `start` and `left` as interchangeable.

The reference scalar structure does not capture `ownText`; the collector requires
the full-tree empty-text witness instead and rejects any contradictory scalar
field. A malformed-class adverse case also exposed a guard-order issue, now
corrected before selector evaluation. The complete focused command
`node --test tests/material-parity/root-initial-style-evidence.spec.mjs` passes
**5/5**, **14,868.3759 ms**, including the full raw-case collector, competing and
malformed evidence, exact scalar joins and forged report/coverage checks.

Both new test files are now included in `parity:harness:check`; the older 606-test
pass remains historical evidence for its original file set. Combined prior-index,
guarded proof and browser checks pass **23/23**, no failures/skips/cancellations;
reported TAP duration **9,240,920.3052 ms** is retained without inferring wall time
from tool polling. The full replay now exits **0**, with all **108 groups / 6,933
proofs** matching the index's exact values, classifications, occurrence counts,
unique reviewed-case counts and complete sorted case-list hashes. The original
**8,143 style groups / 380,520 occurrences** and classification totals are
unchanged. There are **131 source findings / 101 source fingerprints**. Strict
validation rejects the still-incomplete audit solely for **2,462 unresolved
attributions**, down from 2,570. The expanded full harness completed serially:
**615/615 pass**, exit **0**, **571,694.5167 ms**, no failures/skips/cancellations.
The exact command is retained in the linked index. This covers both root-style
test files, but not the subsequently added standalone field-host token proof.
It is not the final enforced rendering-parity matrix. No renderer or canonical
fixture inputs have changed.

## Initial style values require inheritance and formatting-context evidence

The [browser sensitivity proof](material-root-initial-style-sensitivity-audit.json)
guards the next root-property investigation; it does **not** classify Material
cases or supply candidate computed values. With unchanged, omitted local styles,
changing an ancestor to `font-weight:700; text-align:center; vertical-align:middle`
changes the browser section's weight/alignment to `700`/`center`, while its
vertical alignment remains `baseline`. Local overrides and their removal are
observed separately. Initial-looking values cannot be normalized globally.

An independent formatting-context probe gives an inline-block and an ordinary
block the same computed `vertical-align:10px`. Only the inline-level box consumes
the alignment. The first diagnostic incorrectly expected a 10px displacement
relative to the parent: both DPR runs failed because the line baseline also
moves. Measuring against a zero-height inline baseline marker proves the exact
10px baseline-relative shift; the block remains stationary. This is a correction
to the new diagnostic's observation, not a renderer or canonical fixture change.

`node --test tests/material-parity/root-initial-style-sensitivity.spec.mjs`
passes **4/4 twice**, **3,128.255 ms / 4,254.2552 ms**, Chrome
**152.0.7977.76**, DPR **1 and 2**, with identical observations. The standalone
test was not included in the pre-existing full harness, which subsequently
passed 606/606; that run must not be described as covering this new proof. Before assigning root
attributions, join the complete captured ancestry, authored rules, resets,
direction/writing mode and all candidate declaration stages. Candidate consumers,
descendant overrides, geometry and final raster remain independent obligations.

The [complete exploratory root survey](material-root-initial-style-survey-audit.json)
now records all **2,311 cases / 36 families**, verifies **4,622 raw tree hashes**,
and retains every case ID. Within each selected frame/section and page/section
path, the three reference values are `400`, `start`, `baseline`; candidate local
normal/comparison/effective stages omit them. No relevant matched reference or
potentially applicable candidate requests were found by this survey's stated
guards. This is **not yet a classification**: the report explicitly lists the
additional identity, capture, attribute, shorthand, nested-rule and context
guards that need adverse tests before integration. It does not infer declarations
outside the captured frame or candidate computed values. The unresolved main
audit count remains **2,570**.

## Form-field hosts omit an explicit alignment request

The [field-host alignment index](material-field-host-alignment-audit.json)
records **577 captured boundaries / six groups** across form-field, input,
autocomplete, select, datepicker and timepicker. The installed Material
`.mat-mdc-form-field` rule explicitly requests `text-align:left`. Candidate
`.field-shell` and its captured page/section ancestors omit alignment in
authored inputs and all three declaration stages. Reference frame/section
computed alignment is `start`, while the component host is explicitly `left`.
Do not equate these requests merely because their current LTR output may agree.

The earliest demonstrated difference is shared component authoring, not
Babylon projection or a demonstrated core inheritance defect. The original
`2f44011` candidate field-shell rule already omits this property. Current
owners are `examples/material-showcase/src/app/astylar.component.ts:540`
and the installed Material host rule at
`examples/material-showcase/node_modules/@angular/material/fesm2022/form-field-CFbrnFED.mjs:1016`.
This is source-history evidence, not a runtime bisect; no new compensation
commit is inferred from the omission.

The audit reuses verified host identity/ancestry, then separately checks the
alignment declaration and every captured ancestor for competing alignment,
direction, writing-mode, reset or motion requests. Changed scalar stages,
unknown selectors and forged descendant/computed/raster claims reject the
attribution. Independent missing font tokens remain attributed separately.
A DPR1/2 browser sensitivity test retains explicit `left` under ancestor
`center`/`right` changes while the omitted host inherits those values; restoring
the ancestor restores `left`/`start`. This establishes distinct authoring
semantics, not candidate computed alignment or any descendant glyph position.

Implementation priority **5.23**, alongside the existing shared host typography
input restoration: preserve the original host-level alignment request and
descendant overrides through the shared translation. Do not patch child
offsets or apply a global alignment override. Investigate any remaining
equal-input core text/line-layout failure independently. In particular, this
finding does not explain or close the reported option-text vertical alignment
or chip-label positioning defects.

Focused audit checks pass **3/3**, **23,042.8865 ms**, covering 90 positive
states, 15 adverse ancestry/declaration mutations, six scalar mutations and
six forged reports, while retaining all 270 independent font-token
observations. Browser sensitivity passes **1/1**, **3,959.527 ms**. The raw
survey verifies **1,154 tree hashes** with no survey issues; exact commands
are retained in the machine index. The complete case-index/combined checks
pass **14/14**, **203,033.4937 ms**, with no failures, skips or cancellations;
the 577-case alignment index and prior source/case indices all pass.
The initial pooled-evidence replay terminated with exit code 1 and no captured
output; its cause is not established and it supplies no acceptance evidence.
The full harness also exits 1: **491 passed / three failed test-file processes**,
494 reported tests, **981,551.6314 ms**. Failures are
`normal-line-box-report.spec.mjs`, `tts-parity/interaction-metrics.spec.mjs`
and `tts-parity/scrolling-metrics.spec.mjs`, with process exit 2147483651 and
fatal allocation/out-of-memory diagnostics. This is not a complete passing gate.
After both original processes terminated, the isolated full replay with
build/validation phase markers exits **0**. Its **577 proofs / six groups**
match this index's complete case sets, occurrences, reference values and candidate
omissions exactly. Raw **8,143 groups / 380,520 occurrences** remain unchanged.
Classification totals are **514 authoring / 3,670 equivalent / 312 documented
limitation / 3,647 harness**; **131 source findings / 98 fingerprints** remain.
Strict validation still rejects the incomplete audit solely for **2,570 unresolved
attributions**, down from 2,576. This verifies the bounded alignment finding,
not overall input equivalence or output parity.
The isolated retry of the identical complete harness file set with
`--test-concurrency=1` exits **0**, **606/606 passed**, **686,020.2073 ms**, with
no failures, skips or cancellations. No assertions or files were removed.
The later standalone root-style sensitivity proof has its own repeated 4/4
results and was not part of this run. No renderer or
canonical fixture inputs have changed.

## Container caret-color diagnostics do not establish editable caret rendering

The [container caret index](material-container-caret-audit.json) links **84
groups / 2,888 observations** to the existing complete root-color and field-host
color case lists. The root sections and field hosts omit local caret-color
requests on both sides. Their captured browser ancestry computes caret color
from the independently verified ink; all three candidate declaration stages
preserve omission. This establishes a diagnostic-stage mismatch, not a missing
authored caret value or correct editable-control rendering.

The attribution independently checks the full captured ancestor paths for
caret/all/motion declarations. Scalar-stage changes, ancestor overrides,
incomplete evidence and forged computed/paint claims reject attribution.
The raw case-index proof verifies all **4,622 tree hashes**, every linked case,
and eleven source fingerprints. The candidate's explicit transparent caret
rule belongs to `.select-control`, which is not any of these ancestors; the
test rejects additional potentially relevant caret rules rather than silently
assuming that local omission implies no inherited request.

The public inspection contract at `src/lib/astylar-surface.ts:41` exposes
declarations, not painted caret values. The control style path at
`src/app/services/dom/input/text-input.manager.ts:1277` accepts an explicit
caret color or `auto`; source inspection does not establish whether the
correct path executes or paints correctly in a particular state. Initial
source `2f44011` already omits caret color on the shared root and field-shell
rules. This is source-history evidence, not a runtime bisect.

A browser sensitivity test at DPR1/2 demonstrates why the distinction matters:
an input with different ink computes a different caret color from its container;
an explicit ancestor caret color inherits until the input overrides it with
`auto`. Restoring omissions restores the original observations. This test
proves computed-style behavior only, not visible pixels, focus or placement.
The existing empty-input caret, selection and descendant override findings
remain independent. Do not add fixture-only caret colors to erase this
diagnostic difference; compare corresponding stages or expose computed values
separately during future implementation.

The combined diagnostic and raw-index checks pass **16/16**, **3,484,225.6804
ms**, with no failures, skips or cancellations. The command is recorded in
the machine index. The earlier focused caret checks pass **3/3** and browser
sensitivity check **1/1**, with commands/results retained there. Full replay
with all four supplemental sources exits 0: **2,888 proofs / 84 groups / 2,888
occurrences**, with exact linked case-set agreement. Raw **8,143 groups /
380,520 occurrences**, classifications, 131 source findings and 98 source
fingerprints remain unchanged. Strict validation still reports **2,576
unresolved style groups**, down from 2,660, and no other strict errors.
`npm run parity:harness:check` exits 0 with **601/601 pass**, **643,320.8802
ms**, no failures, skips or cancellations. This includes all four caret audit
checks and the browser computed-style sensitivity test. Attribution increment:
`533d240`. No production renderer or canonical
comparison inputs were changed, and this finding does not establish complete
input equivalence or final enforced parity.

## Root box-model changes belong to the fixed-height authoring path

The `companionBoxModel` section of the [root-height index](material-root-height-audit.json)
links **36 box-sizing groups / 2,311 cases** to the complete existing height
case lists. Each reference section computes `content-box` without a local
box-sizing declaration; each candidate section explicitly requests
`border-box` in its root rule, retained by all three captured declaration
stages. The raw capture and both full-tree hashes are checked for every case.

This is a companion of the existing fixed-height authoring substitution, not
36 new renderer defects. The classifier requires the independently verified
height evidence and exact box-model declaration ownership. It rejects local
reference overrides, unknown selectors, missing candidate declarations,
contradictory stages and fabricated case/proof data. A difference between box
modes by itself is not enough: the original 720px content-box maximum and
converted 778px border-box maximum remain separately equivalent when the
fixed padding and border arithmetic is demonstrated. That does not make
fixed height equivalent to automatic content sizing.

Source ownership remains the shared root rule at
`examples/material-showcase/src/app/astylar.component.ts:480`, present with
the height tables in initial commit `2f44011`. The original `.demo` rule at
`examples/material-showcase/src/app/reference.component.ts:106` omits both
height and box sizing. This is source-history evidence, not a runtime bisect.
Restore the original sizing contract alongside removing measured heights;
do not infer that core box-sizing itself is broken or prohibit genuinely
equivalent conversions. Used geometry, responsive winner selection,
descendant layout and raster remain independent verification obligations.

Focused box-model checks pass **3/3**, **8,631.6346 ms**: 30 positive state
cases, 12 adverse tree/rule mutations, six scalar mutations and six forged
records. The combined box-model/height/prior-index check passes **16/16**,
**56,411.5792 ms**, including complete raw-case coverage and source hashes.
The full replay exits 0 and independently attributes all **36 groups / 2,311
occurrences**, with exact case-set agreement against the index. Raw **8,143
groups / 380,520 occurrences** remain unchanged. Strict acceptance still
reports **2,660 unresolved style groups**, down from 2,696; height proofs
remain 2,311, source findings 131 and source fingerprints 98.
`npm run parity:harness:check` exits 0 with **596/596 pass**, **694,623.1591 ms**,
no failures, skips or cancellations. This includes all four new box-model
checks but does not establish final enforced visual parity or complete
input equivalence. Attribution increment: `cddc932`. No production or
canonical comparison code changed.

## Fixed root heights replace content-driven inputs, even when outer boxes match

The [root-height case index](material-root-height-audit.json) records **2,311
main boundaries / 105 raw height signatures** across all 36 families. The
reference `.demo` section has no authored height constraint. Candidate root
styles instead supply pixel heights from the per-family density tables, with
button/open-expansion adjustments and responsive toolbar/paginator/button
overrides. All three captured candidate declaration stages retain a height
present in the candidate authored rules. This is the existing
`fixture-fixed-reference-heights` / `fixture-responsive-height-compensation`
source finding linked to individual observations, not a newly inferred core bug.

Source ownership is `examples/material-showcase/src/app/astylar.component.ts:457`
(height selection), `:480` (root rule and responsive overrides), and `:1362`
(tables). The initial `2f44011` source already contains these height tables and
overrides. The original reference style at
`examples/material-showcase/src/app/reference.component.ts:106` does not request
section height. History is source evidence, not a runtime bisect.

Keep the two different measurements visible: HTML reports a **used content-box
height**, while the candidate snapshot contains an **authored border-box
height**. Many pairs differ numerically by 58px because their padding/border
conventions differ; this alone does not prove incorrect used geometry. Conversely,
matching outer geometry cannot make a fixed height equivalent to automatic
content sizing. The collector attributes the declaration substitution, not
pixel equality, responsive winner selection, or a universal auto-layout failure.

A browser-only sensitivity proof at DPR1 and DPR2 starts both variants at
258x98px outer dimensions. Increasing the identical child from 40px to 80px
makes the auto-height variant 138px tall while the fixed one stays at 98px;
restoring the child restores the original boxes. This demonstrates unequal
authoring even when an initial screenshot could match. It does not stand in
for an equal-input Astylar renderer proof. Existing public-API auto-height,
intrinsic-size, positioned-inset and anonymous-flex reductions remain the
independent evidence for their specific core defects.

Remove the height tables and measured breakpoint corrections when restoring
the original layout inputs, after testing the general core layout rules. Do
not replace their values with newly measured outcomes. Keep block-to-flex,
absolute-child, font-metric and box-model differences separate.

Focused verification: `node --test --test-name-pattern='root height'
tests/material-parity/input-equivalence-audit.spec.mjs` passes **3/3**,
9,270.6198 ms (30 state cases, coincident raw values, 16 adverse mutations,
seven scalar mutations, five forged reports). The browser sensitivity command
`node --test --test-name-pattern='matching section boxes'
tests/material-parity/input-tree-evidence.spec.mjs` passes **1/1**,
1,297.0004 ms. The combined root-height/root-color/typography/appearance case-index
and fingerprint check passes **12/12**, **38,263.8191 ms**, including all 2,311
root-height observations and raw tree hashes.

The first full replay produced 2,311 proofs but attributed only 103 groups /
2,299 occurrences. The two missing divider signatures exposed an audit join
defect: candidate declarations retain fractional heights such as 152.5625px,
whereas scalar comparisons normalize that value to 152.563px. The new focused
regression first failed with zero attributed groups. The correction applies
the existing scalar precision only at that join; original declarations and
all candidate stages must still match exactly. Two fractional cases plus
same-rounding-bucket raw-stage changes and forged evidence are covered.
This does not normalize away unequal authoring or change captured values.

The corrected full replay exits 0 and attributes all **105 groups / 2,311
occurrences**, with exact case-list agreement against the raw index after
existing scalar precision normalization. The raw **8,143 groups / 380,520
occurrences** remain unchanged. Strict acceptance still reports **2,696
unresolved style groups**, down from 2,801; source findings remain 131 and
source fingerprints total 98. This is audit progress, not input equivalence
or a completed audit.

The pre-correction full harness passed **591/591**, **477,278.5706 ms**. The
post-correction `npm run parity:harness:check` exits 0 with **592/592 pass**,
**2,187,420.6962 ms**, no failures, skips or cancellations. It includes the
fractional regression, complete root-height index and browser sensitivity
proof. This verifies the diagnostic harness, not the final enforced visual
matrix or complete input equivalence. No production or canonical comparison
changes were made. Evidence/classifier increment: `526a446`.

## Field-host color is inherited, despite missing component font tokens

The [field-host color index](material-field-host-color-audit.json) covers all
**577 main boundaries** for form-field, input, autocomplete, select, datepicker
and timepicker. In each capture the original Material host has no local color
declaration; its computed color comes from the frame through the section.
Candidate `field-shell` likewise omits color, and `#page` declares the matching
theme color. The host's font tokens are a different input: the Material rule
explicitly requests them, while the candidate omits them. A color diagnostic
finding must not erase that separately proven authoring defect.

The installed original rule is in
`examples/material-showcase/node_modules/@angular/material/fesm2022/form-field-CFbrnFED.mjs:1016`;
it declares font family, size, line height, tracking and weight but no color.
The candidate shell rule is at `examples/material-showcase/src/app/astylar.component.ts:540`.
Initial comparison commit `2f44011` already omits shell color and supplies page
color. This source review does not demonstrate a later compensation or replace
a runtime bisect. The raw sweep verifies 1,154 tree hashes and finds no local
host color/reset/motion rules in these 577 captures.

Attribution joins independently established host identity with the **exact**
root-color ancestry paths and revision. It separately checks host inline and
matched declarations, original inherited color, all three candidate declaration
stages and scalar consistency. Changed ancestry, local color requests, unknown
relevant selectors, missing stages and forged reports must reject attribution.
No candidate computed color is synthesized; descendant input/caret/currentColor
paint, font-token omissions, wrapper structure and layout remain independent.

The proposed owner is the core diagnostic-stage / audit comparison contract:
expose inherited computed values separately or compare corresponding declaration
stages. Do not add field-local colors to imitate browser snapshots. This is not
a production renderer change or approval of the surrounding fixture layout.

Verification: `node --test --test-name-pattern='field host color'
tests/material-parity/input-equivalence-audit.spec.mjs` initially passes **3/3**,
13,733.4435 ms. Tests cover 180 valid observations while retaining all 540
font-token omissions; 18 adverse host/ancestor cases, seven scalar mutations
and five forged reports are rejected. The combined field/root color and prior
case-index/fingerprint command passes **10/10**, 29,819.3889 ms, including the
complete 577-case raw index. The full audit replay terminates with exit 0 and
all **577 proofs / 12 grouped case lists** exactly match the raw index. Strict
validation retains only **2,801 unresolved groups**, down from 2,813; every raw
discrepancy remains present. `npm run parity:harness:check` passes **586/586**,
exit 0, **483,845.4561 ms**, including all four field-host color tests. The later
root-height sensitivity proof is separate and was not loaded in this run.
Evidence was committed/pushed as `dbd045b`; this full-suite gate is recorded in
a separate increment. No complete input-equivalence or final parity claim follows.

## Root section color: inherited computation versus declaration-stage inspection

The [root color case index](material-root-color-audit.json) records all **2,311
main capture boundaries**, **72 color discrepancy groups** across 36 families.
Both authored root sections omit a local color. The reference `.frame` supplies
`#1d1b20`; its later, same-sheet, equal-specificity `.dark` rule supplies
`#e6e1e5`. Candidate `#page` supplies the corresponding `theme.onSurface` color.
The captured frame and section computed colors agree, while all three candidate
section declaration stages preserve the original omission. This is an
**inherited computed value versus local declaration diagnostic mismatch**, not
evidence that a section-local color should be added to the candidate fixture.

The owning contract is explicit at `src/lib/astylar-surface.ts:41`: detached
diagnostic declarations are not used layout boxes or Babylon coordinates.
`src/lib/astylar.ts:910–942` collects normal/effective declarations separately
from retained text and painted control text. The audit must not manufacture a
computed candidate color from the matching ancestor declaration. Actual
descendant inheritance, caret color, currentColor paint, alpha compositing and
final raster correctness remain independent obligations.

The collector reuses independently validated full root-font ancestry mapping,
then separately proves color declarations, source order, specificity, active
conditions, non-important declarations and all three candidate stages. It
rejects competing/reset/motion requests, layered source paths, missing ancestry,
unknown relevant selectors, reversed/cross-sheet dark overrides, scalar changes
and forged evidence. Color literals must canonicalize to in-range RGBA; matching
malformed values are not accepted as equivalent evidence. Every grouped case ID
is retained, with no truncated sample list standing in for coverage.

Source history at initial comparison commit `2f44011` already contains these
frame/dark and page colors with no local section color. This is source evidence,
not a runtime bisect; no later color compensation is demonstrated. The proposed
general correction is to expose inherited computed values as a distinct,
provenance-bearing diagnostic stage or compare corresponding declaration stages.
It is **not** to add per-component colors or alter the renderer for this finding.

Verification so far: four focused root-color tests pass (13,213.3184 ms),
including 90 valid synthetic observations, 24 adverse ancestry/cascade mutations,
five invalid literals, seven scalar mutations and five forged reports. The
separate complete raw-capture index test passes (7,831.3949 ms), checking all
2,311 sections and 4,622 raw tree hashes. Initial full audit replay retains every
raw discrepancy and reduces unresolved attribution from **2,885 to 2,813**;
strict validation still reports those 2,813 unresolved groups. The hardened
full replay also terminates with exit 0 and identical case groups; the only
strict error is the retained unresolved-attribution count. All ten frozen
capture-harness fingerprints still match. `npm run parity:harness:check` passes
**582/582 tests**, exit 0, **453,966.9663 ms**, including the five new root-color
tests and prior case-index checks. This verifies audit tooling, not complete
input equivalence or the final unfiltered enforced visual matrix. Evidence and
attribution were committed and pushed in `e3ce933`; this full-suite result is a
separate verification increment. No production renderer or canonical comparison
inputs changed.

## Generated mappings expose omitted scalar CSS-layer evidence

The [generated-node mapping index](material-generated-node-mapping-audit.json)
replays **387 main-matrix boundaries** for six previously excluded targets.
It verifies raw tree digests, exact generated selector/owner chains, active
stepper panel/header linkage, and independent scalar/tree consistency. It
does not substitute text matching for identity or infer rendering equivalence.

**172 mappings pass**: 52 badge-count, 68 stepper-content, 34 snackbar-surface
and 18 tooltip-popup. Both stepper contents retain their authored comparison
ID; the selected tab's aria-controls/aria-labelledby linkage, current panel,
positive panel dimensions and visibility identify one active span. The other
panel is inert, hidden and zero-height. Both first and second selected steps
are covered. Generated overlays must belong to their matching Material
component and CDK overlay container, not merely share a class somewhere.

**59 paired captures expose a confirmed scalar-collector defect**, not a core
renderer defect: 25 bottom-sheet-overlay and 34 snack-bar-overlay. The full
tree retains `.cdk-global-overlay-wrapper { z-index:1000 }` at `sheet:8/5/0`;
the scalar authored-rule list omits it, even though all 89 computed properties
agree with the selected node. Installed CDK places this declaration inside
`@layer cdk-overlay`. `matchedAuthoredStyles` in
`tests/material-parity/run-material-parity.mjs:1405–1420` recurses through media
and supports rules only, then skips rules that are not CSSStyleRule instances.
The full-tree collector instead visits nested cssRules. Source history shows
this limitation in its introducing commit `6948211`; no historical runtime
bisect is claimed.

A real-Chrome minimal proof evaluates the **actual current scalar function**
extracted from its source, alongside `captureBrowserInputTree`. Ordinary,
media, supports and inline declarations are retained; the active layer's
z-index is absent only from the scalar authored list. The browser computes
1000, and the full tree retains its original declaration and nested source
path. This preserves a demonstrated failure, not a passing parity claim.
The full tree itself does not capture explicit layer names/order; arbitrary
layer precedence must not be inferred from a nested numeric path alone.

A separate whole-main-matrix sweep verified **2,311 reference tree hashes**
and checked **6,496 uniquely ID-mapped scalar observations**: none omitted an
active rule retained by their matching full-tree node. The exact command and
result are in the index. This bounds the observed rule-loss evidence; it does
not certify generated aliases, duplicate IDs, inline declarations, cascade
ordering or equivalent output. The 59 generated-overlay failures remain real.

**Eight further observations are the already-proven tooltip/open state
mismatch**, not additional layer failures: only the candidate has a popup in
both scalar and tree evidence. They remain linked to
`fixture-tooltip-benchmark-click-forces-open` and
`harness-tooltip-open-popup-checks-omitted`. The remaining **148 boundaries**
have neither mapped scalar input nor a candidate node for these targets;
their absent reference aliases remain explicit rather than counted as mapped.

### Next owning-boundary actions

1. Repair scalar grouping-rule capture with explicit condition/layer evidence
   and readable-sheet error handling. Do not change CDK CSS or candidate z-index
   to compensate for an incomplete authored-rule list.
2. Rebind or recapture affected inputs with provenance and preserve the frozen
   baseline. Do not silently backfill the missing rule into old scalar data.
3. Extend property-level attribution using verified mappings only when each
   property's own guards pass. Badge transitions and other motion/reset rules
   still prevent the existing conservative appearance proof from applying.
4. Keep the eight tooltip-open failures visible in subsequent acceptance;
   removing or renaming the scenario is not a fix.

Focused mapping tests reject ambiguous aliases, broken owner/header links,
unsupported states, cycles, stale core evidence, altered scalar styles/rules/
text, and changed candidate declaration stages. The initial combined mapping
and real-browser proof passed **4/4**, exit 0, **2.714 seconds**. The case index
also binds every boundary and all source/tree hashes.
The combined replay/index/real-browser run passed **5/5**, exit 0,
**4.691 seconds**, including raw artifact verification and rejection of corrupt
indices, outside-artifact paths and mismatched digests. This increment changes
audit evidence only: the main strict audit still has **2,885 unresolved
attributions**, and the complete enforced rendering matrix remains required.

The subsequent full `npm run parity:harness:check` completed with **577/577
passing**, exit 0, **437.579 seconds**, including all five new tests and the
previously separately checked button case index. The finding deliberately
retains the scalar collector's layer omission; this green harness result is
not a claim that the instrumentation defect, renderer or Material parity is fixed.

## Material buttons: omitted explicit CSS appearance reset

The [button appearance case index](material-button-appearance-audit.json)
preserves **13 groups / 768 main scalar occurrences** as an
**application/plugin authoring defect**. Installed Material `.mdc-button`
CSS explicitly authors `-webkit-appearance:none`; Chrome CSSOM exposes the
declaration as `appearance:none`. This concerns the CSS property, not
Material's `matButton` variant input. Candidate material-button, text-button,
toolbar-action and dialog-action authoring omit that reset through all three
captured core declaration stages.

The first demonstrated divergence is authored input translation. Source
inspection of `2f44011` already shows the omission in material-button and
dialog-action rules. This is not evidence of a later workaround or a confirmed
core native-widget rendering failure. The implementation plan adds priority
**5.205**: restore the original reset with the other original button inputs,
then investigate any remaining equal-input failure at the core owner. Do not
waive missing authored intent because the custom-painted button looks similar.

`appearance-input-evidence.mjs` requires the unique mapped native button,
original Material host class and exact active reset rule, complete reference
and candidate rule pools, absent competing candidate requests, and agreement
across independent local style stages. Reference box-shadow transition and
animation-disable rules do not erase the appearance declaration being audited;
no animation or final-raster equivalence is inferred. Explicit candidate
appearance, changed source owners, resets, missing stages, unknown potentially
applicable selectors and contradictory scalar captures prevent attribution.

### Verification and coverage

- The completed `npm run parity:harness:check` passed **571/571**, exit 0,
  **426.305 seconds**. It includes the three new button collector regressions;
  the later-added case-index test was checked separately below because that
  test was not loaded by the already-running harness. This is not the final
  enforced rendering matrix or input-equivalence acceptance.
- The combined button/non-widget appearance, root/field typography and source
  checks passed **17/17**, exit 0, **51.678 seconds**. The new button tests cover
  60 class/state observations, 24 adverse capture mutations, seven scalar-stage
  mutations and five forged reports. Every reviewed case is retained beyond
  the twelve-item display sample limit.
- Full build/replay retains **8,143 unique differences / 380,520 occurrences**,
  **131/131 detected source findings** and 96 fingerprints. Unresolved
  attributions decrease **2,898 to 2,885**. Strict validation reports only
  `2885 resolved-style differences still lack root-cause attribution`.
  The diagnostic command prints this error and exits 0, not acceptance.
- The inventory collector records 801 qualifying button observations, including
  supplemental and non-scalar-mapped nodes. Only the **768 main scalar
  occurrences** in the linked index are newly attributed. Exact commands,
  source fingerprints and case identities are retained there.
- The additional case-index test passed **1/1**, exit 0, **1.990 seconds**.
  It checks every original reset and omitted candidate declaration, current
  source hashes, all six mapping samples and both source-tree hashes for each.
  Four corrupted index variants are rejected; the exact command is in the index.
- The previously verified field, section and non-widget appearance indices
  were rechecked after refreshing only their changed audit-source fingerprints.
  No captured values, canonical comparisons, renderer code or thresholds were
  changed. Final enforced parity and the remaining audit are still required.

### Mapping follow-ups remain open

The first captured cases explain the six non-widget exclusions: badge-count,
bottom-sheet-overlay, snack-bar-overlay, snack-bar-surface and tooltip-popup
are selected through explicit generated-element aliases in
`run-material-parity.mjs:1382–1396`, not through the candidate's ID. The
reference stepper authors two `data-parity-id="stepper-content"` elements;
`referenceTarget` selects a visible candidate. The initial-request collector
requires a unique ID mapping and correctly does not accept these cases.

The linked index preserves those six sample cases, both tree hashes, actual
reference ID matches and the harness selection mechanism. These observations
are **not** a completed owner/state mapping or proof of a harness defect.
Generated ownership and the active stepper content must be independently
mapped before extending attribution; do not relax uniqueness or infer
correspondence merely from matching tag names or text.

## Non-widget appearance: captured initial requests, not a global omission waiver

The [non-widget appearance case index](material-nonwidget-appearance-audit.json)
records **49 groups / 3,015 main scalar occurrences**, preserving every reviewed
case identity. These are matching built-in non-widget types with no relevant
authored override and complete independent normal/comparison/effective
declaration evidence. The public-package reduction below supplies passing
non-widget controls and positive select/checkbox indicator sensitivity.

The [CSS UI 4 Working Draft, section 7.2](https://www.w3.org/TR/2026/WD-css-ui-4-20260120/#appearance-switching)
defines `appearance` as non-inherited with initial `none`. Browser UA control
styling remains distinct. The collector does not use the capability catalog's
control-oriented `auto` default to infer a non-widget computed value, or fill
omitted candidate fields. It accepts only the initial request for a built-in
type that does not own a native-control appearance switch.

`appearance-input-evidence.mjs` requires unique paired node identities,
matching reviewed types, complete rule pools, current core inspection
provenance, and absence of appearance/reset/motion declarations in inline,
applicable-rule and local-style evidence. Uncertain selectors remain potentially
applicable and prevent attribution. Explicit authored values, controls,
plugins and changed types are not covered. Independent report validation
rebuilds the proof and checks raw values and every reviewed case.

The full inventory contains 3,414 qualifying node observations, including
supplemental and non-scalar-mapped nodes; **only 3,015 main scalar occurrences**
are newly classified. Six same-type groups still fail the full guards:
`badge-count`, `stepper-content`, `bottom-sheet-overlay`, `snack-bar-overlay`,
`snack-bar-surface` and `tooltip-popup`. They remain unresolved rather than
being accepted from the element type alone. All other control/plugin/type-
substitution appearance differences also remain pending.

### Verification and remaining scope

The 13-test combined appearance/root/field/fingerprint command in the case
index passed, exit 0, **45.031 seconds**. New tests exercise 90 synthetic
type/state observations, 24 adverse capture mutations, seven scalar-stage
mutations and four forged reports, plus a definitely unrelated-selector
passing control. Root/field indices were reverified after updating only their
main-collector fingerprint; their captured evidence is unchanged.
The additional case-index integrity test passed **1/1**, exit 0, 1.608 seconds.
It verifies the frozen main-report hash, current source fingerprints, all 49
group mappings and all 3,015 original scalar occurrences, rejecting four
corrupted index variants. Its command is recorded in the index.
The full `npm run parity:harness:check` passed **567/567**, zero failures,
skips or cancellations, **388.169 seconds**, exit 0. This process included the
collector and its three regression tests; the later case-index test was
verified separately, not retrospectively counted in that running process.
All ten frozen capture-harness hashes remain unchanged.

The complete build/replay retains **8,143 unique differences / 380,520
occurrences** and **130/130 detected source findings**, with 96 source
fingerprints. Unresolved attributions decrease **2,947 to 2,898**. Strict
validation reports only `2898 resolved-style differences still lack root-cause
attribution`. The exact command and all reviewed cases are in the index.
This diagnostic prints validation errors and exits 0; it does not establish
acceptance. Final enforced parity and the remaining audit are still required.

No canonical input or renderer behavior changed. This classification does not
waive descendant layout, typography, clipping, interaction, plugin ownership
or final cross-engine raster differences, even on the same reviewed element.

## Appearance: separate omitted defaults from indicator-sensitive authoring

The [appearance diagnostic evidence](material-appearance-input-audit.json)
preserves **117 pending scalar groups / 6,938 occurrences** from the current
main capture. This increment does not classify those groups or reduce the
remaining **2,947 unresolved differences**.

The public-package test `appearance-input-audit.spec.ts` compares omitted,
`auto`, and `none` authoring on six non-widget types (`div`, `section`, `span`,
`p`, `h2`, `a`) and two indicator-sensitive controls (`select`, checked
`checkbox`). Identical explicit CSS box/style inputs are used in the browser
and Astylar variants. All 24 fresh mounts measure 120 × 48 CSS pixels on both
sides. Astylar normal/effective diagnostics retain omitted declarations as
omitted; browser computed appearance is `none` for the omitted non-widget
variants and `auto` for the omitted controls.

Within each Astylar type, omitted and `auto` yield byte-identical framebuffers.
`none` also leaves the six empty non-widget rasters unchanged, but changes
**105 bytes for select and 7,344 bytes for checkbox**. A colored-pixel assertion
rejects blank captures. This is a within-Astylar sensitivity test, **not a
browser-versus-Astylar screenshot parity test** or proof that omitted inputs
can always be normalized to `none`.

The checked source and installed package both guard indicator creation with
`style.appearance !== 'none'`: `checkbox.manager.ts:56` (installed JS:48) and
`select.manager.ts:101` (installed JS:70). Source commit
`c46a1d7b048d28f7f0e8358612c0ed526d0c5dfa` introduced those guards for the
Tailwind benchmark. This is source-history evidence, not a historical runtime
bisect or attribution of the reported Material symptoms to that commit.
The `native-control-presentation` capability explicitly documents limited
Astylar-owned indicator behavior, not complete native-widget appearance.

### Attribution boundaries and next steps

- Non-widget default omissions need exact captured-type, active-rule and
  diagnostic-stage evidence before attribution. The six empty-box tests do
  not prove all compositions, typography, pseudo states or plugin behavior.
- Thirteen button-to-button groups have explicit reference Material
  `appearance:none` declarations missing from candidate authoring. Preserve
  that input difference even if a particular candidate raster is unchanged.
- Range inputs, changed structural types and plugin-rendered elements remain
  separate investigations. Select/checkbox results cannot establish their
  appearance behavior.
- No core source, canonical fixture or scalar classification rule changed.
  A future collector must preserve raw omission and case identities and reject
  unsupported attribution through negative/mutation tests.

### Verification

`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/appearance-input-audit.spec.ts`

Two runs passed **8/8 tests, 24 mounts each**, exit 0 (test times 3.229 and
3.236 seconds). The first complete observation set is checked in; the second
terminal result is recorded without inventing observations lost to console
truncation. Chrome Headless 152 / Windows 10, Babylon 8.56.2 WebGL2, Angular
20.3.29, DPR 1. The existing NG0914 Zone.js/zoneless warning is accepted;
no polyfill changes were made. Each surface is disposed with zero remaining
meshes/materials/textures, and its DOM hosts are removed.

`npm --prefix examples/material-showcase run build -- --output-path dist/material-showcase-appearance-input-audit`

The isolated browser/server build passed, **29.708 seconds**, two prerendered
routes, exit 0. It did not replace the frozen comparison bundle. The checked-in
evidence integrity test verifies source fingerprints, the full eight-type
observation set, positive control sensitivity, raw diagnostic omissions and
pending-group totals, including four deliberately corrupted variants.
`node --test --test-name-pattern='appearance public proof' tests/material-parity/input-equivalence-audit.spec.mjs`
passed **1/1**, exit 0, 577.785 ms. All ten frozen capture-harness hashes
remain unchanged.
The full `npm run parity:harness:check` gate on `77a7447` subsequently passed
**564/564**, zero failures/skips/cancellations, 361.129 seconds, exit 0.
Neither this focused proof nor the build establishes the final enforced
parity matrix or the complete input-equivalence audit.

## Section fonts: computed inheritance versus local diagnostic declarations

The [root-typography case index](material-root-typography-audit.json) covers
**all 2,311 captured main comparisons across 36 families** (436 static and
1,875 interaction cases). It preserves **4,622 font-family/font-size
observations** and the identity of every case. These account for **144 grouped
scalar differences**, not 144 rendering fixes.

The paired reference `.frame` and candidate `#page` author the same font stack
and corresponding profile-scaled size: `Roboto, Arial, sans-serif` and
16px / 14.4px / 18.4px. Neither mapped section authors a local font override.
The complete captured reference frame-to-section path reports the inherited
computed values. Candidate page-to-section normal, effective and comparison
stages retain the page declarations but omit them on the section itself.

The first demonstrated divergence **in these compared scalars** is diagnostic
stage selection. `AstylarResolvedStyleSnapshot` explicitly documents detached
declarations, not used values (`src/lib/astylar-surface.ts:42`).
`inspectCurrentDocumentStyles` in `src/lib/astylar.ts:914–942` separately
returns normal/effective declarations and retained text/control paint inputs.
The empty section has no own glyphs whose retained font could replace the
missing local declaration. The new attribution therefore does **not** produce
or accept a candidate computed font.

This is materially different from the field-host finding below: there the
reference adds component-level font tokens that candidate authoring omits;
here both section authors omit local overrides and their parent requests
agree. It is also independent of the confirmed core inherited-em sizing
defect: correct text inheritance does not establish correct length consumers.
Section block-to-flex replacement, fixed height/box-model changes, descendant
font overrides and final raster remain separate findings.

### Evidence and regression safeguards

- Candidate authored page/section: `astylar.component.ts:460–480`.
  Reference frame/section styles: `reference.component.ts:106`.
  Source inspection of `2f44011` already contains the paired page-font
  requests; this is not evidence of a later compensating font adjustment or
  a historical runtime bisect.
- `root-typography-input-evidence.mjs` checks unique paired sections,
  frame/page ancestry, original active reference font rules, candidate rule
  exclusions, page-scale agreement and all three local diagnostic stages.
  Unknown possibly matching candidate selectors prevent attribution. Raw
  missing values remain missing, and every occurrence retains its case.
- Main report validation reconstructs the proof from the captured inventory
  and checks classification, exact values, evidence and complete case lists.
  Focused tests include 45 synthetic family/scale/state cases, 24 adverse
  ancestry/rule/provenance mutations, eight scalar mutations and four forged
  report mutations. The separate checked-in index test verifies all main
  case identities, original root scalars and 4,622 input-tree hashes.
- The existing implementation-plan priority 0 still applies: expose and
  compare the appropriate core typography stages without introducing a
  parallel inheritance resolver or writing inferred values into fixtures.
  Priority 3.45 independently owns the actual inherited-em consumer defect.

### Verification and limits

The complete audit build/replay retains **8,143 unique differences / 380,520
occurrences**, with **130/130 source findings detected** and 92 fingerprints.
Unresolved attributions decrease **3,091 to 2,947**. Strict validation reports
only `2947 resolved-style differences still lack root-cause attribution`;
the diagnostic command prints that error and exits 0, which is not acceptance.
All ten frozen capture-harness fingerprints remain unchanged.

The exact build/replay command is retained as `verification.fullReplayCommand`
in the linked case index. It uses `buildMaterialInputAudit` with the frozen
`current-ancestry-audit/latest-report.json`, normal-line-box evidence,
control-line-box V3, supplemental-line-box evidence and the
`supplemental-current-ancestry-audit` root, followed by
`validateMaterialInputAudit`. This is the same complete evidence selection as
the field-host replay, with the new root collector added; no recapture,
reference change, renderer fix or canonical fixture rewrite was performed.

Focused command:

`node --test --test-name-pattern='root typography|field host|records source fingerprints and actual visual acceptance fields' tests/material-parity/input-equivalence-audit.spec.mjs`

The initial combined run passed **8/8**, 22.325 seconds. The follow-up including
the root-index integrity test passed **9/9**, 27.652 seconds, exit 0.
The subsequent full `npm run parity:harness:check` run on `9ef6865` passed
**563/563**, with zero failures/skips/cancellations, 355.033 seconds, exit 0.
Neither the harness gate nor this attribution establishes input equivalence, correct descendant rendering,
supplemental overlay coverage or the final unfiltered enforced parity gate.

## Shared field hosts: missing Material typography token ownership

The [field-host case index](material-field-host-typography-audit.json) covers
**577 cases and 1,731 property observations**: every captured form-field host
in these six main-comparison families. It records 72 static cases and 505
interaction boundaries across light, dark, contrast and custom profiles.

| Family | Captured cases | Reviewed font-family / size / line-height observations |
| --- | ---: | ---: |
| Form-field | 76 | 228 |
| Input | 76 | 228 |
| Autocomplete | 110 | 330 |
| Select | 94 | 282 |
| Datepicker | 111 | 333 |
| Timepicker | 110 | 330 |

The reference `.mat-mdc-form-field` rule applies
`--mat-form-field-container-text-*` with the corresponding
`--mat-sys-body-large-*` fallbacks. Its captured host values are **Roboto,
16px, 24px**. The candidate `.field-shell` rule omits all three declarations.
Its complete page/section/host chain contains only the page's
`Roboto, Arial, sans-serif` and profile-scaled 16px/14.4px/18.4px font size;
the section and field host retain omitted local declarations.

The first divergence is **comparison authoring**, before core consumption.
This does not synthesize a computed candidate font from a missing diagnostic
value, nor claim that light/dark's inherited 16px is a visible size failure.
The component's fixed token request and page-scaled inheritance differ across
profiles; independent child control/label styles do not restore the missing
host ownership. The separate core inherited-em sizing proof remains a core
defect, not an explanation or waiver for this authoring omission.

### Sources, safeguards and next implementation boundary

- Reference hosts are authored in `reference.component.ts:76–85`; frame
  typography is at `:106`. Captured active `.mat-mdc-form-field` rules preserve
  the original token expressions and computed results.
- Candidate page typography is at `astylar.component.ts:471`, shared
  `.field-shell` at `:540`, and host construction at `:913`, `:941`, `:1027`.
- `git log -S "selector: '.field-shell'"` and `git show 2f44011` trace the
  omission to the initial showcase, not a later renderer correction. This is
  source-history evidence, not a historical runtime bisect.
- `field-host-typography-evidence.mjs` requires unique corresponding owners,
  complete ancestry and rule evidence, all three local style stages, the
  exact active reference token rules, and absence of competing candidate
  typography, reset, animation or transition declarations. Unknown possibly
  applicable selectors prevent attribution. Every classified occurrence
  retains its case identity; report validation replays the captured evidence.
- The new plan item at priority 5.225 calls for restoring original token
  ownership through the shared style input path. It does not prescribe
  literal replacement fonts, descendant baseline offsets, fixed dimensions,
  or plugin-side inheritance. Core inheritance/length consumption, descendant
  styles, variable fallback origin and final raster remain separate checks.

### Verification and scope

Collector/source-finding commit **`90da58d`** is pushed. Focused checks:

`node --test --test-name-pattern='field host|records source fingerprints and actual visual acceptance fields' tests/material-parity/input-equivalence-audit.spec.mjs`

**5/5 PASS**, 13.898 seconds. The tests cover 90 synthetic family/scale/state
cases, 19 ancestry/rule rejection controls, nine scalar rejection controls,
four report mutations, and an independent index check against all 577 actual
captured comparisons. The latter verifies the frozen report hash, four source
fingerprints and all **1,154 referenced input-tree hashes**; missing local
values remain missing.

The full audit replay retains **8,143 unique style differences / 380,520
occurrences**. Eighteen groups (1,731 occurrences) now have this source-backed
attribution; unresolved attributions decrease **3,109 to 3,091**. All **130
source findings** are detected and **91 source fingerprints** recorded. Strict
validation reports only `3091 resolved-style differences still lack root-cause
attribution`; the error-printing runner's exit 0 is not acceptance.

The preceding em-evidence increment's full `npm run parity:harness:check`
finished with **555/555 PASS**, no failures/skips/cancellations, 395.858 seconds.
That result predates the field-host changes; it is not their full-suite gate.
The subsequent field-host gate on commit `177e201`, using the same command,
finished with **559/559 PASS**, no failures/skips/cancellations, 313.203 seconds
(terminal exit 0). This verifies the audit harness, not rendering parity;
the 3,091 unresolved attributions and final enforced matrix remain outstanding.
No renderer or canonical fixture was changed. This case index covers the
captured host typography states only, not all remaining properties, every
possible field interaction, or the final enforced parity requirement.

## Core em sizing: local font declarations bypass computed inheritance

The [ten-trial, two-run public-package evidence](material-font-relative-box-audit.json)
confirms a separate core defect: **each run has six equal-input size failures
and four passing controls**, with identical measurements across runs. This is
not an application workaround or a claim that every missing Material font
diagnostic causes incorrect sizing.

Both sides use the same declarations: a 320x180px parent with a 24px or 32px
font, a child sized `2em` by `1em`, and an independently inspected text witness.
Browser CSS is generated directly from the public `SiteData` rules. The
`explicit-px` and `pixel-box` variants are diagnostic controls only.

| Parent font | Child font input | Browser box, CSS px | Astylar box, CSS px | Retained text font |
| --- | --- | --- | --- | --- |
| 24px | Inherited | 48 x 24 | 32 x 16 | 24px, correct |
| 32px | Inherited | 64 x 32 | 32 x 16 | 32px, correct |
| 24px | 1.5em | 72 x 36 | 3 x 1.5 | 36px, correct |
| 32px | 1.5em | 96 x 48 | 3 x 1.5 | 48px, correct |
| 24px | 150% | 72 x 36 | 300 x 150 | 36px, correct |
| 32px | 150% | 96 x 48 | 300 x 150 | 48px, correct |

Four controls pass: explicit local 24px/32px fonts with em boxes, and inherited
24px/32px fonts with explicit 48x24px/64x32px boxes. All ten parent boxes are
correct. Original inputs and local diagnostic declarations remain unchanged;
text font resolution agrees with the browser in every trial. Only child size
assertions fail. Error-free settlement and zero final scene
meshes/materials/textures are checked, including after failing assertions.

### First divergence and ownership

`src/app/services/dom/elements/element-dimension.service.ts:77` computes its em
base with `parseFloat(style?.fontSize ?? '16px')`. Width and height consume
that base at lines 139 and 247. Thus omission loses inheritance, `1.5em`
becomes 1.5px, and `150%` becomes 150px. The same service's separate inherited
text path (`:671–705`) calls `resolveComputedFontSize` and resolves the text
witness correctly. The installed package contains the matching raw-font
branches at lines 54, 104 and 213 and computed text resolution at line 570;
both source and installed files are fingerprinted in the evidence.

This is a **core CSS used-size resolution defect**, not a reason for a Material
plugin to change fonts, replace em lengths with pixels, or adjust Babylon
coordinates. The reproduction projects final geometry solely to measure
output; it never feeds that measurement into authored input or layout.

`git show 21bdab9e930783efb5cf34ab031fd04f2656155b` identifies the addition of
the raw-font expression and em dimension branches. This is source-history
evidence, **not a historical runtime bisect**. The existing
`src/parity/fixtures/font-relative-units.fixture.ts` supplies explicit local
20px/24px fonts and a 16px rem root. It therefore cannot detect the inherited
or relative-font cases. The catalog lists em sizing and inherited typography
as compatible; this proof exposes a gap in that claimed combination without
changing the catalog to conceal it.

The implementation plan adds a core task at priority 3.45: share computed CSS
font values before resolving font-relative lengths. Extend nested inheritance,
other relative units, constraints, spacing, insets and updates before claiming
general support. No canonical comparison or renderer behavior was changed.

### Verification and boundaries

- Public proof: `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/font-relative-box-audit.spec.ts`
  — two complete runs, each exit 1, **6 FAILED / 4 SUCCESS**. The intentionally
  failing equal-input expectations are retained, not inverted or skipped.
- Source-finding integration: `node --test --test-name-pattern='records source fingerprints and actual visual acceptance fields' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **1/1 PASS**, including detected owner/history, focused proof and 90 source
  fingerprints. Proof/integration commit: `be3b1d9`.
- Consumer production build: `npm --prefix examples/material-showcase run build -- --output-path dist/material-showcase-font-relative-box-audit`
  — exit 0, **45.434 seconds**, browser/server bundles and two prerendered
  routes. Its isolated output does not replace the frozen benchmark bundle.
- Runtime: AstylarUI 0.2.0, Angular 20.3.29, Angular build 20.3.34, Babylon
  8.56.2, Chrome Headless 152.0.0.0 on Windows, 640x360 CSS px, DPR1,
  Arial/sans-serif, explicit 48px line height, font and surface settlement.
  Existing NG0914 warns that the zoneless TestBed still loads Zone.js through
  the consumer test polyfills; those polyfills are unchanged.
- Evidence-integrity and integration checks: `node --test --test-name-pattern='font-relative box evidence|records source fingerprints and actual visual acceptance fields' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **2/2 PASS**. The checked JSON preserves all 20 observations, twelve size
  assertion failures per run, six source/package fingerprints, and four
  rejection controls against altered fonts, declarations, counts or outputs.
- Full `buildMaterialInputAudit` / `validateMaterialInputAudit` replay against
  the frozen main report and existing normal/control/supplemental captures:
  **8,143 unique style differences / 380,520 occurrences**, **129/129 source
  findings detected**, **90 fingerprints**. Strict validation still reports
  `3109 resolved-style differences still lack root-cause attribution` and no
  additional error. The runner prints that error array and exits 0; this is
  **not acceptance**. All ten frozen harness-file hashes remain unchanged.

The evidence establishes these static box sizes, not glyph sharpness, every
relative-length consumer, or full Material parity. No unresolved captured
Material property is automatically reclassified by this finding. The full
coverage/attribution audit and final enforced matrix remain required.

## Chip host typography: label tokens moved to a different owner

The new [case-by-case evidence index](material-chip-host-typography-audit.json)
records **76 cases, 152 chip hosts and 304 property proofs**. These are all
captured chip cases: 12 static and 64 interaction boundaries across light,
dark, contrast and custom profiles. Interaction coverage includes focus,
hover, held, activate, activate-leave, activate-alternate, disabled and selected.
This does not establish coverage of every possible chip interaction.

| Input owner | HTML reference | AstylarUI |
| --- | --- | --- |
| Chip host font size, light/dark | Inherited 16px | Explicit 14px |
| Chip host font size, contrast | Inherited 14.4px | Explicit 14px |
| Chip host font size, custom | Inherited 18.4px | Explicit 14px |
| Chip host line height | Inherited `normal` | Explicit 20px |
| Nested label size/line height | Component tokens computing 14px/20px | Own declarations omitted; retained text is 14px/20px |

The first demonstrated divergence is **application authoring**, before core
layout or projection. The reference keeps inherited frame typography through
the section, chip list/set, chip host, cell and action button. Only the nested
`.mdc-evolution-chip__text-label` applies the Material size/line-height tokens.
The candidate authors those values on `.chip` instead
(`astylar.component.ts:690`), while `.chip-label` only specifies vertical
alignment (`:696`; text construction at `:844–847`). The values reach retained
label text unchanged. Matching these two label values does not prove matching
font family, weight, tracking, geometry, generated boxes or final raster.

History confirms `c47d589` introduced host `fontSize: '14px'` and `88d1090`
introduced host `lineHeight: '20px'`. Separately, `3d0d5ce` added a relative
`top: '-2px'` label offset and `00de46c` removed it. This ownership finding does
not establish that either font declaration was intended to conceal a specific
core bug, nor does it demonstrate the cause of the reported centering defect.
The existing fixed-width, generated-outline and omitted-label-token findings
remain separate obligations.

The collector requires exact, unique text-owner paths; the inherited reference
chain and active token declarations; complete core style-inspection revision
and rule evidence; normal/comparison/effective candidate stages; omitted label
declarations; and independently retained label values. Known unrelated terminal
selectors are excluded using the existing conservative typography helper;
unknown or competing rules prevent attribution. Inactive non-typographic rules
are retained without being mistaken for competing font declarations. The
validator reconstructs every proof from captured inventory and checks every
classified occurrence, not just the twelve displayed case samples.

Recommended implementation: restore host/action inheritance **and** nested
label tokens together, with original generated-box ownership. Merely raising
the replacement host size would also enlarge its inheriting label and create
another inaccurate comparison. Then use equal-input core reproductions for any
remaining intrinsic sizing, centering or paint discrepancy. No renderer,
plugin, reference or canonical showcase styles were changed in this increment.

Verification for attribution commit `95e7694`:

- `node --test --test-name-pattern="chip host typography|records source fingerprints" tests/material-parity/input-equivalence-audit.spec.mjs`:
  **5/5 pass**, zero failures/skips/cancellations, 24.4532307s. The first
  development run passed the fingerprint test but failed the four new tests
  because synthetic frame/section nodes omitted required `pseudoElements`
  arrays. The test data was corrected; production capture/schema was not relaxed.
- Exact reconstruction of `material-chip-host-typography-audit.json` from
  `buildMaterialInputAudit` and comparison with the checked-in JSON: **pass**.
  All 152 referenced tree hashes and four collector/source fingerprints verify.
  The machine index carries the source report hash, paths, revisions, mapped
  owners and all normal/comparison/effective/reference/retained values.
- Full consolidated `buildMaterialInputAudit` followed by
  `validateMaterialInputAudit`, using the frozen main report plus the existing
  normal/control-V3/supplemental line-box reports and current supplemental root:
  **8,143 unique style differences / 380,520 occurrences**, unchanged totals;
  **128/128 source findings detected**, 88 source fingerprints. The only strict
  validation message is `3109 resolved-style differences still lack root-cause attribution`
  (previously 3117). No evidence or discrepancy was removed to obtain this result.
- Checkpoint harness verification: **10/10 files unchanged**.
- `npm run parity:harness:check`: **554/554 pass**, zero failures,
  skips or cancellations, exit 0, **458.4678999s**. This is harness/audit
  regression verification, not the final enforced rendering matrix.
- `git diff --cached --check`: **pass** before the attribution commit.

Exact consolidated replay command (Node exits normally after printing the
strict audit's remaining errors; an exit of zero here is not audit acceptance):

```powershell
node --input-type=module -e "import{readFileSync}from'node:fs';import{buildMaterialInputAudit,validateMaterialInputAudit}from'./tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',controlLineBoxPath:'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json',supplementalLineBoxPath:'artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY',JSON.stringify(a.summary));console.log('STRICT',validateMaterialInputAudit(a));"
```

The audit remains incomplete. Final unfiltered enforced output parity and
the complete input-equivalence deliverables remain pending; this increment
does not establish either acceptance condition.

## Paginator navigation integration: full boundary inventory and explicit visibility

The consolidated audit now includes all **104** paginator navigation boundaries
from the supplemental capture, not just its summary. Their **208 input trees**
retain authored inputs, normal/effective core styles, rule chains, generated
content, retained/control text and exact action associations. The inventory
validator independently reloads the checkpoint-bound source artifacts and
replays the expanded pooled styles/rules/trees. Missing, duplicated, reassigned
or edited boundaries cannot count as complete coverage; neither a passing page
range nor a claimed summary can conceal an input difference.

Integration exposed a real evidence gap in V2: the reference tree capture had
not requested CSS `visibility`. Its tooltip-show class and screenshots are not
a substitute for that missing computed input. The exact tooltip-omission proof
therefore left all 24 additional tooltip mappings unresolved, rather than
assuming `visibility:visible`. The diagnostic producer now explicitly requests
that property, and its validator rejects both a capture manifest without it
and reference nodes missing its actual value. No production renderer, fixture,
shared capture collector, or frozen full-matrix harness changed.

The new V3 capture is separate; V1/V2 artifacts and the V2 machine report remain
historical evidence. V3 is now the selected paginator supplement:

`artifacts/material-parity/supplemental-current-ancestry-audit/paginator-navigation-audit-v3/latest-report.json`

SHA-256: `01933188110a390a56a6066215f03144a6c5ca6ae7ef1c0b0293626f8711339d`.
Its complete 104-observation machine summary, including all tree/PNG references,
is `docs/material-paginator-navigation-audit-v3.json`. Independent regeneration
matches every checked-in value. The producer again exits **1 for honest behavior
differences**, while checkpoint/runtime/artifact and inventory replay errors are
zero. Chrome 152.0.7977.76, 1440x1000 viewport, light/dark, DPR 1/2, real pointer
and Space input, font readiness, two frames and 250ms settlement are unchanged.

V3 reproduces **48 native-disabled, 44 focus-navigation, and 24 tooltip-presence
differences**. The 24 tooltip omissions now retain the exact Next/Previous
trigger, complete shown overlay path, visibility/opacity inputs and complete
candidate tree. Attribution is limited to the six observed action states in
the four profile/DPR cohorts, with negative tests for changed triggers, hidden
overlays, missing styles, unsupported states and candidate tooltip content.
The supplemental typography pass retains **520 comparisons** and 24 explicitly
unequal tooltip omissions; no candidate tooltip typography is fabricated.

The source scan and implementation plan now distinguish the paginator's native
disabled/ARIA/tab-order authoring from the independently isolated core held-focus
defect. Forty focus mismatches coincide with unequal disabled inputs; the four
enabled held samples must not be used to label all 44 as one confirmed cause.
The minimal two-button proof remains the evidence for the core synchronization
boundary. A stale `s.pageIndex` source-pattern name initially failed the source
scan; it was corrected to the actual `state.pageIndex` without changing the
source under audit. The initial full harness run reported 538/550 passing and
12 failures (317.2249852 seconds); these failures were not waived.

Focused verification passes **13/13** (8.8938401 seconds, terminal exit 0):

```powershell
node --test --test-name-pattern='paginator|does not infer an authoring defect' tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/supplemental-capture-evidence.spec.mjs
node scripts/audit-material-paginator-navigation.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/supplemental-current-ancestry-audit/paginator-navigation-audit-v3
```

Repeating the capture requires a new output directory; never overwrite V3.
The read-only full replay uses `buildMaterialInputAudit` followed by
`validateMaterialInputAudit`, with these exact selected paths:

- Parity: `artifacts/material-parity/current-ancestry-audit/latest-report.json`.
- Normal line boxes: `artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json`.
- Control line boxes: `artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json`.
- Supplemental line boxes: `artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json`.
- Supplemental root: `artifacts/material-parity/supplemental-current-ancestry-audit`.

It now includes **4,956 case sides**, **127 detected source findings**, **87 source
fingerprints**, and all 24 reviewed supplemental paginator tooltip omissions.
Its only strict rejection is **3,117 resolved-style differences still lacking
root-cause attribution**; there is no paginator inventory, provenance or text
mapping rejection. The 8,143 unique mapped style signatures and 380,520
occurrences remain unchanged. The top unresolved property groups include
fontSize (219), color (194), caretColor (186), and height (176). These are review
groups, not counts of confirmed renderer defects; for example, wrapper-level
font-size snapshots must not be conflated with their child label's font inputs.
An additional read-only light/desktop sample of chips confirms the distinction:
the reference `chip-0` host is 16px and has no own text, while its nested Material
text label is 14px; candidate `.chip` authors 14px on its flex host. This is not
proof that the visible label is two pixels too small. Full authoring, inheritance,
generated-box and state ownership must be traced before classifying those host
signatures or altering typography. The observation does not waive the difference.

The second full harness run passed 549/550, with only the old 80-fingerprint
count assertion failing against the expanded 87-file inventory (504.8698007
seconds, terminal exit 1). The test now requires all seven added files by name
and verifies the distinct core-focus and disabled-authoring findings; its focused
run passes 1/1 (1.7603888 seconds). The final `npm run parity:harness:check`
rerun passes **550/550**, terminal exit 0, **373.2240375 seconds**, with no
failures, skips or cancellations. All ten frozen capture-harness hashes remain
unchanged and `git diff --check` passes. The audit integration and diagnostic
capture correction are committed and pushed as **7aa9e8a**; findings and the V3
machine summary are a separate increment.

The larger input-equivalence audit remains incomplete. Completing the remaining
attributions and relevant state coverage, generating the final human/machine
audit package and running the final unfiltered enforced parity matrix remain
required. This increment does not certify all paginator variants, raster parity,
or a renderer fix.

## Enabled-button held focus: isolated core semantic synchronization defect

The paginator's enabled `previous-press` uncertainty is now reduced to a
browser-only public-package reproduction with **two ordinary enabled buttons**.
`examples/material-showcase/audit/button-pointer-focus.mjs` imports Astylar only
from `astylarui`; there is no Material dependency, application plugin, update,
private renderer access, scene mutation, injected focus, or compensating input.
One declaration list produces the HTML CSS and the Astylar rules. Both sides
have the same button text/type, `disabled:false`, and native tab index 0.
Candidate normal/effective styles must retain every explicitly authored value.

The proof uses a 400x160 CSS-pixel surface in a 640x360 viewport, Chrome
152.0.7977.76, DPR 1/2 and two repetitions. Ten boundaries per cohort cover
initial state, real Tab, held/released Space, hover, held pointer-down and release
on each button. Fonts and two frames settle, followed by a declared 250ms delay.
Pointer delivery uses the same authored CSS-space target on each side; captured
native and public pointer events independently verify the intended hit. No
Babylon-space layout calculation is used by this reproduction.

**40 paired cases, 80 screenshots: eight focus failures, 32 passing controls.**
All eight held-pointer samples focus the intended button in the browser
reference. Astylar's public interaction diagnostic also identifies that button
as logically focused and pressed, but its document active element remains
`CANVAS`. Public events record pointerdown, blur of the previous button, and
focus of the new button; native events instead move focus from the previous
semantic button to canvas. Keyboard focus, held/released Space, and post-release
focus agree in every cohort. Runtime and evidence errors are zero. This is not
an inference that Astylar delays *logical* focus until release: it demonstrably
does not.

The first isolated divergence is the **logical-to-native semantic focus
synchronization boundary**, not paginator state, disabled authoring, hit testing,
coordinate conversion or Material styling:

1. `src/lib/astylar-interaction-runtime.ts:555-561` dispatches pointerdown, focuses
   canvas and sets the nearest focusable logical target when not cancelled.
2. `src/lib/astylar.ts:670-695` sets `pointerFocusTransaction` on pointerdown and
   suppresses queued semantic focus synchronization for pointer transitions,
   focus events, and the transaction. The plain enabled button has no other
   invalidation/update to synchronize semantic focus while held.
3. Accepted click clears the transaction and admits `queueFocusSync`; the
   post-release samples then focus the semantic button. The bridge's
   `queueFocusSync` at `astylar-semantic-bridge.ts:204` and `syncFocus` at line
   317 already provide the native focus operation.

`git blame` and `git show dbe4d8ed` locate the broad transaction suppression in
`dbe4d8ed1becde19f8036bed8479c971b1e95c58` (semantic focus and activation, August
18). That change also introduced explicit preservation of directional text
selection. This is source-history evidence, not a runtime bisect establishing
the first failing historical release. Existing
`interaction-focus-navigation.fixture.ts:20-40` samples completed clicks or
explicit semantic focus, not an enabled held-pointer boundary. The bridge unit
test at `astylar-semantic-bridge.spec.ts:285-347` explicitly invokes
`queueFocusSync`, so it cannot detect the facade declining to queue it. This
explains the relevant coverage gap without claiming all prior tests are useless.

The eventual correction belongs in **core interaction/semantic coordination**:
synchronize eligible enabled controls at the correct pointer default boundary
without breaking cancellation, pointer capture, selected-text preservation,
native/scene event ordering, or focus-visible modality. Keep keyboard/release
controls, add drag-out/release, cancellation and text-selection controls before
changing the rule. Do not force focus in paginator handlers, disable semantic
accessibility, or delete selection safeguards wholesale. This diagnosis does
not reclassify the paginator's separate disabled-interactive authoring mismatch.

Reproduction and replay:

```powershell
node scripts/audit-button-pointer-focus.mjs --output=artifacts/material-parity/button-pointer-focus-audit-v2
node --test tests/material-parity/button-pointer-focus-evidence.spec.mjs
node --input-type=module -e "import{readFileSync}from'node:fs';import{validateButtonFocusReport}from'./scripts/audit-button-pointer-focus.mjs';const d='artifacts/material-parity/button-pointer-focus-audit-v2';console.log(validateButtonFocusReport(JSON.parse(readFileSync(d+'/latest-report.json')),{artifactRoot:d}));"
npx ng build --output-path=dist/button-pointer-focus-audit-build
npm run parity:harness:check
```

The build command runs in `examples/material-showcase`; the others run at the
worktree root. Capture requires a new output directory on repetition. V1 and
V2 both reproduced the same eight failures; V2 adds stronger evidence checks
and is authoritative. It exits **1 for genuine focus failures**, not a missing
button or infrastructure error. The installed public package is bundled afresh;
the runner verifies the served bundle bytes and fingerprints all **2,516** build
inputs. Installed versions: Angular 20.3.29, Babylon 8.56.2, AstylarUI 0.2.0,
esbuild 0.28.1. No frozen comparison build or capture harness was modified.

V2 report SHA-256:
`abf9f0ff089894bfa5930aeb0a617bd53a892e017ad5049bb0d89657bd57f571`.
`docs/material-button-pointer-focus-audit.json` retains all 40 observations,
shared inputs, native control contracts, held public/native events, logical and
document focus, checks, source/package fingerprints, and hashed report/PNG
references. `validateButtonFocusReport` independently replays the complete
ordered matrix, sample checks, cumulative native events, current bundle-input
hashes and screenshot hashes/dimensions: **40 cases, eight preserved failures**.
Sample-check tests pass **2/2**, including 18 unequal, malformed, synthetic,
mis-targeted or stale-style controls, terminal exit 0 (0.6922599 seconds).
The isolated normal consumer build passes, exit 0, 52.169 seconds, with two
prerendered routes. It does not compile or prove the standalone JS entry; that
entry is separately bundled and executed by the real-browser capture.
The full registered harness suite passes **545/545**, terminal exit 0,
303.7769952 seconds, with no failures, skips or cancellations. Eleven additional
mutations of the real report (matrix/order, state, source/PNG binding, claimed
focus results, logical focus and trusted input) are rejected by the replay
validator. Independent regeneration exactly matches the checked-in machine
summary. All ten frozen capture-harness hashes remain unchanged, and
`git diff --check` passes. The focused proof and its registered tests are
committed and pushed as `a5bd5e8`; the findings are recorded separately.

This is a focus-contract proof, **not full visual/input equivalence** of every
property. Incidental renderer defaults and duplicate text remain visible in
the captured candidate PNGs; no styles were altered to conceal them. Screenshot
inspection verifies that the two hit controls exist, not raster acceptance.
Other pointer types, themes, cancelled input and assistive-technology behavior
remain unproven. Consolidated classification/inventory integration and the final
unfiltered enforced parity run remain required; no renderer defect is fixed by
this audit increment.

## Paginator navigation boundaries: new state evidence, not whole-component acceptance

The earlier 52 paginator cases only exercised Next page near the initial page.
The separate `scripts/audit-material-paginator-navigation.mjs` now captures
**26 ordered action boundaries in light/dark at DPR 1/2**: **104 paired cases**,
**208 full input trees and 208 screenshots**. Viewport is 1440x1000 CSS pixels;
fonts, two animation frames and a declared 250ms sampling delay settle each
boundary. Both sides receive the same real pointer and Space-key actions. No
page index, focus call, renderer input or example behavior is injected.

The sequence presses/releases the initially unavailable Previous button, moves
to page 2 and returns through Previous, visits every page through page 10,
presses/releases the unavailable Next button, returns to page 9 and then uses
Space down/up to reach page 8. Hover, held input, release and pointer departure
are separate samples. This closes the specific previous-navigation and range
boundary evidence gap; it does not certify compact/density variants, arbitrary
page lengths, tab-order traversal or all paginator styles.

The checkpoint-bound report is
`artifacts/material-parity/supplemental-current-ancestry-audit/paginator-navigation-audit-v2/latest-report.json`,
SHA-256 `1056a08df691e09e91f76a3355a79ada71cda25c7c15fa5c72d6ee68d0877ec2`.
The checked-in `docs/material-paginator-navigation-audit.json` retains each
observed state, exact native/ARIA disabled values, focus target, tooltip text,
assertion result and hashed tree/PNG references. Browser is Chrome 152.0.7977.76;
each side's served document, script, stylesheet and font bytes match the frozen
current-ancestry checkpoint. Input equivalence and final-raster verification
are explicitly false.

Observed results:

- All **104** page-range and candidate-state observations follow the expected
  sequence. Space-down preserves page 9 and Space-up moves to page 8 on both
  sides. Unavailable controls do not navigate past either boundary.
- **48** cases have different native-disabled inputs. This is not a failed
  range guard: Material uses `disabledInteractive`, `aria-disabled="true"` and
  `tabindex="-1"`, without native `disabled`, while AstylarUI authors native
  disabled buttons. Both indicate unavailability, but their focus behavior is
  not equivalent. Keep these fields separate rather than treating native
  `disabled:false` as an enabled Material action.
- **44** cases disagree on the focused navigation control. Forty coincide with
  the disabled-input difference; the other four are the enabled
  `previous-press` samples. In those held samples the reference focuses Previous
  while the candidate document's active element is CANVAS. After clicking an
  enabled control and completing the resulting update, the candidate semantic
  button is focused. These counts describe observations, not independent bugs.
- **24** samples have reference navigation tooltip text but no candidate
  tooltip. They are `next-once`, `previous-hover`, `previous-press`,
  `next-step-1`, `previous-from-last`, and `previous-space-held`, in each of the
  four profile/DPR cohorts. Previous-hover screenshots were inspected on both
  sides; the reference message is visible above the control. Post-click
  presence is recorded at this sampling boundary, not generalized into an
  unrestricted tooltip timing contract.

Root-cause assessment and implementation order:

1. **Confirmed authoring mismatch:** candidate navigation controls at
   `astylar.component.ts:894-895` replace the reference disabled-interactive
   contract with native disabled controls. `git show 2f44011` confirms this was
   already present in the initial showcase; `7843582` moved the controls into
   the current layout without restoring that behavior. Installed
   `@angular/material/fesm2022/paginator.mjs:334-338` explicitly guards clicks
   because disabled-interactive buttons still dispatch them. Its template
   explains focus retention on becoming disabled and removal from tab order.
   Restore this input/behavior contract through core public APIs; determine any
   missing public/core capability with an equal-input proof. Do not force focus
   back with a paginator-only workaround or weaken disabled-control rules.
2. **Confirmed authoring omission:** both navigation tooltips are absent from
   candidate composition. This extends the existing Next page omission finding
   to real Previous page states. Restore the original text, above-positioned
   trigger intent, disabled behavior and shared overlay composition before
   investigating residual tooltip rendering. There is no candidate tooltip to
   reposition in these captures.
3. **Suspected at this capture; isolated by the enabled-button section above:** the
   enabled held-press focus mismatch cannot be explained by native disabled
   authoring. Current `src/lib/astylar-interaction-runtime.ts:555-561` dispatches
   pointerdown, focuses the canvas and updates logical focus; the captured
   document focus stays on canvas during the held sample. This source inspection
   alone does not prove whether the first divergence is logical focus, semantic
   synchronization, browser default focus, or update timing. Add a minimal
   equal-input enabled-button pointerdown/hold/up proof that records logical and
   document focus together before assigning a confirmed core cause. Do not infer
   that all 44 focus observations share one defect.

The V1 development capture incorrectly compared only native disabled against
page-boundary availability. Its terminal failure and artifacts are preserved
but superseded. V2 records native disabled, ARIA disabled and tab index separately
and repeats the complete sequence; no application input was adjusted. V2 exits
**1** because the observed input, focus and tooltip discrepancies remain.

`validatePaginatorNavigationCapture` independently checks checkpoint/source/
runtime binding, complete ordered actions, unique tree owners, exact range and
native/ARIA inputs, current candidate style stages, cumulative trusted events,
focus identity, tooltip tree content, screenshot hashes/dimensions and replayed
assertions. Validation succeeds with **104 observations and no evidence errors**;
it does not require failed behavioral comparisons to become true. Tests cover
the full synthetic matrix and **34 malformed/forged input/artifact controls**.

```powershell
node scripts/audit-material-paginator-navigation.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/supplemental-current-ancestry-audit/paginator-navigation-audit-v2
node --test --test-name-pattern='paginator navigation' tests/material-parity/supplemental-capture-evidence.spec.mjs
```

The capture command requires a new output directory on repetition. Focused
tests: **2/2 pass**, terminal exit 0, 1.5420112 seconds.
`npm run parity:harness:check`: **543/543 pass**, terminal exit 0,
302.6931803 seconds, no failures, skips or cancellations. An independent replay
also compares the entire checked-in summary with all 104 validated observations
and artifact references; it matches exactly. All ten frozen capture-harness
hashes remain unchanged and `git diff --check` passes.
Integration of these full trees into the consolidated style/
typography audit, the enabled-focus minimal proof and final enforced parity
remain required. The main report's 3,117 unresolved style groups are unchanged
by this standalone evidence increment.

## Button host typography: preserve and link the demonstrated input cause

The audit now connects a button-host font-family or letter-spacing scalar to
the existing independently captured control-label cause. Previously, the
control-text section explained these token omissions while the corresponding
host-style scalar could remain unresolved. This is an evidence link, not a new
renderer fix, a font-list equivalence rule, or substitution of paint values for
missing authored inputs.

`collectButtonTypographyScalarInputs` in
`tests/material-parity/input-equivalence-audit.mjs` admits only the existing
`reviewed-button-font-token-input` and `reviewed-button-tracking-input` causes.
The reference button must uniquely own its direct Material label; the candidate
must be the uniquely matched current core button-text owner. Complete captured
rules and inline declarations must demonstrate the same component-token and
reset/omission cause. Reference host/label values and candidate normal,
comparison, interaction and painted stages must agree with that cause. The
separately captured scalar snapshot must match these owners, text, declaration
witnesses and current style stages. Conflicting or potentially applicable
overrides, shorthand resets, incomplete captures and ambiguous owners prevent
the link.

The new `reviewed-button-typography-host-input` classification remains an
**application/plugin authoring defect**. It preserves `Roboto` versus
`Roboto, Arial, sans-serif`, and `.096px` tracking versus an omitted declaration
and zero painted tracking, as unequal inputs. The document-font reset in
`astylar.component.ts:476` was introduced by `af04845`; the component rules at
lines 487 and 648 still omit the Material component font token. The filled and
outlined button rule also omits tracking. The existing source findings retain
the initial showcase omission history. The separate core font-list rewriting
defect is not routed upstream into this authoring classification.

Every unique reviewed case is retained beyond the twelve display samples. The
validator re-derives the link from the full inventory and independently
reproduces the original control-text cause, rather than trusting report labels.
It rejects altered causes, values, ownership, classifications and missing or
duplicated case records. Whole-input equivalence and final-raster verification
remain false.

Focused command:

```powershell
node --test --test-name-pattern='button host typography|button tracking attribution|button font-family attribution|core font-list rewrite attribution' tests/material-parity/input-equivalence-audit.spec.mjs
```

Result: **6/6 pass**, terminal exit 0, 19.9103267 seconds, no failures,
skips or cancellations. New coverage includes 25 positive property/kind/state
combinations, 39 conflicting/incomplete input controls, and 15 report mutation
controls with a fifteen-case grouped record. Initial development runs incorrectly
expected a reduced control-only fixture to satisfy showcase root coverage; the
test now explicitly preserves that missing-root diagnostic while requiring all
ownership validation to pass. No validator acceptance rule was weakened.

The full consolidated in-memory rebuild used the unchanged main capture,
static normal-line-box report, control-line-box V3 report, supplemental line-box
report and supplemental capture root recorded in the consolidated command
below. It produced **1,252 independently replayed host-property witnesses**,
**19 scalar groups**, and **1,252 occurrences / 1,252 retained reviewed-case
IDs**, across bottom-sheet, button, card, core, dialog, menu, snack-bar and
tooltip. Only font-family and letter-spacing are linked. All 125 source
findings and 80 source fingerprints remain present. Unresolved style groups
fall **3,136 to 3,117** without changing any scalar value.

Strict validation returns exactly
`["3117 resolved-style differences still lack root-cause attribution"]`.
The report-mode diagnostic exits 0; this is not strict audit acceptance.
Configured capture coverage remains true and input equivalence remains false.
`npm run parity:harness:check` passes **541/541**, terminal exit 0,
428.0454886 seconds, with no failures, skips or cancellations. All ten frozen
capture-harness files still match their checkpoint SHA-256 values. No renderer,
plugin, canonical example or reference was changed. Complete relevant-state
coverage, remaining classifications, final report generation and the unfiltered
enforced rendering matrix are still required.

## Captured non-grid template omissions: bounded scalar classification

The block/flex controls committed in `77b2098` now support a narrowly scoped
machine classification, `reviewed-non-grid-template-omission`. The new helper
`tests/material-parity/grid-template-input-evidence.mjs` does not change any
captured value or synthesize candidate defaults. It attributes only the
`gridTemplateColumns` and `gridTemplateRows` differences whose browser value is
`none` and whose candidate value is absent, subject to all of these witnesses:

- Exactly one paired case and same-ID ordinary node on each side; no native
  controls, Material/custom hosts, plugin elements, SVG, or document roots.
- Complete captured authored rules, inline declarations, and V2 core-style
  inspection with a valid revision and no case-level collection errors.
- Reference display and all three candidate style stages are explicitly
  `block` or `flex`. Their values need not equal each other: any independent
  block-versus-flex difference remains in the report, not waived by this proof.
- Both browser template values are `none`; candidate normal, comparison and
  interaction stages omit grid declarations. Neither authored side requests
  grid, resets, animation or transition declarations for the mapped element.
- Every candidate rule is checked, independently of semantic-DOM matching.
  A rule containing grid/reset/motion declarations is excluded only when its
  simple selector cannot apply. Unknown selectors, potentially applicable
  state/media rules and nested declarations prevent attribution.
- The separately captured style-comparison snapshot agrees with the full-tree
  node types, display witnesses and omitted template inputs.

Evidence retains the exact case, node keys, types, revision, three candidate
display witnesses, reference rule indices and excluded candidate rule indices.
It explicitly sets whole-element equivalence and final-raster verification to
false. The validator independently re-derives the full evidence array, checks
each classified scalar, and requires every unique reviewed case—not just the
twelve displayed samples. There is no addition to global implicit-value policy.

The regression checks cover sixteen state/context combinations, rejection of
active grid and incomplete/conflicting evidence, and fifteen grouped cases
with forged/missing/duplicated review records. The original unresolved-template
snapshot test still passes for block, flex, grid and inline-grid without these
full-tree witnesses. Confirmed active-grid `none` failures are unchanged.

Focused verification:

- `node --test --test-name-pattern='non-grid template|grid none proof|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **5/5 pass**, terminal exit0, 48.3162725 seconds, no skips/cancellations.
  The first development run had two incorrect synthetic-test total-count
  assertions: the collector also found thirteen existing supplemental nodes.
  Assertions now count the intended `core-root` node explicitly; supplemental
  evidence remains collected and independently validated, not filtered out.
- The helper is included in source fingerprints (now 80); the existing 125
  source findings, core proof, implementation ownership and raw captures stay
  intact.
- Full consolidated in-memory rebuild using the frozen main report, static
  normal-line-box report, control-line-box V3 report, supplemental line-box
  report and `supplemental-current-ancestry-audit` root (the full command and
  paths are recorded in the earlier consolidated-rebuild sections):
  **2,518 contextual inventory witnesses**, **74 classified scalar groups**,
  **4,742 occurrences / 4,742 retained reviewed-case IDs**, across all 36
  configured families. Only `gridTemplateColumns` and `gridTemplateRows` are
  attributed. Inventory witnesses can cover nodes without a corresponding
  scalar comparison; their count is not a count of accepted whole elements.
  Unresolved style groups fall **3,210 to 3,136**, with no scalar values changed.
  Strict validation returns exactly
  `["3136 resolved-style differences still lack root-cause attribution"]`.
  The diagnostic wrapper asserting that incomplete result exits0; this is
  **not** strict audit acceptance. Configured capture coverage remains true,
  while overall input equivalence remains false.
- `npm run parity:harness:check` — **538/538 pass**, terminal exit 0,
  492.7258817 seconds, no failures/skips/cancellations. This includes independent
  evidence replay, malformed/forged-report controls and codec checks; it is not
  a replacement for the final enforced rendering matrix.
- All ten frozen capture-harness files retain their checkpoint SHA-256
  values; `git diff --check` passes. The final full enforced parity gate and
  remaining comparison/state and input-classification work are still pending.

## Grid template context controls: inactive is not globally equivalent

The public package proof now preserves all sixteen original active-grid cases
and adds **32 two-child block/flex cases**: both template axes, 120/240px
container extents, and unchanged omitted, `none`, `1fr`, and literal template
inputs. The same style objects still create both surfaces. Ordinary non-grid
children have definite 20px sizes; a second child distinguishes vertical block
flow from horizontal flex flow. This is an isolated diagnostic, not a rewrite
of the Material examples or a proposal to replace grid with block/flex.

The expanded repeat produced **4 failed / 44 passed**, terminal exit 1. All
32 block/flex controls pass. All parent and child edges match exactly in these
controls, no node receives `astylarGridAssignedSize`, and the browser retains
the specified non-grid template (`none` for omission) instead of a used track
extent. Core normal/effective stages retain the authored declaration. The four
failures are still only explicit `none` on active grid, already reduced below.
Unchanged input, no diagnostic errors, and zero-resource disposal are asserted
throughout.

Source trace: `GridService.isGridContainer` at
`src/app/services/dom/elements/grid.service.ts:47` selects only `grid` and
`inline-grid`. `ElementCreationService.processChildren` at
`src/app/services/dom/elements/element-creation.service.ts:602` checks the
formatting context, dispatching to grid at line635 and flex at line637;
ordinary block flow takes neither grid branch. Both source files are already
fingerprinted. Templates alone do not choose the grid formatting context.

This is evidence for a future **state- and context-bound** omitted-template
classification, not an unconditional `none`/missing normalization. The
classification still needs uniquely paired ordinary nodes, complete authored
rule/inline evidence, and matching captured non-grid style stages. Explicit
grid inputs, custom plugins, missing evidence, and grid-capable states must not
inherit this acceptance. The existing unresolved-snapshot guard now includes
`block`, `flex`, `grid`, and `inline-grid`; it does not waive any captured
template differences. No existing discrepancy count is reduced here.

Verification so far:

- Expanded browser command, run twice:
  `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/grid-template-initial-audit.spec.ts --progress=false`.
  First run: **5 failed / 43 passed**, terminal exit1, 22.65 seconds browser
  total. In addition to the four expected grid failures, the first randomized
  case (`flex: rows 1fr in 120px`) exceeded the unchanged five-second Jasmine
  async limit. Its eventual logged observations do not turn that timeout into
  a passing run. No timeout or geometric threshold was relaxed.
- Unchanged repeat: **4 failed / 44 passed**, terminal exit1, 15.382 seconds
  browser total / 8.641 seconds test execution; no async timeout. Chrome
  Headless152.0.0.0 Windows, DPR1, Angular core20.3.29, CLI20.3.34,
  AstylarUI0.2.0, Babylon8.56.2. The existing NG0914 test-configuration warning
  remains recorded. No canonical renderer, fixture, or frozen runtime changed.
- `node --test --test-name-pattern='grid none proof|records source fingerprints|source audit has' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **3/3 pass**, terminal exit0, 9.6486799 seconds, zero skips/cancellations.
  Fingerprints remain79 and source findings125; the proof inventory describes
  the active/inactive distinction and the first-run timeout explicitly.
- `npm --prefix examples/material-showcase run build -- --output-path=dist/grid-template-context-audit-build`
  — terminal exit0, 69.811 seconds, two prerendered routes, no warning/error
  lines in the captured build output. The isolated output does not overwrite
  the frozen showcase used for the comparison captures.
- `git diff --check` passes. All ten frozen capture-harness files still match
  their checkpoint SHA-256 values. Full audit acceptance and final enforced
  parity remain pending; the browser controls alone do not complete either.

## Grid `none` template: confirmed equal-input core mismatch

The calculation-level suspect from the preceding increment is now reproduced
through the installed package's public `Astylar.mount` API in real Chrome.
The isolated `grid-template-initial-audit.spec.ts` creates the browser stylesheet
from the **same rule objects** passed to AstylarUI. It contains no Material
plugin, text, offsets, measured dimension substitution or alternate candidate
structure. The separate omitted, fractional and literal trials are controls,
not proposed fixture replacements.

Both runs produced **4 failing / 12 passing tests** at DPR 1. The parent grid
box and unaffected item dimension match in every trial. The failing dimension
is already zero in core's assigned CSS item size, before final projection:

| Original declaration on both sides | Container extent | Browser item extent | Assigned CSS / projected Astylar extent |
| --- | ---: | ---: | ---: |
| `grid-template-columns:none` | 120px | 120px | 0px / 0px |
| `grid-template-columns:none` | 240px | 240px | 0px / 0px |
| `grid-template-rows:none` | 120px | 120px | 0px / 0px |
| `grid-template-rows:none` | 240px | 240px | 0px / 0px |

Omitted templates, `1fr`, and corresponding `120px`/`240px` literal templates
pass on both axes. Original input objects and browser stylesheets remain
unchanged. Normal and effective inspection retain the explicit `none` input;
there are no diagnostic errors, and disposal returns mesh, material and texture
counts to zero. These assertions run even in the four failing geometry trials.

Root cause and ownership:

- `tokenizeGridTrackList` leaves `none` as a token instead of representing the
  absence of an explicit track list.
- `resolveIntrinsicGridRows` rejects that token and falls back to definite
  track resolution.
- `resolveGridTracks` treats the token as a numeric track; the nonnumeric
  definite-length fallback supplies zero. Omitted columns instead enter the
  fractional fallback, and omitted rows enter implicit auto sizing.
- `GridService.processGridChildren` assigns that zero CSS extent to the item.
  The observed zero is not introduced by mesh-to-screen projection.

The source helper and installed package helper independently return identical
values for all eight width/template calculation controls. Raw SHA-256 values:
source `grid-track-sizing.ts`
`0e71e0c6b00c9c057a257a816f4a1f5ef5750ffd507242472ce79d46982e3f96`;
installed `dist/lib/app/services/dom/elements/grid-track-sizing.js`
`d4266467e7f2bf1452270eb15f2a1b0eb0822be005628bc1e764e34306bc5d9d`.
History identifies `a6bd57c` as the extraction of the current tokenizer; it does
not yet establish the first bad revision of the behavior.

The machine source finding is `core-grid-none-template-becomes-zero-track`.
The proof, source/installed grid helpers and source/installed GridService are
fingerprinted. The plan now assigns this to shared grid template semantics and
implicit track sizing, before fixture compensation removal. Keep all explicit
`none` failures; do not change them to `1fr`, literal tracks or explicit cells.
Extend empty/multiple-item grids, implicit placement, grid-auto sizing, intrinsic
contributions, gaps, updates and DPR coverage before claiming a general fix.

This proves only the stated DPR-1 geometry mismatch. It does not establish
final raster parity or mean every captured `none`/omission difference is a core
defect. Non-grid properties and mismapped formatting contexts remain separate
reviews. A harness guard explicitly preserves unresolved template snapshots
instead of introducing a blanket normalization.

Verification:

- `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/grid-template-initial-audit.spec.ts`
  — **4 failed / 12 passed**, terminal exit 1, 2.271 seconds browser total.
- Repeat with `--progress=false` after adding assigned-CSS-size diagnostics:
  **the same 4 failed / 12 passed**, terminal exit 1, 2.252 seconds browser
  total (2.225 seconds test execution). Chrome Headless 152.0.0.0, Windows,
  Babylon 8.56.2; Angular core 20.3.29, CLI 20.3.34, AstylarUI 0.2.0. The existing
  `NG0914` zoneless-with-Zone.js test-configuration warning remains unchanged.
- `node --test --test-name-pattern='grid none proof|records source fingerprints|source audit has' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **3/3 pass**, zero skips/cancellations, 2.0626551 seconds.
- `npm --prefix examples/material-showcase run build -- --output-path=dist/grid-template-initial-audit-build`
  — terminal exit 0, 27.111 seconds, two prerendered routes. The new isolated
  build directory does not replace the frozen capture runtime.
- `npm run parity:harness:check` — **535/535 pass**, zero skips/cancellations,
  terminal exit 0, 267.415768 seconds. These are audit/harness checks, separate
  from the four intentionally retained browser/core reproduction failures.
- The full consolidated in-memory rebuild and strict validation command
  documented below now records **125 source findings / 79 fingerprints**.
  Strict validation still returns exactly
  `["3210 resolved-style differences still lack root-cause attribution"]`;
  the diagnostic wrapper asserting this expected incomplete status exits 0.
  No captured style signature was blanket-attributed from the new reduction.

## Shared demo formatting-context dependencies

The mapped `.demo` reference section uses ordinary block flow. The candidate
shared root rule in `examples/material-showcase/src/app/astylar.component.ts`
explicitly requests `display:flex; flex-direction:column; gap:16px` instead.
`git log -G 'rootId.*gap'` and `git show 2f44011` confirm that this combination
was already present in the original showcase commit. It is not evidence of a
recent renderer regression. The first demonstrated divergence is fixture
authoring, before layout or Babylon projection.

The existing `fixture-demo-block-flow-replaced` source finding and root
display/position attribution now also have guarded direction/gap attribution.
The new `reviewed-root-flow-dependency` classification requires a mapped
version-2 section on both sides, the exact candidate root declaration, no
reference flex/gap/reset declaration, no competing candidate formatting rule,
and matching candidate normal, interaction and comparison stages. It accepts
only the observed `row` versus `column` and `normal` versus `16px` differences
under the traced block-to-flex context replacement. It does **not** normalize
gaps globally, infer a core defect from unequal values, or declare any input
or final raster equivalent.

The full main capture groups **102 signatures / 6,519 occurrences across 34
families** under this authoring cause. The distinct properties are
`flexDirection`, `rowGap` and `columnGap`. Repeated root rules on button and
toolbar, and 26 paginator occurrences per property, remain outside this
conservative rule; they require separate cascade/state review rather than a
blanket root-ID exemption. All other properties remain unchanged and open to
independent investigation.

The unresolved total is **3,210**, down from 3,309. This is a reduction of 99,
not 102: three paginator signatures split into classified and still-unresolved
occurrences. A read-only replay of the prior committed classifier confirms
that all 102 new groups previously had unresolved attribution. The first
full diagnostic command returned the correct strict failure but exited 1 on
an incorrect expected-total assertion of 3,207; that arithmetic assumption was
corrected, not the evidence or the validator.

A real-Chrome browser sensitivity proof at DPR 1 and 2 holds content and box
inputs constant while deliberately substituting the candidate formatting
request. With one child, the two container heights are equal; with two children,
the candidate introduces 16px extra separation and height. Thus the screenshot
can hide this unequal input. This is an **unequal-authoring sensitivity proof**,
not a minimal equivalent-input core failure. The existing independent block,
intrinsic-height and anonymous-flex reductions remain the core evidence.

Implementation order: retain those core failures, repair their owning general
rules, then restore the reference block-flow request and remove the shared
fixture substitution. Do not replace the 16px gap with another calibrated
number. Test one/multiple children, margins, wrapping, nested flow and viewport
changes against equivalent inputs before claiming that restoration complete.

Focused verification:

- `node --test --test-name-pattern='root flow dependencies|browser block and column-flex|reviewed shared root' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **3/3 pass**, no skips/cancellations, 12.1668952 seconds. Includes five
  static/interaction state controls, 29 rejection controls and the browser
  one-child/two-child sensitivity proof at both DPRs.
- With complete `reviewedCases` retention added,
  `node --test --test-name-pattern='root flow|browser block and column-flex|reviewed shared root' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **4/4 pass**, no skips/cancellations, 15.9695431 seconds. The additional
  15-case test verifies that the 12-entry display sample does not discard
  classified case identities.
- All ten frozen baseline harness files still match their checkpoint hashes.
  No renderer, plugin, showcase declaration, capture or threshold was edited.
- Final `npm run parity:harness:check` — **534/534 pass**, no skips or
  cancellations, 301.6635223 seconds, terminal exit 0. The preceding run before
  complete-case retention was added passed 533/533 in 305.2966252 seconds.
- The consolidated in-memory command documented below, using all four main
  and supplemental evidence paths, retains 124 source findings and 74 source
  fingerprints. Strict validation returns exactly
  `["3210 resolved-style differences still lack root-cause attribution"]`.
  The corrected diagnostic wrapper asserts that exact remaining failure,
  102 new groups and all 6,519 retained case IDs; it exited 0. This is a
  successful diagnostic replay, **not strict audit acceptance**. Final report
  generation, complete relevant-state review and unfiltered final visual
  parity are still outstanding.

Next layout investigation: do not add a blanket `grid-template-*:none` versus
omission normalization. Direct execution of the current
`grid-track-sizing.ts` calculation (TypeScript transpilation only, no source
edits) with `availableSize=120`, `gap=0`, `fallbackCount=1` returns `[120]` for
omission, `[0]` for `none`, and `[120]` for both `120px` and `1fr`. The tokenizer
keeps `none` as a token and the definite-length parser converts its nonnumeric
value to zero; omission takes the fractional fallback. Grid dispatch is gated
by `display:grid/inline-grid`, so inactive non-grid properties need a separate
context analysis. This is a calculation-level suspect, **not yet a public-API
browser/core reproduction or an attribution of all captured grid signatures**.

## Consolidated supplemental natural-line-box attribution

The consolidated audit now consumes the independently validated supplemental
metrics through the explicit `--supplemental-line-box-report` option. Empty
or repeated options fail. Missing evidence is not replaced by a measurement
from a similarly named main-checkpoint state. Both the structured report and
Markdown expose this separate evidence stage and its missing/error counts.

The complete corrected baseline rebuild records 671 main interactive and 46
supplemental observations, with all 46 supplemental line-height differences
classified as `reviewed-supplemental-normal-line-box-stage-comparison`
(`parity-harness-defect`). This addresses comparison of browser computed
`normal` with numeric candidate paint; it does not change either value or any
other input. Each attribution requires an exact state/owner observation,
original typography/paint provenance, matching measured CSS height and a
complete candidate ancestry omitting explicit line-height and font shorthand.
Font size/weight/style must match at the compared stages. Calendar text
composition, font-list/tracking differences, state behavior and overlay
placement/raster remain independent findings.

Validation reloads the original calendar-close and tooltip-state sources,
rederives their current typography comparisons from the inventory, reloads the
metric report through its independent reader, and reconstructs the exact
scalar attributions. It checks the entire relevant comparison/difference lists,
including fabricated or moved attribution records. It does not trust the
persisted report's status strings, measurement counts or review metadata.

Verification:

- Focused real-source join: **46/46 attributed**, zero evidence errors and zero
  unresolved supplemental control-typography entries. All raw comparisons and
  all non-line-height differences are byte-for-byte structurally unchanged.
- `node --test --test-name-pattern='audit CLI|supplemental line-box|interactive line-box' tests/material-parity/input-equivalence-audit.spec.mjs`
  — 8/8 pass, no skips/cancellations, 4.7334812 seconds. New proofs cover all 46
  measured state/DPR combinations, 24 rejection controls and six forged report
  controls; synthetic 32px observations prevent a hard-coded 17px acceptance
  rule. Main and supplemental attribution scopes reject each other's evidence.
- `npm run parity:harness:check` — **531/531 pass**, no skips/cancellations,
  284.1629715 seconds, polled to terminal exit 0.
- Full in-memory report build with the current-ancestry baseline, its static
  normal-line-box report, main V3 control-line-box report, the supplemental
  line-box report and original supplemental root: **671 main / 46 supplemental
  observations, 46 new attributions, zero supplemental evidence errors, zero
  unresolved captured control-typography entries**, 124 source findings and
  74 source fingerprints. `validateMaterialInputAudit(a, {requireComplete:false})`
  returns `[]`. Strict validation returns exactly
  `["3309 resolved-style differences still lack root-cause attribution"]`.
  The diagnostic command exited 0 after asserting its expected observations and
  diagnostic result; **strict acceptance did not pass**.
- All ten frozen harness files still match their checkpoint hashes. No
  renderer, plugin, showcase input, captured tree, runtime asset or visual
  threshold was changed. Final report files were not regenerated prematurely.

Reproduce the in-memory consolidated check without overwriting preserved
report artifacts from the worktree root:

```powershell
node --input-type=module -e "import{readFileSync}from'node:fs';import{buildMaterialInputAudit,validateMaterialInputAudit}from'./tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',controlLineBoxPath:'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json',supplementalLineBoxPath:'artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('DIAGNOSTIC',validateMaterialInputAudit(a,{requireComplete:false}));console.log('STRICT',validateMaterialInputAudit(a));"
```

At this preceding typography increment, next work was the 3,309 unresolved resolved-style differences, complete
relevant-state coverage and plugin/core ownership review, final machine/human
report generation and the complete enforced parity matrix. Finishing this
typography subcategory does not finish the audit or establish rendering parity.

## Independent supplemental natural-line-box validation (preceding increment)

The capture below now has an independent reader,
`tests/material-parity/supplemental-line-box-report.mjs`. Reopening the real
capture through it returns **46 observations, zero missing targets and zero
evidence errors**. These observations are not yet joined into the consolidated
audit, so its unresolved counts have not been reduced by this increment.

The reader validates both original source reports through their existing
calendar-close and tooltip-state readers and requires the selected cases to
match those complete original results. It then requires all 50 new boundaries
in the original order, including closed states with no target. It validates
checkpoint/browser/source hashes, archived measurement source bytes, fresh
tree/PNG hashes and dimensions, served runtime assets, original paired trees,
query/cohort/view/DPR identity, cumulative trusted event prefixes, keyboard
sequences, pointer actions and centers, observed focus/visibility state and
the fresh tree's corresponding popup presence. Tooltip trigger geometry is
compared with the original report's captured trigger rectangle, not an assumed
rectangle on input-tree nodes (those nodes do not record geometry).

Exact-owner measurement validation is extracted, without changing its rules,
from the main interactive reader into `control-line-box-validation.mjs`.
Both readers now check the same original/fresh typography, complete ancestry,
leaf text, candidate paint provenance, loaded fonts, natural CSS metrics and
separate projected viewport dimensions. No measurement is accepted by assuming
a 17px result. A portable positive control deliberately supplies 18px natural
height, 17px candidate paint and a 22.5px projected observer height; all three
remain distinct. A metric cannot claim input equivalence or final raster parity.

Portable source fixtures were extracted unchanged from the existing
supplemental capture tests and reused for a complete in-memory 50-boundary
reader proof. Forty-five mutations reject changed source reports, source
bytes, snapshots, identities, paired trees, runtime assets, PNG dimensions,
action order, cumulative prefixes, focus/visibility, geometry, exact text
owners, ancestry, fonts and metric claims. Rejection at the final record returns
no observations, not a partially accepted earlier prefix. Missing optional
evidence leaves all 46 targets pending.

Verification:

- `node --check tests/material-parity/supplemental-line-box-report.mjs` and
  `node --check tests/material-parity/control-line-box-report.mjs` — pass.
- `node --test --test-name-pattern='supplemental metric reader' tests/material-parity/normal-line-box-report.spec.mjs`
  — 2/2 pass, 1.9019947 seconds, including the 45 mutation controls.
- `node --test --test-name-pattern='interactive line-box reader|supplemental metric reader|calendar close|tooltip state|reader binds' tests/material-parity/normal-line-box-report.spec.mjs tests/material-parity/supplemental-capture-evidence.spec.mjs`
  — 62/62 pass, zero skips/cancellations, 2.0196592 seconds.
- `node --test --test-name-pattern='records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`
  — 1/1 pass, 0.8587064 seconds; all 74 source fingerprints include the reader,
  shared validator and portable fixture helpers.
- Real-capture replay independently revalidates both original source reports,
  rebuilds the full paired-tree inventory and current typography targets, then
  loads `artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json`
  with the frozen manifest provenance and current property set: exit 0,
  46 observations / zero missing / zero errors. The report SHA remains
  `a630cc4061b3739e7fe1cb656b1e1c93ef51e01298d413bd49e25920c7c6b9e7`.
- Main interactive real-capture replay independently reopens and checks every
  checkpoint record's key/result SHA, rebuilds the 1,875-case paired inventory
  and current control targets, then calls `loadControlLineBoxReport` against
  `control-line-box-current-ancestry-audit-v3/latest-report.json`: exit 0,
  671 observations / zero missing / zero evidence or inventory errors. The
  extracted shared validator preserves the existing main-capture evidence.
- `npm run parity:harness:check` — 528/528 pass, no skips or cancellations,
  251.1761889 seconds, original session polled to terminal exit 0.
- Syntax checks pass for all four new helper/reader modules; `git diff --check`
  passes. All ten frozen harness-file SHA-256 values still match the selected
  checkpoint. Existing unrelated files and local artifacts remain untouched.

This is a reader/instrumentation increment, not a change to the frozen
application or renderer. Consolidated attribution, complete remaining
classification, coverage completion and final enforced parity remain required.

## Supplemental calendar/tooltip natural-line-box capture (preceding increment)

The remaining 46 control line-height observations now have a separate,
reference-only measurement capture. This is evidence collection, not a scalar
attribution or a declaration that either comparison is fixed. The independent
reader and consolidated-report integration remain outstanding.

`scripts/audit-material-supplemental-line-boxes.mjs` validates the original
calendar-close and tooltip-state reports against the frozen current-ancestry
checkpoint before replaying their complete sequences. Four calendar sequences
(month/multi-year at DPR 1/2) retain all five keyboard boundaries, including
the four final closed states with no remaining period-label target. Six
tooltip sequences (benchmark-open, benchmark-hover, ordinary at DPR 1/2)
retain initial/hover/press/release/leave. The latter measure the **trigger
button labels, not tooltip bubbles**. The original queries, viewport sizes,
real keyboard/pointer actions, font readiness and settlement are preserved.

The capture contains 50 fresh reference input trees, 50 PNGs and 50 action
records, with 46 exact-owner measurements: 16 calendar period labels and 30
tooltip trigger labels. All measured natural CSS heights are 17px; the
corresponding original candidate paint heights are also 17px. Original paired
trees, paint and source reports were not changed. This numerical observation
does not establish equivalent typography, positioning, focus behavior,
visibility, clipping, baseline alignment or final raster quality.

Each measurement retains the original reference/candidate owner keys and
typography, a complete fresh DOM ancestry, loaded-font evidence and the
natural CSS line-box observation. Records include original paired-tree hashes,
fresh tree/PNG hashes, state witnesses, event traces and served-asset hashes.
Six measurement-source snapshots are retained without executing archived code.
Target selection does not select states by candidate output. Four focused
tests reject altered, missing or duplicate state cohorts and invalid capture
paths, and preserve the original keyboard/pointer request order.

Evidence and verification:

- Capture command: `node scripts/audit-material-supplemental-line-boxes.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit --output=artifacts/material-parity/supplemental-line-box-current-ancestry-audit` — exit 0; Chrome 152.0.7977.76; 50 states / 46 observations / four empty closed states.
- Report: `artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json`; SHA-256 `a630cc4061b3739e7fe1cb656b1e1c93ef51e01298d413bd49e25920c7c6b9e7`.
- Original source reports remain SHA-256 `d09a946563651c389ad73db8be96bab5c129f7068513aaec9cc6cfa26d003f00` (calendar-close) and `1a554bf3b3bd477a2e7fe148640b07fe539731e4611e32b1e8f7ed2289e68a61` (tooltip-state-v2).
- `node --check scripts/audit-material-supplemental-line-boxes.mjs` and `node --check tests/material-parity/supplemental-line-box-evidence.mjs` — pass.
- `node --test --test-name-pattern='supplemental line-box|records source fingerprints' tests/material-parity/normal-line-box-report.spec.mjs tests/material-parity/input-equivalence-audit.spec.mjs` — 5/5 pass, no skips or cancellations, 0.8051191 seconds.
- `npm run parity:harness:check` — 526/526 pass, no skips or cancellations, 255.111279 seconds; the original live session was polled to terminal exit 0, not restarted.
- All ten frozen harness files still match their checkpoint hashes. No renderer,
  Material plugin, showcase input, frozen asset or visual threshold changed.

The consolidated audit still leaves these 46 observations unresolved pending
independent validation and an exact per-state join. Its last full strict
result remains 3,309 unresolved resolved-style differences and 46 unresolved
control typography differences. Full final acceptance and report regeneration
remain outstanding; this increment does not replace either.

The report generator accepts explicit evidence paths so fresh full runs do not
overwrite preserved baselines. `artifacts/material-parity/context-complete-audit`
is now complete (436 static / 1,875 interaction cases, all visually passing),
but contains the subsequently reproduced ancestry-inspection defect below.
Its `normal-line-box-context-audit` and `supplemental-context-audit` supplements
remain bound to that frozen run, not to the corrected implementation.
The corrected unfiltered run is `artifacts/material-parity/current-ancestry-audit`,
using `dist/material-showcase-current-ancestry-audit/browser`. It completed
436 static and 1,875 interaction cases with all visual gates passing on
2026-09-12. Use its complete report and freshly bound supplements for final
regeneration and `--check`; do not reuse old supplements or rewrite captured values.
The older control-text baseline and its
`normal-line-box-static-audit-v2` supplement remain preserved separately;
never combine supplements and captures from different runs.
Do not use `--allow-partial` for acceptance.
Argument validation rejects unknown, empty, and repeated options. A missing
selected report fails rather than falling back to older
evidence. The retained-text baseline is now complete; it does not contain the
new control-text texture instrumentation.

## Captured snackbar line-box attribution (2026-09-13)

The interactive line-box join now classifies the 34 original snackbar action
observations as `reviewed-snackbar-normal-line-box-size-dependency`, owned by
the application/plugin action-size token translation. The raw reference
`normal`, measured natural 17px line box and candidate numeric 19px paint value
remain unchanged and unequal. This is not an equivalent-representation waiver.

Attribution requires the independently validated supplement, exact checkpoint
and text-owner bindings, loaded fonts and unchanged original typography. It
then rederives the entire Material 14px token versus omitted candidate token /
core-default 16px provenance from the captured rule and ancestor inventory;
an existing finding's classification or review metadata is not trusted. The
complete candidate normal/effective chain must still omit line-height and font
shorthand. Only the measured `UNDO`, Roboto/500, 14px/16px and 17px/19px reduction
is covered. These observed constants constrain evidence admission; they are
not authored fixture values or a universal CSS-normal conversion rule.

The earlier 18-case package-root proof supplies independent equal-input size
controls. The raw font-family-list, tracking, ink and size differences are
preserved separately. This attribution does not certify browser-correct core
button defaults, general normal-line-height metrics, glyph baseline/sharpness,
snackbar visibility or placement. The four honest equal-input normal-metrics
failures remain independent core defects, not consequences waived by this join.

Report validation independently reloads the checkpoint-bound observer evidence,
rebuilds raw comparisons and rederives the new attribution. Its replay filter
also catches the new attribution moved to a different case. Removed scalars,
altered raw comparisons, changed evidence and false acceptance cannot pass by
supplying a classification string alone.

Focused tests cover 18 synthetic parent-size/state combinations, 26 negative
controls and seven unbound-report mutations. Changed metrics, font properties, source
tokens, default stages, ancestry, missing/duplicate observations and explicit
candidate sizing all refuse this classification. All other differences and
every raw comparison are asserted unchanged. Synthetic states test the guard's
logic; they do not claim new live interaction coverage.

The complete-data build reports 671 validated observations, no observer errors,
34 new snackbar attributions and **46 remaining control typography differences**:
16 supplemental calendar line heights and 30 supplemental tooltip line heights.
It retains 124 classified source findings and 68 source fingerprints. Independent
diagnostic validation returns `[]`; this is not strict audit acceptance.

Verification on the final code:

- `node --test --test-name-pattern='snackbar observed|interactive line-box|snackbar action size' tests/material-parity/input-equivalence-audit.spec.mjs`:
  **10/10 passed**, no skips or cancellations, terminal exit 0, **7.4592419 seconds**.
- `npm run parity:harness:check`: **522/522 passed**, no failures, skips or
  cancellations, terminal exit 0, **337.6869515 seconds**.
- The complete-data inspection uses `buildMaterialInputAudit` with the frozen
  current-ancestry report, static normal-line-box supplement, interactive
  control-line-box V3 supplement and current-ancestry supplemental root. It
  independently validates that report in diagnostic and strict modes; its
  printed validation results, rather than process exit alone, determine audit
  acceptance. It completed with terminal exit 0 after printing the expected
  strict failures: `3309 resolved-style differences still lack root-cause attribution`
  and `46 control texture typography differences require attribution`. This is
  deliberately **not** a passing strict audit.
- Syntax and `git diff --check` pass. All ten frozen capture-harness hashes
  still match; no fresh reference input or selected metric was substituted.

Exact complete-data read-only verification command:

```powershell
node --input-type=module -e "import{readFileSync}from'node:fs';import{buildMaterialInputAudit,validateMaterialInputAudit}from'./tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',controlLineBoxPath:'artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});const d=a.controlTypography.differences;console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,sources:a.summary.sourceFindings,sourceFingerprints:a.sourceFingerprints.length,observations:a.controlLineBoxes.observations.length,evidenceErrors:a.controlLineBoxes.errors,snackbarLineBoxes:d.filter(x=>x.attribution==='reviewed-snackbar-normal-line-box-size-dependency').length,remaining:d.filter(x=>x.attribution==='unresolved').length,remainingGroups:d.filter(x=>x.attribution==='unresolved').reduce((m,x)=>{const k=x.case.split(':')[0]+'/'+x.family+'/'+x.property;m[k]=(m[k]||0)+1;return m;},{})}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

No reference, Material fixture, renderer or visual threshold changed. Complete
state coverage, the remaining style/typography attribution, final report artifacts
and the final unfiltered enforced parity matrix remain required.

## Snackbar action line-box input-dependency proof (2026-09-13)

The new package-root browser reduction
`examples/material-showcase/src/app/snackbar-action-line-box-audit.spec.ts`
separates the already captured snackbar action font-size omission from the
general normal-line-height resolver. It does not modify the showcase or use
candidate paint to choose the browser oracle's typography.

Three independent trials run under each 14.4px, 16px and 18.4px parent, with
both explicit `normal` and omitted line-height: **18 independent mounts**.
All use the original action text `UNDO`, weight 500, and the local Latin Roboto
font bytes under the isolated name `SnackbarAuditRoboto`. Both sides explicitly
declare the same full font-family stack; the unequal trial intentionally omits
only the candidate's font-size, preserving the source discrepancy being tested.

| Trial | Browser font size / natural line box | Candidate normal/effective/paint font size | Paint and bound-texture CSS height |
| --- | --- | --- | --- |
| Equal explicit 14px | 14px / 17px | 14px | 17px |
| Equal explicit 16px | 16px / 19px | 16px | 19px |
| Reference 14px, candidate size omitted | 14px / 17px | 16px | 19px |

These results are unchanged by parent size or line-height omission. The first
divergence in the unequal trial is already present in normal/effective CSS
font-size, before text metrics or Babylon projection. The 19px scalar is also
the browser's natural line height in the separate equal-input 16px control.
This supports an input-size dependency for the captured 17px/19px discrepancy,
not a universal line-height adjustment or a projection correction.

The core button default is `fontSize: "16px"` in
`src/app/config/browser-defaults.ts`. The packed consumer's
`dist/lib/app/services/text/text-style-parser.service.js` has the same
`Mg` font-bounding-box ascent/descent calculation as source; its SHA-256 is
`55274b6b258d40dcd6c5669c5aa6ad583b994563c4597fea7e57ce5a31f4d863`.
The reduction imports only `astylarui` and freshly compiles through the
showcase Karma builder; it does not use a source-tree or private deep import.
Installed versions are AstylarUI 0.2.0, Angular core 20.3.29, Angular CLI
20.3.34, Babylon 8.56.2, and Chrome Headless 152 on Windows, DPR 1.

Assertions preserve both authored inputs, verify loaded fonts, wait for surface
settlement, compare the reference button's computed typography with a separate
natural one-line observer, inspect current core paint and its unique bound
text texture, and verify zero meshes/materials/textures after disposal. The
observer's CSS height is not the fixed 48px button height or a world-space bound.
The equal-input controls and deliberately unequal trial are separate tests;
passing the diagnostic inequality assertion does not accept the original
snackbar as equivalent.

The audit now fingerprints and lists this proof (68 source fingerprints). It
does **not** automatically classify the remaining 34 captured snackbar line
heights: their per-occurrence bindings must still be joined to the existing
font-size provenance and independently measured reference observations. The
other 46 supplemental calendar/tooltip line heights remain outside its scope.
Browser-correct core defaults, baseline/raster quality, overlay placement,
visibility, clipping, and the original missing-snackbar report remain separate
obligations. No fixed 17px or 19px fixture value is introduced.

Verification:

- `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/snackbar-action-line-box-audit.spec.ts`:
  initial **18/18 passed**, terminal exit 0 (2.623 seconds browser elapsed).
  The final standalone rerun with `--progress=false` and cleanup assertions also
  passes **18/18**, terminal exit 0 (2.681 seconds browser elapsed).
- `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/snackbar-action-line-box-audit.spec.ts --include=src/app/normal-line-height-audit.spec.ts --progress=false`:
  final cleanup assertions pass in all 18 new cases; combined **23 passed /
  4 diagnostic failures**, terminal exit 1 (3.931 seconds browser elapsed).
  The unchanged Arial, serif, emoji and CJK core normal-line-height failures
  reproduce exactly. This is honest retained failure evidence, not a green suite.
- `npm --prefix examples/material-showcase run build -- --output-path=dist/snackbar-line-box-audit-build`:
  passed, terminal exit 0, two prerendered routes. Its separate output directory
  leaves the frozen current-ancestry parity bundle untouched.
- Angular's existing NG0914 warning reflects zoneless TestBed with the shared
  Zone.js test polyfill. No font-loading errors occurred; the shared test setup
  was not altered to suppress this warning.

- `npm run parity:harness:check`: **519/519 passed**, no failures, skipped tests
  or cancellations, terminal exit 0, **258.5581502 seconds**.
- `node --test --test-name-pattern='records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  **1/1 passed**, terminal exit 0; the new proof is present in both the fingerprint
  inventory and focused-proof list. All ten frozen capture-harness hashes match.
- `git diff --check` passes. Final diff review includes only the new reduction,
  its audit registration/test and this investigation entry; unrelated work is
  preserved.

No renderer, Material fixture, reference or threshold has changed; the full
objective and final enforced matrix remain outstanding.

## Consolidated interactive line-box attribution (2026-09-13)

The audit CLI now accepts `--control-line-box-report=...` and passes every
validated evidence option to `buildMaterialInputAudit`; empty and repeated
options fail. The machine report retains a separate `controlLineBoxes` stage.
Without a selected supplement its expected main interaction targets remain
missing; no static observation or global `normal`-to-pixel rule fills them in.

For each eligible control, attribution requires one exact state/owner
observation, unchanged checkpoint typography and paint metric, settled fonts,
matching natural CSS height and paint height, and equal font-size/weight/style
at those stages. The complete candidate normal/effective ancestry must omit
both explicit line-height and font shorthand. Calendar period observations use
the already reviewed shared text prefix while preserving the candidate's full
text-plus-triangle composition and its separate input-inequality findings.
Raw comparisons and every non-line-height difference remain unchanged.

Matching scalar observations receive
`reviewed-interactive-normal-line-box-stage-comparison`, classified as a
**parity-harness defect**, not equivalent input or correct renderer output.
This is the same processing-stage distinction as the static supplement, now
proved for each observed main interaction occurrence. Font fallback, tracking,
baseline, wrapping, placement, visibility, interaction and raster obligations
are not waived. The existing equal-input core normal-line-height failures also
remain independent confirmed defects.

Validation independently reconstructs the entire main interaction checkpoint
case set, verifies it against the inventory, rereads the bound supplement and
its source/tree/asset evidence, and rebuilds both raw control comparisons and
scalar attributions. Removed comparisons/differences, changed values, forged
supplement metadata and claimed attributions without the original evidence
fail even diagnostic validation. Reader replay rejects missing/corrupt records
and malformed inventory keys; it never reconstructs a missing metric from
candidate output. The CLI, producer, observer, reader and measurement tests
are included in the expanded 67-file audit source fingerprint inventory.

The first full-data integration run validates all **671** observations and
attributes **637** scalar comparisons, reducing unresolved control typography
differences from **717 to 80**. It reports 124 classified source findings,
zero unexplained/undetected source definitions, and no diagnostic-validation
errors. It terminated with exit 0 after printing the two expected strict
failures: 3,309 resolved-style differences and 80 control typography differences
still require root-cause attribution. This inspection command prints validator
results rather than returning their failure status; it is not a strict passing
audit. Final-code verification completed with the same strict findings below.

The final-code build reproduces those counts with all 67 source fingerprints.
The remaining control differences are **34 main snackbar action line heights**,
**16 supplemental calendar line heights**, and **30 supplemental tooltip line
heights**. The latter two cohorts were deliberately not covered by the main
interaction capture. Do not extrapolate its 17px measurements to those states.
For snackbar, the separate original 14px token versus core-default 16px input
finding is retained; investigate the resulting natural-line-height calculation
without substituting a fixed height. The core resolver measures an `Mg` font box
and returns a ratio, so the next focused proof should distinguish the unequal
font-size input from that general resolver's independently known limitations.

Verification on the final code:

- `npm run parity:harness:check`: **519/519 passed**, zero failures, skips or
  cancellations, terminal exit 0, **283.1743821 seconds**. The earlier 519-test
  run also passed before the final comparison-replay and CLI-forwarding checks;
  it is not substituted for this final run.
- `node --test --test-name-pattern='interactive line-box|audit CLI|records source fingerprints|observed normal|observed line-box|normal observations|report validation requires the same joined' tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/normal-line-box-report.spec.mjs`:
  **61/61 passed**, terminal exit 0, **6.8664043 seconds**.
- Syntax checks pass for the CLI and reader. All ten frozen capture harness
  hashes remain unchanged. `git diff --check` passes.
- The final-code complete-data build again reports 671 validated observations,
  zero missing/error evidence, 637 scalar attributions and 80 unresolved control
  differences. Diagnostic validation returns `[]`; strict validation reports
  exactly `3309 resolved-style differences still lack root-cause attribution`
  and `80 control texture typography differences require attribution`. The
  read-only inspection process terminated with exit 0 after printing both
  validation results; the strict audit itself is deliberately not accepted.

Use this evidence selection for subsequent generation/checking (the final
checked-in report must not be accepted with partial validation):

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
```

No reference, fixture, renderer or calibrated visual gate changed. Complete
relevant-state coverage, remaining attribution, final report generation and
the final unfiltered enforced matrix remain required by the full objective.

## Independent interactive line-box reader and owner readiness (2026-09-13)

`tests/material-parity/control-line-box-report.mjs` independently validates the
interactive natural-line-box supplement. It rederives the expected targets from
the selected interaction cases and control typography, verifies the original
checkpoint results and paired tree digests, and verifies the fresh reference
trees, screenshots, browser/build provenance, served assets, source snapshots,
and measurement implementation. Each metric must retain its exact text owner,
complete fresh ancestry, original/current font properties, CSS used dimensions,
viewport/DPR, loaded fonts, and observed action evidence. Missing observations
remain explicit; an invalid record rejects the supplement without accepting a
partial set. No reader result asserts input equivalence or raster parity.

The `control-line-box-current-ancestry-audit-v2` capture terminated with exit 1
at `interaction:snack-bar@contrast/desktop-dpr1/activate-leave` because the
original UNDO owner was not yet at its captured path. Live inspection found
that Angular Material asynchronously reparents the snackbar content into its
live-region wrapper: the immediate path was one wrapper shallower, then became
the exact checkpoint path. The paired runner had indirectly allowed that work
to settle while waiting on its candidate side. The reference-only measurement
must not rely on that unrelated delay.

The producer now waits for every exact original text owner before capturing;
it does not search for substitute matching strings, insert wrappers, modify
styles, or guess a sleep duration. A browser regression reproduces asynchronous
reparenting with duplicate text elsewhere and confirms readiness only at the
expected path. The preserved v2 partial artifacts are not accepted evidence.
The v3 capture uses the same complete target set, ordered with snackbar first
to exercise the previously failing boundary early.

Reader negative controls also exposed a path-validation defect: checking only
the numeric suffix accepted an ancestor with a different same-length prefix.
The added test failed before the reader correction; both the parent prefix and
the direct-child numeric suffix are now required. This is an audit-instrument
repair, not a renderer or application workaround.

The first real reader run rejected all observations because the in-memory
comparison contained undefined stage fields that checkpoint JSON legitimately
omitted. A failing regression confirmed the problem. The reader now compares
the expected JSON shape, not a fictitious undefined-valued JSON property;
explicit nulls and changed defined values still fail. No captured metric or
source artifact was rewritten to make this check pass.

The v3 capture completed with terminal exit 0. Its independent reader then
accepted **671 observations in 477 cases**, with **0 missing and 0 errors**.
Report: `artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json`.
SHA-256: `9e689c9a5d828a16214abbe55804a6ff72037d300c7f26272123ae008d948d11`.
Browser: Chrome `152.0.7977.76`, matching the frozen checkpoint.

| Family | Validated reference observations |
| --- | ---: |
| Snack-bar | 93 |
| Dialog | 130 |
| Datepicker | 41 |
| Tooltip | 50 |
| Bottom-sheet | 51 |
| Button | 144 |
| Card | 40 |
| Core | 40 |
| Menu | 82 |

Every measured CSS natural height is 17px. Of these, **637** have an equal
numeric candidate paint height; **34 snackbar action observations** retain
19px candidate paint. This is a measured stage comparison, not evidence of
equivalent typography, correct baseline, visibility, overlay placement or final
raster. The independently documented 14px reference/16px candidate snackbar
font-size inequality remains intact. These measurements do not resolve the
reported missing snackbar or displaced tooltip.

Reproduce reader validation by loading the main report, constructing its
interaction cases with `kind: 'interaction'`, and passing those cases through
`collectFullTreeInventory` and `collectControlTypographyEvidence`. Call
`loadControlLineBoxReport` with the v3 path, that inventory/control evidence,
`expectedProvenance: mainReport.captureProvenance`, and
`styleProperties: Object.values(propertyGroups).flat()`. Require zero errors
and missing targets; do not trust the producer's counts alone. Both the initial
failed read and the corrected successful read used the same preserved v3 bytes.

Verification: `node --test tests/material-parity/normal-line-box-report.spec.mjs`
passes **102/102**, zero failures/skips/cancellations, terminal exit 0,
4.389326 seconds after both reader corrections. `npm run parity:harness:check`
passes **511/511**, zero failures/skips/cancellations, terminal exit 0,
344.8251981 seconds. It started before the parent-prefix and JSON-shape tests
were added; the complete 102-test focused file was rerun after those corrections.
Both changed modules pass `node --check`; `git diff --check` passes. All ten
frozen capture harness source digests still match. Consolidated report integration, scalar-only
attribution guards, supplemental interaction cohorts, and the remaining full
audit requirements are outstanding. In particular, the current consolidated
audit's 717 unresolved control typography differences have not been silently
waived by adding this independent evidence reader.

## Interactive control line-box capture infrastructure (2026-09-13)

The static supplement cannot measure `overlay:0/...` text owners and must not
be extrapolated to interaction states. New
`tests/material-parity/control-line-box-evidence.mjs` resolves both frame and
indexed overlay roots using a complete current owner chain, exact attributes,
direct text, and the checkpoint typography. The observer obtains natural
single-line width/height as **CSS used values** from its auto-sized block;
viewport rectangles are recorded separately. A transformed body changes the
viewport box but not the CSS metric. This avoids adding a transform-coordinate
anomaly to the audit instrument itself.

Browser tests cover DPR 1/2, frame labels, multiple overlay roots, nested
calendar-period text, unscaled/scaled ancestors, keyboard focus, held-pointer
font changes, and preservation of noncollapsed selection. Eighteen malformed
root/chain/text/style controls refuse measurement. Generated observer content
and ambiguous frame roots also fail, with observer cleanup verified. These
tests establish the instrument's scope; they do not establish equal Material
inputs, text baseline, wrapping, clipping, visibility or glyph raster.

`scripts/audit-material-control-line-boxes.mjs` derives all **671** mapped
normal-line-height targets from the selected main interaction checkpoint.
It replays the reference benchmark's actual action and phase sequence,
including held states, three-cycle dismissal and the explicitly programmatic
focus cohort. It records fresh full reference trees, screenshots, trusted-event
flags, current focus, runtime asset bytes, original paired checkpoint trees,
and each measured CSS metric beside the unchanged candidate paint input.
It does not drive the candidate or use candidate values to author reference
styles. Existing supplemental tooltip/calendar-close cohorts are not silently
included in this main-checkpoint scope.

Run command:

```powershell
node scripts/audit-material-control-line-boxes.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/control-line-box-current-ancestry-audit-v2
```

The first partial directory, `control-line-box-current-ancestry-audit`, is
preserved but not accepted. That run was deliberately stopped to correct
provenance design: the measurement and target-selection source bytes now have
immutable snapshots, so later audit edits cannot silently change the code
associated with a capture. This does not authorize executing archived source
or accepting old scalar claims: the independent reader must verify digests,
target completeness, owner paths, typography, actual state and metric scope.
The revised capture is in progress; no new line-height attribution is enabled
in the consolidated audit yet. Reader/replay integration and the additional
supplemental interaction cohorts remain required.

Verification so far:

- `node --check scripts/audit-material-control-line-boxes.mjs`: terminal exit 0.
- `npm run parity:harness:check`: **464/464 passed**, zero
  failures/skips/cancellations, terminal exit 0, 420.3191034 seconds. This run
  started before the extra selection-preservation assertion; the complete
  focused file below was rerun after that assertion was added.
- `node --test tests/material-parity/normal-line-box-report.spec.mjs`:
  **53/53 passed**, zero failures/skips/cancellations, terminal exit 0,
  4.4839303 seconds after the selection-preservation assertion was added.
- All ten frozen capture harness digests remain unchanged. No renderer,
  fixture or reference implementation was edited.

## Snackbar action size token is omitted before paint (2026-09-13)

All **34 captured open snackbar actions** have the same size discrepancy:
the original action label computes `14px`, while the candidate button has
`16px` in normal resolution, effective resolution and current texture paint.
This is present before Babylon projection, not evidence that projection
enlarged otherwise equivalent font-size inputs.

The original `button, input, select` inherit reset is overridden by the
`.mat-mdc-button` declaration
`var(--mat-button-text-label-text-size, var(--mat-sys-label-large-size))`.
The candidate `.overlay-dismiss` omits that component declaration. Its complete
action/surface/overlay/section/page chain preserves the omission and shows the
same 16px action size whether the page supplies 14.4px, 16px or 18.4px.
`src/app/config/browser-defaults.ts` supplies `elementDefaults.button.fontSize`
as `16px`; `StyleDefaultsService.getElementTypeDefaults` merges typed defaults
and `StyleService.findStyleForElement` starts normal style resolution from
them. Paint retains the already resolved value. The defaults service is now
included in the audit source fingerprints.

History shows that `2f44011` introduced `.overlay-dismiss` without a size token.
`af04845` added only the generic control font-family reset, not the original
complete `font:inherit` behavior or the component size token. This extends the
existing `fixture-snackbar-action-typography-substitution` finding. It does
**not** certify the core button defaults as browser-correct: missing component
authoring and default/inheritance defects can coexist. Restore equivalent
component inputs for a separate core reproduction; do not calibrate the size.
Snackbar visibility, intrinsic width, line boxes and overlay placement remain
independent obligations, including the reported possibility of off-screen paint.

The attribution retains original ordered rules, disabled-animation evidence,
full candidate ancestry and all three control stages. Twenty-four negative
controls reject missing or competing declarations, broken ownership and
inconsistent stages. Eleven report mutations test independent replay against
deleted, duplicated or fabricated claims. No raw capture is modified.

Focused verification:
`node --test --test-name-pattern='snackbar action size|control typography does not waive' tests/material-parity/input-equivalence-audit.spec.mjs`
passed **4/4**, zero failures/skips/cancellations, terminal exit 0,
2.2291771 seconds. Direct replay of all 71 snackbar cases (12 static and
59 interaction) attributes 34 action size observations and leaves the raw
105 line-height observations unresolved before the separately bound static
line-box evidence is applied.

The first full harness run passed 461/462 tests and failed only the explicit
source-fingerprint count: adding `style-defaults.service.ts` increased it from
61 to 62. The test now requires exactly 62 and explicitly checks that the new
source occurs once; no evidence or visual acceptance threshold was relaxed.
The expanded focused command (the pattern above plus
`|records source fingerprints`) passes **5/5**, terminal exit 0,
2.8699697 seconds.
The final `npm run parity:harness:check` rerun passes **462/462**, with
zero failures/skips/cancellations, terminal exit 0, 245.9329436 seconds.

The consolidated replay from `current-ancestry-audit`, its matching
`normal-line-box-current-ancestry-audit/latest-report.json`, and
`supplemental-current-ancestry-audit` completes with **124** detected source
findings, none unexplained, and **34** action-size observations attributed.
`validateMaterialInputAudit(..., {requireComplete:false})` returns no errors.
Strict validation still rejects **3,309 resolved-style** and **717
control-texture typography** differences. Configured capture coverage being
complete does not establish every relevant-state or root-cause requirement.

The remaining main-corpus line-height groups include computed `normal` versus
17px paint for common buttons and calendar period controls, and `normal`
versus 19px paint for the 34 snackbar actions whose font-size inputs differ.
The existing natural-line-box producer and reader are explicitly static-only;
they cannot justify interactive/overlay observations. Future evidence must
capture the actual state and retain unequal typography rather than generalize
the static 17px result or tune the renderer. The measurement helper also accepts
only `frame/...` label paths, whereas captured snackbar/dialog actions use
`overlay:0/...` paths. Extending the state list alone would therefore be
insufficient: a separately verified overlay-root resolver and real state
activation are needed, without mutating the frozen measurement producer.
No renderer, fixture, reference,
or frozen capture input changed in this increment. All ten checkpoint-bound
harness source digests remain unchanged.
The complete enforced visual matrix and final report regeneration remain
end-of-audit obligations; this focused increment is not release acceptance.

## Dialog actions omit distinct Material font and tracking tokens (2026-09-13)

The dialog action path is separate from the already reviewed common
`.material-button` path. `Cancel` is a Material text button and `Save` is a
filled button; each direct `.mdc-button__label` inherits its own component
font/tracking tokens. The complete captured overlay/action mapping identifies
these text owners without accepting their replacement structure as equivalent.

Both reference labels compute `Roboto` and `0.096px` tracking. The candidate
`.dialog-action` rule omits both component tokens. Its generic
`button, input, select` reset supplies `Roboto, Arial, sans-serif` unchanged
through normal/effective/current texture paint. Its full action-to-page chain
omits tracking and current texture paint receives zero. These are unequal
authored inputs, not a core font-list mutation or an equal-input spacing defect.
Matching installed Roboto glyphs would not make the font fallback lists equal.

History confirms that `2f44011` introduced the separate `.dialog-action`
controls without font/tracking declarations; `af04845` subsequently added the
shared document-control font reset. Current action widths are fixed sampled
values (`67.4375px` and `78.671875px`), which remain independently audited
geometry inputs rather than justification for the missing intrinsic text intent.
Restore the original button tokens and nested label structure before evaluating
core text/layout behavior; do not tune the text or widths to the screenshot.

The new attribution preserves ordered reference reset/token declarations,
candidate reset or complete tracking-omission ancestry, action/overlay identity,
and distinct normal/effective/paint stages. The original active, unconditional
`_mat-animation-noopable` rule with important `animation-name:none` is retained
as disabled-animation evidence, not mistaken for an active font animation.
Missing/inactive/conditional tokens, unsafe animation rules, competing authored
styles, mismatched text, and contradictory control stages refuse attribution.
Twenty-eight negative controls and eleven report mutations cover these guards.
Independent replay covers all dialog action comparisons, differences and gaps,
so deleting an inconvenient record cannot make the audit pass.

The focused command
`node --test --test-name-pattern='dialog action typography|dialog text|dialog metric|control typography does not waive' tests/material-parity/input-equivalence-audit.spec.mjs`
passed **12/12** tests, with zero failures/skips/cancellations, in
3.9642305 seconds. The 78-case dialog inventory attributes **128**
observations (64 font-family and 64 tracking) in 32 cases: `activate`,
`activate-leave`, `open-hover-content` and `open`, across four themes and
DPR 1/2. Closed cases do not acquire fabricated action text owners.
The first full harness run exposed one validation regression: deliberately
removing the entire control-typography section caused the new replay check to
throw instead of reporting missing evidence. The check now requires an array
before filtering each list and reports a validation error when absent. The
existing malformed-report test passes without changing its expectation.

Final verification after that audit-only correction:

- `npm run parity:harness:check`: **459/459 passed**, zero
  failures/skips/cancellations, 272.7996223 seconds, terminal exit 0.
- Full `buildMaterialInputAudit` from `current-ancestry-audit` and its matching
  normal-line-box and supplemental evidence: 124 source findings, none
  unexplained or undetected, and all 128 dialog observations attributed.
- `validateMaterialInputAudit(..., {requireComplete:false})`: no errors.
  Strict validation still rejects **3,309 resolved-style** and **751
  control-texture typography** attributions. The remaining control set consists
  of the prior 717 line-height observations and 34 snackbar action font sizes;
  no blanket equivalence has been assigned to them.
- All ten frozen harness-file SHA-256 values match the corrected baseline.

No renderer, browser reference, comparison input or visual threshold was changed.
Normal line-height, interaction paint, fixed action geometry and overlay
behavior remain separate open audit obligations.

## Hidden dense datepicker labels are unequal visibility inputs (2026-09-13)

The four remaining retained-label font differences in the corrected captured
corpus are the focused datepicker at contrast/custom themes and DPR 1/2.
They are **not visible 16px-versus-12px text comparisons**. The original
floating-label wrapper is `display:none`: its display declaration consumes
`--mat-form-field-filled-label-display`, inherited from `.density-5` in
contrast and `.density-2` in custom. The audit retains the complete seven-node
wrapper-to-frame path, the active unconditional density declaration, and the
original five ordered font/transform rules. Hidden computed font size remains
16px; no visible reference glyph or current raster equivalence is inferred.

Candidate picker labels instead retain `field-label empty-field-label`, with
an explicit untransformed 12px font and inline display. The existing
`.field-label.compact-filled-label { display:none }` rule cannot match that
class. Commit `88d1090` added this hide rule and applied the compact class to
filled fields, while picker labels kept their fixed empty-label class. This
history demonstrates incomplete application of the replacement hide mechanism;
it does not establish that the commit introduced every picker visibility bug.
The source finding identifies the fixed picker-label authoring in
`examples/material-showcase/src/app/astylar.component.ts`.

Attribution requires focused empty native/candidate inputs, matching label
associations and input-region/shell ownership, non-invalid and enabled state,
the complete density-token inheritance, and candidate normal/effective display
through its ancestor chain. It rejects missing or competing token declarations,
conditional rules, ancestor visibility overrides, an actually matching hide
rule, and contradictory input state. Thirty-two negative controls and twelve
report mutations protect this evidence, including independent replay of the
mapping, comparison, difference and gap lists. Existing visible floating-label
and unfloated-error proofs remain separate.

The owning correction is original density-token and floating-wrapper authoring,
not a core `display:none` patch, a smaller font, or another positional offset.
Hidden/visible transitions, placeholder/accessibility behavior and the distinct
date/time opening contracts still require independent verification. Neither
fixture, renderer nor browser reference was changed in this increment.

Verification:

- `node --test --test-name-pattern='hidden dense|floating-label|unfloated error' tests/material-parity/input-equivalence-audit.spec.mjs`:
  **11/11 passed**, zero failures/skips/cancellations, 3.3123 seconds on the
  final focused rerun.
- `npm run parity:harness:check`: **456/456 passed**, zero
  failures/skips/cancellations, 296.0627968 seconds; terminal exit 0.
- Full `buildMaterialInputAudit` using `current-ancestry-audit`,
  `normal-line-box-current-ancestry-audit` and
  `supplemental-current-ancestry-audit`: 123 source findings, none unexplained
  or undetected; all four dense labels attributed; zero unresolved
  retained-typography differences in this captured corpus.
- `validateMaterialInputAudit(..., {requireComplete:false})`: no errors.
  Strict validation still rejects **3,309 resolved-style differences** and
  **879 control-texture typography differences** lacking attribution.
- All ten frozen harness-file SHA-256 values still match the corrected
  baseline manifest. No visual threshold or capture was modified.

This closes the current retained-text attribution category, not the full audit.
Relevant-state coverage, broader style/control-text attribution, final reports,
plugin ownership assessment and final enforced matrix remain outstanding.

## Disabled component ink and expansion body size preserve unequal inputs (2026-09-13)

This increment attributes **28 further retained-text differences** without
changing either rendering input: eight disabled select colors, eight disabled
expansion title colors, and twelve expansion body font sizes. They share the
missing/replaced component-token category, but their mechanisms remain distinct.

For disabled select, the text owner inherits the ordered `.mat-mdc-select`
enabled token followed by `.mat-mdc-select-disabled` and its
`--mat-select-disabled-trigger-text-color` token. The fallback retains 38%
on-surface alpha against transparent. Candidate `.select-value` directly authors
opaque `#79747e`, regardless of theme. The replacement label and fixed ink were
introduced in `f286fb1`; the existing source finding now includes disabled-state
evidence rather than silently treating its enabled-state proof as sufficient.

For disabled expansion, the title's normal component color is overridden by
`color:inherit`; the header supplies
`--mat-expansion-header-disabled-state-text-color`, again with the translucent
38% on-surface fallback. Commit `bc4d442` instead added
`.expansion-trigger.disabled { color: mixHex(theme.surface, theme.onSurface, .38) }`.
The title inherits that preblended opaque literal. Light/dark captures retain
`#a9a6aa`/`#69666a`; contrast/custom retain `#a9a8aa`/`#a2a6a7`.
Preblending on one chosen surface is not equivalent to preserving alpha, even
when a particular screenshot happens to look similar. These are authored-input
defects, not evidence that core misconverted an identical translucent color.

The shared disabled-ink attribution requires unique text identity, exact
reference text-to-control paths, ordered active/unconditional token and inherit
rules, native and candidate disabled state, candidate control identity, and
explicit candidate normal/effective/retained agreement. It rejects competing
ink/animation declarations, unexpected inline overrides, changed text, missing
state and ambiguous owners. The select proof also checks that the disabled
candidate input is the label's sibling and carries its displayed value.
Twenty-four negative controls run for each family, and eleven report mutations
per family verify independent replay of mappings, comparisons, differences and
gaps. Neither current disabled hit behavior nor final compositing/raster is
certified by this typography evidence.

The expansion body has a different typography owner from its header. The
reference paragraph inherits
`var(--mat-expansion-container-text-size, var(--mat-sys-body-large-size))`
through `.mat-expansion-panel-body` and `.mat-expansion-panel-content`, computing
16px. The candidate content label, paragraph and panel omit this component size,
so core retains the page's 14.4px contrast or 18.4px custom size. Six occurrences
per profile cover activate, activate-leave and open at DPR 1 and 2. The omission
predates the replacement label: `2f44011` supplied no body-size token,
`a0f3328` introduced the extra label with a -1px top adjustment, and `ac06193`
retuned its inset without restoring component type.

The header/body font collector now selects the correct original token and
three-node reference inheritance chain, retaining the entire candidate chain
through the page. It also excludes matching authored size/shorthand/animation
rules: a supplied rule missing from resolved styles cannot be classified as an
authoring omission. Such evidence requires core investigation. Body proof adds
twenty negative controls and nine report mutations, including removal of both
findings and comparisons; the existing header proofs remain intact.

Implementation order: restore the original disabled color tokens and alpha
semantics, then the distinct header/body typography tokens and original text
ownership. Test enabled/disabled and theme/background transitions with those
inputs. Only then assess core inheritance, compositing, layout and glyph paint.
Do not replace these inputs with sampled opaque colors, inverse font scaling or
new label offsets. The machine implementation plan includes these owners and
keeps the existing equal-input core defects separate.

Verification for this increment:

- `node --test --test-name-pattern='disabled component ink|expansion body size|expansion font|select typography attribution|select token attribution' tests/material-parity/input-equivalence-audit.spec.mjs`: **11/11 pass**, zero failures/skips/cancellations, 10.108 seconds.
- `npm run parity:harness:check`: **453/453 pass**, zero failures/skips/cancellations, 272.733 seconds, exit code 0.
- Full collection against the corrected `current-ancestry-audit` report and its bound supplements finds **16 disabled-ink and 12 body-size occurrences**, **122 detected source findings**, and zero unexplained or undetected source definitions. Four retained-text differences remain unattributed: datepicker focus in contrast/custom at both DPRs. This is not completion of the broader input audit.
- `validateMaterialInputAudit(a, { requireComplete: false })` returns `[]`. Strict validation reports **3,309 resolved-style, 879 control-text typography, and four retained-text typography differences** requiring attribution. The audit command completed with exit code 0 after printing those incomplete-acceptance results. All ten frozen visual-harness files match their checkpoint SHA-256 hashes; `git diff --check` passes.
- No renderer, fixture, reference or frozen visual-harness input changed. Final packaged reports, complete relevant-state coverage, private control-text attribution, and the final complete enforced visual matrix remain required.

## Empty error labels are shrunk independently of the reference float state (2026-09-13)

The 24 error-state font differences left separate by the preceding floating-label
investigation have an authored state-predicate cause. Each of autocomplete,
datepicker and timepicker contributes eight captured occurrences. The candidate
`emptyFieldActive` predicate in `examples/material-showcase/src/app/astylar.component.ts`
treats `state.error` as sufficient to select 12px type at top 8px. Commit
`87bc351` added error to the open-state activation; `7159b1d` and `f3c8254`
subsequently revised the predicate. Error alone does not give the empty native
reference label the float-above class.

The twelve light/dark reference wrappers retain the base 16px font token,
top-left origin and unscaled base translation. The twelve contrast/custom
wrappers are `display:none`, with computed transform `none`. The audit preserves
that distinction: a hidden wrapper's computed 16px font is not evidence of a
visible 16px glyph. Dense-label visibility and placeholder behavior remain
separate obligations. Four hidden datepicker focus cases are still outside
both the floating and unfloated-error attribution paths.

The new `reviewed-unfloated-error-label-font-input` classification requires the
complete base origin/translation/font-token cascade, exact invalid and unfocused
reference ancestry, empty native and candidate values, invalid flags, associated
label/control identity, candidate input-region/shell linkage, explicit empty
label class, selected candidate size and consistent normal/effective/retained
stages. It rejects unexpected float state, scale or hidden-wrapper geometry.
Independent report validation replays the complete mappings, comparisons,
differences and gaps. No font-size normalization or final-raster equivalence is
accepted. Tests include 21 missing/contradictory-input controls and 11 report
mutations, in addition to the existing floating-label guards.

A separate **16 picker error-color differences** have a cascade cause: candidate
base and empty-label rules already author error ink, but later datepicker and
timepicker shell rules override it. The reference instead selects
`var(--mat-form-field-filled-error-label-text-color, var(--mat-sys-error))` on
the invalid floating-label wrapper. The color proof now retains that exact token,
state ancestry and original candidate rule order; it does not infer the cause
from sampled color alone. Dedicated tests exercise both picker shell selectors
and light/dark literals, retain the overridden error rule, and reject a mutated
state claim.

Implementation ownership is **showcase state/token authoring**, not a newly
confirmed core transform or world-coordinate defect. Restore the original float
predicate, font/display token semantics and error-color cascade. Then test
focus/blur, empty/nonempty and invalid/valid transitions without changing the
different datepicker and timepicker opening contracts. The existing equal-input
core transform defects remain separate. No fixture, reference, renderer or frozen
visual-harness input was changed in this increment.

Verification for this increment:

- `node --test --test-name-pattern='unfloated error|floating-label|field state color|picker error label' tests/material-parity/input-equivalence-audit.spec.mjs`: **12/12 pass**, zero failures/skips/cancellations, 8.132 seconds on the final focused rerun.
- `npm run parity:harness:check`: **447/447 pass**, zero failures/skips/cancellations, 266.750 seconds, exit code 0.
- Full audit collection against the corrected `current-ancestry-audit` report and its bound normal-line-box and supplemental evidence produces **24 error-size findings (12 hidden), 16 error-color findings, and 32 remaining unattributed retained-text differences**. All **120 source findings** are detected, none unexplained. This is classification progress, not elimination of rendering defects.
- `validateMaterialInputAudit(a, { requireComplete: false })` returns `[]`. Strict validation still reports **3,309 resolved-style, 879 control-text typography, and 32 retained-text typography differences** requiring attribution; the audit command completed with exit code 0 after printing those honest incomplete-acceptance results.
- All ten frozen visual-harness files retain their checkpoint SHA-256 hashes. The final complete enforced visual matrix and final packaged audit report remain outstanding acceptance requirements.

## Floating-label font substitution now has complete cascade evidence across six controls (2026-09-13)

The same unequal input occurs beyond form-field/input/select: autocomplete and
both pickers also replace a 16px label inside a scaled wrapper with an
untransformed 12px absolute label. The stricter collector attributes **58 more
occurrences**, without accepting the smaller type as equivalent to a transform.
The full captured corpus now has 174 `reviewed-floating-label-font-input`
occurrences:

| Family | Attributed occurrences |
| --- | ---: |
| Form-field | 34 |
| Input | 34 |
| Select | 48 |
| Autocomplete | 30 |
| Datepicker | 4 |
| Timepicker | 24 |

This is an expansion of the existing root-cause finding, not six independent
renderer problems. The shared candidate source is `.field-label` and
`.field-label.empty-field-label` in
`examples/material-showcase/src/app/astylar.component.ts`. The reference label
inherits its component font-size token while its parent receives, in captured
order, the top-left origin, base `translateY(-50%)`, font-size token, and two
floating-state `translateY(-106%) scale(0.75)` declarations. Candidate base and
active-empty declarations instead directly supply 12px, top 8px, left 16px.
The higher-specificity empty rule is preserved and checked separately from the
base rule. `7159b1d` changed its activation predicate from open/error to
focused/error; `4d56f86` extended empty-state class selection to editable field
values. Neither change restored the original wrapper transform.

The attribution now requires complete rule evidence, exact ordered reference
declarations, unique matching label text, active/floating wrapper state, a
captured .75 matrix and top-left origin, explicit candidate base/empty rule
selection, matching normal/effective/retained sizes, and an untransformed
candidate ancestor chain through the page. Raw stages and rules are detached
snapshots. Independent validation replays mappings, comparisons, differences,
and gaps so removing a claim or its comparison does not silently waive it.
Five focused tests cover all six families with both candidate classes, the
existing 13 negative controls, 36 additional missing/contradictory-input
controls, and ten report mutations. The older sparse synthetic helper remains
available to unrelated color/tracking tests; the font proof now provides the
complete five-rule reference cascade rather than one convenient transform.

The original equal-input transform reductions and core ownership investigation
are documented below under the floating-label transform investigation. They
separate percentage-unit loss, missing origin semantics and ordered composition
from final Babylon projection. Repair those general CSS-space transform rules,
then restore the original label structure and font input. Do not substitute
font size, offsets, tracking, or world-coordinate adjustments for that repair.

The stronger proof deliberately does **not** attribute 28 other picker/auto
font differences to this cause. Twelve light/dark error-state cases have no
reference float-above class and compute an unscaled
`matrix(1, 0, 0, 1, 0, -9.5)`, but the candidate error predicate still supplies
12px. The twelve contrast/custom error cases also lack float-above, but their
reference wrappers are hidden. Four further datepicker focus cases
(contrast/custom, both DPRs) have float-above but hidden reference wrappers.
These sixteen hidden wrappers have `display:none` and computed transform
`none`, not a floating .75 matrix. The inspected dense datepicker focus rule
uses `var(--mat-form-field-filled-label-display, block)`. All 24 error captures
were checked for display, transform and float-above state rather than inferring
compact behavior from the light profile. Those state/visibility paths need
their own captured attribution and remain unresolved. No production or
reference rendering input was changed by this increment.

Verification for this increment:

- `node --test --test-name-pattern='floating-label' tests/material-parity/input-equivalence-audit.spec.mjs`: **5/5 pass**, zero failures/skips/cancellations, 1.113 seconds after the final malformed-rule controls.
- `npm run parity:harness:check`: **443/443 pass**, zero failures/skips/cancellations, 245.487 seconds on the final rerun.
- Final `buildMaterialInputAudit` against `artifacts/material-parity/current-ancestry-audit/latest-report.json`, with `normalLineBoxPath: 'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json'` and `supplementalRoot: 'artifacts/material-parity/supplemental-current-ancestry-audit'`, reproduces the 174 occurrences above and **72 unresolved retained-text differences**. All 119 source findings are detected, none unexplained. `validateMaterialInputAudit(a, { requireComplete: false })` returns `[]`.
- Strict `validateMaterialInputAudit(a)` continues to report **3,309 resolved-style, 879 control-text typography, and 72 retained-text typography differences** requiring attribution. Capture-matrix coverage is not proof that all relevant interaction states or all input differences have been audited.
- All ten frozen visual-harness files retain their checkpoint SHA-256 hashes; `git diff --check` passes. No final machine report was overwritten, and the final complete enforced visual matrix remains an outstanding acceptance requirement.

## Disabled checkbox/radio labels omit component disabled color inputs (2026-09-13)

The current full capture contains **24 disabled label-color differences**:
eight checkbox labels and sixteen radio labels. They have an authored-input
cause, not evidence of incorrect conversion of a shared alpha color. The
reference associated `label.mdc-label` declares the respective
`--mat-checkbox-disabled-label-color` or `--mat-radio-disabled-label-color`
token, falling back to `color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent)`.
The child text span inherits that color. In the light capture it computes
`color(srgb 0.113725 0.105882 0.12549 / 0.38)`.

Candidate `.checkbox-label` instead explicitly supplies `theme.onSurface`;
candidate `.radio-label` omits color and inherits the same opaque literal from
`.radio-option`. Both controls already author `ariaDisabled: true`. Their
normal/effective declarations and retained core text agree with the literal
(`#1d1b20` in light and `#e6e1e5` in dark), so disabled semantic state has not
been translated into the reference disabled-label styling input. This does not
prove that disabling events or rendering/compositing alpha works correctly.

Source owners are `examples/material-showcase/src/app/astylar.component.ts`
(`.radio-option`, `.radio-label`, `.checkbox-label`, and the checkbox/radio
element builders). History shows the unconditional radio color in `2f44011`
and the replacement checkbox text color introduced in `c47d589`. `354084e`
subsequently added vertical alignment without restoring the missing disabled
color semantics. This evidence establishes a state-style omission; it does not
establish that those colors were deliberately introduced as screenshot hacks.

`reviewed-disabled-choice-label-ink-input` preserves and independently replays
the exact shared text identity, label association to a disabled native input,
disabled host and candidate ARIA owner, the radio adjacent-sibling structure,
active unconditional token declaration, competing-rule exclusions, and
candidate normal/effective/retained color chain. All 24 captured occurrences
remain **unequal inputs**, not accepted representations. The source finding is
`fixture-disabled-choice-label-ink-omitted`. Three focused tests include both
label ownership paths, two candidate colors, 27 contradictory/missing-input
controls per family, and ten report-tampering controls.

Repair belongs first in the showcase's component state/token translation:
restore the original disabled color intent on the appropriate text owner.
Do not sample a screenshot, preblend against one background, or change core
color conversion to compensate for these unequal inputs. Follow with equal-input
alpha/compositing and enabled/disabled interaction tests. Token fallback origin,
ancestor compositing, pointer/event suppression, and final local raster remain
independent obligations. No production source or reference fixture was changed.

Verification for this increment:

- `node --test --test-name-pattern='disabled choice label ink' tests/material-parity/input-equivalence-audit.spec.mjs`: **3/3 pass**, zero skipped/cancelled, 20.093 seconds. The initial synthetic positive test failed because its root style-evidence ID still named the core fixture; the fixture now supplies its own family root ID. Negative-input and report-replay controls passed throughout; no validator requirement was relaxed.
- `npm run parity:harness:check`: **440/440 pass**, zero failures/skips/cancellations, 267.964 seconds.
- Full `buildMaterialInputAudit` against `artifacts/material-parity/current-ancestry-audit/latest-report.json`, with `normalLineBoxPath: 'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json'` and `supplementalRoot: 'artifacts/material-parity/supplemental-current-ancestry-audit'`: all 24 new occurrences attributed; no remaining checkbox/radio retained-typography differences are unresolved in these captures. All 119 source findings detected, zero unexplained source findings. `validateMaterialInputAudit(a, { requireComplete: false })` returns `[]`.
- Strict `validateMaterialInputAudit(a)` still reports **3,309 unresolved resolved-style differences, 879 control-text typography differences, and 130 retained-typography differences**. Diagnostic success is not strict audit completion or visual acceptance.
- All ten frozen harness files match the checkpoint's raw SHA-256 hashes. `git diff --check` passes. This increment reuses frozen visual evidence; the objective's final complete enforced visual rerun remains outstanding.

## Unselected chip labels inherit the wrong component color input (2026-09-13)

All **32 remaining chip retained-color differences** in the 76 captured chip
cases have a direct input cause. Reference enabled unselected labels declare
`var(--mat-chip-label-text-color, var(--mat-sys-on-surface-variant))` on their
`mdc-evolution-chip__text-label` span. Candidate `.chip-label` spans omit color
in both normal and effective inspection; they inherit their `.chip` container's
`theme.onSurface` literal. The container's normal/effective color agrees with
the retained text color, so the renderer is not changing a shared color input.

For `interactions/chips/light/desktop-dpr1/activate`, the reference Angular
label computes `rgb(73,69,78)` while the unselected candidate container and
retained label use `#1d1b20`. The dark counterpart uses candidate `#e6e1e5`.
The reference action button owns `role=option`, `aria-selected=false` and
`aria-disabled=false`; the candidate places option/selection semantics on its
replacement container. The audit checks those states and the existing exact
six-node reference/three-node candidate text mapping before attributing ink.
It does not infer whole-chip semantic or paint equivalence from that mapping.

`git show 2f44011:examples/material-showcase/src/app/astylar.component.ts`
shows `.chip { color: theme.onSurface }` in the initial showcase. Current
source is `astylar.component.ts:690`, with the nested label at `:847`.
This is an original authoring substitution, not proven evidence of a later
renderer workaround. The separately documented state-specific widths,
generated-outline replacement and checkmark paint remain independent findings.

`reviewed-chip-label-ink-input` retains the exact token, complete reference
owner path/styles, candidate leaf/host declarations, relevant candidate rules
and retained paint style. A competing color, animation, transition, text-fill
or inline override prevents attribution. Selected/disabled states, missing or
ambiguous owners, incomplete rule evidence and stage disagreement are not
waived. Validation replays chip mappings, comparisons, differences and gaps;
it rejects removed, duplicated and fabricated claims.

The repair is to restore the original component-token and text-owner inputs,
then test core behavior under equal inputs. It is not a request to tune color
literals to screenshots. Token fallback origin, other typography and final
raster remain separate obligations. No production or reference input changes
are included in this audit increment.

Verification:

- `node --test --test-name-pattern='unselected chip ink|source audit|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  **5/5 pass**, 2.492 seconds. Includes both chip labels with light/dark host
  literals, 33 contradictory-input controls and 13 report-mutation controls.
- `npm run parity:harness:check`: **437/437 pass**, zero failures, skips or
  cancellations, 256.823 seconds.
- Complete `buildMaterialInputAudit` replay against
  `current-ancestry-audit/latest-report.json`,
  `normal-line-box-current-ancestry-audit/latest-report.json` and
  `supplemental-current-ancestry-audit`: **32 chip ink attributions**,
  **118 detected source findings**, diagnostic validation empty. Strict
  validation honestly retains **3,309 resolved-style**, **879 control-text**
  and **154 retained-typography** differences requiring attribution (down
  from 186 retained differences before this increment).
- All ten frozen harness source hashes match the checkpoint manifest.
  `git diff --check` passes. This is not a new visual matrix run or a completed
  input-equivalence audit; the required final unfiltered run remains outstanding.

## Filled-label state colors are different inputs, not a paint conversion failure (2026-09-13)

The captured reference floating labels apply separate base, focus, hover and
disabled tokens. Candidate labels instead select the base, empty-field or
picker-shell literal. The audit now attributes **168 additional observations**:
76 focus-token, 56 hover-token and 36 disabled-token mismatches. The main
benchmark contributes 166: form-field 24, input 24, autocomplete 20, select 38,
datepicker 34 and timepicker 26. Supplemental captures contribute two further
hover-token observations. Counts describe captured label observations, not newly fixed
components or a declaration of complete interaction coverage.

For example, `interactions/form-field/light/desktop-dpr1/focus` records
reference `rgb(103,80,164)` through the floating-label wrapper's
`--mat-form-field-filled-focus-label-text-color` / `--mat-sys-primary` rule.
The candidate nonempty label has only `field-label`, so its authored `#49454f`
survives normal resolution, effective resolution and retained text paint.
Changing the renderer to manufacture the missing focus color would conceal
unequal inputs. Hover likewise compares the reference hover token's `#49454e`
with candidate `#49454f`; the one-channel difference is not normalized away.

Disabled reference labels use the disabled-label token, falling back to
on-surface at 38% alpha. In dark mode the candidate does author an earlier
`.field-label, .picker-clock { color: #79747e }`, but its label branch loses
to the later `.field-label` rule of equal specificity. The base/empty/picker
rules then determine the captured opaque label color. `git show f286fb1`
confirms that the ineffective dark disabled rule was introduced in
`fix(material): align field popup parity`, before the base declaration even
in that original diff. Current source is `astylar.component.ts:542-548`.
This does not make a claim about the separate picker-clock branch.

The extended `reviewed-field-label-color-substitution` attribution requires
the exact active reference token declarations and the four ancestor nodes
from infix through the owning mat-form-field. Focus/disabled/invalid classes
are checked on the actual filled-field wrapper, not inferred from a test
name; hover retains the captured matching pseudo-selector. It also requires
complete rule evidence and v2 core-style inspection with its revision.
Candidate literals, source order, parent/classes and all three style/paint
stages remain separate evidence. The optional disabled declaration is accepted
only with its captured literal and earlier position. Missing ancestry,
unreviewed cascade, inactive token evidence or stage disagreement stays
unattributed. Report validation independently reconstructs the finding.

The repair owner remains showcase state/token translation, followed by
equal-input tests of the core cascade and paint. Do not replace these tokens
with newly sampled screenshot colors. This audit changes neither production
styles nor renderer behavior; the other control/typography differences remain
separate findings requiring their own evidence.

Verification for this increment:

- `node --test --test-name-pattern='field (color|state color)' tests/material-parity/input-equivalence-audit.spec.mjs`:
  **6/6 pass**, 1.810 seconds. The added state cases cover all six field families,
  30 contradictory-input controls and 12 report-mutation controls. An initial
  negative test exposed fallback to ordinary attribution after the state token
  was marked inactive; the collector now rejects that incomplete evidence.
- `npm run parity:harness:check`: **434/434 pass**, zero failures, skips or
  cancellations, 192.382 seconds on the final source. The last hardening rejects
  non-array condition records and negative inspection revisions.
- The complete `buildMaterialInputAudit` replay uses
  `current-ancestry-audit/latest-report.json`,
  `normal-line-box-current-ancestry-audit/latest-report.json` and
  `supplemental-current-ancestry-audit`. Diagnostic validation is empty;
  retained-typography differences requiring attribution fall from 354 to 186.
  Strict validation still reports 3,309 resolved-style, 879 control-text and
  186 retained-typography differences requiring attribution. All 117 source
  findings are detected. This is diagnostic audit evidence,
  not an enforced input-equivalence pass or a new visual matrix run.
- All ten frozen harness source hashes match the checkpoint manifest.
  Production/reference inputs, visual thresholds and existing artifacts are
  unchanged. `git diff --check` passes; unrelated work remains untouched.

## Paginator navigation tooltips were never authored on the candidate side (2026-09-13)

All **17 remaining anonymous text-owner gaps** in the current capture set belong
to the reference paginator's **Next page** tooltip. The 52 paginator cases are
12 static and 40 interaction captures (eight each of focus, hover, held,
activate and activate-leave). The tooltip exists in all eight hover and eight
held captures, plus light/desktop-dpr1/activate. Its six-node connected-overlay
path is shown, visible and opaque, with `mat-mdc-tooltip-panel-above` and an
aria-hidden visual tooltip component. The full reference screenshot for
`interactions/paginator/light/desktop-dpr1/hover/reference.png` visibly contains
the message above the next-page button; this is not hypothetical missing text.
The single activate observation is preserved as captured, not generalized into
a deterministic post-click timing contract.

Installed `@angular/material/fesm2022/paginator.mjs` binds both navigation
buttons' `matTooltip` to their corresponding internationalized labels,
`matTooltipDisabled` to the button-disabled calculation, and position to above.
The reference template (`reference.component.ts:74`) instantiates MatPaginator.
Candidate composition (`astylar.component.ts:882-899`) instead supplies ordinary
page labels and previous/next value buttons, with no tooltip content or binding.
`git show 2f44011:examples/material-showcase/src/app/astylar.component.ts`
confirms the omission in the initial showcase; the later `7843582` paginator
layout restructuring did not add this functionality.

`reviewed-paginator-tooltip-omission` ties the popup text to the unique enabled
Next page trigger, checks its complete paginator/section/frame path and matching
candidate navigation ancestry, compares page-label mappings and disabled state,
and retains the complete candidate tree. Added candidate popup text, custom
elements, tooltip roles, description/title/data bindings, missing style stages,
changed overlay state and ambiguous owners refuse attribution. Computed styles,
reference rules, and candidate authored/normal/effective stages remain distinct.
The installed paginator implementation now joins the source fingerprints
(61 files), alongside the already bound captured browser inputs.

This is an **application/plugin authoring defect** before core is asked to
create a tooltip. Restore equivalent tooltip content, trigger/disabled behavior
and placement intent through shared core APIs. Then independently investigate
any equal-input overlay, focus or dismissal defect. Do not invent a candidate
retained-text entry, call this an equivalent hidden tooltip, or adjust an offset
to repair content that was never authored. The existing SVG-to-glyph navigation
button finding and page-label typography remain independently enforced.

Three tests add **33 negative input controls** and **13 report mutation
controls**, including full replay that rejects omitted or fabricated gap claims.
All three observed state names are covered by the positive test. These tests
validate captured-input attribution, not live tooltip lifecycle parity. Previous
button tooltips and end-of-range disabled transitions require their own action
coverage; no such behavior is certified by a Next page snapshot.

```powershell
node --test --test-name-pattern='paginator tooltip|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **4/4 pass**, zero failed/skipped/cancelled/todo,
**2.838 seconds**, terminal exit 0. `npm run parity:harness:check` completed
**431/431 pass**, zero failed/skipped/cancelled/todo, **236.357 seconds**, terminal
exit 0. Full current-ancestry + normal-line-box + supplemental replay has
complete capture coverage, **117 detected source findings**, no unexplained or
undetected definitions, **61 source fingerprints**, and no diagnostic errors.
There are now **zero unresolved retained-text mapping/stage gaps in this capture
set**. Strict acceptance still rejects **3,309 resolved-style**, **879
control-text**, and **354 retained typography** attributions. All ten frozen
visual-harness hashes remain unchanged. No production implementation, comparison
input, reference or visual threshold was changed; the final enforced visual
matrix and complete interaction-coverage audit remain outstanding.

## Stepper edit state was replaced with a completion checkmark (2026-09-13)

The remaining **16 stepper anonymous-text gaps** are not missing core text.
Across 68 captured stepper cases, all eight profile/DPR combinations after
`activate` and `activate-leave` author Material's `edit` state for the inactive
Details header while Review is selected. Its icon-content wrapper contains a
`cdk-visually-hidden` span with **Editable** and an aria-hidden `mat-icon` whose
font-ligature input is **create**. The description's actual computed inputs are
absolute position, 1px width/height, hidden overflow and
`clip:rect(0px, 0px, 0px, 0px)`. These are retained as inputs, not discarded
because the description is visually clipped.

Candidate instead authors a `step-badge completed` span and a childless
`showcase.material:check-mark` with presentation role, 1.8 stroke width and
theme on-primary color. Neither reference text owner exists in that tree.
`git show fc45b58 -- examples/material-showcase/src/app/astylar.component.ts`
shows the completion branch and its 16px sizing added by
`fix(interaction): focus nested interactive owners`. Current composition is
`astylar.component.ts:975`; selection-mark data is at `:1101`.

The installed Material `stepper.mjs` `_getDefaultTextForState` returns `create`
for edit state, and its header template uses the separate editable description.
The custom `MaterialCheckMarkRenderer` instead makes a tube from
`materialCheckMarkPath` (`material-showcase.plugin.ts:258`). This is a different
state/content input before layout, not an equivalent vector representation or
a confirmed equal-input core icon defect. The repair owner is step-state/content
translation through shared core icon and semantic composition. Restore the
editable state and description before evaluating residual placement or paint;
do not replace them with a completion symbol to improve similarity.

There is a separate reference-font defect: in the representative light/DPR1
capture, `create` resolves to **Roboto, 16px, normal line height**, despite its
Material icon classes. Visual inspection of the frozen
`interactions/stepper/light/desktop-dpr1/activate/stepper-primary-raster-reference.png`
shows clipped letters from `create`, while the paired Astylar crop shows a check.
The frozen browser `styles-SFHGRD5K.css` contains only Roboto `@font-face`
families and neither a `.material-icons` rule nor a Material Icons font name
(SHA-256 `e6ac3260fbe0d21fab11df360ce38dc5f4d1b56bd4f79b5e36d3af8971a23896`).
Current `src/styles.scss` imports Roboto 400/500/700; `src/index.html` provides
no icon-font stylesheet, and `angular.json` names only that global SCSS file.
The missing icon-font setup is a reference authoring gap, not evidence that
Astylar rendered the same font/icon input incorrectly. Preserve this historical
capture; any subsequent reference correction needs an explicit input-baseline
change and matching candidate inputs. The custom completion check does not
repair or justify the reference's missing font declaration.

`reviewed-stepper-edit-state-substitution` preserves both original text owners,
full icon/header/stepper/frame paths, corresponding candidate mark ancestry,
selected Review state, computed and normal/effective styles, and candidate
node identities. It explicitly sets input equivalence, final-raster verification
and current-plugin-paint capture to false. Independent replay detects removed,
duplicated, forged or out-of-scope claims. Existing inactive-panel and ordinary
text checks remain independent.

Three focused tests add **30 negative input controls** and **11 report mutation
controls**. The first focused run found a new collector guard calling `includes`
on the boolean false branch when unexpected candidate text was present; the
guard now handles that branch and leaves the mismatch unresolved.

```powershell
node --test --test-name-pattern='stepper edit|stepper omitted panel|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs
```

Final focused result: **5/5 pass**, zero failed/skipped/cancelled/todo,
**2.340 seconds**, terminal exit 0. `npm run parity:harness:check`: **428/428
pass**, zero failed/skipped/cancelled/todo, **232.663 seconds**, terminal exit 0.
Full current-ancestry + normal-line-box + supplemental replay completed with
complete capture coverage, **116 detected source findings**, no unexplained or
undetected definitions and no diagnostic validation errors. Strict acceptance
still rejects **3,309 resolved-style**, **879 control-text**, **17 retained
mapping/stage**, and **354 retained typography** attributions. All remaining
anonymous mapping gaps belong to paginator; this is not overall input-equivalence
acceptance. All ten frozen visual-harness file hashes still match the checkpoint.
No production or fixture input was changed, and the final enforced visual matrix
remains a separate audit-completion requirement.

## Generated form-field error text retains unequal subscript and description inputs (2026-09-13)

`reviewed-field-error-text` pairs the generated `mat-mdc-error-*` owner with
`form-field-error` only through the unique invalid input's exact
`aria-describedby` relation and complete error/live/subscript/field/section/frame
path. It also verifies the input's infix/flex/wrapper ownership, associated
floating label and candidate field-surface/active-line/label/input/error order.
No hint is silently treated as the error, and no missing retained stage is waived.

The original error is a static block inside an absolutely positioned error
wrapper (`top:0`, `left:0`, `padding:0 16px`) under a relative subscript wrapper.
The error wrapper authors `aria-live="polite"` and `aria-atomic="true"`; the
invalid input describes the generated error ID. The subscript and error each
retain a generated, zero-width, 16px inline-block `::before` baseline spacer.
Candidate instead authors a direct error span under the field shell, without
the subscript/live wrapper or input description relation. Its absolute position
is `top:58px` or `50px` by density, `left:16px`. These are different containing
blocks and baseline constraints, not proven equivalent coordinate expressions.
Neither the mapping nor captured ARIA attributes prove actual announcement
behavior or final glyph placement.

`git show 87bc351 -- examples/material-showcase/src/app/astylar.component.ts`
traces this candidate error span and positional rule to the filled-field
retuning commit (`fix(renderer): align Material filled field text`). Current
reference template is `reference.component.ts:76`; candidate composition is
`astylar.component.ts:909-919`. The new
`fixture-field-error-subscript-substitution` finding identifies the authoring
owner. Restore the actual field/subscript/description structure before assigning
residual layout or semantic discrepancies to core; another text offset would
not establish equal inputs.

Across 76 form-field cases, **eight generated error owners** are now paired,
replacing **16 unresolved ID-mapping gaps** with actual comparisons. Eight
font-family and eight line-height differences independently satisfy existing
component-token attribution checks: the reference inherits subscript
`Roboto` / `16px`, while candidate retains the page's broader font stack and
`normal` line height. The original subscript selector and token declarations,
computed ancestry and candidate omission chains remain separate evidence.
The dimensions and generated baseline spacers do not equate `normal` with 16px.

Four new tests cover linkage/pseudo snapshots, **29 negative input controls**,
missing text/stages, and **10 report mutations**. Independent replay rejects
fabricated correspondence, lost live-region attributes, altered description
relations, missing pseudo evidence and removed typography differences.

```powershell
node --test --test-name-pattern='field error|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **5/5 pass**, zero failed/skipped/cancelled/todo,
**1.949 seconds**, terminal exit 0. `npm run parity:harness:check` completed
**425/425 pass**, zero failed/skipped/cancelled/todo, **231.626 seconds**, terminal
exit 0. The full current-ancestry report plus normal-line-box and supplemental
evidence replay has complete capture coverage, **115 detected source findings**,
no unexplained or undetected definitions, and no diagnostic validation errors.
Strict acceptance still rejects **3,309 resolved-style**, **879 control-text**,
**33 retained mapping/stage**, and **354 retained typography** attributions.
The remaining mapping gaps are 17 paginator and 16 stepper anonymous-text cases;
the form-field mapping has not waived any unresolved typography. The replay's
process exit 0 is diagnostic completion, not strict acceptance. No fixture,
renderer or visual threshold is changed.

## Dialog component font and tracking declarations were omitted (2026-09-13)

`reviewed-dialog-text-metric-omission` now traces the remaining direct
title/content typography inputs. The original component selectors apply
`--mat-dialog-subhead-font` / `--mat-dialog-supporting-text-font` with their
captured system-token fallbacks; both compute `Roboto`. The candidate omits a
component family on every ancestor up to `#page`, which explicitly supplies
`Roboto, Arial, sans-serif`. The full normal/effective chains and applicable
author rules are retained, not filled in with inferred inherited declarations.
The broader fallback list remains an unequal authored input even when the
installed Roboto glyphs happen to match.

Original content also applies `--mat-dialog-supporting-text-tracking`, computing
`0.256px` in the captures. The candidate omits tracking on its entire paragraph,
panel, modal, showcase section and page chain. Its document envelope is empty
and has no resolved text stage. Core retains zero tracking, consistent with
`RendererService.getInheritedTextStyle`'s `letterSpacing: '0px'` default
(`src/app/services/dom/renderer.service.ts:543-580`). No explicit shared spacing
input was lost: the component declaration is absent before rendering. Default
spacing is not a replacement for Material's tracking intent.

`git show 2f44011:examples/material-showcase/src/app/astylar.component.ts` shows
the page stack and title/content rules already omitting family/tracking in the
initial showcase. Current declarations are at lines 471 and 790-791. The later
fixed heights, nested title span and padding adjustments did not supply those
missing properties. Restore the original component typography alongside the
original flow constraints before evaluating core font selection, shaping,
wrapping, positioning or raster. This finding does not certify token fallback
origin or overlay theme scope.

All 78 dialog cases were replayed: **64 font-family and 32 tracking differences**
now have complete declaration/ancestor attribution. No unresolved title/content
retained typography difference remains, but dialog controls, layout, semantics
and paint remain separate obligations; this is not dialog parity acceptance.

Three new tests cover full-chain inheritance/omission, **85 negative input
controls**, and **18 report mutations**. They reject missing or competing token
rules, overrides or missing stages at each candidate ancestor, altered page
font inputs, and a non-empty or styled document envelope. Independent report
replay retains raw inventory snapshots and refuses forged attributions.

```powershell
node --test --test-name-pattern='dialog (text|ink|metric)|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **12/12 pass**, zero failed/skipped/cancelled/todo,
**3.840 seconds**, terminal exit 0. During development the zero-spacing guard
initially expected `0px` after canonicalization, whose established output is
`0`; the guard now uses the existing canonicalizer without changing captures.
The first test run also exposed an expected-envelope assertion missing the
collector's explicit undefined stage fields and a no-op mutation of an already
empty rule list. Both assertions were corrected; the latter now inserts a
fabricated rule and must fail replay. No attribution condition was weakened.

`npm run parity:harness:check` completed with **421/421 pass**, zero
failed/skipped/cancelled/todo, **206.948 seconds**, terminal exit 0. Full
`buildMaterialInputAudit` replay used the current-ancestry report and its bound
normal-line-box/supplemental evidence paths recorded in the mapping section
below. Coverage remains complete and all **114** source findings are detected.
Diagnostic `validateMaterialInputAudit(audit, { requireComplete: false })`
returns `[]`. Strict validation still rejects **3,309 resolved-style
attributions, 879 control-texture differences, 49 retained mapping/stage gaps,
and 354 retained typography differences**. The last count decreased from 450 by
the 96 newly explained inputs; those differences are retained, not equated.
The diagnostic process exited 0 while reporting strict failures, not acceptance.
All ten frozen visual-harness hashes match. No production renderer, fixture
input or visual gate is changed; overall audit completion remains unproven.

## Dialog text color tokens were replaced by fixture literals (2026-09-13)

`reviewed-dialog-text-ink-input` traces the original direct title/content token
declarations to computed colors, independently of the candidate's declarations,
normal/effective styles and retained core text. The original selectors are
`.mat-mdc-dialog-container .mat-mdc-dialog-title` and
`.mat-mdc-dialog-container .mat-mdc-dialog-content`; their ink uses
`--mat-dialog-subhead-color` and `--mat-dialog-supporting-text-color`, with
system-token and literal fallbacks preserved in the evidence. No conclusion
about which fallback supplied the computed value is inferred from color alone.

Candidate `.dialog-title` authors `#1d1b20`, inherited by its otherwise
color-undeclared nested span. `.dialog-copy` directly authors `#49454f`.
Both inspected stages and retained core text preserve those literals. History
at `bc0e449` (`fix(material): match dialog content geometry`) shows the literal
declarations being introduced alongside fixed geometry, replacing an earlier
panel-level `theme.onSurface` inheritance setup. Current authoring is at
`examples/material-showcase/src/app/astylar.component.ts:790-791`. This is an
authoring defect, not evidence that equivalent color inputs were converted
incorrectly by core. Restore the actual component token inputs before evaluating
remaining renderer color behavior; do not substitute another close-looking hex.

Across all 78 dialog cases, 64 ink differences in 32 open captures receive this
attribution: 32 title pairs `(29,27,30)` versus `(29,27,32)` and 32 content pairs
`(73,69,78)` versus `(73,69,79)`. The colors remain unequal. The 64 font-family
and 32 content-tracking differences remain unresolved. Overlay theme scope,
font selection, current pseudo-state paint and final raster are not certified.

Three new tests preserve raw snapshots, reject **50 negative input controls**
(25 applied independently to title and content), and reject **10 report
mutations** through replay from the independent inventory. Checks require a
single active, unconditional, non-important reference ink rule; no competing
inline, reset, transition or text-fill input; the exact candidate literal rule;
and consistent normal/effective/retained stages. Missing evidence is not waived.

```powershell
node --test --test-name-pattern='dialog (text|ink)|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **9/9 pass**, zero failed/skipped/cancelled/todo, **2.312 seconds**,
terminal exit 0. `npm run parity:harness:check` completed with **418/418 pass**,
zero failed/skipped/cancelled/todo, **190.787 seconds**, terminal exit 0.
The full audit replay used the same current-ancestry report, normal-line-box
report and supplemental root recorded in the following mapping section.
Coverage remains complete; all **113** source findings are detected.
Diagnostic `validateMaterialInputAudit(audit, { requireComplete: false })`
returns `[]`. Strict `validateMaterialInputAudit(audit)` still reports **3,309
resolved-style attributions, 879 control-texture differences, 49 retained
mapping/stage gaps and 450 retained typography differences**. The last count
decreased by the 64 explained color differences; none were made equal or removed.
The diagnostic process exited 0 while printing these strict failures, not an
acceptance pass. All ten frozen visual-harness hashes still match. No fixture,
renderer or visual gate is changed; the overall audit remains incomplete.

## Dialog title/content mapping preserves unequal flow and modal inputs (2026-09-13)

The `reviewed-dialog-content-text` mapping pairs the reference's direct `h2`
title and `mat-dialog-content` text with the candidate's nested heading span and
paragraph. It requires the generated title ID to match the dialog container's
`aria-labelledby`, unique parity identities, ordered title/content/actions,
the Cancel/Save labels and complete overlay, backdrop and two focus-trap-anchor
paths. Candidate open/modal state, heading wrapper, content owner, action order
and trigger/section/page context are verified independently.

The full reference heading pseudo-element evidence is retained. Material's
`::before` is a generated zero-width, 40px inline baseline spacer. The candidate
has no corresponding pseudo-element: its heading is a fixed-height flex box
aligned to the bottom with a nested label. Reference content and action wrappers
also differ from fixed-height paragraph and flex-action authoring. The reference
dialog is labelled by its title and captures `aria-modal="false"`; the candidate
authors a modal dialog with `ariaLabel: 'Open dialog'`. Those inputs are preserved
as differences, not certified as equivalent focus or accessibility behavior.

History links the heading span and flex-flow substitution to `d102828`
(`fix(material): model dialog text flow explicitly`). `5b02171` subsequently
changed title padding from `6px 24px 13px` to `7px 24px 12px`, and content padding
from `0 24px` to `2px 24px 0`. The earlier `bc0e449` fixed panel/title/content/action
heights, already recorded as `fixture-dialog-fixed-content-boxes`. The new
`fixture-dialog-text-flow-substitution` finding preserves the additional text
ownership and modal-composition changes. Current source is
`astylar.component.ts:788-792,1010-1021`; reference template is
`reference.component.ts:101` and opening configuration at 156. Installed
`dialog.mjs` and its implementation `module-Ce6F7TNm.mjs` are fingerprinted.

Five new tests cover correspondence/nonmutation, key-independent ancestry,
**37 negative input controls**, closed/missing-stage evidence, and **13 report
mutation controls**. The action subtree is traversed through parent identities,
not inferred from a generated key prefix. Detached evidence snapshots and
independent replay reject omitted or fabricated mappings, lost focus anchors,
altered title linkage, missing pseudo evidence and changed typography stages.

```powershell
node --test --test-name-pattern='dialog text|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **6/6 pass**, zero failed/skipped/cancelled/todo, **1.610 seconds**,
terminal exit 0. An initial positive assertion incorrectly expected the minimal
synthetic tree to have no gaps even though it supplied no authoritative control
textures. It was corrected to require preservation of the exact trigger/Cancel/
Save gaps, while proving the title/content mappings. No audit gap was hidden.
A read-only inventory projection also initially had a trailing-brace syntax
error; the corrected command produced the counts below without changing captures.

Across 78 dialog cases, **64 text owners in 32 open captures** are paired. The
128 unresolved mapping entries become actual typography comparisons. This
exposes **160 unresolved differences**: 64 font-family, 64 color and 32 content
tracking differences. Sixty-four start/left differences independently satisfy
the existing horizontal-LTR alignment proof; that does not equate their text
containers. In the light desktop activate capture, title ink is `(29,27,30)`
versus `(29,27,32)`, content ink `(73,69,78)` versus `(73,69,79)`, and content
tracking `0.256px` versus zero. These values are not normalized into equality.

Full verification: `npm run parity:harness:check` completed with **415/415 pass**,
zero failed/skipped/cancelled/todo, **185.679 seconds**, terminal exit 0.
The full `buildMaterialInputAudit` replay used
`artifacts/material-parity/current-ancestry-audit/latest-report.json`,
`normalLineBoxPath: 'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json'`
and `supplementalRoot: 'artifacts/material-parity/supplemental-current-ancestry-audit'`.
Coverage remains complete and all **112** source findings are detected.
`validateMaterialInputAudit(audit, { requireComplete: false })` returns `[]`.
Strict `validateMaterialInputAudit(audit)` still rejects **3,309 resolved-style
attributions, 879 control-texture differences, 49 retained mapping/stage gaps,
and 514 retained typography differences**. The diagnostic command's terminal
exit 0 is not a strict audit pass. Mapping gaps decreased from 177 to 49 while
unresolved typography differences increased from 354 to 514, exposing rather
than suppressing the newly paired inputs.

No renderer, fixture input, reference or visual threshold is changed. All ten
frozen visual-harness hashes match. Final full visual acceptance and remaining
root-cause attribution are separate completion requirements.

## Menu label font omits the direct component token (2026-09-13)

The new `reviewed-menu-label-font-input` attribution separates a direct Material
font declaration from inherited generic control typography. Reference menu
labels have the original component token
`var(--mat-menu-item-label-text-font, var(--mat-sys-label-large-font))` and
compute `Roboto`. Candidate labels have no own font-family declaration in
normal/effective inspection and inherit `Roboto, Arial, sans-serif` from the
explicit `button, input, select` author rule. The two fallback lists remain
unequal even when the installed first font happens to paint similar glyphs.

The proof requires exact ordered item/label ownership from the menu mapping,
one active original direct-family token rule, a top-level source location,
non-important unconditional declarations, complete candidate rules and separate
normal/effective/retained stages. Competing declarations, font shorthands,
resets, animations, transitions, inline overrides or missing stages refuse
attribution. Detached evidence snapshots and independent menu replay reject
fabricated inheritance, changed values and claims moved to another component.

History: `af04845` (`fix(material): inherit control typography`) added the
generic control-family rule now at `astylar.component.ts:476`. Its stated
purpose was to mirror the reference application's control-font reset. The rule
itself is not inherently a workaround. `994da86` later added the menu label
spans without restoring the component's direct font token. The missing
component override is the authoring discrepancy; generic control defaults and
core fallback-appending behavior are separate issues. No core defect is inferred
from these unequal inputs, and actual fallback selection, shaping, metrics,
token fallback provenance and current/final glyph raster remain unverified here.

Three new tests cover the positive inheritance trace and preservation of the
separate color attribution, **32 negative input controls**, and **10 report
mutation controls**. The prior uninterrupted leaf-to-page font-omission proof
is unchanged; this case has an authored font declaration at the intermediate
button and must not be forced into that older proof.

```powershell
node --test --test-name-pattern='menu label|menu text' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **10/10 pass**, zero failed/skipped/cancelled/todo,
**2.448 seconds**, terminal exit 0. All ten frozen visual-harness hashes match.
No renderer, fixture input, reference or visual-threshold change is made.
`npm run parity:harness:check` passes **410/410**, zero failed/skipped/cancelled/
todo, **179.879 seconds**, terminal exit 0. Full inventory generation detects
all **111 source findings** and attributes all **64 menu font differences**.
Mapped menu-label typography has no remaining unresolved attributions; this
does not close menu layout, overlay, control-text or interaction investigations.
Independent diagnostic replay returns `[]`. Strict audit verification remains
separate from these passing integrity checks and final full visual acceptance.

The full read-only process exited 0 after printing validation results. Strict
validation still reports **3,309** unresolved resolved-style differences,
**879** control-texture typography differences, **177** retained-owner/stage
gaps and **354** retained typography differences (down from 418). These are
remaining obligations, not an accepted input-equivalence result.

Exact full audit command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,menuFont:a.retainedTypography.differences.filter(d=>d.attribution==='reviewed-menu-label-font-input').length,menuUnresolved:a.retainedTypography.differences.filter(d=>d.family==='menu'&&d.attribution==='unresolved').length,retainedUnresolved:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

Next retained-text mapping priority: a read-only dialog inventory of 78 cases
finds 128 unresolved mapping entries across 32 open captures. Each capture has
the reference generated `mat-mdc-dialog-title-0`, an anonymous content owner,
and candidate `dialog-title-label`/`dialog-copy` entries. The reference heading
also has `data-parity-id="dialog-title"` and is linked from the dialog's
`aria-labelledby`; content has `data-parity-id="dialog-copy"`. Those identities
are useful mapping evidence, not grounds to equate the Material heading/content
and overlay/focus-trap structure with candidate span/popup composition. These
gaps are not removed by the menu typography work.

## Menu label ink is a token-to-literal authoring substitution (2026-09-13)

The new `reviewed-menu-label-ink-input` attribution traces the color mismatch
through actual declarations and direct text inheritance. It does not normalize
nearby colors or infer a renderer color-conversion defect from unequal inputs.

The reference non-link item button has two active ink rules, in this order:

1. `.mat-mdc-menu-item` declares `color: inherit`.
2. `.mat-mdc-menu-item, .mat-mdc-menu-item:visited, .mat-mdc-menu-item:link`
   declares `var(--mat-menu-item-label-text-color, var(--mat-sys-on-surface))`.

The button matches both through the same class specificity. The proof requires
both declarations to be non-important, unconditional top-level rules in the
same stylesheet with strictly increasing source indices. In the light desktop
open capture these are `sheet:7/12` and `sheet:7/16`. Capture walks stylesheet
rules in order and preserves that order in each node's matching-rule list.
Nested/layered rules, unknown source order, competing ink declarations,
animations, transitions, resets and inline overrides refuse attribution.

The direct reference label has no own ink rule and computes the same color as
its item. Candidate labels also omit their own color in normal/effective core
inspection, but their item has a fixed `#1d1b20` declaration that reaches the
retained text. Reference computed ink is `rgb(29, 27, 30)` in the inspected
profile, not candidate `rgb(29, 27, 32)`. The complete owner/label, candidate
rule and separate normal/effective/retained stages remain evidence. Token
fallback provenance, overlay theme scope, composition and current/final raster
are explicitly not certified by this attribution.

History: `0d67d46` (`fix(material): complete overlay and feedback parity`)
replaced `theme.onSurface` with literal `#1d1b20` in the menu item rule; the
current rule is `examples/material-showcase/src/app/astylar.component.ts:524`.
The initial `2f44011` menu used `theme.onSurface`, so it is not the introduction
of this particular fixed literal. Repair ownership is the showcase/plugin
translation of the original item token and label inheritance. Only residual
differences under equivalent inputs justify a core paint investigation.

Three new tests prove the ordered cascade and preserved nonmutation, **39
negative input controls**, and **10 independent report-mutation controls**.
Finding snapshots are detached from the inventory; a forged finding cannot
rewrite its own validation source. The menu replay also rejects this attribution
when moved into another family or detached from the expected mapping.

```powershell
node --test --test-name-pattern='menu label ink|menu text' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **7/7 pass**, zero failed/skipped/cancelled/todo, **1.762 seconds**,
terminal exit 0. After adding source-order checks, an intermediate run failed
two positive tests because the source field was accidentally added to another
synthetic helper. That unrelated edit was reverted and the menu helper corrected;
the strengthened checks and assertions were retained. The failed run is not
passing evidence.

The bounded menu inventory contains 94 cases and 64 mapped labels. All 64 ink
differences meet the new evidence requirements; **64 font-family differences
remain unresolved**. A separate read-only trace found the candidate generic
`button, input, select` rule at `astylar.component.ts:476`, which explicitly
sets `Roboto, Arial, sans-serif`; the captured rule list confirms it. This is
not merely a core default or uninterrupted inheritance from `#page`. The direct
label's omitted font token and inheritance from that authored control rule need
their own validated attribution, not an extension of this color proof.

`npm run parity:harness:check`: **407/407 pass**, zero failed/skipped/cancelled/
todo, **182.292 seconds**, terminal exit 0. All ten frozen visual-harness hashes
match. No production renderer, fixture input, reference, or visual threshold is
changed; final unfiltered visual acceptance remains outstanding.

Full inventory generation detects all **110 source findings** and attributes
the 64 menu ink differences while retaining their unequal values. Independent
diagnostic replay returns `[]`. Strict audit validation is recorded below before
completion of the audit: **3,309** unresolved resolved-style differences,
**879** control-texture typography differences, **177** retained-owner/stage
gaps, and **418** retained typography differences (down from 482). These four
errors remain explicit. The audit process exited 0 after printing diagnostic
and strict results; it is not a strict acceptance pass.

Exact full audit command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,menuInk:a.retainedTypography.differences.filter(d=>d.attribution==='reviewed-menu-label-ink-input').length,menuUnresolved:a.retainedTypography.differences.filter(d=>d.family==='menu'&&d.attribution==='unresolved').reduce((r,d)=>{r[d.property]=(r[d.property]??0)+1;return r;},{}),retainedUnresolved:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

## Menu label correspondence exposes unequal flex and typography inputs (2026-09-13)

The menu audit now maps each anonymous Material item-label span to its exact
candidate span without calling the two component trees equivalent. The complete
expanded trigger and ordered Rename/Delete domain must agree. Reference
evidence retains the connected overlay, transparent backdrop, content wrapper,
direct label and ripple children. Candidate evidence retains the fixed absolute
popup and its two aria-labelled buttons. Every ancestor, child order, attribute
and style stage remains available for review. Mapping identity does not certify
state behavior, focus, accessibility, clipping, layout or final glyph paint.

History identifies `994da86` (`fix(material): complete shared control parity`)
as the change that replaced menu button values with named child spans, changed
popup/item width to 112px, added flex centering to the buttons, and added a 4px
label bottom margin for density <= -5. The initial fixed popup came from
`2f44011`. Adding a span is closer to the reference's direct text ownership;
that fact does not justify substituting its layout or typography inputs.

In the frozen open captures, the reference label has `flex: 1 1 0%`, zero
bottom margin and computed block display. The candidate label has default
`flex-grow: 0`, `flex-basis: auto` and resolved inline display. Its contrast
profile has a 4px bottom margin, while light/dark/custom have zero. The candidate
rule is at `astylar.component.ts:525`; the fixed popup and item rules are at
523-524 and the span authoring at 970-973. Reference authoring is at
`reference.component.ts:87`; installed `@angular/material/fesm2022/menu.mjs`
supplies the generated component structure and CSS and is now fingerprinted.

These are confirmed unequal authoring inputs, not a confirmed core flex or
baseline defect. The next diagnostic must use the original label flex/text
constraints on both sides before attributing any residual error to core. Do
not replace this margin with another offset. Two source findings preserve the
composition substitution and density-specific compensation separately.

Across 94 menu cases, **64 labels in 32 open captures** are now paired. This
replaces 96 unresolved correspondence entries with actual text comparisons:
64 missing tracking inputs meet the existing source-based attribution; **64
font-family and 64 ink differences remain unresolved**. The candidate item
button already resolves a font family, so the existing proof of uninterrupted
font omission from page to text owner correctly refuses to explain this case.
Do not weaken it or infer that matching the first font name proves equal input.
The light/open ink trace also has two active item declarations: the base
`.mat-mdc-menu-item` rule declares `color: inherit`, and the later grouped
item/link/visited rule declares the Material label-color token. The leaf has
no own color rule. Candidate items instead declare literal `#1d1b20`. A future
attribution must prove this cascade and inheritance chain, including competing
declarations, rather than reuse the single-declaration option proof unchecked.

Four new tests cover mapping and nonmutation, **37 negative input controls**,
missing popup/text-stage evidence, and **13 report-mutation controls**. The
independent validator reconstructs mappings, comparisons, differences and gaps
from the inventory; dropped, forged or foreign-case findings fail replay.

```powershell
node --test --test-name-pattern='menu text|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs
```

Focused result: **5/5 pass**, zero failed/skipped/cancelled/todo, **1.369 seconds**,
terminal exit 0. An initial read-only profile projection mistakenly treated
file references as inline trees and exited 1; the corrected projection loaded
the captured files and confirmed the four profiles above. No capture was changed.

`npm run parity:harness:check`: **404/404 pass**, zero failed/skipped/cancelled/
todo, **213.438 seconds**, terminal exit 0. All ten frozen visual-harness file
hashes still match. No renderer, application fixture, browser reference or visual
threshold is changed; the final unfiltered visual matrix remains outstanding.

Full inventory generation detects all **109 source findings**, pairs 64 menu
labels and leaves **177 unresolved retained-owner gaps**, down from 273. Main
style counts remain 8,140 unique / 380,520 occurrences, with 3,309 unresolved
attributions. Independent diagnostic replay returns `[]`. Strict validation
still reports exactly these four incomplete obligations:

- 3,309 resolved-style differences lack root-cause attribution.
- 879 control-texture typography differences require attribution.
- 177 retained typography mappings or stage fields require review.
- 482 retained typography differences require attribution (previously 354;
  the additional 128 are the newly exposed menu font/color differences).

The full read-only audit process exited 0 after printing both validation modes;
that process exit does **not** mean strict audit acceptance. Exact command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,menuMappings:a.retainedTypography.reviewedMappings.filter(m=>m.kind==='reviewed-menu-item-text').length,menuDiffs:a.retainedTypography.differences.filter(d=>d.family==='menu').reduce((r,d)=>{const k=d.property+'/'+d.attribution;r[k]=(r[k]??0)+1;return r;},{}),retainedUnresolved:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

## Tooltip unmatched text owners are unequal state inputs (2026-09-13)

The new `reviewed-tooltip-unmatched-state-input` attribution explains a missing
text counterpart only when the captured tree proves that the opposite side
does not author that popup. It does not manufacture a paired text mapping or
classify a renderer as failing to paint a node that was never authored.

The reviewed cases are the frozen tooltip `open` interaction, supplemental
benchmark-open hover/press, and supplemental release in all three cohorts.
The exact case scope, unique trigger/message identities, reference external
described-by token, direct label, section/frame, complete connected-overlay
path or empty overlay container, and candidate page/section/anchor/button path
must all agree. Candidate popup presence also requires the authoritative core
retained-text owner. Missing rule capture, style stage, revision, duplicate
identity, unrelated message, alternate popup or unsupported state refuses the
attribution. Reference-only states have no candidate description link; open
candidate states link the trigger to the actual popup.

The evidence retains all node identities and the complete relevant authored,
computed, normal/effective and retained context. No absent-side typography is
invented. The independent validator recomputes the gap from inventory, and the
tooltip replay verifies that no gap was deleted, duplicated or moved to a
foreign case. Evidence snapshots are detached from inventory values: a negative
test exposed shared object references in the initial implementation, which
could let an in-memory finding mutation change its verification source too.
That aliasing was removed before acceptance.

Three new tests cover eleven positive state/DPR contexts, **53 negative input
controls** and **14 report-mutation controls**. The focused command, including
the existing paired tooltip text tests, passes **10/10**, zero failed/skipped/
cancelled/todo, **2.244 seconds**, terminal exit 0:

```powershell
node --test --test-name-pattern='tooltip unmatched|tooltip text' tests/material-parity/input-equivalence-audit.spec.mjs
```

The initial focused run was 9/10 because it detected the snapshot aliasing above;
it is not passing evidence. The corrected run includes that same negative
control without weakening its assertion.

This is application/plugin state-input attribution, not an equal-input core
defect, a typography-equivalence claim or a visual fix. The separately bound
pointer proof below distinguishes benchmark hover suppression, forced-open
click and missing ordinary dismissal. Repair ordinary state behavior through
the shared core interaction/overlay contract, remove scenario-dependent
authoring, then test both popup presence and absence at every action boundary.
Only genuinely paired popup states can establish typography/placement parity.

Full inventory generation finds **18** exact one-sided owner attributions:
eight original open-state cases (four profiles x two DPRs), four supplemental
reference-only hover/press cases and six supplemental candidate-only release
cases. The inventory remains **4,748 side-specific cases**. Retained gaps still
requiring review decrease from **291 to 273**, by explaining these eighteen
state-input differences rather than deleting them. Main style counts remain
8,140 unique differences / 380,520 occurrences, with **3,309 unresolved
attributions**. All **107 source findings** remain detected.

Audit command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,inventory:a.elementInventory.cases.length,unmatchedTooltip:a.retainedTypography.gaps.filter(g=>g.attribution==='reviewed-tooltip-unmatched-state-input').map(g=>({case:g.case,reference:g.referenceNodes,candidate:g.astylarNodes})),retainedUnresolved:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

No renderer, application, reference, matrix or visual-threshold change is made.
All ten frozen visual-harness hashes match. The final full enforced visual
matrix remains a separate completion requirement, not replaced by this audit.

`npm run parity:harness:check`: **400/400 pass**, zero failed/skipped/cancelled/
todo, **150.636 seconds**, terminal exit 0. Independent diagnostic replay
returns `[]`.
Full audit replay terminates with exit 0 while printing the honest strict
failures: **3,309 resolved-style attributions, 879 control typography
differences, 273 retained mapping/stage gaps and 354 retained typography
differences** remain. This is successful evidence validation, not completed
input-equivalence acceptance. The goal remains incomplete.

## Tooltip action-boundary inventory integration (2026-09-13)

The checkpoint-bound `tooltip-state-audit-v2` evidence now feeds the consolidated
element inventory and retained/control typography collectors. Its 30 paired
boundaries remain separate by benchmark-open, benchmark-hover and ordinary
cohort, by action, and by DPR. The 60 source trees include cases with a popup
on only one side; no invented counterpart or silent omission makes those inputs
equivalent. The earlier section below describes the state proof before this
integration and is retained as history.

`collectTooltipStateEvidence` fails closed for missing, incomplete, modified,
unbound or out-of-bound evidence. `validateTooltipStateInventory` independently
reloads the bound capture, reconstructs the complete inventory, dereferences
all pooled styles and rules, and compares authored structure, parentage,
normal/effective stages, retained/control text, pseudo-elements and revisions.
Summary counts alone cannot certify integration. Existing tooltip typography
proofs are replayed only for the explicitly named supplemental cohorts and
action scopes; no generic supplemental-state waiver is added.

The report retains all ten presence mismatches as application/plugin state
authoring defects, with distinct explanations for suppressed hover and missing
click dismissal. Every supplemental case remains `inputEquivalent:false` and
`finalRasterVerified:false`. New typography observations are reviewed using
their own source evidence rather than inheriting a visual pass from another
state. Both the producer and independent reader are now source-fingerprinted.

Three integration tests add 17 report-mutation controls plus incomplete,
missing and escaped-source controls. Together with the existing capture tests
and source-fingerprint test, this focused command passes **6/6**, zero failed,
skipped, cancelled or todo, **0.738 seconds**, terminal exit 0:

```powershell
node --test --test-name-pattern='tooltip state|records source fingerprints' tests/material-parity/supplemental-capture-evidence.spec.mjs tests/material-parity/input-equivalence-audit.spec.mjs
```

No application, renderer, reference, benchmark matrix or visual threshold is
changed. All ten frozen visual-harness hashes still match the checkpoint.
The first consolidated diagnostic command stopped after building the report
because its print expression used `mappings` instead of `reviewedMappings`;
that terminal exit 1 is not validation evidence.

`npm run parity:harness:check`: **397/397 pass**, zero failed/skipped/cancelled/
todo, **164.688 seconds**, terminal exit 0. The final unfiltered enforced visual
matrix remains required after the complete audit; this harness test run is not
that matrix.

The integrated inventory contains **4,748 side-specific cases**, up from 4,688.
All 30 paired tooltip boundaries bind successfully with no collection errors;
all ten presence mismatches remain. Paired tooltip overlay-text mappings rise
from **18 to 26**. Their eight new font-stack and eight alignment differences
meet the existing exact-source proofs; this does not certify glyph paint.
The isolated 60-tree supplement has no inventory errors and retains **ten
unresolved text-owner gaps** plus **30 unresolved trigger-control typography
differences**. Those are additional review work, not silently accepted states.

The full diagnostic command uses the frozen source below and does not write or
overwrite the stale untracked final reports:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,inventory:a.elementInventory.cases.length,tooltip:a.supplementalTooltipState.cases.length,tooltipErrors:a.supplementalTooltipState.errors,tooltipBinding:a.supplementalTooltipState.binding,tooltipMismatches:a.supplementalTooltipState.mismatches.length,retainedGaps:a.retainedTypography.gaps.length,retainedUnresolved:a.retainedTypography.differences.filter(d=>d.attribution==='unresolved').length,tooltipMappings:a.retainedTypography.reviewedMappings.filter(m=>m.kind==='reviewed-tooltip-overlay-text').length,tooltipGaps:a.retainedTypography.gaps.filter(g=>g.family==='tooltip').map(g=>({case:g.case,element:g.element,reason:g.reason})),tooltipUnresolved:a.retainedTypography.differences.filter(d=>d.family==='tooltip'&&d.attribution==='unresolved').map(d=>({case:d.case,property:d.property}))}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

Full report generation and independent diagnostic replay finish with terminal
exit 0 and `DIAGNOSTIC []`. Strict validation deliberately remains incomplete:
**3,309 resolved-style attributions, 879 control-text differences, 291 retained
mapping/stage gaps and 354 retained typography differences** still need review.
The command prints these strict errors; its exit 0 is not strict acceptance.
All **107 source findings** remain detected, with no unexplained source findings
or undetected definitions. Complete capture coverage is not complete causal
attribution. The remaining implementation plan, ownership review and full
acceptance requirements are not declared complete by this increment.

## Tooltip pointer-state divergence and unchecked benchmark acceptance (2026-09-13)

`scripts/audit-material-tooltip-state.mjs` captures the unchanged frozen served
application after initial, hover, press, release and leave boundaries. It keeps
three input cohorts separate: `benchmark=1&interaction=open`,
`benchmark=1&interaction=hover`, and ordinary non-benchmark mode. Each runs at
1440x1000, light theme, DPR 1 and 2. All runtime documents, scripts, styles and
fonts match the selected checkpoint. The declared post-settlement timer sample
is 250ms, including ordinary Material's animation; this is not an assertion that
the earlier full benchmark sampled at that same time.

Results are identical across the two DPRs:

| Cohort | Initial ref/candidate | Hover | Press | Release | Leave |
| --- | --- | --- | --- | --- | --- |
| benchmark-open | 0 / 0 | 1 / 0 | 1 / 0 | 0 / 1 | 0 / 0 |
| benchmark-hover | 0 / 0 | 1 / 1 | 1 / 1 | 0 / 1 | 0 / 0 |
| ordinary | 0 / 0 | 1 / 1 | 1 / 1 | 0 / 1 | 0 / 0 |

Numbers are captured popup-node counts, **not a blanket pixel-visibility or
input-equivalence verdict**. There are **30 paired boundaries, 60 input trees,
60 screenshots and 10 presence mismatches**. Candidate state and retained core
text corroborate its popup presence. The ordinary DPR1 release screenshots were
also inspected: reference popup absent, candidate popup still visible below the
button. No position, sharpness or broader raster acceptance is inferred.

The causal paths are separate:

- `astylar.component.ts:97` gates tooltip pointer entry on benchmark scenario
  names. History identifies `a0f3328`. It suppresses hover opening in the
  benchmark-open cohort, even though the same pointer action opens Material.
- `astylar.component.ts:285` forces the candidate open on a benchmark-open
  click; history identifies `7159b1d`. That reverses the reference transition.
- Removing that special branch alone is insufficient: ordinary and
  benchmark-hover candidate content also survives release. Installed Material
  `module-CWxMD37a.mjs:384` subscribes to overlay outside-pointer events;
  `:843` calls `hide(0)` on body interaction. The candidate trigger is outside
  the reference popup, but its hand-authored state logic does not implement
  the corresponding dismissal.
- `run-material-parity.mjs:847` only checks tooltip placement for hover/held,
  `:1236` excludes popup text in other states, and the generic state fallback
  at `:1202` returns `matches:true`. Focused raster configuration likewise
  has no open-state popup target. The eight frozen open cases therefore pass
  those gates without proving popup presence parity. Matching click events
  and focused trigger identity do not establish matching component state.

Three new source findings record benchmark hover suppression, forced-open click,
and omitted open-state popup checks. The recommended fix is to remove
scenario-dependent component behavior and express ordinary tooltip opening and
dismissal through the shared surface/core interaction contract. Do not install
a plugin-specific coordinate or document-wide event system. Then assert both
presence and absence after each action before comparing placement/raster.
Keep datepicker/timepicker behavior distinct; this proof is tooltip-specific.

The dedicated reader `validateTooltipStateCapture` independently binds runtime
assets, source bytes and checkpoint provenance, checks all cohort/action/DPR
records, re-derives popup counts from hashed trees, verifies state/retained
owners, event prefixes, trusted pointer coordinates, and screenshot hash/size.
It rejects fabricated success and changed traces. Two tests include **27
negative controls**; focused command:

`node --test --test-name-pattern='tooltip state evidence' tests/material-parity/supplemental-capture-evidence.spec.mjs`

**2/2 pass**, no failed/skipped/cancelled/todo, **0.258 seconds**, terminal exit 0.

Capture command:

```powershell
node scripts/audit-material-tooltip-state.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/supplemental-current-ancestry-audit/tooltip-state-audit-v2
```

Terminal **exit 1 intentionally preserves the 10 presence mismatches**. Reader
validation returns `complete:true`, `checkpoint-bound`, `errors:[]`, 30
observations and the same 10 mismatches; this is valid diagnostic evidence,
not a passing parity result. The report SHA-256 is
`1a554bf3b3bd477a2e7fe148640b07fe539731e4611e32b1e8f7ed2289e68a61`.
The first `tooltip-state-audit` capture is preserved but is not acceptance
evidence: its native event probe omitted pointermove and could not prove leaving
a control while remaining inside the canvas. V2 records trusted pointermove
coordinates rather than requiring a native canvas pointerout event.

The reference's external described-by target was also observed in the full
document with text `Create a project` in all six initial captures. This supplies
previously missing diagnostic context but does not prove announcement behavior
or equivalent candidate semantics.

These new 60 trees have their own bound reader; consolidated inventory
integration and classification of the eight frozen tooltip gaps remain next
steps. Do not silently count this as already included in full audit coverage.
The existing full matrix, thresholds, reference, fixture and renderer are
unchanged. Full harness and audit-replay verification are recorded below.

Independent live-reader command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {validateTooltipStateCapture} from './tests/material-parity/tooltip-state-evidence.mjs';const reportFile='artifacts/material-parity/supplemental-current-ancestry-audit/tooltip-state-audit-v2/latest-report.json';const raw=JSON.parse(readFileSync(reportFile));const manifest=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/checkpoint/manifest.json'));const r=validateTooltipStateCapture(raw,{reportFile,root:process.cwd(),expectedProvenance:manifest.provenance});console.log(JSON.stringify({complete:r.complete,binding:r.binding,errors:r.errors,observations:r.observations.length,mismatches:r.observations.filter(o=>!o.presenceMatches)}));if(!r.complete)process.exitCode=1;"
```

`npm run parity:harness:check`: **394/394 pass**, zero failed/skipped/cancelled/
todo, **165.766 seconds**, terminal exit 0. All ten frozen visual-harness raw
hashes match the checkpoint. No visual gate was weakened or rerun as part of
this diagnostic increment; the final full enforced matrix is still required.

Full audit replay command (does not yet integrate the new tooltip supplement):

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,tooltipFindings:a.sourceFindings.filter(f=>f.id.includes('tooltip')).map(f=>({id:f.id,detected:f.detected,locations:f.locations.map(l=>l.line)}))}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

All **107 source findings** are detected; the three new locations are candidate
lines 97/285 and harness line 1236. Coverage remains complete for the existing
integrated matrix, and diagnostic validation returns `[]`.
Terminal exit 0 prints (rather than hides) strict failures: **3,309 main-style
attributions, 849 control-text differences, 281 retained gaps and 354 retained
typography differences** still require review. None of those counts is reduced
by this separate state proof. Audit completion remains unproven.

## Tooltip surface alignment inputs versus flex centering (2026-09-13)

The original tooltip surface rule `.mat-mdc-tooltip-surface` declares
`text-align:center` (active, unconditional, non-important). The frozen reference
capture records that declaration and computed `center`. The corresponding
candidate popup, anchor, section and page omit text alignment in both normal
and interaction-resolved **own** styles. The retained core text entry contains
`left`. The popup separately authors `display:flex`, `alignItems:center` and
`justifyContent:center`; those are not substituted for the missing text-alignment
input in the audit.

New attribution `reviewed-tooltip-text-alignment-input` requires the original
surface declaration, complete candidate ancestry, original rule evidence,
exclusion of potentially applicable alignment/reset/animation rules, both
candidate inspection stages and retained core text. It preserves unrelated
candidate alignment rules as exclusion evidence. It rejects inline overrides,
missing stages, changed ownership or conflicting values. Independent replay
checks the evidence rather than trusting a classification label.

Source finding `fixture-tooltip-text-alignment-omission` records the omission
at `astylar.component.ts:811`. `git log -S "selector: '#tooltip-popup'"` and
`git show 7159b1d -- examples/material-showcase/src/app/astylar.component.ts`
show the first dedicated popup style already omitted text alignment. The
`f3c8254` conversion to a relative flow popup retained it; its diff also records
the historical `translate(93px, 37px)` compensation, which is not restored.
The original Material component style is in the already fingerprinted installed
`module-CWxMD37a.mjs` at line 938. Core
`src/app/services/dom/renderer.service.ts:543` recursively inherits text
properties, merges own style over its fallback, and sets fallback alignment
to `left`. These source and captured-stage witnesses support unequal authoring;
they do not prove a core failure to render an explicitly supplied center value.

The remediation plan is to preserve the original surface's text-alignment and
layout inputs, then use equivalent-input proofs for any remaining core failure.
Do not move glyphs or change padding to compensate. Current tooltip displacement,
blurry raster, external description ownership and the eight candidate-only
benchmark open states remain separate investigations. No production styles,
plugin implementation, renderer behavior or reference inputs were changed.

Three new tests cover the positive path, **30 negative input/stage controls**,
and **12 report mutations**. Focused command:

`node --test --test-name-pattern='tooltip text|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

**8/8 pass**, zero failed/skipped/cancelled/todo, **2.624 seconds**, terminal
exit 0. `npm run parity:harness:check`: **392/392 pass**, zero failed/skipped/
cancelled/todo, **187.727 seconds**, terminal exit 0. All ten frozen visual-harness
raw hashes match their checkpoint manifest. `git diff --check` passes.

Full audit replay command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,tooltipAlignment:a.retainedTypography.differences.filter(d=>d.attribution==='reviewed-tooltip-text-alignment-input').length,tooltipGaps:a.retainedTypography.gaps.filter(g=>g.element==='tooltip-popup').length,retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length,retainedDifferences:a.retainedTypography.differences.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

Terminal exit 0; the command prints strict errors rather than asserting strict
success. All **104 source findings** are detected; **18 tooltip alignment
differences** receive this attribution. Unresolved retained typography decreases
**372 to 354**. The 281 unresolved retained gaps (including eight tooltip gaps),
849 control-text differences, 3,309 main-style attributions, 8,140 unique main
differences / 380,520 occurrences and 88 structural differences remain unchanged.
Coverage remains complete and diagnostic validation returns `[]`. Strict
validation still rejects those four unresolved groups. No full visual matrix
was rerun in this increment; the final unfiltered rerun remains required.

Next investigation evidence: all eight frozen tooltip `open` cases report
`meetsAcceptance:true`, candidate `open:true`, matching pointerdown/up/click
events and focus, but no focused popup raster. Both `interactionState` and
`overlayPlacement` contain only `{matches:true}`. Source
`run-material-parity.mjs:847` limits tooltip placement to hover/held;
`:1236` likewise excludes its popup text target in other states. The generic
interaction-state fallback at `:1202` does not compare tooltip visibility.
These are not proofs that the open-state popup matches. The benchmark-only
candidate click branch at `astylar.component.ts:285` traces to `7159b1d`, and
the text-target exclusion traces to `f324bd1`. Capture/action ordering and
visibility assertions still need a dedicated state-proof increment; this
alignment attribution does not remove or classify away those eight gaps.

## Tooltip connected-overlay text and unpaired open states (2026-09-13)

The audit now maps **18 paired tooltip text owners** through the unique
`tooltip-primary` trigger, original `mattooltip` message, and shown connected
overlay. The six-node reference visual path runs from the anonymous surface
through tooltip wrapper, `mat-tooltip-component`, overlay pane, connected
position bounding box and overlay container. Candidate text is a direct
`div#tooltip-popup` inside `div#tooltip-anchor`, section and page. Its trigger
is a sibling in that fixed-size flex column, not the reference overlay origin.

New mapping `reviewed-tooltip-overlay-text` preserves all these original
styles, rule indices, attributes, raw text and trigger/section/frame witnesses.
It reuses the existing source finding
`fixture-tooltip-replaces-connected-overlay-with-flow`, whose history points
to `f3c8254`. `git log -S "id: 'tooltip-anchor'"` independently identifies that
same commit. The current implementation remains at
`astylar.component.ts:809-811` and `1076-1078`; the reference authors
`matTooltip="Create a project"` at `reference.component.ts:91`.

The installed tooltip entry point re-exports its implementation from
`@angular/material/fesm2022/module-CWxMD37a.mjs`. That actual component source,
now included among **55 source fingerprints**, supplies the original nested
surface template, `aria-hidden:true` visual component, before pseudo-elements,
size constraints, text tokens, clipping and animation/transform inputs at
line 938. The captured reference trigger's described-by ID points outside the
captured frame/overlay text trees. This mapping preserves that ID; it does not
invent the external description node or equate it with the candidate visible
`role:tooltip` sibling. Accessibility description completeness remains open.

All 18 paired captures use a below-positioned pane. Mapping rejects a different
unreviewed placement topology rather than extrapolating the captured result.
It exposes **36 typography differences**: 18 missing component font-family
overrides already attributed by original token/ancestry evidence, and 18
reference `text-align:center` versus retained candidate `left` values still
requiring attribution. Candidate flex centering is not silently substituted
for text alignment, nor accepted as proof of equal rendering inputs.

Separately, **eight candidate-only `open` states** remain unmatched, one per
profile at desktop DPR 1 and 2. The candidate benchmark-only click branch
(`astylar.component.ts:285`) forces `open:true`; reference/candidate hover and
held captures must not be conflated with that special branch. No missing
reference popup is fabricated, and these eight gap records remain unresolved.
All 50 tooltip interaction cases (100 captured sides) remain inventoried.

Four tests cover original/candidate ownership, **28 negative topology/trigger
controls**, absent reference popup, missing retained text, and **11 report
mutations**. Independent replay rejects deleted or fabricated mappings,
typography, source paths and equivalence/raster claims. This does not certify
connected positioning, collision, scroll behavior, visibility or glyph raster.

Focused command:

`node --test --test-name-pattern='tooltip text|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

**5/5 pass**, zero failed/skipped/cancelled/todo, **1.344 seconds**, terminal
exit 0. `npm run parity:harness:check`: **389/389 pass**, zero failed/skipped/
cancelled/todo, **151.070 seconds**, terminal exit 0. All ten frozen visual-harness hashes
match, and `git diff --check` passes. No production fixture, plugin, renderer,
reference or visual threshold was changed.

Full audit replay command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,tooltipMaps:a.retainedTypography.reviewedMappings.filter(m=>m.kind==='reviewed-tooltip-overlay-text').length,tooltipGaps:a.retainedTypography.gaps.filter(g=>g.element==='tooltip-popup').length,retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length,retainedDifferences:a.retainedTypography.differences.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

Terminal exit 0; this command prints strict errors instead of returning a
strict-success exit. All **103** source findings are detected; the main 8,140
differences / 380,520 occurrences and 88 structural differences remain
unchanged. Coverage stays complete. Retained gaps decrease **317 to 281**;
unresolved retained typography increases **354 to 372**. Diagnostic validation
returns `[]`; strict validation retains:

```text
3309 resolved-style differences still lack root-cause attribution
849 control texture typography differences require attribution
281 retained typography mappings or stage fields require review
372 retained typography differences require attribution
```

These remain audit obligations, not accepted renderer parity. Final report
generation and the final unfiltered enforced matrix are still required.

## Snackbar supporting-text size and ink provenance (2026-09-13)

The **68** size/color differences exposed by the message mapping now have
declaration-backed ownership attribution, without changing their inputs:

- **34 sizes:** the reference message directly declares
  `var(--mat-snack-bar-supporting-text-size, var(--mat-sys-body-medium-size))`,
  computing `14px`. Candidate message, surface, overlay and section omit an
  own font size; `#page` explicitly authors `16 * theme.typographyScale` pixels
  (`astylar.component.ts:471`). Its `14.4px`, `16px` or `18.4px` value survives
  normal/effective inspection and is inherited into registry text. Missing
  leaf values are retained as missing, not rewritten to the inherited size.
- **34 colors:** the reference message inherits
  `var(--mat-snack-bar-supporting-text-color, var(--mat-sys-inverse-on-surface))`
  from its original snackbar surface through the outer label, live-region,
  portal wrapper and simple-snack-bar, computing `rgb(245,239,244)` throughout
  that six-node path. Candidate own message color is absent; its direct
  `.snack-surface` explicitly authors `#ffffff` (`astylar.component.ts:806`),
  and normal/effective surface plus retained message inputs agree on white.

The original rules are present in the already fingerprinted installed
`@angular/material/fesm2022/snack-bar.mjs`. `git show
2f44011:examples/material-showcase/src/app/astylar.component.ts` confirms the
initial showcase already used the scaled page size and literal white snackbar
surface. Its earlier positioning and width differed from today's composition;
this finding does not attribute every later overlay change to that commit.
`src/app/services/dom/renderer.service.ts:543` supplies independent core-source
confirmation: `getInheritedTextStyle` recursively picks parent text inputs,
merges own properties, then resolves font size from own/inherited/default
values. No world-space calculation is needed to explain these unequal inputs.

New source finding: `fixture-snackbar-message-token-substitution`.
New observation attribution: `reviewed-snackbar-message-token-input`.
The size and ink checks deliberately use different original owners. They
require complete message correspondence, exact active ordinary token rules,
consistent captured values through each inheritance path, complete candidate
rule inspection, absent intervening own declarations, and unchanged owner-to-
retained values. Inline resets, competing or unknown applicable selectors,
animation/transition inputs, conditional owner rules and missing evidence
prevent attribution. This is not a second cascade implementation: ambiguous
rules are rejected, and computed/retained values are observed independently.

Four tests cover all three captured candidate sizes, **52 negative declaration/
stage controls**, independently changed token computations and two intervening
owner controls, plus **22 report mutations**. Replay rejects removed or forged
source, ancestry, stage, scope, equivalence and raster evidence. The first
negative-test run revealed that changing a raw `ruleEvidenceComplete` field
does not affect the collector, which derives that flag from raw rule/error
arrays. The test now removes the actual `errors` array and proves missing
evidence prevents attribution; no production behavior was changed.

Focused command:

`node --test --test-name-pattern='snackbar message token|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

**5/5 pass**, zero failed/skipped/cancelled/todo, **1.371 seconds**, terminal
exit 0. `npm run parity:harness:check`: **385/385 pass**, zero failed/skipped/
cancelled/todo, **132.607 seconds**, terminal exit 0. All ten frozen visual
harness hashes match; `git diff --check` passes. All 170 message typography differences now have
attribution, including the previously reviewed family/line-height/alignment
cohorts; this does not establish equivalent structure, intrinsic width,
theme-token fallback provenance, live announcements, placement, visibility,
compositing or final glyph raster. Those remain separate audit requirements.

Full audit replay command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,snackbarTokens:a.retainedTypography.differences.filter(d=>d.attribution==='reviewed-snackbar-message-token-input').length,retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length,retainedDifferences:a.retainedTypography.differences.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

The full replay finds all **68** new attributions; all **103** source findings
are detected. Coverage remains complete; the main 8,140 differences / 380,520
occurrences and 88 structural differences remain unchanged. Retained gaps stay
at **317**, while unresolved retained typography decreases **422 to 354**.
Diagnostic consistency validation returns `[]`. Terminal exit 0; the command
prints strict errors rather than setting a strict-success exit code. Strict
validation retains the outstanding requirements:

```text
3309 resolved-style differences still lack root-cause attribution
849 control texture typography differences require attribution
317 retained typography mappings or stage fields require review
354 retained typography differences require attribution
```

No production fixture, renderer, plugin, reference or visual threshold was
edited. Final machine-report generation and the final unfiltered enforced
visual matrix remain required after the remaining audit findings are resolved.

## Snackbar message correspondence and unequal composition (2026-09-13)

The audit now maps **34 snackbar message labels** in all captured paired open
states through the unique overlay, live-region and sibling `UNDO` action path.
The 59 snackbar interaction cases also include 25 closed/dismissed states;
they are not supplied with fabricated text entries. The action retains its
independent core-control-texture mapping; the message uses core registry text.

The installed `@angular/material/fesm2022/snack-bar.mjs:204` defines a
`simple-snack-bar` flex container with a `div[matSnackBarLabel]` and a separate
conditional action wrapper/button. Its original message has `flex:1 1 auto`
and captured padding `14px 8px 14px 16px`. The captured overlay contains the
original label, live-region and surface wrappers. The candidate instead authors
a direct span and value button inside one fixed-width, shared-padding status
surface (`examples/material-showcase/src/app/astylar.component.ts:994`).
The original component explicitly uses `aria-live` rather than a status role
except for its Firefox-specific branch (`snack-bar.mjs:265`); the current
candidate supplies `role:status`, `ariaLive:polite`, and `ariaAtomic:true` on
the surface. Captured attributes are preserved; no screen-reader equivalence
or announcement failure is inferred from this structural finding.

`git log -S "textContent: 'Project saved'"` identifies initial showcase commit
`2f44011`, not a later coordinate repair, as the origin of the message span.
New source finding `fixture-snackbar-message-composition-substitution` records
the replacement as unequal authoring. The installed snackbar component source
is now included among **54 source fingerprints**. The already recorded fixed
surface width and action typography findings remain separate obligations.

`reviewed-snackbar-message-text` preserves both raw strings, the ten-node
reference message-to-overlay path and the five-node candidate message-to-page
path, including original style/rule indices. It proves identity, not equivalent
layout, wrapping, live-region behavior, placement, visibility or raster. A
missing shared ID is not evidence that the snackbar failed to render.

Mapping exposes **170 typography differences** (five per open state):

- 34 component `Roboto` versus inherited `Roboto, Arial, sans-serif` stacks;
- 34 explicit `20px` versus omitted/retained `normal` line heights;
- 34 horizontal `start` versus `left` alignments, accepted only by the existing
  captured-direction equivalence guard;
- 34 fixed reference `14px` versus candidate sizes: 18 at `16px`, eight at
  `14.4px`, and eight at `18.4px`;
- 34 reference `rgba(245,239,244,1)` versus retained white colors.

Existing declaration-backed rules explain the first three cohorts. The **68
size/color observations remain unresolved** pending their exact declaration
and inheritance traces. This increment does not label them renderer defects
or conceal them with sampled font sizes/colors. Overall retained mapping/stage
gaps decrease from **385 to 317**, while unresolved retained typography
differences increase from **354 to 422** because the new mapping exposes inputs
that were previously unpaired.

Four new tests cover correspondence, **28 negative topology/identity controls**,
missing retained-stage evidence, and **11 report mutations**. Independent replay
rejects removed/fabricated mappings, changed ownership paths, altered typography
and equivalence/raster claims, even in diagnostic partial reports. Source trees
remain unchanged by collection.

Focused command:

`node --test --test-name-pattern='snackbar message|snackbar action|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

**10/10 pass**, zero failed/skipped/cancelled/todo, **7.169 seconds**, terminal
exit 0. `npm run parity:harness:check`: **381/381 pass**, zero failed/skipped/
cancelled/todo, **139.708 seconds**, terminal exit 0. All ten original visual-harness raw hashes
still match the frozen current-ancestry manifest. No production fixture,
renderer, plugin, browser reference or visual threshold changed. This is not a
new visual matrix run; the final unfiltered enforced run remains required when
the complete input audit is ready.

Full audit replay command (the preliminary `messageBreakdown` projection uses
absent top-level value fields; the exact `values` counts above were verified
separately from the retained observations, not inferred from that projection):

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});const message=a.retainedTypography.differences.filter(d=>d.element==='snack-bar-title');console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,messageMaps:a.retainedTypography.reviewedMappings.filter(m=>m.kind==='reviewed-snackbar-message-text').length,messageDifferences:message.length,messageBreakdown:Object.fromEntries([...new Set(message.map(d=>d.property))].map(k=>[k,message.filter(d=>d.property===k).map(d=>({reference:d.reference,astylar:d.astylar,attribution:d.attribution})).filter((v,i,all)=>all.findIndex(w=>JSON.stringify(w)===JSON.stringify(v))===i)])),retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length,retainedDifferences:a.retainedTypography.differences.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

Terminal exit 0; this command prints strict errors rather than returning a
strict-success exit. Coverage remains complete, with 8,140 unique main style
differences / 380,520 occurrences and 88 structural differences. All **102**
source findings are detected. Diagnostic validation returns `[]`; strict
validation honestly retains:

```text
3309 resolved-style differences still lack root-cause attribution
849 control texture typography differences require attribution
317 retained typography mappings or stage fields require review
422 retained typography differences require attribution
```

These are outstanding audit requirements, not accepted input equivalence.

## Autocomplete/select base and selected label ink (2026-09-13)

All **192** option-color differences exposed by the preceding domain audit now
have declaration/ownership/stage attribution, without changing or accepting
the unequal colors:

- **144 unselected labels** (104 autocomplete, 40 select) inherit
  `var(--mat-option-label-text-color, var(--mat-sys-on-surface))` from their
  unique reference option parent. Both compute `rgb(29,27,30)`.
- **48 selected labels** (8 autocomplete, 40 select) instead receive
  `var(--mat-option-selected-state-label-text-color, var(--mat-sys-on-secondary-container))`
  directly from the original selected primary-text selector, computing
  `rgb(75,67,87)`. Their option parents retain the base color. These are not
  interchangeable inheritance paths.
- Candidate `.select-option` declares literal `#1d1b20`. Its normal/effective
  owner inputs retain that literal. The direct label has **no own color** in
  either inspection stage, and retained core text inherits the literal. The
  audit preserves these absent leaf values instead of fabricating a fully
  inherited color in the own-style captures. Selected candidate rules change
  background, not label ink.

The original two reference declarations are in the already fingerprinted
installed `examples/material-showcase/node_modules/@angular/material/fesm2022/option-BzhYL_xC.mjs:269`.
The candidate literal is at `astylar.component.ts:560`. `git show
2f44011:examples/material-showcase/src/app/astylar.component.ts` confirms that
the initial showcase already declared this literal on `.select-option`,
before the later label/check structure revisions recorded below.
`src/app/services/dom/renderer.service.ts:543` independently explains the
retained-stage path: `getInheritedTextStyle` recursively picks parent text
properties, including color, before merging own styles at line 573. No
Babylon color-space or coordinate calculation is needed to explain this
captured input mismatch; no equal-input core color defect is claimed.

New source finding: `fixture-material-option-ink-substitution`.
New observation attribution: `reviewed-material-option-ink-input`.
`reviewedMaterialOptionInk` requires the complete paired option mapping,
consistent reference selected/disabled/multiple state, exact original active
ordinary declarations, complete parent/leaf computed inputs, no intervening
inline/reset/animation ink and no competing applicable candidate ink rules.
It checks candidate owner normal/effective color, absent own leaf color and
retained inherited color independently. Unselected parent/leaf computed ink
must agree; selected text is explicitly allowed to differ from its parent.
Unknown/ambiguous selectors are treated as possible competitors, not ignored.

Five tests include **156 shared negative capture controls**, **30 selected/
unselected-specific controls**, independent base/selected token-value variants,
and **22 report mutations**. Replay rejects invented own-stage inheritance,
removed source/ancestry witnesses and fabricated core/equivalence/raster claims.
All new attributions remain `application-plugin-authoring-defect`,
`inputEquivalent:false`, `currentPseudoStatePaintVerified:false` and
`finalRasterVerified:false`. This does not prove variable fallback provenance,
overlay theme containment, state-layer compositing, indicator paint or physical
glyph raster. Those remain separate obligations.

Focused command:

`node --test --test-name-pattern='material option ink|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

**6/6 pass**, zero failed/skipped/cancelled/todo, **2.459 seconds**, terminal exit 0.
`npm run parity:harness:check`: **377/377 pass**, zero failed/skipped/cancelled/
todo, **130.448 seconds**, terminal exit 0. `git diff --check` passes; all ten
original visual-harness raw hashes match the frozen current-ancestry manifest.

Full audit replay command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,ink:a.retainedTypography.differences.filter(d=>d.attribution==='reviewed-material-option-ink-input').length,retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length,retainedDifferences:a.retainedTypography.differences.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

Terminal exit 0; this command prints strict errors, not a strict success exit.
Measured coverage remains complete, with **101** detected source findings and
zero undetected source definitions. All **192** option inks are attributed;
unresolved retained typography differences fall from **546 to 354**.
Diagnostic validation returns `[]`. Strict validation still rejects completion:

- **3,309** resolved-style differences lack root-cause attribution.
- **849** control texture typography differences require attribution.
- **385** retained mapping/stage gaps require review.
- **354** retained typography differences require attribution.

The audit remains incomplete. This attribution replay does not replace the
required final unfiltered visual matrix run or the final checked-in report.

The proposed correction is to preserve the original base and selected token
declarations and their text ownership, not substitute sampled RGB values.
No fixture, plugin, renderer, captured tree or visual threshold changed.

## Autocomplete/select option-domain correspondence (2026-09-13)

The complete captured interaction cohort now maps **192** previously unmatched
option labels: **112** across 56 autocomplete open states and **80** across 40
select open states. The domains are the original two city values and solo/team
values from `reference.component.ts:78,81`, not a text-similarity guess. Both
unselected and selected/commit-reopen cases are included. Closed cases remain
closed; no synthetic options are inserted into either capture.

The reference uses `mat-option` with a direct primary-text span, a distinct
empty ripple owner, and a conditional minimal `mat-pseudo-checkbox`. Candidate
options use div/span and a conditional `showcase.material:check-mark` instead.
The new correspondence records preserve both sets of owners, original rules
and style indices, field/input/listbox links, full value domain, independent
selected states and conditional indicators. They are explicitly classified as
unequal authoring, with `inputEquivalent:false` and `finalRasterVerified:false`.
Text correspondence is not equivalent wrapper behavior, indicator geometry,
state styling, accessibility, scrolling, anchoring or commit behavior.

History and current sources:

- `4d56f862e560ffbdf18779f802e35eaacf363664` (`fix(material): restore field and
  popup interaction state`) introduced `autocompleteOption` and its replacement
  label/check children, now at `astylar.component.ts:829-838`.
- `6647a8758be4f056e5209cebc4d8c4291108fbf7` (`fix(material): align select popup
  state`) introduced the select label spans and conditional custom checks, now
  at `astylar.component.ts:953-962`.
- The original shared option composition/declarations remain in the already
  fingerprinted installed `@angular/material/fesm2022/option-BzhYL_xC.mjs`.

The machine source findings are
`fixture-autocomplete-option-composition-substitution` and
`fixture-select-option-composition-substitution`. These historical changes are
evidence of replacement authoring, not proof that every line was introduced
to conceal a specific renderer failure. No equivalent-input core failure is
claimed from these unequal fixtures.

Mapping exposes **960 raw typography differences**, rather than accepting the
previous mapping gaps as harmless. Across all 192 labels:

- Font stack: reference `Roboto`, candidate `Roboto, Arial, sans-serif`.
- Line height: reference `20px`, candidate retained `normal`.
- Letter spacing: reference `0.096px`, candidate `0`.
- Alignment: reference `start`, candidate `left`, with separately captured LTR
  context required by the existing representational-equivalence proof.
- Color: candidate retained `rgba(29,27,32,1)` throughout; reference
  `rgba(29,27,30,1)` for 144 unselected labels and `rgba(75,67,87,1)` for 48
  selected labels. These **192 color differences remain unresolved** in this
  increment, pending original selected-color/token/inheritance provenance.

Existing declaration/ancestry proofs independently attribute the first three
properties as omitted component inputs. The alignment proof does not equate
the surrounding layouts. No typography value, tolerance, capture, fixture,
plugin or renderer was changed.

`reviewedMaterialOptionMappings` requires unique keys/IDs, linked expanded
combobox/listbox and field ancestry, complete ordered values, direct text and
ripple ownership, plus correct conditional indicator topology independently
on each side. Missing, additional, reordered or ambiguous nodes prevent mapping.
The two families retain distinct reference input and panel associations.
Independent inventory replay checks all mapping/comparison/difference/gap
records, rejecting deleted or fabricated records and equivalence claims.

Four tests cover eight accepted family/selection combinations, **74 shared
negative capture controls**, six family-specific association controls and
**22 report mutations**. Focused verification:

`node --test --test-name-pattern='material option|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

**5/5 pass**, zero failed/skipped/cancelled/todo, **2.104 seconds**, terminal exit 0.
`npm run parity:harness:check`: **372/372 pass**, zero failed/skipped/cancelled/
todo, **147.588 seconds**, terminal exit 0. `git diff --check` passes.
All ten original visual-harness file hashes still match the frozen
`current-ancestry-audit/checkpoint/manifest.json`.

Full replay completed with terminal exit 0 (the command prints the strict
validator errors rather than converting them to an exit status):

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,summary:a.summary,mappings:a.retainedTypography.reviewedMappings.filter(m=>m.kind==='reviewed-material-option-text').length,retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length,retainedDifferences:a.retainedTypography.differences.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

The current report has complete measured coverage, **100** detected source
findings, zero undetected definitions and **192** new option mappings.
Unresolved retained mapping/stage gaps fall from **673 to 385**, because 192
missing-label records and 96 anonymous reference groups are replaced with
explicit correspondence and independent typography comparisons. Unresolved
retained differences rise from **354 to 546**, preserving the newly visible
192 ink discrepancies rather than suppressing them. Diagnostic validation
returns `[]`. Strict validation still rejects completion:

- **3,309** resolved-style differences lack root-cause attribution.
- **849** control texture typography differences require attribution.
- **385** retained mapping/stage gaps require review.
- **546** retained typography differences require attribution.

This replay does not replace the required final unfiltered visual matrix run.
The audit remains incomplete; no final machine-report artifact is published yet.

A subsequent source spot check of light/DPR1 autocomplete `open-commit-reopen`
and select `activate` explains why selected ink needs a separate proof: the
reference option stays `rgb(29,27,30)`, but its primary-text child has an active
`.mat-mdc-option.mdc-list-item--selected:not(.mdc-list-item--disabled):not(.mat-mdc-option-multiple) .mdc-list-item__primary-text`
rule declaring
`color:var(--mat-option-selected-state-label-text-color, var(--mat-sys-on-secondary-container))`.
The candidate `.select-option.selected` rule changes background only. This is
a source lead for cohort-wide attribution, not a new accepted color waiver or
a claim that all possible competing declarations have already been excluded.

The implementation plan now explicitly restores original option/text/ripple/
minimal-checkbox inputs and component tokens before evaluating residual core
layout or paint. Selected ink, overlay token scope, custom checkmark paint and
the existing anchored-overlay compensation remain independent audit work.

## Timepicker option ink provenance (2026-09-13)

The **2,304** newly exposed option-color differences now have source and stage
attribution. The original `.mat-mdc-option` rule declares
`color:var(--mat-option-label-text-color, var(--mat-sys-on-surface))`. Its direct
primary-text child has no intervening color declaration. Both the option and
label compute `rgb(29,27,30)` in all captured open cases. The replacement
candidate option declares literal `#1d1b20`, which stays `rgb(29,27,32)` in its
normal, effective and retained style stages. The unequal color originates in
the fixture inputs; this is not evidence of a renderer conversion error.

Source witnesses:

- `examples/material-showcase/node_modules/@angular/material/fesm2022/option-BzhYL_xC.mjs:269`
  contains the original option color-token declaration. This installed module
  is now included in the report's source fingerprints.
- `examples/material-showcase/src/app/astylar.component.ts:598` contains the
  generic picker-option literal. `git show 2f44011:examples/material-showcase/src/app/astylar.component.ts`
  confirms that exact ink was present in the initial showcase, before later
  timepicker alignment/state adjustments.

The source finding is `fixture-timepicker-option-ink-substitution`; the
per-observation attribution is `reviewed-timepicker-option-ink-input`.
It requires the complete linked option-domain mapping, a unique direct
reference option/text path, original active token rule, complete computed
owner/leaf values, no intervening ink override, and the literal candidate rule
matching normal/effective/retained stages. Missing rules/styles, competing
declarations, reset/animation declarations and uncertain candidate selector
matches prevent attribution. The existing conservative selector helper is used
only to exclude definitely unrelated targets, not to implement a new cascade.

The classification preserves the raw difference as unequal authoring, with
`inputEquivalent:false` and no final-raster claim. It does not infer the variable
fallback's origin, prove equivalent overlay theme scope, or certify composited
hover/selection paint. Those remain separate audit obligations. The proposed
fix restores the reference token and text ownership rather than replacing one
literal with sampled RGB or widening a color tolerance.

Four added tests include **30 negative capture controls**, two accepted
reference-token-value variants with irrelevant/inactive rules, and **nine
report mutations**. Independent option replay rejects fabricated classification,
scope, source, stage, equivalence and raster claims; the previously committed
complete-domain tests also continue to protect all option records.
No showcase, plugin, renderer or visual-harness behavior changes are included.

Verification:

- `node --test --test-name-pattern='timepicker option ink|timepicker option replay|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  **6/6 pass**, zero failed/skipped/cancelled/todo, **4.001 seconds**, terminal exit 0.
- `npm run parity:harness:check`: **368/368 pass**, zero failed/skipped/cancelled/
  todo, **154.386 seconds**, terminal exit 0.
- `git diff --check`: pass. All ten original visual-harness raw hashes still
  match `current-ancestry-audit/checkpoint/manifest.json`.

Full audit replay command:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,sourceFindings:a.summary.sourceFindings,undetected:a.summary.undetectedSourceDefinitions,ink:a.retainedTypography.differences.filter(d=>d.attribution==='reviewed-timepicker-option-ink-input').length,retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

The replay reached terminal exit 0 with complete configured coverage, **98/98**
source findings detected, **2,304** ink attributions and diagnostic validation
`[]`. Strict validation retains **3,309** unresolved resolved-style differences,
**849** control-texture differences, **673** retained mapping/stage gaps and
**354** other retained typography differences. No raw difference was removed;
the last count decreases from 2,658 solely because the 2,304 option colors are
now explained. Final complete audit reports and the unfiltered enforced visual
matrix remain outstanding; this diagnostic exit code does not mean acceptance.

## Timepicker complete option-domain correspondence (2026-09-13)

Reviewing remaining gaps across all components identified the largest unmapped
text population: **2,304 timepicker option IDs** plus **48 anonymous reference
list records**. Those were missing audit correspondences, not missing rendered
options. The complete captured main matrix has **110 timepicker cases**; **48**
contain paired open lists, each with all **48 half-hour values** from midnight
through 11:30 PM. The new mapping accounts for all 2,304 labels without using
screen positions, generated ID suffix equality, or text equality alone.

`reviewed-timepicker-option-text` requires unique expanded combobox/listbox
associations, the reference floating-label relationship, candidate field/input
region containment, a complete ordered domain, and the exact direct-child
Material option/primary-text/ripple versus candidate direct-text option paths.
It preserves each owner's attributes, styles, rules, state and decoration
evidence. Correspondence is explicitly **not input equivalence or raster proof**.
The original trees are unchanged. Different list sizes, missing/reordered
entries, duplicate IDs/keys, broken associations, extra content and unknown
active descendants prevent this mapping rather than disappearing from review.

The reference at
`examples/material-showcase/src/app/reference.component.ts:85` supplies no custom
time interval. The installed Material `_generateOptions` implementation at
`examples/material-showcase/node_modules/@angular/material/fesm2022/timepicker.mjs:325`
defaults to 30-minute intervals from 00:00 through 23:59. Candidate
`materialTimeOptions` at `examples/material-showcase/src/app/astylar.component.ts:1308`
generates the corresponding 48 labels. The installed Material module is now
included in the audit's source fingerprints.

The structural mapping exposes the following additional typography comparisons
in every option record:

| Property | Reference | Candidate retained input | Audit disposition |
| --- | --- | --- | --- |
| Font family | `Roboto` | `Roboto, Arial, sans-serif` | Existing declaration/ancestry proof attributes unequal font-stack authoring |
| Line height | `20px` | `normal` | Existing original-token/omission proof attributes unequal authoring |
| Letter spacing | `0.096px` | `0px` | Existing original-token/omission proof attributes unequal authoring |
| Text alignment | `start` | `left` | Existing complete horizontal-LTR context proves equivalent alignment meaning only |
| Ink | `rgb(29,27,30)` | `rgb(29,27,32)` | Remains unresolved pending exact color-token/cascade attribution |

Each row represents **2,304 observations**, or **11,520 newly inspectable raw
differences**. The alignment review does not certify equal line containers,
glyph positioning or pixels. The existing generic attribution validators still
apply independently to the font, line-height and tracking evidence.

The mapping also exposes a source-authored state mismatch: in all **48** open
lists the empty reference input has an active first option but no selected
option; the candidate permanently sets `ariaSelected: index === 0`. The remaining
**2,256** option records have false selection on both sides. Material's
`_syncSelectedState` at `timepicker.mjs:352` explicitly distinguishes active
fallback from a selected time. `git log -S 'ariaSelected: index === 0'` and
`git show 2f44011:examples/material-showcase/src/app/astylar.component.ts`
confirm the direct-text/first-selected substitution existed in the initial
showcase (which then authored only five labels). It is not evidence that core
turned correct selection input into an incorrect state.

The new source finding is
`fixture-timepicker-option-structure-and-selection-substitution`. The proposed
implementation order restores original option/label/ripple composition and
typography, separates active from committed selection, and retains the existing
honest commit-failure proof before testing equal-input scrolling and rendering.
No showcase, plugin or renderer behavior was changed in this increment.

Focused command:

`node --test --test-name-pattern='timepicker option|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

Result: **4/4 pass**, zero failed/skipped/cancelled/todo, **1.739 seconds**.
The tests include **24 negative capture controls** and **nine report mutations**
rejecting missing, duplicated, forged or transplanted evidence. Independent
report replay includes all option mappings, comparisons, differences and gaps;
deleting unfavorable typography cannot make this mapping pass validation.

`npm run parity:harness:check` passes **364/364**, zero failed/skipped/cancelled/
todo, **149.106 seconds**, terminal exit 0. All ten frozen visual-harness file
hashes still match the selected checkpoint. No thresholds or capture inputs
changed. The complete audit replay used:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs';import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs';const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'});console.log('SUMMARY '+JSON.stringify({coverage:a.coverage.complete,sourceFindings:a.summary.sourceFindings,undetected:a.summary.undetectedSourceDefinitions,mappings:a.retainedTypography.reviewedMappings.filter(m=>m.kind==='reviewed-timepicker-option-text').length,retainedGaps:a.retainedTypography.gaps.filter(g=>g.attribution==='unresolved').length}));console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false})));console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

The process reached terminal exit 0: complete configured coverage, **97/97**
source findings detected, **2,304** option mappings and diagnostic validation
`[]`. Strict validation honestly remains incomplete: **3,309** unresolved
resolved-style differences, **849** control-texture differences, **673** retained
mapping/stage gaps, and **2,658** retained typography differences. The mapping
gap reduction from 3,025 to 673 is the 2,304 option IDs plus 48 anonymous list
records; the unresolved typography increase from 354 to 2,658 is the newly
visible option ink differences. A successful diagnostic process is not audit
acceptance. Final report generation and the final unfiltered enforced parity
matrix remain outstanding.

## Calendar month-label typography provenance (2026-09-13)

The 123 month-marker typography differences exposed by the preceding increment
are now attributed from their declarations, not normalized away. The original
active `.mat-calendar-body-label` rule in the captured reference supplies:

| Property | Reference input / computed value | Candidate input / retained value |
| --- | --- | --- |
| Line height | Explicit `line-height:0`, computed `0px` | Omitted through the text-to-page chain; retained `normal` |
| Text alignment | Explicit `text-align:start`, computed `start` | `.datepicker-cell { textAlign:'center' }`, retained `center` |
| Ink | Calendar-body-label color token, computed `rgb(29,27,30)` | Literal `#1d1b20`, retained `rgb(29,27,32)` |

The source rule is in the installed Material calendar-body declarations at
`examples/material-showcase/node_modules/@angular/material/fesm2022/datepicker.mjs:555`.
The candidate generic cell is authored at
`examples/material-showcase/src/app/astylar.component.ts:620`. Reading history
confirms **87f7f83** initially omitted the label line-height and supplied fixed
ink; **4a330e2** added centered cell text alignment. These are fixture inputs,
not Babylon projection or renderer changes.

For the omitted property, the captured normal/effective chain runs from marker
through grid, popup, field shell and sample container to the page; none declares
line-height. `RendererService.getInheritedTextStyle` in
`src/app/services/dom/renderer.service.ts:543` supplies fallback `normal` and
merges inherited and own text inputs in that order. Thus the observed retained
`normal` is not evidence that core converted an explicit zero into normal.
For alignment and ink, the literal rule agrees with normal, effective and
retained values. `justifyContent:'flex-start'` on a replacement grid/flex cell
does not make `textAlign:'center'` equivalent to the reference table-cell input.
No natural line-box, glyph placement, physical font selection or final raster
claim is made by this attribution.

The new source finding and per-case attribution are
`fixture-calendar-month-marker-typography-substitution` and
`reviewed-calendar-month-marker-typography-input`. They preserve **123 records
across 41 paired states**, 41 per property, as unequal application/plugin
authoring. The original reference rule must be active, ordinary and unique for
the property, with no inline override or reset. Candidate rule checks reuse the
existing conservative compound-selector exclusion helper. A known mismatching
terminal compound can rule out a target; unknown syntax, possible state/media
rules and competing declarations prevent attribution. This is an audit
exclusion proof, not a new renderer selector/cascade implementation.

Thirty-six negative capture controls reject changed declarations, missing
ancestry, inline overrides, possible competing rules and altered normal,
effective or retained stages. Five definitely unrelated selector controls
remain attributable. Eight report mutations reject forged scope, rules, chain,
stage values and raster/equivalence claims. The earlier full-row correspondence
and its independent report replay remain prerequisites.

Focused command:

`node --test --test-name-pattern='calendar month marker|calendar weekday|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

Result: **13/13 pass**, zero failed/skipped/cancelled/todo tests, **9.329 seconds**.
The full audit replay uses the exact selected main/normal-line-box/supplemental
paths and diagnostic/strict command recorded in the next section. It still has
4,688 side/case inventory records, 2,158 variants and zero inventory errors;
all **96 source findings** are detected. The new classifications do not change
the captured inputs, remove differences, alter fixtures, or close the audit.

`npm run parity:harness:check` passes **361/361**, zero failed/skipped/cancelled/
todo tests, **142.664 seconds**, terminal exit 0. The full replay's diagnostic
validation returns `[]`. All ten original visual-harness hashes still match the
checkpoint; the export of its existing conservative selector helper is confined
to audit evidence code and does not change the helper's behavior or any runtime
selector implementation.

Strict validation still reports **3,309 unresolved resolved-style differences,
849 control-texture typography differences, 3,025 retained mapping/stage gaps,
and 354 retained typography differences**. The last count decreases from 477
because the 123 records are now explained, not deleted. The full replay reached
terminal exit 0 after printing these expected incomplete categories; its exit
code is not an acceptance result. The final complete audit report and unfiltered
enforced parity run remain outstanding.

## Calendar month-marker table/grid correspondence (2026-09-13)

The reference month marker is not an unconditional full-width row. The installed
`@angular/material/fesm2022/datepicker.mjs` month-view template supplies
`labelMinRequiredCells=3`. Its calendar-body template at line 555 creates a
seven-column, aria-hidden label row only when `_firstRowOffset < 3`. Otherwise
the nonempty label occupies a cell with `colspan=_firstRowOffset` in the first
week. When a separate label row is needed and the offset is nonzero, the first
week still retains an **empty** leading cell with that offset as its colspan.
These empty cells are inputs too, not disposable text-less noise.

The candidate in `examples/material-showcase/src/app/astylar.component.ts:1062`
always authors the marker before individual leading blanks and all the dates.
Its rule at line 627 specifies `gridColumn: '1 / -1'`, `paddingLeft: '12px'`
and flex-start justification on a fixed 40x40 cell. This differs from the
reference table cell's zero height/line-height, start text alignment and
percentage padding. Reading **87f7f83** confirms the initial table-to-grid
replacement; **c64397c** added the unconditional full-span rule and changed
`materialSelectedDayRow()` to an unconditional two-row offset. That historical
change does not establish equivalent conditional month layout.

The new source finding is
`fixture-calendar-month-marker-table-grid-substitution`, classified as
application/plugin authoring. The existing minimal equal-input full-grid-span
browser proof passes; do not cite this unequal table/grid comparison as proof
that core does not honor spans. Restoring the original table composition and
then reducing any remaining failure is the appropriate implementation boundary.

The audit now maps the text only after verifying the original calendar/period
ancestry, complete seven-column weekday header, every dated cell and week row,
the exact conditional label/empty-cell spans, and the entire candidate grid
child sequence including leading and trailing blanks. The mapping preserves
both structures with `inputEquivalent:false` and `finalRasterVerified:false`.
It neither moves text/rings nor waives a style difference.

The corrected full matrix and its bound calendar-close supplement produce
**41 mappings**: 33 main interaction states and eight supplemental boundaries.
All captured months are SEP 2026, whose offset is two; thus their separate-row
branch does not prove the first-week-sharing branch works in the application.
The unit controls cover all twelve 2026 months (all seven offsets, short and
long months) and leap February 2024, with source witnesses for both actual
reference branches. These synthetic input-tree controls are not live multi-month
rendering evidence. Candidate displayed-month navigation remains independently
broken as documented in the picker-commit investigation.

This correspondence removes **82 unresolved text-owner gaps** while exposing
**164 actual retained typography differences**. The existing exact ancestor
font-stack review attributes 41. The remaining 123 are line-height (`0` versus
`normal`), text alignment (`start` versus `center`), and ink
(`rgb(29,27,30)` versus `rgb(29,27,32)`), 41 each. They remain unresolved pending
their own original-declaration/stage attribution; mapping the text is not a
typography fix. Overall unresolved retained mapping/stage gaps decrease from
3,107 to **3,025**, while unresolved retained differences increase from 354 to
**477**. This is more complete evidence, not a visual regression or acceptance.

Focused command:

`node --test --test-name-pattern='calendar month marker|calendar weekday|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

Result: **9/9 pass**, zero failed/skipped/cancelled/todo tests, **6.760 seconds**.
The first run had one test expectation error (`0px` instead of the audit's
canonical `0`); correcting that test leaves the captured input and normalization
unchanged. Nineteen contradictory-input controls reject missing/reordered dates,
wrong context/spans/blank cells and changed marker ownership. Eight report
mutations reject removed/duplicated mappings, false equivalence, altered revision
or span evidence, and deleted/reclassified typography differences.

`npm run parity:harness:check` passes **357/357**, zero failed/skipped/cancelled/
todo tests, **149.536 seconds**, terminal exit 0. The full audit replay used:

```powershell
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {buildMaterialInputAudit,validateMaterialInputAudit} from './tests/material-parity/input-equivalence-audit.mjs'; const p=JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json')); const a=buildMaterialInputAudit(p,{root:process.cwd(),normalLineBoxPath:'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json',supplementalRoot:'artifacts/material-parity/supplemental-current-ancestry-audit'}); console.log('DIAGNOSTIC '+JSON.stringify(validateMaterialInputAudit(a,{requireComplete:false}))); console.log('STRICT '+JSON.stringify(validateMaterialInputAudit(a)));"
```

The diagnostic result is `[]`; strict validation retains four honest incomplete
categories: 3,309 unresolved resolved-style differences, 849 control-texture
typography differences, 3,025 retained mapping/stage gaps and 477 retained
typography differences. Inventory remains 4,688 side/case records and 2,158 tree
variants with zero inventory errors; all **95** source findings are detected.
This command intentionally prints strict validation errors rather than using
its shell exit code as an acceptance claim. No partial report replaces the
final checked-in deliverable.

All ten harness-file hashes bound to the current visual checkpoint still match;
no renderer, plugin, showcase, reference or visual threshold changed. The final
unfiltered enforced matrix and complete classified report remain acceptance
requirements, not claims made by this bounded audit increment.

## Calendar live-period and range-description omissions (2026-09-12)

The remaining calendar text-owner gaps include authored accessibility labels,
not only painted text. The installed reference source
`examples/material-showcase/node_modules/@angular/material/fesm2022/datepicker.mjs`
declares the body label IDs at line 233 and their template at line 555; the header
period-label ID is declared at line 2190, followed by its template. The body has
four description spans. In this single-date showcase, start/end text is empty
and both comparison spans contain **Comparison range**, with the original
`.mat-calendar-body-hidden-label { display: none; }` rule. The header has a
separate `.cdk-visually-hidden` span with `aria-live="polite"`; the period button
references it through `aria-describedby`.

The candidate branch in
`examples/material-showcase/src/app/astylar.component.ts:1054` supplies a header
value button and day/year grid but none of these labels or description links.
Reading the introducing commit **87f7f83** confirms their omission already existed
when the picker popup was added. This is new audit attribution of old unequal
authoring, not a newly introduced renderer regression.

The new source finding `fixture-calendar-accessibility-labels-omitted` and
per-case retained-stage attribution preserve both mechanisms explicitly:

- **57 live-period records** retain exact date/year context, header ancestry,
  description linkage, original clip rule and computed 1x1 clipped box.
- **114 comparison-label records** retain the full four-label body ownership,
  empty as well as nonempty source text, original display rule and computed
  `display:none`, and any captured description users.

These cover 57 paired states: 41 in the full matrix and 16 pre-dismissal
supplemental boundaries. The latter contribute 16 live-period and 32 comparison
records. Their candidate subtrees remain inventoried. No candidate registry or
paint entry is invented, no visually hidden content is declared equivalent to
omission, and no screen-reader announcement behavior is inferred from pixels.
The month-marker mapping/layout discrepancy remains separate and unresolved.

Validation independently reconstructs all expected omission records from the
captured trees and rejects deletion, duplication, altered evidence, equivalence
claims or replacement candidate owners. A differently named live region also
forces renewed review rather than satisfying the omission guard. It does not
broaden this finding to arbitrary hidden labels, different range text, missing
rules, stale core inspection or unrelated calendar states.

Focused command:

`node --test --test-name-pattern='calendar auxiliary|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

Result: **4/4 pass**, zero failed/skipped/cancelled/todo tests, **1.450 seconds**.
The tests preserve both views without mutating inputs and reject 22 changed
source/context/state cases plus nine removed or forged report records.

`npm run parity:harness:check` passes **353/353**, zero failed/skipped/cancelled/
todo tests, **137.104 seconds**. The complete audit was rebuilt using the same
current-ancestry visual report, natural-line-box report and supplemental root
documented below. Diagnostic `validateMaterialInputAudit(audit,
{ requireComplete: false })` returns `[]`. Strict validation still rejects
completion with **3,309** unresolved resolved-style differences, **849**
current-control typography differences, **3,107** retained mapping/stage gaps
(down from 3,278), and **354** retained typography differences. This reduction
is source-backed classification, not repaired rendering or a weakened gate.

The full replay preserves 4,688 side/case records, 2,158 variants, 8,140 main
style differences / 380,520 occurrences, and 88 structural differences. All
**94** source findings are detected. The 171 newly attributed omissions remain
unequal inputs; they are not removed from the report. No production, showcase,
plugin, live-capture harness or visual threshold changed, and all ten frozen
live-capture harness hashes still match the current-ancestry checkpoint.

## Calendar close action boundaries integrated into the full inventory (2026-09-12)

The main report now consumes the selected current-run `calendar-close-audit`
capture alongside the other supplements. All **20 paired boundaries / 40 input
trees** are retained, including the candidate popup after the reference has
closed. The validator independently reopens the bound report and source trees,
then compares the expanded inventory values rather than trusting pooled indices
or the report's own classification labels. Invalid or missing selected evidence
never falls back to an older capture.

The integrated full replay contains **4,688 side/case records** and **2,158 tree
variants**, with zero tree errors, missing-tree, resolved-stage, state-stage or
reference-context gaps. The source visual report remains SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`;
the calendar supplement remains SHA-256
`d09a946563651c389ad73db8be96bab5c129f7068513aaec9cc6cfa26d003f00`.

The calendar supplement contributes 448 current-control comparisons and 116
retained-text comparisons. Its **108 unmatched current-control records** after
Enter are now attributed to the independently verified unequal dismissal state:
the reference calendar is removed while the candidate's 27 header/year controls
remain, in each of four sequences. This is not missing core paint and cannot be
treated as typography equivalence. Every candidate subtree stays in the report.
The 16 pre-dismissal close-control omissions remain separately classified;
other newly captured typography differences and mapping gaps remain unresolved.

Focused verification:

`node --test --test-name-pattern='calendar close' tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/supplemental-capture-evidence.spec.mjs`

**14/14 pass**, zero failed/skipped/cancelled/todo tests, **4.614 seconds**.
The additions test all declared supplemental view/DPR/action scopes, 14 altered
summary/inventory cases, 26 contradictory action/state/paint/ancestry inputs,
and eight deleted or forged state-attribution records. The initial new unit
fixture incorrectly removed the whole reference page instead of only its popup;
the collector rejected it as missing-tree evidence. The fixture now retains the
page, and no collector check was relaxed.

`npm run parity:harness:check` passes **350/350**, zero failed/skipped/cancelled/
todo tests, **142.778 seconds**. The Markdown generator was also checked with
missing calendar evidence and reports 0/4 sequences and zero attributed controls,
not a fabricated complete capture.

The full report was rebuilt using `buildMaterialInputAudit` with
`artifacts/material-parity/current-ancestry-audit/latest-report.json`,
`normalLineBoxPath: 'artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json'`
and `supplementalRoot: 'artifacts/material-parity/supplemental-current-ancestry-audit'`.
Diagnostic `validateMaterialInputAudit(audit, { requireComplete: false })`
returns `[]`. Strict `validateMaterialInputAudit(audit)` still rejects completion:

- **3,309** resolved-style differences lack root-cause attribution.
- **849** current-control typography differences require attribution.
- **3,278** retained typography mappings or stage fields require review.
- **354** retained typography differences require attribution.

The 108 unequal-close-state controls are not unexplained mapping gaps, but their
attribution does not suppress the other new observations. The added retained
mapping gaps include the reference live-period and comparison-range labels and
the month marker; these need their own source/ownership review. This replay
leaves all **8,140** main style differences / **380,520** occurrences, **88**
structural differences and **93** detected source findings intact.

All ten live-capture harness files still match the frozen checkpoint hashes.
This increment changes audit collection, attribution, validation, tests and
documentation only; it does not modify production, plugins, showcase inputs,
the reference, visual gates or the configured capture matrix. Integration is
not completion of the wider root-cause audit.

## Calendar close control: live keyboard evidence, not just a hidden class (2026-09-12)

The previous structural finding correctly stopped short of claiming that the
hidden reference control was visible or operable. The new read-only producer
`scripts/audit-material-calendar-close.mjs` now exercises the actual frozen
application with a pointer-open followed by **Tab, Shift+Tab, Tab, Enter**.
It does not call `focus()`, inject a missing control, modify state, or feed
measured output geometry back into layout. The year-view preparation uses the
real period button on both sides.

Command:

`node scripts/audit-material-calendar-close.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/calendar-close-current-ancestry-audit`

The completed capture contains **four paired cases** (month and multi-year at
DPR 1 and 2, light profile, 1440x900 CSS px), **40 action-boundary input trees**
and **40 screenshots**. Each side's actual served document, scripts, styles and
fonts matches the selected checkpoint. Report:

`artifacts/material-parity/calendar-close-current-ancestry-audit/latest-report.json`

SHA-256: `6946ed820ecf83e98c20f3fd99c4327b700a768b7a4d064ecec086a41b2bb889`.

A second fresh capture used the same command with output
`artifacts/material-parity/supplemental-current-ancestry-audit/calendar-close-audit`.
Its report SHA-256 is
`d09a946563651c389ad73db8be96bab5c129f7068513aaec9cc6cfa26d003f00`.
Both reports independently validate against the checkpoint with zero errors.
All **40** focus identity, open state, clip, close-box geometry and opener-focus
snapshots repeat exactly. The second capture is located beside the other
current-run supplements for subsequent consolidated-inventory integration;
the first remains preserved. Both diagnostic processes completed with exit 1
for the expected candidate mismatch, not a collection error.

In every reference case:

- Opening focuses the active day or year. The close button remains in the
  dialog with computed `clip: rect(0px, 0px, 0px, 0px)`.
- Tab focuses **Close calendar**, removes the visually-hidden class and
  changes computed clip to `auto`. Its 142.28125x40 CSS-pixel box is within
  the viewport. Absolute positioning blockifies the authored inline-flex
  display to computed `flex`; the audit preserves that distinction.
- Shift+Tab restores focus to the active cell and reapplies clipping.
- Tab reveals the control again. Enter delivers a trusted key and click,
  closes the popup, and restores focus to the opener.

In every candidate case, the authored popup and semantic controls contain no
close counterpart. Month-view opening leaves focus on the opener; Tab reaches
the period button, not a close action. Year-view preparation leaves focus on
the period button; Tab reaches previous navigation. After the same complete
key sequence the candidate popup remains open. This producer intentionally
exits **1** for the unequal outcome, rather than calling it a passing parity
check. It is an **application/plugin authoring omission**, not evidence that
core failed to render or activate an authored close button.

`tests/material-parity/calendar-close-evidence.mjs` independently checks all
four cases, action order, trusted event histories, current core inspection,
dialog/label ownership, actual view and grid presence, computed clipping,
viewport reachability, dismissal and focus restoration. It replays full tree
bytes and validates screenshot digests/dimensions, source hashes and runtime
binding. Invalid evidence yields no accepted partial cases. Pixel appearance
is not inferred from these metadata checks: month/DPR1 reference and candidate
focused screenshots were also inspected, while `finalRasterVerified` remains
false rather than claiming full-state visual parity.

Focused command:

`node --test --test-name-pattern='calendar close' tests/material-parity/supplemental-capture-evidence.spec.mjs`

Result: **3/3 pass**, zero failed/skipped/cancelled tests, **0.250 seconds**.
The tests include **21** action/artifact mutation rejections and **11**
independently rehashed tree mutations. The real capture replays with zero
validation errors and all four cases checkpoint-bound.

The expanded focused command
`node --test --test-name-pattern='records source fingerprints|calendar close' tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/supplemental-capture-evidence.spec.mjs`
passes **8/8** in **5.235 seconds**, including the existing structural guards.
The first full harness run passed 342/343 and correctly rejected the old
expected fingerprint count (48 versus the new 51). That expectation now names
and checks the three added files as well as their proof records; no visual or
behavioral gate was weakened.
The repeated full `npm run parity:harness:check` passes **343/343** with zero
failed/skipped/cancelled/todo tests in **133.817 seconds**. Syntax checks for
the new producer and validator pass. All ten frozen live-capture harness files
still match their checkpoint SHA-256 values, preserving the completed full
visual matrix's provenance.

The main audit's proof inventory and source fingerprints now include this
producer, validator and tests. Its existing per-matrix structural witnesses
remain explicitly non-live evidence: this focused capture must not retroactively
assert focus or raster verification for other themes/states. At that increment,
consolidated action-boundary integration remained required; the subsequent
integration is recorded above. No fixture, renderer, plugin, browser reference, live matrix collector,
visual threshold or configured matrix state changed in this increment.

## Complete corrected-capture input analysis (2026-09-12)

The complete 436-static / 1,875-interaction report was independently reloaded
and analyzed at `5bdf7b7`; the prior diagnostic process handle was missing, so
analysis was rerun against the preserved bytes, not recaptured or resumed from
an assumed live process. Full visual report SHA-256:

`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

Using the current-ancestry normal-line-box and supplemental roots, the analysis
contains **4,648 side/case records**, **2,147 tree variants**, zero tree errors,
zero missing-tree, resolved-stage, state-stage or reference-context gaps, and
zero missing measured element mappings. It retains **8,140** unique style
differences / **380,520** occurrences, **88** structural differences and all
**93** source findings. There are still **3,309 unresolved style attributions**;
a syntactically assigned classification is not a root-cause explanation.

Diagnostic `validateMaterialInputAudit(audit, { requireComplete: false })`
returns no errors. Strict validation correctly rejects completion with:

- 3,309 resolved-style differences lacking root-cause attribution;
- 833 control texture typography differences requiring attribution;
- 3,214 retained typography mappings or stage fields requiring review;
- 352 retained typography differences requiring attribution.

These are full-matrix results, superseding static-only gap counts for planning.
The input audit remains incomplete despite the completed green visual matrix.

## Chip host-border differences now retain per-case outline ownership (2026-09-12)

The source finding from `ab333d3` now has a guarded `chipOutlineInputs`
inventory and independently replayed scalar attribution. This preserves the
actual reference **host** colors/styles/widths and stores the descendant
action-button pseudo outline separately. In particular, reference pseudo
RGB 123,117,127 or 73,69,78 is never substituted for the host's inherited
border color to make a comparison look closer.

Proof requires unique shared IDs and node keys, current complete side-correct
core inspection, a real parent chain from action to host, consistent selected
state, the exact active serialized generated-box/token rules and their expanded
declarations, separate outline styles, and candidate base/selection border
rules. Every other candidate border/reset/animation rule is checked; unknown
selectors or nested declarations prevent attribution. The finite descendant
exclusion only establishes that a terminal `th`/`td` (or other unequal type)
cannot target a `div`; it does not infer ancestor matches or emulate cascade.
The exact Material 1ms duration declarations do not author border values;
other animation or transition declarations remain disqualifying.

Reference measurement snapshots and all three candidate core stages are
checked independently of full-tree collection. Selected zero-width sides do
not waive their unequal style/color inputs. Each grouped signature keeps
**every** reviewed case key, not merely the twelve display samples. Validation
rebuilds the owner/state proof inventory and rejects changed owners, values,
selection state, classifications, absent properties and missing occurrences.

Replay of all 436 static cases plus all **64 chip interaction cases** yields
**152** paired chip proofs, **32** grouped border signatures and **1,344**
attributed property occurrences with all 1,344 reviewed keys retained.
Diagnostic validation reports zero errors. The width differences cover
24 unselected chip-0 and eight unselected chip-1 observations; style and
host-color differences remain attributed in both selection states. These
are unequal authored inputs, not accepted equivalence or confirmed core
rendering defects. No other chip property is cleared by this proof.

The static-only replay attributes **24** signatures / **192** occurrences
from 24 paired hosts. Unresolved static style signatures fall from 2,655 to
**2,631**, and unresolved static border-color signatures from 142 to **126**.
This diagnostic replay also has zero validation errors; it is not acceptance
of the remaining unclassified inputs.

Focused verification:

`node --test --test-name-pattern='chip outline attribution|chip outline evidence' tests/material-parity/input-equivalence-audit.spec.mjs`

Result: **3/3 pass**, zero failed/skipped tests, **10.655 seconds**. The tests
cover both selection states, distinct host/pseudo colors, **42** incomplete,
conflicting or mismapped capture mutations, **nine** altered-report rejection
checks, fourteen-state review retention and raw-input preservation.
Full `npm run parity:harness:check`: **340/340 pass**, zero failed, skipped,
cancelled or todo tests, **135.391 seconds**.

The implementation plan now explicitly orders original chip outline/state
ownership ahead of equal-input generated-box investigation. No reference,
fixture, plugin, renderer or live-capture module was changed.

The corrected full capture completed successfully with the original enforced
command and checkpoint recovery (`node tests/material-parity/run-material-parity.mjs
--enforce --skip-build --resume`, same browser-root/artifact paths, port 4431,
no family/profile/viewport/state filters and browser restart interval 200).
The transient page/screenshot timeouts recorded below remain in the history;
their cases were rerun, not omitted. Final results:

- Static: **436/436 pass**; minimum/median SSIM **0.965296 / 0.996382**;
  maximum edge error **0.984px**; text alignment **428/428**, maximum error
  **0.722px**; uniform backgrounds **24/24**; focused rasters **120/120**;
  shadow profiles **12/12**.
- Interaction: **1,875/1,875 pass**; minimum SSIM **0.954514**;
  text alignment **2,116/2,116**, maximum error **0.722px**;
  focused rasters **880/880**.

Both enforced acceptance summaries are true. This closes the corrected
visual-capture requirement, not the input-equivalence audit. Remaining
authorship, structural, typography and private-paint findings must still be
fully attributed and the final machine/human reports checked in.

## Chip outline ownership changes the input box model (2026-09-12)

The full configured chip subset contains **76 cases / 152 chip hosts**: twelve
static and sixty-four interaction cases across all four profiles, configured
viewports, DPRs and eight interaction state labels. The read-only producer
`scripts/audit-material-chip-inputs.mjs` requires every configured chip case
from the selected checkpoint manifest, verifies result and full-tree digests,
and records the distinct reference host, descendant action button and its
generated `::before` outline. Candidate authored rules and all three current
core style stages remain separate evidence. It neither changes a surface nor
turns this ownership difference into an equivalent-value alias.

Command:

`node scripts/audit-material-chip-inputs.mjs artifacts/material-parity/current-ancestry-audit/checkpoint artifacts/material-parity/chip-outline-current-ancestry-audit-v2.json`

The resulting report SHA-256 is
`8fff4be83c2e3138155c484e1ea3649f4fbcfec3c2c374aeaab4688948c16d83`.
The first diagnostic report is preserved; v2 additionally asserts the exact
candidate base border declaration and all four zero-width reference host
borders. Both cover the same unchanged 152 observations.

Every reference host has a zero-width border. Its action button's generated
outline is absolutely positioned, border-box sized and pointer-events:none.
For **32 unselected observations**, that outline is 1px while the candidate
authors 1px on the **host**. For **120 selected observations**, both reported
widths are zero, but their ownership and authored rules remain different.
The candidate retains `#79747e` across normal/effective/interaction stages.
Reference pseudo border color is RGB **123,117,127** in 112 observations and
**73,69,78** in forty. The latter uses the focus-outline token rule, including
focus retained after activation; it is not a theme-name inference.
The original expressions are preserved:

- `var(--mat-chip-outline-color, var(--mat-sys-outline))`
- `var(--mat-chip-focus-outline-color, var(--mat-sys-on-surface-variant))`

History shows that initial showcase commit `2f44011` already put the border
and palette literal on `.chip`. This finding does not establish that a later
renderer regression caused that choice. The separately recorded measured
selected/unselected widths remain a distinct compensation.

A browser-only reduction at **DPR 1 and 2**, in both selected states, holds
the outer box at **100x32 CSS px**. Moving a 1px pseudo outline onto the
border-box host changes the content width from **76 to 74px** and its x
position by **1px**. At zero border width both controls retain 76px content.
The actual capture helper must preserve the pseudo styles/rules separately
from the host in every control. This proves unequal box-model inputs, not an
equal-input Astylar defect or final chip raster equivalence.

Focused command:

`node --test --test-name-pattern='browser pseudo outline|records source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`

Result: **2/2 pass**, zero skipped/failing tests, **2.551 seconds**.
Full `npm run parity:harness:check`: **337/337 pass**, zero failed, skipped,
cancelled or todo tests, **115.519 seconds**. Replay of all 436 static cases
with the current bound supplements retains zero diagnostic validation errors,
**93** detected source findings and **2,655** unresolved style signatures.
Those unresolved signatures are not silently waived by the new source finding.

Implementation order: restore the original outline owner, token and state
inputs together with the chip action/label structure before investigating
remaining core differences. If generated-box rendering is unsupported or
wrong, reduce that exact CSS input at the core boundary; do not move the
border onto the host, subtract padding, shift the label or tune fixed widths
to make the same screenshot. The source finding is now tracked separately;
per-case scalar border signatures are not automatically reclassified by this
structural evidence.

The resumed full browser run passed the previous snack-bar dark timeout case,
then stopped later during a contrast `activate-leave` screenshot with a
30-second screenshot timeout after fonts had loaded. This remains incomplete
capture evidence; no case or threshold was removed. Resume only after
verifying the checkpoint and preserving the same served build/imports.

## Outline-token findings now have per-case declaration proofs (2026-09-12)

The source findings from `d27400c` are now connected to captured cases through
`outlineTokenInputs`, without changing either surface. The collector requires
unique shared-ID/type correspondence, complete side-correct rule collections,
current core inspection provenance and revision, and the exact active
serialized token declaration. Pending empty color longhands must accompany
that declaration; they cannot stand in for it. Native outlined buttons also
require the independently reviewed reset and important no-animation rules.

The complete candidate author-rule collection must contain the expected
literal and no other possibly applicable color/reset input. Unknown selectors,
nested declarations, state/media conflicts, inline colors, missing styles and
duplicate mappings reject attribution. Reference and all three candidate
style stages must show the relevant 1px solid sides, with reference token
color versus the retained literal. The shared-ID measurement snapshot is
checked separately against the full-tree declaration witness. The second
toggle remains explicitly limited to `borderLeftColor`; its other sides are
not silently assigned the same cause.

Each report entry keeps its source finding, exact reference rule and candidate
literal, raw rule indices, excluded candidate-rule indices, resolved revision,
proved properties and all reviewed case keys. Independent validation rebuilds
the proof inventory and verifies each occurrence, including cases beyond the
twelve display samples. The classification is an authoring defect with
`inputEquivalent:false` and `finalRasterVerified:false`, never a near-color
alias or equal-input renderer-paint verdict.

Replay of all **436 corrected static cases**, with their selected current-run
normal-line-box and behavior/overlay/slider supplements, proves **36** node
observations and attributes **nine** color signatures / **108** occurrences:
four sides each on the outlined button and toggle group, and the second
toggle's left divider. Unresolved static border-color signatures fall from
151 to **142**; all unresolved static signatures fall from 2,664 to **2,655**.
Diagnostic validation reports zero errors. Existing ordinary-default and
button-reset findings remain distinct.

Replaying the same complete static set plus the **104 captured button and
button-toggle interaction cases** yields **196** paired node proofs and
**580** attributed color occurrences, with all 580 reviewed case keys retained
and zero diagnostic validation errors. Each outlined-button side has 60
occurrences; each group side and the second option's left divider has 68.
Covered case labels include hover, held, focus, activate, activate-leave,
disabled and selected where configured. A case label does not imply every
mapped target itself is disabled or selected: the exact matched declarations
and styles decide attribution. This remains a selected-family diagnostic,
not acceptance of the unfinished full interaction matrix. The first
two-family-only replay rejected the full static natural-line-box supplement
because its other case mappings were absent; retaining all 436 static cases
preserves that binding without relaxing validation.

Focused verification:

- `node --test --test-name-pattern='outline token attribution|outline token evidence' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **4/4 pass**, 19.468 seconds. This covers all three target shapes,
  **36** conflicting/incomplete capture mutations, **12** altered-report
  rejection checks, fourteen reviewed states with twelve displayed samples,
  and preservation of raw input data.
- `npm run parity:harness:check` — **336/336 pass**, zero failures, skipped,
  cancelled or todo tests, 264.185 seconds.

The full browser run subsequently stopped at the snack-bar dark interaction
sequence with a 30-second `.frame` visibility timeout in `openInteractionPage`.
It left **436 static and 1,747 interaction checkpoints**; independent checking
found zero result-hash mismatches and zero changes to the ten frozen capture
imports. This is an incomplete run, not accepted parity. Preserve its evidence
and resume through the checkpoint mechanism without changing thresholds,
skipping the timed-out case or replacing the served build.

No production code, plugin, fixture, reference or live capture module was
modified. Other border sides, typography, geometry, actual border raster and
the remaining input differences are still separate audit obligations.

## Explicit Material outline tokens are replaced by a palette literal (2026-09-12)

Read-only inspection separates three explicit authoring mismatches from the
previously proved core border defaults, currentColor and alpha defects:

| Target | Original reference input | Candidate input | First source evidence |
| --- | --- | --- | --- |
| `button-secondary` | `border-color:var(--mat-button-outlined-outline-color, var(--mat-sys-outline))` | `.outlined` supplies `borderColor:'#79747e'` | `2f44011` |
| `button-toggle-primary` | `border:solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline))` | Group rule supplies a solid 1px border with `#79747e` | `c47d589` |
| `button-toggle-two` | `border-left:solid 1px var(--mat-button-toggle-divider-color, var(--mat-sys-outline))` | Second option supplies four-side `#79747e` with widths `0 0 0 1px` | `c47d589` |

`git show` confirms these declarations at the named commits; it does not prove
the author's intention was to compensate for a renderer defect. The findings
are classified as `application-plugin-authoring-defect`, with separate source
IDs for the three rules. The second option's top/right/bottom initial colors
are **not** attributed to its left-divider token.

The new `scripts/audit-material-outline-inputs.mjs` opens the unchanged,
checkpoint-bound browser application at 1440×900 CSS pixels, DPR 1, for light,
dark, contrast and custom profiles. It captures eight paired pages / twelve
target observations, their active CSSOM rule and serialized shorthand,
computed component/fallback tokens and color scheme, exact computed border
color/width/style, complete input trees, current core normal/effective/
interaction styles, runtime assets and source/checkpoint digests. No reference,
fixture, plugin, production renderer or live full-matrix collector is changed.

All twelve observations show:

- The component-specific outline/divider token is absent. Its actual inherited
  fallback is `light-dark(#7b757f, #958e99)`, not a guessed literal.
- The browser reports `color-scheme:normal`, no dark preference, and computes
  RGB **123,117,127** for the relevant 1px solid border in **every** named
  profile, including the profile called dark. The reference theme supplies
  selected custom properties but does not make its name a color-scheme input.
  This audit does not change that reference behavior.
- Candidate author rules and all three inspected core style stages retain
  `#79747e`, RGB **121,116,126**. The unequal inputs already explain the color
  discrepancy before paint; this is not evidence of a core parsing defect.
- The group selector also occurs inside an inactive forced-colors rule with
  `outline:0px`. That rule is preserved with its condition and activity rather
  than confused with the active border declaration.

The successful report is
`artifacts/material-parity/outline-input-current-ancestry-audit-v3/latest-report.json`,
SHA-256 `2ae7edc1d6107be6526dcd9c9ee2296d5c5ebc210d329b4c42a6ffdcf7cc4237`.
Independent `validateSupplementalCapture` replay reports `checkpoint-bound`
with zero errors. All sixteen tree digests and served runtime assets match
the selected run. An additional replay matches all twelve reported observations
against those trees, including side-specific border values, candidate rules
and all three style stages. Runtime errors are empty. Earlier diagnostic
attempts remain separate: the first correctly rejected an assumed hex token;
the second rejected an assumed unique selector before accounting for the
inactive forced-colors rule. Neither incomplete attempt is acceptance evidence.

The CSSOM capture has an important interpretation boundary: a shorthand
containing `var()` can retain its authored expression in `cssText` while its
expanded color fields serialize as empty strings. The existing collector
already preserves both. Empty expanded values must **not** be called omitted
author inputs. Eighteen blank-document browser controls now exercise all three
shorthand forms with light/dark schemes and fallback/override/literal variants.
Computed borders follow the inherited token or override; the literal remains
unchanged. The full-tree recorder preserves the exact serialized rule and
computed value. This is browser input/capture evidence, not a new JS cascade,
core variable-support claim or final-raster proof.

The implementation plan restores the reference token and side-specific border
intent through the shared CSS/theme path. It must not sample RGB 123,117,127
into the fixture, change the reference theme to fit its profile name, replace
the border with plugin paint, or consider near colors equivalent. Actual border
raster, shape, disabled/hover/held states and the full per-case classification
remain separate work. This increment adds source findings and focused evidence;
it does not prematurely reclassify the full matrix from twelve observations.

Verification:

- `node scripts/audit-material-outline-inputs.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/outline-input-current-ancestry-audit-v3`
  — passes all twelve paired observations on Chrome 152.0.7977.76, with the
  corrected running consumer unchanged.
- `node --test --test-name-pattern='browser outline token|source audit has|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **3/3 pass**, 4.251 seconds, including all eighteen browser controls and
  exact presence/classification checks for the three new source findings.
- Diagnostic replay of all **436** corrected static cases with the selected
  current-run normal-line-box and behavior/overlay/slider supplements finds
  **92** source findings, none undetected, and zero diagnostic validation
  errors. The **2,664** unresolved per-case signatures remain explicit; this
  source-evidence increment does not count them as automatically resolved.
- `npm run parity:harness:check` — **332/332 pass**, zero failures, skips or
  cancellations, 267.082 seconds. The full scoped diff and new producer were
  reviewed; `git diff --check` passes. This verifies audit infrastructure, not
  completion of the Material rendering matrix or the input-equivalence audit.
- Full-capture integrity at **436 static / 1,567 interaction** checkpoint
  records: all result digests validate and all ten launch-fingerprinted live
  harness modules are unchanged. The still-running capture is not represented
  as complete acceptance.

## Material button border resets are not width-only declarations (2026-09-12)

The remaining border-color cases were partitioned by actual node type and
matched declarations before extending attribution. Native Material buttons
have a different cause from the omitted ordinary-element defaults below:
their captured `.mdc-button` rule explicitly resets all four sides to
`medium none currentColor`. Candidate `.material-button`, `.text-button` and
`.toolbar-action` rules instead supply `borderWidth:'0'` and omit border color
and the full reset. All three width-only declarations are present in initial
showcase commit `2f44011` and remain in current source. This establishes an
incomplete translation, not an inference about the original author's intent.

[CSS Backgrounds 3 §3.4](https://www.w3.org/TR/2024/CRD-css-backgrounds-3-20240311/#border-shorthands)
defines the reset semantics. A new browser test in
`tests/material-parity/input-equivalence-audit.spec.mjs` independently checks
twelve controls: two element colors, `div` and native `button`, and full reset,
width-only, and explicit equivalent longhands. Starting from a colored solid
border, both reset variants compute zero used widths, none styles and the
element's current color. Width-only also computes zero width but retains the
previous solid style and RGB 171,205,239 border color. CSSOM exposes the reset's
authored medium/none/currentcolor longhands. Equal zero widths are therefore
not proof of equal border input. This is a browser input-semantics proof, not
an equal-input core or final-raster pass.

Capture-backed button attribution requires:

- Unique native-button/core-button correspondence and the exact four-side
  reference reset; it does not guess native UA colors.
- Actual matched important `animation-name:none` and
  `transition-property:none` declarations from the benchmark's Material
  no-animation rule. Conflicting important motion rules reject attribution.
- A matching captured width-only Material button rule, no possibly applicable
  candidate color/reset declaration anywhere in its complete rule collection,
  and no inline color/reset. Unknown selectors remain unproved.
- Side-correct pooled evidence, current core inspection revision, all three
  normal/effective/interaction style stages, and matching shared-ID snapshots.
  All sides must retain zero width and none style; candidate colors must remain
  transparent and reference colors must equal the reference element color.

The report records this as `application-plugin-authoring-defect`, linked to
`fixture-button-border-reset-reduced-to-width`. It retains the explicit
reference reset witness separately from the ordinary default-omission proof,
and keeps `inputEquivalent:false` and `finalRasterVerified:false`. Restoring
the same color/reset intent depends on addressing the separately proved core
currentColor capability gap; sampling literal colors into the fixture is not
the proposed solution. Typography, disabled-color preblending and border paint
remain separate findings.

Diagnostic replay of the **436 corrected static cases**, with the current-run
normal-line-box and supplemental reports, adds **88** attributed border-color
signatures / **480** occurrences across **nine** families: bottom-sheet, button,
card, core, dialog, menu, snack-bar, toolbar and tooltip. The full-tree evidence
contains **120** qualifying paired button observations, including supplemental
nodes. The previous **276** default-divergence signatures are unchanged.
Unresolved border-color signatures fall from 239 to **151**; all unresolved
static signatures fall from 2,752 to **2,664**. There are **89** source findings,
none undetected, and zero diagnostic validation errors. No complete-audit
acceptance or renderer repair is claimed.

The new proof shares only conservative exclusion and mapped-stage checks with
the previous collector. Tests distinguish the explicit reset from omission,
reject conflicting/reset/animation rules, missing capture stages, changed node
types and contradictory snapshots, and replay every attributed case and raw
declaration witness. The implementation plan now places restoration of button
reset intent after core contextual-color correction, not after a screenshot
calibration pass. No production source, plugin, fixture or live capture module
was modified.

Verification for this increment:

- `node --test --test-name-pattern='browser border reset|button border-reset|border initial-color|source audit has|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **10/10 pass**, 22.295 seconds, including all twelve browser controls and
  twenty capture-rejection mutations. The previous default attribution guards
  continue to pass after sharing the conservative rule-exclusion code.
- `npm run parity:harness:check` — **331/331 pass**, zero failures, skips or
  cancellations, 194.338 seconds. This includes the final implementation-plan
  update. Scoped diff review and `git diff --check` pass.
- Static replay uses `buildMaterialInputAudit` with all 436 static checkpoint
  results and their launch provenance, plus the explicitly selected
  `normal-line-box-current-ancestry-audit/latest-report.json` and
  `supplemental-current-ancestry-audit`. Validation with
  `requireComplete:false` has zero errors; this is diagnostic only.
- Live-matrix integrity checkpoint: **436 static / 1,324 interaction records**,
  all ten loaded capture-harness hashes unchanged and every result digest
  valid. The same live process advanced through timepicker into button; it was
  not restarted or pointed at a different build.

## Captured border initial-color attribution, without an equivalence waiver (2026-09-12)

The existing public-package border proof is now connected to individual
captured showcase inputs through
`tests/material-parity/border-initial-input-evidence.mjs`. This changes audit
reporting only: no renderer, plugin, fixture, reference, threshold or live
capture implementation was edited.

An important evidence boundary was checked first:
`elementAuthoredStyles` in `astylar.component.ts` matches selectors against the
semantic DOM, translating authored IDs to `data-astylar-id`. An empty result
from that helper is not sufficient evidence of an omitted declaration in the
authored Astylar tree. The new proof examines **all captured candidate rules**,
not just those returned by semantic-DOM matching. It does not introduce a
second cascade or compute winning declarations. It only excludes a rule when
its unescaped compound type/ID/class selector demonstrably cannot apply.
State suffixes are treated as potentially active; media conditions are not
used to discard rules. Unsupported selector syntax, nested declarations,
possibly applicable color/reset rules, animation/transition declarations,
vendor border-color aliases and missing capture provenance prevent attribution.

Each proof requires unique reference/candidate IDs, an ordinary core candidate
type, current core inspection provenance and revision, all three normal/
effective/interaction style stages, explicit reference rule/inline evidence,
and side-correct pooled values. Native browser controls, SVG and private plugin
nodes are not inferred to share ordinary border defaults. The reference must
compute all four border colors to its computed element color while its captured
matched/inline declarations omit border color and resets. The candidate must
omit those declarations in inline and every potentially applicable authored
rule, while all three stages resolve transparent. Contradictory shared-ID
snapshots also prevent scalar attribution.

Classification remains **intentional documented limitation**, tied to
`core-border-initial-color-differs-from-css`, with `inputEquivalent:false` and
`finalRasterVerified:false`. Documented does not mean accepted CSS parity:
core's transparent default still differs from CSS currentColor. Zero-width
borders are not waived, and the separate currentColor and alpha-paint failures
remain open. Different element structure, dimensions and final paint receive
no equivalence claim from this property-specific evidence.

Replaying all **436 corrected static cases** with their fresh normal-line-box
and supplemental evidence yields:

- **620** qualifying full-tree paired node observations, including supplemental
  and unmeasured nodes. This is not the number of classified scalar differences.
- **276** newly attributed static difference signatures, **1,760** occurrences,
  across **24** component families.
- Border-color signatures still unresolved: **239** (previously 515).
- All unresolved static signatures: **2,752** (previously 3,028).
- Diagnostic `validateMaterialInputAudit(..., {requireComplete:false})`:
  zero errors; this is not complete-matrix or input-equivalence acceptance.

Each grouped classification retains every reviewed case key, independently of
the 12-case display sample. Validation replays the proof from the captured
inventory, rejects altered pooled sides/declarations/provenance, and checks
every claimed occurrence. Tests retain missing rules, matching inactive rules,
unknown selectors, resets, native controls, duplicate IDs, missing stages and
contradictory snapshots as unproved. A 14-state control verifies that evidence
is not silently truncated to the display sample.

The active unfiltered matrix was revalidated through its live process handle;
at the integrity checkpoint it had **436 static / 1,189 interaction records**.
All ten loaded capture-harness file hashes still matched the launch manifest,
and every recorded result digest matched. The process subsequently advanced
through datepicker into timepicker. It remains running; its final report and
full acceptance are not claimed by this increment.

Verification for this increment:

- `npm run parity:harness:check` — **327/327 pass**, zero failures, skips or
  cancellations; 178.268 seconds.
- `node --test --test-name-pattern='border initial-color|border proof|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`
  — final **6/6 pass**, 17.955 seconds, after adding vendor-alias and
  animation/transition guards. The first focused run exposed a test assumption
  that ignored automatically loaded supplemental cases; the test now selects
  its own mapped node. No production behavior was changed to satisfy it.
- The final static replay uses `buildMaterialInputAudit` with all 436 static
  checkpoint results and the launch manifest's provenance, explicitly selecting
  `normal-line-box-current-ancestry-audit/latest-report.json` and
  `supplemental-current-ancestry-audit`. Counts above are unchanged after the
  final guards; diagnostic validation has zero errors.
- Scoped diff review and `git diff --check` pass. The generated final machine
  report is still deferred until complete current-run evidence and remaining
  classifications are available; stale untracked reports are not committed.

## Border colors: documented default divergence and two independent core paint gaps (2026-09-12)

`examples/material-showcase/src/app/border-color-input-audit.spec.ts` adds ten
public-package browser reductions. The same declaration map creates CSS inside
an isolated iframe and Astylar `SiteData`; there is no Material plugin, text,
icon, transform, calibration offset or alternate fixture structure. Each mount
has a 200x120 CSS viewport and a 120x60 border-box with a 4px solid border.
Two distinct colors (`#123456` and `#c04a20`) guard against a coincidental fixed
fallback matching the expected color. Original authored input, normal/effective
styles, actual bound border material, framebuffer bytes, and final zero owned
resources are checked separately.

Observed results for **each** color:

| Authored border color | Browser used color/alpha | Core resolved input | Bound material / framebuffer | Result |
| --- | --- | --- | --- | --- |
| omitted | element color / 1 | `transparent` | black / 1; 1,376 black pixels | fail |
| explicit matching hex | element color / 1 | original hex | matching RGB / 1; 1,376 matching pixels | pass |
| `currentColor` | element color / 1 | `currentColor` | RGB 51,51,77 / 1; 1,376 fallback pixels | fail |
| `transparent` | transparent / 0 | `transparent` | black / 1; 1,376 black pixels | fail |
| `rgba(...,0.5)` | element RGB / 0.5 | original RGBA | element RGB / 1; 1,376 opaque pixels, zero expected half-alpha composite pixels | fail |

These are distinct causal findings:

1. **Documented initial-value difference, not equivalence.**
   [CSS Backgrounds 3 §3.1](https://www.w3.org/TR/2024/CRD-css-backgrounds-3-20240311/#border-color)
   specifies `currentColor`. `src/app/config/browser-defaults.ts` instead sets
   `globalDefaultStyle.borderColor` to `transparent`, and the compatibility
   catalog's `paint` entry documents that default. Commit `2c16e14` extracted an
   already-existing value from `StyleDefaultsService`; it did not establish a
   new Material-specific workaround. Record this as an intentional documented
   limitation that must be reconciled with the requested CSS contract, not as a
   harmless serialization alias. A zero-width border does not erase its input.
2. **Confirmed core alpha-paint defect.**
   `ElementBorderService.parseBorderProperties` initializes black, passes the
   border string to `StyleService.parseBackgroundColor`, and retains only RGB.
   `transparent` returns null; RGBA returns alpha which is then discarded.
   `ElementCreationService` creates the border material and sets alpha solely
   from element opacity. Consequently even explicit, correctly resolved
   transparent/half-alpha inputs paint incorrectly. History `36f44de` already
   retained only RGB; `a83ead8` assigns material alpha from element opacity.
3. **Confirmed contextual-color capability gap.**
   `currentColor` survives style inspection, but the background parser receives
   no element color and uses its unrecognized-value fallback `(0.2,0.2,0.3)`.
   Both authored colors therefore paint the same fallback. The catalog does not
   explicitly promise `currentColor`, so this is not evidence of previously
   complete CSS-color support. It identifies a core-owned resolution gap; a
   plugin or fixture should not replace the keyword with a sampled literal.

The existing `border-box-basic` fixture explicitly supplies `#7c3aed`; its green
result cannot verify omission, contextual color or alpha. The new controls show
the same distinction without modifying that fixture. Framebuffer counts prove
the observed material color reaches the canvas, but do not establish paired
screen-raster geometry, clipping, border-radius or compositing conformance.
Transparent paint may legitimately omit its meshes; the proof does not require
otherwise or constrain invisible RGB channels.

The machine audit now records these three source findings, the public proof,
source fingerprints and a root-cause plan. It does **not** automatically assign
them to every Material border discrepancy. A harness control preserves all four
unresolved color longhands even when border widths are zero. Per-case attribution
still needs the actual authored and resolved witnesses; the broader 3,028
unresolved static signatures are not declared resolved by this proof.

Verification:

- Public proof command:
  `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/border-color-input-audit.spec.ts`
  — both browser runs: **2 pass / 8 retained failures**, Chrome Headless
  152.0.0.0, DPR 1, Angular 20.3.29, Babylon 8.56.2 WebGL2, AstylarUI 0.2.0.
  The first compile exposed a test-only literal-type inference error, corrected
  before browser execution. The existing Zone.js/zoneless warning remains;
  no surface error diagnostics or resource-disposal failures occurred. The
  final run permits omitted paint meshes for fully transparent borders and
  does not constrain their invisible RGB; all ten captured observations remain
  identical to the first run. Final browser execution: 2.234 seconds.
- `npm --prefix examples/material-showcase run build -- --output-path=dist/material-border-color-input-audit`
  — browser/server build and two prerendered routes pass, 108.446 seconds.
  This isolated output does not overwrite the active full-matrix build.
- `node --test --test-name-pattern='border proof|source audit has|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`
  — **3/3 pass**. All three new live source findings and their proof/fingerprint
  entries are present; scalar border differences remain unwaived.
- `npm run parity:harness:check` — **323/323 pass**, zero failures, skips or
  cancellations, 258.371 seconds. The three focused harness tests were repeated
  after the final plan edit and pass. `git diff --check` passes.
- Rebuilding the 436 corrected static cases with their fresh supplements yields
  **88 source findings**, zero undetected sources, and zero validation errors
  with `requireComplete:false` (diagnostic only). Still unresolved: **3,028**
  style signatures, including **515 border-color signatures / 3,312 occurrences
  across 36 families**. These counts are coverage leads, not blanket attribution.
- Live full-capture integrity at this checkpoint: **436 static / 1,059 interaction
  records**, all record SHA-256 values valid; all ten frozen harness file hashes
  match the current files. The full capture is not finished.

Installed evidence hashes (SHA-256, paths relative to
`examples/material-showcase/node_modules/astylarui/dist/lib/`):

- `app/config/browser-defaults.js`: `5a0f4ced0db345b5a26b3b8606d5198c3462dfcfbd3ed842105d697bfde8530b`
- `app/services/dom/elements/element-border.service.js`: `6fe2b92397efb7268932195f2100c91c56daf8b473a0c95338a0516033803a15`
- `app/services/dom/elements/element-creation.service.js`: `68e45ca7b851ddeac40f6f55d3e2f176768b47dd6ad8e0d8eefa5c2a77d28ef3`

No renderer, plugin, reference, showcase fixture or dependency was changed.
Next: complete capture-backed border attribution, then continue the remaining
style/structure inventory and final full-matrix validation. Any implementation
must address contextual color, alpha and state/update paint at their core owners
before removing compensations; it must not retune fixture colors or border meshes.

## Paired visible overflow is a proven initial input, not a clipping waiver (2026-09-12)

The broader corrected static audit initially contained 3,174 unresolved shared-ID
style signatures. One recurring pair was reference `overflow-x: visible` /
`overflow-y: visible` against omitted candidate declarations. This is now a
narrow, evidence-backed representation classification, not a fixture adjustment.

The [CSS Overflow 3 initial-value contract](https://www.w3.org/TR/2025/WD-css-overflow-3-20251007/#overflow-properties)
specifies non-inherited `visible` axes. Current core `browser-defaults.ts` omits
overflow for the eleven ordinary element types admitted by the review.
`OverflowClipService.apply` exits before geometry/projection for both omission
and `visible`; `AstylarScrollRuntime.reconcile` registers neither a clip entry nor
a scroll container for either. No production code was changed.

Evidence and exclusions:

- Nine browser observations compare omission, visible, hidden, clip, auto,
  scroll, two mixed-axis cases and ancestor clipping. Omission and visible agree
  in computed axes, outside-box hit testing and zero programmatic scroll. A
  visible axis beside hidden computes auto, so a one-axis initial-value waiver
  would be unsafe. Visible children can still be clipped by their ancestors.
- Core focused tests exercise omitted/visible clipping without projection and
  scroll registration/consumption with auto/scroll sensitivity controls. These
  are owner-boundary NullEngine tests, not WebGL raster equivalence claims.
- Classification requires unique paired node identity, an ordinary candidate
  type, both reference axes explicitly captured as visible, trusted core-style
  inspection/revision, and all three candidate snapshots. Candidate overflow
  longhands, logical overflow declarations, resets, inline overrides, missing
  stages, controls, plugin nodes and reference viewport nodes are not accepted.
  Missing matching-rule evidence or any captured authored overflow/reset rule
  also rejects classification, so a dropped declaration cannot pass as a default.
  The shared-ID snapshots must independently agree with the full-tree evidence.
- The report retains the original raw styles and an independently replayable
  `visibleOverflowInputs` inventory. Deleting, duplicating or altering the review
  inventory, or forging the corresponding classification, fails validation.
  This does not accept different layout, clipping ancestors, scroll reachability,
  scrollbar behavior or final pixels.

Verification so far:

- Focused audit/browser command:
  `node --test --test-name-pattern='visible overflow|browser omitted overflow|source fingerprints|normalizations' tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/input-tree-evidence.spec.mjs`
  — 5/5 pass. Includes two state-positive cases, 30 contradictory-input controls
  and ten report/inventory tamper controls.
- Core command:
  `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/services/dom/elements/overflow-clip.service.spec.ts --include=src/lib/astylar-scroll-runtime.spec.ts`
  — 19/19 pass in Chrome Headless 152.0.0.0. The root test installation is Angular
  20.0.6 / Babylon 8.15.1; it is distinct from the frozen showcase installation
  Angular 20.3.29 / Babylon 8.56.2. No dependency version was changed, and these
  unit results are not presented as a rebuilt showcase capture.
- Full harness command: `npm run parity:harness:check` — **322/322 pass**,
  zero failures/skips/cancellations, 138.934 seconds after the authored-rule
  rejection controls were added. `git diff --check` passes.
- Recollection of all 436 corrected static cases and their freshly bound
  supplements: **146 signatures / 1,784 occurrences across 36 families** receive
  this classification; **3,028 signatures remain unresolved**. The full-tree
  initial-value inventory has 1,085 qualifying node observations, including
  nodes not used by shared-ID style comparisons. Validation with
  `requireComplete:false` has zero errors; this is diagnostic, not acceptance.
- A separate scan of all 1,144 static shared-ID visible-axis/omitted-shorthand
  candidates found no captured matching authored rule with an overflow/reset
  declaration. The broader scan is not an equivalence claim for excluded nodes.

The complete enforced interaction capture remains live. The complete audit is
not finished, and hidden/auto overflow discrepancies remain open rather than
being normalized to the newly reviewed initial-value case.

Next shared-default lead: core `browser-defaults.ts` explicitly supplies
`borderColor: "transparent"`, while `ElementBorderService.parseBorderProperties`
reads that value rather than resolving a CSS current-color default. The many
zero-width border-color differences must not be waived merely because they
currently paint no border. A minimal equal-input visible-border proof is still
needed before classifying that separate root cause.

## Tab-panel correspondence identifies plugin-owned text, not missing core text (2026-09-12)

All 12 corrected static tab cases map the reference's ordinary content span
through its content/body/wrapper/group chain and active header's linked IDs to
the candidate custom `showcase.material:tab-panel`. Both candidate tab buttons,
the selected data value and the reference active panel must agree. The candidate
is childless and has no authored `textContent`, retained core text or core-control
texture entry. Its accessible label is recorded for identity only, never used
as proof that text was painted.

The resulting gap classification is `reviewed-plugin-tab-panel-text-substitution`.
It retains the complete mapped reference node styles/rules and candidate
authored data plus normal/effective styles. It does not invent inherited text
properties, convert backing-texture coordinates into CSS inputs, or manufacture
a core text record. Independent validation reconstructs every occurrence and
rejects deleted/duplicated findings and altered input or paint claims.
`currentPluginPaintCaptured`, `inputEquivalent` and `finalRasterVerified` are
explicitly false: source ownership and the separate bound-texture diagnostic
explain the path, but are not per-case live paint or final-raster evidence.

History confirms `7159b1d` introduced `MaterialTabPanelRenderer` with a private
DynamicTexture and font/baseline paint. `593f81b` added the custom-theme 22px
panel and -0.2 baseline-offset knob. Current static data uses font sizes
16/14.4/18.4 and heights 20/22px; the reference is an ordinary CSS text span.
The earlier bound-texture characterization proves that changing CSS size/ink
does not control the plugin's font/ink, while changing its data does. The
existing implementation plan therefore keeps transitions in the plugin but
returns text composition and typography to core, rather than calibrating this
private texture. Source detection now requires texture creation, font assignment
and fillText within the same class; a class name alone is insufficient.

- `node --test --test-name-pattern='plugin tab-panel|source audit|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  6/6 passing. Mapping controls cover both selected states and both panel-size
  variants, 24 contradictory-input controls and 12 report/inventory mutations;
  source detection additionally rejects four incomplete/foreign paint paths.
- `npm run parity:harness:check`: 318/318 passing, zero skipped/cancelled
  (176.721 seconds).
- Actual 12-case diagnostic report: 12 classifications, zero tree errors and
  zero validation errors with `requireComplete:false` (diagnostic only).
- Recollection of all 436 static cases has zero unresolved retained mappings
  and zero unresolved mapped retained-property differences. The 12 plugin
  records remain unequal-input findings, not accepted text-rendering parity.
  Raw control-text collection still has 120 normal-line-height differences
  before applying the separately captured natural-line-box evidence.
- A whole-static diagnostic build with the fresh natural-line-box report and
  freshly bound picker/overlay/slider supplements validates all 120 natural
  observations (zero missing/errors) and leaves no unresolved control-text
  differences. However, the broader shared-ID style stage still contains
  **3,174 unresolved signatures out of 7,026**, plus 44 structure differences.
  Its 68,928 style occurrences are not certified by closing the text mappings.
  `requireComplete:false` reports no instrumentation validation errors; full
  acceptance is not claimed. The remaining declaration, box/layout, paint and
  structure attribution is a separate substantial audit obligation.

No production renderer, plugin, comparison fixture or visual gate changed.
Full interaction, plugin current-paint and other input-category obligations
remain distinct from this completed mapping classification.

## Select arrow substitutes a tuned font glyph for the original SVG (2026-09-12)

All 12 corrected static select cases contain the same structural substitution:
the reference `mat-select#select-control` owns a trigger, arrow wrapper, arrow
container and 24px SVG with `viewBox="0 0 24 24"` and path
`M7 10l5 5 5-5z`. Candidate `span#select-caret.select-caret` instead contains
U+25BC (`▼`) with `role: presentation`, absolute positioning and a density-based
font size. These are different content/layout inputs, not a core text mapping
failure or evidence of a core SVG defect. SVG font properties are not compared
as if the original arrow were a text character.

History makes the progression explicit. `2f44011` initially used U+25BE (`▾`).
`3d0d5ce7` replaced it with U+25BC, changed top 20/16px to 18/14px, right 16px
to 15px, and font size 14px to 12px. `6647a875` subsequently changed compact
top 14px to 8px and compact font size 12px to 14px. The current declarations
remain at `astylar.component.ts:558`, with the glyph node at line 952.

The audit now retains a classified gap for each occurrence, including the
complete reference control-to-path chain, vector attributes, computed styles,
matched rules and inline declarations; candidate authored identity, owning
control ancestry, normal/effective/retained styles and the original glyph rule.
Independent validation reconstructs these records from captured inventory and
rejects deleted, duplicated or altered findings. Evidence snapshots do not
alias the inventory objects. The finding explicitly sets input equivalence and
final raster verification to false.

- `node --test --test-name-pattern='select arrow|source audit|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  5/5 passing, with two density variants, 21 contradictory-input controls and
  12 report/inventory-tampering controls.
- `npm run parity:harness:check`: final run 314/314 passing, zero
  skipped/cancelled (164.454 seconds), after evidence-snapshot hardening.
- Actual 12-case select diagnostic report: 12 arrow classifications, zero
  unresolved retained mappings and zero inventory/validation errors using
  `requireComplete:false` (not complete-audit acceptance).
- All 436 static captures: zero inventory errors, zero unresolved mapped
  retained-property differences and 12 remaining unresolved retained mappings,
  all tabs. The arrow findings remain in the report; nothing is excluded.
- At this checkpoint, 492 interaction records were present. Every recorded
  result hash verified; the full interaction process was still live. This is
  not a completed interaction audit or acceptance claim.

The implementation plan calls for restoring the original vector and wrapper
inputs, then reducing any unsupported rendering behavior to equal-input core
proof. Further glyph offsets, density corrections or font-size tuning would
preserve the wrong inputs. This increment changes audit code and documentation
only, not the fixture, reference, plugin or renderer.

## Expansion header size token is missing outside the compact override (2026-09-12)

All 12 corrected static expansion captures were reviewed. The three custom
viewport cases retain candidate 18.4px versus reference 16px. The reference
`mat-panel-title#expansion-title` inherits through `span.mat-content` from
the unique active `.mat-expansion-panel-header` rule:
`var(--mat-expansion-header-text-size, var(--mat-sys-title-medium-size))`.
All three reference nodes compute 16px with no intervening size declaration.
The entire candidate title/trigger/panel/section/page chain omits font-size
until `#page`, which explicitly supplies the same 18.4px retained by core.
This proves unequal inputs, not a renderer scaling failure.

The current general title rule at `astylar.component.ts:663` has no size;
the following branch supplies 16px only when density is at most -5. History
shows `25e1893` added that compact-only 16px while changing a translation from
-0.85px to -0.5px. Later commits changed the positional treatment; the current
compact-only condition remains. This audit neither restores those offsets nor
treats the branch as an equivalent translation of the general Material token.

Per-occurrence attribution keeps the exact reference chain and token,
candidate normal/effective ancestry and page rule, and retained size. Missing
or competing reference tokens, inline overrides, conditional rules, broken
ancestry, intervening candidate size declarations and inconsistent retained
values prevent attribution. Independent validation replays those inputs.

- `node --test --test-name-pattern='expansion font|source audit|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  5/5 passing, including two scaled-page controls, 25 contradictory-input
  controls and ten report-tampering controls.
- Actual 12-case diagnostic report: three classifications, zero unresolved
  retained-typography differences for expansion and zero validation errors
  with `requireComplete:false` (diagnostic only).
- Re-running retained-text collection over all 436 corrected static cases
  finds zero unresolved mapped-property differences and zero tree collection
  errors. There are still 24 unresolved text gaps: 12 select-caret and 12 tabs
  occurrences. This count does not cover other input categories or interactions.
- `npm run parity:harness:check`: 311/311 passing, zero skipped/cancelled
  (129.123 seconds). No production renderer or comparison input was changed.

The original component token and wrapper intent must be restored before
testing renderer scaling, glyph placement or paint. Selected/disabled/open
states, select-caret and tabs mappings, control-text stages, the full matrix
and final report still require completion; this subsection is not acceptance.

## Sort replaces inherited typography before rendering (2026-09-12)

The 12 corrected static sort cases expose nine retained-text input differences:
three contrast and three custom font sizes, plus three contrast colors.
Every reference ancestor from `.mat-sort-header-content` to the frame computes
the same relevant value, without an intervening override. The frame rule
authors `font-size: calc(16px * var(--scale))` and `color: rgb(29, 27, 32)`.
Reference sizes are 14.4px in contrast and 18.4px in custom. Candidate
`.sort-trigger` instead explicitly supplies 16px and contrast `#000000`.
Its text leaf omits these declarations, and core retains the parent values.
Missing leaf values remain omitted in the audit; they are not filled with
invented inherited resolved values.

History distinguishes the changes: `705cf58` ("match Material sort header")
introduced a separate fixed-size trigger at 17px. `5b74d1b` ("align plugin
indicator coordinates") changed the trigger to 16px. `994da86b` ("complete
shared control parity") explicitly replaced the contrast trigger/header
colors with black while retaining 16px.
Current source is `astylar.component.ts:710`. These are unequal fixture inputs,
not demonstrated core font-scaling or color-conversion defects. The correction
plan restores the reference inheritance mechanism, not sampled output sizes.

The classifier and independent report replay retain complete reference
ancestry, the original frame rule, candidate leaf/parent declarations, exact
mapping and retained values. Conditional or competing inputs, inline overrides,
broken ancestry and contradictory stage values prevent attribution.

- `node --test --test-name-pattern='sort typography|source audit|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  5/5 passing, including three positive combinations, 40 contradictory-input
  controls and 20 report-tampering controls.
- Actual 12-case diagnostic report: nine classifications, zero unresolved
  retained typography differences for sort and zero validation errors with
  `requireComplete:false` (diagnostic subset only).
- `npm run parity:harness:check`: 308/308 passing, zero skipped/cancelled
  (117.108 seconds). No renderer, fixture, reference or frozen capture import
  changed in this increment.

Expansion remains separate: the custom reference title inherits the 16px
`--mat-expansion-header-text-size`/`--mat-sys-title-medium-size` token from
its header. Candidate title/trigger/panel omit that size and reach the 18.4px
page declaration. Three static occurrences still need durable per-occurrence
attribution. Select-caret and tabs text mappings also remain open; no claim of
complete input coverage follows from the finished sort subset.

## Sidenav color tokens and refreshed natural-line-box evidence (2026-09-12)

All 12 corrected static sidenav captures (four profiles, three viewports)
contain two unequal color inputs each. The reference drawer text inherits
`var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant))`
from `.mat-drawer`, computing `rgb(73, 69, 78)`. Content inherits
`var(--mat-sidenav-content-text-color, var(--mat-sys-on-background))` from
`.mat-drawer-container`, computing `rgb(29, 27, 30)`. Neither text owner has
an intervening color declaration.

Candidate `.sidenav` and `.sidenav-content` directly supply literals via
`theme.onSurface` or dark-mode branches. The drawer is `#1d1b20` in nine
cases and `#49454f` in three dark cases; content is `#1d1b20` in all 12.
Normal, effective and retained stages agree. The exact RGB-channel
differences are retained, not normalized into equivalence. Both source
declarations at `astylar.component.ts:681–682` originate in `2f440115`, the
initial implementation: history does not establish a later compensating fix.
These are application-authoring mismatches, independently of the existing
sidenav padding and positioned-flow substitutions, not demonstrated core
color-conversion defects.

The new per-occurrence attribution preserves each reference token chain,
candidate parent/identity and declaration, and all observed stages. Independent
report validation replays the evidence. Missing/competing tokens, conditional
rules, inline colors, wrong identity, unknown matching candidate declarations,
or divergent normal/effective/retained colors prevent attribution.

Verification:

- `node --test --test-name-pattern='sidenav color|source audit|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  5/5 passing, including four positive input combinations, 50 contradictory-input
  controls and 22 report-tampering controls.
- The actual 12-case diagnostic report produces 24 classifications, zero
  unresolved retained-typography differences in this group and zero validation
  errors with `requireComplete:false`. This is not full-audit acceptance.
- `npm run parity:harness:check`: 305/305 passing, zero skipped/cancelled
  (125.187 seconds).
- Natural-line-box capture process completed with exit 0: 120 observations
  across 96 cases in `normal-line-box-current-ancestry-audit`. Independent
  `loadNormalLineBoxReport` validation against all 436 current static cases
  confirms zero missing observations, zero evidence errors, matching frozen
  checkpoint/build/source provenance, and observed natural height 17px for
  these specific labels. This does not authorize globally replacing `normal`
  with 17px or establish baseline/raster equivalence.
  Report SHA-256:
  `e1eb3f65f84a8f9e9e1cb3fafa35bfada72a111a453ce0439626a5ac24b24477`.

The full current-ancestry interaction capture remains running. No renderer,
comparison fixture, reference input, or frozen capture import changed here.

## Filled-label color inputs now have replayable attribution (2026-09-12)

The corrected capture contains all 72 static cases for form-field, input,
select, autocomplete, datepicker and timepicker. Their full-tree read has no
collection errors. There are 54 color differences: 12 each for autocomplete,
datepicker and timepicker, and six each for form-field, input and select.
Every one now has explicit authored-input attribution; zero field-color
differences remain unresolved in this static group. This does not establish
complete interaction coverage or eliminate other typography differences.

The reference `mat-label` has no intervening color declaration. Its native
floating-label parent owns the unique active, ordinary rule
`.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-floating-label`,
whose color is
`var(--mat-form-field-filled-label-text-color, var(--mat-sys-on-surface-variant))`.
These captures compute `rgb(73, 69, 78)` on both wrapper and label. Candidate
`.field-label`, `.field-label.empty-field-label`, and the two picker-shell
rules instead declare literals. History identifies `4d56f862` for the
base/empty colors, `f286fb17` for the timepicker rule and `d973f847` for the
datepicker rule. The live declarations are at `astylar.component.ts:547`,
`:548`, `:603`, and `:608`.

The audit retains the exact reference chain, candidate parent/classes, all four
candidate declarations in source order, matching declarations and selected
declaration, plus independent normal/effective/retained values. It accepts this
attribution only when all three candidate stages agree with the reviewed
selected literal. In particular, corrected dark picker captures now agree on
`#e6e1e5`; old inspection snapshots with normal `#1d1b20` and retained
`#e6e1e5` fail this attribution instead of being disguised as equivalent inputs.
The `#49454e` versus `#49454f` difference also remains a real input difference,
not a color tolerance or normalization.

Verification:

- `node --test --test-name-pattern='field color|source audit|source fingerprints' tests/material-parity/input-equivalence-audit.spec.mjs`:
  5/5 passing. Includes all six families with base/empty forms, 25 contradictory
  input controls, and 11 report-tampering controls. Missing/competing reference
  tokens, inline overrides, unknown selectors, media conditions, wrong parent
  identity, reordered candidate rules and stale stage values prevent attribution.
- Building and independently validating a diagnostic report from the 72 actual
  captured static cases yields all 54 classifications and zero validation
  errors with `requireComplete:false`. This flag is used only to review this
  bounded subset, never for full-audit acceptance.
- `npm run parity:harness:check`: 302/302 passing, zero skipped/cancelled
  (121.334 seconds). No production renderer, fixture, reference or live capture
  import was changed by this increment.

Implementation-plan item 5.28 restores the reference color token and state/
inheritance mechanism before testing remaining core color or paint behavior.
It does not recommend choosing new constants from screenshot samples.

The corrected run has now completed 436/436 static cases, all with
`meetsAcceptance:true` and no runtime errors. Every static checkpoint result
hash validates, and all ten live harness-source hashes still match the frozen
manifest. The 1,875-case interaction run has begun and is not yet complete.
Natural line-box collection is running with
`node scripts/audit-material-normal-line-boxes.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint --output=artifacts/material-parity/normal-line-box-current-ancestry-audit`.
Do not treat this static visual pass or the pending supplement as final audit
acceptance; further classifications and the complete report remain required.

## Fresh supplements after the inspection repair (2026-09-12)

Commit `8d3a974` is pushed to `codex/material-ui-showcase`. The following
unchanged capture producers were rerun against the frozen corrected bundle at
`http://127.0.0.1:4431`, with
`--checkpoint=artifacts/material-parity/current-ancestry-audit/checkpoint`.
Each command uses a new output directory; previous failing evidence is intact.

| Producer (`node scripts/…`) | `--output=artifacts/material-parity/…` | Cases / mismatches | Report SHA-256 |
| --- | --- | --- | --- |
| `audit-material-picker-commits.mjs` | `supplemental-current-ancestry-audit/picker-commit-audit` | 6 / 6 | `2ec850bfcf782048630a4ec4bef0bb7885576263ab7a0c47fab39495e327f39b` |
| `audit-material-overlay-breakpoints.mjs` | `supplemental-current-ancestry-audit/overlay-breakpoint-audit` | 3 / 1 | `476498ca3c6f68d09afda41dc9e0ae68fdd0359b44048d9866a415c5969453d9` |
| `audit-material-slider-domain.mjs` | `supplemental-current-ancestry-audit/slider-domain-audit` | 4 / 4 | `00b1972bfc7e53eaada48e8c418bff35cc07f42209f328e1779c45014c54addf` |

All three producers intentionally exit 1 for observed mismatches. Independent
`collectSupplementalBehavior`, `collectSupplementalOverlays`, and
`collectSupplementalSlider` reads, supplied with the selected checkpoint
provenance and new supplemental root, validate all three as `checkpoint-bound`:
zero missing cases, zero runtime/provenance errors. `collectFullTreeInventory`
loads 26 per-side case mappings and 25 variants with zero tree or reference
context gaps. These are not legacy reports relabeled as fresh evidence.

The six picker checks still leave candidate values empty or the month at
`SEP 2026`, while reference commits yield `9/1/2026`, `9/2/2026`, or `12:30 AM`
and navigation yields `AUG 2026` / `OCT 2026`. Slider keyboard steps remain
non-equivalent: the start sequence reaches 40 instead of 60; the end reaches
58 instead of 40. Real pointer drags stop at 50 on both candidate half-domains,
instead of reaching reference endpoints 60 / 40. The bottom sheet matches at
900 and 1440 CSS pixels, but at 1024 its width is 512 rather than 384 and its
left edge is 256 rather than 320. These reproduce the previously documented
unequal authoring/state rules; the diagnostic repair does not fix or waive them.

The unchanged `audit-material-button-defaults.mjs` also passes freshly with
`--output=artifacts/material-parity/button-default-current-ancestry-audit`.
It observes two original native buttons, two candidate labels, and eight
isolated browser controls. Report SHA-256 is
`4d25b2df0dfb0123b95677a9ebd9263d867b4cac05db7f781e68118250f7bb33`;
independent `validateSupplementalCapture` returns `checkpoint-bound` with no
errors. Native button UA alignment remains center while the replacement
candidate flex-div label retains left. This corroborates the existing input
classification, not an assertion that all text alignment is renderer-correct.

The full matrix is still running. Collect the natural-line-box supplement only
after all static checkpoints exist, then regenerate the complete report with
the new evidence paths. Final all-difference classification and acceptance
remain incomplete.

## Core inspection now scopes resolution to the current document (2026-09-12)

The goal permits a small core repair when required to make instrumentation
trustworthy. This increment corrects the reproduced query-context defect only;
it does not change Material fixture inputs, render placement, visual-reuse
decisions, or text paint.

`DOMAncestryService.withTree` provides a synchronous query scope for the existing
core resolver. It installs the current document relationships, including hidden
nodes, and restores the live renderer's WeakMap in `finally`. Both transitions
advance the revision so cached selector matches cannot leak between contexts.
`inspectResolvedStyles` runs in that scope and resolves each live pseudo-state
source ID to its unique current authored node. Duplicate IDs are not assigned
an arbitrary source. Rendering and interaction outside the query continue with
their existing live objects. There is no fixture-side selector evaluator,
world-space feedback, forced rebuild, or substitution of retained paint into
normal/effective declarations.

This is a backward-compatible correction to the existing on-demand diagnostic
API, with no document, plugin, or public-type shape change. The compatibility
documentation and synchronized developer reference explain the current-tree
contract. It is not a claim that all runtime reconciliation paths or every
captured property are now proven correct.

Verified so far:

- `npm test -- --watch=false --browsers=ChromeHeadless --include=src/lib/astylar-style-inspection.spec.ts --include=src/app/services/dom/dom-ancestry.service.spec.ts`:
  5/5 passing. Covers current descendant/adjacent/hidden structural selectors,
  inherited cursor, semantic-only reuse, focus/blur sources, retained mesh and
  resource identity, plus nested/error query restoration and cache invalidation.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 460/460 passing.
- `npm run material-showcase:prepare`: freshly rebuilt and packed dependency,
  installed one package and cleared the example's dev cache.
- The unchanged package-root `label-cascade-input-audit.spec.ts` now passes 4/4,
  including both previously failing equivalent-update phases. All fresh and
  update normal/effective/retained colors match the equal-input browser rules.
- `npm run build:lib`, the isolated showcase build at
  `dist/material-showcase-current-ancestry-audit`, and root build at
  `dist/current-ancestry-audit` pass. Root build reports the existing budget
  categories: initial bundle 6.83 MB versus 2.00 MB, app.scss 4.59 kB versus
  4.00 kB; thresholds were not changed.
- `npm run examples:check` and `npm run skill:check` pass.
  `npm run capabilities:check` still reports only the previously recorded
  untouched element-creation fingerprint mismatch (`2edeb33f...` / `bf5fd586...`).
- `npm run consumer:check`: passes with 419 packed files, a clean installed
  consumer browser/SSR build, and 4/4 Chrome browser tests. The logged
  `surface-disposed` diagnostic is the deliberate disposed-inspection rejection
  assertion, not a failed live-surface query.
- Final `npm run parity:harness:check`: 299/299 passing, zero skipped or
  cancelled tests (186.862 seconds). The prior process was confirmed absent
  before this final run; no live runner was restarted on an observation timeout.
- Installed package `dist/lib/lib/astylar.js` SHA-256 is
  `6ad4f51ca47a9e1956a66b6e724105a66aaff582c53b0b30374fb6051723f5f8`;
  `dist/lib/app/services/dom/dom-ancestry.service.js` is
  `4f8280644fa256cfcd2a6a6d7cf06ba7310b883680b89f514b3b3ecf941bed84`.
  Both contain the new query-context implementation.

The first audit-harness rerun passed 297/299: an older source-audit definition
still matched the pre-repair method call signature. Updating that exact source
match, without changing its classification or dropping the finding, makes the
three affected source/fingerprint/layout-attribution tests pass. A separate
showcase invocation rejected `--port` before running tests; the successful
invocation used the supported command after the root runner exited.

Packed-consumer and audit-harness verification are complete; the new full
capture remains in progress. The frozen pre-repair matrix finished with
minimum/median static SSIM 0.965296/0.996382, maximum edge error 0.984px,
428/428 static text checks, 1,875/1,875 interaction cases, minimum interaction
SSIM 0.954514 and 2,116/2,116 interaction text checks. Those green visual results
do not repair its defective input-stage evidence. Final audit completion still
requires corrected captures, fresh supplements, full classification and report
validation.

## Equivalent updates detach inspected nodes from renderer ancestry (2026-09-12)

This is a newly reproduced core inspection defect and a prerequisite to final
audit acceptance. It is not a Material label-color fix.

The complete 436-case static inventory has zero tree-reading errors. Its dark
datepicker/timepicker labels nevertheless report normal/effective color
`#1d1b20` and retained text color `#e6e1e5` across all three static viewports.
Both reference labels inherit `rgb(73, 69, 78)` from the floating-label rule
`var(--mat-form-field-filled-label-text-color, var(--mat-sys-on-surface-variant))`.
The candidate authors `.field-label.empty-field-label { color: #1d1b20 }`
and a later, equally specific `.datepicker-shell .field-label` or
`.timepicker-shell .field-label { color: #e6e1e5 }`. Thus there are two distinct
issues: unequal reference/candidate ink inputs, and disagreement between the
candidate's inspected and retained stages. Neither is normalized away.

The package-root reproduction is
`examples/material-showcase/src/app/label-cascade-input-audit.spec.ts`.
It generates HTML CSS and SiteData from identical rules, uses no Material
plugin, mounts a 320x120 CSS-pixel surface, and tests both `label` and `span`
with the compound and descendant rules in both source orders. All four fresh
mounts agree with Chrome. After `surface.update(structuredClone(site))` and
settlement, both descendant-last cases report the earlier compound color in
normal/effective inspection; retained text still matches the browser. The two
compound-last controls pass. The proof additionally checks visual strategy
`reuse`, retained mesh identity, input immutability, and error-free settlement.

Owning path:

- `AstylarRenderSession.update` replaces `currentSiteData` with the new objects.
- `AstylarRenderer`'s `!visualPlan.rebuild` branch reconciles semantic state and
  returns without rebuilding ancestry.
- `DOMAncestryService` stores relationships in a WeakMap keyed by object identity.
  The renderer registers that ancestry during tree construction.
- `inspectResolvedStyles` walks the new session tree and explicitly passes those
  new authored objects into `getElementInteractionStyles`/`findStyleForElement`.
  Compound selectors match locally, but the new objects lack the retained
  parent relationships needed by descendant selectors.
- Retained text still describes the correctly rendered earlier tree.

History: `b6dc672` introduced the inspection traversal, `d48028f` introduced
visual reuse, and `875f1b18` contains the session document replacement. The
initial suspicion that `input?.style` caused this label discrepancy was rejected:
ordinary labels/spans are not managed inputs and both fail after equivalent
updates. Fresh static cascade controls alone would have missed the defect.

Prioritize the core inspection/reconciliation identity contract before further
acceptance claims. Do not fix it by matching selectors in the fixture, rewriting
old captures, substituting retained paint for resolved declarations, or forcing
all equivalent updates to rebuild. Extend proof to inherited/structural rules,
semantic-only updates, hidden descendants and interaction consumers. Repair the
owning core boundary, verify it, then recapture affected evidence. The current
full matrix remains useful frozen evidence and must not be restarted merely
because this independent reduction found a defect. Existing per-property
attributions must be revalidated against trustworthy captures before completion.

Verification commands and provenance:

- `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/label-cascade-input-audit.spec.ts`
  initially passed all four fresh-only controls; with equivalent-update phases,
  it deliberately exits 1 with two failures and two successes. Each failure is
  normal/effective color after update, not retained text color.
- `npm --prefix examples/material-showcase run build -- --output-path=dist/material-showcase-label-cascade-audit`
  passed, with browser/server output isolated from the running capture bundle.
- Installed Angular 20.3.29, Babylon 8.56.2, AstylarUI 0.2.0; Chrome Headless 152.
  The existing test-runner NG0914 warning (Zone.js loaded with zoneless providers)
  remains; it is not a renderer diagnostic failure.
- Installed `dist/lib/lib/astylar.js` SHA-256:
  `9d77358cb2d375a6760e51f304511f10cf22381cfa22fc1cb8ed9c89ad80060a`;
  installed `dist/lib/app/services/dom/style.service.js`:
  `b0a9baa39da07df8a15cd34d508b3988b88d26d294f0f40f03e0c7e20be4d52e`.
- A first diagnostic compile rejected `Array.toReversed` under the project's
  current lib target; the test now uses a copied array with `reverse`. No
  dependency, target, production behavior or fixture changed.
- The final browser proof was repeated with visual-reuse/mesh-identity assertions:
  two intentional failures and two successes, with the same update-only colors.
  `npm run parity:harness:check` passed 299/299 (zero skipped), and the final
  source-policy/fingerprint checks passed 2/2 after adding the finding. All ten
  live-matrix harness-file hashes still match its frozen checkpoint manifest.

## Stepper numeral font and label color use different inherited inputs (2026-09-12)

Two remaining typography differences now have independent input attribution:

- Numeric badges: the reference numeral inherits font size through its original
  icon/header ancestors to the frame, whose active rule is
  `font-size: calc(16px * var(--scale))`. The captured sizes are 16px in light/dark,
  14.4px in contrast and 18.4px in custom. Candidate `.step-badge` explicitly
  authors 14px, and normal/effective/retained sizes agree with that different
  input. This fixed size already appears in `2f44011`; `2f14e60` later modifies
  badge styling. Restore inheritance with the original percentage-positioned
  wrapper, not a number-to-circle size adjustment.
- Details/Review labels: the reference span and `.mat-step-text-label` wrapper
  inherit color from the active `.mat-step-label` rules, using the component's
  `on-surface-variant` token fallback. Candidate `.step-text` omits color all the
  way to `#page`, where normal/effective and retained color agree with the page
  color. In the captured static cases the reference is `#49454e`, versus
  candidate `#1d1b20` or dark `#e6e1e5`. The omission exists in `2f44011`;
  `354084e` adds vertical alignment without restoring the color token. Preserve
  reference truth, including its captured dark value, rather than retuning it.

Source findings `fixture-stepper-number-font-substitution` and
`fixture-stepper-label-color-omitted`, and plan **5.27**, separate these authoring
differences from core font scaling, color conversion and final glyph paint.
All raw values remain in the report. No fixture, renderer or reference styling
was changed, and this attribution is not a screenshot-equivalence claim.

The numeral review requires the exact original text mapping, a unique complete
inheritance path, the active frame calculation and explicit candidate 14px rule.
The label review requires unique shared text IDs, the original inner wrappers
and header, both active Material color rules, and a complete candidate path with
no color declaration until the page. Unknown rule contexts, inline overrides,
shorthand conflicts, missing/duplicate/cyclic ownership and inconsistent state
inputs are rejected. Three focused test groups pass across four font/palette
combinations, **29 contradictory-input mutations and 14 report-tampering
controls**. An independent validator replays both property attributions from
captured inputs instead of trusting report labels.

The full harness initially caught the source-fingerprint count left at 32 after
the previous increment added the native-button probe. The expectation is now 33,
with an explicit uniqueness assertion for that probe. This is audit inventory
maintenance, not a changed rendering threshold or excluded test.

Final verification for this increment:

- All **12 static and 56 interaction stepper cases** are captured. The new review
  attributes **120 numeral font-size and 136 label-color differences**, with no
  unresolved stepper differences in those two categories. Completed-step vector
  icons are not miscounted as numerals. The earlier number-positioning review
  also replays successfully across all **120 remaining numeral observations**.
- `npm run parity:harness:check`: **299/299 pass**, zero failures or skipped tests
  (140.1 seconds), including the corrected fingerprint assertion.
- A verified broader prefix contains **436 static and 1,564 interaction cases**.
  Result digests, partial-report validation, tree inventory, reference context
  and natural-line-box checks return zero errors. All 79 source findings are
  detected and all ten live capture-module hashes match the manifest.

The main matrix remains in progress, other audit differences remain open, and
the report still correctly states `inputEquivalent: false`.

## Button-toggle native defaults are lost with the button wrapper (2026-09-12)

The main audit now attributes all **136 label-alignment observations across
12 static and 56 interaction button-toggle cases**. Each occurrence must retain
the exact native-button/inline-block reference path and centered flex-div/span
candidate path, with complete reference and candidate ancestry. Reference
computed center and candidate omitted normal/effective alignment plus retained
left remain raw differences, classified as application authoring divergence.
The attribution does not assert a user-agent rule for every state: the separate
CDP probe below establishes that rule only for its captured light reference.

New source finding `fixture-toggle-native-button-substitution`, focused proof
inventory and implementation plan **5.26** preserve that ownership distinction.
Three regression groups pass, including **21 contradictory-input mutations and
eight report-tampering controls**. Missing/cyclic/duplicate ancestry, a changed
element type, different display/alignment, unsupported bidi context, inline
overrides or contradictory state styles cannot receive this attribution. Report
claims are independently replayed; removing or altering them fails validation.
`npm run parity:harness:check` passes **296/296**, zero skipped (133.6 seconds).
The 68-case family inspection has zero inventory errors and reference-context
gaps. Other properties and overall input equivalence remain independently open.

A broader verified prefix contains **436 static and 1,420 interaction cases**.
Checkpoint result digests, partial-report validation, tree inventory, reference
context and natural-line-box checks return zero errors; all 77 source findings
are detected and all ten live capture-module hashes remain unchanged. The native
button supplement still independently validates as `checkpoint-bound`. This is
partial evidence only: the remaining interaction capture and audit classification
work are not complete, and `inputEquivalent` remains false.

A read-only Chrome DevTools Protocol probe now identifies the previously unknown
source of the reference label's `text-align: center`. In both original light
desktop buttons, the Material host computes `start`, the nested native `button`
computes `center`, and its inline-block label span inherits `center`. The matched
alignment declarations have **user-agent** origin, not author origin. Chrome
reports both its generic control `text-align: start` rule and its button-default
`text-align: center` rule. No matched author alignment rule is present.

The original candidate input instead contains two `div.button-toggle-option`
parents with `display: flex; justify-content: center` and ordinary child spans.
The spans omit alignment from normal/effective styles and retain core `left`.
The div/label composition is traced to `c47d589`, lines 976–978 of
`examples/material-showcase/src/app/astylar.component.ts`. Changing native
button/inline-block layout into flex centering changes the input mechanism,
even if its current labels appear centered. This is application authoring
divergence, not evidence that equivalent native-button inputs fail in core.

The probe also runs **eight isolated browser controls** in separate blank
documents, leaving both original showcase surfaces unchanged. With parent
alignment `start` and `right`, a native button and its label compute `center`.
An ordinary div, a div with `role="button"`, and a native button explicitly
declaring `text-align: inherit` instead follow the respective parent alignment.
These controls distinguish the tag default from inheritance, ARIA role and
explicit author overrides. They do not establish core default handling or
glyph/raster parity; those require equivalent Astylar button inputs.

Reproduction (use a new output directory for another capture):

```powershell
node scripts/audit-material-button-defaults.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/context-complete-audit/checkpoint --output=artifacts/material-parity/button-default-context-audit
```

The command exits zero: two original reference buttons, two candidate labels,
and all eight controls pass their evidence assertions in Chrome
`152.0.7977.76`, light profile, 1440x900 CSS pixels, DPR 1. The complete input
trees and runtime asset hashes are preserved alongside the report. Independent
`validateSupplementalCapture` returns `checkpoint-bound` with zero errors.
The report SHA-256 is
`b8d0465158358232d35643f949e8b32c81e7604484d828fe49ec0b07fdfa823e`.

The per-case review above preserves every raw center/left difference. Do not grant
blanket equivalence to center/left or infer UA rules for unrelated elements. Restore the
original native-button wrapper and CSS layout intent in the later implementation
pass, then test any remaining discrepancy in core defaults and inline layout.
No reference, fixture, renderer, live capture module or visual gate was changed.

## Stepper numeric icons replace the original positioning mechanism (2026-09-12)

All **24 numeric-icon alignment differences in the 12 fresh static stepper
cases** now have captured-rule/structure attribution. The reference number
computes `text-align: start` throughout its horizontal-LTR ancestor chain. It
is centered by a separate `.mat-step-icon-content` wrapper authored as:

```css
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
display: flex;
```

In the light desktop capture the wrapper's computed top/left are 12px and its
transform is `matrix(1, 0, 0, 1, -4.5, -9.5)`. The numeric span itself is 9x19px.
The candidate instead puts the number directly in a 24x24px `.step-badge` span
with explicit `textAlign: 'center'`; its normal, effective and retained alignment
all agree with that different authored input. This fixed centered badge already
exists in `2f44011`; `2f14e60` later adjusts stepper row styling.

Source finding `fixture-stepper-number-wrapper-substitution` and plan item
**5.25** preserve this distinction. The correction is not to shift the number
or accept start/center as equivalent because both screenshots look centered.
Restore the original numeric span and separate positioning wrapper after
correcting the independently reproduced core percentage-transform semantics.
The existing equal-input transform reduction is the core proof; this finding
does not infer another core text-alignment defect from unequal structures.
Font size, ink, line metrics, current glyph paint and other stepper composition
differences remain separately attributed or unresolved.

The reader requires the exact reviewed text paths, unique complete reference
ancestry through the frame, horizontal LTR/normal-or-isolate bidi, automatic
last-line alignment, and unambiguous active wrapper positioning declarations.
It checks the explicit candidate rule plus normal/effective/retained values.
Conflicting positioning declarations, inline overrides, missing/cyclic ancestry,
duplicate rules, changed dimensions or alignment, and unsupported rule contexts
cannot receive the attribution. An independent replay also rejects removal,
duplication or alteration of the resulting report claims. Raw inputs remain
unchanged, and the classification is explicitly not input equivalence or paint
verification.

The three focused regression groups pass, including **22 malformed-input
mutations and eight report-tampering controls**. Fresh static inventory inspection
returns 24 attributed observations, no remaining unresolved stepper text-alignment
observations, zero tree errors and zero reference-context gaps. Stepper interaction
captures have not reached this part of the live matrix yet; their attribution
must be verified when available. The source inventory now has 76 findings.

Button-toggle labels were also inspected: their reference spans inherit center
alignment from native buttons, while candidate labels sit in centered flex divs
and retain left alignment. The captured author rules do not declare that native
button alignment. Those records remain unresolved pending an explicit browser
default/structure proof; they were not folded into the stepper classification.
`npm run parity:harness:check` passes **293/293**, with no failures or skipped
tests (129.4 seconds). A verified live prefix contains **436 static and 1,222
interaction cases**: result digests, partial-report validation, tree inventory,
reference context and natural-line-box supplement checks all return zero errors.
All 76 source findings are detected, and all ten live capture-module hashes still
match the manifest. The prefix retains 3,330 unresolved typography observations
and explicitly reports `inputEquivalent: false`; it is not full-audit acceptance.
No renderer, fixture, reference or live capture-module change was made.

## Fresh supplemental evidence bound to the current run (2026-09-12)

The thirteen picker, bottom-sheet and slider diagnostic cases now have fresh
captures under `artifacts/material-parity/supplemental-context-audit`, using the
unchanged frozen showcase served by the running full matrix on port 4431.
This replaces neither the earlier supplemental artifacts nor the full matrix.
The new captures include the current reference-context collector, resolving the
old supplements' missing context fields without reconstructing their values.

The shared `supplemental-capture-evidence.mjs` producer requires explicit
`--base-url`, `--checkpoint`, and a previously nonexistent `--output` directory.
It records the selected manifest digest, capture-script/helper/collector source
digests, and exact requested style-property set. Each page records observed
document, script, stylesheet and font response bytes and checks their hashes
against that manifest's browser assets. Browser mismatch, changed bytes, missing
asset categories, or runtime errors fail collection. Existing output directories
are rejected; tree and report writes are exclusive.

The independent report reader rechecks manifest provenance, current capture
source bytes, all observed per-side asset digests, and each complete tree's
bytes, directory and collection errors. The audit CLI's `--supplemental-root`
selects all three reports from one explicit parent without falling back to the
old paths. Legacy reports remain readable for diagnosis but cannot satisfy
complete audit acceptance or support an input-equivalence verdict. Captured
metadata is retained in the machine report, not reduced to a passing flag.

Capture commands (each completed with exit 1 because of retained behavioral or
geometry mismatches, not collection failure):

```powershell
node scripts/audit-material-picker-commits.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/context-complete-audit/checkpoint --output=artifacts/material-parity/supplemental-context-audit/picker-commit-audit
node scripts/audit-material-overlay-breakpoints.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/context-complete-audit/checkpoint --output=artifacts/material-parity/supplemental-context-audit/overlay-breakpoint-audit
node scripts/audit-material-slider-domain.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/context-complete-audit/checkpoint --output=artifacts/material-parity/supplemental-context-audit/slider-domain-audit
```

All three reader results are **checkpoint-bound**, with zero collection errors
and zero missing cases. The combined inventory has **26 case sides, 25 distinct
tree variants, zero input-tree errors and zero reference-context gaps**. These
captures reproduce the earlier eleven mismatches:

| Diagnostic | Reference | Astylar | Result |
| --- | --- | --- | --- |
| Date commit, pointer / keyboard | `9/1/2026` / `9/2/2026` | empty / empty | 2 mismatches |
| Time commit, pointer / keyboard | `12:30 AM` / `12:30 AM` | empty / empty | 2 mismatches |
| Previous / next month | SEP → AUG / SEP → OCT | SEP → SEP / SEP → SEP | 2 mismatches |
| Sheet width, viewport 900 / 1024 / 1440 | 900 / 384 / 512 | 900 / 512 / 512 | 1 mismatch |
| Keyboard start / end thumb final values | 60,65 / 30,40 | 40,65 / 30,58 | 2 mismatches |
| Pointer start / end thumb final values | 60,65 / 30,40 | 50,65 / 30,50 | 2 mismatches |

The slider traces retain all intermediate values and native range attributes;
the candidate still takes non-reference keyboard steps and both dragged thumbs
stop at 50. These observations corroborate the previously classified unequal
range domains/steps/state normalization and missing picker state handlers. They
do not prove a new core hit-testing defect or imply those inputs are equivalent.
The current `astylar.component.ts` range definitions at lines 903–904 explicitly
author 0–50 and 50–100 domains with `step: '1'`; `showcase.store.ts` line 96 rounds
shared values to multiples of five. The picker input at `astylar.component.ts`
line 1031 is authored with an empty value. These are concrete unequal-input
paths, not conclusions drawn from the screenshot score alone.
The medium sheet has a 128px width discrepancy, while its 900px and 1440px
geometry controls match within the existing 0.5px diagnostic tolerance.

Report digests:

- Picker: `55713527d10f461bea2695792c65118471389576b638ddff545ad2436e36e984`.
- Bottom-sheet: `fabcc9cc3748a5e32b91904474b415be1901921059363f46ef40b33b19b33e13`.
- Slider: `353b72524ce9adbfac5693168c0cd65334a87fc708a87bc6aa3c985a79d32683`.

Verification: `node --test tests/material-parity/supplemental-capture-evidence.spec.mjs`
passes **39/39** producer/reader/selection tests. Focused CLI/environment/complete-
acceptance checks pass **3/3**. Final `npm run parity:harness:check` passes
**290/290**, with no failures, skips or cancellations (109.6 seconds).

A fresh checkpoint-prefix audit verifies **436 static + 1,118 interaction**
records, all result digests intact, with zero partial-validator errors, zero
inventory/reference-context errors, and zero natural-line-box errors/missing
observations. All three fresh supplements are included. The 75 source findings
remain detected, but **3,330 style attributions remain unresolved** in this
prefix; `inputEquivalent` remains false. A separate hash check confirms all ten
live full-matrix harness files are unchanged. The full matrix is still running,
and complete classification, final reports and acceptance remain outstanding.
No fixture, renderer, package dependency, visual threshold or live matrix
collector was changed for this increment.

## Anonymous flex text: single-item success versus composed-flow failure (2026-09-12)

The equal-input reduction now separates two mechanisms that the tree wrapper
could otherwise obscure. **Direct text alone is centered correctly without a
wrapper** in 48px and 80px rows, with both explicit 20px and `normal` line-height.
The current bound text-plane centers are exactly 24px and 40px. This proves the
single-item line-box placement invariant only: it does not equate the observed
17px normal texture height to a browser used line-height or establish glyph
sharpness/baseline fidelity. The separate normal-line-height findings remain.

**Direct text followed by an element is not included in the shared flex item
flow.** Both browser and candidate receive the same `Documents` text, a 20x10px
marker child, Arial/sans-serif 16px text, explicit 20px line-height, 8px gap,
320x96px container, and centered cross-axis alignment. The marker's browser DOM
box—not a synthetic text-width formula—provides the expected flow result:

| Direction / justification | Marker edge | Browser CSS px | Astylar CSS px |
| --- | --- | ---: | ---: |
| Row / flex-start | left | 88.921875 | 0 |
| Row / center | left | 194.453125 | 150 |
| Column / flex-start | top | 28 | 0 |
| Column / center | top | 57 | 43 |

All four mixed anonymous-text cases fail unchanged geometry assertions. Four
otherwise corresponding explicit-span cases pass. Those span cases are
separate equal-input controls, not recommended substitutions for the original
anonymous-text inputs. All four single-direct-text centering controls also pass.
The shared case builder generates browser CSS from the exact candidate rule
objects and creates browser DOM from the same `SiteData`; no Material plugin,
measured width, positional adjustment or CSS-to-world input is involved.

The owning paths are:

- `ElementCreationService.createElement` paints an element's own `textContent`
  independently via `handleTextContent` before processing its child elements.
- `FlexService.processFlexChildren` filters only the supplied element children
  and constructs `childItems` from that array. The parent's direct text is not
  an item, so it contributes neither intrinsic main-axis size nor the inter-item
  gap to the marker's placement.
- `BabylonDOMRendererService.resolveAnonymousFlexTextAlignment`, introduced by
  `59883a0`, aligns the separately painted text in the parent box. That handles
  the single-item control but does not allocate an item in composed flex flow.
  History attributes the current children-only filtering/mapping to `4620654`.

Source finding **`core-anonymous-flex-text-excluded-from-item-flow`** and plan
item **3.3** retain the failing proof. The correction belongs in core CSS-space
flex item generation and shared text placement, before projection. It must not
insert application wrappers or tune child offsets. Wrapping, whitespace,
reversed axes, padding and updates need follow-up coverage before implementation.
The compatibility catalog claims the tested flex keyword/length subset, but
does not promise every anonymous-box nuance; this proof records the exact
composed behavior that fails rather than broadening that claim.

The complete browser reduction command was run twice:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Both runs report **51 executed: 25 passed, 26 intentionally failing**, including
the same four new anonymous-flow failures and the previous 22 core/capability
diagnostic failures. These failures are preserved, not converted to expected
passes. These reductions establish that core can center direct text without a
fixed wrapper; they do not establish full tree typography or paint equivalence.

Runtime: Chrome Headless **152.0.0.0**, Windows, Angular **20.3.29**, AstylarUI
**0.2.0**, Babylon **8.56.2**, public package-root imports and a 640x360 CSS-pixel
surface. The installed core JavaScript fingerprints are
`renderer.service.js: 93048da6ea6186d59b60755b13c6bec56283d6f2fde23d5ffcd82b9d9a322c6c`
and
`flex.service.js: 1c587dbb1b2386dc176984cfc0ae725ae6d92a2be4a7605a92598bfdb14b13dd`.
The unchanged NG0914 Zone.js/zoneless warning does not explain the deterministic
marker errors. No dependency was replaced or renderer code changed.

The production browser/server build also passes:
`npm --prefix examples/material-showcase run build -- --output-path=dist/material-showcase-anonymous-flex-audit`
(95.2 seconds). Its separate output directory leaves the live full-matrix
browser build untouched. This build is compile evidence, not acceptance of the
deliberately failing browser reductions.

The final strengthened browser rerun has the same **25 pass / 26 fail** result.
The added assertions also verify that mounting preserves the authored input,
the relevant core-resolved flex/marker declarations equal browser computed
values, settled flex cases have no error diagnostics, and disposal leaves zero
scene meshes, materials and textures. A test-only optional-string type error
was corrected before this successful compilation and execution; no assertion
or expected geometry was weakened.

`npm run parity:harness:check` passes **250/250**, none skipped (94.4 seconds).
All ten live capture-harness source hashes remain unchanged. The complete
unfiltered matrix and the broader input-equivalence audit are still incomplete.

A fresh **1,362-result prefix (436 static + 926 interaction)** verifies every
checkpoint result digest and includes all **75** source findings. The new flex
finding resolves to `flex.service.ts:140`; full-tree collection, selected
natural-line-box evidence and partial validation have zero errors. Complete
coverage and input equivalence remain false. No captured input difference is
silently accepted by adding this core finding.

After updating the report's focused-proof inventory and root-cause ordering,
the final `npm run parity:harness:check` rerun passes **250/250**, none skipped
(138.9 seconds). `git diff --check` passes. The browser diagnostic suite remains
honestly failing on the unchanged 26 assertions/cases described above; harness
validation is not a claim that those renderer defects have been fixed.

## Tree direct-text ownership and fixed line-box substitution (2026-09-12)

The reference `mat-tree-node` owns its text directly in a flex container. Its
complete captured ancestry through the tree, section and `main.frame` computes
`line-height: normal`. The candidate instead inserts a `.tree-label` span with
explicit `height: 20px`, `line-height: 20px`, and `vertical-align: middle` into
the centered flex row. Candidate normal/effective styles and the core text
registry agree with that explicit line-height. This is a structural and
authored-input difference, not evidence that core converted a shared input
incorrectly, and not an accepted `normal`-to-20px normalization.

`git show 7159b1d -- examples/material-showcase/src/app/astylar.component.ts`
shows both the added `.tree-label` rule and the replacement of the tree row's
direct `textContent` by a child span. This extends the existing
`fixture-tree-component-typography-omitted` source finding; the missing component
font-size and font-family inputs remain separate properties, not explanations
for every line-box or placement difference.

The `reviewed-tree-label-line-box-substitution` attribution requires exact
reviewed text-owner paths, complete unique reference ancestry with no conflicting
line-height/shorthand/inline declarations, one explicit candidate wrapper rule,
a single-child centered flex parent, and agreeing normal/effective/retained
values. An independent validator replays the finding from raw pooled styles,
rules, structure and comparison values. The tests reject missing or cyclic
ancestry, changed structure, ambiguous or media-conditional rules, altered
declarations, and missing, duplicated or fabricated report evidence.

A SHA-256-checked **1,195-result prefix (436 static + 759 interaction)** yields
**156** line-box substitutions: **36 static + 120 interaction**. All observed
reference chains have four nodes. Full-tree collection and partial validation
have zero errors; the fresh natural-line-box supplement has zero missing
observations or validation errors. Coverage and input equivalence remain
**false**. This is a diagnostic prefix, not full-matrix acceptance.

Plan item **5.24** calls for restoring original direct text ownership and
`normal` line-height together with the original component typography before
assessing core anonymous flex-item sizing, centering or line metrics. The later
equal-input reproduction above passes single-item centering but fails mixed
text/element flow; it must not be summarized as every tree text placement being
broken. Neither a natural used height nor current glyph-paint equivalence is
inferred from `normal`.

Focused verification:
`node --test tests/material-parity/input-equivalence-audit.spec.mjs` passes
**150/150**, none skipped (105.0 seconds). The three added tests exercise six
positive font-size/inheritance combinations, 23 contradictory-input mutations
and 11 report-tampering mutations. All ten live capture-harness files still
match their recorded digests. No renderer, fixture input, reference, state
driver or threshold was changed.

Final verification: `npm run parity:harness:check` passes **250/250**, none
skipped (108.1 seconds), and `git diff --check` passes. The complete unfiltered
capture is still running; these passing attribution tests do not establish full
audit completion or equivalent-input rendering.

## Explicit field-label tracking substitutions (2026-09-12)

All **54 remaining static field-label tracking differences** are now attributed
from their actual reference and candidate inputs. The reference `mat-label`
inherits **0.496px** from its direct `.mdc-floating-label` wrapper's active
`.mdc-text-field--filled .mdc-floating-label` rule:
`var(--mat-form-field-filled-label-text-tracking, var(--mat-sys-body-large-tracking))`.
The base candidate `.field-label` explicitly supplies **0.4px**; its
more-specific `.field-label.empty-field-label` rule supplies **0.4px or 0.65px**
according to state. Normal, effective and core-retained tracking agree with
the selected candidate declaration. This is an authored substitution, not
evidence that core changed the requested spacing.

History identifies **87bc351** as adding `.4px` tracking to the base label
alongside its field layout changes. **354084e** adds the empty-label
`.4px`/`.65px` split; **7159b1d** changes its predicate to `emptyFieldActive`;
**4d56f86** later changes colors/state composition without removing the tracking
substitution. The existing floating-label font/transform finding remains
separate: reference wrapper styles retain the transform and 16px type, while
the candidate uses smaller untransformed type in floated states. Multiplying
reference tracking by wrapper scale does not make different CSS inputs equal.
This increment does not claim that removing the tracking substitution alone
would fix a screenshot or a core transform defect.

The new `reviewed-field-label-tracking-substitution` attribution requires the
exact family label IDs/types, a unique reference wrapper and token declaration,
no intervening tracking override, explicit candidate base/empty-state rules,
and matching normal/effective/retained values. Unknown, duplicated or
media-conditional field-tracking rules remain unreviewed; the attribution does
not invent their cascade winner. Raw wrapper computed styles are retained,
including transforms, rather than converting them into an apparent glyph-width
correction. Validation independently replays each claim from pooled raw styles
and rules, rejecting missing, duplicate, changed or fabricated evidence.

A digest-checked **1,039-result prefix (436 static + 603 interaction)** contains
**93** attributed observations: 12 static each for autocomplete, datepicker
and timepicker; six static each for input, form-field and select; and 39
interactions captured so far (36 form-field, three input). All records remain
`application-plugin-authoring-defect`, `inputEquivalent: false`, and
`currentPseudoStatePaintVerified: false`. The source register now contains
**74** findings. Inventory, natural-line-box and partial-validation errors are
zero, but full coverage and input equivalence remain **false**; this prefix is
diagnostic evidence only.

Implementation-plan item **5.23** restores the reference tracking token and
wrapper typography/transform as a unit before evaluating residual core
transform/shaping/placement defects. No renderer, fixture input, state driver,
reference, threshold or active capture-harness source was changed.

Focused verification: `node --test tests/material-parity/input-equivalence-audit.spec.mjs`
passes **147/147** (117.5 seconds). The new tests cover all six field families
in base, empty and active-empty forms (18 positive combinations), 24
contradictory-input cases and 11 report-tampering cases. They preserve raw
transformed/untransformed wrapper evidence rather than treating either form as
an equivalent font/spacing representation.

Final verification: `npm run parity:harness:check` passes **247/247**, with no
skipped tests (114.2 seconds), and `git diff --check` passes. All ten live
capture-harness files still match their recorded SHA-256 digests. The complete
unfiltered matrix remains in progress; the new attribution and passing harness
suite are not full audit acceptance.

## Omitted inherited component line-height and tracking (2026-09-12)

Fresh captured reference ancestry distinguishes missing component inputs from
core text-metric errors. In the radio, checkbox and slide-toggle references,
the directly mapped text span inherits through `.mdc-label` from
`.mat-internal-form-field`. The active Material rule supplies the component's
`label-text-line-height` / `label-text-tracking` tokens with body-medium
fallbacks, computing **20px / 0.256px**. Every candidate normal/effective
declaration from the matching text leaf through `main#page` omits both
properties; the core text registry retains **normal / 0px**. Copying 14px font
size does not supply those missing text-metric inputs.

The original `.radio-label` and `.switch-label` declarations in `2f44011`
already omitted both metrics. Current radio-label positioning/vertical-align
comes from `f3c8254`; switch-label positioning/vertical-align from `f566f80`.
The checkbox-label rule is attributed to `88d1090`, with the separate narrow
viewport bottom-padding adjustment in `662c179`. These histories establish
coexisting omissions and later adjustments, **not** that every adjustment was
caused by a line-height defect. That causal claim still needs an equal-input
layout/paint reproduction; this audit does not remove or tune those styles.

The new `reviewed-omitted-component-text-metric` attribution requires a unique
active reference token and a complete, property-consistent ancestor chain.
Intervening overrides, ambiguous declarations, inline replacements, font/all
shorthands, missing/cyclic/duplicate identities, wrong stage provenance and
candidate explicit metrics are rejected. Reference `inherit` declarations are
preserved along the path. Candidate omission is checked in both normal and
effective declarations through the unique page owner, and retained normal/zero
is kept as a separate stage. Existing chip/select/calendar-specific evidence
takes precedence. The report validator independently reconstructs the expected
records from the raw pooled evidence, rejecting fabricated, deleted, duplicate
or changed claims even in diagnostic partial-coverage mode.

A digest-checked **917-result prefix (436 static + 481 interaction)** yields
**640 newly attributed unequal metric observations**: 240 static and 400
interaction observations. Static findings cover radio (48), checkbox (24),
slide-toggle (24), table (72), list (48), expansion (12) and form-field (12).
These include list **24px / 0.496px**, table **20px** with header/body tracking
**0.096px / 0.256px**, expansion-header **0.144px** tracking and form-field
supporting-text **16px** line-height. Values come from each captured chain, not
from a table of assumed theme defaults. The interaction prefix currently adds
list (160) and table (240); other interaction families are still being captured.

All new records remain `application-plugin-authoring-defect` with
`inputEquivalent: false` and `currentPseudoStatePaintVerified: false`. Neither
normal-to-numeric line-height equivalence nor final baseline, wrapping,
placement or raster correctness is inferred. The existing independent
equal-input normal-line-height and Canvas-shaping failures remain unchanged.
Implementation-plan item **5.22** requires restoring component tokens and
inheritance structure before investigating residual core geometry or paint;
fixed heights, vertical alignment and offsets cannot replace those inputs.

The prefix has zero inventory, natural-line-box supplement or partial-validation
errors, while coverage completeness and input equivalence remain **false**.
Ninety retained line-height/tracking differences still need attribution in
that prefix, alongside other unresolved properties and mappings. The new source
finding brings the source register to 73 entries. The focused audit suite
passes **144/144** tests, including 24 direct/inherited positive combinations,
46 input-mutation cases and 22 report-tampering cases for this mechanism.

A separate static-only inventory inspection localizes the remaining 90 metric
differences: autocomplete, timepicker and datepicker have 12 each of reference
`0.496px` tracking versus explicit candidate `0.65px`; input, form-field and
select have six each versus explicit `0.4px`; tree has 36 reference `normal`
line heights versus explicit `20px`. These are **not** accepted by the omission
rule. Their explicit substitutions and inherited reference paths need separate
attribution; the existing tree source finding already records the fixed-20px
label introduced in `7159b1d`.

Final verification for this increment: `npm run parity:harness:check` passes
**244/244**, with no skipped tests (116.5 seconds), and `git diff --check` passes.
All ten active capture-harness provenance files remain byte-identical. The
unfiltered full matrix is still live and has progressed into tree interactions;
this is a findings/reporting change, not completed parity acceptance or a
renderer/fixture implementation change.

## Lossless full-report packaging (2026-09-12)

The generated working report had reached **286,977,383 bytes** of formatted
JSON before the newest context attributions. Removing inventory, rule chains,
raw values or repeated observations to make the deliverable smaller would
weaken the audit. The generator now writes a readable package manifest at
`docs/material-input-equivalence-audit.json` and the **entire** compact JSON
document as `docs/material-input-equivalence-audit.json.gz`. Both files and the
human summary belong in the eventual completed audit commit. This increment
does not commit the stale working report as a completed deliverable.

The manifest contains the format version, audit schema version, fixed payload
basename, compressed/uncompressed byte lengths and SHA-256 digests. The payload
is ordinary UTF-8 JSON after standard gzip decompression. Programmatic readers
can use `decodeMaterialInputAudit(manifest, payload)` from
`tests/material-parity/input-audit-report-codec.mjs`; it returns both the report
object and exact compact JSON after integrity validation. The package reader
rejects unknown formats/paths, corrupt or truncated data, mismatched lengths,
invalid UTF-8, duplicate JSON fields and schema mismatches. Decompression is
bounded by the declared length and the runtime's JSON string limit; excess
evidence fails explicitly rather than being truncated.

`--check` compares the **complete decoded document** against regenerated audit
evidence, not just a self-consistent manifest or matching summary counts. The
existing complete-coverage and classification validators, failure exit status,
human-report freshness check and prohibition on partial acceptance are unchanged.
Seven detailed-evidence mutation cases demonstrate that unchanged summary
counts cannot hide a stale rule, raw value, node text, case, classification or
evidence list. Additional tests cover deterministic round trips, repeated full
observations, Unicode, invalid manifests and corrupted gzip data.

A read-only round trip of the actual working report preserved every serialized
JSON value: **170,987,037 compact UTF-8 bytes** became **4,384,847 gzip bytes**.
The original file remained byte-for-byte unchanged. Its SHA-256 was
`ffdc530d75aa7faffab6c4fdc242e8f60a7f869c58d3bb76ef8c0ff3ca42ded6`;
the compact JSON SHA-256 was
`ee28f33824dac3af9d36e1580953e511015f5e0fa16d66b84ce756868d9c802f`.
This proves lossless packaging of that working report, **not** its completeness
or input equivalence. The new full matrix and remaining classifications are
still pending. All ten files in the active capture's harness provenance remain
byte-identical; the report codec is outside that live capture graph. No renderer,
fixture, reference, threshold, coordinate calculation or classification changed.

Verification: `node --test tests/material-parity/input-audit-report-codec.spec.mjs`
passes **6/6**; the complete `npm run parity:harness:check` suite, now including
the codec tests, passes **241/241**, with no skipped tests (107.5 seconds).
`git diff --check` passes. At the accompanying live checkpoint inspection,
**436 static + 389 interaction results** were present with zero result-digest
mismatches; the 1,875-interaction matrix was still running, not accepted complete.

## MDC, table fallback and button-toggle font cascade evidence (2026-09-12)

The remaining **138 static retained-font differences** were inspected through
their actual captured declaration chains, not assumed to share the earlier
case. They comprise three additional reference patterns:

- Filled-field floating labels and list labels use `.mdc-*` selectors with
  Material font tokens. The audit now recognizes those exact two selectors.
- Table header and body rows have nested system-token fallbacks ending in
  `Roboto, sans-serif`. Their complete token expressions remain recorded;
  the computed `Roboto` input is not replaced with the fallback list.
- Standard button toggles match both the legacy font rule and the later
  standard rule. Both have specificity 0,1,0. The reviewed standard winner
  requires the exact host type/classes and token pair, same stylesheet,
  top-level rules, non-important declarations, no conditional/layer context,
  and strictly later safe-integer source order. Both declarations remain in
  the evidence. Other competing rules and unknown precedence remain gaps.

The browser proof confirms why these restrictions matter: reversing rule order,
making the legacy declaration important, or putting only the standard rule in
a cascade layer changes the inherited family from Roboto to Arial. A system
table font token yields Roboto; removing that token exposes the actual
Roboto/sans-serif fallback list; a component-level override yields Arial.
These seven cases inspect computed families through the owner, button and
label. They do not assert physical font selection, glyph metrics or raster.

Three audit tests cover the five newly reviewed patterns, 19 unsafe toggle
cascade mutations, 12 MDC/table mutations and three tampered report/provenance
cases. The focused audit plus browser-collector command passes **146/146**:
`node --test tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/input-tree-evidence.spec.mjs`.
The final complete `npm run parity:harness:check` run passes **235/235**, with
no skipped tests; it also covers the safe-integer source-order guard.
`git diff --check` is clean.

A SHA-validated **631-record** prefix of the live capture now has **zero
unresolved font-family differences among its 354 mapped static retained-text
observations**: 342 are the page/component-token omission category, and 12 keep
the earlier exact select-value attribution. All remain unequal inputs, not
accepted font-list equivalence. Partial-schema validation and the fresh
normal-line-box loader report no errors. Other text properties, unmapped
owners, current-control text, missing behaviors and the rest of the interaction
matrix are not covered by this bounded result; overall audit completion and
input equivalence remain false.

No renderer, fixture, font asset, capture module or threshold was changed.
The existing full unfiltered interaction capture is still running.

## Retained component fonts versus inherited page defaults (2026-09-12)

A second repeated font-input category is now separated from the independently
confirmed core font-list rewriting defect. The reference frame and candidate
`main#page` legitimately share `Roboto, Arial, sans-serif`. Material components
override that frame default with their own font-family tokens. Several
candidate labels instead omit the override and retain the page stack.

The new attribution requires a unique active reference Material font token
computing `Roboto`, traced from the text leaf without intervening overrides,
ambiguous declarations, missing ancestors or cycles. The candidate must have
complete normal/effective declaration ancestry through the unique `main#page`:
no intervening font-family or shorthand, an explicit matching page rule, and
the same longer list retained by core. More specific select and calendar
weekday attributions remain intact. Literal/unreviewed reference font rules,
intervening candidate overrides and parser-appended Helvetica lists do not
qualify for this category.

The finding is **unequal component authoring**, not a font-list normalization,
a renderer font-selection verdict or proof of current glyph paint. Restoring
component font intent must precede testing equal-input fallback/shaping. Do not
change the legitimate page reset globally to hide the omissions. The source
inventory and root-cause plan record this distinction. Git history confirms
the page stack and representative chip/card-title omissions in initial
showcase commit `2f44011`; later geometry edits did not supply those tokens.

Three new audit tests cover direct/inherited component tokens, 23 unsafe or
ambiguous input mutations, and 11 changes/deletions/duplications of report
claims. Validation reconstructs exact token, inheritance and retained-value
evidence from the pooled capture rather than trusting classification labels.
The focused audit suite passes **138/138** tests. The complete
`npm run parity:harness:check` suite passes **231/231**, with no skipped tests;
`git diff --check` is clean. No source styles, rendering, font assets,
thresholds or frozen runtime were changed.

A verified **491-record capture prefix**, including all **436 static cases**,
attributes **204** retained font-list differences: radio 24, expansion 12,
form-field 12, chips 24, tree 36, checkbox 12, card 12, slide-toggle 12 and
stepper 60. Another **138** retained font-list differences in that prefix
remain unresolved. All checkpoint result and paired tree digests validate;
partial-schema validation reports no errors. Neither full coverage nor input
equivalence is claimed while the remaining interaction cases are running.

With all static records present, the unchanged supplemental script was run:

`node scripts/audit-material-normal-line-boxes.mjs --base-url=http://127.0.0.1:4431 --checkpoint=artifacts/material-parity/context-complete-audit/checkpoint --output=artifacts/material-parity/normal-line-box-context-audit`

It completed **120 observations across 96 cases**, exit 0. A subsequent
**507-record** prefix audit loaded the new supplement against this run's exact
provenance with **zero missing observations, zero supplemental errors and zero
partial-schema validation errors**. This is fresh capture evidence, not reuse
of the older run's normal-line-box values or a claim that normal is universally
17px. The full unfiltered matrix continues in its original process.

## Context-qualified start/left alignment interpretation (2026-09-12)

The audit now explains a reference `text-align:start` versus retained/current
control `left` difference only when the captured reference leaf-to-root chain
proves a horizontal LTR context. Every node must have `normal` or `isolate`
bidi, `start`/`left` alignment, automatic last-line alignment and a reviewed
display type. The chain must reach the actual captured frame/overlay block
root, without missing or duplicate identities or cycles. An inline subtree is
not accepted as a containing-block boundary. No default direction is invented.

This is an observation-specific property interpretation, **not** a global
normalization or renderer fix. The original `start` and `left` values remain in
each difference, together with the entire computed ancestor chain. Records
explicitly retain `inputEquivalent:false` and `finalRasterVerified:false`:
equivalent physical alignment meaning does not certify equal line containers,
structure, other typography, location, bidi support or paint. RTL, plaintext,
vertical writing, non-auto last-line alignment, hidden and unknown contexts
remain unresolved. The existing real-browser counterexample is extended to
prove that LTR `isolate`, unlike `plaintext`, keeps Hebrew text's start edge
equivalent to physical left.

Validation independently rebuilds the interpretation from pooled reference
and candidate styles and captured ancestry. Deleting/duplicating a claim,
changing its values or scope, or changing ancestor bidi evidence is rejected,
even in partial-report validation. Three new audit tests exercise retained and
current-control text, 24 unsafe/missing-context mutations on both paths and 12
report mutations on both paths. Raw capture inputs are unchanged.

Verification:

- `node --test tests/material-parity/input-equivalence-audit.spec.mjs`:
  **135/135 passed**.
- `npm run parity:harness:check`: **228/228 passed**, including the real-browser
  normal/isolate/plaintext alignment proof; no skipped tests.
- A read-only **353-record prefix** of the running context capture was checked
  against checkpoint result SHA-256 values and paired input-tree digests. Its
  in-memory audit has **1,023** context-qualified retained alignment records,
  zero current-control alignment records at this stage, and no partial-schema
  validation errors. Coverage and input-equivalence verdicts both remain false.
  This prefix is not the complete enforced matrix or an acceptance report.
- `git diff --check`: clean.

The full unfiltered context capture continues in its original process. These
changes do not alter its imported capture-module graph, frozen browser build,
fixtures, renderer, reference styles or thresholds. Complete regenerated audit
reports and fresh supplemental evidence still await the complete capture.

## Capturing the missing computed text and clipping context (2026-09-12)

The prior capture cannot establish whether reference `text-align:start` is
physically equivalent to the candidate's `left`: it did not record computed
direction, writing mode or last-line alignment. The same capture omitted
kerning/shaping fields needed by the new Arial investigation and computed
`clip` needed by the calendar close-button investigation. Those values must
not be inferred from defaults, authored class names or screenshots.

`captureBrowserInputTree` now records twelve context properties for every
reference node and generated before/after pseudo-element: direction, writing
mode, bidi isolation, text alignment and last-line alignment, justification,
clip, kerning, text rendering, ligature mode, font features and font variations.
The returned tree declares `contextStyleEvidenceVersion:1` and the exact field
list. This is read-only capture outside the renderer; it changes no DOM,
fixtures, layout, state, typography, visual metric or gate threshold.

The real-browser collector test independently verifies inherited RTL from
outside the captured frame, vertical writing, local LTR override, last-line
justification, explicit shaping fields, pseudo-element overrides, overlay
inheritance and an actual zero-rectangle clip. DOM serialization, focused
element and frame width are unchanged by collection. All **3/3** browser
collector tests pass; they are now included in `parity:harness:check` rather
than relying on a separately remembered command.

The inventory preserves these declarations through pooling and reports legacy,
missing, empty or wrongly attributed node/pseudo-element fields separately as
`referenceContextGaps`. Complete acceptance requires none. Validation rebuilds
the gap list from pooled capture data and rejects changed/deleted gap claims.
Three focused context tests cover legacy/static/hover records, ten metadata or
field mutations and five report mutations. The complete harness passes
**224/224**: the previous 218, three new audit tests and three newly included
browser-collector tests. `git diff --check` is clean.

Regeneration against the preserved control-text baseline still inventories
**436/436 static + 1,875/1,875 interaction** cases. It correctly adds **2,324**
missing-context records (the main matrix plus 13 older supplemental cases).
All previous unresolved groups remain: **3,896** resolved-style attributions,
**883** current-control typography differences, **3,377** retained mappings or
stage fields and **11,101** retained typography differences. Generation exits
1; `--check` exits 1 for the same five groups without a stale-report mismatch.
This is stricter evidence accounting, not a new renderer regression.
No start/left equivalence or clipping verdict has been granted yet.

The next full capture uses the same frozen control-text browser runtime with
the enhanced collector, a new `artifacts/material-parity/context-complete-audit`
directory and the original unfiltered `--enforce --skip-build` matrix. Preserve
the old directory. After completion, collect fresh natural-line-box evidence
against the new checkpoint; the loader correctly rejects reusing that
supplement from another run. The thirteen older behavior/overlay/slider
supplemental cases also still need renewed context evidence.

The new unfiltered run has now started with
`node tests/material-parity/run-material-parity.mjs --enforce --skip-build`,
the frozen control-text browser root, the new context artifact directory,
port 4431, all family/profile/viewport/state filters cleared and restart interval
200. Its manifest declares all 436 static and 1,875 interaction cases with
enforcement enabled. An independent read of its first **47 completed checkpoint
records** verified result digests and paired tree digests; those observations
have **zero context gaps and zero inventory errors**. This is capture-prefix
validation only, not completion or visual acceptance of the whole run.

A further real-browser proof prevents an unsafe leaf-only alignment shortcut.
Horizontal LTR `start` matches `left`, RTL `start` matches `right`, and RTL
`start` differs from `left`. Crucially, an LTR leaf whose own `unicode-bidi` is
`normal` still aligns more than 100px away from `left` when its line container
uses `plaintext` and the text establishes RTL paragraph direction. This is
consistent with [CSS Text 3 section 8.3](https://www.w3.org/TR/2026/CRD-css-text-3-20260814/#bidi-linebox).
Any future accepted alignment representation must inspect the containing-line
ancestor context, not just the text leaf. No alignment normalization has been
added. All **4/4** standalone browser input-tree tests and the complete
**225/225** `npm run parity:harness:check` suite pass. The running matrix's
capture-module graph was not changed by this separate test/document increment.

## Normal tracking is a representation alias; shaping remains unequal (2026-09-12)

The largest repeated tracking group is now distinguished from genuine unequal
typography. [CSS Text 3, section 7.2](https://www.w3.org/TR/2026/CRD-css-text-3-20260814/#letter-spacing-property)
defines `letter-spacing: normal` as computed zero and describes the legacy
CSSOM serialization of zero as `normal`. Core `TextStyleParserService.parseSpacing`
also resolves both forms to numeric zero. This is a property-specific semantic
equivalence, not a screenshot-based waiver or an assumption about line-height,
font selection, alignment, glyph shaping or justification quality.

The new package-root browser proof is
`examples/material-showcase/src/app/normal-letter-spacing-audit.spec.ts`.
Six cases use local Roboto and Arial with `31`, `Primary action` and `office AV`;
each mounts independent surfaces with the same DOM/SiteData rules for `normal`,
`0px` and a `2px` sensitivity control. All six normal/zero pairs have identical
DOM Range widths, parsed core tracking zero, logical texture dimensions and
actual currently bound texture bytes. Each nonzero control increases both
widths. Every surface disposes to zero tracked meshes/materials/textures.
No final projected screen-raster or all-script shaping claim is made.

The extra equal-input advance assertion deliberately exposes an independent
failure: **Arial `office AV` is 61.671875 CSS pixels wide in the DOM but
62.5547 in the bound core texture**, under both normal and zero tracking.
Five cases pass; this sixth case retains its two failing `<0.1px` assertions.
The result repeated on all four runs, including the final cleanup-adjusted
test. The browser reports `font-kerning:auto` and `text-rendering:auto`.
A separate diagnostic canvas with the same font and tracking measures
62.5546875 with kerning auto, 61.671875 with normal, and 64.03125 with none.
The core canvas styling method sets the font and tracking but leaves kerning
at its default. This localizes a CSS-text/canvas-default shaping discrepancy;
it does **not** justify globally forcing normal kerning or adjusting fixtures.

Source finding `core-canvas-default-shaping-differs-from-css-text` records the
confirmed equal-input advance failure and the owning core text subsystem.
History traces the original canvas styling method to `2ec3152`; the finding
does not claim the current platform-specific measurement was observed then.
Implementation priority **5.15** requires explicit kerning/size/font controls,
retained text, wrapping, caret metrics and common measurement/paint semantics
before choosing the general correction. Neither renderer nor showcase input
was modified by this audit increment.

The audit now canonicalizes only the exact letter-spacing alias, while keeping
the original pooled styles untouched. Missing retained/current-paint values
remain gaps. The already-existing omitted-initial tracking rule now uses the
canonical zero form; no new inherited value is fabricated. Tiny nonzero pixel
tracking is preserved without the generic geometry rounding: an adversarial
`0.0001px` test initially caught that rounding issue. Other `normal` properties,
nonzero values, relative tokens, invalid strings and percentages stay distinct.
The documented normalization scope/evidence is also validated against the exact
policy, rejecting missing, altered and duplicated metadata.

On the unchanged complete **436 static + 1,875 interaction** capture, this
explains **3,754** retained and **1,182** current-control tracking comparisons.
Retained unequal-property observations fall **21,033 to 17,279** and unresolved
ones **14,855 to 11,101**. Control unequal-property observations fall
**7,979 to 6,797** and unresolved ones **2,065 to 883**. Mapping coverage remains
**7,570 retained / 2,215 current-control** comparisons; the unresolved retained
mapping/stage count remains **3,377**. There are **71** source findings.
The **3,896** unresolved resolved-style signatures also remain. These are
reporting/classification advances, not repaired rendering or completed input
equivalence. The existing green visual matrix was not rerun for report-only
and isolated diagnostic-test changes; final full-matrix acceptance remains due.

Verification command for the real browser reduction:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/normal-letter-spacing-audit.spec.ts`.
Chrome Headless 152 / Babylon 8.56.2 WebGL2 yields **5 pass / 1 diagnostic fail**,
exit 1. The known zoneless/Zone.js and global stylesheet font warnings do not
substitute for the proof's explicitly loaded local font. The new font alias is
loaded before mounting and removed after the suite.

`npm run parity:harness:check` passes **218/218** (129 focused audit tests plus
89 other harness tests). The focused normalization/source/weekday checks also
pass **7/7**. Full report generation exits 1 for the four unresolved groups
listed above; it preserves complete case coverage and does not use a partial
acceptance flag. The same full-evidence command with `--check` exits 1 for those
same four groups, with no stale-report mismatch. `git diff --check` is clean.

## Calendar weekday headers lose structure, full names and tokens (2026-09-12)

Source finding `fixture-calendar-weekday-structure-and-token-substitution`
traces the single-letter candidate spans to `87f7f83`. The packaged Material
month-view template authors a table header with seven `th scope="col"` cells.
Each contains a full weekday name in a `cdk-visually-hidden` span and a separate
`aria-hidden="true"` abbreviated label. A second header row contains the
seven-column divider. The candidate authors only seven single-text spans in
its date grid. This changes the original content, column-header semantics and
layout inputs before any renderer calculation.

The report now maps **231** abbreviated labels across **33** month-view states
using the complete ordered header and independently checked date/month context.
Both S entries and both T entries are disambiguated by the exact full-name and
column paths, not by matching text somewhere in the popup. Altered order,
missing sibling names, a different divider span, competing candidate names,
extra children, duplicate nodes or mismatched calendar context reject the
mapping. The same **231** omitted full names are preserved as individual,
classified gap records. Their hidden class is not treated as evidence of
harmlessness or computed clipping; no hidden-name paint sample is fabricated.

The abbreviated labels expose **693** raw retained-typography differences.
**462** have source and captured-stage attribution: 231 font-stack and 231 ink
substitutions. Reference labels inherit the calendar font token through the
table/header/span chain; candidate descendants omit that override until the
explicit generic page font stack. Reference column headers supply the calendar
header on-surface-variant ink token; candidate cells fix `#1d1b20`. Attribution
requires the original active rules, complete inheritance/omission chains and
matching normal/effective/retained values. These are retained registry inputs,
not proof of current glyph paint or physical font selection. The **231**
`normal` versus zero tracking differences remain unresolved.

The four focused `calendar weekday` tests cover the seven identities and
omissions, 18 contradictory structural variants, 14 token/ancestry mutations
and 13 modified/deleted/duplicated report variants. Validation replays mappings,
comparisons, omission records and attributed properties from the inventory,
including expected records so deletion cannot silently remove a discrepancy.
The first full harness run exposed a missing-stage robustness bug in the new
validator: deleting the retained section caused a throw. The new subset check
now defers to the enclosing validator's existing missing-stage error instead.
All five focused weekday/missing-stage tests pass after that correction.
The complete `npm run parity:harness:check` rerun passes **215/215**, including
**126** focused audit tests.

Full generation still inventories **436 static + 1,875 interaction cases**.
There are now **70** detected source findings, **7,570** retained comparisons
and **21,033** raw retained property differences. Unresolved retained
mapping/stage gaps fall **3,608 to 3,377**; unresolved retained property
differences rise **14,624 to 14,855** because tracking is newly exposed, not
silently normalized. The complete audit continues to fail for those two groups,
**3,896** resolved-style attributions and **2,065** current-control typography
differences. Input equivalence and audit completion remain false.
Regeneration and the explicit full-evidence `--check` command both exit 1 for
those same four unresolved groups, with no stale-report mismatch. The prior
complete enforced visual run is unchanged and was not rerun for these
report-only edits.

The implementation plan requires restoring original header/label/divider
structure and typography tokens before investigating any equal-input table,
clipping, fallback, tracking or baseline defect. This increment changes only
audit infrastructure, tests, findings and the plan; no fixture, reference,
renderer, capture runtime or visual gate was changed.

## Calendar close control is omitted, not a missing core paint sample (2026-09-12)

Source finding `fixture-calendar-close-control-omitted` identifies the omitted
control in the candidate popup introduced by `87f7f83`. The current authored
branch at `astylar.component.ts:1054` constructs a header, date/year grid and
selection marker but no close button. The packaged Material template in
`@angular/material/fesm2022/datepicker.mjs` contains a raised close button,
binds `cdk-visually-hidden` to the inverse of `_closeButtonFocused`, updates that
flag on focus/blur, and invokes `datepicker.close()` on click. That package
file is now included in the audit's source fingerprints (30 files total).
The source declares these behaviors; this increment does not claim to have
executed a new live focus/activation test.

All **41** previously unexplained current-control mapping gaps are this
omission: **33 month-view** and **8 year-view** states. Each gap is retained
with `application-plugin-authoring-defect`, `inputEquivalent:false` and
`finalRasterVerified:false`. Exact evidence includes the close label/button,
dialog and content ancestry, sibling calendar/order, matching date/range
context, complete authored candidate popup subtree, and core capture revision.
Unknown candidate controls, duplicate nodes, mismatched context, changed
reference controls, missing styles/rules or a candidate counterpart prevent
the reviewed attribution. No candidate paint or typography is fabricated.

The retained-text stage now splits these same **41** omissions out of its
anonymous-reference groups. Other anonymous text remains unresolved. Eight
year-view groups contained only the missing close label, so unresolved retained
mapping/stage gaps fall **3,616 to 3,608**; this does not remove any reference
node. Both stages replay the structural proof during validation, including in
partial mode. Removing, duplicating or altering an omission record fails.

Do not treat `cdk-visually-hidden` as proof of harmless/non-rendered text. In
the captured light desktop activation, the button has computed width **64px**
and height **40px**, despite the hidden rule's authored 1px dimensions. The
rule also declares `clip:rect(0px,0px,0px,0px)`, but the existing tree capture
does not include computed `clip`. All 41 omission records therefore preserve
`computedClip:null`, an unknown visibility verdict and unverified focus/reveal
behavior. The implementation plan requires the original control, clipping,
focus transitions, activation and focus restoration, tested live in both
views. Escape and outside-click dismissal are not equivalent substitutes.

The focused `calendar close omission` tests pass **4/4**, including both
views, 40 contradictory input variants, a no-hidden-class control and 20
deleted/duplicated/tampered report variants. The first full harness run had
**210/211** passing: its fingerprint-count assertion still expected 29 files.
That assertion was updated to 30 and explicitly checks the packaged datepicker
source. The rerun of `npm run parity:harness:check` passes **211/211** (122
focused audit tests). No renderer, reference, fixture, capture runtime or
visual threshold changed in this increment.

Full report regeneration inventories **436 static + 1,875 interaction cases**,
with **69** detected source findings and **2,215** current control-text
comparisons. The 41 control gaps are now explained omissions, not equivalence.
The complete audit still correctly exits 1 for **3,896** resolved-style
attributions, **2,065** control typography differences, **3,608** retained
mapping/stage gaps and **14,624** retained typography differences. This is
bounded attribution progress, not completion of the input-equivalence audit.
The generator and the same full-evidence command with `--check` produce those
same four remaining failure groups; no stale-report mismatch was reported.
The existing complete enforced visual run remains the runtime baseline; it
was not rerun for this audit-report-only increment.

## Calendar period text/vector composition is explicitly unequal (2026-09-12)

Source finding `fixture-calendar-period-vector-flattened-into-text` traces the
period header change to `d973f84`: a text span beside an SVG triangle became a
single value string ending in `▾` or `▴`. The reference authors a 10 by 5 SVG
with polygon points `0,0 5,5 10,0`; year view inverts that vector with a CSS
transform. It also supplies a description relationship to the live-period
label, which the candidate omits. The original vector geometry, transform,
period text, complete candidate string, and both accessibility inputs now
remain explicit evidence rather than an unexplained control-text mapping gap.

The mapping requires the independently reviewed day/year context, exact
period-button/label/text/vector ancestry, original polygon and viewBox, expected
view-dependent transform, live-label reference, and unique current candidate
control. It covers **41** open states: **33** month and **8** year views. It
never strips the appended glyph or claims the full strings match. Typography
compares the common period prefix using the actual single-font control texture
inputs; the compound text/vector substitution remains `inputEquivalent:false`.
The retained-to-control routing likewise carries both reference and candidate
strings instead of manufacturing a text-registry entry.

This exposes **164** raw typography differences. **123** are source-attributed:
41 each for font family, tracking and ink. Reference period text inherits the
text-button font/tracking tokens. Its ink is a two-step declaration chain:
the text-button color reads `--mat-button-text-label-text-color`, and the
period-button rule overrides that variable with the calendar on-surface-variant
token. The candidate header omits component font/tracking and supplies fixed
ink. Both original token rules are required evidence; a direct color rule on
the period button must not be invented. The **41 normal-line-height differences
remain unresolved**, separate from the known unequal vector/text composition.

The report now contains **2,215** current control-text comparisons, **7,979**
raw typography differences and **68** detected source findings. Current-control
mapping/stage gaps fall **123 to 41**: the remaining reference controls are
"Close calendar", not the period header. Unresolved control typography rises
**2,024 to 2,065** because newly exposed normal-line-height observations stay
enforced. Full regeneration still correctly exits 1 for 3,896 resolved-style
attributions, 41 control mappings/stages, 2,065 control typography differences,
3,616 retained mappings/stages and 14,624 retained typography differences. All
436 static and 1,875 interaction cases remain inventoried; this is not audit
completion or proof of equivalent rendering.

`node --test --test-name-pattern='calendar period'
tests/material-parity/input-equivalence-audit.spec.mjs` passes **4/4**, covering
both views, 40 contradictory mapping/vector/paint variants, ten typography
witness mutations and ten altered report records. Validation replays the
composition and typography witnesses even with partial coverage. The full
`npm run parity:harness:check` passes **207/207** (118 focused audit tests).
No fixture, reference, renderer, capture runtime or visual gate changed. The
implementation plan requires restoring the original span/vector, CSS inversion,
tokens and accessible description, not adjusting a replacement glyph or offset.

## Bottom-sheet list structure and label token substitutions traced (2026-09-12)

The two bottom-sheet labels now have exact reference-to-control mappings in
all **25** captured open states (**50** current textures). Mapping requires the
ordered Share/Copy link anchor/content/primary-label paths, a unique Material
navigation list and bottom-sheet overlay chain, and the matching ordered
candidate value buttons inside their panel/overlay/page chain. A missing or
reordered sibling, different link, altered ancestry or stale paint cannot be
accepted merely because some text elsewhere matches.

This is explicitly **unequal structure**, not an approved flattening. The
reference `sheetContent` in `reference.component.ts` contains two `href="#"`
anchors inside `mat-nav-list`; the candidate uses buttons and drops the nested
content/label wrappers. The generated reference label rules include nowrap,
ellipsis and hidden overflow, unlike the candidate's normal control text.
The reference dialog name is "Sharing options" while the candidate authors
"Open bottom sheet"; both names and their unequal flag are retained. Source
also shows Share routed through the candidate's generic `-dismiss` close
handler, whereas the reference authors an anchor, not a dismiss action.
This establishes an authored behavior difference, not a new live-click proof.

Source finding `fixture-bottom-sheet-list-structure-and-token-substitution`
traces the flattening and option rule to `2f44011`, with the generic control
font reset added in `af04845`. Exact captured declaration/normal/effective/
current-texture witnesses attribute **200** differences: 50 each for font
family, line-height, tracking and ink. The reference supplies Material's
Roboto, explicit 24px line-height, .496px tracking and on-surface label tokens;
the candidate supplies a generic stack, omits line-height/tracking and uses
the page's `theme.onSurface`. At the same 16px font size, actual candidate
paint receives a 19px normal line box. This is not an equal-input test of core
normal metrics: the explicit reference line-height was removed first.

All **50 `start` versus `left` alignment differences remain unresolved**.
The mapping does not silently normalize direction-sensitive alignment. Other
geometry, overflow, semantics, navigation/dismissal, live paint and responsive
constraints remain separate audit obligations. The implementation plan now
requires original list/anchor/label structure and component tokens before any
core diagnosis or removal of the existing fixed-size compensations.

The report now contains **2,174** current control-text comparisons and **7,815**
raw typography differences. Control mapping/stage gaps fall **173 to 123**;
unresolved retained-text mapping/stage gaps fall **3,641 to 3,616** by routing
these exact labels to actual control paint rather than inventing registry
entries. Unresolved control typography rises **1,974 to 2,024** because the new
alignment differences remain enforced. All 436 static and 1,875 interaction
cases and **67** detected source findings are retained. Full report generation
still correctly exits 1 for the remaining 3,896 resolved-style attributions,
123 control mappings/stages, 2,024 control typography differences, 3,616 retained
mappings/stages and 14,624 retained typography differences.

`node --test --test-name-pattern='bottom-sheet item|snackbar action'
tests/material-parity/input-equivalence-audit.spec.mjs` passes **9/9**. The four
new bottom-sheet tests include 28 contradictory mapping/paint cases, 16
declaration-witness cases and eight report mutations. Shared overlay validation
replays both families' exact mapping and typography evidence even in partial
coverage mode. `npm run parity:harness:check` passes **203/203** (114 focused
audit tests). No fixture, reference, renderer, capture runtime or visual gate
changed. Calendar header text/icon correspondence is the remaining current
control mapping investigation; the old supplemental captures still need their
separate freshness/provenance work.

## Snackbar action identity and token substitutions traced (2026-09-12)

The action is no longer an anonymous label/current-texture mapping gap. A new
exact correspondence requires the complete Material label/action/actions/
simple-snackbar/live-region/container/overlay chain, a unique sibling message,
and the candidate action/surface/overlay/page chain with that same message.
This identifies **34** current `UNDO` textures across the captured open states.
It does not certify equal wrapper layout, live-region semantics, visibility,
placement, lifetime, interaction, or final raster. The message itself still has
separate retained-text audit obligations; no registry entry is fabricated for
the action's core-owned control texture.

New source finding `fixture-snackbar-action-typography-substitution` traces the
shared `.overlay-dismiss` rule to `2f44011` and the generic control font reset
to `af04845`. The reference action computes Roboto, 14px, .096px tracking and
snackbar inverse-primary ink; the candidate texture receives the generic
Roboto/Arial/sans-serif stack, 16px, zero tracking and `theme.primary` ink.
The captured token/reset/rule/normal/effective/current-paint witnesses attribute
**102 differences**: 34 each in font family, tracking and color. These remain
unequal inputs, not accepted representational differences or core paint faults.

The **34 font-size and 34 normal-line-height differences remain unresolved**
pending their defaults/inheritance and actual metric trace. In these captures
the candidate paints a 19px line box; the reference declaration is `normal`.
That keyword cannot simply be equated to an observed candidate number, and the
earlier static 14px normal-line-box supplement does not cover these overlay
states. The implementation plan explicitly preserves this distinction and the
separate snackbar intrinsic-width/placement/behavior work.

The report now has **2,124** control-text comparisons, **7,565** raw control
typography differences and **173** remaining control mapping/stage gaps (down
from 241). The unresolved control-typography count rises from 1,906 to **1,974**
because the newly mapped size/line-height differences are honestly exposed.
All 436 static and 1,875 interaction cases remain inventoried; all **66** source
findings are detected. The full report regeneration intentionally exits 1 for
the remaining 3,896 resolved-style attributions, 173 control mappings/stages,
1,974 control typography differences, 3,641 retained mappings/stages and 14,624
retained typography differences. This is not audit acceptance.

`node --test --test-name-pattern='snackbar action'
tests/material-parity/input-equivalence-audit.spec.mjs` passes **5/5**, including
25 contradictory mapping/paint cases, 14 declaration-witness cases and 12
report mutations. Mapping and typography witnesses are replayed from captured
inputs even under partial-coverage validation; detached claims do not pass.
`npm run parity:harness:check` passes **199/199** (110 focused audit tests).
No renderer, fixture, reference, capture runtime or visual threshold changed.
The bottom-sheet action mappings remain the next overlay-control investigation.

## Calendar navigation replaces vectors and retains wrong year-view names (2026-09-12)

New source finding `fixture-calendar-navigation-svg-icons-replaced-by-text-glyphs`
traces the previous/next glyph controls to `87f7f83`. The reference supplies
explicit 24 by 24 SVG chevrons; the candidate supplies `‹` and `›` to a text
control. These are different geometric inputs even if screenshots look close.
Core should receive the original vector geometry; glyph size/offset calibration
would not fix that input inequality.

The shared navigation-icon inspector now recognizes calendar controls only with
the independently reviewed month/range context and exact header ancestry. It
requires a unique SVG and exact path, no extra text/vector descendants, one
authored control and its current core-owned glyph texture, and captured styles
for the reference control/vector and candidate normal/effective/paint stages.
The raw vector and glyph inputs are preserved as an explicit substitution, not
invented reference text or a typography comparison.

The full matrix has **82** such substitutions in **41** open calendar states.
In **16** year-view observations the reference labels also say "Previous/Next
24 years" while the candidate still says "Previous/Next month". Both names and
the unequal-name flag remain in the report. This naming defect is separate from
the existing frozen navigation-state finding and does not establish functional
navigation parity. The root-cause implementation plan now names both vector
input restoration and view-dependent accessible naming.

Control mapping/stage gaps fall from **323 to 241**; all prior typography gaps
remain. Month/range header text and dropdown-arrow substitutions are still open.
Validation replays each calendar icon attribution from the captured inventory,
including vector geometry, calendar context and names, even in partial mode.
`node --test --test-name-pattern='calendar (navigation|icon|vector)'
tests/material-parity/input-equivalence-audit.spec.mjs` passes **3/3**, covering
both directions/views, 24 contradictory mapping/paint cases and six evidence
mutations. An initial test-only failure came from omitting the capture schema's
`pseudoElements` array on a deliberately added extra label; adding that required
empty array lets the intended extra-text rejection be tested.

`npm run parity:harness:check` passes **194/194** (105 focused audit tests),
including the existing paginator and calendar day/year attribution coverage.

Full report regeneration still returns the intended exit 1: 3,896 resolved-style
attributions, 241 control mappings/stages, 1,906 control typography differences,
3,641 retained mappings/stages and 14,624 retained typography differences remain
unresolved. It covers all 436 static and 1,875 interaction cases and detects 65
source findings. No fixture, renderer, capture runtime or visual gate changed.

## Calendar multi-year text correspondence and typography traced (2026-09-12)

The shared calendar cell correspondence checker now also recognizes the exact
multi-year-view table/cell/button/leaf ancestry. A year maps only when its unique
accessible year agrees with its leaf text and the authored/current candidate
label, the captured live-label range spans 24 years and contains that year, and
the candidate header names the same range. A day view, wrong range or duplicate
owner cannot be matched by its numeric text. The reference accessibility label
uses "2016 to 2039" while the candidate button uses "2016 – 2039 ▴"; comparing
the range endpoints here establishes context only, not equivalent header text,
icon geometry or accessible naming. Those remain separate audit obligations.

This adds **192** year text comparisons across **8** captured interaction cases.
There are **768** new raw typography differences: 192 each for font family,
line-height, tracking and ink. Source finding
`fixture-calendar-year-typography-substitution` traces `.datepicker-year` to
`d973f84`. Separate year declaration witnesses classify **576** font/line-height/
ink differences as unequal authored inputs. They do not reuse the day-specific
cell rule or claim the renderer caused the inequality. The root-cause plan now
requires restoring the inner text structure and original tokens in both views.

The audit contains **2,090** actual control-text comparisons and **323** remaining
control mapping/stage gaps (down from 707). It preserves all **7,395** raw control
typography differences, of which **1,906** still need attribution. The 192 year
tracking differences remain open alongside the existing 990 day tracking cases.
The mapping is revalidated against captured ancestry/range evidence even when
partial coverage is allowed. No registry text entry is fabricated.

`npm run parity:harness:check` passes **191/191** (102 focused audit tests),
including 12 malformed/contradictory year-mapping variants, six independent
typography witness contradictions and tampered range evidence. Existing day
mapping/typography tests still pass. Full report regeneration validates the
436 static / 1,875 interaction cases and detects **64** source findings; it
correctly returns exit 1 for the remaining audit gaps. No fixture, renderer,
capture runtime or visual gate changed.

## Calendar typography differences traced to authored substitutions (2026-09-12)

The new source finding `fixture-calendar-day-typography-substitution` and
`reviewed-calendar-day-typography-input` attribution explain **2,970** captured
differences: **990 each** in font family, line-height and ink. They remain unequal
inputs; no values or raw differences are normalized away.

The attribution requires the exact reviewed full-date/context mapping, unique
captured component rules and normal/effective/actual texture evidence. For font
family it checks the reference calendar token and label inheritance, plus the
candidate document reset and missing calendar font override. For line-height it
requires the reference inner `line-height:1`, matching font size and a complete
candidate normal/effective omission chain to the page. For ink it requires the
reference date-text token and the candidate's explicit #1d1b20 reaching actual
paint unchanged. Conflicting leaf/inline declarations, missing tokens, duplicate
rules, intervening line-height, broken ancestry and changed paint inputs leave
the property unresolved.

History confirms that `87f7f83` introduced the fixed cell ink and omitted
typography; `c64397c` changed the day span into a button while retaining the flat
text representation. The reference retains a distinct inner label with its own
line-height and ink. The root-cause plan now explicitly calls for restoring
those original inputs and structure through core composition, not translating
the observed 17px texture height into a fixture rule or moving a baseline.
This does not exonerate core text metrics: existing equal-input metric failures
remain separate, and any remaining discrepancy after input restoration needs
its own core proof.

`npm run parity:harness:check` passes **188/188** (99 focused audit tests), with
18 additional contradictory-input controls and an assertion that the source
capture is not mutated. Full report regeneration validates the same 436 static /
1,875 interaction cases and detects **63** source findings. It correctly exits 1:
**1,714** control typography differences remain unresolved, including the 990
calendar normal-versus-zero tracking comparisons. The other current gaps remain
3,896 resolved-style attributions, 707 control mappings/stages, 3,641 retained
mapping/stage gaps and 14,624 retained typography differences. No fixture,
renderer, capture runtime or acceptance threshold changed.

## Calendar day text now has date-and-context correspondence (2026-09-12)

The full matrix's datepicker controls use generated reference nodes without
shared day IDs. The new `reviewed-material-calendar-day-label` mapping requires
a unique full accessible date, the exact month-view table/cell/button/leaf path,
matching reference month/year live label, and the candidate popup/grid/header/
month-marker context plus unique day ID, accessible day, authored text and
actual core texture text. It rejects ambiguous identities, wrong month/year,
impossible dates, year-view ancestry, broken wrappers and stale texture text.
Date validation is not frozen to the capture date; leap-year controls are tested.

Across all **99** captured datepicker interaction cases, the mapping exposes
**990** day text comparisons in **33** month-view states. Each reveals four raw
differences: reference Roboto versus candidate Roboto/Arial/sans-serif; reference
14px line-height versus actual control texture 17px; reference normal tracking
versus numeric zero; and reference rgb(29,27,30) versus candidate #1d1b20 ink.
All **3,960** differences remain explicitly unresolved pending per-property
attribution. Correspondence is not equal input, selected-state/accessibility
equivalence, table/grid equivalence, or raster acceptance.

The retained-text report routes these exact day owners to their actual core
control-texture stage rather than inventing text-registry entries. Anonymous
weekday/header/marker, accessibility and icon owners remain independently open.
Year-view labels are now also explicit unmatched reference control candidates,
not silently mistaken for month days. Hence the overall mapping-gap count drops
from **1,505 to 707** rather than by the full 990 mapped days. Full current-texture
comparisons increase from **908 to 1,898**; unresolved control typography rises
from **724 to 4,684**, honestly exposing previously unexamined differences.

Source tracing already narrows the next attribution work: captured
`.mat-calendar-body-cell-content` supplies `line-height:1` and the date ink token;
`.mat-calendar-body-cell` supplies the calendar font token. Candidate
`.datepicker-cell` hardcodes ink and omits both line-height and font family.
Commit `c64397c` changed the day from a span to a button without the reference's
inner text wrapper, and the current texture uses the document control font
stack. This points to unequal authored typography before any claim of a core
text defect. Preserve the original reference inner line box when planning the
fix; do not tune its replacement control's baseline to match output.

Verification: `npm run parity:harness:check` passes **186/186** (97 focused audit
tests), including 18 contradictory/malformed mapping variants, leap-year cases,
and tampered report evidence. The validator recomputes the calendar mapping from
captured inventory even in partial mode. The full-report generator using the
explicit control-text and normal-line-box paths completes with the intended
exit 1: input-equivalence acceptance remains unmet. It validates all paired
trees and reports 436/436 static and 1,875/1,875 interaction coverage. No fixture,
renderer, capture runtime, input style or visual gate changed.

## Private tab text paint observed independently of CSS (2026-09-12)

New diagnostic `material-plugin/tab-panel-input-audit.spec.ts` mounts the public
packed Astylar surface with the actual Material plugin three times. A delegating
spy records actual `fillText` state, then selects only calls belonging to the
texture bound to the tab content plane. It does not infer paint from plugin data
or manufacture a core retained-text entry.

With CSS serif/700, 32px line-height, 2px tracking and #123456 ink, changing CSS
font-size from 24px to 30px leaves private paint at `32px Roboto, Arial,
sans-serif`. Keeping CSS 24px but changing data font-size from 16 to 20 changes
private paint to 40px. All three 240 by 48 CSS boxes bind a 480 by 96 texture;
ink remains data-driven #ff0000, x remains zero, and baseline y is respectively
58.5, 58.5 and 61.125 backing pixels. These backing observations are **not CSS
layout inputs**. Surface disposal reports zero meshes, materials and textures.

This runtime evidence supports existing source findings
`plugin-tab-panel-competing-text-renderer` and `plugin-tab-panel-baseline-offset`.
The plugin owns glyph/font/baseline decisions that should belong to core text
paint; transition orchestration can remain plugin functionality. This is an
authoring/ownership defect, not evidence that core fails equivalent text input.
The characterization deliberately asserts current unequal behavior to identify
its owner; a later implementation must replace it with equal-input acceptance.
No renderer or showcase fixture was changed. Matrix tab paint gaps remain open;
this bounded test does not supply per-case current-paint capture.

Verification: `npm --prefix examples/material-showcase test -- --watch=false
--browsers=ChromeHeadless --include=src/app/material-plugin/tab-panel-input-audit.spec.ts`
passes **1/1** on Chrome Headless 152 / Babylon 8.56.2 WebGL2. The initial failure
was a test comparing Babylon Size's prototype with an object literal; explicit
width/height assertions correct that test without changing expected dimensions.
Karma reports the existing Zone.js/zoneless warning and missing global Roboto
URLs. Assertions observe font instructions, not the physical fallback font,
glyph raster, text advance, or final baseline alignment; those claims are not
made from this run.

`npm run parity:harness:check` passes **182/182** after adding the proof to the
report inventory and source fingerprints. No classification gap was waived.

The fresh, unfiltered enforced control-text matrix also completed with exit 0:
**436/436 static and 1,875/1,875 interactions pass**, including all configured
mobile interactions. Evidence is
`artifacts/material-parity/control-text-complete-audit/latest-report.json`.
Static minimum SSIM 0.965296, maximum edge error 0.984px, text 428/428;
interaction minimum SSIM 0.954514, text 2,116/2,116 and focused rasters 880/880.
These are output gates, not input-equivalence acceptance. Remaining anonymous
text, style and structure differences still require classification.

Regenerated the machine/human report using the explicit full control-text and
normal-line-box evidence paths above, then ran the identical command with
`--check`. Both return exit 1 for the same honest incomplete-audit gates; the
check reports no stale-file mismatch. There are **8,139** unique style
differences / **380,428** occurrences and **62** source findings. Remaining
root-cause attributions: **3,896** resolved-style differences, **1,505** control
text mapping/stage gaps, **724** control typography differences, **3,641**
retained-text mapping/stage gaps and **14,624** retained typography differences.
The generated reports remain working audit artifacts, not accepted deliverables.
The full inventory now has 908 control-text and 7,339 retained-text comparisons.
Next coverage work must include interaction-only generated text/control owners
(particularly calendar and popup entries); the static mapping work alone does
not cover those paths. No raw difference or failing acceptance gate is removed.

## Stepper panel omission is now classified per captured state (2026-09-12)

Source finding `fixture-stepper-inactive-panel-omitted` traces the one-panel
candidate to the initial showcase commit `2f44011`. Material instantiates both
panels; the inactive panel remains inert, hidden, zero-height and translated.
Candidate source instead changes the text of a single `#stepper-content` node.
This is unequal authored structure, not a public-API-required representation or
a core failure to paint the active text.

The audit records `reviewed-stepper-panel-substitution` only after checking the
exact active text-owner mapping, both unique reference panel identities,
inactive direction/state/visibility and candidate single-panel structure. Each
record retains both texts, active mapping, reference panel/leaf styles and
candidate normal/effective styles. Validation recomputes this evidence from the
captured inventory; false equivalence claims or altered records fail even in
partial mode. The current panel's typography remains separately compared.

Checked **492** checkpoint result hashes and filenames (436 static plus all
56 stepper interactions), with zero paired-tree errors. The omission is
classified in **12 static and 56 interaction cases**. Static gap records remain
66: 30 hidden-stage explanations, 12 stepper omissions and 24 unresolved
select-caret/tab-panel records. In the 16 stepper activate/activate-leave cases,
the original grouped gap is split so that reference "Editable" accessibility
text and "create" icon text remain unresolved independently of the omitted
panel. No text owner is dropped or mapped by string alone.

Focused audit tests **93/93** and `npm run parity:harness:check` **182/182** pass,
including both selected panel directions,
contradictory/missing state, duplicate identities, incomplete styles, extra
candidate panels, tampered evidence and unrelated anonymous text. No fixture,
renderer, capture runtime or visual threshold changed. The complete matrix
and remaining structural/typography review are still in progress.

## Select value differences traced to omitted trigger tokens and fixed ink (2026-09-12)

Commit `f286fb1` introduced the replacement `span#select-value` while making
`.select-control` text transparent. The added value rule fixes its position,
height, font size and enabled/disabled ink, but does not translate Material's
font-family, line-height or tracking tokens. New source finding
`fixture-select-value-typography-substitution` records this as an application/
plugin authoring defect, not a demonstrated renderer defect.

All **39 static select-value differences** now have
`reviewed-select-value-token-input` attribution. Each of the 12 exact text paths
inherits `.mat-mdc-select` component tokens and computes Roboto, 24px line-height
and 0.496px tracking. The candidate's full normal/effective ancestry instead
shows the page font stack (Roboto, Arial, sans-serif) or omits line-height and
tracking; retained core text has that font stack, normal line-height and zero
tracking. The 3 dark-theme observations also inherit reference on-surface ink
`rgb(230, 225, 229)` while the candidate explicitly authors and retains
`#1d1b20`. A 24px element height is not a 24px line-height declaration.

Attribution requires the captured token rule, unchanged computed property on
each intervening reference wrapper, no intervening authored override, and
candidate declarations/retained values supporting the identified omission or
fixed ink. Missing evidence, contradictory ancestry or altered token rules
leave the difference unresolved. No computed value is inserted into a missing
candidate declaration. The raw **3,825** retained-property differences remain;
39 additional records are now classified rather than silently normalized.

Verification: **436** static checkpoint result hashes checked, zero paired-tree
inventory errors; focused audit tests **89/89** and
`npm run parity:harness:check` **178/178** pass. The full interaction matrix is
still running independently. No renderer, fixture or visual threshold changed.

## Select value text now has an exact wrapper-path mapping (2026-09-12)

The reference template's `mat-select#select-control` owns a generated
`mat-select-value-N > .mat-mdc-select-value-text > .mat-mdc-select-min-line`
chain. The candidate explicitly authors `#select-primary >
#select-input-region > span#select-value`. The audit now joins these text owners
only through their unique tag/ID/class ancestry, combobox role, generated-ID
shape and identical direct text. It does not equate the wrappers or look up
arbitrary nodes by the string "Team".

Across the 436 current static cases, this adds **12** retained-text comparisons,
removes **24** identity gap records and exposes **39** previously uncompared
property differences: 12 each in font family, line height and letter spacing,
plus 3 in color. These remain unattributed pending declaration/history review.
Total retained comparisons are **1,402**, property differences **3,825**, and
gap records **66**, of which 30 have hidden-stage attribution and 36 remain
unresolved (select caret, inactive stepper content and tab-panel text).

Focused audit tests **87/87** and `npm run parity:harness:check` **176/176** pass.
The tests exercise Team/Solo content, generated-ID and combobox-role failures,
duplicate owners, invalid ancestry, nested children and text mismatches. The
candidate caret remains a separate gap, not consumed as selected-value text.
Neither inputs nor the runtime collector changed; input equivalence remains
unproven and the complete interaction audit is still in progress.

## Hidden retained-text absence now has provenance-bound attribution (2026-09-12)

The audit keeps the original missing-registry gap record but can attribute it
as `reviewed-display-none-text-stage` when complete, unique captured ancestry
proves candidate `display: none` in both normal and effective inputs. Reference
text must independently be unpainted through ancestor `display: none` or the
leaf's computed `visibility: hidden`; ancestor visibility alone is insufficient
because descendants can override it. Opacity, missing styles, incomplete roots,
ambiguous identities and invalid core provenance cannot supply this explanation.

Each annotated record retains both full style chains, the hiding nodes,
reference mechanism, exact text mapping and core revision. Validation recomputes
the evidence against the pooled full-tree inventory, including in partial mode.
Detached or edited explanations fail; copies of the chain styles prevent an
annotation edit from mutating the source inventory. This explains stage absence
only and explicitly keeps `inputEquivalent: false`. Independent declared-input,
typography, collapse and structural discrepancies are not waived.

All **436 current static checkpoint hashes and filenames** were checked before
loading their paired tree artifacts. With zero inventory errors, **30 of 90**
retained-text gap records now carry the explanation: 12 expansion labels use
reference leaf visibility; 6 each of form-field, input and select labels use
reference ancestor display. All 90 records remain. The **60 unresolved** records
are select (36), stepper (12) and tabs (12). The **1,390 comparisons** and
**3,786 retained-property differences** are unchanged. This is static evidence,
not completion of the full interaction audit.

Verification: focused audit tests **86/86** and
`npm run parity:harness:check` **175/175** pass. Tests cover visibility overrides,
opacity-only hiding, normal/effective disagreement, incomplete/duplicated/cyclic
ancestry, missing fields, invalid source/revision, different text, detached
evidence and false equivalence claims. No renderer, fixture, capture runtime,
reference style or benchmark threshold changed.

## Expansion collapse and flow substitution traced to fixture history (2026-09-12)

Source finding `fixture-expansion-flow-and-collapse-substitution` records an
application/plugin authoring defect, not a confirmed core defect. Commit
`6e1c156` replaced expansion content flow with an absolutely positioned paragraph,
state-dependent display and density-specific vertical offsets. Commit `a0f3328`
introduced the nested text wrapper with `top: -1px`. Current source retains that
offset and makes the label absolute at `left: 24px`.

The fresh `control-text-complete-audit/expansion/light/desktop` input trees show
the reference paragraph as `position: static`, `display: block`,
`visibility: hidden`, height 24px and margin 16px 0. Its body has padding
0 24px 16px; the flex content region is hidden, while its grid wrapper authors
`grid-template-rows: 0fr` and computes a zero-height row. Candidate paragraph
inputs instead contain `position: absolute`, `display: none`, margin 0 and
padding 0 24px. Its nested label retains the -1px/24px offset. These are different
layout and collapse inputs even though neither closed panel paints the text.

All 30 static missing-retained-entry gaps inspected have a candidate
`display: none` on the label or an ancestor: 12 expansion labels and 6 each for
form-field, input and select compact labels. Core child creation explicitly
skips display-none children in `element-creation.service.ts` before allocating
their elements. This explains the absent entries; it does not excuse unequal
declared styles. The compact reference labels have a display-none parent,
whereas expansion uses visibility and collapsed layout. A future visibility
attribution must preserve that distinction, inspect complete ancestry and
retain all independent typography/structure differences. These 30 gaps have
not yet been waived or removed from the report.

Next proof: translate the reference expansion wrapper, normal-flow paragraph,
padding/margins and collapse declarations without measured-size replacements;
then test open/closed and density variants before assigning any residual failure
to core grid sizing, intrinsic flow or text placement. No fixture or renderer
implementation was changed for this finding.

Verification: `node --test tests/material-parity/input-equivalence-audit.spec.mjs`
passes 82/82, including the new source-classification/history assertions;
`npm run parity:harness:check` passes 171/171. `git diff --check` passes.
The unfiltered control-text matrix remains in progress; these focused results
do not establish final full-matrix or input-equivalence acceptance.

## Retained-text gaps now route exact control labels to the authoritative stage (2026-09-12)

The registry audit now records `controlTextMappings` for exact reviewed Material
button and tab labels whose current text is already compared by the core
control-texture audit. This does not fabricate a registry entry, merge style
stages or infer a mapping from matching strings. Each routing record retains
the shared control identity, reference and candidate node, text, source and
revision; validation requires the corresponding unique control comparison.
Missing paint fields and unequal paint inputs remain enforced in that stage.

On the **436 current static cases**, **156 labels** are routed explicitly. This
removes **132 redundant registry-stage gap records**, reducing retained gaps
from **222 to 90**. The retained comparisons (**1,390**) and retained-property
differences (**3,786**) are unchanged. Remaining gaps include anonymous noncontrol
text, missing field/expansion label entries, and select value/caret structures;
none was suppressed by this change. Paginator vector substitutions remain in
their separate inventory.

Focused audit tests pass **82/82** and `npm run parity:harness:check` passes
**171/171**. They cover absent registry entries with
valid current control paint, unrelated anonymous text, missing/stale/ambiguous
control identity and source, incomplete current-paint fields, tab value labels,
detached/duplicated routing records and false input-equivalence claims. Original
input records are unchanged, and routing cannot make an input difference pass.
No fixture, renderer, runtime capture or full-matrix configuration changed.

## Static normal-line-height stage differences are now individually attributed (2026-09-12)

The report builder now accepts an explicit `--normal-line-box-report` path and
uses the independently validated observations in its control-typography stage.
Unknown, empty or repeated CLI options fail. Missing observations remain
visible, and a selected invalid report is an evidence error even in partial
diagnostic mode. No older report is used as a fallback.

Across all **436 current static cases**, **120** raw `normal`/17px differences
now have `reviewed-normal-line-box-stage-comparison` attribution, classified as
an audit stage-comparison defect rather than a renderer defect or accepted
fixture substitution. Each original browser value, normal/effective declaration
and current paint value remains intact. The report retains the exact natural
measurement and its hashes, plus the unique candidate ancestry proving that
no explicit line-height or font shorthand supplied a substitute value. A
different observed height remains an unresolved comparison, not an automatic
core-defect verdict when other typography inputs may differ.

The result is **156 static control observations / 453 raw property differences,
zero unresolved control-property attributions**, with 24 static paginator
SVG-to-glyph substitutions still separately recorded. This is not overall input
equivalence: font-list, tracking, disabled-ink and tab/toolbar line-height input
substitutions remain classified independently. The confirmed Arial, serif and
fallback-glyph normal-metrics failures are not waived by these 120 observations.
Broader retained-text, layout, structure, state and plugin ownership work remains.

Focused audit tests pass **76/76**, including 23 rejection mutations for the
occurrence-level join, preservation of unrelated typography differences and a
32px synthetic observation that prevents a hidden `normal = 17px` rule. The
validator also rejects detached, changed or falsely equivalent review claims
that do not match the report's exact retained observation. The combined audit
and loader suite passes **127/127**, and `npm run parity:harness:check` passes
**165/165**. The report and Markdown now include the supplemental coverage explicitly. No
production input, renderer implementation or running full-matrix capture changed.

## Natural-line-box reader rejects mismatched evidence before attribution (2026-09-12)

`loadNormalLineBoxReport` now independently validates the supplemental capture
against the selected run's complete capture provenance and exact static case
results. It checks the manifest and reviewed producer source hashes, case and
checkpoint filename identities, paired tree hashes, observed asset hashes/types,
unique control/reference mappings, original text and typography, font readiness,
viewport/DPR and measurement dimensions. Artifact paths are confined to Material
artifacts, including real-path checks when reading disk. Missing observations
stay missing; any malformed capture returns no partially validated observations.

The reader accepts all **120 observations / 96 cases** from the v2 capture with
zero missing entries and errors against the 436 current static checkpoint cases.
Its focused tests pass **51/51**, covering positive evidence, missing coverage,
corruption, stale sources/results/trees, duplicate identities and altered text,
typography, assets, dimensions, readiness and DPR. These tests are also included
in `npm run parity:harness:check` (**160/160 passed**). This is an evidence-loading increment only:
the main comparator does not yet consume it or normalize any differences, and
no fixture, renderer, capture runtime or full-matrix input has changed.

## Static natural line boxes now have provenance-bound supplemental captures (2026-09-12)

`scripts/audit-material-normal-line-boxes.mjs` completed **120 observations in
96 static cases**, covering all currently mapped normal-line-height labels
across eight families, four profiles and three static viewports. The immutable
local result is
`artifacts/material-parity/normal-line-box-static-audit-v2/latest-report.json`.
Every observed natural line box was **17 CSS pixels**. This remains a scoped
measurement, not a global normalization or completed input-equivalence claim.

The driver uses the frozen matrix server and rejects changed browser versions,
served document/script/style/font bytes, original typography, text, element
identity, viewport or DPR. The browser helper copies natural single-line
typography into a temporary offscreen observer, rejects unsupported structure,
writing modes and generated observer content, verifies the reference rectangle
is unchanged, and removes the observer on success or failure. No fixture input
or renderer implementation was changed. The first attempt rejected an incorrect
document filename expectation (`index.html` versus the served `index.csr.html`);
it produced no usable observations and was preserved separately.

An independent post-capture check validated all **436 static checkpoint result
digests**, checkpoint key/filename identities, the manifest and both capture
source hashes, all 96 supplemental file hashes, paired input-tree digests, exact
measurement-to-control mappings and typography, and **49,824 served-asset hash
references**. It found exactly the expected 120 unique observations, with no
inventory or recorded runtime errors. The result is static-only; it does not
cover interaction states, baselines, wrapper layout or final glyph rasters.

Reproduction command while the matching frozen server is available:
`node scripts/audit-material-normal-line-boxes.mjs --base-url=http://127.0.0.1:4431
--checkpoint=artifacts/material-parity/control-text-complete-audit/checkpoint
--output=artifacts/material-parity/normal-line-box-static-audit-v2`.
The output directory must be new for another capture. Browser-helper tests:
`npm run material-input-audit:line-box:test` (**4/4 passed**, repeated).

The next increment must add a tested fail-closed evidence loader and join these
observations to their exact report occurrences. Until then the comparator
intentionally leaves the 120 `normal`/17px differences unresolved. Separate
font-list, tracking and disabled-ink differences remain unequal inputs; the
Arial, serif and fallback-glyph core failures below remain valid. The full
matrix continues independently and has not been restarted or narrowed.

## Production normal line-box spot-check narrows the next capture step (2026-09-12)

A separate Chrome context loaded the frozen full-matrix server's actual
`reference/button` pages at 1440x1000, DPR 1, applied each maintained theme
through `__MATERIAL_SHOWCASE_COMMAND__`, and waited for fonts and two frames.
For each of the three direct `.mdc-button__label` leaves, a temporary offscreen
natural block copied the computed font family/size/weight/style/stretch,
kerning, features, variations, variant, spacing, line-height, text-transform,
text-rendering, direction and writing mode, with the same text. The probe was
removed immediately; the reference fixture was not changed and no resulting
measurement was fed to Astylar layout.

All **12 observed labels** (three per light/dark/contrast/custom theme) computed
Roboto 14px/500, `line-height:normal`, .096px tracking, and measured **17px**
natural height with fonts ready. That agrees with the current 17px candidate
paint value for these labels. It does not make their font-list/tracking/alpha
inputs equivalent, establish every normal line box, or invalidate the separate
Arial/serif/fallback-glyph core failures.

This is a diagnostic spot-check, **not yet an accepted normalization rule**.
The next harness step must retain per-case natural-line-box evidence tied to
the original result/tree digests, exact text/computed typography, viewport/DPR,
loaded font assets and runtime provenance. Missing/mismatched evidence must
stay unresolved; a global `normal = 17px` rule would hide the reproduced defect.
Do not alter or restart the ongoing full-matrix capture just to add this
supplemental observation.

## Disabled-button alpha substitution is attributed across themes (2026-09-12)

All twelve static button cases now carry occurrence-level evidence for the
disabled label's alpha-to-opaque authoring substitution, including the nine
dark/contrast/custom cases previously left unresolved. The reference button
and label retain 38%-alpha on-surface ink. The explicit candidate rule and
normal/effective/current texture stages instead agree on an opaque color:
light `#a4a0a7`, dark `#706c72`, contrast `#a09fa1`, custom `#99a0a2`.

The attribution checks the captured active Material disabled-label token rule,
both controls' disabled state, reference parent/label agreement, and the
candidate's explicit rule plus all three paint-input stages. It no longer
depends on one profile name or light-theme RGB constants. Wrong alpha, inactive
rules, duplicate candidate rules and conflicting states remain unresolved.
This classifies unequal fixture paint; it does not certify alpha compositing
or permit preblending as an equivalent representation.

All twelve result/tree digests validate with no inventory errors or current
control mapping gaps. Focused audit tests pass **71/71** and
`npm run parity:harness:check` passes **109/109**. No fixture, renderer,
capture runtime or ongoing matrix input changed.

## CSS normal line-height exposes a core font-metrics defect (2026-09-12)

The new `normal-line-height-audit.spec.ts` package-root proof compares identical
typography/content with a natural one-line DOM block. It observes the actual
core control paint inputs and the unique currently bound texture's logical CSS
height. It does not use the fixed 48px button container as a text-height oracle,
infer input from world-space output, or replace `normal` with an assumed number.

Repeated browser results in Chrome Headless 152 on Windows:

| Typography/content | Browser line box | Current paint and texture height | Result |
| --- | ---: | ---: | --- |
| Roboto 14px/500, Latin, explicit `normal` | 17px | 17px | pass |
| Same, omitted line-height | 17px | 17px | pass |
| Roboto 17.5px/400, `Mg` | 21px | 21px | pass |
| Arial 16px/400, `Mg` | 18px | 17px | fail |
| Serif 20px/400, `Mg` | 23px | 22px | fail |
| Roboto 14px/500, `A😀` | 19px | 17px | fail |
| Roboto 14px/500, `A漢` | 19px | 17px | fail |
| Roboto 14px/500, explicit `21px` | 21px | 21px | pass |
| Roboto 14px/500, explicit `1.5` | 21px | 21px | pass |

`TextStyleParserService.resolveNormalLineHeight`, introduced in `8870fc5`,
measures a fixed `Mg` string and uses only its font bounding-box ascent/descent.
That is not universally the browser normal line box, and the fixed string
cannot account for the actual text's fallback runs. This is a **confirmed core
renderer defect**, owned by normal line-box metrics/fallback-run resolution.
The passing controls rule out a universal one-pixel adjustment. No renderer
implementation or Material inputs were changed. The 120 static Material
`normal`/17px comparisons remain unresolved individually: these new reductions
are not a blanket waiver or proof that all such occurrences are defective.

Command: `npm --prefix examples/material-showcase test -- --watch=false
--browsers=ChromeHeadless --include=src/app/normal-line-height-audit.spec.ts`.
After correcting font availability, four browser runs report **5 passed / 4 diagnostic
failures**, exit 1; the final three also assert the bound texture height, and the
last additionally checks actual weight/style/spacing/white-space inputs. The initial
attempt had seven Roboto font-loading errors and is not rendering evidence.
Karma's test-only asset mapping now serves local Fontsource files; production
build settings and the ongoing frozen full-matrix bundle are unchanged.
Roboto is loaded explicitly under the isolated `MaterialAuditRoboto` family on
both sides. SHA-256 of the original local Latin-normal files:

- 400: `425c0713a8176f92273d378599c7eac57de7fafabd4bd0ed457b70eb8f80d371`
- 500: `5bcc3aa180e7f26f643cd5b2621cd7c2de193d0661d913a94afd3d4881a7a34b`

Final glyph raster, baseline placement, mixed inline fragments and multiline
layout still require separate proof. The implementation plan now explicitly
groups this defect under core typography, not per-component positioning.
The installed packed consumer contains the same `Mg` metrics branch as source.
`npm run parity:harness:check` passes **108/108**, including source-finding and
fingerprint coverage. A transient TypeScript assertion-inference error while
adding the extra paint checks was corrected before the final browser run.

## Paginator icon replacements are classified content differences (2026-09-12)

The current-texture audit now records paginator icons in a separate
`controlTypography.iconSubstitutions` inventory. The reference inputs are
specific SVG paths in a `0 0 24 24` viewBox; the candidate authors and paints
`‹` / `›` as text. Matching previous/next control classes and accessible labels
establish correspondence, not icon equivalence. Each observation retains the
reference control/SVG/path attributes and computed styles, candidate authored
content and normal/effective/current-paint inputs, and core capture revision.

The attribution requires unique controls, exact path geometry, no additional
text/vector content and valid current core texture provenance. Conflicting or
missing witnesses remain collection/mapping gaps. No reference font comparison
is fabricated for a path, and classified substitutions explicitly keep the
input-equivalence verdict false. This does not certify state, wrapper geometry,
core vector support or final raster.

Checkpoint verification covers **52 paginator cases** (12 static and 40
interaction), with valid result and tree digests, no tree errors, and **104
classified SVG-to-glyph substitutions**. There are no current-texture owner
gaps for those cases; retained-text and broader structure review are separate.
Focused audit tests pass **70/70**; `npm run parity:harness:check` passes
**108/108**. No capture runtime, fixture or renderer implementation changed.

## Tab typography now has guarded occurrence attribution (2026-09-12)

All 72 current-texture differences across the 12 static tab cases now have
captured authoring evidence, without declaring the inputs equivalent:

- Font family requires the active `.mat-mdc-tab` font token, matching browser
  label/ancestor values, the candidate control reset and missing `.tab` override,
  and matching candidate normal/effective/current-paint stack values.
- Tracking requires the active tab tracking token and the complete candidate
  control-to-page normal/effective ancestry omitting tracking. The existing
  button omission check now uses the same strictly validated ancestry helper.
- Line-height requires the actual `.mdc-tab__text-label { line-height: 1 }` rule,
  14px font/label line-height, the distinct 20px reference content/control line
  boxes, and the candidate `.tab` 20px declaration in all three core stages.

Every finding preserves its reference chain and specific rule witnesses; the
tracking finding also retains the candidate ancestry. Missing tokens, explicit
overrides, wrong line-box values, duplicate rules and conflicting state inputs
remain unresolved. Focused audit tests pass **68/68**; the complete
`npm run parity:harness:check` suite passes **106/106**. The 12 production result
hashes and input-tree digests validate; there are 24 mapped labels, 72 attributed
differences and no remaining current-texture collection/mapping gaps for these
static tabs. This does not complete retained-text, structure, raster or state
review, and no fixture or renderer implementation changed.

## Tab and paginator input substitutions traced to source (2026-09-12)

The tab differences have source-level authoring causes, recorded separately
from their still-pending per-occurrence attribution. Reference `.mat-mdc-tab`
declares the component font/tracking tokens. Nested `.mdc-tab__text-label`
declares `line-height: 1`, producing 14px at the captured 14px font size; the
surrounding content/control remains 20px. The candidate `.tab` omits font and
tracking, uses one button value label, and supplies 20px line-height. Initial
commit `2f44011` already omitted those tokens. Commit `bc4d442` retained the
20px value while introducing a 1px density-specific top padding. Do not replace
this with another baseline correction: preserve the distinct content/label
inputs, and investigate any core authoring or rendering gap they expose.

Paginator's remaining current-texture gaps are not ordinary missing label
identities. The reference controls contain SVGs with `viewBox="0 0 24 24"`:

- Previous path: `M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z`.
- Next path: `M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z`.

The candidate authors `value: '‹'` / `value: '›'`, and the current core textures
contain those glyphs at 20px. Both substitutions occur in `2f44011`. Matching
the semantic previous/next action does not make font outlines equal to these
SVG paths. The recommended owner is the fixture's icon input translation,
using core vector/image paint; no equal-SVG-input core defect has been shown.
The next reporting step must retain this as a classified structural/content
substitution, not fabricate reference typography or silently discard the
observed text textures. The source audit now has 58 findings.
`npm run parity:harness:check` passes **104/104**, including live source-pattern
detection. No fixture inputs or renderer implementation changed.

## Tab template labels now map to current control textures (2026-09-12)

The tab label is not a direct Material button-label span. Its explicit template
ID is inside `span.mdc-tab__text-label`, `span.mdc-tab__content`, and a
`div.mdc-tab` with `role=tab`. The corresponding candidate is a button with
the same template ID and `role=tab`. The new reviewed path requires unique
identities, leaf content, wrapper/control roles and matching authored/current
texture text. It does not declare the flattened structure equivalent.

All 12 SHA-256-checked static tab captures now yield 24 current-texture
comparisons with no collection or mapping gaps. They expose **72 unequal
typography inputs**: 24 `Roboto` versus `Roboto, Arial, sans-serif` font lists,
24 `.096px` versus zero tracking values, and 24 reference label line-heights of
14px versus candidate control texture line-heights of 20px. These remain
unattributed pending their captured rule and history review. In particular,
the reference tab control/content wrapper computes 20px, but its actual text
label computes 14px; comparing only control boxes would miss that distinction.

Focused audit tests pass 66/66, including malformed/nested/duplicate paths,
wrong roles and text, stale provenance and deliberately unequal typography.
The remaining static current-control mapping gaps are the 24 paginator icon
controls, whose SVG-versus-text substitution must not be treated as a matched
text label. Ordinary retained-text coverage remains a separate review.
`npm run parity:harness:check` passes **104/104**.

## Toolbar substitutes button height for inherited line-height (2026-09-12)

The reference `.mdc-button` inherits line-height from its immediate
`mat-toolbar`, whose title line-height token computes 28px in all 12 captured
static variants. The candidate `.toolbar-action` instead assigns the same
density branch to `height` and `lineHeight`: 40px for light/dark, 24px for
contrast and 28px for custom. Git blame traces the current rule to `3bf5b4d`.
This is an authored substitution; core's normal, effective and current-paint
stages agree on the supplied value. Do not fix it with another text offset or
by assuming the container's height is the text line-height.

All nine unequal static occurrences now receive a guarded authoring
classification, retaining the active toolbar token rule, button inheritance
rule, browser computed values and explicit candidate rule as evidence. The
three custom-profile values agree, but do not authorize the other values.
The toolbar's 12 font-family mutations are separately classified as core
defects. These 21 current-texture differences have attribution; that does not
complete review of the toolbar's other nodes, geometry, paint or interactions.

The source audit now has 56 findings. Focused audit tests pass **64/64**, with
both unequal density cases, the equal-value control, and negative token,
inheritance, ancestor, duplicate-rule and effective-state witnesses. All 12
production checkpoint result hashes and input-tree digests validate; current
control-texture comparison reports no collection or mapping gaps for toolbar.
The original fixture and renderer remain unchanged.
`npm run parity:harness:check` passes **102/102** at this increment.

## Card text-button font token is an authored omission (2026-09-12)

The remaining 12 static card font-family differences are now attributed with
their own witnesses. Reference `.mat-mdc-button` supplies
`var(--mat-button-text-label-text-font, var(--mat-sys-label-large-font))`,
computing `Roboto` on button and label. Candidate `.text-button` omits the font
override, so the document control reset supplies `Roboto, Arial, sans-serif`
unchanged through normal, effective and current-paint stages. The card flow
change in `1d74a0f` retained this earlier omission; it did not introduce the
core parser mutation established separately for toolbar.

The guarded component-token attribution now covers filled, outlined and text
button kinds, requiring the corresponding active reference token and candidate
class/rule. It rejects cross-kind substitutions, duplicate rules, explicit
font overrides, and conflicting stage evidence. All 12 SHA-256-checked card
captures receive the authoring classification; their 12 `normal` versus numeric
line-height observations remain unresolved. Focused audit tests pass 63/63 and
the full harness unit command passes 101/101. No fixture or runtime was changed.

## Current-paint attribution across the complete static capture (2026-09-12)

All **436 static checkpoint records** now exist in the new control-text run.
Their result SHA-256 values and referenced input-tree digests validate, with
zero inventory errors. This is checkpoint evidence, not the still-running
matrix's final enforced verdict. Current-texture comparison yields **132
mapped labels and 48 explicit gaps** (paginator icon controls and tab labels).

The confirmed parser rewrite now receives guarded occurrence attribution in
all **12 toolbar static variants**. This requires the browser button and label,
core normal input, and core effective input to agree on the reviewed single
family (`Roboto` or `Arial`), while actual current paint adds exactly the
source-traced fallback suffix. Other font lists, missing or conflicting stages,
and unmatched controls remain unresolved. The report records all four stage
values and links the source finding and equal-input proof. It does not equate
the two lists or imply a raster mismatch for an installed font. Validation
requires the core classification rather than treating this as fixture authoring.

Focused audit tests pass **63/63**, including positive cases for both reviewed
families and rejection of conflicting normal/effective/browser-parent inputs,
different suffixes, missing evidence, and a wrong classification. The other
static control-font differences include 108 captured component-token omissions
and 12 unresolved card text-button cases. Line heights and non-light disabled
ink remain independently unresolved. No runtime or fixture input changed.
The complete harness unit command, `npm run parity:harness:check`, passes
**101/101**.

## Font fallback rewrite changes actual text advance (2026-09-12)

The follow-up equal-input proof confirms an observable core defect. A button
with `font-family: MaterialAuditUnavailableFont_8c176e`, text
`WWWWiiiiMMMMmmmm`, size 20px, weight 400, zero tracking/word spacing and no
wrapping has browser Range width **230.296875px**. The currently bound Astylar
label texture records CSS width **226.562px**, a **3.734875px** difference;
actual paint inspection shows the parser-appended `Arial, Helvetica, sans-serif`.
Both explicit-generic controls (the same unavailable family followed by `serif`
or `sans-serif`) pass the same width assertion. Browser and candidate styles
come from the identical declaration object; there is no fixture correction.

The measurement uses the current label material's unique texture identity and
its core-recorded logical CSS size, compared with a DOM text Range. A material
can bind one texture in multiple slots, so the proof deduplicates identities.
It does not build a replacement candidate canvas from declarations, use world
coordinates as inputs, or equate the button's fixed width with its text width.
It establishes text-advance inequality, not the exact fallback font identity,
missing-glyph coverage, or final glyph raster/sharpness. The installed Roboto
showcase mutation still does not by itself imply different visible glyphs.

The focused command below now executes **39 cases: 17 pass, 22 fail**. The two
new explicit-generic controls pass; the single-family fallback case is the one
new diagnostic failure, in addition to the previous 21. Retain these honest
failures during this audit. Source finding
`core-explicit-font-list-appends-default-fallbacks` is now confirmed, owned by
core font-list parsing/fallback semantics. No renderer implementation changed.
`npm run parity:harness:check` passes **100/100**. The full frozen-bundle capture
has completed its static traversal and is still running interaction cases;
neither this focused proof nor the harness unit suite completes the audit.

## Initial explicit-font-list input proof (2026-09-12)

The new frozen-bundle toolbar capture separates another root cause from fixture
token omissions: browser computed and candidate normal/effective font-family
are all `Roboto`, but actual current control paint uses
`Roboto, Arial, Helvetica, sans-serif`. `TextStyleParserService.resolveFontFamily`
appends its default list when an authored list has no recognized generic. Git
history places that behavior in `2ec3152`, before the Material showcase.

Two package-root equivalent-input reductions now isolate the boundary. Both
author one fixed-size button and generate the browser declarations from the
same StyleRule. With `fontFamily: 'Arial'`, normal inspection agrees with the
browser, but the actual texture is painted with
`Arial, Arial, Helvetica, sans-serif`; the preservation assertion fails. With
`Arial, sans-serif`, both stages and geometry pass. No fixture input was changed
to avoid the parser branch. The collector serializes each current texture in
the same proof, independently from normal declarations.

Command: `npm --prefix examples/material-showcase test -- --watch=false
--browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Two runs give 36 cases, 15 passes and 21 diagnostic failures: one new font-list
failure plus the previous twenty layout/transform failures. The assertion is
`font-list-button paintedControlText fontFamily: Expected 'Arial, Arial,
Helvetica, sans-serif' to be 'Arial'`. The existing zoneless/Zone.js warning
remains; there is no renderer implementation change.

At this initial stage the pre-paint mutation was proven; a changed glyph raster
was **not**. The follow-up above now proves changed text advance for an
unavailable family, while missing-glyph and final-raster claims remain unproven. Its
owner is core font-list parsing/fallback semantics, not the Material plugin or
fixture. The source audit now has 55 findings and fingerprints both the button
manager and text parser (21 source fingerprints). After updating the fingerprint
inventory assertions, `npm run parity:harness:check` passes 100/100. Full input
review remains incomplete.

## Current control texture comparison, not just collection (2026-09-12)

### Captured button inputs now receive guarded attribution

The report now attributes a tracking omission only with a unique active
filled/outlined reference token rule, equal button/leaf computed tracking,
the candidate `.material-button` rule and a complete candidate control-to-page
normal/effective ancestry omitting tracking. The disabled-ink attribution is
limited to the observed light-profile disabled button, its exact alpha rule,
explicit opaque candidate rule and matching declaration/current texture values.
Missing, conflicting or stale witnesses remain unresolved.

A third authored-input finding identifies the omitted component font override.
The reference filled/outlined token computes `Roboto`, while the candidate's
`button, input, select` reset (added by `af04845`) supplies the document stack
`Roboto, Arial, sans-serif` and `.material-button` lacks the component override.
Classification requires those exact captured rules and matching normal,
effective and painted candidate values. This is not a blanket rule that treats
all fallback-list differences as authoring; a parser-added list is distinct.
The source audit has 54 findings at this increment.

The production smoke's ten differences now have seven attributed authoring
occurrences (three tracking, three component fonts, one disabled ink) and three
unresolved line-height stage differences. All remain unequal inputs; attribution
does not make `inputEquivalent` true. `npm run parity:harness:check` passes
100/100, including negative-witness tests for all three classifications.

Separately, SHA-256-checked checkpoints from the live new-instrumentation matrix
provide 36 core/toolbar/card static cases and 36 current-texture mappings, with
no collection or mapping gaps. Twelve core font-token and twelve core tracking
observations receive the guarded authoring classification. The other 57
observations (24 font-family and 33 line-height) remain for their own review;
this partial diagnostic is not full-run acceptance.

### Attribution follow-up

Two button paint-input differences trace to initial showcase commit `2f44011`,
not a recent renderer regression. The source audit now has 53 findings:

- `.material-button` copies size 14px and weight 500 but omits tracking. In the
  production light/desktop capture, active `.mat-mdc-unelevated-button` and
  `.mat-mdc-outlined-button` rules explicitly declare their label tracking
  tokens; reference labels compute .096px while candidate declarations omit it
  and actual textures receive zero. Classify this captured omission as an
  application authoring defect. Restore the component token, not a label offset
  or fixed-width adjustment. Other states still need captured attribution.
- The disabled candidate authors `mixHex(theme.surfaceContainer,
  theme.onSurface, .38)`, producing opaque #a4a0a7. The active reference disabled
  rule uses on-surface ink mixed with transparent, retaining .38 alpha and
  computing rgba(29,27,32,.38). Classify this as precomposited fixture paint,
  not equivalent input or proof of a core alpha defect. Background layers and
  glyph-edge coverage must remain part of a future equal-alpha compositing proof.

ButtonManager forwards copied control styles to TextRenderingService; it does
not inject tracking. The text parser defaults omitted tracking to zero. Its
numeric `normal` line-height instead comes from `measureText('Mg')` font bounding
ascent plus descent divided by font size. Thus `normal` versus 17px is a stage
representation question, not yet a proved authored height mismatch. Font-family
fallback lists likewise still require an explicit equivalence assessment. These
source findings do not blanket-attribute every controlTypography occurrence.

The audit now reports `controlTypography` separately from registry-retained
typography. Reviewed mappings require one direct leaf `span.mdc-button__label`
under a unique reference button, joined to a unique candidate button by shared
ID or explicit reference `data-parity-id`. Reference direct text, candidate
authored label and actual current texture text must agree. This also supports
the explicit dialog-action identity without guessing correspondence from text.
Nested/duplicate labels, stale source/version/revision, mismatched content,
missing parsed fields and observed unmapped control textures remain gaps.

Every comparison preserves browser-computed, normal/effective declaration,
optional registry-retained and current texture stages independently. Numeric
parsed font/spacing lengths become CSS px; parsed line-height multiplies only
the captured parsed font size. CSS `normal`, font fallback lists and alpha ink
are not waived as equivalent to numeric heights, shorter font lists or opaque
colors. The original raw paint style and wrapping width remain inventoried.
Other effects and final placement/material/raster behavior are not certified by
these eleven-property comparisons. Existing retained-text gaps are not removed.

The digest-checked production button smoke has three mapped textures, no
control-stage gaps and ten differences: three font-family lists, three
`normal` versus 17px line heights, three .096px versus zero tracking values,
and disabled rgba(29,27,32,.38) versus opaque #a4a0a7. These differences still
need attribution; the visually passing smoke does not justify accepting them.
`npm run parity:harness:check` passes 97/97, including five new tests for stage
separation, numeric normalization, missing/invalid evidence, ambiguous identity,
and explicit non-button mapping gaps. No fixture, renderer, threshold or
reference input changes accompany this comparison increment.

## Complete retained-text visual baseline (2026-09-12)

The unfiltered enforced run at
`artifacts/material-parity/retained-text-complete-audit/latest-report.json`
completed with exit 0 against frozen
`examples/material-showcase/dist/material-showcase-retained-text-audit/browser`
on port 4431, Chromium 152.0.7977.76. Command: `node
tests/material-parity/run-material-parity.mjs --enforce --skip-build`, with
`ASTYLAR_MATERIAL_BROWSER_ROOT`, `ASTYLAR_MATERIAL_ARTIFACTS` and
`ASTYLAR_MATERIAL_PARITY_PORT` set to those isolated paths/port and no filters.

- Static: 436/436 pass, minimum/median SSIM .965296/.996382, maximum edge
  error .984px; text 428/428, backgrounds 24/24, rasters 120/120, shadows 12/12.
- Interactions/mobile: 1875/1875 pass, minimum/median SSIM .954514/.997463,
  text 2116/2116, focused rasters 880/880.
- Current audit loading verifies all 36 families and full configured coverage.
  Including supplemental captures, 4648 case sides yield 2311 tree variants,
  no collection errors, and no missing full-tree/resolved/state-style evidence.
- Input equivalence remains unproven: 8133 unique style differences across
  380407 occurrences; 3890 signatures still need attribution. There are 88
  structural differences, 7245 retained typography observations, 4634 retained
  mapping/stage gaps and 20028 unequal retained properties (14616 unresolved).
  All 51 source findings are still detected. The new control comparison
  correctly reports 625 missing-stage case gaps and zero control comparisons
  because this older frozen bundle has no `paintedControlText` evidence.

These are complete baseline captures, not a complete reviewed input audit.
Do not attribute current diagnostic API coverage to the older served bundle.
Preserve this report and capture the new instrumentation in a separate full run.

## Control texture evidence reaches the Material collector (2026-09-12)

The showcase collector now preserves `paintedControlText` as its own raw parsed
stage, including text, source, wrapping width, numeric CSS units and nested
effects. `paintedControlTextEvidenceVersion: 1` identifies collector support;
it is not a claim that every node has a texture. Older/mesh-only captures do not
gain this marker or fabricated entries. Normal/effective declarations and the
ordinary retained-text registry remain unchanged and separate.

Full-tree pooling retains the marker and all control-texture fields, interns its
style independently and does not coalesce legacy variants with newly observed
ones. Regression tests use deliberately different declaration, retained and
painted font sizes, and verify nested-effect preservation and detached snapshots.

The package-root button reductions now check the actual `paintedControlText`
source and its end-to-end serialization through the collector. Both value and
textContent labels pass. Only their documented parsed units are normalized for
comparison with browser computed values: font/spacing lengths become px strings,
and the recorded line-height multiplier is multiplied by the recorded font size.
No authored or rendered value supplies a fallback, and neither fixture changes.

After fresh `npm run material-showcase:prepare`, the combined proof/collector
command (`npm --prefix examples/material-showcase test -- --watch=false
--browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts
--include=src/app/material-input-evidence.spec.ts`) runs 41 cases: 21 pass and the
20 previously exposed geometry/transform failures remain. The missing button
inspection proof now passes using actual texture evidence rather than a changed
assertion about the meaning of `retainedText`. `npm run parity:harness:check`
passes 92/92 tests; the collector-only browser command also passes 7/7. The
separate production build at
`examples/material-showcase/dist/material-showcase-control-text-audit` succeeds.

A real production capture (`control-text-collector-smoke`, port 4433,
button/light/desktop, `--enforce --skip-build --static-only` against that new
browser output) captures one passing case: SSIM .999773, maximum edge error
.219px, and text alignment 3/3. Enforcement correctly exits 1 because this is
only 1/436 static cases and no interactions, not full acceptance. Digest-checked
full-tree loading has no errors and finds all three button label textures with
the new evidence marker and source. Their actual parsed font size is 14 and
weight 500; tracking is zero versus the reference labels' .096px. Reference
line-height remains `normal`, not an inferred pixel value; candidate parsed
line-height is 1.2142857142857142. These observations need input attribution, not
automatic equivalence based on similar pixels.

Property comparison and attribution for the newly observable showcase control
labels still require reviewed reference-text mappings and fresh captures. Merely
pooling this evidence does not waive any existing mapping or typography gap.

## Core-owned control texture inspection (2026-09-12)

The instrumentation now retains a detached copy of the parsed inputs actually
supplied to `TextRenderingService`'s canvas paint path. Evidence is weakly keyed
by texture, survives legitimate cache reuse, is removed on texture disposal, and
is discarded when the service owner is disposed. Inspection cannot invent an
entry for another renderer's texture and allocates no visual resource.

`inspectResolvedStyles()` adds optional `paintedControlText` with source
`core-control-texture`, current bound texture text/style and wrapping width. It
reads the actual control label material, including focus-color texture swaps;
it does not search output geometry or reconstruct inheritance. This is separate
from `retainedText`, whose existing registry-only meaning remains intact. Parsed
lengths are CSS pixels except lineHeight, which is the parser's multiplier. The
field describes paint inputs, not final clipping, material effects or visibility.
This is an additive diagnostic API, not a layout/paint fix or a document/plugin
schema change. Compatibility documentation and its generated skill copy agree.

Verification so far: the combined text-service/core-inspection tests pass 10/10;
the complete root browser suite passes 458/458 (with the existing launcher forced-
termination warning after successful tests); harness tests pass 91/91. Examples
and both skill validators pass. Capability validation still fails only the
previously documented stale element-creation fingerprint; that source is unchanged.
`npm run consumer:check` passes: fresh package installation (419 packed files),
browser and SSR builds, and 4/4 browser tests including surface-isolated control
texture inspection. The focused inspection suite also passes 3/3 after adding
the hidden-control assertion.

Commands: `npm test -- --watch=false --browsers=ChromeHeadless
--include=src/app/services/text/text-rendering.service.spec.ts
--include=src/lib/astylar-style-inspection.spec.ts` (10/10), the same root test
command without includes (458/458), and the inspection-only include (3/3).
`npm run parity:harness:check`, `npm run examples:check` and `npm run skill:check`
pass; `npm run capabilities:check` retains the known fingerprint failure.

Material collector integration and new-bundle captures are still required. The
frozen in-flight full matrix and current schema-2 tree captures do not contain
this new evidence. Their control-label gaps must remain visible; this change
alone cannot certify those comparisons or complete the audit.

## Control-value labels are outside the retained typography snapshot (2026-09-12)

A new package-root browser reduction isolates an inspection gap: a button
authored with `value: 'Action'` creates an enabled, nonzero-visibility label mesh
and has matching button-box geometry, but `inspectResolvedStyles()` returns no
retained text inputs. The missing values are font-size 16px, line-height 24px and
tracking .5px. The control using `textContent: 'Action'` with the same styles and
visible content passes these assertions. The reference uses button text because
HTML button `value` denotes submission data, whereas the current Astylar button
manager uses it as its label. This is disclosed semantic translation, not a
different visual input.

Source trace: `ButtonManager.createButton` chooses value before textContent and
`createLabelMesh` calls `TextRenderingService.renderTextToTexture`. That service
parses the actual text style before painting, but the snapshot only consults
`TextInteractionRegistry`. Ordinary element text creation is conditional on
textContent and registers there; the value-only control texture does not. Thus
the passing textContent control must not be read as proof of complete texture
inspection. Neither missing snapshot data nor registry presence alone proves a
glyph-rendering failure or success.

The narrow audit-instrumentation owner is core text/control paint: retain the
actual parsed texture inputs with an explicit source, expose detached evidence
after settlement, and verify cache reuse, updates and disposal. Do not manufacture
inherited values in the collector, inspect projected sizes as inputs, or replace
fixture values with textContent. The source inventory records this as a
parity-harness coverage defect, bringing the source-finding count to 51.

`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
repeatedly executes 34 cases: 13 pass and 21 fail, including the new missing-evidence proof
and the 20 previously documented equal-input failures. This remains honest
failing diagnostic evidence, not an accepted parity run. The initial textContent-
only control passed (33 cases, 13 pass/20 fail), which prompted the value-path
reduction rather than an incorrect blanket conclusion about all button labels.
`npm run parity:harness:check` passes 91/91 tests. No core implementation or
showcase fixture was changed.

## Stepper number and current-panel text ownership (2026-09-12)

The reviewed text mapping now follows the exact Material step-header paths to
the two numbered icons, and the current content panel's `data-parity-id` to its
text leaf. It matches their candidate authored identities without changing either
tree. Generated stepper IDs must have the expected index and unique path; direct
text must agree. Completed/edit icons are not treated as numbered text. Hidden
panels remain inventoried and unaccepted rather than being selected by text alone.

Across the 436 static captures this adds 36 mappings and comparisons and exposes
132 more retained property differences. In particular, both reference step numbers
compute 16px while candidate retained text is 14px. Font family, tracking and
alignment also differ. These differences are not waived by establishing identity;
their ownership still needs attribution. Static diagnostic totals are 1,390
retained comparisons, 1,100 reviewed mappings, 3,786 property differences (2,770
unresolved), and 222 typography coverage gaps. This is not complete audit coverage.

Tests reject wrong paths, IDs, attributes, duplicate identities and changed text;
a focused state test switches the current panel and preserves the hidden-panel
gap. `npm run parity:harness:check` passes 91/91 tests. No fixture, renderer,
capture module or served full-matrix bundle changed for this increment.

## Control-label typography omissions, traced through captured rules (2026-09-12)

The chip/button-toggle weight difference is now attributed to unequal inputs
with a guarded rule-and-ancestry proof. Chip labels compute 500 from
`.mat-mdc-standard-chip .mdc-evolution-chip__text-label` and its Material weight
token. Button-toggle labels inherit 500 through their button from the
`.mat-button-toggle-appearance-standard` component token. The candidate's entire
text-leaf-to-main#page chain omits weight at both core declaration stages and
retained text is normal/400. The core text parser's default is normal and it
preserves numeric weights; the existing keyword proof distinguishes 400 from
500. There is no evidence here that core was given 500 and rendered it as 400.

Chip labels likewise compute .096px from the active Material tracking token,
while the complete candidate chain omits tracking and core retains zero. The
audit **does not** apply this conclusion to button-toggle tracking: although its
host specifies a tracking token, its intervening button computes normal. A fix
must preserve that actual cascade, not indiscriminately copy host tokens.

The initial chip styling in `2f44011` omitted these component properties;
`c47d589` introduced the current button-toggle label composition without weight.
The recommended owner is showcase component typography translation. Restore
the equivalent declarations before re-evaluating core, without adjusting fixed
widths, glyph offsets or theme scaling to conceal the input mismatch.

The machine guard requires the exact active token rule, matching computed
values on the reviewed reference inheritance path, and every normal/effective
candidate ancestor through a unique main#page. Explicit or competing candidate
declarations, absent records, wrong roots, cycles or contradictory reference
values reject attribution. It classifies 72 static observations (24 chip weight,
24 chip tracking, 24 button-toggle weight) as authoring defects while retaining
their unequal values. Totals remain 3,654 retained property differences, of which
2,638 are unresolved. Source inventory has 50 findings. The focused controls
exercise both families and preserve button-toggle tracking as unresolved;
full harness verification passes 72/72 tests. No fixture or renderer changes
were made.

## Chip, button-toggle and paginator text ownership (2026-09-12)

The retained-typography audit now maps both chip labels, both button-toggle
labels, and the paginator's page-size caption, value and range. The paths use
the paired template IDs and exact Material wrapper classes. The paginator's
generated caption ID is checked by shape and uniqueness; direct text is compared
after trimming, as in the existing identity contract. This does not accept
whitespace-layout differences.

Material chip labels contain one empty focus-indicator span. The chip-only
mapping requires exactly that span, its exact two classes, no ID, no direct
text and no descendants. Its node remains in the full inventory and is recorded
as `referenceDecorationNodes` on the mapping. Allowing this known text-free
decoration establishes only the parent text's identity; it does not accept the
indicator's paint, layout or focus behavior. Unknown, duplicated, nonempty or
nested children are rejected, as is an absent required focus indicator.

Across all 436 static cases this adds 84 mappings and comparisons, exposing 204
additional property differences: chip font family/weight/tracking (72),
button-toggle font family/weight/tracking/alignment (96), and paginator alignment
(36). Both chip and button-toggle reference labels compute weight 500 while the
candidate retains 400. Chip tracking computes .096px versus retained zero. These
differences remain unresolved until their authored and resolution evidence is
attributed; visual similarity does not excuse them.

Static diagnostic totals: 1,354 retained comparisons, 1,064 reviewed mappings,
3,654 property differences with 2,710 unresolved, and 258 gaps (144 anonymous-node
case gaps, 60 missing/ambiguous IDs, 30 missing retained entries, 24 direct-text
mismatches). The full matrix remains in progress. `node --test
tests/material-parity/*.spec.mjs` passes 70/70 tests, including changed identity
and ownership controls across all nine reviewed families. No fixture, renderer,
capture module, production bundle or threshold was modified.

## Sort, expansion and sidenav wrapper text ownership (2026-09-12)

Three more explicit paired-template paths now identify sort header content,
expansion body content and sidenav navigation text. In particular, the reference
`sidenav-nav` ID belongs to a wrapper whose generated inner div owns Navigation;
the candidate aside owns the text itself. That alias is permitted only when the
unique same-ID wrapper is on the reviewed path and has no direct text. An
unrelated same-ID element, an extra text owner or a duplicate path is rejected.
The generated expansion content ID is checked by its Material ID shape rather
than a particular runtime counter.

All 36 mappings succeed across the 436 static cases, but only 24 have retained
core text evidence. The 12 closed expansion labels have no core text registry
entry; their new mappings expose this fact instead of manufacturing typography
from the authored styles. Hidden/clipped-state structure and rendering coverage
still need a separate classification. No glyph-equivalence claim is made for
these missing entries.

The newly comparable sort/sidenav text adds 69 unequal properties: 36 for
sidenav (tracking, alignment and color) and 33 for sort (tracking, alignment,
six font-size and three color observations). These remain unresolved pending
captured-rule attribution. Totals are now 1,270 retained comparisons, 980 reviewed
mappings (including headings), 3,450 property differences with 2,506 unresolved,
and 390 gaps: 180 anonymous-node case gaps, 156 missing/ambiguous IDs, 30 missing
retained entries and 24 direct-text mismatches. These are static diagnostics,
not acceptance of the still-running complete interaction matrix.

`node --test tests/material-parity/*.spec.mjs` passes 69/69 tests. The existing
changed-path/type/class/text and duplicate-ID controls now cover all six reviewed
template families; new negative controls cover same-ID wrapper ownership and
generated expansion IDs. No fixture inputs, renderer, capture module, served
bundle or threshold changed.

## Reviewed tree, grid-list and badge text ownership (2026-09-12)

The typography audit now follows explicit paired-template paths for tree item
labels, grid tile content, and badge counts. Material owns the text directly on
`mat-tree-node`, a generated `div.mat-grid-tile-content`, or a generated
`span.mat-badge-content`; the candidate owns it on its corresponding authored
label/count span. Unique anchor IDs, each direct-child tag/ID/class, unique
generated badge ID shape, identical direct text, and terminal leaf structure
are required. Matching strings alone are insufficient. Original reference IDs
and all wrappers remain intact in the captured inventory; an alias only chooses
the text owner for the separate retained-typography comparison.

Across the existing 436 static checkpoints this adds 72 reviewed mappings and
raises retained text comparisons from 1,174 to 1,246. It exposes 222 additional
property differences, **none accepted by the mapping**: grid-list tracking and
alignment (48), badge tracking (12), and tree font family, line height, tracking,
alignment and font size (162). In 18 tree observations browser computed size is
16px while retained core size is 14.4px (contrast) or 18.4px (custom).
Attribution of these new differences
still requires authored/resolution evidence; `normal` tracking, `start`
alignment and font stacks are not silently normalized into equivalent inputs.

There are now 3,381 retained property differences, including 2,455 unresolved,
and 450 mapping/provenance gaps: 204 anonymous-node case gaps, 180 missing or
ambiguous IDs, 48 direct-text mismatches and 18 missing retained text entries.
These figures are a static diagnostic, not complete matrix acceptance.

Verification: `node --test tests/material-parity/*.spec.mjs` passes 66/66 tests.
New negative controls reject moved/retyped/reclassified nodes, duplicate IDs,
duplicate matching paths, conflicting aliases, changed text, non-leaf text
owners, unrelated component anchors, and invalid generated badge IDs. Positive
controls deliberately retain unequal font sizes and verify that the audit gate
still rejects them. No showcase fixture, renderer, capture module, served bundle,
visual threshold or interaction case changed. The unfiltered enforced matrix
continues against its previously fingerprinted production build.

### Tree font-size follow-up: missing component token, not proven core scaling

The captured `.mat-tree-node, .mat-nested-tree-node` rule explicitly authors
`font-size: var(--mat-tree-node-text-size, var(--mat-sys-body-large-size))` and
`font-family: var(--mat-tree-node-text-font, var(--mat-sys-body-large-font))`.
Its computed size is 16px even when the reference frame computes 14.4px in
contrast or 18.4px in custom. The candidate's `#page` correctly has those same
theme-scaled page sizes, but `.material-tree`, `.tree-item` and `.tree-label`
do not author a component font-size override. Their core declaration records
omit the size and the leaf's retained text records the page size instead.

This is evidence of an application/plugin **input-authoring defect**, not
evidence that core miscalculates a shared font-size input. The missing override
was present in initial showcase commit `2f44011`. Commit `7159b1d` subsequently
moved direct tree item text into `.tree-label` spans with fixed 20px height and
line-height; it did not restore the Material component typography declaration.
The narrow follow-up is to restore equivalent component typography inputs, then
test those equal inputs through core. Do not add inverse theme scale factors or
resize the rendered text to match screenshots. The 20px-versus-normal line-height
and wrapper differences require their own proof and are not accepted here.

The automated attribution now requires that exact active token rule, the
reviewed tree text identity, every candidate normal/effective ancestor record,
no intervening font-size/font shorthand declaration, and a unique main#page
whose authored, normal and effective sizes match the retained leaf size. It
does not reconstruct inherited values in the declaration records. Missing,
cyclic, contradictory or duplicate evidence leaves the difference unresolved.
Across the 436 static checkpoints the guard classifies nine contrast and nine
custom font-size observations as input-authoring defects. All 3,381 property
differences remain visible; 2,437 still require attribution. Source inventory
now contains 49 findings. The full harness suite passes 68/68 tests, including
positive controls for both theme sizes and negative controls for incomplete or
conflicting evidence. This does not establish full tree rendering parity.

## Ordered transform composition is also lost (2026-09-12)

The transform follow-up now includes three controls using only pixel units and
the default transform origin. They reuse the exact same containing block,
label, text and retained-typography assertions as the preceding reduction, so
the percentage and unsupported-origin gaps cannot explain these differences.

| CSS input on both sides | Browser label left | Astylar label left | Result |
| --- | ---: | ---: | --- |
| `translateX(10px) scale(.5)` | 66px | 66px | Pass |
| `scale(.5) translateX(10px)` | 61px | 66px | Fail: 5px |
| `translateX(4px) translateX(6px)` | 26px | 22px | Fail: 4px |

The parser introduced in shared form by `662c179` stores a single mutable
`translate`/`rotate`/`scale` tuple. It assigns the latest value for each function
instead of composing an ordered CSS transform. The material service then
applies the tuple in one fixed arrangement. This loses both noncommutative
function order and earlier repeated functions **before** final projection.
The inline text moves with the same error; its retained font size, line height
and tracking remain correct in all three controls.

The source inventory records a confirmed core composition defect for these
accepted functions. That narrow finding does not expand the catalog's declared
incomplete CSS transform grammar, nor does it relabel the absent public
`transformOrigin` field as a supported feature. Remediation must retain and
compose the ordered CSS-space affine transform, including repeated functions,
alongside percentage/reference-box/origin work. Merely fixing percent parsing
and origin offsets would leave this independently reproduced error intact.
Do not reorder, combine, or calculate equivalent transforms in the showcase to
compensate for it.

Verification: `node --test tests/material-parity/*.spec.mjs` passes **64/64**.
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
now runs **32 cases: 12 pass / 20 fail**. The new passing order control and the
two new failing composition controls retain the existing threshold; all prior
29 cases remain. The inventory now has **48** detected source findings. No
renderer implementation, showcase input, capture module, or production bundle
was changed. The full audit and running unfiltered matrix remain incomplete.

## Floating-label substitution exposes transform-subset gaps (2026-09-12)

The 16px/12px field-label difference is not a simple font-scaling diagnosis.
Material keeps 16px typography inside an absolutely positioned floating label
with `translateY(-106%) scale(0.75)` and a top-left transform origin. The
candidate instead authors 12px text directly on an absolute label at `top:8px;
left:16px`, with different tracking. The substitution was present in `2f44011`;
`87bc351` added tracking and vertical-alignment overrides. This changes rendering
inputs even where the apparent glyph size is similar.

The retained-stage audit now attributes **18** static font-size observations
(form-field, input and select; light/dark; three viewports) to this substitution.
Each attribution requires the exact reference wrapper/type/class, active scale
rule, computed .75 matrix and top-left origin, reference 16px text, corresponding
candidate 12px rule and retained value, fixed insets, and an untransformed
candidate ancestry reaching the page. Missing/competing rules or changed
structure/transform evidence are rejected. Hidden/untransformed compact states,
tracking, colors, font stacks and other properties remain separately reviewable;
the classifier does not multiply font sizes to declare the inputs equal.

Six new original-input reductions isolate the rendering boundary. Both sides
receive the same rule objects and unchanged 16px/24px text with 0.496px tracking.
The label is 160x24px at (16,40) in a 240x80px containing block. Retained font
size, line height and tracking are asserted independently of projected output.
Only the inline text fragment's horizontal bounds are compared; wrapper border
boxes keep all four edge checks.

| Reduction | Observed result |
| --- | --- |
| No transform | Pass |
| `translateY(-12px) scale(1)` | Pass |
| `scale(.75)` with the default origin | Pass |
| `translateY(-50%) scale(1)` | Fail: top -10px versus 28px; -50% is treated as -50px rather than -12px |
| `scale(.75)` with `left top` origin | Fail: left 36px versus 16px; top 43px versus 40px |
| Percentage translation plus .75 scale, `left top` origin | Fail: left 36px versus 16px; top -7px versus 28px |

Source trace separates these from final world-axis projection:

- `parseCssTransform` strips translation units using `parseFloat` and receives
  no transform reference-box dimensions. Percentage translation is therefore
  already wrong before `cssTranslationToRenderOffset` projects it. The pixel
  translation control passes.
- `StyleRule` has no `transformOrigin` field. `ElementMaterialService.applyTransforms`
  receives only translation/rotation/scale plus projection, and scales the mesh
  about its existing center. The 20px/3px displacement matches the missing
  top-left-origin adjustment for this 160x24px box. Default-origin scaling passes.
- The capability catalog already classifies transforms as a **different,
  incomplete subset**. These are confirmed unsupported-semantics gaps, not a
  newly claimed regression in a promised complete CSS transform contract.
  The original `transform-origin` declaration is intentionally retained in the
  diagnostic payload outside today's typed subset; the test explicitly says so.

Remediation belongs in the core CSS transform parser/reference-box/origin
composition and its public contract, before final projection. The implementation
plan now prioritizes it after removal of output-to-layout feedback. Preserve the
original label typography/wrapper; do not repair these gaps with a smaller font,
plugin arithmetic, mesh-coordinate feedback, or adjusted Babylon axis signs.

Verification: `node --test tests/material-parity/*.spec.mjs` passes **64/64**,
including positive/negative label attribution and the expanded source fingerprint
checks. `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
now contains **29 cases: 11 pass / 18 fail**.
The three new failing paths repeat the isolated results; all 15 prior failures
remain. The three new passing controls distinguish the missing semantics from
general placement/scaling failure. Full-tree reanalysis of 436 static cases has
zero collection errors, detects all **47** source findings, and reduces retained
unresolved property observations from 2,251 to **2,233**. This is not a completed
audit or a renderer implementation change. The unfiltered matrix remains live
against its unchanged capture modules and served production bundle.

## Table font input changed alongside a renderer fix (2026-09-12)

History identifies a concrete unequal-input change: commit `f980edc`
(`fix(renderer): honor Material table row sizing`) changed `.material-table`,
`.material-table th`, and `.material-table td` from **14px to 16px**. It also
changed renderer code, row heights and positional adjustments. The initial
showcase commit `2f44011` used 14px. The commit's grouping is evidence of when
the input changed, not proof of the author's motive or a core font-scaling bug.

All 12 current static table captures show the reference header/body cells at
14px and the candidate's retained core text at 16px: **36 attributed cell-font
observations**. The reference row's captured active Material typography token
and computed 14px value, the corresponding candidate cell's explicit 16px rule,
matching table/row/cell structure, and retained 16px value are recorded together.
The audit rejects this attribution if those witnesses change or the candidate
cell selector has competing font-size declarations. Normal/effective cell
records can omit font size; the audit preserves those earlier stages rather
than replacing them with reconstructed inheritance.

The existing equal-input table reduction now additionally asserts retained
14px font size and 20px line height on both cells. It passes together with its
existing padding, border, and row/cell geometry assertions. This proves that
this reduced case needs no 16px fixture compensation; it does not establish
complete Material table typography, transformed text, or pseudo-state parity.
The actual showcase inputs and renderer implementation remain unchanged.

Verification:

- `node --test tests/material-parity/*.spec.mjs`: **62/62 pass**, including
  positive and negative attribution tests.
- `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`:
  **8 pass / 15 intentionally exposed failures**, repeated with the failure
  names inspected. The table test passes; the same existing intrinsic-width,
  positioned-margin, auto-height, grid-content, calc, and divider reductions
  still fail. Neither failing cases nor thresholds were changed. The existing
  zoneless/Zone.js warning remains.
- Reanalysis of all 436 static checkpoints: **44/44 source findings detected**;
  retained unresolved observations decrease from 2,287 to **2,251**. The legacy
  mapped-style list does not include these cell font observations and remains
  at **3,189 unresolved attributions**. These are different evidence scopes,
  not alternative pass counts. The full matrix remains in progress.

Follow-up owner: Material table input translation, coordinated with the already
recorded table border/flow findings. Restore the reference typography intent
when undertaking remediation; if equal inputs then expose another discrepancy,
reduce and fix its core owner rather than increasing the fixture's font size.

## Benchmark heading masking and explicit identity mapping (2026-09-12)

The full trees exposed an additional benchmark defect: the HTML reference uses
`.benchmark > .eyebrow, .benchmark > h1 { opacity: 0 }`; AstylarUI instead sets
the same headings' `color` to `theme.surface`, leaving opacity at 1. These are
unequal paint inputs. Neither establishes visible heading text parity. This is
separate from the already reviewed matching heading offsets: equal positioning
declarations do not justify suppressing their paint.

History confirms both masking paths were already present in the initial showcase
commit `2f44011`. Commit `ee42cb3` changed heading flow but retained the masks.
The source audit now records both paths as parity-harness defects, with a
follow-up priority to restore honest visible-input coverage. This audit does not
change the reference, mask additional content, or retune the candidate.

The report can now map the reference's unnamed headings to `p#eyebrow` and
`h1#title` through a narrowly reviewed template identity rule. It requires one
outer `main.frame`, one authored `main#page`, unique direct children of the
expected tag/class, identical direct text, and no conflicting IDs. It preserves
the original nodes and style records. The mapping establishes correspondence
only: it does not accept color, opacity, sizing, offset or generated-content
differences. Other anonymous descendants remain review gaps.

The paint-mask classification additionally requires the active reference opacity
rule, the explicit candidate heading color rule, the explicit page background
rule, and matching core declaration/retained values. A changed rule, missing
evidence, duplicate identity, different parent/tag/text, or a different page
background cannot receive that attribution. The report keeps exact node paths,
rules, values, classification, and owner for each occurrence.

Read-only analysis of the 436 completed static checkpoints confirms all **872**
heading mappings and **872** unequal paint-mask observations. Direct retained
text comparisons increase from 302 to 1,174. Previously unmatched shared-ID
observations decrease from 1,136 to 264, and cases with remaining anonymous text
decrease from 436 to 216. The larger reviewed text scope exposes 3,159 unequal
retained-property observations: 872 heading colors are attributed to the masking
path; 2,287 other observations still require normalization or source attribution.
These are not counts of confirmed core defects. The 84 differing-own-text and
18 absent-retained-entry observations remain open. All full-tree hashes passed,
and all 43 source findings were detected.

Verification: `node --test tests/material-parity/*.spec.mjs` passed **60/60**,
including three new positive/negative identity and masking tests. The unfiltered
matrix continues with its unchanged capture modules and served bundle. Final
coverage, classification, and the checked-in full reports remain incomplete.

## Explicit font-weight aliases (2026-09-12)

The retained-stage comparison exposed 230 observations of browser `400` versus
core `normal`. This is a representation difference, not a renderer discrepancy.
The audit now normalizes explicit `normal` to `400`, alongside its existing
`bold` to `700` mapping. `reviewedValueNormalizations` records the technical
justification and proofs in the generated machine report. Raw full-tree styles
are preserved. Omitted weight, `bolder`, `lighter`, other numeric weights, font
stacks, and normal/zero letter spacing are not collapsed by this rule.

Evidence was added before changing normalization: the new audit regression
failed (one unexpected discrepancy), while the real-browser test passed for
both CSS aliases and showed that `bolder` changes with parent weight. A core
test passes the original values through `TextStyleParserService` and
`TextCanvasRendererService`, then compares complete canvas dimensions/pixels.
Both alias pairs match exactly, the raster contains ink, and 400 differs from
700. This is a narrow text-style/canvas proof, not a WebGL layout or full-scene
parity claim. No renderer implementation or fixture was modified.

Verification:

- `node --test tests/material-parity/*.spec.mjs`: **57/57 pass**.
- `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/services/text/text-canvas-renderer.service.spec.ts`:
  **8/8 pass**, repeated after adding the nonempty-ink assertion. The known Karma
  root-proxy warning remains; both commands exited 0.
- Reanalysis of all 436 static checkpoints: retained unequal-property
  observations decrease from 1,209 to 979; no weight differences remain in that
  table. The exact retained-stage attribution now covers 43 mapped signatures/
  338 occurrences, and the mapped unresolved count is 3,189. Other typography
  properties and missing mappings remain open; this does not establish complete
  input equivalence. All ten pinned capture-module hashes still match the live
  full-matrix manifest.

## Separate retained-typography review (2026-09-12)

Audit schema 3 now compares the already captured core text-registry stage without
merging it into normal/effective declaration snapshots. It consumes hash-verified,
pooled full-tree evidence and joins only unique shared IDs with identical direct
own-text. Eleven text properties retain all four values separately: browser
computed, candidate normal, candidate effective, and candidate retained text.
This also finds different retained values when declaration snapshots agree.

The narrow new attribution covers static mapped properties omitted in both
candidate declaration stages but present in the core registry and equal to the
browser computed value. It requires matching mapped text, evidence version 2,
core-source provenance and a revision. It classifies a demonstrated diagnostic
stage mismatch, **not** a font authoring defect or overall input equivalence.
Existing proven initial-value equivalents keep their classifications. Explicit
unequal declarations, hover/current-state paint, unshared or duplicated IDs,
different text, missing fields, and missing registry entries are not waived.
No inheritance, font fallback, transformed text, or world coordinates are
calculated in this report. Anonymous wrappers and plugin/control text still need
their own mappings/stage evidence; missing entries are explicit acceptance gaps.

Applied read-only to all 436 completed static checkpoints from
`retained-text-complete-audit`, this attributes 35 signatures/234 occurrences;
34 were previously unresolved. The mapped-style unresolved count is now 3,197
(previously 3,231). The separate retained-text table contains 302 direct text-node
observations and 1,209 unequal-property observations (111 unique family/element/
property/value pairs). These are **not** 1,209 confirmed renderer defects: they
include unreviewed normal/400 weight, start/left alignment, normal/zero spacing,
font-stack representation, and genuinely different sizes/colors. For example,
table text retains 16px while browser computed text is 14px; floating-label
font-size comparisons still require reference-transform context.

The new mapping/stage gaps are 436 cases with anonymous own-text, 1,136 missing or
ambiguous shared text IDs, 84 different direct-text observations, and 18 absent
core registry entries. Exact node paths remain in the report/inventory. These
counts reveal incomplete attribution rather than claim new regressions; the
full audit must review them before acceptance. Existing full-tree hashes passed
with zero collection errors. No fixture, renderer, capture graph, served bundle,
or threshold changed; the unfiltered full matrix continues using its pinned build.

Focused audit tests 36/36 pass, including five new cases covering separate
stages, hidden retained differences, rejected interaction/explicit overrides,
mapping/provenance failures, and missing property evidence. The full harness
command `node --test tests/material-parity/*.spec.mjs` passes **55/55**.
The checked-in final
JSON/Markdown deliverables remain pending complete capture and review.

## Durable full-matrix capture (2026-09-11)

The earlier `complete-input-audit` process is no longer running: its terminal
handle was missing and the Windows process inventory contained no matching
capture process. Its partial artifacts are preserved, but no aggregate report
was produced. This is not full-matrix verification and was not inferred from
an observation timeout. The subsequent separate production build completed
successfully at `examples/material-showcase/dist/material-showcase-retained-text-audit`.

The harness now checkpoints each fully captured case, including failing results.
Explicit `--resume` verifies exact browser/runtime identity, installed dependency
lock digest, served build files, transitive local harness imports, and selected
case matrices before reuse. Each result and its captured files are hash-checked;
partial writes do not count as completed evidence. Changed provenance or altered
artifacts fail closed. A fresh run refuses an existing checkpoint manifest; use
a new artifact directory for changed inputs. Do not run concurrent writers against
the same artifact directory. Checkpoints are local interruption recovery, not
an assertion that a subset meets the full gate.

Verification: `node --test tests/material-parity/*.spec.mjs` passed **46/46**,
including four checkpoint tests for failure retention, provenance/artifact/result
changes, partial writes, path boundaries, and transitive import fingerprints.
The one-case `core/light/desktop` capture in
`artifacts/material-parity/retained-text-checkpoint-smoke` completed with SSIM
0.999770 and two text-bearing nodes carrying `source:core-text-registry` evidence.
Repeating the exact command with `--resume` logged `Material resumed`, retained
the same input-tree hashes and metrics, and correctly reported full acceptance
as false (1/436 static, 0 interactions). The command used `--skip-build
--static-only`, the new browser output root, port4432, and those explicit filters.

The next full run uses no filters, `--enforce --skip-build`, the rebuilt browser
output, and the new directory
`artifacts/material-parity/retained-text-complete-audit`. If externally interrupted,
first confirm that its process is stopped, then repeat exactly with `--resume`.
The aggregate report is still written only after all configured cases complete;
checkpoint presence or passing smoke results must not be reported as completion.
No reference input, fixture style, case, acceptance threshold, or renderer behavior
changed in this increment. Fully resolved style coverage and substantive review
of every material difference remain separate unfinished requirements.

## Static review inventory and proven initial values (2026-09-12)

All 436 configured static checkpoint results are now available. Loading that
complete static subset through `buildMaterialInputAudit` reports zero missing
full trees, resolved-node gaps, state-provenance gaps or tree collection errors.
This establishes collection coverage, not completed semantic/style attribution.
The interaction run remains live; no aggregate full-matrix acceptance is claimed.

The static-only report contains 7,030 difference signatures and 68,933
occurrences. Before this increment, 3,505 signatures remained unattributed.
Three narrow initial-value equivalences are now justified by core implementation
and focused tests:

- `boxShadow` omitted versus `none`: `parseBoxShadow` returns the same empty
  layer list. Nonempty shadows are not accepted by this rule.
- `gridColumn` or `gridRow` omitted versus `auto`: the grid axis parser uses the
  same automatic single-track placement branch. Explicit lines, spans and
  template differences are not accepted by this rule.

The audit retains those entries with explicit technical justifications instead
of deleting their evidence. In the static subset this classifies 804 no-shadow,
1,264 automatic-column and 1,264 automatic-row occurrences, reducing unresolved
signatures to **3,231**. This is review progress, not 3,332 fixed rendering bugs.
Appearance, clipping, inheritance, used sizing and other unresolved inputs still
need their own evidence; the initial-value list is not a blanket defaults waiver.

The core tests are in `box-shadow.spec.ts` and `grid.service.spec.ts` beside the
owning implementations. The report regression verifies these accepted pairs and
rejects nonempty shadows/explicit placement. `node --test
tests/material-parity/*.spec.mjs` passes 50/50. The focused core command
`npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/services/dom/elements/box-shadow.spec.ts --include=src/app/services/dom/elements/grid.service.spec.ts`
passes **24/24** in Chrome Headless 152. No implementation, fixture,
capture module or running served build changed.

## Badge reduction: intrinsic parent width and positioned margins (2026-09-12)

Six new equivalent-input cases separate the badge's measured width and changed
anchor offsets from the core rules they can conceal. They use the same rule
objects for browser CSS and public `SiteData` and the existing 640x360px test
surfaces. Text-bearing cases use Arial 16px/20px. No Material plugin, measured
width or DPR correction is involved.

Both inline and inline-block content-sized spans containing the label
`Notifications` stay **zero-width** in Astylar instead of the browser's
87.15625px. The label's horizontal edges match. The parent starts at x20 on both
sides, but its right edge is x20 instead of x107.15625. Removing the positioned
badge child reproduces precisely that parent-width error in both display modes.
This is a confirmed **core descendant-intrinsic-width defect**, not a font-width
or Babylon projection discrepancy. `ElementDimensionService.measureTextContent`
measures own text, `calculateIntrinsicWidth` falls back to zero without own text,
and `ElementCreationService.layoutInlineChildren` subsequently updates height
while retaining that zero parent width. The missing descendant contribution must
be resolved before parent flow placement and descendant containing-block use.

The compound badge cases retain all four positioned-badge edge checks. They
also expose placement errors; these are not all declared explained merely by
the parent width. Inline text fragments and core text planes are different
vertical measurement objects, so the new proof compares only their horizontal
contribution; the frame, inline-block host and positioned badge use full edge
checks. This scope does not claim inline ink-height or text raster parity and
does not change assertions in any pre-existing reduction.

A second control removes text, inline flow and percentages entirely. In a
180x100px relative parent, a fixed 16x16px absolute child with left:40px and
bottom:20px has these border-box origins:

| Margin | Browser (x,y) | Astylar (x,y) |
| --- | --- | --- |
| -12px | (28,76) | (40,64) |
| +12px | (52,52) | (40,64) |

Its size matches. This confirms **core positioned offsets ignore the margin
box** in this left/bottom case. The dimension service returns parsed margins
but its left/bottom offset branches omit them from the border-box origin, which
is passed to final rendering. The positive/negative controls must remain while
extending top/right, auto-margin and over-constrained coverage before a fix.
The original badge's remaining compound vertical placement still requires
reverification after the independently established rules are corrected.

The first bad revision is not established for either defect; blame dates on
individual formulas are not a historical reproduction. No renderer or showcase
implementation was modified. The focused command
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
ran twice with **8 passed, 15 failed across 23 cases**. The six added failures
are retained alongside the earlier nine. Existing Zone.js/zoneless NG0914
warnings remain; runtime is Chrome Headless 152, Babylon 8.56.2/WebGL2.
`node --test tests/material-parity/*.spec.mjs` passes **49/49** and
`git diff --check` passes. The unfiltered full Material capture continues using
its pinned, unchanged served build and capture modules.

## Badge theme inputs (2026-09-12)

All twelve badge static captures in `retained-text-complete-audit` retain
reference `.mat-badge-content` with
`background-color:var(--mat-badge-background-color, var(--mat-sys-error))`.
Candidate `.badge-bubble` instead supplies `theme.primary`. Exact resolved pairs:

| Profile | Reference error color | Candidate primary color |
| --- | --- | --- |
| light | #b3261e | #6750a4 |
| dark | #f2b8b5 | #d0bcff |
| contrast | #8b0000 | #000000 |
| custom | #ba1a1a | #006a6a |

Each pair occurs at desktop, tablet and mobile. This is an application authoring
defect, not evidence of incorrect core color conversion. The existing inline
width table is a separate input discrepancy. Commit `48c994e` retained the
primary-token choice while changing badge text structure; the first introduction
of that choice is not claimed here.

The audit now attributes this property only with the exact paired span mapping,
reference token declaration, candidate color declaration matching its resolved
color, and no competing background declaration. It retains the exact witness
rules separately from compact authored examples, which can truncate earlier
rules. Negative tests leave missing/conflicting witnesses unresolved. Applying
the classifier to all twelve fresh checkpoint results yields four reviewed
signatures, three occurrences each, with no input-tree collection errors.
Their minimum whole-page SSIM is 0.993772 despite the wrong badge color: that
scalar alone does not establish local paint correctness. `node --test
tests/material-parity/*.spec.mjs` passes 49/49; `git diff --check` passes.
Other badge properties and states are not implicitly accepted. The current
capture graph, fixtures and reference styles are unchanged.

## Original expressions through core loaded CSS (2026-09-12)

The grid-list reductions now also send the original `calc(80px)`,
`calc(50% - 0.5px)` and `calc(50% + 0.5px)` declarations through the existing
public `provideAstylar({css:{useDocumentStyles:true}})` path. Reference and host
receive identical CSS, scoped to a class on the same authored elements without
adding a layout wrapper. Candidate `SiteData.styles` is empty in these variants;
no test-side expression evaluator or measured browser dimensions are injected.
The temporary stylesheet is removed with the surface.

At both 280px and 480px, public pre-projection `inspectResolvedStyles()` assertions
match browser width/height/left for the list and both tiles. All three outer
border boxes and the one-pixel gutter also match. Only the inner content bottoms
fail: candidate 20px versus browser 80px. Thus the existing core expression path
handles these specific expressions, while the downstream opposing-inset
auto-height defect remains. This does not establish arbitrary function support,
full Material loaded-style integration, text raster quality, or responsiveness
beyond the two separately mounted widths. No fixture or core behavior changed.

The same focused Chrome command below completed twice with **8 passed, 9 failed**
across 17 cases. The original fifteen cases are retained unchanged in intent and
assertions; the two added loaded-CSS cases retain their height failures rather
than omitting inner content from measurement. All 48 Material harness tests pass
(`node --test tests/material-parity/*.spec.mjs`); `git diff --check` passes.
The generated proof inventory and implementation plan now separate
this bounded resolution evidence from the still-required core height fix.

## Grid-list: expression boundary and positioned height (2026-09-11)

Fresh static captures retain Material's actual `.mat-grid-list` block container
and absolute tiles. Tile one has width `calc(50% - 0.5px)` and left `0`; tile two
has the same width and left `calc(50% + 0.5px)`. Height is `calc(80px)`. These
inputs produce a 1px gutter. The candidate instead authors `display:grid`,
`gridTemplateColumns:'1fr 1fr'`, `gap:'0'`, and relatively positioned flex tiles.
The substitution dates to initial showcase commit `2f44011`.

New identical-input reductions retain those expressions at 280px and 480px
container widths. Both fail: candidate height is 360px rather than 80px, each
tile takes the full container width, and the second starts at zero. This is the
documented **direct StyleRule calc-resolution limitation**, not automatically a
defect in claimed function support. `docs/compatibility/html-css.md` and the
capability catalog distinguish direct authoring from the opt-in loaded-document
CSS resolver. `ElementDimensionService` leaves dimensions at their provisional
parent values when `parseFloat('calc(...)')` is NaN. Any eventual solution must
use a verified core-owned resolution path or general expression support, not
fixture-specific arithmetic.

Separate literal controls use the mathematically corresponding lengths on both
sides. They are diagnostic controls, not replacements for the expression cases
or proposed showcase changes. The list and both outer tile border boxes now
match, including the 1px gutter. However, the text-bearing content with absolute
top/bottom/left/right zero is only 20px high instead of 80px on Astylar.

A further reduction removes Material and calc entirely. A text-bearing absolute
box inside a 280x100px parent has top:10px, bottom:15px, left:12px, right:18px.
Both ordinary block and flex variants correctly match the horizontal edges and
top, but their bottom is 30px instead of 85px: intrinsic text height 20px is used
instead of the 75px opposing-inset height. This confirms a separate **core
positioned auto-height defect**. The dimension service has a horizontal
`positioned-insets` width branch, but no equivalent vertical branch before its
intrinsic-text fallback and min/max constraints. Subsequent block/flex intrinsic
resizing must also preserve positioned used-height ownership; merely patching
the initial mesh size would be insufficient. All of this arithmetic precedes
Babylon projection. The audit does not assert the first revision that introduced
the missing vertical rule.

The existing zero-inset empty drawer proof remains valid for its measured boxes,
but cannot establish general opposing-inset support: provisional parent height
can coincidentally match an empty, zero-inset box. The nonzero-inset text-bearing
reduction exposes that distinction. Keep both, with their different scopes.

Verification command:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
The completed fifteen-case suite ran twice with **8 passed, 7 failed**. The seven
failures are the two original-expression grid-list cases, two literal controls
with incorrect content height, two opposing-inset reductions, and the previously
recorded divider defect. Earlier eight passing reductions remain passing.
No tolerance, reference expression, authored fixture, or core implementation
was changed. The same existing NG0914 and text-bearing-main advisory warnings
remain. These are intentional retained diagnostic failures, not a green release
claim. The full capture continues independently against its pinned bundle.

The report separates the calc limitation, the opposing-inset core defect, and
the fixture's grid substitution into three findings with distinct owners.
Applying its witness-based container classifier to the twelve fresh static
grid-list records attributes exactly the block-to-grid display signature;
conflicting or missing declarations still leave attribution unresolved.
`node --test tests/material-parity/*.spec.mjs` passes **48/48**. The implementation
plan now requires both used-height corrections and verification of the existing
core CSS-expression resolution path before restoring equivalent grid-list input.
None of these findings waives the remaining full-tree, state, or paint review.

## Sidenav equivalent-input reduction (2026-09-11)

The freshly checkpointed twelve static sidenav cases show an authored
`display:block` reference container and an authored `display:flex` candidate.
The light/desktop full tree additionally locates the reference's absolute drawer
at `frame/2/0/1`, its independent scroll wrapper at `frame/2/0/1/0`, and its
margin-offset content at `frame/2/0/3`. The corresponding candidate at
`root/0/2/0` is a flex container with two direct text-bearing siblings. These
trees are under `artifacts/material-parity/retained-text-complete-audit/sidenav`;
their recorded hashes are preserved by the case checkpoints.

The ninth browser reduction uses one shared set of declarations for both sides:
a relative 360x220px block with hidden overflow, an absolute 160px border-box
drawer stretched by top/bottom:0, 20px padding and a1px right border, a100% inner
scroll wrapper, and content-box content with margin-left:160px, height:100% and
20px padding. All four border boxes pass the unchanged0.5px geometry tolerance.
The reference content's padding may extend its border box below the container;
the proof preserves that constraint rather than fixing both boxes to220px.

`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
ran twice with **8 passed, 1 failed**. Only the pre-existing paragraph/divider
reduction fails: separator bottom383 versus82, following paragraph top399 versus98,
and parent bottom464 versus163 (all301px errors). The new drawer composition
passes without the candidate flex replacement or17px top-padding adjustment.
This proves those substitutions are not required by the tested geometry path;
it does not prove text raster, scrolling/reachability, animated drawers, responsive
Material behavior, or all anonymous-wrapper equivalence. Those remain separate
coverage requirements. Warnings include the existing NG0914 Zone.js setup warning
and the core advisory that a text-bearing `main` may not be optimal; the latter
does not reject the public element or fail its geometry test.

Git history places the `.sidenav-container` flex rule in `2f44011`, the initial
showcase, rather than a later demonstrated core repair. No fixture or renderer
input was changed by this proof, and the full matrix continues with its original
pinned served bundle.

The audit now attributes the mapped sidenav container's block-to-flex difference
only when both captured authored rules, resolved values, family/ID, and paired
node types match this reviewed path. Conflicting declarations or missing/changed
selectors leave attribution unresolved. Applying the classifier to all12 fresh
static sidenav records resolves exactly that display signature with12 occurrences;
it does not waive other properties or the wrapper/scrolling differences. The
source finding records the independent scroll wrapper and containing-block
ownership lost by the fixture substitution. The28 focused audit tests pass,
including negative witness/conflicting-cascade/type cases. The report's proof
inventory now lists nine reductions, eight passing and the one retained divider
failure. This changes audit interpretation only, not the running capture inputs.

## Retained core text-input evidence (2026-09-11)

The diagnostic snapshot now has an additive optional `retainedText` field with
`source:core-text-registry`. It copies the existing text registry's retained
style, which the ordinary text-rendering path registers after passing that style
to texture creation. It neither recomputes inheritance nor reads mesh positions.
Normal and effective cascade declarations remain separate and unchanged.

This is deliberately a stage-specific field, not a claim of complete computed
style: hidden nodes with no retained text entry have no such field; anonymous
nodes without authored IDs are not guessed from mesh names; retained registry
styles do not necessarily describe later pseudo-state glyph textures. Those
boundaries still need evidence before the overall fully resolved input requirement
can pass. No blanket equivalence classification or missing-value waiver was added.

The Material collector preserves the optional text stage in each full-tree node,
and the audit pools it separately from normal and effective style tables. The
inherited-typography reduction compares the same browser values to this explicit
core text-input stage, rather than requiring the earlier cascade stage to contain
later inherited values. This changes the observation boundary, not either side's
authored input, layout, expected typography, or tolerance.

Focused core browser verification:
`npm test -- --watch=false --browsers=ChromeHeadless --include=src/lib/astylar-style-inspection.spec.ts --include=src/lib/astylar-surface.spec.ts`
passes **7/7**. The new test covers inherited font size/line height, detached
copies, absence for non-rendered text, update revisions, and unchanged resources.
`npm run skill:check`, `npm run examples:check`, and the 27 audit tests pass.
`npm run capabilities:check` still fails only the previously recorded
`element-creation.service.ts` fingerprint (expected `2edeb33f...`, actual
`bf5fd586...`); Git confirms that file's worktree content equals HEAD.

The showcase diagnostic dependency replacement initially failed from an incorrect
relative tarball path, then from the pre-existing Angular animations/common peer
version mismatch. The explicit workspace tarball path with `--no-save
--package-lock=false --no-audit --no-fund --legacy-peer-deps` replaced exactly one
package. No dependency manifest or lockfile changed. The separate clean packed
consumer check uses its normal installer without that diagnostic override.

With the new packed diagnostic installed, the command
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts --include=src/app/material-input-evidence.spec.ts`
reports **13 passed, 1 failed**: all six collector tests and seven of eight
browser reductions pass. Inherited 24px/32px typography now passes through the
explicit retained-text stage; only the unchanged divider failure remains.
The proof still uses exactly the same parent/child declarations and geometry
tolerance. Chrome reports the existing test setup's NG0914 warning (zoneless
TestBed while the showcase loads Zone.js).
`npm run consumer:check` passes: 419 packed files, browser and SSR/prerender
builds, and **4/4** Chrome tests, including inherited text values and isolation
between two package-root surfaces. Its disposed-surface diagnostic is expected
by the negative test. The complete root command
`npm test -- --watch=false --browsers=ChromeHeadless` also passes **452/452**.
These results are not complete audit acceptance. The existing full Material
matrix continues against its unchanged `material-showcase-inspection-audit`
bundle. A separate `material-showcase-retained-text-audit` production bundle is
being built for the next diagnostic capture; do not overwrite the served bundle
or describe the older captures as containing the new text-stage field.

## Typography-stage evidence gap (2026-09-11)

The eighth identical-input reduction uses a parent with `font-size:24px` and
`line-height:32px`, containing a text-bearing block with no own typography rules.
Browser computed child values are 24px and 32px. The settled public core style
snapshot omits both fields. Parent and child border-box geometry nevertheless
passes the existing 0.5px comparison. This is a diagnostic-stage gap, not proof
of missing authored intent or broken rendered inheritance.

The same focused Chrome command recorded below now reports **6 passed, 2 failed**:
the new snapshot assertions fail (`''` versus `24px` and `32px`), and the divider
retains its earlier 301px failures. An initial inline-span version also exposed
the omitted fields, but compared a browser inline fragment with a candidate
line box; changing the reproduction to an ordinary block removes that unrelated
measurement ambiguity without adding typography declarations or changing the
expected inherited values. No text pixel-parity claim is made by either probe.

Source trace: `Astylar.inspectResolvedStyles` calls `getElementInteractionStyles`,
whose normal branch resolves `StyleService.findStyleForElement`. That stage
explicitly handles cursor inheritance but does not supply inherited typography.
`BabylonDOMRendererService`, `ElementDimensionService`, and `FlexService` each
contain a later `getInheritedTextStyle` path. Their declarations must not be
conflated with the earlier diagnostic snapshot. The public snapshot is documented
as diagnostic declarations, not used layout boxes; treating it as fully resolved
typography in this audit is the defect.

The report records `audit-style-snapshot-precedes-typography-inheritance` as a
parity-harness defect and puts trustworthy stage capture ahead of repair-plan
acceptance. The next instrumentation change must expose authoritative core
pre-projection typography with provenance, preserving authored and pseudo-state
evidence. It must not reproduce inheritance logic in the showcase or blanket-waive
missing values. The active full matrix remains useful outcome/declaration
evidence, but cannot by itself close this fully resolved input requirement.

## Attribution is not inferred from unequal resolved values (2026-09-11)

The shared demo root now has a bounded reviewed rule: only mapped section nodes
with captured `.demo` reference evidence and an explicit matching candidate
`#<family>-root` declaration can attribute `static -> relative` and
`block -> flex` to fixture authoring. Missing evidence, different semantic tags,
or a candidate declaration that disagrees with its resolved value retain their
attribution gap. This separates a source-proven compensation from a hypothetical
cascade defect. The live source pattern is checked alongside the report.

A different root discrepancy is representational: reference `max-width:720px`
on a content box plus 28px padding and 1px border on each side equals a 778px
border-box maximum. Normalization now accepts that constraint only when both
box-sizing modes and every inset are explicit fixed pixel values. It does not
waive the box-sizing difference, other dimensions, or percentage/auto/intrinsic
constraints. Tests include unequal limits, unresolved insets and reversed sides.
All 27 audit tests pass; no fixture input was changed.

The automatic style classifier previously labelled every unmatched scalar pair
an application/plugin authoring defect. That was too strong: a resolved value
may differ because of defaults/cascade, wrapper mapping, used-value serialization,
or genuinely unequal authored rules. An omitted resolved property also does not
prove missing authored intent. These signatures now remain explicit harness
attribution gaps until their authored-rule and semantic-box evidence is traced.
The report counts unresolved attributions and rejects complete acceptance while
they remain. Distinct attribution evidence cannot collapse into a shared signature.

This does not retract separately traced source findings or observed supplemental
behavior failures. It prevents the raw discrepancy count from being presented as
a count of proven authoring defects. Focused audit tests pass 24/24; fixture
inputs, renderer output, and the in-flight matrix are unchanged.

## Divider, sidenav and table source review (2026-09-11)

Fresh light/desktop full-tree evidence in
`artifacts/material-parity/complete-input-audit/{divider,sidenav,table}` confirms
three additional unequal-input paths:

- Sidenav reference styles explicitly specify `padding:20px` for both drawer and
  content. The candidate instead authors `17px 20px 20px`, moving text upward.
  This difference already existed in the original showcase commit `2f44011`.
- Divider reference paragraphs participate in normal block flow with 16px
  vertical margins; the separator is a 1px top border. Commit `fcde1b7` replaced
  paragraphs with absolutely positioned wrappers. Later `1f2f2aa` and `662c179`
  adjusted their theme/mobile/DPR-sensitive positions. These are not equivalent
  layout declarations.
- Table reference header/first body cells own their bottom borders; the final
  body cell has none. Candidate cell borders are disabled and two absolutely
  positioned sibling divs draw their replacements using density-specific row
  offsets. This also dates to `2f44011`. Reference light/desktop table text is
  14px with a 20px line height, whereas candidate source rules declare 16px.
  Table layout creates temporary cell/row style overrides: its captured mesh
  declarations must not be confused with original authored padding or fonts.

### Table reduction: declarations and geometry without detached borders

The seventh case in `input-equivalence-proof.spec.ts` uses the same two-row
table, class-descendant cell selector, 16px horizontal cell padding, 14px/20px
typography, and first-cell bottom border on both sides. Public `tableProperties`
are translated to the corresponding browser CSS declarations; no sibling rule
elements or absolute border positions are present. The test compares table,
row and cell edges and inspects settled core padding, border width, font size
and line height against browser computed declarations.

Verification on 2026-09-11:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`
reports **6 passed, 1 failed** in Chrome 152/WebGL2. The table case passes;
only the previously reproduced empty-block case below fails, with the same
301px edge errors. A repeat with the class-descendant selector gives the same
result. The six passing cases are scoped geometry/declaration evidence, not
complete Material acceptance. In particular, this table test does not inspect
border pixels, glyph rasterization, header semantics, collapsed borders, or
responsive column allocation. No general table-renderer defect is established
by the showcase's detached-border workaround alone.

### Confirmed core reduction: empty auto-height block

The new paragraph/divider case in
`examples/material-showcase/src/app/input-equivalence-proof.spec.ts` generates
both browser CSS and Astylar styles from the same rule objects. It uses a padded
block, two ordinary paragraphs, and an empty block carrying a 1px top border.
There are no absolute coordinates or measured replacement dimensions.

Run twice:
`npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Both Chrome 152/WebGL2 runs report **1 failed, 5 passed**, with the same failure:
the separator begins at y=81 on both sides, but ends at y=383 in Astylar versus
y=82 in the browser. The following paragraph begins at y=399 versus y=98, and
the parent ends at y=464 versus y=163. The five earlier reductions still pass.
This is retained failing evidence, not a successful verification or skipped test.

Source tracing identifies the owning rule: `ElementDimensionService` initializes
height from the parent's content height. Its auto/intrinsic replacement is
limited to inline elements, text-bearing elements, and textareas. The empty
block retains the provisional 302px height, and `ElementCreationService` only
recurses into child layout when children exist. This is a CSS used-height defect,
not a Babylon coordinate-conversion defect. The reduction uses explicit Arial
16px/20px typography; it proves the empty-block flow failure, not complete Material
Roboto text/raster parity. Fix the general empty non-replaced auto-height rule
before removing the divider compensation, protecting explicit constraints,
flex/grid stretch, replaced elements, padding/borders and nested/resize behavior.
No renderer fix or showcase input adjustment was made in this audit increment.

## Hidden-node inspection boundary (2026-09-11)

The complete root suite (`npm test -- --watch=false --browsers=ChromeHeadless`)
passed 451/451 after the snapshot integration. The earlier mesh-only collector
run was deliberately superseded, not abandoned on a timeout. Its captured
artifacts and the completed original baseline remain intact. The new unfiltered
`node tests/material-parity/run-material-parity.mjs --enforce --skip-build` uses
`ASTYLAR_MATERIAL_BROWSER_ROOT=examples/material-showcase/dist/material-showcase-inspection-audit/browser`
and `ASTYLAR_MATERIAL_ARTIFACTS=artifacts/material-parity/complete-input-audit`.
It is still running; no complete result is claimed here.

All three supplemental probes were rerun against this build on port 4431:
`audit-material-picker-commits.mjs`, `audit-material-overlay-breakpoints.mjs`,
and `audit-material-slider-domain.mjs` in `scripts/`. They retain the previously
observed six picker failures, one medium-width bottom-sheet failure, and four
slider-domain failures, with no page errors. The picker month's first recapture
attempt exposed a harness mistake: a geometry-only measurement was asked for
its omitted input tree. The corrected probe requests settled input evidence;
its successful recapture still reports all six behavioral mismatches rather
than changing application behavior or masking the failures.

The showcase collector now consumes this snapshot by authored tree path and
retains its source and revision through report pooling. Geometry-only action
targeting explicitly skips input inspection; final input capture awaits settlement
and measures in the same browser evaluation. A first hover smoke correctly
rejected an unsettled targeting-time inspection; separating these two purposes
fixed the harness call site without weakening the core snapshot's guard.

Focused production-build checks after integration:

- `form-field,expansion`, contrast/desktop, static report mode: 2/2 pass, minimum
  SSIM 0.996178 and maximum edge error 0.013px. `form-field-label` and
  `expansion-content` now retain `display:none` resolved declarations; the hidden
  expansion label also has its own resolved styles. Both candidate trees have
  source `core-style-inspection`, revision 3, and no missing resolved nodes.
- `core`, light/desktop-dpr1, hover and held report mode: 2/2 pass, minimum SSIM
  0.999540. Normal `#6750a4` and effective `#735eab` backgrounds are retained at
  revisions 5 and 6. These are focused checks, not complete enforced acceptance.
- 27/27 showcase component/helper tests and 62/62 harness tests pass. The separate
  browser/server production build at `dist/material-showcase-inspection-audit`
  succeeds. It does not replace either of the older served bundles.

Core now exposes the on-demand `AstylarSurface.inspectResolvedStyles()` diagnostic
snapshot. It traverses the authored tree (including hidden descendants and
anonymous nodes) through the existing core cascade and interaction resolution.
Paint and inspection share the same pseudo-state merge order. Snapshots retain
normal/effective declarations and the settled revision, contain no projected
geometry, and are detached from authored data. Pending or disposed surfaces are
rejected. No inspection work runs unless the caller requests it.

This is the narrowly scoped instrumentation addition needed to close the audit's
mesh-only evidence gap, not a renderer parity fix. The public API compatibility
decision and usage constraints are recorded in `docs/compatibility/html-css.md`
and synchronized developer references. No private service is exported to the
showcase and no plugin/application style resolver was added.

Verification: core style-inspection and surface-handle tests passed 6/6 in Chrome
152 with Babylon 8.15.1/WebGL2. `npm run consumer:check` passed: a fresh package
with 419 files, browser/server build and prerender checks, and 4/4 Chrome tests,
including the package-root hidden-node/focus/two-surface inspection proof. The
disposal assertion intentionally emits the `surface-disposed` diagnostic.
`npm run skill:check` and all 11 translation-example checks also pass.

`npm run capabilities:check` reports a pre-existing stale fingerprint for
`element-creation.service.ts`. HEAD and working source both hash to
`bf5fd5861c7d1b412520a41abf5bfa0aa1085d9a139a96f3d202dde6cbf8ea3a`, while HEAD's
catalog still records `2edeb33f4095e3d3bb2be889991473e153df96f6d9a46ec9af94bbc56fa87d24`.
The last source change is `97e0da0`, retaining CSS select-popup anchor geometry;
this increment does not touch that source or refresh its acceptance fingerprint.

## Effective-state evidence correction (2026-09-11)

The Material collector previously compared browser computed interaction styles
with Astylar's normal mesh declarations. Core already publishes its resolved
normal/hover/focus/active merge as `astylarResolvedInteractionStyle`; the audit
now captures that result, preserves normal and interaction snapshots separately,
and labels the evidence version 2. No fixture styles, rendering rules, or visual
thresholds changed. Legacy state captures remain explicit harness gaps: updating
the collector source cannot retroactively upgrade their evidence.

Focused real-browser verification used the separate production output
`examples/material-showcase/dist/material-showcase-effective-audit/browser`, port
4432, artifacts `artifacts/material-parity/effective-style-smoke`, family `core`,
profile `light`, interaction viewport `desktop-dpr1`, and states `hover,held`:
`node tests/material-parity/run-material-parity.mjs --skip-build --interaction-only`.
Both cases passed their existing visual checks (minimum SSIM 0.999540).
`core-primary` retained normal background `#6750a4` and captured effective
background `#735eab` in both states. All four full-tree sidecars passed digest
and collection validation; neither candidate state retained a provenance gap.
This is a focused report-only check, not complete enforced acceptance.

Verification also passed 4/4 Material evidence helper tests, 22/22 Material
component tests, and 62/62 `npm run parity:harness:check` tests. The unfiltered
matrix already running uses the earlier separate bundle and is being preserved;
its state captures will still require replacement with version-2 evidence.
Hidden/non-rendered nodes remain a separate unresolved collection gap. They must
be observed through core style resolution, not assigned manufactured styles by
the audit.

## Rendered geometry feeds layout

`examples/material-showcase/src/app/astylar.component.ts`, `connectedOverlayTop`, calls
`measure(surface, [anchorId], false)`. That measurement calls `computeWorldMatrix`,
projects `boundingBox.vectorsWorld` with `Vector3.Project`, and converts the result
to CSS pixels. `connectedOverlayTop` then uses `anchor.top` to author the next
datepicker overlay position.

This is a confirmed architectural violation: expressing the result in CSS pixels
does not remove its dependency on rendered output. It also creates first-render
versus update dependence. The earlier audit instrumentation correction in
`d6a3158` avoided re-entering the `siteData` computed signal; it did not fix this
layout feedback path.

Core already owns `layoutBoxesMap`, consumed by the scroll runtime in
`src/lib/astylar.ts`. The public `AstylarSurface` interface in
`src/lib/astylar-surface.ts` has no layout-box query. Plugin render contexts do
receive their own CSS dimensions (`src/lib/astylar-plugin.ts`), but that is not
an application query for an arbitrary overlay anchor. Implementation should
reuse authoritative core CSS geometry, not add another calculation based on
mesh output. Test first open, subsequent updates, scroll, nested transforms,
resize, and DPR separately.

## Slider authoring and test coverage disagree with the reference

`reference.component.ts` declares a Material range slider with min 0, max 100,
and step 5. `astylar.component.ts` authors start as 0..50 and end as 50..100,
both step 1, and clamps their values at 50. Shared state normalization rounds
values to multiples of 5, introducing another difference between the native
control's value and application state.

Start=60/end=80 and start=20/end=40 are valid shared states but cannot be
represented faithfully by those candidate controls. This discrepancy exists
before rendering; it is not evidence of a Babylon coordinate bug.

The harness `sliderDragCoordinates` only targets start=40 and end=75. Both
remain within those restricted halves. A green drag test therefore does not
disprove the defect. Restore equivalent domains and step semantics, then add
cross-midpoint drags in both directions, full-range reachable values, and
keyboard increments. Reduce any remaining hit-testing failure independently.

Supplemental real-action proof (2026-09-11):
`node scripts/audit-material-slider-domain.mjs --base-url=http://127.0.0.1:4431`
opens the unchanged production fixtures at light/1440x900/DPR1 and records native
range attributes and values at each action boundary. No state is injected.

| Action from start30/end65 | Reference final values | Astylar final native values |
| --- | --- | --- |
| Start: six ArrowRight presses | 60 / 65 | 40 / 65 |
| End: five ArrowLeft presses | 30 / 40 | 30 / 58 |
| Start: drag to60% | 60 / 65 | 50 / 65 |
| End: drag to40% | 30 / 40 | 30 / 50 |

Start keyboard traces are reference30,35,40,45,50,55,60 versus
candidate30,31,32,35,36,37,40. End keyboard traces are reference
65,60,55,50,45,40 versus candidate65,64,63,60,59,58. These demonstrate
step1/round-to5 discontinuities as well as the pointer half-domain clamp.
Reference native bounds are peer-constrained (initially start0..65/end30..100);
candidate bounds stay0..50/50..100. The correct authoring contract is the
component's full range with peer constraints, not two independent unrestricted
thumbs and not two fixed halves.

The diagnostic waits for renderer settlement plus two animation frames between
actions on both sides. An initial exploratory rapid-key sequence dropped some
reference updates; it is not used as deterministic evidence. The settled run
captures all expected reference transitions. Two full diagnostic runs reproduced
the same outcomes. All four supplementary cases fail
parity honestly (exit1), with eight verified full input trees and no page or
collection errors. Artifact references and SHA-256 digests are under
`artifacts/material-parity/slider-domain-audit`. The audit loader requires all
four cases, verifies trace lengths, native step/value quantization, unchanged
peer values, expected keyboard increments and monotonic pointer samples, and
recomputes outcomes rather than trusting `matches`. Collection/reference-action
failures are reported separately from confirmed candidate mismatches.
Audit unit tests20/20 and `npm run parity:harness:check`58/58 pass.

## Plugin typography ownership

`MaterialTabPanelRenderer` in `material-showcase.plugin.ts` allocates a
`DynamicTexture`, calculates a baseline using `textureFontSize * .328125`,
adds an authored `baseline-offset`, and draws text with `fillText`.
This is a confirmed second text-paint path. Transition orchestration can stay
Material-specific; ordinary text layout and rasterization should use core.
The general plugin coordinate adapter is not itself evidence of a violation:
final CSS-to-render projection is its intended responsibility.

## Intrinsic sizing and layout substitutions

Reviewed the reference declarations in `reference.component.ts`, installed
Angular Material styles, and fresh light/desktop full-tree captures against
`astylar.component.ts`. These are input discrepancies, not yet confirmed core
failures. Source policy entries retain exact candidate locations and history.

| Component | Reference input | Candidate substitution | History / owner |
| --- | --- | --- | --- |
| Toolbar | Title has no width declaration; action has min-width:64px, content and padding; a flex spacer fills remaining space. | Title width 192.15625px and action width 65.140625px, both non-shrinking; action becomes 64px at the mobile breakpoint. Reference used widths in the capture are 192.156px and 65.1406px, exposing the measured-value substitution. | `92067a1`; fixture intrinsic sizing, then core flex/text if equivalent composition fails. |
| Badge | Inline relative span with auto width around Notifications. | Width table 81.859375/104.65625/90.953125px selected by density/typography. | `2f44011`; fixture inline sizing and core text/inline layout investigation. |
| Chips | Content and graphic/padding determine chip width. | ID/state tables 97/68px and 93/64px. Selected reference chips measure 97.4219px and 92.75px in this capture. Rounding their output into authored widths is not equivalent input. | `00de46c`; fixture composition and intrinsic flex sizing. |
| Stepper | `.mat-horizontal-stepper-header-container` is flex; `.mat-stepper-horizontal-line` uses flex:auto, height:0, min-width:32px, margin:0 -16px and a 1px top border. | Absolute headers and connector, with connector widths 73.2%, 69.5%, and 15.1% at breakpoints. | `4e58f58` connector changes; `bc4d442` header width changes; fixture flex composition first. |
| Grid list | Two absolute tiles emitted by Material; widths calc(50% - 0.5px), second left calc(50% + 0.5px), giving a 1px gutter. | Two CSS grid tracks with gap:0. | `2f44011`; fixture translation, not evidence of a grid-engine defect. |

The fresh reference trees are under
`artifacts/material-parity/<family>/light/desktop/reference-input-tree.json`.
Their authored-rule records include media/support conditions; merely matching a
selector is not proof that an inactive rule applies. The values above were
cross-checked against computed styles and current source, not inactive rules.

Card shadow counterexample: the reference's light/desktop `card-primary` uses
three layers (0 2px 1px -1px at .2 alpha, 0 1px 1px at .14, 0 1px 3px at .12).
The candidate `.material-card` supplies those same layers. Accept this specific
shadow representation; it does not waive card typography, wrappers, colors,
theme variants, or the shared fixed-height table. A literal constant is not by
itself evidence of compensation.

## Picker commit behavior missing from the configured matrix

`node scripts/audit-material-picker-commits.mjs --base-url=http://127.0.0.1:4431`
ran against the separately built audit showcase on 2026-09-11 (Chrome
152.0.7977.76, light, 1440x900). The script opens fresh pages and delivers real
pointer clicks on each toggle and then a date/time option. Two consecutive runs
produced the same values, open states, and click targets. It deliberately exits
1 when committed values or open state differ; it does not bless the defect with
an inverted passing assertion.

| Action | Reference after settlement | Astylar after settlement |
| --- | --- | --- |
| Select day 1 | Input `9/1/2026`; popup closed | Input empty; popup open |
| Select second time option | Input `12:30 AM`; popup closed | Input empty; popup open |

Both candidate event logs confirm the exact target (`datepicker-day-1` and
`timepicker-option-1`). Neither side reported a page error. The detailed artifact
is `artifacts/material-parity/picker-commit-audit/latest-report.json`.
The diagnostic syntax check and all 52 harness self-tests passed; these do not
override the two intentionally retained behavioral failures.
This establishes a fixture interaction defect: the authored inputs always use
`value:''`, and `handleClick` has no date/time selection commit branch. It does
not implicate pointer-coordinate conversion or core layout.

The configured matrix includes `open-commit-reopen` for autocomplete/select only.
It exercises date/time opening, hovering and dismissal without committing an
option. Thus 1,875/1,875 configured interaction cases cannot establish all
relevant interaction coverage. Picker commit/reopen, calendar navigation,
and keyboard selection still need explicit audit coverage and durable maintained
assertions; retain this honest failing diagnostic meanwhile. The reference's
committed date string varies with the test date; the script compares actual values rather than
hard-coding September as the correct future month.

The supplemental script now covers six cases and captures both complete input
trees after each action, referenced by SHA-256 digests. Two expanded runs on
2026-09-11 also confirmed keyboard selection failures (reference commits
`9/2/2026` or `12:30 AM`; candidate remains empty/open), previous-month failure
(reference AUG 2026; candidate SEP 2026), and next-month failure (reference OCT
2026; candidate SEP 2026). Candidate logs contain the corresponding key/click
targets. Calendar helpers derive their month from `new Date()` rather than
displayed-month state; previous/next transitions are absent from `handleClick`.

An initial keyboard probe timed out on the reference because it sent keys during
the calendar's focus-managing opening animation. Waiting for the reference
animation to finish corrected the diagnostic, without changing either fixture.
The final input-tree run completed all six cases with no page or collection
errors and six retained behavior mismatches. The report builder now includes
these supplemental cases and their trees, requires their presence for a complete
audit, and recomputes value/month equivalence instead of trusting a stored
`matches:true`. Configured-matrix coverage is reported separately.

Tooltip structure is another input substitution: `.tooltip-anchor` authors a
138x72px flex column containing a normal-flow popup, whereas Material's tooltip
is a connected CDK overlay. Its absence of a transform offset does not establish
equivalent anchoring. The existing component test checks the candidate's flex
declarations, not equivalence to the reference containing block. This must be
addressed with the shared CSS-space overlay work, not another local offset.

## Overlay constraint substitution and an omitted breakpoint

The settled bottom-sheet diagnostic now preserves a concrete failure outside
the maintained viewport matrix. Run:
`node scripts/audit-material-overlay-breakpoints.mjs --base-url=http://127.0.0.1:4431`
against the already-built audit showcase server. On Chrome 152.0.7977.76,
light theme, DPR1, height900, the unmodified fixtures produce:

| Viewport width | Reference left / width | Astylar left / width | Result |
| ---: | --- | --- | --- |
| 900 | 0 / 900 | 0 / 900 | geometry matches |
| 1024 | 320 / 384 | 256 / 512 | width differs by128px |
| 1440 | 464 / 512 | 464 / 512 | geometry matches |

All three have top772 and height128 (candidate floating-point noise below
0.000001px). All six input trees captured without collection/page errors.
The command exits1 deliberately because the medium case fails unchanged
geometry expectations; it is not a passing parity test. The script waits for
finite reference animations to finish before measuring. Earlier exploratory
measurements taken during entry animation are not used as settled evidence.
Artifacts and SHA-256 tree references are under
`artifacts/material-parity/overlay-breakpoint-audit`; the audit loader includes
all three supplemental cases and recomputes geometry errors rather than trusting
their claimed `matches` fields. These cases do not inflate configured-matrix
coverage. Missing cases, invalid geometry, duplicate keys, wrong environments,
and missing tree evidence cannot establish complete audit coverage.

The immediate owner is fixture authoring, not a demonstrated core layout bug:
`.bottom-sheet-panel` fixes width512/height128 with one max960 full-width rule.
Installed Material `fesm2022/bottom-sheet.mjs` instead uses content flow,
max-height80vh, and full-viewport/medium384/large512 minimum widths. Its outer
padding8px16px plus the list's vertical8px padding is flattened into candidate
padding16px; current two-row geometry alone does not prove equivalent layout.
The fixed height was introduced in `8505c3b`.

Two related source findings are classified separately:

- Dialog (`bc0e449`): fixed panel/title/content/actions heights161/67/20/73
  reproduce current used heights. Reference
  `fesm2022/module-Ce6F7TNm.mjs` derives them from flow, a title `::before`
  inline40px spacer, title padding6px24px13px, and wrapping actions with
  min-height52px, padding16px24px, and a transparent1px top border. Candidate
  uses flex-end title alignment, padding7px24px12px, and action padding
  16px24px17px instead. These are unequal rules even when the box sizes match.
- Snackbar (`899c741`): candidate fixed width344px and space-between replace
  the reference surface's min-width344/max-width672 and flexing label with
  separate action padding (`fesm2022/snack-bar.mjs`). This is an intrinsic-size
  input mismatch, not evidence that another fixed width would fix the renderer.

Verification for this increment: audit unit tests16/16 and
`npm run parity:harness:check`54/54 pass. No fixture, production renderer,
reference styling, or visual threshold was changed.

## Minimal browser evidence

`input-equivalence-proof.spec.ts` supplies the same style objects to browser CSS
and public Astylar `SiteData`. All five Chrome/WebGL tests passed on 2026-09-11:
intrinsic toolbar content sizing with a flex spacer, a stepper-like flex connector
with negative margins, content-derived padded flex height, a full-span grid marker
with a cell-centered ring, and a fixed bottom-aligned overlay. Every measured edge
is within 0.5 CSS px. The toolbar reduction uses shared Arial declarations rather
than the full Material/Roboto typography; the connector reduction uses fixed-size
header boxes to isolate flex allocation. Neither proves full component parity.

Command: `npm --prefix examples/material-showcase test -- --watch=false --browsers=ChromeHeadless --include=src/app/input-equivalence-proof.spec.ts`.
Runtime: Chrome Headless 152, Babylon 8.56.2, WebGL2. The existing NG0914
Zone.js/zoneless configuration warning was emitted. These are geometry proofs,
not typography, paint, or full Material-composition proofs. They do not justify
either a broad core rewrite or retention of fixture compensation.

## Outstanding acceptance work

Resolved-style completeness review (2026-09-11): the fresh run has written all
436 static Astylar trees, containing4,384 nodes. Of these,436 are empty SiteData
root envelopes, not authored elements. A further42 authored nodes lack resolved
styles: form-field-label6, input-label6, select-label6, expansion-content12, and
expansion-content-label12. The field labels have the `compact-filled-label`
display:none rule in contrast/custom themes; expansion content is collapsed.
`collectAuthoredInputTree` retains these nodes, but the input map comes only from
scene meshes. The inventory now reports per-element resolved-style gaps and
rejects complete audit validation when they remain. It must not claim these
snapshots are fully resolved merely because node enumeration succeeded.

Source tracing also confirms a pseudo-state evidence mismatch: core
`src/lib/astylar.ts` writes the merged normal/hover/focus/active style into
`astylarResolvedInteractionStyle`, while showcase `measure` reads
`astylarResolvedStyle` and only exposes a separate `interactionBackground`.
The harness `compareStyleInputs` consumes the normal `resolvedStyle` only.
This does not show that the renderer paints state incorrectly; it shows that
the audit can compare current browser computed styles with candidate normal
styles. Before final attribution, capture both base and effective state style
with provenance. For non-rendered nodes, collect at authoritative style resolution
before the display:none mesh skip; do not reconstruct CSS values in the report.
These changes must not feed diagnostic output back into fixture inputs.

Matching mapped text/order is also no longer sufficient to accept differing
framework host types. Such pairs remain structural-review gaps until wrapper
styles, generated content, defaults and layout ownership are justified. Equal
mapped tags/text/order are accepted only for those fields, not for the entire
anonymous subtree. Focused audit tests22/22 pass. The collector itself and running
full-matrix bundle have not changed for this reporting increment; completing the
capture and resolving these gaps remains required.

Context-sensitive normalization correction (2026-09-11): the audit previously
accepted browser `cursor:auto` as candidate `cursor:default` without examining
the hit target. The maintained `effectiveBrowserCursor` helper already shows why
that is unsafe: auto can resolve to a text cursor over selectable text. These
pairs now remain harness evidence gaps until the same-point/state cursor probe
is linked. Alignment normal/stretch/start equivalence is restricted to paired
flex containers; other contexts remain explicit gaps rather than silent waivers.
Scanning the preserved full baseline finds4,693 auto/default pairs across all36
families and16,359 normal-alignment pairs without paired flex context. These are
potential evidence gaps, not confirmed interaction/layout defects. Fresh complete
tree evidence still requires review.

The canonicalizer also no longer overwrites a complex background shorthand with
its color longhand or lowercases case-sensitive URL/custom-property/string
tokens. The preserved baseline has no complex gradient/image background entries
in its mapped styles; this is preventive harness coverage, not a newly confirmed
showcase paint defect. Regression tests retain image-layer differences alongside
equal background colors, differently cased asset/variable names, and quoted
whitespace. Single recognized color backgrounds remain comparable to color
longhands. Audit unit tests19/19 and `npm run parity:harness:check`57/57 pass.
Only audit normalization changed; the running full collector and rendered
fixtures remain unchanged.

Audit normalization correction (2026-09-11): the old canonicalizer unconditionally
deleted shorthands, including `flex` without expanding it. It could therefore
hide unequal declarations. Supported box/gap/overflow shorthands now expand on
both sides; unexpanded flex and elliptical radius declarations remain explicit
harness-normalization gaps. Zero percentages are no longer collapsed to absolute
zero, preserving potentially different flex-basis semantics. Regression tests
cover differing flex/radius declarations, symmetric shorthand expansion, and
zero-percentage retention. `node --test tests/material-parity/input-equivalence-audit.spec.mjs`
passed 14/14; `npm run parity:harness:check` passed 52/52. This changes report
interpretation only, not captured inputs or fixture output.

The superseded collector run was explicitly stopped after confirming its live
process. A fresh unfiltered `--enforce --skip-build` run using the separate audit
build is now collecting complete trees; the previously completed baseline remains
in `artifacts/material-parity/full-audit-base.json`. Completion of the fresh run
and final report review are still required.

Collector end-to-end smoke (2026-09-11): a separate production build at
`examples/material-showcase/dist/material-showcase-audit` succeeded. Using
`ASTYLAR_MATERIAL_BROWSER_ROOT=examples/material-showcase/dist/material-showcase-audit/browser`,
`ASTYLAR_MATERIAL_ARTIFACTS=artifacts/material-parity/collector-smoke`, port 4432,
families `core,datepicker`, profile `light`, and viewport `desktop`, the command
`node tests/material-parity/run-material-parity.mjs --enforce --skip-build --static-only`
captured two passing cases (minimum SSIM 0.998795, maximum edge error 0.002px).
It correctly exited 1 because enforced acceptance requires all 436 static and
1,875 interaction cases. This is focused diagnostic evidence, not a green full
gate. Loading the resulting tree artifacts through `buildMaterialInputAudit`
verified all four case sides, valid digests, no collection gaps/errors, and
structural schema 2 throughout. Partial audit validation returned no errors.
The existing unfiltered run's bundle and artifacts were not replaced.

The initial structural collectors were not comparable: reference text included
the subtree, candidate text included only the node's own value; reference
descendant order followed requested IDs, while candidate IDs included unmapped
descendants. Structural schema 2 aligns subtree text and mapped document order.
The candidate style collector now retains all scalar resolved properties instead
of dropping longhands through an allowlist. Legacy evidence must be recaptured;
it must not be reported as a confirmed fixture discrepancy. These changes affect
audit collection only, not the rendered fixture. The matrix already in flight
uses its original bundle and cannot verify these later collector changes.

- Finish the unfiltered enforced matrix and regenerate both audit reports.
- Reconcile every one-sided mapping and preserve genuine state divergence.
- Capture and review the new full-tree inventory for every case, including
  anonymous wrappers, generated icons, and pseudo-elements. The browser collector
  has a real-Chrome regression test covering these plus inactive media rules and
  CSS layers (`node --test tests/material-parity/input-tree-evidence.spec.mjs`).
  Reference captures are stored with SHA-256 digests so a later focused run
  cannot silently replace evidence referenced by the full report. The generated
  audit pools identical styles/rules/trees while retaining every case association.
- Resolve used-value versus authored-expression normalization gaps before
  treating automatic difference counts as confirmed authoring defects.
- Complete minimal equivalent-input investigations for remaining suspicious
  compensation and connect the durable audit check to the release gate.

No fixture behavior, reference truth, or visual threshold was changed for these
findings. The investigation remains open until the full objective is verified.
