# Shared button paint: complete captured-state census

[Machine evidence](material-button-paint-all-states.json) extends the existing
[hover/held review](material-button-state-paint-survey.md) without changing its
observer, original capture, canonical fixtures or classifications.

The collector scans **all 2,311 original cases**, including static states, and
authenticates every candidate input tree. Where an authored `material-button`
host exists it also authenticates the reference tree and runs the original
host/persistent-ripple/pseudo-element/scalar correspondence checks. It records
**600 owners** across core, button, menu, bottom-sheet, dialog, snack-bar and
tooltip families. All **146 historical hover/held observations** are reproduced
as complete equal objects, not merely equal counts.

## Why the extra states matter

A current-canonical membership diagnostic authenticated payload
`c08d24e9...a810e` and freshly replayed the older survey. Its 114 active-layer
observations cover 18 complete unresolved background groups (36 observations),
but cover only part of 22 others. Those groups also include activation/open
states. Eight button-family groups had no unresolved-row match; that diagnostic
did not establish their prior attribution or authorize overwriting it.

The old survey therefore cannot be applied wholesale to canonical backgrounds.
The new census closes its **state-selection gap**, not the remaining canonical
binding and classification obligations. The diagnostic log is
`button-state-paint-current-membership-sep20.log` in the existing audit artifact
directory; its occurrence-only complete-group candidates still require exact
case/state and independent source-coverage checks before promotion.

| Captured state population | Owners | Reference active-layer owners |
| --- | ---: | ---: |
| Static | 108 | 0 |
| Keyboard focus | 72 | 56 |
| Hover / held | 146 | 114 |
| Activate | 74 | 33 |
| Activate-leave / disabled | 104 | 0 |
| Open | 40 | 16 |
| Other open/dismiss/repeat/auto-dismiss states | 56 | 16 |
| **Total** | **600** | **235** |

The other 365 owners retain zero reference state-layer opacity. They are not
silently discarded or certified equivalent. All raw normal, interaction and
effective candidate styles, state rules, reference pseudo rules and sibling
plugin nodes remain in the deduplicated proof patterns.

## Findings and limits

The previously demonstrated unequal paint composition extends beyond hover and
held states: reference base-plus-translucent-pseudo-layer composition contrasts
with candidate leaf/background authoring. These are authoring findings, not
proof of an equal-input renderer defect. Candidate sibling plugin paint remains
an independent owner; no whole-button paint absence is inferred.

The original 17 held host-color observations are conserved unchanged. Their
pointer/rebuild lifecycle cause, any additional plugin paint, and final raster
still require separate investigation. Do not equate a state label such as
`open-dismiss` with zero remaining hover paint; record the actual captured
opacity and styles.

Next: independently bind the expanded source population to complete canonical
background groups, preserve earlier reviewed rows and inactive-owner evidence,
and then propose only justified classifications. Public equal-input composition
proof and removal of preblending belong to the later implementation task.

## Verification

```text
node --max-old-space-size=1536 scripts/audit-material-button-paint-all-states.mjs
node --max-old-space-size=1536 --test --test-concurrency=1 tests/material-parity/button-paint-all-states.spec.mjs tests/material-parity/button-state-paint-survey.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Generation exits 0. All **8/8 tests pass**, exit 0, **15,680.8473ms**, without
skips, cancellations or TODOs. This includes full write-prohibited replay,
original negative identity/stage/pseudo controls, exact historical subset
conservation, state coverage and harness discovery/runner tests.

Report SHA-256:
`d73d512b70e0e4924c09d0c27ffce9469e087feb4a21314c19be26b235e6d5b9`.
Logs: `button-paint-all-states-generation-sep20.log` and
`button-paint-all-states-full-sep20.log` under
`artifacts/material-parity/field-host-flow-input-audit/`.
No canonical report, renderer, plugin or comparison input was changed.
