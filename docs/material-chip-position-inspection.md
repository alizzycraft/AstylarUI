# Chip positioning, graphic-slot and fixed-width inspection

Three complete position groups cover 228 observations across 76 paired states.
Every tree is hash-authenticated; group membership, parent linkage and selected
state are checked. Canonical position classification remains unresolved.

The static reference listbox contains a generated wrapper. Each relative chip
has an absolute focus overlay and a native option-role button inside a cell.
That button retains a relative graphic slot. The candidate list directly owns
div-based options with a label and a conditionally present plugin check-mark;
all three mapped candidate owners omit position in all captured style stages.
This is not proof that the omitted properties resolve to equivalent behavior.

## Sizing evidence

| Chip/state | Reference graphic width | Reference chip width | Candidate authored width |
| --- | ---: | ---: | ---: |
| Angular selected | 24px | 97.4219px | 97px |
| Angular unchecked | 0px | 73.4219px | 68px |
| Astylar selected | 24px | 92.75px | 93px |
| Astylar unchecked | 0px | 68.75px | 64px |

The candidate check-mark node is absent when unchecked. A still-present hidden
mark cannot explain these captured unchecked layouts. This does not rule out
incorrect gap/layout handling in core; neither does it prove text is centered.
Reference measured widths and candidate authored border-box widths are kept
distinct rather than treated as the same measurement stage. The state-dependent
hard-coded widths are an input concern requiring a separate intrinsic-layout
proof before diagnosing the original visual symptom.

## History

`00de46c` removed `.chip-label` relative `top: -2px`, changed the group gap
10px to 8px, and changed selected chip widths 98/94px to 97/93px.
`ae9cdad` added selected/unselected hover/active background rules and removed
the unchecked label's 8px right margin. It still retained label padding and a
0.25px vertical transform at that point. `8870fc5` subsequently removed those
padding/transform corrections. Do not report the removed corrections as current
code, or assume removing them proved parity.

Current rules: `examples/material-showcase/src/app/astylar.component.ts`
690–699; structure 844–847. The follow-up must compare the reference graphic-slot,
native button and text-sizing requests through the public API, including both
selection states, changed labels, focus and hover. Keep that diagnostic variant
separate from canonical fixtures. Neither a shared coordinate cause nor
equivalent interaction-layer rendering has been established by this inspection.

## Verification

`node tests/material-parity/chip-position-inspection.mjs` generated all three
groups with their complete paired receipts.
`node --test tests/material-parity/chip-position-inspection.spec.mjs` passed
2/2, exit 0, 878.8618 ms. Five negative controls reject altered wrapper ownership,
selected state, position presence, authored width and graphic positioning.
