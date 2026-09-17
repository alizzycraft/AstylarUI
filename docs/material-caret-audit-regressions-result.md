# Caret integration: complete three-file regression result

The unchanged three-file regression command completed with **exit 1**:

```powershell
node --test --test-concurrency=1 tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/input-audit-cli-transport.spec.mjs tests/material-parity/input-audit-report-codec.spec.mjs
```

**395 tests: 386 pass / 9 fail**, zero skipped, cancelled, or todo tests;
**1,217,029.6417 ms**. The originating session confirmed terminal exit 1.
The live test dependencies were not edited during this run. Independent new
conservation files and documentation were added and separately verified.

Log: `artifacts/material-parity/field-host-flow-input-audit/caret-audit-regressions-restarted.log`.
SHA-256: `f8fd32b447518b1b00e09e5f53ed12499955543f1ec44c923b73977660ad921e`.
The interrupted earlier attempt is retained in
[the conservation report](material-caret-canonical-conservation.md).

All nine failures occur at the source-fingerprint assertion for
`tests/material-parity/input-equivalence-audit.mjs`: saved
`252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4`, actual
`b6b4e62bab949ce5bc955a823225d93085accb67bb27f1c0f9d98796fb66ec73`.

| Test | Affected case index |
| --- | --- |
| 363 | Container caret |
| 365 | Root height |
| 366 | Field-host color |
| 367 | Root color |
| 368 | Root typography |
| 369 | Field-host alignment |
| 376 | Field-host typography |
| 385 | Non-widget appearance |
| 389 | Button appearance |

These failures locate the first rejected assertion. They do not prove the
remaining assertions in those nine tests would pass, and they do not justify
blind replacement of saved hashes. Refreshes must preserve every non-provenance
field and pass the original complete case/membership checks after the guard.
The root-box and generated-mapping case indexes passed in this run.

The new complete-row conservation gate is independently tested and has its
expected red baseline against the old canonical report. This three-file result
is not a current 113-file harness run, a canonical regeneration, or enforced
rendering-parity acceptance. Those requirements and the broader audit remain
incomplete.
