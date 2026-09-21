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
