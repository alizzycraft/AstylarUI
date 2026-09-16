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

Current discovery after the standalone grid-coverage and button-width-history
tests contains **79 files** (71 Material plus eight general/TTS). Their focused
3/3 and 2/2 passes do not extend the earlier 73-file full result. The next full
run must include both new files as well as the four intervening additions.

The first 73-file full execution has now finished and failed, as recorded below.
Its failures must be investigated before claiming complete harness verification.
Do not weaken source-fingerprint checks or substitute a partial run. Revalidate
affected source projections before updating their provenance.

Browser-based Angular diagnostic specs are separate from these Node harness
tests. The complete enforced Material comparison matrix also remains a separate
requirement. Neither listing 73 files nor passing the four runner tests proves
their outcomes or input equivalence.

## First complete run failed

### Larger authoring crash isolated without changing the test

`node --test tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs`
completed with terminal exit **0**, **2/2 pass**, no skips or cancellations,
**890,317.2708ms**. Neither this test nor its consumed implementation was changed
during the isolated replay. The first test (137,746.9028ms) executes the actual
historical/current builders, conserves raw rows and unrelated classifications,
and verifies prior precedence plus later fixed-width coverage. The second
(750,126.3361ms) rejects detached evidence and inflated claims in both root-flow
and button-radius attribution.

The earlier native exit 3221226505 remains an unexplained failed full-run result.
The isolated pass does not identify its initiating cause or prove complete-suite
resource stability. Together with the smaller 15-test replay, all four formerly
crashed files now have terminal isolated results; the full current harness and
remaining stale evidence reports still require verification.

### Root-style provenance replay and isolated crash checks

The three smaller files that crashed in the full run were run in isolation:
`root-flow-height-source-binding.spec.mjs`, `root-inherited-default-proof.spec.mjs`
and `root-initial-style-evidence.spec.mjs`. The first isolated run completed
normally with **14 passes / 1 failure** (41,228.1457ms). The failure was stale
root-initial source provenance, reached after matching the complete original
30,043-observation index. No native allocation failure reproduced.

Only the main audit and its test's two fingerprints in
`material-root-initial-style-audit.json` were updated. An independent comparison
against `dafdfbf` verifies that every non-fingerprint field remains unchanged:
2,311 cases, 468 groups and 30,043 property observations. The complete JSON
projection excluding `sourceFingerprints` has SHA-256
`a43e00eeb2d4223a28b0b6feafd91776fca883ffea15ab135a4ac2954dd83286`.
Every current source fingerprint also independently matches its file.

The subsequent process's terminal output was lost. A process inventory confirmed
no test process remained, so the same complete three-file command was repeated
for reliable evidence:

```powershell
node --test --test-concurrency=1 tests/material-parity/root-inherited-default-proof.spec.mjs tests/material-parity/root-flow-height-source-binding.spec.mjs tests/material-parity/root-initial-style-evidence.spec.mjs
```

Result: terminal exit **0**, **15/15 pass**, no skips or cancellations,
**45,117.4033ms**. This includes the complete root-index replay, all 164 original
flow-height observations and 26 controls, exact scalar joins, and rejection of
forged evidence or broader equivalence claims. The causes of the earlier native
crashes remain unproven; this isolated result does not replace the failed full
run or prove resource stability of the complete suite. The larger reviewed-
authoring file still needs its isolated replay.

### Replayed owner-membership and field weight/tracking provenance

The four stale-provenance failures 58, 635, 638 and 639 were replayed before
their saved fingerprints were updated. The two original-source generators
`node scripts/audit-material-owner-initial-membership.mjs` and
`node scripts/audit-material-owner-initial-mappings.mjs` both exited 0.
They preserve 600 groups / 31,508 unresolved observations, 636 separately
reviewed static observations across 51 split groups, and 326 groups with complete
captured observation-stage mapping evidence. These are the historical survey's
counts, not new canonical resolutions.

Independent JSON comparisons with the preceding commit prove every field other
than `sourceFingerprints` unchanged. The SHA-256 values of those complete
non-fingerprint projections are:

- Membership: `e7b4cff4aa3cd86047654d19373d36137c97240086cfc5942eeaa13c5b08d320`.
- Mappings: `1789a08d0cadeff09a5ed25a24723daff4b53142a4f703bed4bcacc5896678c6`.
- Field weight/tracking: `76c82d3bcca1d4e8c0f24ae08dbcce04a32d619793f0ff3d81aeb7b64fb3e012`.

The field weight/tracking projection was independently rebuilt from the original
capture before its fingerprint update: all 577 cases / 1,154 proofs / 12 scalar
groups match the saved report. Its exact groups hash is
`f61b09390fefa65baf73b0a1ed38b3e11b03f99c9f6d98ef7d9a34bf33599cbe`.
Only the main-audit source fingerprints change in these three reports, plus the
mapping report's dependent membership-file fingerprint. No groups, case lists,
proofs, scalar values, classifications or equivalence flags change.

Verification command:

`node --test --test-concurrency=1 tests/material-parity/field-host-weight-tracking-evidence.spec.mjs tests/material-parity/owner-initial-style-membership.spec.mjs tests/material-parity/owner-initial-style-mappings.spec.mjs`

Result: **14/14 pass**, terminal exit 0, **184,678.2952ms**, no skipped,
cancelled or failed tests. This includes complete no-write generation checks
and the negative mapping/membership/provenance controls. It does not resolve
the other stale reports, allocation crashes or overall input-equivalence gaps.

### Subsequent slider checksum investigation

The isolated failing command
`node --test --test-name-pattern="preserves raw values" tests/material-parity/slider-border-canonical-integration.spec.mjs`
reproduced failure 683 with exit 1 (2,454.8862ms). The bound/unbound record
comparison identified the additional `slider-root / boxShadow` attribution
introduced by the independently verified root-shadow integration `3f7c94d`.
The prior historical guard from `04b7b4a` rolled back the 22 owner-stage
attributions but did not account for this later one-row/two-case finding.

The test now first verifies the exact shadow values (reference alpha 0.133;
candidate alpha 0.14), authoring-defect classification, both original case IDs,
two source-bound observations and false equivalence/paint claims. Only that
specific row joins the existing 22-row historical projection. All 220 projected
complete records then reproduce the **unchanged** original checksum
`4e1f09fc03af948aec7b2d1d927ee13c298b6439ceaa3bb0145a72122eb315ee`.
No captured values, normalizer, classification implementation or expected
historical hash changed. Five added negative controls reject missing/shortened
shadow evidence, dropped cases, changed values and fabricated equivalence.

`node --test tests/material-parity/slider-border-canonical-integration.spec.mjs`
now passes **3/3**, exit 0, **10,874.6678ms**. This resolves the isolated
conservation-test maintenance issue, not the slider rendering/interaction
defects or the failed full suite. The original 777/19 result below is retained.
The changed test is a canonical source fingerprint, so the canonical saved
report must be regenerated/rechecked after the pending audit integrations.

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
