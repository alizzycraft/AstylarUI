# Complete caret classification conservation gate

This audit-only gate protects the canonical integration of the reviewed
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
**2,278 to 2,160 unresolved signatures**. This transition has now passed the
complete discrepancy-row checker described below. All input-equivalence and rendering-equivalence
claims remain false in these bounded observation-stage reviews.

## Regenerated canonical discrepancy conservation (2026-09-18)

The production CLI regenerated the canonical manifest, lossless payload and
human report. Generation exited **1** solely because **2,160 resolved-style
differences still lack attribution**. Coverage remains **436/436 static** and
**1,875/1,875 interaction** cases, with **132 source findings**. The red audit
acceptance result is retained, not waived by successful serialization.

`node scripts/check-material-caret-canonical-conservation.mjs` then completed
with exit **0**, authenticating both complete compressed/decoded payloads and
the original-source caret coverage. It verified all **8,339 rows / 386,891
observations**, exactly **118 changed classification rows / 3,154 observations**,
and **8,221 complete unchanged rows**. The **27 pending groups / 896 observations**
remain unresolved and completely unchanged. The ordered unchanged-row digest
list has SHA-256
`7356e3ef683cc87f055fd48ece50b6bf9880a1b70c57c8ad0e643f23354ab977`.

The new payload is **53,080,014 compressed bytes**, SHA-256
`8e64c341ff24086dfdcdae4ca8324ad86a1f67348f35053d17252846249dad90`,
and **1,966,939,725 decoded bytes**, SHA-256
`27ce5b4e9821a22142188efd8eb2dd30003c51f5b4ad6a52b2999c2667de6a09`.
The checker confirms that none of the three canonical files changed during
its run. It compares complete discrepancy records, not the semantic content
of every other inspection ledger. The separate production CLI no-write replay
has also completed: its full decoded-value comparison and human-report check
pass before the expected red audit-acceptance result. Both generation and
no-write replay report only the 2,160 unresolved signatures, not stale data or
source-binding errors.

The exact production command, run once without and once with `--check`, is:

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit --check
```

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-canonical-generation.log`, SHA-256
  `59cdaa0dfa05a4d885b5e4e67dbd61f995a119345e6aa2b9760bcd43d58168f8`.
- `caret-canonical-no-write.log`, identical SHA-256
  `59cdaa0dfa05a4d885b5e4e67dbd61f995a119345e6aa2b9760bcd43d58168f8`.
- `caret-canonical-complete-conservation.log`, SHA-256
  `2afd3d236d51df78d0613dfea671793f733f48c8fdecc082588a6ec8c5f1f83e`.

The complete conservation/inventory unit command below was rerun before this
increment: **8/8 pass**, exit **0**, **1,503.4054 ms**. Log
`caret-canonical-commit-controls.log`, SHA-256
`0757210d7b34093e898260b498905cdf5da8ea2e20a3fd143084deec0aa006f1`.

The historical button-test failures have separately been reproduced and
explained without removing their original assertions; see
[the complete-row diagnostics](material-button-later-caret-conservation.md).
None of this establishes a full current harness pass, rendering equivalence,
or completion of the remaining audit classifications.

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

Before regeneration, the full checker exited **1**, at the expected independent source
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

The broader regression run and dependent receipt refreshes have separate
recorded results. The full discrepancy gate and production canonical no-write
comparison now pass, while strict audit acceptance remains red. Repair only
independently diagnosed historical test expectations. The complete current audit
harness, enforced parity matrix, remaining classifications, and overall audit
acceptance are still outstanding. See
[the preceding bounded integration](material-owner-caret-canonical-integration.md).
