# Canonical source-inventory refresh after historical caret test corrections

The canonical audit has been regenerated after the historical integration-test
corrections, then independently regenerated in no-write mode. Both commands
finish with exit **1** solely because **2,160 unresolved discrepancy signatures**
remain. The no-write command reports no stale artifact, integrity, or source
binding error. This is a verified refresh, **not audit acceptance**.

## Exact commands

From `D:/dev/github/AstylarUI-material`, run the command below to generate; append
`--check` to run its complete independent no-write replay:

```powershell
node scripts/run-material-input-audit.mjs --parity-report=artifacts/material-parity/current-ancestry-audit/latest-report.json --normal-line-box-report=artifacts/material-parity/normal-line-box-current-ancestry-audit/latest-report.json --control-line-box-report=artifacts/material-parity/control-line-box-current-ancestry-audit-v3/latest-report.json --supplemental-line-box-report=artifacts/material-parity/supplemental-line-box-current-ancestry-audit/latest-report.json --supplemental-root=artifacts/material-parity/supplemental-current-ancestry-audit
```

Generation ran 2026-09-18 **12:32:10–12:55:26**; no-write replay ran
**13:00:21–13:23:14**, Africa/Johannesburg. Their terminal logs are respectively
`post-historical-caret-canonical-generation.log` and
`post-historical-caret-canonical-check.log` beneath
`artifacts/material-parity/field-host-flow-input-audit/`. Both log SHA-256 values
are `59cdaa0dfa05a4d885b5e4e67dbd61f995a119345e6aa2b9760bcd43d58168f8`.

Both retain **436/436 static cases**, **1,875/1,875 interaction cases**,
**8,339 discrepancy signatures**, **386,891 occurrences**, and **132 source
findings**. Input equivalence remains unestablished.

## Independent complete discrepancy-row conservation

A separate read-only comparison authenticates both gzip packages and decoded
payloads, extracts every complete discrepancy row, and requires exact equality
against the pre-refresh revision
`06e50dbcd3594c5987d63a4ec38e792b87b08dde`. It passes, exit **0**. This protects
classifications, authored examples, values, states, case memberships, counts and
evidence—not just the number of rows.

Reproduce with this JavaScript passed to `node --max-old-space-size=1024 --input-type=module`:

```javascript
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readCaretConservationRows } from './tests/material-parity/owner-caret-canonical-conservation.mjs';
const revision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const previous = await readCaretConservationRows(file => execFileSync('git',
  ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
assert.equal(previous.manifest.compressedSha256,
  '8e64c341ff24086dfdcdae4ca8324ad86a1f67348f35053d17252846249dad90');
const current = await readCaretConservationRows(file => readFileSync(file));
assert.deepEqual(current.rows, previous.rows);
assert.equal(current.rows.length, 8339);
assert.equal(current.rows.reduce((n, r) => n + r.occurrences, 0), 386891);
assert.equal(current.rows.filter(r => r.attribution === 'unresolved').length, 2160);
assert.equal(createHash('sha256').update(JSON.stringify(current.rows)).digest('hex'),
  'b8c3e1872dc2f4ac834405399d3b72798580fa65ad10895814ebcb2cce7f70ff');
```

The terminal conservation receipt is
`artifacts/material-parity/field-host-flow-input-audit/post-historical-caret-row-conservation.log`,
SHA-256 `22e9eb6d8b36aa62061947c546e6a8bfaa5c51282e3bdd73645c0214f0bb6b37`.
Its ordered complete-row digest is the assertion above. This does not claim
every non-discrepancy payload field is unchanged; the separately verified
full no-write replay covers freshness of the regenerated audit.

## Refreshed package and remaining work

The regenerated gzip is **53,080,022 bytes**, SHA-256
`a8768fcd795770e9d2ef228025d98691ae79d6d05c601e35cd86bce5920e8233`.
Decoded JSON is **1,966,939,725 bytes**, SHA-256
`be473c37f8a1b1453a4f76c8d43c0625fe95e752b1b16e318d7e4d935fa5ef3f`.
The human-readable canonical report is unchanged.

Standalone button paint, disabled slider, list/table font and plain-text font
findings are not silently promoted by this refresh. Their exact attribution
and conservation checks remain separate. The complete current unfiltered audit
harness, remaining discrepancy review and full enforced parity matrix remain
outstanding acceptance requirements.
