# Tooltip positioning ancestry: inspection checkpoint

This is an input inspection, not a renderer diagnosis or a canonical classification change.

`node scripts/inspect-material-tooltip-position-ancestry.mjs` successfully replays
all 18 tooltip positioning observations in the pinned position population. It
authenticates each full-tree receipt, uses the reviewed generated-node mapping
for the reference popup, requires a unique candidate popup, and traverses every
ancestor to the captured root. Missing properties retain explicit absence;
candidate omission is not normalized to computed `static`.

Across all 18 observations, the reference leaf-to-root position sequence is
`static / relative / static / absolute / absolute / fixed`. The candidate
sequence is `relative / omitted / relative / omitted / omitted`.

The first light desktop DPR1 hover capture illustrates why a leaf-only position
comparison is insufficient. The HTML surface belongs to a tooltip component
inside an absolute CDK pane, whose computed transform translates it 8 CSS pixels
down; the pane is inside an absolute positioning box and fixed overlay container.
The candidate popup is a child of `tooltip-anchor`, a local flex container, inside
the relative `tooltip-root` comparison section. These are different placement
compositions before final rendering, not merely different spellings of a leaf
position value.

This evidence does not establish whether every difference is a necessary public
API representation, which historical change introduced it, or whether the core
would correctly render equivalent overlay inputs. It also does not establish a
shared snackbar cause. Those investigations remain required before classifying
the canonical position row or prescribing a renderer change.

## Verification

- Inspection command: exit 0, 18 unique observations, all tree hashes verified.
- Independent output summary: exactly one ancestry-position sequence per side,
  as listed above.
- An initial one-line summary command had an extra closing parenthesis and
  failed with a JavaScript syntax error; the inspection itself had completed.
  Correcting that summary command produced the counts above.
- No producer dependencies, renderer code, plugins, canonical fixtures, or
  canonical audit classifications changed in this increment.

Next: examine the authored placement rules and their history, reduce the actual
overlay contract through the public API, and separate the structural authoring
difference from any demonstrated layout/projection defect.

## Historical follow-up

The relevant source is `examples/material-showcase/src/app/astylar.component.ts`
(current rules at 809–811 and composition at 1076–1079). Git history establishes:

- `662c179`: the popup became absolute at `top:76px; left:44px`, with different
  translations selected by DPR, density and typography scale. The translations
  include `(47.5,11.5)`, `(50.5,20.5)`, `(92,26)`, `(92,25)` and `(92,39)` CSS
  pixels. This is direct evidence of candidate-side calibration, not a claim
  inferred from the commit title.
- `f3c8254`: replaced that conditional transform with a 141-by-72-pixel local
  flex-column anchor. The relative popup still had a 16-pixel left margin and
  `translate(93px,37px)`. It also moved the popup into the button's new wrapper.
- `899c741`: removed the explicit transform/margin, centered the flex children,
  and changed popup width from 91 to 107 pixels. It retained the local-flow
  composition rather than reinstating the reference overlay ancestry.
- `f324bd1`: reduced the anchor width to 138 pixels, removed popup width, and
  revised text/padding/box-sizing values. The local relative popup remains.

The test `tests/material-parity/tooltip-position-history.spec.mjs` checks these
specific historical blobs and transitions. It does not validate their rendering.
`node --test tests/material-parity/tooltip-position-history.spec.mjs` passed 1/1
tests (exit 0; 392.4225 ms total) in this follow-up.
The existing showcase test at lines 745–759 asserts the desired rule values and
absence of a transform, but does not measure popup placement against the browser
reference. Its passing cannot demonstrate equivalent overlay behavior.

Thus removing visible calibration constants did not by itself restore equivalent
placement inputs. The surviving local-flow composition needs a contract-level
review: viewport-edge fallback, scrolling, clipping, trigger resizing, and overlay
ownership cannot be inferred from its nominal centered layout. This follow-up
does not claim that the historical calibration identifies the responsible core
defect or proves the currently reported offset's cause.
