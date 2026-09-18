# Follow-up canonical integration: verification in progress

Working-tree integration adds the independently source-bound follow-up adapter
after all prior classification rules. It can classify an observation only if
its earlier result is still unresolved. Raw values, omissions, group ordering,
authored examples and original case/state membership are not changed.

The report now exposes the follow-up source evidence and validates it by fresh
source replay before checking emitted memberships. The human-readable verdict
explicitly disclaims input equivalence, corrected expansion mapping, physical
font/rendering parity and renderer causality.

## Current verification state

**Latest 2026-09-19 checkpoint:** the corrected composed proof passes **3/3**,
exit **0**, in **837,623.9177ms**. All 200 reviewed groups / 5,965 observations
match independent source replay, every raw input is preserved, and the other
8,139 complete rows remain unchanged (ordered digest
`bb540087c97143a8448bdb9c57c5bfb79c8becdf2bbd9591a5cb66194c218c62`).
The earlier CLI freshness run finished with only the 1,960 unresolved-group
error, but its result predates the new source/receipt changes and is not a
freshness pass for the current working tree.

The source inventory now has 346 entries: all 308 original files plus exactly
38 enumerated additions. Its focused check passes **1/1**. Nine saved case
indexes pass their unchanged original tests **11/11**. Seven gap reports pass
receipt conservation and independent no-write replay **3/3**, in
**107,077.4588ms**. The dependent four field-host reports pass complete-object
conservation, original source/case proofs and inventory checks **19/19**, in
**362,887.7556ms**. These changes remain in the working tree pending the complete
builder and regenerated canonical freshness checks.

The first full builder retry terminated after two tests with Windows process
exit code **3221226505**, not an assertion, in **101,119.5692ms**. The command's
outer exit is **1**; its log is `followup-composed-full-builder.log`. Available
Application/System event-log checks did not establish the cause. No OOM cause
is claimed. After all other verification processes terminated, a lower-load
serial retry started at **00:27:55 Africa/Johannesburg**, session **20439**.
The unchanged full builder test file, without the explicit heap override, now
passes **388/388**, exit **0**, with zero failures, skips, cancellations or TODOs,
in **1,523,253.5638ms**. Its shell advanced to 4GB canonical generation at
**00:53:19**, process **9132**. That generation is now terminal, exit **1**,
with exactly one validation error: **1,960 unresolved groups**. Coverage remains
436/436 static and 1,875/1,875 interaction cases, with 8,339 groups / 386,891
observations and 132 source findings. The generated payload has 53,455,290
compressed bytes, SHA-256
`72b148d9be7f4aaf3bd5872faedad2273f408d2a5ef1c258f6944f60be5ffd07`,
and 1,979,347,068 decoded bytes, SHA-256
`ee6db8ce5777cd316d6266f435502a732761a7177c3d8a45b2e7d40d45642e6a`.
Logs are `followup-composed-full-builder-serial.log` and
`followup-composed-canonical-generation.log`. Fresh independent CLI `--check`
with the same five capture arguments started at **01:25:09** in session **86486**,
process **5604**, logging to `followup-composed-canonical-fresh-check.log`.
That check is not yet terminal. The 388-test pass is the full builder file,
not the complete audit harness or enforced parity matrix. Do not restart a live
reader or commit the pending canonical promotion as green.

The six unchanged historical production-integration suites started serially at
**01:34:52 Africa/Johannesburg**, session **66846**, parent node process **13004**,
with `--max-old-space-size=3072 --test --test-concurrency=1`: button box-sizing,
button fixed-width, button requests, owner grid initial values, explicit gap,
and gap review. Their log is `followup-six-historical-integrations.log`.
The first child is live; a completed source-helper test is not substituted for
these original production assertions, and no six-suite pass is claimed yet.

### Historical verification checkpoints

The remaining chronology records prior attempts, not the current process state.

**2026-09-19 checkpoint:** the sequential conservation run has terminated,
exit **1**, **one pass / one failure**. The composed test fed reconstructed
objects into the next byte-sensitive guard without preserving the frozen
serialization. Independent full-payload replay proves all 8,339 rows have
identical values and exactly 134 differ only in property order. The
[serialization-boundary correction](material-composed-canonical-serialization.md)
has six passing focused/inventory checks, but is not yet wired into the test
while the independent CLI freshness reader remains live. The original failure
and both expected digests are retained. Integration is not yet accepted.

**Subsequent checkpoint:** the first full-row conservation test has passed in
**656,066.6299ms**: exactly 66 changed groups / 2,640 observations, all raw input
fields preserved, and 8,273 other complete rows unchanged. Their ordered digest
is `c46a8886a4cb7d306fa879978581782a1ebe8a1224f1aeb2ddd6bac8608ffe1c`.
At that earlier checkpoint the composed 200-group test was still live; its
terminal failure and diagnosis are now recorded above. The independent CLI
freshness check remains live.

The [nine case-index receipt rehearsal](material-followup-case-index-receipts.md)
now passes eight focused/inventory checks, including an independently launched
11/11 replay of the original case-index assertions against only in-memory
proposed receipts. Saved indexes remain unchanged until current readers finish;
the original full-builder failures are not yet cleared.

**Latest result:** the 22:52 full builder run is terminal, exit **1**, with
**379 passed / nine failed / 388 total**, zero skips/cancellations/TODOs, in
**1,918,988.2402ms**. All nine failures compare the current normalized main-module
hash `fe75275edf2b2181a93ebf0290d338f10a73a362ea0059ead51ca65be5fe97d8`
against retained receipt hash
`b6b4e62bab949ce5bc955a823225d93085accb67bb27f1c0f9d98796fb66ec73`.
Affected case indexes are container caret, root height, field host color, root
color, root typography, field host alignment, field host, non-widget appearance,
and button appearance. Preserve their original captures and findings; replay or
authenticate the precise unchanged producer dependencies and prove receipt-only
conservation before claiming fresh evidence. Do not exempt whole-module hashes
or replace expected hashes without that proof. The log is
`followup-input-builder-gap-replayed.log` in the existing artifact log directory.

The independent 22:52 canonical generator (PID 588, session 38918) has now
terminated, exit **1**, solely for **1,960 unresolved groups**. Its output retains
436/436 static and 1,875/1,875 interaction captures, 8,339 difference groups,
386,891 observations and 132 source findings. This is not an acceptance pass.
The generated manifest now identifies 53,455,133 compressed bytes with SHA-256
`534dc2fdf8ffff34fe39695b2380350a950cb68e0ef322e6ce9d1459bcf5e127`,
and 1,979,346,771 decoded bytes with SHA-256
`d96841256135b67a5be85457dc0965aa198421196050d87835860c1cf2e92bdd`.

Full source-replayed conservation of the 66-group transition and composed
200-group transition has been launched sequentially in session 88257, logging
to `followup-input-canonical-full-conservation.log`. The independent full CLI
`--check` is running in session 40782, logging to
`followup-input-canonical-check.log`. Neither has a verified result yet. The following paragraphs
retain the chronological earlier attempts and must not be read as current passes.

Syntax checks and `git diff --check` passed. The full audit-builder test file
and canonical generation were launched on 2026-09-18 at approximately 22:13
Africa/Johannesburg. The first generation terminated with exit 1 after reaching
the explicitly imposed 1,536MB Node heap limit; the old canonical manifest
remains unchanged. After confirming terminal process/session state and checking
available memory, generation was retried with 4,096MB. Both live processes were
then deliberately stopped after source review found missing follow-up
fingerprints; this was not a timeout/restart or a passing result. All 36 missing
follow-up dependencies are now fingerprinted. The prior count assertion was
also stale (260 versus the committed source's actual 308); AST-based baseline
comparison proves all 308 original entries remain in order and exactly the
36 intended files are added, each with its current hash. The corrected focused
fingerprint test passes **1/1**, exit 0, **3,325.1412ms**. Its initial stale-count
failure is retained in the log.

The full builder suite and 4GB canonical generation were restarted against
the corrected 344-file source set. Both subsequently reported stale producer
fingerprints in the existing gap reports and were deliberately stopped on
2026-09-18 after their live process identities were verified. Neither run is a
pass. The logs retain the actual hash assertion failures. The seven unchanged
gap generators were replayed unchanged in dependency order, following the prior
verified integration procedure. Existing receipt-conservation tests pass
**7/7**, exit 0, in **185,096.4796ms**, including write-prohibited fresh replay.
Only eleven current dependency hashes advance; every other report field,
including original observations, normalizers, findings and memberships, remains
identical. No hash exemption or historical capture rewrite was introduced.

The [historical overlay projection](material-followup-overlay-mapping-projection.md)
also now recognizes the two exact follow-up classifier imports while retaining
all other statement equality and original source/observation checks. Its full
focused file passes **8/8**, exit 0, in **120,629.7274ms**. The failed pre-correction
test is retained. New alias/default/duplicate/import-member and mapping-link
rejection controls accompany this bounded instrumentation correction.

After these checks, canonical generation (4GB heap) and the full builder suite
were launched again at 22:52 Africa/Johannesburg. They are live and unverified;
do not claim canonical promotion or restart them merely for an observation timeout.

```text
node --test --test-concurrency=1 tests/material-parity/input-equivalence-audit.spec.mjs
node --max-old-space-size=4096 scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
```

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:
`followup-input-builder-focused.log`,
`followup-input-canonical-generation.log` (terminal heap-limit failure), and
`followup-input-canonical-generation-4gb.log` (deliberately stopped before
fingerprint correction). The stopped receipt-failure runs are
`followup-input-builder-fingerprint-complete.log` and
`followup-input-canonical-generation-fingerprinted.log`.
Current runs: `followup-input-builder-gap-replayed.log` and
`followup-input-canonical-generation-gap-replayed.log`.
Receipt verification: `followup-input-gap-receipts-focused.log`.
Fingerprint-test logs: `followup-input-fingerprint-focused.log` (initial stale
count failure) and `followup-input-fingerprint-corrected.log` (1/1 pass).

The new `followup-input-canonical-integration.spec.mjs` is prepared but has not
run: it requires terminal generation first and independently replays the four
full source/canonical joins before comparing every current row with the exact
66-group / 2,640-observation transition and conserving 8,273 other complete rows.

The existing seven-set canonical conservation test is also extended, without
removing its 134-group / 3,325-observation proof, to apply the independently
replayed four-set transition afterward. Its final target is 200 changed groups /
5,965 observations and 8,139 completely unchanged rows relative to the earlier
baseline. This extended test has not run. Both tests continue to require all
8,339 rows / 386,891 raw observations to survive.

After generation, run those tests and the canonical CLI `--check` before
committing promotion. Both conservation tests and their proof descriptions are
now included in the corrected generation's source set. Freshness must still be
checked; do not suppress a changed source fingerprint.

Historical subset conservation tests will also need to account for the exact
new source-bound population while retaining their original assertions. Full
current-harness verification and the complete enforced parity matrix remain
outstanding. No canonical count reduction is accepted yet: **2,026 unresolved**
is the last verified count; **1,960** is the verified dry-run target.
