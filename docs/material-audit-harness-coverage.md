# Complete audit harness coverage

The explicit `parity:harness:check` package command currently lists 43 test
files: 36 Material files and seven general/TTS files. Source discovery finds
65 Material test files. Thus running only the package command omits **29**
Material audit test files and cannot establish complete audit-harness coverage.
This finding does not invalidate individual focused results already recorded.

The separate runner discovers every `.spec.mjs` recursively in `tests/parity`,
`tests/tts-parity` and `tests/material-parity`, including future nested files.
It requires every test named by the legacy command to remain in its inventory.
It does not replace or modify the package command, canonical comparisons or
renderer. Unexpected legacy command syntax is rejected rather than guessed.

```powershell
node scripts/run-material-audit-harness.mjs --list
node --test tests/parity/material-audit-harness-inventory.spec.mjs
node scripts/run-material-audit-harness.mjs
```

After adding its own inventory regression test, the runner lists **73 files**:
65 Material, four general parity and four TTS. It preserves all 43 legacy files
and adds the 29 omitted Material files plus its inventory test. The emitted JSON
contains every file and the exact Node arguments. Only `--list` is accepted as
a CLI option; filtering arguments are rejected. Files run sequentially to avoid
concurrent multi-gigabyte report replays, without changing test scope.

## Verification of the verifier

The first three unit checks passed (124.1591ms), but mocked child status alone
was insufficient proof. Adding a real failing child exposed a false-green
condition: Node inherited `NODE_TEST_CONTEXT`, warned that recursive test runs
skip their files, and returned 0 for a deliberately failing child. The expanded
test first produced **3 passes / 1 failure** (284.6473ms); repeating with child
output visible reproduced the skip warning and failure (284.3955ms).

The runner now removes only that inherited Node runner marker from a copied
environment. It does not change the caller's environment or filter tests. The
real-child controls now verify both successful and deliberately failing files.
Final focused result: **4/4 pass**, zero failures/skips/cancellations,
**558.9314ms**. Additional checks cover newly discovered nested tests, lost
legacy coverage, rejected CLI filters, complete argument forwarding, nonzero
child exits, spawn errors and signal termination.

This corrected a defect in the new audit runner; it is **not** evidence that
previous direct harness executions skipped their tests. No such retrospective
claim is made.

## Remaining acceptance

The 73-file full execution has not yet run. It must finish and its failures
must be investigated before claiming complete harness verification. Existing
source-fingerprint checks may expose stale audit evidence; do not weaken those
checks or substitute a partial run. Revalidate affected source projections
before updating their provenance.

Browser-based Angular diagnostic specs are separate from these Node harness
tests. The complete enforced Material comparison matrix also remains a separate
requirement. Neither listing 73 files nor passing the four runner tests proves
their outcomes or input equivalence.
