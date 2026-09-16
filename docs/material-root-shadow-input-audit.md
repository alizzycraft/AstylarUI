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

## Canonical integration preparation

The production builder now retains independent root-shadow binding and invokes
the classifier only for still-unresolved rows, after all earlier classifications
retain precedence. Validation reopens the source capture and verifies exact
owner/state/property coverage. The report and source inventory include the
limited authoring claim and its four supporting modules/proofs (162 to 166
source files, with no prior entry removed).

The production integration proof compares against the actual committed pipeline
at `502ea44a064d49cd4c273bd93dfb5d51f6adbc87`, not a simulated classifier with
old bindings disabled. Only relative import locations are relocated, with AST
checks that every executable statement is preserved. Current alias mapping,
normalization and equivalence functions remain identical to that predecessor.
The diagnostic population has **277 original cases**: 36 static family controls
and one original case for each of all 241 interaction family/state combinations.
Full original trees remain intact; only root scalar owners are selected in the
separate diagnostic report. This is not a substitute for all-profile coverage.

The diagnostic verifies 36 newly attributed shadow groups, unchanged captured
inputs and scalar projections, and unchanged complete unrelated classification
records. Mutation controls reject lost binding, removed proof/rows, false raster
claims and incomplete reviewed-case lists. A separate diagnostic report with no
selected root scalar retains its negative cases without fabricating a shadow
observation; the existing tooltip integration continues to pass. Original
all-case source binding still rejects a caller deleting root scalar inputs from
the independently reopened original population.

```powershell
node --test tests/material-parity/root-shadow-source-binding.spec.mjs tests/material-parity/root-shadow-canonical-integration.spec.mjs
node --test tests/material-parity/tooltip-wrapping-canonical-integration.spec.mjs
node --test --test-name-pattern='records source fingerprints and actual visual acceptance fields' tests/material-parity/input-equivalence-audit.spec.mjs
node scripts/verify-material-root-shadow-integration.mjs
```

Results, respectively: **6/6 pass, 191,783.9885 ms**; **2/2 pass, 23,563.1913 ms**;
and **1/1 pass, 1,330.4549 ms**, all with zero failures/skips/cancellations. The
full-report gate currently fails as expected at `0 !== 36`: the checked-in
canonical report predates this integration. After regeneration it must prove
all 8,339 scalar rows and 8,303 unrelated complete records unchanged, independently
replay all 2,311 source owners, verify all source digests and exact inventory
membership, and permit only the 36-group classification/summary delta.

An AST comparison finds 171 main audit functions, with 165 unchanged. Only the
builder, validator, Markdown renderer, discrepancy collector, source inventory
and focused-proof inventory changed. No normalization or renderer function was
edited. Do not claim **2,774** remaining until the full regeneration and its
conservation gate finish; the last verified canonical checkpoint is **2,810**.
Final no-write replay, full harness, historical-survey provenance review and
enforced matrix remain required. The preceding paragraphs record the preparation
checkpoint; the completed regeneration and conservation result follow below.

## Full-report regeneration and conservation verified

The full original-report regeneration has now terminated with exit **1**, with
the single reported error **2,774 resolved-style differences still lack
root-cause attribution**. It preserves 436 static and 1,875 interaction cases,
8,339 discrepancy groups, 386,891 occurrences and 132 source findings. Input
equivalence remains **false**. This is expected failing audit evidence, not an
accepted parity result.

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
node scripts/verify-material-root-shadow-integration.mjs
```

The conservation gate exits **0** against the immutable pre-integration report
at `502ea44a064d49cd4c273bd93dfb5d51f6adbc87`. It verifies:

- All **8,339 scalar projections unchanged**, including values, occurrence
  counts, captured case samples and state lists.
- All **8,303 unrelated complete discrepancy records unchanged**, SHA-256
  `1f0dbebf23db6d11100ec60cd32b9118a726c99bc9d37bf5340a0fda4c60e8eb`.
- Exactly **36** newly classified groups / **2,311** observations; every
  original shadow owner independently replayed with source/tree digests and
  exact reviewed-case membership. Authored examples are unchanged.
- Only the corresponding classification totals and unresolved count change;
  rendering, paint and input-equivalence claims remain false.
- Exactly **166** source fingerprints: all 162 earlier entries retained, the
  four declared shadow evidence/proof modules added, and only the main audit
  module and its source-inventory test changed among existing sources.

The new compressed report is **48,964,575 bytes**, SHA-256
`216ed2c105393ad0ddccb112f682ac672c7e7a9c9d9c1547fbe67e78c0e5698a`.
Its decoded payload is **1,833,194,934 bytes**, SHA-256
`1c11b825df642982d5fe0c3f8f574a8f683543c8b9e98be72acda65d15691237`.

A separate full `--check` no-write replay has started and remains pending.
The full harness, historical-survey provenance review and final enforced matrix
also remain incomplete. No renderer or canonical comparison input changed.
