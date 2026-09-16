# Shared-button box-sizing classification and coverage prerequisite

## Bounded finding

The new classifier explains **nine owner/property groups covering 600 original
observations** as computed-versus-local-declaration observation-stage differences.
The browser retains the explicit `.mdc-button { box-sizing: border-box }` rule;
the candidate's authored and three local style stages omit `boxSizing`.

This is not a computed default synthesized for AstylarUI. The independently
[source-bound evidence](material-button-box-sizing-source-binding.md) retains
**108 original static measured border boxes** and **492 interaction measurement
gaps**. A representative measurement applies only to its exact case. Neither
the same button in another state nor all members of a grouped row inherit a
geometry-equivalence claim from that measurement.

The independent reference-intrinsic/candidate-fixed width authoring finding is
retained. No full-layout, computed-candidate, interaction-geometry, whole-element
input, or rendering equivalence is claimed. This attribution belongs to the
audit's interpretation of style observation stages and core declared-size
consumption, not a request to restyle the showcase to match a scalar value.

## Guarded integration contract

`classifyButtonBoxSizingInput` accepts only the exact original `boxSizing`
signature, owner/input hash, source revision/stage identity, reference rule,
candidate omission, unchanged fixed width/padding/border data, and the appropriate
measured-static or unmeasured-interaction disposition. It returns
`reviewed-button-box-sizing-observation-stage` under `parity-harness-defect`.

This scalar guard is not a substitute for source validation. A production
consumer must use both:

1. `validateButtonBoxSizingInputs`: independently reopens the original capture
   and both complete source trees, validates owner inventory, declarations,
   scalar/stage joins and retained geometry, including negative-owner cases.
2. `validateButtonBoxSizingClassifications`: independently reopens the original
   scalar/geometry population and verifies all owner/state memberships, source
   hashes, measured boxes, gaps, grouping, attribution, justification and bounded
   review evidence against the classified rows.

Rows cannot escape the second check by changing their attribution to
`unresolved` or by retaining only the measured static population. Exact original
geometry is checked even when a forged positional shift preserves width/height.
The original measurement's truth and renderer causes still depend on the
separate recorded instrumentation/public proofs, not this ledger checker.

## Verification

```powershell
node --test --test-concurrency=1 tests/material-parity/button-box-sizing-classification.spec.mjs
```

Result: **3/3 pass**, zero failures, skips, cancellations or todos,
**14,951.7548ms**. The full test replays the complete source binding and all
**600 observations / nine groups**, preserving the **108/492** measured/gap
split. Scalar tests reject unrelated properties, invented defaults, modified
source declarations, detached stage hashes and inflated claims. A separate
three-case diagnostic corpus supplies **18 classified-row controls** and
**seven ledger controls**, all rejected, without replacing full-source coverage.

The diagnostic capture is retained under
`artifacts/material-parity/button-box-sizing-classification-control-*`.

## Status and remaining obligations

This is a standalone audit prerequisite. The canonical builder, classification
precedence, normalized scalar records, saved canonical report and unresolved
total are **unchanged**. Actual production integration still needs an
old-versus-new conservation proof, complete case coverage, source inventory
updates and a full no-write replay. Do not count these nine groups as resolved
in the canonical report until that integration is demonstrated.

The live harness launched at `14aa5b5` with 80 files remains independent. The
new binding and classification specs were added afterward; fresh discovery now
contains **82 files**: 74 Material, four general and four TTS, retaining all 43
legacy files. Their separate focused results must not be added to the live
run's totals. Final complete-harness and enforced comparison-matrix acceptance
remain required after the audit changes.

No renderer implementation, public plugin behavior, canonical comparison input,
reference truth, thresholds or existing harness dependencies were changed.
