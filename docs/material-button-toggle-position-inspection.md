# Button-toggle positioning and paint ownership

The paired trees cover all 68 states for each of three position discrepancy
groups (204 observations): group, first option and second option. SHA-256
authentication, ordered case membership and shared tree receipts are checked.
This is a structural inspection; none of these position rows is waived or
classified as equivalent. Canonical attribution is unchanged.

## Demonstrated inputs

The reference group is relative, inline-flex, overflow-hidden. Both relative
option wrappers contain native radio-role buttons and separate absolutely
positioned focus-overlay and ripple spans. The candidate group is flex,
overflow-hidden, with no captured position declaration in any of its three style
stages. Its two div options carry radio state directly, with a label and a
conditional plugin check-mark; the reference's separate button/focus/ripple
structure is absent. Selected state agrees at the inspected paired boundary.
This does not prove equivalent event behavior or paint.

Reference group sizes are content-box (127.953px wide, 40px or 24px high);
candidate sizes are border-box (130px wide, 42px or 26px high). Do not call these
raw dimension differences a 2px size bug without accounting for borders.
Reference corner declarations are 28px / 21px / 42px across captured themes;
candidate declarations are 21px / 9.75px / 31.5px. Large radii can be constrained
by box geometry, so raw declarations alone do not establish different painted
corners. The exact paired values remain in the JSON, without normalization.

## History and ownership

The actual `f3c8254` diff changed the group background from selected color to
the surface-container color, removed each child's asymmetric rounded ends and
put the selected background directly on the square option. The group retained
rounded overflow clipping. `ae9cdad` subsequently added four hover/active
background rules, separately for selected and unselected options.

Current authored rules: `examples/material-showcase/src/app/astylar.component.ts`
lines 512–521; structure lines 976–978. These are application-level composition
choices, not proof that core rounded clipping or pseudo-state paint is correct.
Do not reinstate child-radius workarounds to conceal failed parent clipping.

The next equivalent-input reproduction should separate (1) a rounded parent
clipping square selected children, (2) relative hosts with absolute interaction
layers, and (3) pseudo-state paint plus click/focus transitions. Compare local
raster borders and event boundaries, not just SSIM. Only then attribute the
reported overflow to a demonstrated owning defect. Keep missing-position and
flattened-structure questions open until containing-block/paint semantics are
proved; an omitted property is not a computed static result.

## Verification

`node tests/material-parity/button-toggle-position-inspection.mjs`
generated all 204 observations across 68 distinct paired states.
`node --test tests/material-parity/button-toggle-position-inspection.spec.mjs`
passed 2/2, exit 0, 869.8561 ms. Four negative controls reject changed clipping,
interaction-layer positioning, checked state and candidate position presence.
No renderer, plugin, canonical fixture or live producer dependency was changed.
