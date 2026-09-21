# Choice-label stacking substitutions

All 204 position observations (68 each for checkbox, Solo radio and Team radio
labels) demonstrate a divergence in the authored composition before renderer
layout. They are classified as application/plugin authoring defects **in the
input-equivalence fixture contract**, not as confirmed runtime stacking defects.
The standalone classification has not yet changed canonical attribution.

Each reference span is static with auto z-index under a native label associated
with an input. Each candidate span is relative with z-index 2 directly under a
div-based checkbox/radio control, beside an absolute custom state layer. The
checkbox layer has z-index 3; the radio layers have z-index 1. These are different
stacking requests, not just different serializations of the same declared rule.
All three candidate style stages preserve these values and omit label insets.
Thus this evidence does not describe a direct top/left label-offset correction.

The machine proof authenticates every paired input tree, control association,
parent linkage, text content and state-layer ownership. It does not infer
equivalent event behavior from matching text or roles.

## Actual historical changes

- `f566f80` added relative/z-index 2 to the checkbox label together with the
  absolute z-index 3 checkbox state layer. Before that diff the label did not
  declare position or z-index. The later `88d1090` blame location reflects a
  font-size edit, not the original positioning introduction.
- `f3c8254` added relative/z-index 2 to both radio labels together with their
  state-layer nodes. Before that diff the labels had margin, font size and
  vertical alignment, but no position or z-index declaration.

Current source: `examples/material-showcase/src/app/astylar.component.ts`,
radio rule line 503 and structure 935–937; checkbox rule 777 and structure 932.
These changes demonstrate application-authored layering. Their necessity or
the author's intention to conceal a core bug is not established by the diff.

## Owning follow-up and removal condition

Reproduce the reference associated-label/control/interaction-layer composition
with equivalent public inputs. Trace style resolution, stacking order, paint
and pointer targeting independently. If that exposes incorrect core order or
hit ownership, fix the shared subsystem before removing compensation. If no
core failure exists, correct the fixture authoring rather than preserving an
unexplained layer change as a parity result. Do not remove only the label's
position while retaining an unexamined replacement interaction structure.

No CSS/Babylon coordinate cause, visual equivalence, global input equivalence
or working-control claim is made by this source proof.

## Verification

`node tests/material-parity/choice-label-stacking-substitution.mjs`
generated the three complete groups and their paired receipts.
`node --test tests/material-parity/choice-label-stacking-substitution.spec.mjs`
passed 2/2, exit 0, 2397.9519 ms. Five negative controls reject altered label
association, reference z-order, candidate insets, layer parent and layer order.
No renderer, fixture, plugin or running producer dependency was edited.
