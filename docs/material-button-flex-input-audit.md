# Shared Material button formatting input audit

This is a source-backed authoring finding, not a claim that changing a button's
formatting declarations alone fixes its text or pixels.

## Complete source scope

[Machine evidence](material-button-flex-input-audit.json) retains **600 owners
across 480 original cases**, seven families and all four profiles: core, button,
menu, bottom-sheet, dialog, snack-bar and tooltip. It records **27 groups /
1,800 property observations** for controls using `.material-button`. Other
button classes, popup content and unrelated properties remain separate.

The report SHA-256 is
`b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a`.
The complete candidate class inventory is checked across all 2,311 original
cases, including cases without selected owners. Every selected reference and
candidate tree digest is checked. Unique identities, all 89 reference scalars,
the reference rule/scalar join and all three candidate local style stages must
match their original owners exactly.

## First divergence and ownership

The active reference `.mdc-button` declaration explicitly requests the following
formatting; complete candidate authoring omits these requests:

| Property | Reference request and computed value | Captured candidate local value |
| --- | --- | --- |
| display | inline-flex | block |
| align-items | center | stretch |
| justify-content | center | flex-start |

The candidate values match the generic baseline at
`src/app/config/browser-defaults.ts:14`, `:26` and `:27`. The button-specific
defaults at `:309` do not replace those three properties.
`StyleDefaultsService.getElementTypeDefaults` at
`src/app/services/dom/style-defaults.service.ts:43` merges the generic and
element-specific defaults. This source trace is consistent with the original
core inspection; it is not a final used-layout measurement or a claim that
generic native-button defaults have been fully browser-validated.

Classification: **application/plugin authoring defect**, owned by shared
showcase button translation at
`examples/material-showcase/src/app/astylar.component.ts:487`. The first proven
divergence is omission of explicit reference formatting inputs, before layout
and projection. This is different from merely comparing a browser computed
default to an omitted local value: the exact reference author rule is retained.

Candidate omission is checked against the complete rule collection with a
conservative selector filter, including possible state/media/unknown selectors,
inline declarations, `all`, and the relevant `place-items`/`place-content`
shorthands. A competing request rejects the proof instead of being ignored.

## Composition and claim limits

The reference's direct `.mdc-button__label` is a span. The candidate has the same
text in a native button `value` and no authored child nodes. The survey records
and verifies that correspondence, but **does not declare those compositions
equivalent** or treat `text-align:center`/native value painting as proof of the
reference's flex layout mechanism.

`align-items` and `justify-content` do not establish centering merely by having
particular local values when the candidate does not request flex formatting.
No original text offset, used box, painted baseline, hover layer, clip or hit
target is attributed to these omissions here. Position, host `vertical-align`,
width constraints and typography require their own context-sensitive analysis;
none is silently included in these three-property groups.

## History and implementation plan

The complete shared candidate base rule is identical to its declaration in the
initial showcase commit `2f440115740ff76fa9e55b3f4a11568207b2af5a`. These
requests are absent from that base rule at both endpoints. All possible current
captured rules are checked separately. This does not prove absence from every
historical auxiliary rule, or establish a later compensation or author motive.

When implementation is authorized, preserve the reference formatting and label
composition in a minimal public-API paired reproduction first. Exercise changed
content sizes, multiple inline children, density and interaction state changes.
If equal inputs diverge, trace anonymous/control text item generation, native
value painting and the core flex owner; fix the general contract rather than
adding wrappers or offsets solely to obtain a matching screenshot. Existing
anonymous-flex-text failures remain independent evidence, not automatic proof
of the same cause in these native buttons. Restore canonical input equivalence
only after the supported public path is demonstrated.

## Verification

```powershell
node scripts/audit-material-button-flex-inputs.mjs
node --test tests/material-parity/button-flex-input-evidence.spec.mjs
node scripts/audit-material-button-flex-inputs.mjs --check
```

Generation and no-write replay exit **0**. Tests: **2/2 pass**, zero
failures/skips/cancellations, **3,400.1574 ms**. Fourteen mutation controls reject
changed identity, reference declarations, computed scalars, source provenance,
candidate stages, competing requests, and mismatched label/value text. A
definitely unrelated selector remains an accepted control.

No renderer or canonical comparison input changed. Production binding,
classification integration and full-report conservation remain pending. This
standalone survey does not change the canonical **2,774** unresolved count.
