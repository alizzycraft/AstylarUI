# Shared Material button width authoring

[Machine evidence](material-button-fixed-width-audit.json) retains all **600**
original shared-button owners in **480** cases, seven families and nine owner
groups. Complete candidate class selection is checked against all **2,311**
original cases. This is an authoring audit, not a candidate used-width or
intrinsic-layout diagnosis.

## First divergence

Every reviewed reference button has **no authored width request** in its active
matched rules or inline style. Each candidate has an explicit pixel width from
the shared rule and, for eight owners, an ID-specific override. The browser's
computed width is an observed result, not the reference's authored input.

| Owner | Browser computed width | Candidate authored width | Observations |
| --- | ---: | ---: | ---: |
| core-primary | 212.234px | 212.234375px | 52 |
| button-primary | 140.781px | 141px | 60 |
| button-secondary | 117.25px | 117px | 60 |
| button-disabled | 103.062px | 103px | 60 |
| menu-primary | 120.438px | 120px | 94 |
| bottom-sheet-primary | 169.156px | 169px | 63 |
| dialog-primary | 123.797px | 124px | 78 |
| snack-bar-primary | 144.844px | 145px | 71 |
| tooltip-primary | 137.938px | 138px | 62 |

The core value normalizes to the same three-decimal scalar as the browser
measurement in the current audit, so it does not produce a scalar discrepancy
row. Its **52 authoring differences are still retained here**. This is why the
input audit cannot be limited to nonmatching computed-value rows. Close or
matching dimensions do not turn an omitted width request into a fixed width.

Classification: **application/plugin authoring defect**, owned by shared and
ID-specific showcase button width authoring. Exact tree identity, all 89
reference scalar values, matching label/value text and all three candidate
local style stages are joined before checking width declarations. The proof
rejects competing width/inline-size/all requests, including state and unknown
selectors, and preserves the complete applicable candidate rule declarations.
Native-value versus label-span composition remains unproven, not equivalent.

## History

Current width expressions are at
`examples/material-showcase/src/app/astylar.component.ts:487–490` and
`:522,529–532`. AST inspection proves the nine selector/width expressions match
the initial showcase at `2f440115740ff76fa9e55b3f4a11568207b2af5a` exactly,
including the conditional secondary/disabled expressions. It does not claim
that every other property in those rules is unchanged, that no intermediate
edit occurred, or that the original constants were obtained by measurement.
These fixed requests already existed at the initial endpoint; they cannot be
attributed solely to a subsequent parity fix.

### Followed source history, not just endpoint comparison

The separate [historical ledger](material-button-width-history.json) extends
that endpoint proof to **102 revisions** returned by
`git log --follow --format=%H 9f713c0930ea5c3692e96f5f62a05d38863abcb8 -- examples/material-showcase/src/app/astylar.component.ts`.
Each revision's source blob is reopened and parsed as TypeScript. All nine
selected selector/width expressions, including conditional branches, are
identical in every returned revision. The ledger records each commit, its source
SHA-256 and its extracted-expression SHA-256. This closes the intermediate-edit
uncertainty for these expressions in that followed history, not other branches,
uncommitted edits, other style properties, or their runtime effects. The initial
constants' derivation remains unproven.

```powershell
node scripts/audit-material-button-width-history.mjs
node scripts/audit-material-button-width-history.mjs --check
node --test tests/material-parity/button-width-history.spec.mjs
```

The generator completed with exit 0. The focused tests passed **2/2** with no
skips or cancellations in **7,477.3528ms**: complete historical replay, changed
and removed request controls, unrelated-object conservation and parse-error
rejection. This adds history evidence without modifying the original authoring
ledger, classifications, renderer or fixtures.

## Implementation boundary and remaining uncertainty

When fixes are authorized, restore content-dependent width authoring together
with the original flex/label composition, minimum-width and padding constraints
in a separate paired public-API reproduction. Exercise short and long text,
narrow containers, font changes, density and inline siblings before editing
canonical comparisons. Trace any remaining divergence through core intrinsic
measurement, flex sizing, minimum-size clamping and control text ownership.
Do not replace these constants with more accurate measured widths or offsets.

The scalar differences above are not proof of the candidate's used-width error,
nor proof that a specific core subsystem caused the original screenshots.
The separately observed missing boxSizing values also need their own analysis:
the current dimension service treats omitted boxSizing as border-box on its
declared-dimension path
(`src/app/services/dom/elements/element-dimension.service.ts:312–323`). That source
fallback alone does not prove the complete native-button path or justify
inventing a captured computed value. This survey does not classify box sizing.

## Verification

```powershell
node scripts/audit-material-button-fixed-widths.mjs
node --test tests/material-parity/button-fixed-width-evidence.spec.mjs
node scripts/audit-material-button-fixed-widths.mjs --check
```

Generation and no-write replay exit **0**. Tests: **2/2 pass**, zero failures,
skips or cancellations, **4,885.7267 ms**. Thirteen negative controls reject
changed identity, fabricated reference authoring, altered computed/stage values,
source loss, competing candidate requests, inline substitutions, changed text
and modified core width. An unrelated selector remains a positive control.
All original tree digests, owner/case coverage, grouped observations and source
fingerprints are independently replayed. No renderer, canonical comparison,
canonical classifier or frozen regeneration dependency changed.

Main-report integration is pending. It must retain all nine authored-input
groups, including the core group absent from the scalar-difference list, rather
than changing normalization or manufacturing a numerical discrepancy.

## Compact original-source binding

`tests/material-parity/button-fixed-width-source-binding.mjs` now prepares an
independently replayable binding for later canonical integration. It compares
the caller's complete selected inputs to the reopened original report before
retaining compact input hashes, verifies both tree digests in all **2,311**
cases, and requires exact class-based owner inventory. It retains **1,831**
negative-selection cases and all **600** owners / **nine** authoring groups.
The full proof matches the existing durable survey without duplicating complete
scalar captures in each observation.

The authoring ledger is constructed before scalar filtering. All **52** core
owners remain unequal-authoring findings. A separate three-decimal arithmetic
control produces only **eight** scalar groups / **548** observations, explicitly
not a production-normalizer or classification-precedence test. Integration must
retain both populations without manufacturing a core scalar discrepancy.

```powershell
node --test tests/material-parity/button-fixed-width-source-binding.spec.mjs
```

Result: **3/3 pass**, zero failures/skips/cancellations, **200,300.9284 ms**.
Four caller-population mutations are rejected before deriving accepted proof;
unbound and out-of-boundary sources are also rejected. Fourteen independent
source-replay mutations reject dropped matching groups, lost negative cases,
missing owners, changed hashes/rules, duplicated cases, missing states and all
five inflated equivalence/layout/raster claims. JSON round-trip replay passes.
No canonical classifier, renderer, fixture or frozen audit dependency changed.
Canonical integration and production-normalizer verification remain pending.

## Width classification and independent scalar replay

The separate `button-fixed-width-classification.mjs` module prepares width-only
attribution without changing the canonical audit yet. The classifier requires
the complete original input hash, exact width requests, local values, source
revision, label/value correspondence and five explicitly false layout/raster/
equivalence flags. The classification validator independently reopens the bound
original scalar report and applies its supplied callbacks to actual full style
objects, not manufactured width-only styles. It is used together with the tree
and rule replay in `validateButtonFixedWidthInputs`.

The validator requires all **600** original owners before filtering numerical
matches, then checks exact grouped values, classification, ownership, evidence,
case lists, states and occurrence counts for the **eight** scalar groups /
**548** observations. Deleting the 52 core owners remains an error even though
it leaves those eight scalar groups unchanged.

```powershell
node --test tests/material-parity/button-fixed-width-classification.spec.mjs
```

Result: **3/3 pass**, zero failures/skips/cancellations, **24,664.2777 ms**.
Thirteen proof mutations plus detached input/property/value controls are
rejected; twelve row mutations, dropped scalar-matching owners and changed
source digest are independently rejected. A production-ordering control first
failed (**1 failed**, **12,251.2177 ms**) because the expected groups still used
capture order. Sorting expected groups by the main report's family/element/
property ordering fixes that audit-validator defect without changing values,
case/state ordering or the main normalizer. The final full focused run is the
three-test result above.

Tests still use an explicit arithmetic diagnostic callback, not the production
pipeline. Actual production normalization, preceding-classification conservation,
main-report integration and complete-report replay are the next gates. No
renderer, comparison inputs or any of the 180 frozen audit sources changed.

## Production integration verification

The main audit now collects the independent width ledger before discrepancy
filtering, retains all nine authoring groups, and consults the width classifier
only for still-unresolved scalar differences. The full ledger also prevents a
false input-equivalence verdict when unequal authored widths happen to match
numerically. The main validator independently replays both source binding and
the original scalar population. The human report exposes both populations.

```powershell
node --test tests/material-parity/button-fixed-width-canonical-integration.spec.mjs
node --test --test-name-pattern="records source fingerprints" tests/material-parity/input-equivalence-audit.spec.mjs
```

The production test executes the actual preceding module from
`30357b9f8c7b95da668914032557c5f7416c81db`, relocating only import URLs. Before
integration it fails at **0 versus 8** expected width groups (**83,873.285 ms**).
After integration it passes **1/1**, zero failures/skips/cancellations,
**321,594.3434 ms**. All **480** original button cases / **600** owners are
included, with **nine** authoring groups and **eight** scalar groups / **548**
observations. All **1,201** scalar rows are unchanged, as are all **1,193**
unrelated complete records (SHA-256
`a3c46f409efe25aeca4bd20b758cd702c1a70546fa91a3ef18e762bc82dfe62c`).
All 52 core owners remain in the ledger, and neither old nor new production
output invents a core width discrepancy. Missing binding and removal of those
scalar-matching owners are rejected by production validation.

The source-inventory test passes **1/1**, **1,365.9775 ms**, with all **187**
unique current dependencies. Independent AST comparison preserves all 171 main
function names and the exact text of the 165 functions outside collection,
build, validation, report rendering and evidence inventory. Normalization and
shared mappings are unchanged.

The full original-report conservation command,
`node scripts/verify-material-button-width-integration.mjs`, correctly fails
against the old canonical report at **0 versus 8** groups. Its forward gate
requires all 8,339 scalar rows and all 8,331 unrelated complete records to stay
unchanged, plus exact original-source replay of the entire nine-group ledger.
The expected remaining count is 2,595, but canonical regeneration/conservation
and no-write replay are not yet completed. No full harness or enforced-matrix
pass is claimed here.

The two targeted earlier-classifier compatibility checks also pass **2/2**,
zero failures/skips/cancellations, **584,532.8766 ms**:

```powershell
node --test --test-concurrency=1 --test-name-pattern="button requests production integration preserves|reviewed authoring production integration preserves" tests/material-parity/button-requests-canonical-integration.spec.mjs tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs
```

The formatting/host test (**453,506.8044 ms**) retains 1,087 diagnostic cases,
283 owners, 54 prior formatting/host groups and eight width groups, including
24 scalar-matching core owners. All 2,938 scalar records and 2,876 unrelated
complete records are unchanged (SHA-256
`7cdadfc4e877b671a2ae5ce7a7fef70101b86bb526acaa4405dfcd78dc341f61`).
The flow/radius test (**126,155.7999 ms**) preserves its exact existing evidence
and explicitly checks the eight later width groups before conserving all
unrelated records. These are the selected integration tests, not reruns of
every test in those files or the full harness.

## Full canonical width conservation

The complete canonical generation now finishes with exit **1**, solely because
**2,595** groups remain unattributed. Coverage stays **436/436 static** and
**1,875/1,875 interaction**, **8,339** groups / **386,891** observations and
**132** source findings. This is not input-equivalence acceptance.

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
node scripts/verify-material-button-width-integration.mjs
```

The full conservation gate exits **0** against the actual saved report from
`30357b9f8c7b95da668914032557c5f7416c81db`. All **8,339** scalar records are
unchanged, as are all **8,331** unrelated complete records (SHA-256
`b89d0e5998ae95f615df1dc53518528119fc567c8810bcf56ec91e412bbbd1ec`).
Only **eight** width groups / **548** observations gain attribution. Original
source replay revalidates all 2,311 captures, all 600 owners, the nine-group
ledger and its 52 scalar-matching core owners. The expected seven sources are
added and only the four intended earlier fingerprints change (187 total).

The ordered human report is independently conserved after accounting for two
new evidence lines, three count changes, and verified source-line movements:
eight references unchanged, two moved by one line and 34 moved by eight lines.
The unchanged normalized ordered text has SHA-256
`c66c1732afcb4475a16c958b670e74b800e907cd556e6df4a6df7870942a9beb`.
The first line-movement check incorrectly assumed every main-test reference
was after the insertion; source-diff inspection confirmed the eight earlier
references must remain stationary. The corrected exact check passes without
changing the generated report.

Saved gzip: **50,401,408 bytes**, SHA-256
`de4473ec4d60f3707a8d71c802efd7e0bf612565f9a73e75acd017944d91b221`.
Decoded payload: **1,890,634,491 bytes**, SHA-256
`aa8d889ab041c9cdfc5dad89377ef2c27a6b3511161a3e0ac4b7f7d7ceb06cf7`.

The full command with `--check` is now running against these saved files with
all 187 dependencies held unchanged. Its completion, the complete harness and
the final enforced matrix are still pending. No renderer or canonical input
was changed, and no used-layout/raster claim is inferred from attribution.

## Complete fixed-width no-write replay

The full no-write command has now completed with exit **1**, solely for the
**2,595** remaining unattributed groups. It reports neither source-fingerprint
drift nor saved-report mismatch. Coverage remains 436/436 static and
1,875/1,875 interaction cases, with 8,339 groups / 386,891 observations and
132 source findings. All 187 fingerprinted dependencies and the canonical
payload stayed unchanged through the run.

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit --check
```

This completes reproducibility verification of the fixed-width attribution
increment, not the full audit. The saved gzip SHA-256 remains
`de4473ec4d60f3707a8d71c802efd7e0bf612565f9a73e75acd017944d91b221`.
The running 73-file harness is separate evidence; the subsequent original
button-box survey has its own focused tests, and current discovery requires
74 files for a future full run. Complete attribution and the final enforced
comparison matrix remain required.

## Later full-harness failure isolated without changing the test

The subsequent unfiltered **110-file** harness reports a failure in
`button-fixed-width-canonical-integration.spec.mjs`: the historical test accounts
for eight width and nine box-sizing classifications, but still expects every
other complete row to equal its pre-width baseline at
`30357b9f8c7b95da668914032557c5f7416c81db`.

An isolated diagnostic replays that **unchanged test** and inserts a bounded
report immediately before its original conservation assertion. The script checks
that the assertion occurs exactly once, that removing only its inserted report
recovers the complete original source, and that import relocation changes no
other statements. It never substitutes a passing assertion or edits the current
harness dependency. Source SHA-256:
`d11e8860fe26054de19607c825838c4d292bedf0f7bdefe5b7dc87c362a2b514`.

```powershell
node scripts/diagnose-material-button-width-conservation.mjs
```

The run retains all **480 original cases**, **600 button owners** and **1,201
ordered scalar rows**. Beyond the 17 already-accounted width/box groups, exactly
**18** complete rows change: `rowGap` and `columnGap` for each of the nine button
owners. All change from unresolved to
`reviewed-motion-gap-observation-stage`; their authored examples remain identical.
The **1,200** affected property observations are the same 600 button observations
for each gap axis, not 1,200 additional owners.

The independent `assertLaterGapClassifications` source/coverage replay validates
exactly those **18** signatures, including original scalar/authoring preservation
and false equivalence/causality flags. **Zero** changed identities remain
unaccounted for. The other **1,166 complete rows** are unchanged; their ordered
row-digest SHA-256 is
`4ff464ad11dddd783c59e07b72661f28b53ff5b7b0100533c41ebc2a2c2dc5fd`.

The command intentionally still exits **1** at the original assertion: **0 pass,
1 fail**, no skips/cancellations/todos, **178,259.8495 ms**. This is a diagnosed
historical-guard mismatch, not a corrected-test pass. Its complete row receipts
and original failure are retained in
`artifacts/material-parity/field-host-flow-input-audit/button-fixed-width-conservation-diagnostic.log`,
SHA-256 `9205503a8ac5a581378986288a8ee85b871afabed9cbe2605dbdf60a286237d7`.

After the running full harness finishes, the bounded correction is to authenticate
these later gap findings through that existing independent guard before comparing
unrelated rows, assert the exact observed population, and retain all existing
width/box/scalar checks. Do not exempt every gap property or attribution name.
Then rerun the corrected focused test and the complete current harness. No
renderer, plugin, canonical comparison input or existing test changed in this
diagnostic increment; full audit acceptance remains incomplete.
