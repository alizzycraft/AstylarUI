# Overlay owner declarations after identity/context replay

This audit follows the verified 91-state reference replay through the captured
owner-to-root style paths for all **54 groups / 1,532 observations** in the
overlay-owner mapping population. It does not modify production code, canonical
fixtures, scalar captures or canonical classifications.

The machine-readable companion retains raw reference computed values, inline
declarations, matching captured rules with active flags and conditions,
candidate authored nodes, all three local style stages and conservatively
possible candidate rules. Its 121 deduplicated trace patterns preserve every
group's complete case membership. Each trace retains the existing scalar-rule
gaps and explicitly declines candidate computed/input/rendering equivalence.

## Findings and boundaries

| Captured-path evidence | Groups | Observations |
| --- | ---: | ---: |
| No relevant or motion request observed | 42 | 1,176 |
| Explicit or conservatively possible relevant request | 4 | 100 |
| Motion request only | 7 | 224 |
| Relevant request and motion request | 1 | 32 |

The first row is **not an equivalence attribution**. External ancestor CSSOM is
retained in the reference-context capture but is not resolved by this trace
reader. Candidate omission is still a local-stage observation, not a computed
initial or inherited value. Candidate possible-rule selection deliberately
over-approximates unknown selectors and does not assert a cascade winner.

### Bottom-sheet wrapper: a different structural role, not a missing default

All 25 `bottom-sheet-overlay` observations have reference `pointerEvents: none`
on the CDK global wrapper, versus an omitted candidate local declaration. This
property is **not** the initial `auto` keyword. The population originated in a
shared initial-style review, but that name must not turn every member into an
initial-value claim.

The reference `.cdk-overlay-container, .cdk-global-overlay-wrapper` rule requests
`pointer-events: none`; the descendant `.cdk-overlay-pane` requests `auto`.
These requests are also retained in the paths to the two list items and panel.
The candidate wrapper is a `div` with `modal-overlay bottom-sheet-overlay`
classes and also paints the dim backdrop. It does not reproduce the reference's
separate backdrop/wrapper/pane roles. The earliest demonstrated input divergence
is therefore fixture composition/styling, before Babylon projection. Measurement
identity is insufficient to declare those roles equivalent.

Source/history evidence:

- `examples/material-showcase/src/app/astylar.component.ts:788` authors the
  combined fixed-size backdrop/layout container; blame identifies `2f440115`.
- Line 799 supplies bottom alignment; blame identifies `f3c8254c`.
- Lines 1004–1008 construct the bottom-sheet wrapper and its panel/items;
  the wrapper branch comes from `0d67d46c`.
- `src/app/services/dom/elements/element-creation.service.ts:400` makes a mesh
  non-pickable when its effective style explicitly requests `pointerEvents:
  none`. This identifies a relevant core consumer, not proof that the current
  fixture's omission caused the user's historical click-stealing symptom.

Do not add `pointerEvents: none` to the existing candidate wrapper as a parity
patch: it has a different role, so that change could disable backdrop behavior.
The implementation plan must first restore equivalent backdrop/wrapper/pane
authoring in an isolated reproduction, then test core inherited pointer-event
handling, child `auto` overrides, outside dismissal and surface isolation with
real pointer actions. Only then decide which fixture and/or core changes own
the result. The original symptom is not marked resolved by this source review.

### Dialog: preserve transition evidence

All eight `dialog-panel` property groups retain transition-related declarations
on their reference ancestry. Seven groups have only those motion requests;
the pointer-event group also contains the CDK wrapper/pane declarations.
The trace preserves empty captured CSSOM longhand strings and the
`._mat-animation-noopable .mat-mdc-dialog-surface` declarations (`none`, `0s`,
and other longhands). Presence is not proof of running animation, nor are empty
strings silently converted to initial values. A future attribution must bind
effective transition properties/durations and the settlement state rather than
waiving the conservative motion guard from selector names alone.

### Raw spacing and known capture defects remain visible

Reference `wordSpacing: 0px` stays raw in each path. The group-level comparison
uses the previously recorded `0` serialization only to join the existing group;
it does not insert candidate zero values. The known 59 layered-rule capture gaps
remain attached to their owner traces. No new layer-capture defect is claimed.

## Verification

```powershell
node --test tests/material-parity/overlay-owner-declaration-review.spec.mjs
node scripts/audit-material-overlay-owner-declarations.mjs
node scripts/audit-material-overlay-owner-declarations.mjs --check
```

The focused run passed **6/6**, no failures/skips/cancellations, in
**174.1211 ms**. Eight identity/path mutation controls reject unresolved or
overclaimed identity, duplicate nodes, missing ancestors and substituted owner
keys. Other assertions preserve inline priorities, inactive conditions, resets,
shorthand aliases, all local stages, possible pseudo-state rules, empty motion
values, raw spacing and prior rule gaps.

Generation and no-write replay exited 0 with the exact counts above. Both invoke
the independent original-context verifier before opening the hash-bound original
trees, then validate group membership and raw scalar correspondence. These six
tests are standalone, not part of the 43-file harness currently running. The
canonical audit still has **2,812 unattributed groups**; this increment provides
the next evidence partition without claiming those groups are resolved.
