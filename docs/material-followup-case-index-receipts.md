# Nine case-index receipts: verified read-only refresh rehearsal

The latest complete audit-builder run has nine failures at the old main-module
fingerprint guard. A new maintained refresh tool proves the bounded update and
replays the original case-index assertions **without changing the saved files**.
The refresh has not yet been applied; the broader canonical jobs are still
reading the current evidence.

## Exact boundary

The historical anchor is commit
`4947e2f93d03ac7f5e7a481c44ea9039831254c8`, the previous verified refresh of these
nine indexes. The tool authenticates that commit's main-module bytes against
the saved normalized SHA-256
`b6b4e62bab949ce5bc955a823225d93085accb67bb27f1c0f9d98796fb66ec73`.

For container caret, root height, field-host color, root color, root typography,
field-host alignment, field-host typography, non-widget appearance, and button
appearance indexes, **exactly one source fingerprint per complete JSON object**
may advance to the actual current main-module digest. Every other field must
equal the authenticated historical object. All other listed dependencies must
still match their recorded fingerprints. Unknown receipts, changed findings,
capture identities, case/group order, memberships and additional fields are
rejected. This is not a blanket exemption for an evolving module.

Current proposed digest:
`fe75275edf2b2181a93ebf0290d338f10a73a362ea0059ead51ca65be5fe97d8`.

## Replay before writing

The test first compares the AST-extracted bodies of all **11 original
case-index tests** with the historical commit and requires exact equality.
It then runs those tests unchanged, with only the nine authenticated proposed
JSON objects substituted at the filesystem-read boundary. All other reads use
the real files. Filesystem writes are prohibited. Byte hashes of the nine
indexes and all three canonical report files must remain unchanged afterward.

The original assertions after the formerly failing guards all pass: **11/11**,
exit 0, zero reported skips/failures/cancellations/TODOs, in **75,238.0554ms** on
the final rehearsal. This is evidence for the proposed receipts, **not a claim
that the saved indexes or full builder suite now pass**.

`--write` itself requires the four conservation/replay tests to pass before
writing. It re-collects and compares all dependencies after that replay, so an
intervening input change prevents writing. The writer-order test covers success,
failed membership replay, and changed dependencies; both failure paths perform
zero writes.

## Verification

```text
node scripts/refresh-material-case-index-receipts.mjs --plan
node --test --test-concurrency=1 tests/material-parity/case-index-receipt-conservation.spec.mjs tests/parity/material-audit-harness-inventory.spec.mjs
```

Final outer result: **8/8 pass**, exit 0, zero skips/failures/cancellations/TODOs,
in **82,949.2265ms**. This includes four evidence/writer/replay tests and four
inventory checks. Negative coverage includes 16 changed-evidence/dependency
cases, plus the two writer failure paths. The initial version without the
writer-order test also passed **7/7** in **83,509.6551ms**.

Logs under `artifacts/material-parity/field-host-flow-input-audit/`:

- `followup-nine-case-index-plan.log` — complete proposed receipt/digest list;
- `followup-nine-case-index-projection.log` — initial passing rehearsal;
- `followup-nine-case-index-projection-final.log` — final passing rehearsal.

No original tests, saved case indexes, authored fixtures, renderer code,
classification metadata, captures or thresholds were changed by this increment.
Harness discovery is now 156 files, retaining every legacy test.

## Next step, not yet executed

After the active canonical readers terminate, run:

```text
node scripts/refresh-material-case-index-receipts.mjs --write
node scripts/refresh-material-case-index-receipts.mjs --check
node --test --test-name-pattern="case index" tests/material-parity/input-equivalence-audit.spec.mjs
```

Inspect the nine one-fingerprint diffs and any dependent receipt changes. Run
the complete builder and, ultimately, the complete audit harness and enforced
parity matrix. Do not treat the rehearsal or a successful metadata write as
those broader gates.
