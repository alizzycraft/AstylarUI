import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { queryFindings, loadFindingEvidence } from './audit-findings-store.mjs';
import { collectOwnerInitialMotion } from './audit-material-owner-initial-motion.mjs';
import { restoreNativeCheckableProducer, restoreNativeCheckablePolicy } from '../tests/material-parity/native-checkable-registration.mjs';

// Reuse the previous publication's complete-row reconciliation, with this
// batch's two additional, explicitly checked policy/count changes.
const hash = value => createHash('sha256').update(value).digest('hex');
const leavesFile = 'artifacts/material-parity/native-checkable-receipt-leaf-comparison-20261021.log';
const bytes = fs.readFileSync(leavesFile), r = JSON.parse(bytes);
assert.equal(r.changes.length, 149);
const old = 'cca481561332a3ae872d49318014f5c4faa0e37cf6f03503e4a7c85024e5c284';
const fresh = '74c966fc3c3a178b0b64436026fa658e052bdaf021f2951c15558ceba0fbba9b';
const source = fs.readFileSync('tests/material-parity/input-equivalence-audit.mjs');
assert.equal(hash(source.toString().replaceAll('\r\n', '\n')), fresh);
assert.equal(hash(restoreNativeCheckableProducer(source)), old);
const direct = r.changes.filter(c => c.path[0] !== 'coverage' &&
  ['currentModuleSha256', 'current', 'currentSha256'].includes(c.path.at(-1)));
assert.equal(direct.length, 98);
for (const c of direct) { assert.equal(c.before, old); assert.equal(c.after, fresh); }
const policyChange = r.changes.filter(c => c.path[0] === 'coverage');
assert.equal(policyChange.length, 1);
assert.deepEqual(policyChange[0].path, ['coverage', 'inspectionEvidence', 'sourceApplicability', 'transitions', 0, 'currentSha256']);
const policy = fs.readFileSync('tests/material-parity/input-equivalence-policy.mjs');
assert.equal(hash(policy.toString().replaceAll('\r\n', '\n')), policyChange[0].after);
assert.equal(hash(restoreNativeCheckablePolicy(policy)), policyChange[0].before);
assert.deepEqual(r.changes.filter(c => c.path[0] === 'summary'),
  [{ path: ['summary', 'sourceFindings'], before: 171, after: 173 }]);
const selected = r.changes.filter(c => c.path[0] === 'controlTypography');
const ordinals = new Set(selected.map(c => c.path[2]));
const destination = 'artifacts/material-parity/working-audit/candidate-validation';
const snapshot = JSON.parse(fs.readFileSync(destination + '/current.json'));
assert.equal(snapshot.generation, r.current.compressedSha256);
const rows = queryFindings(destination, 'button', snapshot).filter(x =>
  x.evidence.section === 'controlTypography.differences' && ordinals.has(x.evidence.ordinal));
assert.equal(rows.length, 48);
const actual = await loadFindingEvidence(destination, 'button', rows.map(x => x.id), snapshot);
const replacements = new Map();
for (const value of actual) {
  const previous = structuredClone(value);
  assert.equal(previous.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256, fresh);
  previous.reviewEvidence.observation.normalizationReconciliation.currentModuleSha256 = old;
  replacements.set(hash(JSON.stringify(previous)), hash(JSON.stringify(value)));
}
const derived = r.changes.filter(c => c.path.at(-1) === 'controlProofSha256');
assert.equal(derived.length, 48);
for (const c of derived) assert.equal(replacements.get(c.before), c.after);
const motion = collectOwnerInitialMotion();
const reportChange = r.changes.filter(c => c.path.at(-1) === 'currentReportSha256');
assert.equal(reportChange.length, 1);
const reportHash = x => hash(JSON.stringify(x, null, 2) + '\n');
assert.equal(reportHash(motion), reportChange[0].after);
const moduleReceipt = motion.sourceFingerprints.filter(x => x.file === 'tests/material-parity/input-equivalence-audit.mjs');
assert.equal(moduleReceipt.length, 1);
assert.equal(moduleReceipt[0].sha256, fresh);
moduleReceipt[0].sha256 = old;
assert.equal(reportHash(motion), reportChange[0].before);
assert.equal(direct.length + derived.length + reportChange.length + 2, r.changes.length);
const file = 'scripts/check-native-checkable-publication-receipts.mjs';
console.log(JSON.stringify({ producer: { file, sha256: hash(fs.readFileSync(file)) },
  leafComparison: { file: leavesFile, sha256: hash(bytes) }, changedLeaves: 149,
  directProducerReceipts: 98, policyReceiptChanges: 1, sourceFindingCountChange: [171, 173],
  recomputedControlProofs: 48, recomputedMotionReports: 1, exactPriorProducerRecovered: true,
  allSelectedNonReceiptValuesAndContainersConserved: true,
  boundary: 'Receipt/count reconciliation only; no rendering acceptance, case closure or waiver of cold verification.' }));
