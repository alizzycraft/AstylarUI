# Original caret motion declarations: bounded target review

The [machine report](material-owner-caret-motion-review.json) reviews all **42
motion-request groups / 1,158 observations / 822 distinct original cases** from
the [complete caret survey](material-owner-caret-input-survey.md). This is an
additional declaration review, not a canonical attribution change, computed
candidate-caret measurement or fix for the missing empty-input caret.

## Results

| Original captured declarations | Groups | Observations | Disposition |
| --- | ---: | ---: | --- |
| Named transition targets other than caret/color; animation names, when present, explicitly `none` | 32 | 796 | Captured declarations name no direct caret or text-color target. |
| Chip duration-only overrides without local target/name declarations | 4 | 152 | Requires cascade/context review; do not infer targets from duration or a nearby reset. |
| Tab-label `color` transitions | 4 | 140 | Remains relevant to automatic caret color; not treated as an unrelated motion target. |
| Tab-panel empty transition longhands | 2 | 70 | Original shorthand and pending substitution must remain explicit; do not reconstruct missing resolved values. |

The 32-group result allows only the first statement in the table. It does not
prove transitions are inactive, solve inherited caret color outside the captured
root, equate candidate computed values, or establish visible-caret rendering.
Transform, border, height, opacity and shadow motion can still affect geometry
or paint indirectly. No candidate omission is filled with the reference value.

In particular, **color is deliberately excluded from the unrelated-target
allowlist** because `caret-color:auto` may depend on it. The existing DPR 1/2
ancestor-color sensitivity proof remains applicable. Another rule requesting
`transition:none` does not by itself establish cascade precedence over a partial
or unresolved declaration.

## Source and population proof

`scripts/audit-material-caret-motion-requests.mjs` first compares the complete
parent object with the committed survey at
`280e86c013c7ba6ed0b3be58e3cd1a60ecadb0bb`, preserving its exact membership proof,
all original observations and every non-motion group. It checks every parent
source fingerprint and the original 2,311-case capture hash.

For each of the 1,158 selected observations it reopens both original full trees,
checks their file hashes and exact descriptors, authenticates the complete
scalar input, and replays `inspectOwnerCaretInput`. The complete resulting
declaration/ancestry proof must match that observation's original digest. This
is not an extrapolation from the parent survey's first witness. Raw caret and
text colors, actual absence of the candidate property, rule text, source owners,
original proof receipts and ordered cases remain in the new report.

The target reviewer accepts only explicitly enumerated, resolved motion
declarations with known non-caret/color targets or explicit animation name
`none`. It leaves unknown properties, reset/shorthand requests, empty or variable
values, missing target/name declarations, candidate requests and incomplete proof
as review cases. It does not implement a CSS cascade or a shorthand resolver.

## Verification

```powershell
node scripts/audit-material-caret-motion-requests.mjs
node scripts/audit-material-caret-motion-requests.mjs --check
```

Both commands finish with exit **0**, with **seven positive and 32 negative
controls** each. Controls include color/caret/all and mixed transition targets,
unknown or missing targets, named animations, missing animation names, shorthand
and reset additions, unresolved variables, empty values, altered source linkage,
candidate-side requests and fabricated equivalence/cause flags. All 1,158 full
original proof digests match. Hashes of all three canonical audit files remain
unchanged across each execution.

The generation and no-write logs are respectively
`artifacts/material-parity/field-host-flow-input-audit/owner-caret-motion-generation.log`
and `owner-caret-motion-check.log`; both have SHA-256
`2891514b20766c44dfbb799b3b8c6081cb154b7aefa50e02e324139d5ec90b0c`.
The machine report has SHA-256
`d96b428434f2e762e7931b9df6b651c38a809eb59077bc9ffa241c4b74d062f7`.

These standalone checks are not part of the already-running 110-file harness.
Production source binding, classification coverage, historical conservation and
the final complete harness/matrix remain separate work. The canonical audit
still has **2,278 unresolved groups**; this review does not decrease that count
or claim any renderer fix.

## Next steps

1. Bind the 86 original local-omission groups and these 32 bounded motion reviews
   to production attribution only with exact original membership and independent
   coverage validation. Keep raw values and false equivalence claims intact.
2. Review the ten retained chip/tab groups through their actual rule context.
   Reuse CSSOM capture evidence where applicable; fresh resolved measurements
   must not be substituted into the historical capture.
3. Treat the 13 overlay-context and four input-control groups from the parent
   survey separately. Do not infer missing document ancestry or range defaults
   from this non-editable-owner declaration review.
