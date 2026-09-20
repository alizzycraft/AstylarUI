# Caret evidence under precise color normalization

## Result and scope

The current caret source collector now replays its historical evidence and then
revalidates each classification using the precision-preserving color normalizer.
It does not use the old rounded reference values in current audit contexts.

The original population remains **4,050 observations** across **1,734 selected
cases**. Exactly **92 observations in 10 groups** have changed normalized caret
color values. These match the complete scalar color-transition report's caret
population exactly; no new input was invented or substituted.

All original classifications were re-executed with current values and required
to match the saved classification, including its complete raw-input/tree proof:

| Disposition | Groups | Observations |
| --- | ---: | ---: |
| Reviewed observation-stage findings | 118 | 3,154 |
| Still pending | 27 | 896 |

The reviewed findings describe the harness comparing browser-computed caret
colors with omitted candidate local declarations. They do **not** prove equal
caret inputs, candidate computed colors, visible caret paint, or a renderer fix.
Pending slider, tooltip and other findings are not promoted.

## Evidence boundaries

- Historical parent: `280e86c013c7ba6ed0b3be58e3cd1a60ecadb0bb`, with its entire
  audit module authenticated as
  `252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4`.
- Historical seven-function normalization digest:
  `8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e`.
- Current seven-function normalization digest:
  `27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773`.
- Original attribution proof remains byte-identical to
  `0c96500aebc010f8ba1209f1dda46c83ea01549e`. Its source dependencies other than
  the separately versioned normalizer must still match their original hashes.
- Every current observation retains both `reference` and `historicalReference`.
  Current coverage is regrouped from complete original memberships, not by
  replacing a hash or filtering away observations that no longer join.
- Current and historical coverage are retained separately. The existing source
  verification command independently reconstructs current classification rows;
  the coverage command still reconstructs the historical rows independently.

The complete ordered transition digest, including case, family, element, old
value, new value, raw-input digest and proof digest, is
`7123fb547e3b2bb25c97e40b808c78449778b096edd8044edc941ac4fc9fc90f`.
Its exact before/after values and case memberships are already checked in under
the `caretColor` findings of `docs/material-color-normalization-transition.json`.

## Verification

```powershell
node --test --test-concurrency=1 tests/material-parity/caret-normalization-transition.spec.mjs tests/material-parity/owner-caret-proof-commands.spec.mjs
node --test --test-concurrency=1 tests/material-parity/gap-survey-source-replay.spec.mjs tests/material-parity/color-normalization-precision.spec.mjs
```

The first command's retained log is
`artifacts/material-parity/field-host-flow-input-audit/caret-normalization-transition-focused-sep20.log`.
Its terminal result is **6/6 passed**, zero failures/skips, in 273,681.3292 ms.
This includes the three new transition checks and all three existing complete
coverage, source-binding and subset-binding proof commands. The independent
gap/color regression run passed **8/8**, zero failures/skips, in 15,094.4685 ms.

The transition checks reject the old normalization descriptor against the live
module, compare every re-executed classification with the immutable proof,
reject using a rounded value with a precise current context, and exercise full
and 92-observation subset coverage. Missing observations remain explicit.

## Remaining work

No canonical audit payload has been regenerated, and no renderer, plugin or
comparison input has changed. Other color-dependent readers and historical
integration tests still need migration; this bounded verification does not
establish that the entire audit harness or enforced parity matrix passes.
