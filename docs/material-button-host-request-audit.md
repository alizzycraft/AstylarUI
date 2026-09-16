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
