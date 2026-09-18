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
