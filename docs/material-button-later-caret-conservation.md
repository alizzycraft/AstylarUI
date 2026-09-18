# Historical button/authoring failures after caret attribution

This is audit instrumentation evidence, not a renderer or fixture correction.
The original historical tests remained unchanged in diagnostic commit `0d7e46c`.
The verified button-width and button-request corrections are recorded separately below.

## Original failure and retained assertions

The complete unfiltered command was:

```powershell
node --test --test-concurrency=1 tests/material-parity/button-fixed-width-canonical-integration.spec.mjs tests/material-parity/button-requests-canonical-integration.spec.mjs tests/material-parity/reviewed-authoring-canonical-integration.spec.mjs
```

It finished with **one pass / three failures**, exit **1**, in
**2,529,589.3692 ms**. Each positive integration failed its original complete
unrelated-row assertion. The reviewed-authoring detached/inflated-evidence
validation test passed in **1,861,903.5924 ms**. The long silent period was not
evidence of a stopped process: CPU continued advancing, and the test runner
delivered that file's buffered results on completion.

Baseline log: `artifacts/material-parity/field-host-flow-input-audit/caret-historical-button-authoring-before.log`.
SHA-256: `05bd118e2db1b5dd32324b26ed799bc3373eb7798da5f87f9a763af40f31f514`.

The diagnostic executes the exact original spec at `a6c98bd`. It inserts a
bounded comparison immediately before the original failing assertion; removing
the insertion reconstructs the original source. AST comparisons constrain
import relocation, and the original assertion remains in the executed test.
There is no replacement expected checksum and no blanket `caretColor` waiver.

## Independently authenticated cause of each failure

| Original integration | Cases | Ordered scalar rows | Changed classification rows | Reviewed caret observations | Complete unchanged unrelated rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| Button fixed width | 480 | 1,201 | 20 | 600 | 1,146 |
| Button requests | 1,087 | 2,938 | 20 | 283 | 2,829 |
| Reviewed authoring | 471 | 2,944 | 20 | 379 | 2,718 |

For each exact historical subset, the existing strict caret guard authenticates
the complete pinned original caret proof and source membership before it returns
any reviewed signatures. Every changed unrelated row must belong to that exact
signature set, and the number of changed rows must equal the set size. All raw
values, authored fields, counts, ordered scalar rows and remaining complete
records are conserved. Each subset contains zero pending caret observations.

The only changed fields are `justification`, `recommendedOwner`, `attribution`,
`reviewEvidence`, and `reviewedCases`. The changed rows move from `unresolved`
to `reviewed-motion-caret-observation-stage`. All equivalence and renderer-cause
claims remain false. This proves why these assertions failed; it does not prove
the original rendering correct or erase any reported Material symptom.

Complete unchanged-row array SHA-256 digests, in table order:

- `acf142b011155301b361b01109b4ed5164ada83bb1416eefdba6dcb47acf8101`
- `9b1d77e487e5931de72a353185df5fc8cb0097e2040260820147b4fed610c001`
- `090aefdd241706ba47e1242e915d799fc0046443828d7658e121fd8db23e3c1c`

## Executed diagnostics

```powershell
node scripts/diagnose-material-button-caret-conservation.mjs button-fixed-width
node scripts/diagnose-material-button-caret-conservation.mjs button-requests
node --test-name-pattern='^reviewed authoring production integration preserves' scripts/diagnose-material-button-caret-conservation.mjs reviewed-authoring
node --check scripts/diagnose-material-button-caret-conservation.mjs
node --test tests/material-parity/later-caret-integration-conservation.spec.mjs
```

Each diagnostic emits its successful source/row-conservation report and then
fails the retained original assertion: **zero pass / one failure**, exit **1**.
The diagnostic durations are **248,370.7205**, **339,892.4938**, and
**194,885.1409 ms**, respectively. The reviewed-authoring diagnostic deliberately
selects only the failing positive test; it is not a substitute for the complete
unfiltered validation run above or the required corrected replay.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-button-fixed-width-diagnostic.log`: SHA-256
  `ec708ede51b1d955d0f6de5b95e6f281b0f6448619941e4120ebb1a5892adfdb`.
- `caret-button-requests-diagnostic.log`: SHA-256
  `3b70a20519129ce336cc19b3a81806bc82771526bbaeeb06d04b1ebac3abb126`.
- `caret-reviewed-authoring-diagnostic.log`: SHA-256
  `c32beed3f8fa1deb022e8f64a6366b2deff8627cacb725c7125282368ef0d35c`.

Syntax validation exits **0**. The existing strict guard controls pass **3/3**,
exit **0**, **896.5686 ms**, retaining 18 mutation rejections and three
unauthenticated-source wrapper rejections. Log `caret-button-guard-controls.log`,
SHA-256 `0d27ae7947c321ac9354438b2480ee221351ffc6e7dc27c80ad6878be9b5f3e1`.

## Verified button-width integration (2026-09-18)

The corrected `button-fixed-width-canonical-integration.spec.mjs` has completed
its one unfiltered test successfully within the three-file command shown above:
**1 pass**, **842,739.2014 ms**. The runner has advanced to the next file; this
is a completed file result, not a claim that the combined command has finished.
Its live aggregate log is
`artifacts/material-parity/field-host-flow-input-audit/caret-historical-button-authoring-recheck.log`.
Do not treat a hash of that still-growing log as a final run receipt.

The correction authenticates exactly **20 later caret groups / 600 observations**,
requires zero pending caret observations in this historical subset, and rejects
overlap with the original width/box groups or later gap findings. It preserves
all **1,201 ordered scalar rows** and exact structural equality for all **1,146
remaining complete rows**. Their digest is unchanged from the diagnostic:
`acf142b011155301b361b01109b4ed5164ada83bb1416eefdba6dcb47acf8101`.
The original authoring, precedence, source-validation, human-report and
invalid-evidence assertions remain in place. Only authenticated later metadata
is separated from the historical unrelated-row comparison.

The strict helper controls were rerun with
`node --test tests/material-parity/later-caret-integration-conservation.spec.mjs`:
**3/3 pass**, exit **0**, **1,010.0761 ms**; no failures, skips, cancellations
or todos. Scoped diff review and `git diff --check` also pass.

This bounded correction is committed independently of the still-running button
requests and reviewed-authoring files. No canonical payload is regenerated yet;
source-inventory refresh is deferred until the remaining verified test changes
can be batched. No runtime or fixture fix is included.

## Verified button-request integration (2026-09-18)

The same unfiltered three-file command has now completed
`button-requests-canonical-integration.spec.mjs`: **1 pass**, **995,309.5196 ms**.
Its runner has advanced to reviewed-authoring, whose positive and negative tests
are not yet claimed to pass. The live aggregate log named above preserves the
completed result and its full diagnostic counts.

The correction independently authenticates **20 caret groups / 283 observations**,
requires zero pending caret observations in this subset, and rejects overlap
with the original formatting/width/box groups and later gaps. All **2,938 ordered
scalar rows** and **2,829 complete unrelated rows** remain unchanged, with digest
`9b1d77e487e5931de72a353185df5fc8cb0097e2040260820147b4fed610c001`.
All original source-validation and detached-evidence rejection assertions remain.
The test's existing structural comparison is retained; no expected checksum is
replaced and no whole-property exemption is introduced.

Scoped diff review and `git diff --check` pass. The strict helper has not changed
since its three passing controls recorded above. This is another audit-only
correction, not a rendering fix or complete harness acceptance.

## Next boundary

Finish the unfiltered reviewed-authoring replay, including the slow
detached/inflated-evidence test, before accepting its correction.
Require the same authenticated signatures, disjointness from original and
later-gap populations, and complete comparison of every other record. Preserve
all original authoring checks and negative controls.

Canonical conservation, the complete current harness, outstanding discrepancy
classifications and the enforced parity matrix remain separate acceptance work.
