# Shared Material button host requests

This is an original-input authoring audit, not a used-layout, text-centering or
rendering-equivalence claim. [Machine evidence](material-button-host-request-audit.json)
retains 27 groups / 1,800 observations across 600 owners in 480 cases and seven
families. Complete candidate class selection is checked against all 2,311
original capture cases; no other button classes or popup owners are included.

## First divergence

| Host property | Explicit reference request | Candidate own-stage evidence |
| --- | --- | --- |
| position | relative | core-primary: explicit absolute (52 owners); other owners: absent |
| min-width | 64px | absent for all 600 owners |
| vertical-align | middle | absent for all 600 owners |

The reference `.mdc-button` rule owns all three requests. The core example also
has the same relative-position request from `.mat-ripple`. The candidate core
rule at `examples/material-showcase/src/app/astylar.component.ts:488` explicitly
requests absolute placement with top/left 28px and a fixed width. The other
reviewed candidate rules do not request these host properties.

The full proof reuses exact owner identity, all 89 reference scalar values,
label/value correspondence and three local candidate style-stage joins from
the earlier button evidence. It separately validates every relevant active
reference rule and scalar declaration, and checks complete possibly applicable
candidate rules plus inline declarations. Competing `all`, logical min-inline-
size, state and unknown-selector requests are rejected rather than ignored.

Classification: **application/plugin authoring defect**, owned by shared
showcase button translation and the core demo's explicit positioning rule.
These are explicit reference requests not preserved in candidate authoring,
not merely browser computed defaults compared with sparse local inspection.

## Evidence limits

The machine report records **1,748 absent own-stage property values** as null
with a separate absence flag. Null is not a computed CSS value: this audit does
not fill in static positioning, a minimum width, or a vertical-align baseline.
All 52 remaining observations retain the explicit absolute-position request.

CSS host vertical-align must not be equated to a native button's internal text
paint alignment. The existing reference label span and candidate native value
remain different composition; equal text does not establish structural or
baseline equivalence. Missing minimum-width intent cannot be accepted merely
because the current fixed button width happens to exceed 64px. Used widths,
containing blocks, flow, minimum-size clamping, glyph placement, clipping and
hit testing require their own composed public-API proof. No original pixel
offset or renderer defect is attributed to these requests here.

## Historical evidence and implementation order

Both complete candidate rules—the shared `.material-button` base rule at line
487 and the explicit `#core-primary` rule at line 488—are identical in the
initial showcase commit `2f440115740ff76fa9e55b3f4a11568207b2af5a` and current source.
The audit records both exact lines. This establishes endpoint source continuity,
not author motive or the absence of every historical auxiliary rule. The
absolute-layout substitution was not introduced by a later parity fix.

When implementation is authorized, first preserve all reference host requests
and label composition in paired public-API diagnostics. Exercise short and long
labels, narrow widths, inline siblings, absolute descendants and density changes.
Trace the first unequal stage through core formatting, minimum-size handling,
containing-block selection and text ownership. Do not replace missing support
with fixed offsets, widths or internal text-alignment adjustments. Only then
restore canonical authoring using the verified public path. Existing core
failures remain independent evidence, not automatic explanations for these
original native-button outcomes.

## Verification

```powershell
node scripts/audit-material-button-host-requests.mjs
node --test tests/material-parity/button-host-request-evidence.spec.mjs
node scripts/audit-material-button-host-requests.mjs --check
```

Generation and no-write replay exit **0**. Tests: **2/2 pass**, zero failures,
skips or cancellations, **4,020.1524 ms**. Fourteen negative controls reject
changed identity, reference requests, source provenance, local stages,
competing candidate requests, scalar/source loss and changed absolute placement.
A definitely unrelated selector remains a positive control. All original tree
digests and complete owner/property/case coverage are independently replayed.

No renderer, canonical comparison or canonical classification changed. Source
binding into the main classifier, precedence and full-report conservation are
still pending; the canonical report remains at 2,657 unattributed groups.

## Original-source binding and classification protection

`button-host-request-source-binding.mjs` independently reopens the original
report and both digest-checked trees for all **2,311** cases. It binds all **600**
selected owners and retains the **1,831** cases without selected scalar owners.
The observation proofs exactly match the checked-in survey. Missing or duplicate
cases, changed scalar values and removed owners are rejected before attribution.

The bounded classifier covers **27 groups / 1,800 observations** and requires
exact owner identity, source provenance, reference requests, candidate presence
or absence, and all five false claim flags. Its validator requires complete
case/state/value coverage, exact evidence and ownership, and independent source
replay. JSON round-tripping is tested: omitting an undefined scalar does not
invent an authored null, `static`, zero or equivalent default. All **52** explicit
absolute-position observations remain distinct from **1,748** absent own-stage
values. Diagnostic reports selecting other scalar owners retain their source
cases without inventing button observations.

```powershell
node --test tests/material-parity/button-host-request-source-binding.spec.mjs
```

Result: **5/5 pass**, zero failures/skips/cancellations, **63,421.7937 ms**.
Thirteen classification mutations, source/population mutations, five false-claim
mutations, four invented-default substitutions, false core absence and changed
label composition are rejected. A no-button diagnostic remains a positive
control.

This uses direct captured-property callbacks, not the production normalizer or
classification precedence. Main integration and full-report conservation remain
pending; neither canonical classifications nor renderer behavior changed. The
next integration must also retain the separate button-flex proof and conserve
every raw value and every unrelated classification, without promoting any of
these authoring differences to rendering equivalence or proven core causation.

## Production classification integration

The main audit now binds both prepared button proof sets and classifies only
previously unresolved properties. The production integration test executes the
actual preceding audit module at `61659474f71dbf5eb02cae07243adb8fef8aec03`,
with unchanged normalization and shared mappings. Across 1,087 diagnostic cases
and 283 button owners, it requires exactly 27 host plus 27 formatting groups /
1,698 observations, unchanged raw scalar values, and all 2,884 unrelated complete
records unchanged. The production validator rejects missing evidence for either
binding; absent host values remain absent, not manufactured defaults.

`node --test tests/material-parity/button-requests-canonical-integration.spec.mjs`
passes **1/1**, zero failures/skips/cancellations, **438,937.1255 ms**, after its
pre-integration failure at 0 versus 27 expected groups. The earlier-authoring
targeted compatibility test passes **1/1**, **133,957.2539 ms**. Full canonical
regeneration, all-case conservation and no-write validation remain pending.
No host authoring, plugin or renderer behavior was modified, and composition,
containing blocks, used dimensions and original raster cause remain unproven.

## Complete original-report conservation

Canonical generation now includes all **600** original host owners and
**27 groups / 1,800 observations**, without manufacturing absent computed
defaults. `node scripts/verify-material-button-requests-integration.mjs` exits
**0**, independently replaying both button bindings over all **2,311** original
cases and retaining **1,831** negative-selection cases each. All **8,339** raw
scalar rows and **8,285** unrelated complete records match the preceding
committed report; exactly 54 formatting/host groups receive new attribution.
Generation's sole validation error is the remaining **2,603** unattributed
groups, not a claimed input-equivalence pass. All **180** source fingerprints
are checked. The investigation records exact payload and conservation hashes.
Full no-write replay remains pending; used layout, containing blocks and
native-value/label-span composition still require their own proof.

The subsequent complete canonical **no-write replay** has now finished: exit
**1**, solely the existing **2,603** unattributed groups. No source drift or
saved-report mismatch is reported. All 436 static / 1,875 interaction cases and
180 frozen dependencies are retained. The investigation records the exact
command; reproducibility does not establish used layout or rendering parity.
