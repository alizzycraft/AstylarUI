# Toolbar positioning and spacing inspection

All 52 pinned toolbar cases are authenticated against their reference and
candidate input-tree hashes. This is inspection evidence, not a completed
classification or renderer diagnosis. Canonical attribution remains unchanged.

The reference has a static flex toolbar with `0px 16px` padding and three
children: title, growing spacer, and action. The candidate has a relative flex
toolbar with zero padding and only title/action children. Its title has a
192.15625px width and 16px left margin; the action has `0 16px 0 auto` margins
and a 65.140625px (64px on mobile) width. Both candidate children omit position
in all three captured style stages. Omission is not rewritten as computed static.

## Historical evidence

`git blame -L 669,675 -- examples/material-showcase/src/app/astylar.component.ts`
attributes the relative toolbar host to original showcase commit `2f440115`.
The actual diff of `3bf5b4d90f1c0d6b74efe1c94513ceda3421e93d` removes the action's
absolute placement, density-specific top offsets (11/14/12.5px), and mobile
top/right corrections (including -12.15625px right). It introduces the flex
action and auto margin but leaves the relative host and fixed title width.

Thus the current host declaration must not be described as proof that the
current action is absolutely positioned. The old correction was removed.
Conversely, that removal does not prove equivalent inputs: padding, spacer,
intrinsic text sizing and shrink behavior remain different requests.

## Next owning proof

Compare the original padded flex/spacer/intrinsic-width composition through
the public API, including narrow widths and changed text. Separately establish
whether the retained host positioning changes containing-block or stacking
behavior. Do not delete it or label it a confirmed core defect merely because
the browser host is static. No Babylon coordinate cause is established here.

## Verification

`node tests/material-parity/toolbar-position-inspection.mjs` records all 52
ordered cases with receipts and explicit unproven flags in the companion JSON.
`node --test tests/material-parity/toolbar-position-inspection.spec.mjs`
passed 2/2, exit 0, 816.2409 ms. Five negative controls reject changed child
ownership, spacer growth, reference padding, candidate positioning and width.
No canonical fixtures, renderer code or running producer dependencies changed.
