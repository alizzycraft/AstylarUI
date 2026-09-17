# Complete 110-file audit harness: retained failing result

The unfiltered command completed with **exit 1**:

```powershell
node scripts/run-material-audit-harness.mjs
```

The discovered inventory contained **110 files**: 102 Material, four general
parity and four TTS parity files, including all 43 files from the legacy command.
The runner executed files sequentially. Final TAP totals are **898 tests, 882
passed, 16 failed, zero cancelled, zero skipped, zero todo**; reported duration
is **10,290,968.2888 ms**. A crashed test-file entry is included in these TAP
totals; this is not a claim that every assertion within that file ran.

The original session returned exit 1 and both runner processes (27440 and 39168)
were absent afterward. No timeout or stale log was treated as completion. The
complete retained log is
`artifacts/material-parity/field-host-flow-input-audit/gap-review-full-110-harness.log`,
SHA-256 `db04c1432ac9575b105d59e7438dbdef6549a315cf1746d233c7c8a7ea680a55`.

## Failure inventory and evidence-backed next action

| TAP failure(s) | Scope | Current diagnosis / next action |
| --- | --- | --- |
| 13, 51 | Button fixed-width and button-request historical integration | Both corrected focused tests passed with all original controls. The request rerun first caught a copied population-count error; its subsequent complete run passed using the original independently verified 566 observations (not the width test's 1,200). Both guards authenticate exactly 18 later classifications before requiring complete equality elsewhere. See `material-button-fixed-width-audit.md`. |
| 80, 84, 97 | Field-host layout join, layout inputs, weight/tracking | Independent complete calculation replay isolates changed source receipts while preserving all non-receipt evidence. Refresh dependencies in order and rerun original tests. See `material-field-host-receipt-diagnostic.md`; the executable evidence is `scripts/diagnose-material-field-host-receipts.mjs`. |
| 659, 661, 662, 664 | Original overlay context and historical mapping | The stale mapping receipt interrupts both positive and negative paths. The single-field in-memory proposal permits complete original replay, but is not a production pass. Refresh the saved current-source metadata, retain historical provenance, and rerun all unchanged controls. See `material-overlay-mapping-receipt-diagnostic.md`. |
| File entry 71 | `owner-grid-initial-source-binding.spec.mjs` | Node exited 134 with a semi-space allocation failure. The unchanged isolated rerun passed all three tests (see below). The original resource-failure cause remains unproven; retain the failure and verify the file again in the next full run. |
| 716, 719, 720 | Owner initial-style mappings and membership | Both complete generators were independently replayed: 600 groups / 31,508 observations plus 636 preserved static observations, with unchanged non-receipt data. Refresh membership before mappings, then rerun the original tests. See `material-owner-initial-receipts-diagnostic.md`. |
| 735 | Remaining-overlay ancestry index | The test reports the old audit-module source fingerprint. Diagnose/replay the complete index after its membership/mapping dependencies are refreshed; do not assume all other evidence is unchanged. |
| 740 | Reviewed-authoring historical integration | An independent historical replay preserves all 2,944 scalar rows and identifies exactly 18 later source-bound gap classifications / 758 observations; the other 2,738 complete rows are unchanged. See `material-button-fixed-width-audit.md`. Correct only this authenticated boundary, retaining the original failing diagnostic, then rerun the full file. |
| 757 | Root initial-style evidence index | The test fails on the old audit-module fingerprint after checking complete root membership against the saved index. Verify all report content and refresh metadata only where justified; rerun the unchanged test and controls. |

The root initial-style source mismatch is recorded as current
`252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4`
versus saved
`c57c725b10a0b94bf9c21ccf85e3764f47bccd9d629d004010429fd239c820c1`.
The reviewed-authoring unrelated-row digests are current
`75643981d3b9bc43df97169b48ffb0a2384327f82f91ae6a4d0508bd892fef64`
versus prior
`bdeaf465e0d346e0f6a29d4d906af91ed80ab65c1d2f2fbd24218e212b449dc2`.
These are observed failures, not replacement expected values.

## Unchanged isolated grid source-binding rerun

After the full harness was confirmed terminal, run alone:

```powershell
node --test tests/material-parity/owner-grid-initial-source-binding.spec.mjs
```

The complete TAP log reports **3 tests, 3 passed, 0 failed**, no cancellations,
skips or todos, duration **216,424.1318 ms**. It includes full source binding,
caller-eligibility rejection and original-evidence mutation controls. The Node
processes are absent after the terminal TAP summary. The test and its dependencies
were unchanged; no higher memory limit or reduced case population was used.

Log: `artifacts/material-parity/field-host-flow-input-audit/owner-grid-source-binding-isolated.log`,
SHA-256 `846dad01b93a203398e6280da5967acbc08d8c764947711c86018950fe8fc501`.

This demonstrates that the earlier out-of-memory failure does not reproduce in
this isolated run. It does **not** establish contention as its cause or replace
the required next complete harness run. No test correction is justified by this
evidence alone.

## Scope and next gate

No existing harness dependencies were changed while this run was live. New
standalone audit checks developed alongside it are not included in the 110-file
inventory and must be registered and exercised by the next complete run.
The run was not filtered, restarted, or reinterpreted as green.

This is an audit-harness result, not the final enforced rendering-parity matrix.
The canonical input audit remains unchanged at 8,339 groups / 386,891
observations / 2,278 unresolved signatures. The new caret reviews are not yet
integrated. Resolve the evidenced harness defects without weakening assertions,
complete canonical integration/conservation and remaining attribution work, then
run the full current audit harness and complete enforced parity matrix.
