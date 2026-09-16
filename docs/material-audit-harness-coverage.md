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

The first 73-file full execution has now finished and failed, as recorded below.
Its failures must be investigated before claiming complete harness verification.
Do not weaken source-fingerprint checks or substitute a partial run. Revalidate
affected source projections before updating their provenance.

Browser-based Angular diagnostic specs are separate from these Node harness
tests. The complete enforced Material comparison matrix also remains a separate
requirement. Neither listing 73 files nor passing the four runner tests proves
their outcomes or input equivalence.

## First complete run failed

Command: `node scripts/run-material-audit-harness.mjs`.

The run launched with the 73-file inventory at `270cd55`. It finished with
**exit 1**, **796 reported tests: 777 pass / 19 fail**, no reported skips,
cancellations or todos, duration **2,936,241.3939ms**. A crashed test file does
not prove its individual assertions ran, regardless of the runner's zero skip
count. None of the 73 selected files or their consumed audit sources was changed
while the run was live. Later isolated new files were tested separately.

Log: `artifacts/material-parity/complete-audit-harness-width/test.log`.
SHA-256: `9b2746a0a637f56dccdd6824ffc8932ee4718a05e214f5095678b868bf9af181`.
The originating tool session confirmed terminal exit 1; the result is not
inferred from an observation timeout or missing status file.

### Assertion failures (15)

The following fourteen failures report stale saved source fingerprints or the
dependent no-write membership replay. This describes the observed assertion,
not proof that a blind fingerprint replacement is correct:

- 58: field host weight/tracking complete raw-source joins.
- 446: container caret case index.
- 448: root height case index.
- 449: field host color case index.
- 450: root color case index.
- 451: root typography case index.
- 452: field host alignment case index.
- 459: field host case index and fingerprint.
- 468: non-widget appearance case index.
- 472: button appearance case index.
- 635: owner mapping no-write replay.
- 638: owner membership report / retained reviewed observations.
- 639: owner membership no-write replay.
- 649: remaining overlay index provenance.

Most compare the saved main-audit fingerprint
`fb97f72a543cff1f6c4e1f163f8b92f98c7dbbacbaa4a37d0571432045201392`
with current
`889d722b6fdd90e67dcfcac83e420fc037a262404361d5dd25862c1cbd353d36`.
Failure 649 first reports the changed original-overlay-context helper. The
read-only provenance inventory also found a dependent field-host typography
report digest and root-initial main-spec digest requiring review. Preserve
unchanged case/property projections and validate any actual changed projections
before regenerating those fields.

The fifteenth assertion failure, **683**, is different: slider-border canonical
integration rejects its unrelated-record checksum at
`tests/material-parity/slider-border-canonical-integration.spec.mjs:73`:
expected `4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee`,
actual `d53a41fd653a5039de55762b4506de94d47f075087f0009fd6c516de800a21ef`.
Trace the changed records and attribution precedence; do not merely accept the
new checksum. No cause is asserted here beyond that exact observed mismatch.

### Test-process failures (4)

- `reviewed-authoring-canonical-integration.spec.mjs`: native exit 3221226505,
  560,793.0523ms; no individual result proving completion.
- `root-flow-height-source-binding.spec.mjs`: exit 134, 4,163.8551ms; native
  allocation/heap failure.
- `root-inherited-default-proof.spec.mjs`: exit 134, 1,533.5891ms; native
  allocation/heap failure.
- `root-initial-style-evidence.spec.mjs`: exit 134, 1,557.9598ms; explicitly logs
  `NewSpace::EnsureCurrentCapacity Allocation failed - JavaScript heap out of memory`.

During this interval the separately launched new grid source-binding test also
crashed natively, and a PowerShell read failed in the CLR. These observations
justify investigating process/resource pressure and report/assertion allocation;
they do not establish a single initiating cause. A later read-only system sample
had approximately 5.1GiB free physical memory and 11,890MiB pagefile usage, but
it was not sampled at the crash and must not be presented as its cause.

### Required recovery

1. Preserve this complete failed baseline. All original processes are terminal;
   do not continue polling their old handles or describe them as running.
2. Reproduce each affected report projection before updating provenance. Keep
   actual data changes distinct from source-only updates.
3. Investigate the slider checksum independently and retain its failing
   conservation assertion until the exact changed records are explained.
4. Diagnose the crashed test paths and rerun them in isolation with bounded
   diagnostics. Their prior focused passes do not replace this failed run.
5. Run the full current inventory after repairs/integration. Discovery now
   contains **77 files** (69 Material plus eight general/TTS): button-box source,
   owner-grid survey, owner-grid source binding and owner-grid classification
   were added after the 73-file launch. Do not retrofit their focused results
   into the old run's totals.
6. Complete the separate enforced Material comparison matrix; output-parity
   results remain distinct from the unresolved input-equivalence audit.
