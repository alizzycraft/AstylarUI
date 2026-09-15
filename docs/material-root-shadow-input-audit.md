# Shared container shadow: unequal authored alpha

All **2,311 original cases across 36 families** use different shadow alpha
requests on the corresponding `*-root` section. The first divergence is in
shared showcase authoring, before layout or Babylon projection.

| Stage | HTML reference | AstylarUI |
| --- | --- | --- |
| Authored source | `0 2px 8px #0002` | `0 2px 8px rgba(0,0,0,0.14)` |
| Captured declaration | `rgba(0, 0, 0, 0.133) 0px 2px 8px` | `0 2px 8px rgba(0,0,0,0.14)` |
| Captured comparison | Computed `rgba(0, 0, 0, 0.133) 0px 2px 8px 0px` | The same authored request at each of the three local style stages |

Source locations: `examples/material-showcase/src/app/reference.component.ts:106`
and `examples/material-showcase/src/app/astylar.component.ts:480`. The four-digit
hex alpha is `34/255` (approximately 0.133333), not 0.14. This is not simply
different token ordering or an omitted zero spread.

## Evidence and classification

`material-root-shadow-input-audit.json` retains each component, theme, full
viewport/DPR, state, original tree descriptors and property proof. The collector
hash-checks the original capture and all 4,622 referenced tree files. It verifies
unique root identities, section/frame/page ownership, all 89 reference scalar
values, the exact active reference request, the unique candidate root rule and
all three complete scalar-to-root style-stage joins. Competing requests and
ambiguous owners are rejected.

Classification: **application/plugin authoring defect**. Owner: shared Material
showcase container authoring. This finding does not establish candidate used
paint, a shadow-kernel defect, clipping, raster magnitude or overall visual
equivalence. It does not bless any other container input or child structure.
No reference, candidate fixture, renderer, or threshold was changed.

History checks (`git log -S` and `git show`) locate **both requests** in the
initial showcase commit, `2f440115740ff76fa9e55b3f4a11568207b2af5a`
(`feat(example): add Material component showcase`). This is an initial
translation mismatch; no evidence identifies it as a later compensating fix.

Chrome **152.0.7977.76**, at DPR **1 and 2**, was given five separate minimal CSS
requests: four/eight-digit hex and exact decimal-alpha equivalents, plus two
order/spread representations of alpha 0.14. The first three compute identically;
the last two compute identically to each other but differently from the first
three. Their boxes are all `(30,30,100,50)` CSS pixels. These browser-only
normalization controls do not claim Astylar paint or screenshot equivalence.

## Verification

```powershell
node scripts/audit-material-root-shadows.mjs
node scripts/audit-material-root-shadows.mjs --check
node --test tests/material-parity/root-shadow-input-evidence.spec.mjs
```

The initial test run passed **4/4**, zero failures/skips/cancellations, in
**10,626.1785 ms**. It replayed every original property proof, checked 11 negative
controls, and ran the two real-browser serialization controls. After strengthening
source-inventory membership and top-level claim guards, generation and no-write
replay both exited 0, and the final rerun passed **4/4**, zero failures/skips/
cancellations, in **10,414.1947 ms**.

## Implementation order and audit follow-up

1. Integrate these 36 groups only after independent canonical source binding and
   full scalar/unrelated-row conservation. The standalone report does not yet
   change the canonical attribution count.
2. During the later implementation phase, restore the same authored shadow
   request on the candidate side; do not compensate with opacity, blur, size,
   offsets or mesh geometry.
3. If equal requests still render differently, reduce the residual to the
   generic shadow/color paint boundary. `parseBoxShadow` in
   `src/app/services/dom/elements/box-shadow.ts` preserves explicit color tokens
   separately from CSS lengths; downstream paint behavior needs its own paired
   public-API/raster proof, not inference from this authoring audit.

## Independent source binding prepared

`tests/material-parity/root-shadow-source-binding.mjs` now binds the complete
2,311-case original population to its capture digest and all 4,622 original tree
descriptors. Every case remains present; only the root scalar is selected, while
the full trees retain all rules, ancestry and owner-stage evidence. The binding
compares the caller's population with the independently reopened original report
and atomically rejects changed or incomplete evidence. It does not read the
standalone survey as an authority for classification.

The focused proof separately compares all newly derived property proofs with
the checked-in survey. Source validation reopens the original capture and trees;
classification validation requires exact per-family owner, state, values and
case coverage for all **36 groups / 2,311 observations**. Raw captured inputs and
four explicit non-equivalence/paint-limit flags remain intact. Classification
is limited to unequal authored shadow inputs, not a new renderer diagnosis.

```powershell
node --test tests/material-parity/root-shadow-source-binding.spec.mjs
```

Result: **4/4 passed**, zero failures/skips/cancellations, **60,063.5204 ms**.
Negative controls cover lost/duplicated cases, altered scalar inputs, source
boundary violations, removed retained evidence, modified request traces,
unsupported rendering claims, changed classifications/owners/values, duplicate
or incomplete reviewed cases and forged occurrence counts.

This standalone stage deliberately uses identity normalization callbacks.
Production normalization, classification precedence and full-report conservation
remain required before integration. The canonical attribution count is still
**2,810** after the separate tooltip integration; this increment does not change
it. No renderer or canonical example was modified.
