# Remaining caret-color inputs: complete original survey

The [machine survey](material-owner-caret-input-survey.json) reviews all **145**
unresolved `caretColor` groups in the saved canonical report at
`852a06d1c8958d926a4eb9a0977b7847a3b16140`. It reopens **1,734 original cases**
and their paired full trees, retaining **4,050 observations**. Every group's
original observation count agrees with its canonical count. This is a survey,
not a canonical classification change or proof of rendering equivalence.

## Observed populations

| Captured evidence | Groups | Observations | Next investigation |
| --- | ---: | ---: | --- |
| No relevant request in the reviewed captured frame/page ancestry | 86 | 2,358 | Bind exact original canonical membership before a bounded observation-stage attribution. |
| Explicit caret/reset/motion request requiring specific review | 42 | 1,158 | Review the retained original declarations and their scope; do not ignore motion based on a property name or equal text color. |
| Overlay root context outside the reviewed frame/page path | 13 | 378 | Reuse the existing original/fresh overlay-ancestry evidence without treating a capture root as a DOM root. |
| Input-control owners deliberately excluded from a non-editable-owner proof | 4 | 156 | Keep both range inputs' control/default behavior separate from ordinary text/container observations. |

Two of the overlay groups, covering **59** observations, additionally retain the
already demonstrated scalar/full-tree authored-rule gap. These overlap the
overlay row; they are not extra cases. The detailed reasons and original rule
text remain in the machine witnesses.

The 86-group population establishes only a captured observation boundary:
browser computed caret color versus omitted candidate local declarations. It
does not supply a candidate computed color, prove equal color inputs, validate
document-external inheritance or establish any descendant's visible caret.
All equivalence, candidate-computed, descendant-caret and renderer-cause flags
remain false. In particular, this cannot close the reported missing caret in
focused empty text inputs.

## Evidence and ownership

`tests/material-parity/owner-caret-input-evidence.mjs` reuses the existing
generated-owner and conservative selector proofs. It checks the complete
89-field reference scalar/node correspondence, all three candidate inspection
stages, scalar authored-rule consistency and the captured ancestor paths.
Unknown selectors remain possibly applicable. Explicit `caret*`, reset,
animation and transition declarations stay review cases, including declarations
with empty enumerated longhands. Full CSS rule text is retained for motion
witnesses; no new cascade or CSS shorthand resolver is introduced.

`scripts/audit-material-owner-caret-inputs.mjs` extracts the unchanged production
normalization functions rather than introducing a caret-specific comparison
rule. It authenticates the pinned canonical payload, original report and each
tree. Every observation retains its complete original scalar digest, paired
tree descriptors, raw values, reasons and proof digest; witnesses are examples,
not substitutes for the complete retained population. Source fingerprints make
the survey replayable. The original canonical row digest is retained, but count
agreement alone is not asserted to prove exact canonical membership.

The [existing overlay capture-root investigation](material-overlay-root-context-audit.md)
already demonstrates why captured null parents cannot establish absent
external inheritance or containing blocks. This survey leaves those boundaries
explicit instead of inventing ancestry from the AstylarUI tree.

The unchanged `caret-color-omission-sensitivity.spec.mjs` separately proves at
DPR 1 and 2 that equal text colors do not make explicit `caret-color:auto`
equivalent to omission under a changed ancestor caret color. That regression
continues to reject the old unsafe equivalence assumption. It is browser
computed-style evidence, not visible candidate-caret verification.

## Verification

```powershell
node scripts/audit-material-owner-caret-inputs.mjs
node scripts/audit-material-owner-caret-inputs.mjs --check
node --test tests/material-parity/owner-caret-input-evidence.spec.mjs
node --test tests/material-parity/caret-color-omission-sensitivity.spec.mjs
```

Generation and no-write replay exit **0** and verify that all three canonical
files are unchanged. The new tests pass **4/4**, exit **0**, with **24** altered
evidence controls and a complete no-write original-case replay,
**24,147.0381 ms**. The unchanged sensitivity suite passes **4/4**, exit **0**,
**4,366.99 ms**, including both browser DPR controls and the full historical
exposure index. Neither run has failures, skips, cancellations or todos.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `owner-caret-input-survey-reviewed.log`: SHA-256
  `98349f023654f4548bc464b867d65024bb991bec90078c57d9f1eb69cf35279b`.
- `owner-caret-existing-sensitivity.log`: SHA-256
  `4cae128541b186110a4646666025475e37dddfaca5571cb0bcdccc3b3f692fb8`.

No renderer, plugin, reference, canonical fixture or production audit classifier
changed. The saved report still has **2,330 unresolved groups**. Exact canonical
membership, bounded classification/coverage, original-data conservation, the
full current harness and enforced parity remain separate obligations.
