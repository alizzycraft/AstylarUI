# Historical conservation after the 66-group follow-up

The six older production-integration checks for button box sizing, button fixed
width, button host requests, owner-grid defaults, explicit gaps and gap review
share `independentlyReconstructBeforeReviewedInputs`. That helper accounted for
the first 134 reviewed groups, but not the separately source-bound 66-group
follow-up now emitted by the working-tree builder. Their historical unrelated-row
checks therefore also need to account for that exact later population.

## Correction and safeguards

The shared helper now independently authenticates the follow-up capture and
source proofs, restores only its classification metadata to the matching
historical row, and then performs the existing 134-set reconstruction. Matching
requires exact family, element, property, values, occurrence count, cases and
states; all non-metadata fields must be deeply equal. The historical row must
still be unresolved. Missing, duplicate or changed source membership fails.

The original caller-facing `changes` list retains only the earlier population,
so the six historical tests keep their existing expected counts and unrelated
complete-row checks. Later changes are exposed separately as `followupChanges`.
Absent or self-consistent-but-unauthenticated follow-up evidence is rejected.
There is no property/family exemption and no replacement of historical digests.
Unrelated changes remain in the reconstructed rows for the original assertions
to detect.

This is a test-instrumentation correction. It neither classifies new inputs nor
changes the renderer, comparison fixtures, reference truth or canonical report.
The main builder and its current source-fingerprint list do not import or include
this historical-test helper; the in-flight canonical generation inputs remain
unchanged.

## Verified focused evidence

```text
node --test --test-concurrency=1 tests/material-parity/later-followup-input-conservation.spec.mjs tests/material-parity/later-reviewed-input-conservation.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Result: **13/13 pass**, exit **0**, zero skips/cancellations/TODOs, in
**326,285.831ms**. The new combined replay passes in **166,344.7619ms** and
authenticates both populations from the original capture and their source
collectors in a process where file writes are prohibited:

- Earlier: **134 groups / 3,325 observations**.
- Follow-up: **66 groups / 2,640 observations**.
- Combined: **200 groups / 5,965 observations**, restored without mutating inputs.

The suite retains the four existing reconstruction tests, adds five follow-up
tests and includes four harness-inventory checks. It covers 26 new changed-evidence
rejections, missing/unauthenticated binding rejection, an altered source projection,
and explicit preservation of an unrelated mutation. The existing 20 rejection
controls remain unchanged.

Log: `artifacts/material-parity/field-host-flow-input-audit/later-followup-conservation-focused.log`.
The complete harness now discovers **160 suites** (152 Material + four general +
four TTS), retaining all 43 legacy suites.

## Still required

These focused checks do not establish that all six actual historical
production-integration tests pass after the follow-up. Rerun those unchanged
tests and then the complete current harness. The canonical generator, subsequent
fresh CLI validation and full enforced rendering matrix remain separate gates.
Do not replace their terminal results with this synthetic-row/source replay.
