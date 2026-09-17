# Original caret observations: bounded attribution candidate

The [machine report](material-owner-caret-attribution.json) prepares source-bound
classification for **118 groups / 3,154 observations** without changing the
canonical audit. All **145 groups / 4,050 observations** from the original
caret survey remain accounted for, including **27 groups / 896 observations**
that are deliberately not classified by this rule.

## Scope of the classification

| Original evidence | Groups | Observations | Candidate attribution |
| --- | ---: | ---: | --- |
| No relevant captured caret/reset/motion requests in reviewed frame/page ancestry | 86 | 2,358 | Browser-computed caret versus omitted candidate local-declaration observation stage. |
| Explicit motion declarations naming no direct caret or text-color target | 32 | 796 | Same observation-stage mismatch, with motion retained as a separately scoped concern. |
| Broad, color-dependent or unresolved chip/tab motion; overlay context; range input owners | 27 | 896 | Requires specific review; classification remains null. |

The two proposed attributions are `parity-harness-defect`, not equivalent-input
waivers. They explain why a browser-computed color and a missing local style are
not comparable evidence stages. They do **not** establish that missing candidate
values resolve correctly, that ancestry outside the captured surface is irrelevant,
or that visible caret rendering matches. All input/rendering equivalence,
candidate-computed, descendant-caret and renderer-cause flags remain false.

The 27 retained groups comprise ten chip/tab groups (362 observations), 13 overlay
groups (378 observations), and four range-control groups (156 observations).
The [fresh chip/tab context](material-caret-motion-context-survey.md) is separate
evidence; its new resolved motion values are not substituted into these original
declaration proofs. This work cannot close the reported empty-input caret bug.

## Exact original-source binding

`scripts/audit-material-owner-caret-attribution.mjs` pins the complete parent
survey to commit `280e86c013c7ba6ed0b3be58e3cd1a60ecadb0bb` and verifies every
parent source fingerprint. It extracts the unchanged production normalization
functions by AST and verifies their combined digest instead of implementing new
caret normalization.

The collector independently scans **all 2,311 original cases** and joins their
original scalar inputs to the 145 parent groups. The selected population is
exactly **1,734 cases**. For every selected observation it checks ordered parent
membership, scalar digest, raw reference caret and text colors, actual candidate
property absence, both full-tree digests, and the complete rederived original
caret/declaration/ancestry proof. Group counts and selected-case descriptors must
match the pinned parent. A mixed reviewed/pending population cannot be summarized
as a reviewed group.

`tests/material-parity/owner-caret-classification.mjs` consumes this proof and
requires exact scalar/proof receipts, valid measurement metadata, the reviewed
mapping, core inspection source/revision, all three candidate local stages, and
false equivalence/cause flags. It uses the existing conservative motion-target
reviewer. Explicit candidate caret/reset/motion values and broad, color-dependent,
partial or unresolved reference motion requests remain outside its scope.

Every observation retains original values, case and tree descriptors, proof
digest and either a complete proposed classification or an explicit null. No
first-witness extrapolation or maximum-12-case sample replaces full membership.

## Verification

```powershell
node scripts/audit-material-owner-caret-attribution.mjs
node scripts/audit-material-owner-caret-attribution.mjs --check
node scripts/check-material-owner-caret-attribution.mjs
```

All three commands finish with exit **0**. Generation and no-write replay verify
all three canonical audit files remain unchanged. The checker independently
replays the complete source-derived report, then exercises:

- **67 rejection controls**, including property/value changes, explicit candidate
  declarations in each local stage, reset/motion requests, missing provenance,
  altered mapping, unknown root context, color/caret/all transition targets,
  unresolved/empty motion, and unsupported equivalence claims. Semantic mutations
  rebind their in-memory digests so receipt failure cannot hide a permissive rule.
- **14 report-conservation controls** for removed/duplicated/reordered groups or
  observations, case substitution beyond the 12-case sample, changed raw values,
  input/tree/proof receipts, fabricated equivalence and pending-group classification.
- **Three positive controls**: the two distinct original attribution paths and a
  changed supported non-caret motion target whose changed proof digest remains
  visible. Original input/proof objects are not mutated.

Machine report SHA-256:
`059179651888872765ea0ee5fad708488d89b08e09d91641435915fa4a16b80d`.
Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `owner-caret-attribution-generation.log` and `owner-caret-attribution-check.log`:
  `125adf35628f6d5180bf8b46d3b42f874cb2d8e9df4c1be49f295958cf0aa8ad`.
- `owner-caret-attribution-controls.log`:
  `ee6b673692c96d7602c26f5289a94b8c52934cf29b92e77649e0e6e6d2f8906b`.

## Integration boundary and remaining work

This is a tested attribution candidate, **not production integration**. It is
not imported by the canonical audit builder and does not alter the existing
110-file full harness while that run is live. The canonical unresolved count
remains **2,278**. No renderer, plugin, reference, comparison input or threshold
changed.

Before integration, add the canonical source/coverage join and enforce exact
expected classifications independently of their presence in the output. Run
prior/current conservation for all original scalars and unrelated complete rows,
then regenerate and no-write replay the complete canonical audit. Keep the 27
specific-review groups and false equivalence claims intact. Register focused
coverage tests after the current harness finishes, and rerun the complete current
harness and enforced parity matrix before final acceptance.
