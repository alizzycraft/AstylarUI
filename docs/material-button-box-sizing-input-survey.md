# Original shared-button box-sizing evidence

All **600 shared-button observations** retain an explicit reference
`box-sizing: border-box` rule and no candidate authored/own-stage `boxSizing`.
The omission alone is not a content-box sizing diagnosis. The original static
geometry supplies an additional check: **108** captured candidate border boxes
match their declared widths and heights to less than 0.01 CSS px. The other
**492 interaction observations** have no retained `geometry` field and remain
explicit measurement gaps, not inferred successes.

The survey covers all 2,311 original cases, including 480 cases with selected
shared buttons and 1,831 negative cases. It checks the source-tree
`.material-button` inventory against scalar selection before examining values.
This scope is the nine shared-button owners, not every plugin button or control.

| Shared owner | Observations | Static measured | Interaction gaps |
| --- | ---: | ---: | ---: |
| core-primary | 52 | 12 | 40 |
| button-primary | 60 | 12 | 48 |
| button-secondary | 60 | 12 | 48 |
| button-disabled | 60 | 12 | 48 |
| menu-primary | 94 | 12 | 82 |
| bottom-sheet-primary | 63 | 12 | 51 |
| dialog-primary | 78 | 12 | 66 |
| snack-bar-primary | 71 | 12 | 59 |
| tooltip-primary | 62 | 12 | 50 |

## Source and stage trace

The proof reuses exact full-tree/scalar/three-candidate-stage joins from the
existing width evidence. It checks native button ownership, the active
`.mdc-button` declaration, no competing inline/candidate box-sizing/reset rule,
and no hidden own-stage min/max constraint. All candidate widths are declared
pixel values, heights are 24/28/40px, padding is `0 24px`, and borders are zero
except the secondary button's 1px border. It retains the reference's omitted
width request and the candidate's fixed request as unequal authoring.

The relevant consumption branch is
`src/app/services/dom/elements/element-dimension.service.ts:312`: declared sizes
remain border-box by default, while explicit content-box adds padding/border.
The independently executed [public native-button proof](material-button-box-sizing-public-proof.md)
tests this behavior through the installed package, with nonzero borders and
padding. The original Material geometry is additional evidence, not a substitute
for that equal-input reduction.

The measurement source in
`examples/material-showcase/src/app/astylar.component.ts:1144` projects the
actual mesh bounding vectors into CSS pixels, and `compareGeometry` in
`tests/material-parity/run-material-parity.mjs:1608` retains those border boxes
without substituting authored sizes. Static records are checked for finite,
internally consistent edges/dimensions, reference computed/measured agreement,
and candidate declared/measured width/height agreement. Positions and text
rasters are not declared equivalent by these checks. The interaction report
construction at line 424 does not retain this static geometry field; aggregate
text-alignment results do not replace the missing boxes.

## Verification

```powershell
node scripts/audit-material-button-box-sizing-inputs.mjs
node --test tests/material-parity/button-box-sizing-input-evidence.spec.mjs
node scripts/audit-material-button-box-sizing-inputs.mjs --check
```

Generation and no-write replay exit **0**. The two focused tests pass **2/2**,
zero failures/skips/cancellations, **6,164.3808ms**. They independently replay
all captures/owners and grouped geometry/gap coverage. Eleven mutated-source/
geometry controls reject competing rules, local-stage substitution, automatic
widths, added padding-sized geometry, missing boxes, forged reference dimensions
and detached records. A separate interaction control rejects invented static
geometry rather than silently upgrading a gap to a success.

`material-button-box-sizing-input-survey.json` retains exact case/state/viewport
associations, input and tree hashes, source fingerprints, original measured
boxes and gap reasons. It binds the original report SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.

## Disposition

Classification: **observation-stage difference with bounded native-button
sizing evidence**. The relevant owner is core declared-size consumption plus
the audit's interpretation of observation stages. There is no demonstrated
content-box bug for these 108 static shared-button captures. This does not clear
the nine independent intrinsic-reference/fixed-candidate width findings or prove
whole-control input/rendering equivalence. Original interaction geometry,
intrinsic sizing, label composition, clipping, hit testing and text paint remain
separate obligations. No canonical attribution or renderer behavior changed.

The ongoing full harness started from its pinned 73-file inventory before this
new test was added. This two-test focused result is separate, not silently
included in that run. Fresh discovery now includes **74 files** (66 Material);
final complete-suite verification must use that current inventory. The 187
canonical dependencies and all files selected by the running harness remain
unchanged.
