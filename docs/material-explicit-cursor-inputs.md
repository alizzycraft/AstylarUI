# Explicit cursor inputs: owner styles are not hit-target observations

The original capture contains **19 explicit cursor difference groups / 763
observations**, across 13 component families. Every one is joined to its exact
original scalar input and authenticated reference/candidate trees. The census
scans all **2,311 cases**; it separately retains counts of 881 equal cursor
scalars, 5,294 differences involving `auto`, and eight one-sided observations.
This is not a new canonical attribution or a renderer fix.

The [machine report](material-explicit-cursor-inputs.json) contains exact case,
element, values, input hashes, tree hashes, ancestry, declarations and source
fingerprints. Its 204 distinct proof patterns preserve all three candidate
inspection stages. Possible candidate rules are conservative candidates, not
a new cascade evaluator or a claim that a declaration won.

## Findings and ownership

| Population | Groups / observations | Evidence and next owning investigation |
| --- | ---: | --- |
| Candidate owner requests | 12 / 485 | Candidate button/checkbox rules request `pointer` while the corresponding reference owner computes `default` in these states. Review application state/selector intent; do not change core to override an explicitly authored cursor. |
| Candidate ancestor requests | 4 / 152 | Radio labels and disabled checkbox/slide-toggle labels have a candidate ancestor requesting `pointer`. Their candidate scalar is `pointer`, reference scalar `default`. Preserve the association and ancestor requests; independently prove inheritance and disabled hit exclusion before prescribing a core fix. |
| Slider visual | 1 / 70 | The native `mat-slider` host requests `pointer`; the candidate private range-visual owner has no captured cursor request and reports `default`. It is separate from the transparent native-input hit layers, which request `pointer`. This is unequal owner composition, not proof that the pointer over a handle is wrong. |
| Dialog action buttons | 2 / 56 | Candidate `button` owners report `pointer` without a captured own/ancestor request. Core type defaults independently specify `button.cursor = pointer`. This is a suspected core default-policy discrepancy, requiring an equal-input public button reduction before claiming the full cause. |

The last two populations must not be “fixed” by arbitrarily setting cursors on
the comparison. Preserve equivalent component ownership and investigate core
defaults/hit targeting at their respective boundaries.

### State dependence is material

Installed Angular Material `button.mjs` declares
`.mdc-button:hover{cursor:pointer}` and
`.mdc-button:disabled{cursor:default;pointer-events:none}`. Its unhovered button
can therefore compute `default` while its hovered button computes `pointer`.
The candidate `.material-button` declaration requests `pointer` unconditionally
(`astylar.component.ts:487`). This distinction explains why matching hover
cursors do not prove matching authored state behavior. It does not establish
the exact browser UA rule that supplies every unhovered value.

Source ownership witnesses are retained without inferring historical intent:

- The unconditional `.material-button` line is present in the initial showcase
  commit `2f440115740ff76fa9e55b3f4a11568207b2af5a`.
- Current `.radio-option` line provenance is
  `f3c8254c2aa63197c03e0fb2bd43cc98c0e57fed`; current checkbox owner line provenance
  is `f566f807a6c01bc68430fd3b2a82640e1eaffb47`. Line blame alone is not proof that
  those commits first added the cursor property or that it was compensatory.
- The core button default comes from
  `2c16e148c3f7870c9906ce2a024661b164886e46`, currently
  `src/app/config/browser-defaults.ts:319`. Cursor inheritance is handled in
  `src/app/services/dom/style.service.ts:513`, with type defaults distinguished
  from the global default. These are source traces, not a new runtime proof.

## Demonstrated harness coverage gap

`compareInteractionCursor` in `tests/material-parity/run-material-parity.mjs:777`
returns `{ matches: true }` without observing a cursor for every state except
`hover`. The actual hover probe samples one family-level target, not all mapped
owners. Consequently:

- The 763 owner differences include 40 finding rows carrying a passing
  case-level probe, but these are only 24 unique hover cases.
- These rows concern radio labels, slider visual, and secondary/disabled
  buttons. The family target's `pointer`/`pointer` result does not measure each
  label, sibling or visual owner. A disabled sibling cannot be waived by a
  successful hover over the primary button.
- Non-hover `matches: true` is an unmeasured state, not demonstrated cursor
  equivalence. The census names this field
  `caseLevelCursorProbeNotOwnerEvidence` to prevent accidental promotion.

Recommended instrumentation follow-up: declare owner-specific CSS-space
points, record the actual native hit element and candidate hit owner, and
capture disabled, label/icon, track/thumb, hover/held/release boundaries. Mark
unmeasured states explicitly. Do not alter reference cursor rules or normalize
`auto`, `default` and `pointer` into one value.

## Verification

```text
node scripts/audit-material-explicit-cursors.mjs
node --test --test-concurrency=1 tests/material-parity/explicit-cursor-inputs.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Final focused verification: **8/8**, exit **0**, no skips/cancellations/TODOs,
**9,293.8102ms**. Tests replay the complete original population, preserve the
coverage boundary, and reject twelve scalar/stage/identity/ancestry mutations.
The initial run was 7/8: one negative control assigned an already-empty rule
array to `[]`, making no mutation. It now injects a forged cursor rule; production
evidence and assertions were not loosened. Both logs are retained under
`artifacts/material-parity/field-host-flow-input-audit/` as
`explicit-cursor-verification-sep19.log` and
`explicit-cursor-verification-final-sep19.log`.

Full-current audit harness and enforced rendering acceptance remain separate
gates. Canonical unresolved count remains **1,960**. The audit is incomplete.
