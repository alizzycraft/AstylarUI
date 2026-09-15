# Remaining overlay ancestry groups: dialog and tooltip

This audit-only continuation reviews the **48 groups / 1,424 observations**
previously stopped by `incomplete-surface-ancestry`. It preserves the original
group membership and scalar values, including explicit candidate declarations.
No canonical classification, fixture or renderer code is changed.

## Coverage and evidence reuse

The population has 50 original interaction cases and 178 case/owner pairs:

- 32 dialog cases, with five owners each: actions, cancel, copy, save and title.
  All **160 additional owners** independently reproduce their original alias
  proof from the fresh reference trees already captured by the verified
  91-state replay. No new browser run or synthetic identity is substituted.
- 18 tooltip cases: hover and held states across the original four profiles,
  desktop DPR 1/2, plus light comparison-pane cases. Original trees establish
  ownership and declaration paths, but these exact states do **not** have the
  new external-ancestor replay. The gap remains explicit for all 18 owners.

The generator reopens the original capture and its hash-bound paired trees,
validates the prior survey's source fingerprints, independently replays the
91-state context verification and tests two identity mutations for every owner
(**356 rejections**). It preserves 263 declaration-trace patterns with exact
case membership. Thirty-five groups / 1,064 observations contain motion requests;
the other 13 groups / 360 observations contain both relevant and motion requests.
Motion declarations are not equated with active animation or waived by a
`noopable` class name.

## Confirmed unequal tooltip wrapping inputs

Two groups, each covering 18 observations, now have standalone findings classified
as **application/plugin authoring defects**, scoped to wrapping requests:

| Property | Original reference evidence | Candidate evidence |
| --- | --- | --- |
| white-space | `normal` on the measured surface and captured ancestor path | Explicit `nowrap` in `#tooltip-popup`, retained in all three local stages |
| overflow-wrap | Active `.mat-mdc-tooltip-surface { overflow-wrap: anywhere }` and computed `anywhere` | Neither `overflowWrap` nor the public `wordWrap` alias is requested on the owner or captured ancestor paths |

These are not harmless shorthand differences or evidence of missing default
serialization. In particular, `anywhere` is not the initial `normal` behavior.
The earliest demonstrated divergence is in fixture authoring, before layout or
Babylon projection. The report does not assign the user's original blur,
misalignment, positioning or clipping symptoms to these requests.

The first diagnostic run incorrectly assumed every candidate property in this
population was omitted; it stopped when the original tree supplied `nowrap`.
The diagnostic was corrected to compare the actual recorded group value against
all three original candidate stages. No evidence was normalized away and no
original survey data was rewritten. The focused tests now specifically guard
this explicit declaration and the public `wordWrap` alias.

## Source/history and owning correction

`examples/material-showcase/src/app/astylar.component.ts:811` supplies the
candidate `whiteSpace: 'nowrap'` request. Commit `f324bd18` ("fix(text): position
glyphs from their line boxes") changes popup dimensions, font metrics, padding
and colors while preserving the already-existing `nowrap`. It also changes the
anchor's fixed width from 141 to 138 pixels. That commit is evidence of retained
unequal input, not proof it originally introduced `nowrap` or that every change
in the commit was a workaround.

The installed reference rule is in
`examples/material-showcase/node_modules/@angular/material/fesm2022/module-CWxMD37a.mjs`;
the captured rule index/selector/conditions provide the exact per-case witness.
The public loaded-CSS bridge maps `overflow-wrap` to `wordWrap` in
`src/lib/astylar-document-style-resolver.ts:440`.
`src/app/services/text/text-style-parser.service.ts:115` consumes `wordWrap`,
and `src/app/services/text/multi-line-text-renderer.service.ts:53` dispatches
`nowrap` separately from normal wrapping. These identify the corresponding
authoring and core text boundaries; they do not prove full renderer wrapping
support or original popup raster equivalence.

The implementation plan should restore equivalent normal/anywhere wrapping in
an isolated public-API reproduction, with identical content, fonts and width
constraints. Include constrained widths and long/unbroken text so different
wrapping requests cannot hide behind a short one-line label. Trace any remaining
equal-input discrepancy through style translation, text measurement/wrapping,
intrinsic layout and final projection. Do not preserve a candidate-only nowrap
request merely because it improves the current screenshot. Keep original-state
tooltip ancestry, anchoring, clipping and sharpness as separate obligations.

## Verification

```powershell
node scripts/audit-material-remaining-overlay-ancestry.mjs
node scripts/audit-material-remaining-overlay-ancestry.mjs --check
node --test tests/material-parity/remaining-overlay-ancestry-review.spec.mjs
```

Generation and no-write replay pass with 48 groups, 1,424 observations, 178
owners, 160 fresh owner matches and 356 negative controls. The first full focused
run passed **5/5**, no failures/skips/cancellations, in **5,789.3857 ms**.
It replays every declaration trace from the original trees and guards exact
membership, source fingerprints, explicit wrapping requests, pending tooltip
context and non-equivalence flags. These tests are standalone and are not part
of the earlier 710-test harness run.

The two standalone authoring findings still require source-bound canonical
integration. The canonical count therefore remains **2,812 unattributed groups**;
neither the new findings nor the reused dialog context are presented as completed
input equivalence or resolved rendering symptoms.
