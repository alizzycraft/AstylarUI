# Material input audit: root-cause evidence

This is an investigation record, not a declaration of completed parity or a renderer fix.
The machine report is generated separately from the full benchmark output.

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
