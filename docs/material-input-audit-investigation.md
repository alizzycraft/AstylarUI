# Material input audit: root-cause evidence

This is an investigation record, not a declaration of completed parity or a renderer fix.
The machine report is generated separately from the full benchmark output.

## Hidden-node inspection boundary (2026-09-11)

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
