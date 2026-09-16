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

## Original-source binding prepared

`button-flex-source-binding.mjs` independently reopens the original capture and
hash-checks both trees for every case. Its caller population must match the
source exactly. It retains all **2,311 cases**, including **1,831 negative
cases**, and all **600** reviewed button owners. The existing original proof
checks explicit reference formatting, candidate omission, every local stage,
and the label/value correspondence without declaring composition equivalent.

The classifier accepts only display, align-items and justify-content, preserving
the first divergence as unequal authoring. Classification validation requires
exact source owner/state/value coverage, evidence, ownership, occurrences and
sample-case order for all **27 groups / 1,800 observations**. Independent replay
rejects removed negative cases, changed rules, lost owners and layout overclaims.
Separate diagnostic reports may select other scalar owners, but must still
match their independently reopened source; no missing button is invented.

```powershell
node --test tests/material-parity/button-flex-source-binding.spec.mjs
```

Result: **5/5 pass**, zero failures/skips/cancellations, **66,175.8605 ms**.
Thirteen classification mutations, source/population mutations, four direct
claim mutations and a label-mismatch mutation are rejected. These tests use
direct captured properties, not the production normalizer. Production
integration, precedence and complete-row conservation remain pending. This
increment changes no canonical classifications, renderer, comparison input or
any of the 173 sources frozen for the ongoing flow/radius report regeneration.

## Production classification integration

The main audit now binds both button formatting and host-request evidence,
consulting their classifiers only after existing classifiers decline. Original
raw values and all normalizers remain unchanged. The new regression executes
the actual prior audit module at `61659474f71dbf5eb02cae07243adb8fef8aec03`,
with only import URLs relocated, across 1,087 diagnostic family/profile/state
cases and 283 button owners. It requires exactly 27 formatting plus 27 host
groups / 1,698 observations, all 2,938 unchanged scalar records and all 2,884
unrelated complete classifications unchanged. Missing binding is rejected by
the production validator.

`node --test tests/material-parity/button-requests-canonical-integration.spec.mjs`
first failed at 0 versus 27 expected groups (**128,492.1246 ms**), then passed
**1/1**, zero failures/skips/cancellations, **438,937.1255 ms**. The earlier
root-flow/radius integration's targeted compatibility test also passes **1/1**,
**133,957.2539 ms**, preserving its existing findings and negative controls.

Complete canonical regeneration and all-case conservation remain pending. This
is source-bound authoring attribution, not native-value/label-span composition,
used flex layout, text centering or rendering-equivalence proof. No renderer or
canonical comparison was edited.

## Complete original-report conservation

Canonical generation now includes all **600** original formatting owners and
**27 groups / 1,800 observations**. The combined formatting/host conservation
gate, `node scripts/verify-material-button-requests-integration.mjs`, exits **0**:
all **8,339** raw scalar rows and **8,285** unrelated complete records match the
committed preceding report. Both original-source bindings independently replay
all **2,311** cases, including **1,831** negative-selection cases each. Exactly
54 groups receive new authoring attribution across the two bindings, leaving
**2,603** unattributed groups as the generation command's sole validation error.
All **180** source fingerprints are checked. See the investigation's complete
conservation entry for payload and unchanged-record hashes. Full no-write
replay remains pending; no used-layout or renderer-parity claim is implied.

The subsequent complete canonical **no-write replay** has now finished: exit
**1**, solely the existing **2,603** unattributed groups. No source drift or
saved-report mismatch is reported. It retains all 436 static / 1,875 interaction
cases and all 180 frozen dependencies. The exact command is recorded in the
investigation; this establishes report reproducibility, not renderer parity.
