# Modal generated-owner position inspection

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
