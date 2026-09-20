# Audit verification checkpoint — 2026-09-20

This supersedes live-process claims in the
[September 19 checkpoint](material-audit-verification-sep19.md). It is not audit
completion or a rendering-parity pass.

## Isolated alignment integration: bounded assertion diagnostics

Work on `codex/material-audit-alignment-integration` leaves the original live
171-file harness checkout unchanged. The pending 125-group integration has not
been promoted. `5ae0c5a` separately updates the guarded case-index refresh tool
to its authenticated pre-integration baseline.

The first dependent-receipt replay exposed excessive allocation while formatting
intentional large-object inequality failures. Its field-host test child reached
8,351 MiB working set; a concurrent `git diff --check` failed to allocate memory.
Both field-host tests eventually passed, but the rejection test took
114,412.1024ms. The broader replay was deliberately stopped after verifying its
parent/child commands; wrapper exit -1 is not a complete suite result.

The two conservation assertions now evaluate `isDeepStrictEqual` and assert its
boolean result with a bounded message instead of constructing the complete
multi-megabyte object diff. Both versions use strict deep equality. No compared
field, permitted receipt, historical anchor, mutation, or rejection was removed.

The corrected field-host file completed both tests within the subsequent batch;
the same 15 rejection controls took 1,345.6143ms. The gap conservation/rejection
subset separately passes **2/2**, exit 0, **3,882.3649ms**, including its 16
negative controls. The broader field-host-weight and write-prohibited producer
replays remain separate required verification, not implied by these results.
Syntax checks passed for all 19 currently changed/new JavaScript modules, and
`git diff --check` succeeded after memory pressure subsided.

Logs in the usual artifact directory:
`alignment-integration-dependent-receipts-after-sep20.log` (stopped),
`alignment-integration-dependent-receipts-bounded-sep20.log` (broader retry), and
`alignment-integration-gap-rejection-bounded-sep20.log` (terminal subset).
This is a test-diagnostic correction, not a renderer or comparison change.

## Cursor increment committed and pushed

`91b531474ca66e25473e3503e80b1bd542721b61` adds the
[public cursor reduction and source proof](material-public-cursor-defaults-audit.md)
on `codex/material-ui-showcase`; HEAD and the remote-tracking branch were checked
equal after push. It changes no renderer or canonical comparison inputs.

The reproduction retains valid failures: 36 pairs / 180 paired boundaries /
72 screenshots / 148 style-or-effective-cursor differences, zero runtime errors.
Its evidence/discovery tests pass 11/11, exit 0, 7,220.5192ms. The three previous
classification/source checkpoints remain intact; unresolved canonical groups
remain **1,960**.

## TTS enforced gate: completed, acceptance fails

`npm run tts-parity:check` completed its full declared matrix and failed the
unchanged acceptance assertion at `tests/tts-parity/run-tts-parity.mjs:119`.

| Measure | Result |
| --- | --- |
| Scenarios | 10; infrastructure complete |
| Accepted scenarios | 3/10 |
| Minimum SSIM | 0.9462212725690988 |
| Maximum geometry edge error | 2px |
| Visibility / scroll ownership / reachability / visible text | 10/10 each |
| Sharpness regions passing | 31/36 |
| Accepted interaction steps | 47/70 |
| Minimum interaction-local SSIM | 0.42963552267106425 |
| Static / interaction / overall acceptance | false / false / false |

Retained report: `artifacts/tts-parity/latest-report.json`, SHA-256
`60dc07bf13347189af0d2eb344e6124bc3cb5afd29474a1d2678dc5633696a31`.
Log: `complete-tts-parity-sep19.log`, SHA-256
`1c4113635c461812b0ccc1089b0211f8798ef0b93cc5ef4d65b61dae829f66d8`.
These are output-parity results, not evidence of complete input equivalence.

## Material enforced gate: interrupted by readiness failure

The subsequent unfiltered `npm run material-parity:check` returned exit 1.
The last announced case was `slide-toggle@dark/desktop`; `capturePage` at
`tests/material-parity/run-material-parity.mjs:298` timed out waiting 30 seconds
for `.frame` to become visible. That is a page-readiness failure, not a completed
Material matrix or a calibrated visual assertion. Its cause is not yet proven.
Do not treat any older `latest-report.json` as the completed result of this run.

Log: `complete-material-parity-sep19.log`, SHA-256
`2435b0e5e40743d052c89d6a3d7bb425db655d5e0d1aad7687ff22fe025714ae`.
The sequential wrapper's final status was `MATERIAL_ENFORCED_EXIT=1`, exit 1.

## Complete audit test suite: interrupted, not live

The September 19 170-file run has no terminal summary. Its last recorded result
is passing subtest 19, before the historical button-box integration test finished.
On September 20, its session handle was missing and the OS process inventory
contained neither the runner nor its child test process. It is therefore no
longer a live wait and cannot be reported as a pass. The interruption cause and
exit code were not recovered.

Retained log: `complete-audit-harness-sep19.log`, SHA-256
`af2fd7d50c614b76320bfc1c7551f6b80e21066cb425ee3d57449c737682a4d9`.
The updated discovery inventory contains **171 files**: 163 Material, four
general and four TTS; all 43 legacy test files remain included. A new complete
run must use that inventory, not pretend the interrupted 170-file run covered
the new cursor proof.

The cursor verifier had a separately isolated assertion-diff memory problem,
now corrected without changing its equality predicate. This does not establish
the cause of the full-suite interruption or browser readiness failures.

## Remaining verification and audit work

The complete general gate still needs an uninterrupted result. Its prior
focused lifecycle rerun completed and failed retained-texture-count assertions;
that failure remains open. The Material gate also needs a complete result.
Neither failure is waived, and no acceptance threshold or reference was changed.

Prepared alignment/font/text-alignment classifications still need their verified
canonical integration. Remaining differences and owner/state coverage are not
fully classified. The active audit goal is incomplete.

Unless otherwise specified, logs above are under
`artifacts/material-parity/field-host-flow-input-audit/`. Future retries must use
new log names and report their exact terminal results separately.

## Alignment integration: complete conservation, freshness running

The isolated integration worktree completed the three full canonical-row suites
on September 20: **3/3 pass**, exit 0, **1,673,119.289ms**, with zero failures,
skips, cancellations or TODOs. The exact suites are
`prepared-alignment-canonical-integration.spec.mjs`,
`followup-input-canonical-integration.spec.mjs`, and
`reviewed-input-canonical-integration.spec.mjs`.

They authenticate every byte of the generated payload and the corresponding
historical payloads, independently replay the 125-group alignment transition,
and compose the earlier 66- and 134-group reviews without dropping unrelated
rows. The full composition accounts for 325 groups / 12,836 observations and
preserves 8,014 other complete rows, whose ordered digest is
`8957656d3239c3000fa312a851d8ce9f536315eafbe25d2b02a6dd97bcb29ce4`.
Current count remains 8,339 groups / 386,891 observations, including 1,835
unresolved groups. These counts are not renderer bug counts or input equivalence.

Log: `alignment-full-canonical-conservation-current-sep20.log`. The generated
payload's compressed digest is
`c08d24e94671c18e0c640638ca234b9571720080474115cc2b8388a2883a810e`;
decoded digest is
`33ff5976cc035a770d96d2e9e4f408bb75284065950e01885187d2e921ede41c`.

After requiring this exact successful terminal TAP summary, the queued CLI
freshness job started at **19:04:09 Africa/Johannesburg**. It runs the actual
`scripts/run-material-input-audit.mjs --check` with all original main,
normal-line-box, control-line-box, supplemental-line-box and supplemental-root
inputs. Log: `alignment-canonical-cli-freshness-current-sep20.log`. Its terminal
result is pending; silence while the confirmed process runs is not failure.
Canonical inputs remain unchanged during this check.

The previous launch-time 171-file test inventory is historical. New standalone
authoring and motion proofs have expanded the inventory; the final complete
harness must discover all current files. Neither these three conservation
suites nor the new focused browser proofs replace the complete enforced parity
matrix. No renderer, plugin or canonical fixture behavior was changed.

## Freshness rejection and stable-dependency retry

The 19:04:09 canonical CLI run terminated with exit 1 and
`checked-in machine audit is stale`, before a successful full-object/Markdown
comparison. It is not accepted. During that run, the new shared-button proposal
briefly reused the historical button-paint script/report names. Pre-commit
review caught the collision; both historical files were restored in full and
compared against `547d349`. The new work has separate filenames. The earlier
continuous-input-freeze statement therefore does not hold for this run; the
collision is a plausible source of staleness, not a proven exact differing byte.

After confirmed termination, a read-only prefix check compared all **356**
recorded source fingerprints to current normalized source bytes: zero mismatches.
That is not a full payload/freshness check. A new actual canonical CLI `--check`
started at **19:36:49 Africa/Johannesburg**, with the same complete report inputs
and a 4GB heap. Log: `alignment-canonical-cli-freshness-restored-sep20.log`.
Keep those dependencies unchanged until its terminal result. The only expected
bounded result is a complete freshness match followed by the retained
1,835-unresolved error; do not accept any earlier assertion failure.

The historical/new button paint suites and inventory checks passed **13/13**
(200,078.7142ms), committed as `c7dddd1`. The separate inactive-base alpha review
passed **7/7** (11,029.3032ms), committed as `cb00ff4`. Both are pushed; neither
changes canonical classifications or renderer/comparison behavior. Current
unfiltered harness discovery contains **189 files**: 181 Material, four general,
four TTS. A complete current-inventory run and enforced matrix remain required.

## Stable-input canonical freshness completed

The 19:36:49 restored-dependency CLI retry has terminated. It passed the complete
fresh machine-payload and Markdown comparisons and returned exit **1** solely
for the expected **1,835 unresolved classifications**. There were no other
validation or source-binding errors. Coverage remains **436/436 static plus
1,875/1,875 interaction cases**, **8,339 groups / 386,891 observations**, with
**132 source findings**. The exact command and scope are recorded in
[alignment integration](material-alignment-integration.md).

Raw log SHA-256 for `alignment-canonical-cli-freshness-restored-sep20.log`:
`fc41880d698e9154041267d1dac8294546e425695f9c0b147c77b7dad45118ee`.
Combined with the independently source-replayed full-row conservation tests,
this clears the bounded 125-group integration for commit. It is not audit or
output-parity acceptance. The full matrix and unresolved inventory remain open.

The latest separate diagnostic commit `d9b374f` adds a real-browser chip-motion
counterexample and authenticates all 1,216 retained chip observations. Its six
focused/discovery checks pass; the sixteen chip groups remain unresolved rather
than being waived on the basis of 1ms durations. Inventory increased to 192
files after that commit; later additions must be included in the final discovery.
