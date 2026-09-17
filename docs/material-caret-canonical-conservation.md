# Complete caret classification conservation gate

This audit-only gate protects the pending canonical integration of the reviewed
caret observation-stage findings. It does not establish equivalent inputs,
visible caret rendering, or a renderer fix. No renderer or comparison fixture
changes are included.

## Contract

`scripts/check-material-caret-canonical-conservation.mjs` replays the complete
original captured-source caret proof using the authenticated source collector.
Its expected population is **118 reviewed groups / 3,154 observations**, with
**27 pending groups / 896 observations** retained as unresolved. Expected rows
are not inferred from the current canonical classifications.

The historical canonical input is pinned to commit
`222ca7f54cb30ff9cd85f5607f57b8349a5686b5` and compressed SHA-256
`81e107a92e2d8544b8e4b09bc26178b35b304aee816e8ff6f65c8a58f8394fd3`.
The streaming reader checks both complete compressed and uncompressed payload
lengths and hashes, document/schema structure, and all ordered discrepancy rows.
It discards other large inspection ledgers while streaming; their semantic
conservation is not claimed by this checker.

For every discrepancy, all fields outside the six explicit classification
fields must remain deeply identical, including raw values, omitted candidate
properties, authored examples, state membership, counts, order, and any added
evidence fields. Complete unchanged rows are also compared, not merely their
selected properties. Previously classified rows cannot be replaced. Pending
caret rows cannot be silently promoted. Each changed row must exactly match the
independently authenticated attribution and reviewed-case population.

The expected full-report transition is **8,339 rows / 386,891 observations**,
with **118 changed classification rows / 8,221 complete unchanged rows** and
**2,278 to 2,160 unresolved signatures**. This is an expected transition, not a
completed regeneration result. All input-equivalence and rendering-equivalence
claims remain false in these bounded observation-stage reviews.

## Executed verification

```powershell
node --test --test-concurrency=1 tests/material-parity/owner-caret-canonical-conservation.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
node scripts/check-material-caret-canonical-conservation.mjs
node scripts/run-material-audit-harness.mjs --list
```

The focused tests pass **8/8**, exit **0**, **1,456.1926 ms**. They include
24 classification/raw-record mutation rejections, 14 receipt/document rejection
cases, positive full-row conservation and streaming-reader checks, and the four
existing harness-discovery tests. The synthetic fixture includes a reviewed
case beyond the canonical twelve-case sample. Before this final run, a test
fixture shared arrays between its before/after/expected populations; separating
the copies corrected that test defect without relaxing the production check.

Final focused log:
`artifacts/material-parity/field-host-flow-input-audit/caret-conservation-focused-final.log`
SHA-256: `dbc2169fc42b393c34b2a9703522d1a2a7935e3edc3e3b857b6e12f329b6d378`.

The full checker currently exits **1**, at the expected independent source
coverage assertion: the unchanged canonical report does not yet contain the
reviewed caret classifications. This red baseline is not successful full-report
conservation. Do not remove or relax the assertion to accept the old report.

Red-baseline log:
`artifacts/material-parity/field-host-flow-input-audit/caret-conservation-before-generation.log`
SHA-256: `4e006e2ab8e7f8eac796a33619f51159fc63f461b034ddf1c0544646cf3a1547`.

Discovery includes **113 files**: 105 Material, four general parity, and four
TTS; all 43 legacy entries remain. Discovery is not a complete harness run.

## Interrupted broader regression run

The first broader three-file run ended without a terminal TAP summary during
the host/runtime interruption. Its former session and Node processes were
confirmed absent before restarting the same command in a separate log:

```powershell
node --test --test-concurrency=1 tests/material-parity/input-equivalence-audit.spec.mjs tests/material-parity/input-audit-cli-transport.spec.mjs tests/material-parity/input-audit-report-codec.spec.mjs
```

Preserved initial log:
`artifacts/material-parity/field-host-flow-input-audit/caret-audit-regressions-initial.log`
SHA-256: `671b4f784621a58a2ed0e2636bc0762b6783e9943bcd8eb2090ac72e66940737`.
It ends after test 42, with no evidence of whole-command completion. The restart
uses `caret-audit-regressions-restarted.log`; that process was confirmed live
while preparing this increment. Neither an interrupted run nor an in-progress
run supplies a final pass/fail total.

## Remaining work

Finish the broader regression run, repair dependent evidence provenance only
after whole-evidence replay, and refresh the canonical report. Then execute
this full gate and the canonical no-write replay. The complete current audit
harness, enforced parity matrix, remaining classifications, and overall audit
acceptance are still outstanding. See
[the preceding bounded integration](material-owner-caret-canonical-integration.md).
