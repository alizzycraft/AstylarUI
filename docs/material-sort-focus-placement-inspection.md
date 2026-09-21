# Sort focus placement: input mismatch

`node scripts/audit-material-sort-focus-placement.mjs` authenticates the pinned
position population and both full input trees for each of its 60 sort cases.
It completed with exit 0. Exactly eight cases are focus states; every other case
has neither the reference bottom border nor the candidate focus line.

In those eight focus captures the reference `.mat-sort-header-container` has a
solid one-pixel bottom border. The outer `sort-primary` host is static.
The candidate instead makes `sort-primary` relative and adds an absolute
`sort-focus-line` sibling of the trigger, with one-pixel height and top equal to
the explicitly authored host height (19 pixels, or 22 in the custom theme).
This changes border/flow ownership into independent background-strip placement.
It is not equivalent input merely because a line can appear at the same location.

History directly links the changes: `git show 994da86b --
examples/material-showcase/src/app/astylar.component.ts` adds the relative host,
absolute `.sort-focus-line` rule, and conditional focus-visible child together.
The current rules are around lines 708–710. This is a stronger explanation of the
host-position difference than comparing the static/relative scalar alone.

The inspector verifies all 60 host positions and presence/absence states, and
all eight focus border/line dimensions and candidate parent links. It is an
inspection checkpoint, not the final canonical attribution adapter. A focused
negative-control test and equivalent-input border/layout reproduction remain
needed before canonical integration or diagnosing core behavior. No existing
reference, fixture, renderer, or classification was changed.

Implementation planning: reproduce the reference border on its owning control
through the public API. If the border/layout behavior differs, fix that general
core rule before replacing the candidate strip and its dependent relative host.
Do not remove only the host positioning and leave the absolute child behind.

## Complete replay and negative controls

The collector now has a separately callable `proveSortFocusPlacement` function
and a checked-in `material-sort-focus-placement.json` containing all 60 paired
receipts and their focused/non-focused evidence. Reference control ancestry is
verified from the border owner through `sort-trigger` to `sort-primary`; the
candidate host position is checked at normal, interaction, and resolved stages.
Duplicate node keys and tree capture errors are rejected.

`node --test tests/material-parity/sort-focus-placement.spec.mjs` passed **2/2**,
exit 0, 627.6114 ms. It replays the full population against the checked report and
rejects ten altered-evidence cases: border width/style, owner ancestry, normal
host positioning, strip positioning/offset/parent, duplicate nodes, capture
errors, and incorrectly claiming a focused tree is a hover state.

This completes the negative-control follow-up requested above. It does not
complete an equivalent-input browser reproduction or canonical integration, and
does not turn the existing output mismatch into a confirmed core diagnosis.
