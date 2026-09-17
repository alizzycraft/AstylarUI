# Remaining caret-color inputs: complete original survey

The [machine survey](material-owner-caret-input-survey.json) reviews all **145**
unresolved `caretColor` groups in the saved canonical report at
`852a06d1c8958d926a4eb9a0977b7847a3b16140`. It reopens **1,734 original cases**
and their paired full trees, retaining **4,050 observations**. Every group's
original observation count agrees with its canonical count. The separate
membership replay now verifies exact ordered original membership too. This is a survey,
not a canonical classification change or proof of rendering equivalence.

## Observed populations

| Captured evidence | Groups | Observations | Next investigation |
| --- | ---: | ---: | --- |
| No relevant request in the reviewed captured frame/page ancestry | 86 | 2,358 | Exact membership verified; bounded observation-stage attribution and production coverage remain pending. |
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

The subsequent [complete motion-target review](material-owner-caret-motion-review.md)
replays all 42 explicit-motion groups, including every original observation.
Thirty-two groups / 796 observations name no direct caret or text-color motion
target; ten chip/tab groups / 362 observations remain specific review cases.
This does not change the parent survey or canonical classifications and is not
a computed-candidate or visible-caret claim.

The [source-bound attribution candidate](material-owner-caret-attribution.md)
now replays all original observations and proposes observation-stage attribution
for the 86 no-request groups plus 32 narrowly reviewed motion groups. It retains
all 27 other groups explicitly, with 67 rejection and 14 conservation controls.
Canonical integration and candidate computed/visible-caret verification remain
separate work; the parent survey is unchanged.

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
the survey replayable. The original canonical row digest is retained; the
separate replay below establishes membership without relying on count agreement.

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

## Exact canonical membership replay

`tests/material-parity/owner-caret-canonical-membership.mjs` independently
enumerates the complete **2,311-case** original capture against the pinned
canonical rows. It checks every ordered observation, not just the canonical
12-case sample. All **145 groups / 4,050 observations / 1,734 selected cases**
agree with the survey. Each canonical row's complete digest, occurrence count,
ordered sample and state population is checked. Complete original scalar
digests, paired tree descriptors and raw caret/text-color values must also
agree. Literal `"<omitted>"` input is rejected rather than treated as absence.

The membership receipt is stored inside the existing machine survey. It records
per-group membership digests; the existing complete case/observation arrays
remain the evidence rather than being replaced by samples. Generation and the
test's no-write replay both exit **0** and confirm all three canonical files are
unchanged. The updated suite passes **5/5**, no failures, skips, cancellations or
todos, **24,757.9601 ms**, including the prior 24 controls and **17** membership
rejection controls. These include equal-count substitutions and reorderings
beyond the sample, changed raw values, duplicate owners/cases, altered tree
digests and a fabricated equivalence attribution.

The command remains `node --test tests/material-parity/owner-caret-input-evidence.spec.mjs`.
Its log is `artifacts/material-parity/field-host-flow-input-audit/owner-caret-membership-focused.log`,
SHA-256 `553b26c3be67a11cb3c7a0ba9cd2185b4d8cc3eb0b825c8c3271636c64a4dbfb`.
Complete-object comparison against `0b1d0dc` preserves every pre-existing field
except dependency receipts and the replaced membership limitation. The complete
145-group object digest remains
`26b5db8d0760ffd2dae208e1f421b9ebf873af99edcd5e8ffbb53f0ff9347502`;
the complete selected-case list digest remains
`70e01dddf4c332c6ac228016ea3d6ee859e6c3231704dd23cdf9ec655af106dd`.

No renderer, plugin, reference, canonical fixture or production audit classifier
changed. The saved report still has **2,330 unresolved groups**. Bounded
classification/coverage, full-corpus conservation, the full current harness and
enforced parity remain separate obligations. Membership verification is not
computed-value, structural, visible-caret or rendering equivalence.
