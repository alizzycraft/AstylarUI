import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { collectOwnerCaretInputs } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows, conserveOwnerCaretCanonicalRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

assert.equal(process.argv.length, 2);
const baselineRevision = '222ca7f54cb30ff9cd85f5607f57b8349a5686b5';
const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const before = canonicalFiles.map(file => hash(readFileSync(file)));
const evidence = collectOwnerCaretInputs(JSON.parse(readFileSync(parityPath)), { parityPath });
assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
assert.deepEqual([evidence.plannedCoverage.reviewedGroups, evidence.plannedCoverage.reviewedObservations,
  evidence.plannedCoverage.pendingGroups, evidence.plannedCoverage.pendingObservations], [118, 3154, 27, 896]);
const previous = await readCaretConservationRows(file => execFileSync('git', ['show', `${baselineRevision}:${file}`],
  { maxBuffer: 64 * 1024 * 1024 }));
assert.equal(previous.manifest.compressedSha256, '81e107a92e2d8544b8e4b09bc26178b35b304aee816e8ff6f65c8a58f8394fd3');
const current = await readCaretConservationRows(file => readFileSync(file));
const result = conserveOwnerCaretCanonicalRows(previous.rows, current.rows, evidence.plannedCoverage);
assert.deepEqual([result.scalarRows, result.observations, result.changedRows, result.changedObservations,
  result.unchangedCompleteRows, result.previousUnresolved, result.currentUnresolved], [8339, 386891, 118, 3154, 8221, 2278, 2160]);
assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before);
console.log(JSON.stringify({ kind: 'complete-caret-canonical-conservation', baselineRevision,
  previous: previous.manifest, current: current.manifest, sourceBinding: evidence.binding, ...result,
  canonicalUnchangedByCheck: true,
  limit: 'Complete discrepancy-row conservation with independent original-source coverage, not full audit-ledger or rendering acceptance.' }, null, 2));
