# Shared field-host layout authoring: followed-history review

The shared `.field-shell` rule's ten reviewed layout expressions are unchanged
through all **102** source revisions returned by the pinned followed history,
from introduction at `2f440115740ff76fa9e55b3f4a11568207b2af5a` through
`9f713c0930ea5c3692e96f5f62a05d38863abcb8`. Current working authoring matches.
This rules out a later edit to these expressions as the origin of their present
form; it does not explain why the initial author chose them or rule out changed
dependencies, surrounding styles or renderer behavior.

Source: `examples/material-showcase/src/app/astylar.component.ts:540`.

| Property | Authored expression throughout followed history |
| --- | --- |
| position | `'relative'` |
| display | omitted in this rule |
| flexDirection | omitted in this rule |
| width | `'100%'` |
| height | density 0: `78px`; density <= -5: `62px`; otherwise `70px` |
| minWidth | omitted in this rule |
| boxSizing | `'border-box'` |
| padding | omitted in this rule |
| borderWidth | omitted in this rule |
| alignSelf | `'flex-start'` |

The machine receipt retains the exact height expression rather than replacing
it with those three output values. Its per-revision source and expression hashes,
line locations, pinned endpoint and exact history command make this stronger
than an endpoint-only comparison. Omission means only omission in this rule;
it is not a computed/default-value claim or a complete cascade diagnosis.

## Verification

```powershell
node scripts/audit-material-field-host-layout-history.mjs
node --test tests/material-parity/field-host-layout-history.spec.mjs
node scripts/audit-material-field-host-layout-history.mjs --check
```

Session **69169** terminates with exit **0**. Generation and no-write replay
both succeed. The two tests pass **2/2**, zero failures, skips, cancellations or
todos, **7,812.8924ms**. The first reopens all 102 historical blobs and reproduces
the complete receipt. The second detects changed/lost requests and rejects
missing or duplicate target rules, duplicate properties, opaque spreads,
computed keys, methods and invalid syntax. Quoted property names and unrelated
rules are handled without hiding target changes.

## Audit disposition

This is historical authoring evidence, not a new canonical classification or
renderer diagnosis. The native-button box-sizing result must not be generalized
to this `div` host or its `mat-form-field` reference. The remaining field-host
box-sizing groups need exact original owner/declaration/state binding and a
separate assessment of box-model, fixed-height and formatting-context inputs.
Where a core defect is suspected, use an equal-input public reproduction rather
than changing the comparison's height or box sizing to make it look right.

No renderer, plugin behavior, canonical comparison, threshold, original capture
or current canonical source fingerprint is changed. The new standalone test is
not part of the earlier 80-file harness result; future complete discovery must
include it. No input-equivalence, computed-value or rendering-equivalence claim
is made.
