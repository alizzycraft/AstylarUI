# Nine case-index receipts: guarded refresh applied

## 2026-09-20 tooling baseline update

The refresh tool now authenticates the accepted pre-alignment-integration
baseline `67db724e5f258c84cfdc70e9da2ccb6ee6353ad0`, whose main-module digest is
`1189df0c574dc9e8058cf7a61ceb0f0751e0df48dca67b796f12dadde3ec6e45`.
The previous `4947e2f` anchor correctly rejected these already-advanced receipts
as unknown when preparing the next integration. This updates only the exact
historical anchor and its digest, not the permitted receipt fields or checks.
Every complete report must still equal the authenticated baseline after its
single main-module receipt is restored, and all other dependencies must match.

Against the pending alignment integration, read-only `--plan` succeeds. The
three proposal/rejection/writer-order checks pass **3/3**, exit 0, in
**4,936.6731ms**. The guarded writer then passes its complete **4/4** suite,
including the unchanged eleven original case-index membership assertions, before
writing; verification output SHA-256 is
`f441c2d32ba128e25023b62fff9e536dd239fe3d841c72fa55a546170f55429a`.
The subsequent `--check` exits 0. Logs use the prefix
`alignment-integration-case-index-` under the existing artifact directory.
The tooling increment does not promote the pending main-builder or canonical
report changes and does not establish renderer parity.

## 2026-09-19 applied refresh

After the independent canonical freshness reader terminated, the guarded writer
was run against normalized main-module SHA-256
`1189df0c574dc9e8058cf7a61ceb0f0751e0df48dca67b796f12dadde3ec6e45`.
Its four conservation/writer/original-membership tests passed before writing,
then it rechecked the unchanged dependencies and wrote the nine indexes.
`--check` exits **0** against the saved files. The original case-index tests,
without substitution, pass **11/11**, exit **0**, zero skips/failures/
cancellations/TODOs, in **70,985.2673ms**.

Only each object's one main-module receipt changes. JSON serialization also
expands a few formerly compact arrays; complete-object conservation proves
their contents are unchanged. No capture or membership has been replaced.
The dependent field-host reports are being checked separately; the complete
builder and canonical regeneration are still required.

```text
node scripts/refresh-material-case-index-receipts.mjs --write
node scripts/refresh-material-case-index-receipts.mjs --check
node --test --test-name-pattern="case index" tests/material-parity/input-equivalence-audit.spec.mjs
```

Logs in the existing artifact directory: `followup-nine-case-index-write.log`,
`followup-nine-case-index-check.log`, and
`followup-nine-case-index-saved-tests.log`. The writer records its verification
output SHA-256 `231380abdfe9c148699576df0b5342843c18da94741fbc29964b70502e765abb`.

## Earlier read-only rehearsal

The latest complete audit-builder run has nine failures at the old main-module
fingerprint guard. A new maintained refresh tool proves the bounded update and
replays the original case-index assertions **without changing the saved files**.
At that earlier checkpoint the refresh had not been applied because broader
canonical jobs were reading the evidence. It is now applied as described above.

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

## Earlier next-step instructions (now executed above)

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
