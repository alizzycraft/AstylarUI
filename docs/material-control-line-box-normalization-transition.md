# Interactive line-box checkpoint normalization mismatch

## Observation

Regeneration on `38bbe09` using the existing v3 interactive line-box capture
rejected that report with `changed checkpoint typography`. Consequently all
671 requested interactive observations are missing in the generated audit,
including previously reviewed snackbar observations. This is not evidence that
the browser measurements disappeared or that the renderer changed.

The regenerated canonical files remain uncommitted pending this investigation
and complete row conservation. Their compressed SHA-256 is
`d4dc68ab9a12d9de733e2a3c9aa462724ed2bb013ec402f04f8ab9fa291b6d7c`;
the decoded payload SHA-256 is
`a69aaa74eaa8d18e7891f1db60dc4bcc63aa40edaf5ed28a73e6098d6ba6fee3`.
Independent streaming validation authenticated the entire payload and found
8,483 discrepancy groups / 389,202 occurrences, 1,833 unresolved groups, and
all 146 source-reviewed batch groups with no batch coverage errors. This is
not a complete old-to-new conservation proof or overall audit acceptance.

## Demonstrated first divergence

`validateControlLineBoxMeasurement` in
`tests/material-parity/control-line-box-validation.mjs` compares the exact
serialized checkpoint typography with the freshly derived target properties.
The captured checkpoint used rounded color normalization. The current target
uses the precise normalization introduced by `704b2eb`.

A source-bound reproduction for
`interaction:button@light/desktop-dpr1/disabled`, element `button-disabled`,
demonstrates:

- Captured reference color: `rgba(29,27,32,0.38)`.
- Current reference color: `rgba(28.999875,26.99991,31.99995,0.38)`.
- Candidate stage colors are unchanged for this reproduction.
- The other two measured controls in the same capture validate unchanged.
- The disabled control fails specifically at checkpoint typography equality.
- A diagnostic clone restoring only the historical reference color passes all
  remaining measurement checks. It is not admitted as live audit evidence.
- A zero-height measurement still fails, independently of that counterfactual.

The full-report reader accumulates observations locally and assigns them only
after complete validation. A single rejected measurement therefore leaves the
entire report unavailable. That fail-closed behavior must not be silently
relaxed to recover the previous count.

## Evidence and verification

Capture: `artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json`
with SHA-256
`9e689c9a5d828a16214abbe55804a6ff72037d300c7f26272123ae008d948d11`.
All capture-source hashes and the measurement algorithm source hash match the
recorded receipts. Target-selection and policy sources have changed, as the
reader already permits; their snapshots remain historical evidence.

Focused command:

```text
node --max-old-space-size=768 --test --test-concurrency=1 tests/material-parity/control-line-box-normalization-transition.spec.mjs
```

Result: 1/1 passed, no skips, 1,150.1678 ms total. The test authenticates the
report, selected evidence, checkpoint result, both original trees and fresh
reference tree; rebuilds current control targets from those trees; and calls
the production measurement validator. No production validator, capture,
renderer, plugin, or canonical fixture was changed.

## Classification and next required work

Confirmed harness/evidence-version mismatch; not a rendering diagnosis.
The sample proves the mechanism, not the complete affected population.

Before accepting these measurements again, inventory every checkpoint-property
transition and either recapture using the current target contract or implement
an independently tested, source-bound historical-to-current receipt migration.
A migration must authenticate both normalization implementations, original
inputs, exact owner/state membership, and unchanged physical measurements;
retain old and current values separately; reject all unrelated changes; and
never round the current audit values back to the historical values. Re-run the
full reader and canonical conservation afterward. Current canonical integration,
remaining attribution work and the enforced parity matrix are still pending.
