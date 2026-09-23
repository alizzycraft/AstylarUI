# Modal generated-owner position inspection

## Retained output applicability, September 24

Question: do the retained open states support the hypothesis that the snackbar
is below the viewport, possibly sharing the tooltip's displacement? Competing
explanations include off-screen geometry, clipping/paint loss, or a symptom no
longer reproduced in this capture. The smallest check was the original recorded
rectangles, not another render or reconstruction of the historical application.

The existing inspection suite now authenticates the complete capture SHA-256
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`
and checks all four rectangle coordinates directly, rather than relying on the
historical placement `matches` flag:

| Family | Retained open states | Maximum reference/projected candidate delta |
| --- | ---: | ---: |
| Snackbar | 34 | 3.64e-12 px |
| Tooltip | 18 | 0.038330078125 px |
| Bottom sheet | 25 | 2.67e-11 px |

All 77 observations report canvas containment. This rules out reported projected
off-screen placement **in these retained observations only**. It does not explain
the earlier manual failures or establish a shared cause, equal inputs, visible
paint, unclipped text, hit testing, or current-runtime acceptance.

Measurement-stage evidence: `measure()` in
`examples/material-showcase/src/app/astylar.component.ts` computes `borderBox`
from `boundingBox.vectorsWorld`, `Vector3.Project`, and canvas/render scaling.
It does not capture the core's retained CSS layout boxes. The existing public
identity-transform reduction likewise measures projected geometry; the focused
element-dimension test covers fixed viewport sizing but not the complete live
overlay path. Neither fills that stage gap.

Next decisive check: observe retained CSS layout boxes and projection together
through the existing repository-only inspection boundary, in an equal-input
overlay reduction. Keep diagnostic observation separate from authored input;
do not introduce projection-derived positioning or a new public layout API.
The previously documented placement-check sensitivity remains relevant; this
direct coordinate comparison is not a correction to that harness.

Verification: `node --test tests/material-parity/modal-position-inspection.spec.mjs`
passes **4/4**, no skips, in 6.59 seconds. No recapture, renderer change,
fixture change, canonical reclassification, or new evidence package was needed.

## Overlay-wrapper follow-up, September 24

The existing inspection suite now reopens and hash-checks all **59** original
bottom-sheet/snackbar position observations (25/34 respectively), using the
existing generated-owner resolver. No new capture or duplicate evidence package
was created. The new test takes about 0.24 seconds; the full three-test modal
inspection suite passes in 5.66 seconds.

All reference wrappers are absolute flex rows inside a **fixed**
`.cdk-overlay-container`; their measured width and height equal that parent's.
All candidate wrappers are fixed flex columns directly below their relative
demo section. Both use bottom/center alignment, expressed on opposite flex axes.
Reference wrapper padding is zero. Candidate bottom-sheet wrapper padding is
zero; candidate snackbar wrapper padding is `0 0 8px` in all 34 states and all
three captured style stages.

This answers the narrow ownership question: `absolute` versus `fixed` here is
also a two-wrapper versus one-wrapper comparison. **Those position tokens alone
do not prove a placement defect.** Flattening the fixed parent and transposing
the flex axes might preserve some alignment outcomes; it does not establish
equivalent containing blocks, child sizing, inheritance, clipping or events.
The added snackbar wrapper padding is a separate authored request, not a
demonstrated explanation of the missing snackbar.

The recorded scalar inputs and classifications remain unchanged. The next
decisive evidence is the candidate used CSS box and its containing block, paired
with the reference wrapper/pane geometry in the same state, followed by paint
and viewport reachability. Preserve absent candidate used values as unknown;
do not substitute percentages, projected mesh bounds, or equal screenshots.
The earlier external-ancestor replay found no reference transform/zoom in these
states; do not repeat that capture or infer equivalent candidate ancestry.

Verification: `node --test tests/material-parity/modal-position-inspection.spec.mjs`
passes **3/3**, no skips or failures. The new test preserves all 59 original
memberships and tree hashes; the two existing owner/negative-control tests
also pass. This is source inspection, not a fresh rendered-state test.

## Original generated-owner inspection

Nine complete position groups cover 267 observations: three bottom-sheet owners
in 25 states and six dialog owners in 32 states. Classification remains pending;
this inspection does not change canonical attribution.

The collector authenticates the original full capture and every paired tree.
It reuses the established generated-owner mapping rather than selecting a node
by visual proximity. That mapping checks all 89 captured reference properties,
candidate normal/effective/interaction stages, source rule gaps and full owner
ancestry. Any scalar-rule gaps remain explicit in the serialized mapping.

Reference dialog-copy position is static; the other eight mapped reference
owners are relative. All nine candidate owners omit position in all three
captured stages. This omission is not classified as computed static, equivalent
containing-block behavior, or a diagnosed renderer bug.

## Why dimensions alone are insufficient

The mapped dialog surface reports 280px by 161px in the reference; the candidate
section authors those same width/height strings. The reference is border-box
with min/max constraints and auto overflow; those candidate declarations are
absent. The matching size strings therefore cannot establish equal input or
actual rendered size, particularly with different title/action composition.

The reference sheet container is border-box, 128px high, padded 8px vertically
and 16px horizontally, with auto overflow. The candidate section authors 128px
height and 16px padding on all sides, with boxSizing/overflow absent. Captured
wide reference/candidate widths are both 512px strings; the compact reference
uses a measured 900px width while the candidate authors 100%. Neither comparison
proves a common used-size contract. The candidate's wide corner radii vary with
theme (21/28/42px), while the mapped reference top corner remains 28px. Compact
captures have zero corners on both sides.

## History and next proof

`bc0e449` changed the dialog from 224x124 with 24px padding to 280x161 with zero
panel padding, adding fixed title/copy/action sizing and padding. `8505c3b`
changed the sheet from 438x110 to 512x128, added a <=960px width override and
changed option sizing. `03079c3` added zero radius to that compact override.
These are demonstrated authoring changes; their necessity as a response to a
core defect is not proved by commit titles or output similarity.

Current rules: `examples/material-showcase/src/app/astylar.component.ts`
789–801; modal structure begins at 1005. Restore the original box-sizing,
intrinsic/constraint sizing, list/button ownership and overflow requests in a
separate public reduction. Trace used size before projection and then clipping,
surface boundaries and input ownership. Do not compensate by changing panel
height or padding again. The outer overlay absolute/fixed wrapper question is
separate and remains unresolved.

## Verification

`node --max-old-space-size=1536 tests/material-parity/modal-position-inspection.mjs`
generated all nine complete groups.
`node --max-old-space-size=1536 --test tests/material-parity/modal-position-inspection.spec.mjs`
passed 2/2, exit 0, 7228.085 ms. Four negative controls reject mismatched scalar
position, direct-ID alias shadowing, candidate style-stage changes and broken
parent ancestry. No renderer, fixture or plugin implementation changed.
