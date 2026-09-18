# Button-request historical conservation after reviewed metadata

The corrected production test is terminal: **1/1 pass**, exit 0, no failures,
skips, cancellations or TODOs. The existing selection, normalization, scalar,
prior-classification and full-row comparisons remain unchanged.

## Exact population

- Baseline `61659474f71dbf5eb02cae07243adb8fef8aec03`.
- 1,087 diagnostic cases and 283 source-bound shared-button owners.
- 71 original groups / 2,240 observations: 54 formatting/host groups, eight
  width groups and nine box-sizing groups; 24 scalar-matching core owners stay
  in the evidence.
- 18 later gap groups and 20 later caret groups / 283 observations retained.
- Exactly eight later state-layer preblend groups / **12 observations** checked
  by independent source replay. Their exact case identities are asserted:
  desktop-DPR1 hover, held and activation across light/dark/contrast/custom.
- All **2,938 scalar rows** are unchanged. The **2,829 other complete rows**
  still equal the historical output, with ordered digest
  `9b1d77e487e5931de72a353185df5fc8cb0097e2040260820147b4fed610c001`.

## Failure, correction and verification

The first attempt incorrectly reused the fixed-width test's 24-observation
expectation. This test's existing `selectStates` samples one viewport per
family/profile/state. A read-only replay of that actual selection function and
the source proposals established the twelve witnesses before changing the
assertion; the correction also added exact case-identity checks.

```text
node --test --test-concurrency=1 tests/material-parity/button-requests-canonical-integration.spec.mjs
```

The corrected test took **1,350,271.2733ms**; complete runner duration was
**1,353,460.008ms**. Logs under
`artifacts/material-parity/field-host-flow-input-audit/` retain the original
failure (`reviewed-input-button-historical-production.log`), independent
selection proof (`reviewed-input-button-request-subset.log`), and passing rerun
(`reviewed-input-button-requests-corrected-production.log`).

This verifies bounded audit-infrastructure conservation. It does not prove
renderer parity, input equivalence, the full current harness or the enforced
rendering matrix. Canonical classifications and the 2,026 unresolved count are
unchanged.
