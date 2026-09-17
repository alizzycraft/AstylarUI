# Owner initial-style reports: source metadata failure isolated

## Verified refresh after caret integration

The original generators were rerun, each followed by its unchanged no-write
check, in dependency order:

```powershell
node scripts/audit-material-owner-initial-membership.mjs
node scripts/audit-material-owner-initial-membership.mjs --check
node scripts/audit-material-owner-initial-mappings.mjs
node scripts/audit-material-owner-initial-mappings.mjs --check
node --test --test-concurrency=1 tests/material-parity/owner-initial-style-membership.spec.mjs tests/material-parity/owner-initial-style-mappings.spec.mjs
```

All four generator/check commands exit **0**. The original focused suites pass
**9/9**, exit **0**, **102,695.1132 ms**, with no failed, cancelled, skipped or
todo tests. Complete reports still cover **600 groups / 31,508 observations**,
retaining **636 previously reviewed static observations** across **51 split
groups**. The mapping survey's 326 captured observation-stage groups are not
new claims of candidate computed-style or rendering equivalence.

Whole-object comparison against `0465940` verifies exactly three changed
receipts: the current audit-module hash in both reports, and the refreshed
membership report's hash in the mappings report. Every non-provenance field is
identical, including the two non-receipt digests in the historical table below.
Each replacement receipt was independently checked against actual current bytes.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `caret-owner-initial-refresh-generators.log`, SHA-256
  `0f8dc32f633ab9676dfb9ac07632d1e8afb1c439f15d12303682c1002c83be97`.
- `caret-owner-initial-receipt-conservation.log`, SHA-256
  `a22a62f8ff4677e23ae3210f6054fae3777ee1c1e406590b20a514c7e1b295d3`.
- `caret-owner-initial-refresh-focused.log`, SHA-256
  `ff65508a8e80a92c63450a1726de2e40acdc6e2fdd71d1d153d05a2e1c51bc47`.

The earlier stale-state diagnostic below is historical evidence, not an
acceptance command after refreshing its preconditions. Canonical regeneration,
remaining classifications, the complete current harness, and the enforced
rendering matrix remain outstanding.

## Earlier stale-receipt investigation

The unfiltered audit harness reports stale owner membership and mapping reports
(tests 716, 719 and 720). The read-only diagnostic
`scripts/diagnose-material-owner-initial-receipts.mjs` independently reruns both
complete original calculations. In each report, every field except the source
fingerprint list is identical to the saved report. Within that list, exactly one
fingerprint differs:

- File: `tests/material-parity/input-equivalence-audit.mjs`.
- Saved: `c57c725b10a0b94bf9c21ccf85e3764f47bccd9d629d004010429fd239c820c1`.
- Current: `252754869d5683cc76ba0784a96fc55d5c50aa8eeeb8a0441c131ec0a62eb6d4`.

This isolates stale current-source metadata, not changed observation evidence.
It does not repair the saved reports, pass the original checks, classify any new
canonical observation, or establish equivalent input or rendering.

## Complete replay, not a sampled comparison

Both calculations cover **600 groups / 31,508 unresolved observations**, retaining
**636 previously reviewed static observations** separately. The membership
calculation binds original cases to the pinned canonical baseline and original
capture. The mapping calculation reads the original paired trees, verifies each
tree digest, reruns the owner inspector for every wanted observation, and
compares the complete generated report with the saved report. Cases, order,
reasons, witnesses, proof digests, limits and attribution flags remain unchanged.

| Report | Original file SHA-256 | Complete object excluding sourceFingerprints SHA-256 |
| --- | --- | --- |
| `docs/material-owner-initial-style-membership.json` | `be948b9c544a241ef67550fe386fe99588b7a4256bf75db1b73b76ea49e3b586` | `e7b4cff4aa3cd86047654d19373d36137c97240086cfc5942eeaa13c5b08d320` |
| `docs/material-owner-initial-style-mappings.json` | `3c6964d637fbf065c6e77e8501389da597c73a9799931dad3bd9a8e59090f350` | `1789a08d0cadeff09a5ed25a24723daff4b53142a4f703bed4bcacc5896678c6` |

## Instrumentation boundary

The diagnostic parses each original generator with TypeScript and executes an
in-memory variant in a separate Node child, sequentially. It relocates relative
imports for evaluation and substitutes the final output-check/write branch with
complete evidence conservation assertions. It never executes a report write.

The second generator normally launches the first generator's `--check`, which
necessarily fails on the known stale metadata. In the diagnostic only, this
call is replaced with a saved-membership byte-digest check **after** the first
child has replayed its entire calculation successfully. The original generator
files remain unchanged. Reversing all recorded edits must reconstruct each
original generator exactly; all calculation statements outside these boundaries
are preserved. Saved report bytes are checked before and after each replay.

The original generator source digests are:

- Membership: `cf1e46ddc5c738b873d653b693131055c76086b4179a221d8dc20b00202f3269`.
- Mappings: `c085498187dd994eeb0754273382a487640d28f8b82046c5d805b5b5ff06f653`.

## Verification and next action

```powershell
node scripts/diagnose-material-owner-initial-receipts.mjs
```

Successful diagnostic completion emits two complete replay summaries and a final
`reports: 2` summary, then deliberately exits **1** because the original saved
report checks still fail. An assertion error is not successful completion.

The completed original diagnostic log is
`artifacts/material-parity/field-host-flow-input-audit/owner-initial-receipts-diagnostic.log`,
SHA-256 `c5dcbf3d016313cfea55b34343e4153b18d13576f400d20a8494713c6e1db0ab`.
An independent rerun in `owner-initial-receipts-diagnostic-recheck.log` completed
with exit 1 and the identical log digest. `node --check` and `git diff --check`
pass. The canonical audit's three tracked artifacts remain unchanged.

Keep these saved reports unchanged until the active unfiltered harness finishes.
Then regenerate membership first and mappings second. The mapping report's
receipt for membership will also change when that dependency is regenerated;
check the complete non-receipt object against the identities above, rather than
assuming only one receipt will change in the final dependency-ordered refresh.
Rerun the original tests and negative controls, followed by the current complete
audit harness. Preserve all historical capture/source receipts and all explicit
input/rendering limitations. No renderer or comparison input changes are part
of this diagnosis.
