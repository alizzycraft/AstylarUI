# Alignment integration — bounded verification complete

This work is isolated on `codex/material-audit-alignment-integration`, based on
`67db724`. The original 171-file harness stopped without completing. Corrected
canonical generation, all three full-row conservation checks and the stable-input
CLI freshness check now have terminal results. The 125-group canonical integration
is verified; the complete audit remains unfinished. Earlier checkpoints below
retain their original status and are superseded by the terminal results at the end.

## Intended bounded change

The main builder now collects the three already reviewed source adapters and
applies their classifications only after earlier attribution rules leave an
observation unresolved. It preserves exact original scalar membership, raw
values, state order and authored examples. Source and row validators run
independently. Missing binding, lost members and inflated equivalence claims
remain errors. The intended change is **125 groups / 6,871 observations**,
leaving **1,835** unresolved groups from the accepted **1,960** baseline.

Those counts are now verified by the terminal checks below. The separate
five-group review in `67db724` is not included in this integration; its overlay
context uncertainty remains explicit.

## Why lineage conservation is necessary

The vertical- and text-alignment surveys fingerprinted the whole audit module,
including its report orchestration. Their source observations depend on its
mapping functions, but not on later report-building classifications. Integrating
new classifications changes the module hash without necessarily changing any
captured input, mapping or observation. Simply replacing or ignoring that hash
would break the evidence chain.

`alignment-survey-conservation.mjs` instead authenticates the `67db724` survey
artifacts and source files. It checks:

- Every retained mapping/normalization statement is unchanged; only the six
  pre-existing orchestration functions and three exact named imports may differ.
  Retained statements cannot reference the changed functions.
- Each survey collector differs only by one exact import and a wrapper around
  its final object return. The entire parsed collector is compared after
  unwrapping that call. Observation-building logic cannot change.
- Every newly computed observation and all non-source metadata match the
  original snapshot exactly. Only source receipts with these demonstrated code
  projections can retain their historical values.

The collector returns the **historical snapshot after fresh replay**, not a
claim that historical source hashes describe current source bytes. Current code
has its own main-report fingerprints, including the conservation implementation
and tests. The pure verifier also returns old/current hashes and projection
results for inspection. There is no whole-property, family or data waiver.

## Worktree and transport distinctions

The isolated worktree uses directory junctions to the existing dependency and
artifact directories. Realpath containment continues to authenticate captured
files. The three adapters now record the requested logical artifact path rather
than serializing the resolved junction target outside the worktree; byte hashes
and containment checks are unchanged. This follows the existing follow-up
adapter convention and keeps evidence identifiers stable across checkouts.

Git initially checked out text files with CRLF. The LTR reference proof correctly
rejected the resulting raw script-byte mismatch: its captured source digest was
`914e119d39b358c2822577e8cba9c5f8a09d4293116a3f981aa8b0139fe990d4`,
while the CRLF checkout gave
`98c199346e883a4f70116c2ba5fb3421e211066c80d4dd6d5746664cd5185e25`.
Normalizing tracked text line endings to LF in this agent-owned worktree restores
the captured source bytes; neither the expected hash nor the browser evidence
was changed. No files in the original running worktree were reformatted.

## Verification so far

- Source projection/conservation tests: **4/4**, exit 0, **112,938.9647ms**,
  with 20 rejection controls. These test the instrumentation boundary, not the
  canonical promotion or renderer behavior.
- Main source inventory: **1/1**, exit 0, **4,386.3034ms**. All 346 previous
  fingerprints remain in order, with exactly ten new dependencies, giving 356.
- Selected projection and rejection checks across the three adapters, survey
  conservation and historical reconstruction: **11/11**, exit 0,
  **108,060.346ms**, no failures/cancellations/skips/TODOs. This is a named subset,
  not the complete adapter or builder suite.
- Harness discovery/runner checks: **4/4**, exit 0, **561.9644ms**. This worktree
  discovers **175 files** (167 Material, four general, four TTS), including both
  new alignment suites. The separate original run still covers its launch-time
  171 files, not this expanded inventory.
- First prepared full replay: failed with `ENOMEM` during filesystem resolution.
  A concurrent PowerShell diagnostic also failed in CLR memory handling.
  Neither is accepted evidence. After confirmed termination, the audit-owned
  general dev server was stopped to free memory. The original harness remains
  independently live.
- The next replay exposed the CRLF source mismatch described above. Direct
  alignment/font replay then exited 0. The full LF-normalized replay also exited
  0: 125 groups / 6,871 observations, 8,214 unchanged rows, and 1,835 projected
  unresolved groups. It did not modify canonical files.
- The original worktree's Material resume stopped on a 30-second `.frame`
  readiness timeout in `openInteractionPage` after announcing card
  `light/desktop-dpr1/activate-leave`. Its wrapper reports exit 1. This is an
  incomplete matrix, not a completed aggregate result. Memory pressure and that
  timeout occurred in the same interval, but a shared cause is not established.

All logs are retained under
`artifacts/material-parity/field-host-flow-input-audit/` with the
`alignment-integration-*` and `alignment-survey-conservation-*` prefixes.

The independent case-index `--plan` first failed on an unrecognized receipt:
the guarded refresh tool still anchored its accepted previous hash to `4947e2f`,
while the nine saved indexes already contained the verified `67db724` receipt.
The tool now anchors to that exact pre-integration commit and authenticates its
main-module digest (`1189df0c...6e45`). The unchanged complete-object and other-
dependency checks then pass in read-only plan mode. This does not authorize a
write until the original eleven membership assertions also pass. The original
historical proof remains in git; no observation or receipt is ignored.

The exact refresh-tool anchor update and its evidence are committed/pushed
separately as `5ae0c5a` on `codex/material-audit-alignment-integration`. The pending
main-module normalized digest is
`82854bccdaa6ff23fc5f9df987f6ec5cf3e22d0da5dbe64357109d5a03035f3b`.
The guarded writer passed its complete four-test suite, including unchanged
eleven-case-index membership assertions, and its subsequent `--check` exited 0.

Two independent dependent-receipt checks then failed on the old main-module
hash in the gap and field-host reports (2/2 failed, 1,526.9997ms; retained log
`alignment-integration-dependent-receipts-before-sep20.log`). The live first
canonical-generation process was deliberately stopped after verifying its exact
command identity; wrapper exit -1 is not a generation result. The canonical
manifest/payload remained at the accepted 1,960-group baseline.

All seven unchanged gap producers and three unchanged field-host producers
subsequently exited 0 in dependency order. The separately retained weight/tracking
report's sole main-module receipt was updated explicitly; its unchanged full
577-case / 1,154-observation proof has passed all five owning tests in the
broader replay. Including the nine indexes,
the current diff is 26 dependency receipts across 20 JSON reports, with no
other line changes. Complete-object conservation and write-prohibited producer
replay subsequently passed; the small diff alone was not used as proof.

The initial combined replay was stopped after large intentional inequality
diagnostics reached 8,351 MiB and a concurrent Git allocation failed. The two
conservation assertions now retain strict deep equality but produce bounded
messages; this separate instrumentation correction is committed/pushed as
`f842089`. See the [verification checkpoint](material-audit-verification-sep20.md)
for the unchanged 15/16 rejection controls and exact timing. The retry log is
`alignment-integration-dependent-receipts-bounded-sep20.log`: **10/10**, exit 0,
**285,591.5956ms**, no failures/cancellations/skips/TODOs. This includes all seven
unchanged gap producers replayed with writes prohibited, four-report field-host
conservation, and all five field-host weight/tracking tests.

The full `input-equivalence-audit.spec.mjs` suite completed with a 4GB heap:
**388/388 pass**, exit 0, **2,142,518.1307ms**, no failures, cancellations, skips
or TODOs. The conditional canonical generator has now started; it is not yet
accepted or complete. Logs are `alignment-integration-full-builder-sep20.log` and
`alignment-integration-canonical-generation-receipts-current-sep20.log`.
Do not count either as complete from the prerequisite receipt results.

## Remaining acceptance work

The full three-adapter suite now has a terminal result: **12/15 pass, 3 fail**,
exit 1, **271,281.599ms**, in
`alignment-integration-three-adapters-sep20.log`. All twelve source-replay,
membership, projection and transition checks passed. The three failures are
the saved pre-integration dry-run receipt assertions, which still compare their
historical adapter hash directly with the changed current adapter. Independent
`git show 67db724:<adapter>` checks reproduce each recorded hash exactly. The
pending adapter change is the previously described logical path serialization
for junction-backed artifacts; the historical receipts must not be rewritten.
The new `alignment-adapter-receipt-source.mjs` now authenticates each receipt
against its exact committed source bytes at `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0`.
It requires the entire current source to equal those historical bytes after
only the single logical-path serialization replacement (and checkout line-ending
normalization). It does not update the historical receipt or log. The guard's
two tests plus inventory checks pass **6/6**, in **577.1936ms**; 27 negative
executions reject changed receipt identity/hash, historical bytes, classification,
realpath validation, path operands and any extra source change. A separate
focused rerun of the three previously failing receipt tests passes **3/3**, in
**7,629.9972ms**. The complete adapter suite plus the new guard tests, recorded
in `alignment-adapters-historical-receipts-sep20.log`, has completed **17/17**, exit
0, **279,818.9231ms**, no failures, skips, cancellations or TODOs. This establishes
the adapter gate, not the pending canonical transition or whole audit completion.

Independent new evidence was committed/pushed as `29e70fa`: recovery of 59
bottom-sheet/snackbar alignment paths, with the scalar-rule capture gap and all
non-equivalence limits retained (8/8 focused/inventory checks). This does not
change the 125-group integration or its canonical target count. The subsequent
four-control self-alignment source audit is committed/pushed as `9042c8a`:
272 observations and four original authored formatting-context differences,
with initial-showcase historical witnesses. It is likewise separate from this
frozen integration's inputs and does not reduce the canonical unresolved count.

The receipt/path correction and its full 17-test proof are committed/pushed as
`7b8c249`. A separate source audit of 100 expansion-title/dialog-content owners
is committed/pushed as `7a4067b` (three flex-request property groups, 168 property
observations, 7/7 focused/inventory checks). Neither adds classifications to
this pending 125-group canonical integration. Current harness discovery has
179 suites, so the still-running original 171-suite run is not the final
current-inventory gate.

Run the actual full builder and its validators, regenerate the canonical files,
and verify their 125-group transition against the complete authenticated
pre-integration payload. The earlier 134- and 66-group tests now compose this
later transition rather than exempting changed rows. Historical subset tests
independently authenticate and reconstruct only these later metadata changes;
unrelated mutations remain visible. These changed tests still need terminal runs.

Finally run CLI `--check`, the full current harness and complete enforced parity
matrix. Preserve honest rendering failures and unresolved classifications. No
renderer, plugin or comparison behavior is changed by this work.

## Subsequent terminal failure and bounded recovery

The first canonical generation ended with exit 1: the earlier 134- and 66-group
source bindings were invalid, producing 2,035 unresolved groups instead of the
intended 1,835. Do not accept that candidate. Exact diagnostics, original-byte
restoration, the shared TypeScript package-boundary correction, and historical
font-snapshot conservation are recorded in
[checkout provenance](material-audit-checkout-provenance-sep20.md).

The complete overlay/source suites pass 14/14 after the correction. Both full
prior-binding suites subsequently pass 10/10 (145,102.8268ms); corrected canonical
generation has started but still needs terminal validation. The old 171-suite
harness is no longer running and did not finish. Current discovery has 182
suites; no full current-inventory gate is claimed.

## Corrected canonical generation: terminal result

The conserved-input retry completed on 2026-09-20 with exit **1**, reporting
only the expected **1,835 unresolved classifications**. It retained all
**8,339 groups / 386,891 observations**, **132 source findings**, and
**436/436 static plus 1,875/1,875 interaction cases**. Both earlier populations
are present again: 134 groups / 3,325 observations and 66 groups / 2,640
observations. The new 125-group / 6,871-observation population is also present.
There are no reported source-binding errors. This replaces the rejected
2,035-unresolved candidate; it does not establish full audit acceptance.

Current generated payload receipts:

- Compressed: 53,786,312 bytes,
  `c08d24e94671c18e0c640638ca234b9571720080474115cc2b8388a2883a810e`.
- Decoded: 1,993,322,418 bytes,
  `33ff5976cc035a770d96d2e9e4f408bb75284065950e01885187d2e921ede41c`.

The conditional verification job checked that the generator's only error was
the exact unresolved-count error before starting the three full-row suites:
`prepared-alignment-canonical-integration.spec.mjs`,
`followup-input-canonical-integration.spec.mjs`, and
`reviewed-input-canonical-integration.spec.mjs`. They are running sequentially
with a 4GB heap; log `alignment-full-canonical-conservation-current-sep20.log`
in the existing artifact directory. Their results and CLI freshness remain
pending. Renderer, plugin and comparison behavior have not changed.

## Full-row conservation: terminal result

All three suites completed with **3/3 pass**, exit 0, **1,673,119.289ms**, no
skips, cancellations or TODOs. The prepared transition verifies 125 groups /
6,871 observations and preserves all 8,214 other complete rows. The follow-up
suite independently composes the earlier 66 groups with that transition;
the reviewed-input suite composes all 134 + 66 + 125 groups (12,836 observations)
and preserves the remaining 8,014 complete rows. Their ordered digest is
`8957656d3239c3000fa312a851d8ce9f536315eafbe25d2b02a6dd97bcb29ce4`.
All checks authenticate the complete current and relevant frozen payload bytes.

The queued canonical CLI `--check` verified this exact terminal TAP result and
started at 19:04:09 local time on September 20. Its log is
`alignment-canonical-cli-freshness-current-sep20.log`. Inputs remain frozen while
it runs. Only a fresh full-object/Markdown match followed by the existing
1,835-unresolved error is the expected bounded result; it is not whole-audit
acceptance. The new standalone authoring/motion reviews do not reduce that count.

### Input-freeze interruption discovered during pre-commit review

The standalone shared-button proposal initially reused two historical filenames:
`scripts/audit-material-button-paint-attribution.mjs` and its JSON proposal. This
was caught before commit. The new work was moved to distinct names and both
historical files were restored in full from the committed source; independent
comparison against `547d349` passes. The existing canonical job is still live
and must not be restarted solely because it is quiet. However, the previous
continuous-input-freeze statement is no longer valid: after its terminal result,
run a fresh canonical CLI check against stable restored dependencies before
accepting this integration. Preserve the interrupted-freeze run as diagnostic
evidence, not the final freshness gate.

## Stable-input CLI freshness: terminal result

The restored-dependency retry completed on September 20 with exit **1**, and
its only error was the exact retained **1,835 unresolved classifications**.
The actual CLI compares the complete freshly built machine payload and Markdown
before printing coverage or validation errors. Both freshness assertions passed;
there were no source-binding, payload, Markdown or other validation failures.

It retained **436/436 static and 1,875/1,875 interaction cases**, **8,339 groups /
386,891 observations**, and **132 source findings**. Together with the three
terminal full-row conservation suites above, this accepts the bounded 125-group
classification integration. It does not accept the full audit or rendering parity.

Command:

```text
node --max-old-space-size=4096 scripts/run-material-input-audit.mjs --check --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
```

Log: `alignment-canonical-cli-freshness-restored-sep20.log` in the existing
artifact directory; raw log SHA-256
`fc41880d698e9154041267d1dac8294546e425695f9c0b147c77b7dad45118ee`.
The earlier stale run remains rejected. The new standalone 146-group batch is
still only a proposal; none of its groups is subtracted from 1,835. A complete
current-inventory harness and enforced parity matrix are still required.
