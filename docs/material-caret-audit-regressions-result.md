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

## Nine case-index receipts refreshed after the failed baseline

Each of the nine affected JSON indexes now records the current audit-module
hash. A complete-object comparison against `e76192d` confirms exactly one
changed source fingerprint per file and no other changed value. Original
authored values, omissions, cases, groups, evidence, and classifications are
unchanged. The comparison also checks that the replacement hash matches the
actual normalized module bytes; it is not an arbitrary accepted value.

All original case-index tests were then executed unchanged:

```powershell
node --test --test-name-pattern='case index' tests/material-parity/input-equivalence-audit.spec.mjs
```

**11/11 pass**, exit **0**, **43,602.8545 ms**, no reported failures, skips,
cancellations or todos. This deliberately focused command selects the nine
previous failures plus the existing root-box and generated-mapping tests; it
does not claim to rerun the complete 395-test command. The assertions previously
unreachable after the stale-hash guard now pass, including full captured case
coverage, raw tree hashes, source mappings, observation membership, and explicit
limits on rendering claims. No original test assertion was edited.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-nine-case-index-conservation.log`, SHA-256
  `e34a4ec39ab0bcbed43511a502009689eeb5db915a5ddb3f57c838df2d95897c`.
- `caret-case-index-provenance-recheck.log`, SHA-256
  `734e0cd48718ef48b77c35cab5b337f9b0b643c650d111babb27866be6a676d2`.

The field-host typography index's updated receipt changes its file digest.
Dependent layout/initial-style reports still require their separately proven
provenance refresh, followed by unchanged focused tests. Immutable historical
caret proof parents and prior run records must remain intact.
