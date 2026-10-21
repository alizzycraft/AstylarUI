import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, passiveStaticAxReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
const base = 'artifacts/material-parity/working-audit';
const predecessor = '33b7ccf93a9df72a878ba302c5a0b8867ef01a2b24cb81a47a59e9c7a5b16460';
assert.equal(passiveStaticAxReview, predecessor);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const groups = new Map(review.groups.map(g => [g.case, g])); assert.equal(groups.size, 2311);
const producer = receipt('scripts/join-card-input-evidence.mjs'), changes = [];
function replay(script, file) {
  const bytes = execFileSync(process.execPath, [script], { maxBuffer: 4000000 });
  assert.deepEqual(bytes, readFileSync(file)); return JSON.parse(bytes);
}
const mappingFile = 'artifacts/material-parity/card-recorded-node-accounting-20261021.log';
const mapping = replay('scripts/check-card-recorded-nodes.mjs', mappingFile);
assert.equal(mapping.cases, 52); assert.equal(mapping.negativeControlsRejected, 208);
for (const row of mapping.observations) {
  const group = groups.get(row.case); assert.equal(group.family, 'card');
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  assert.deepEqual(group.evidence.pairedTrees, row.evidence);
  const owner = group.obligations.inputStyleStructure;
  assert.equal(owner.recordedCardNodeAccounting, undefined);
  owner.recordedCardNodeAccounting = { disposition: 'inspected-recorded-node-accounting',
    groups: row.groups, evidence: { pairedTrees: row.evidence, verifier: mapping.producer,
      verification: receipt(mappingFile), producer }, boundary: mapping.boundary };
  changes.push([owner, 'recordedCardNodeAccounting']);
}
const axFile = 'artifacts/material-parity/card-static-ax-review-20261021.log';
const ax = replay('scripts/check-card-static-ax.mjs', axFile);
const capture = JSON.parse(readFileSync(ax.report.file)), pairs = new Map();
const captureProducer = { ...capture.provenance.producer,
  file: path.relative(process.cwd(), capture.provenance.producer.file).replaceAll('\\', '/') };
assert.ok(!captureProducer.file.startsWith('../') && !path.isAbsolute(captureProducer.file));
assert.equal(hash(readFileSync(captureProducer.file)), captureProducer.sha256);
for (const row of ax.observations) {
  const record = capture.observations.find(r => row.file.endsWith('/' + r.file)); assert.ok(record);
  const key = `static:card@${record.profile}/${record.viewport.id}`;
  const pair = pairs.get(key) ?? []; pair.push({ ...row, viewport: record.viewport }); pairs.set(key, pair);
}
assert.equal(pairs.size, 12);
for (const [key, pair] of pairs) {
  const group = groups.get(key); assert.ok(group); assert.equal(pair.length, 2);
  const reference = pair.find(r => r.mode === 'reference'), candidate = pair.find(r => r.mode === 'astylar');
  assert.ok(reference && candidate); assert.deepEqual(reference.viewport, candidate.viewport);
  const semantic = group.obligations.semantics; assert.equal(semantic.currentStaticActualAx, undefined);
  semantic.currentStaticActualAx = { disposition: 'inspected-actual-ax-title-role-boundary', case: key,
    viewport: reference.viewport, referenceTitle: reference.title, candidateTitle: candidate.title,
    classification: ax.classification,
    evidence: { actualAxCaptures: pair.map(r => ({ file: r.file, sha256: r.sha256 })),
      verifier: ax.producer, verification: receipt(axFile), capture: ax.report,
      checkpoint: capture.provenance.checkpoint, captureProducer,
      sourceBindings: ax.bindings, producer,
      pendingSourceReview: receipt(`${base}/proposals/617d82df0024332dfbfc98002c8d8d4dc1543b7691a26bfcc5e65757106ee902.json`) },
    boundary: ax.boundary + ' Source finding is pending registration;not canonical publication.' };
  changes.push([semantic, 'currentStaticActualAx']);
}
assert.equal(changes.length, 64);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [object, key] of changes) delete object[key];
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ producer, predecessor, proposed, recordedNodeCases: 52,
  actualAxCases: 12, addedChildren: 64, validatedDependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, cases: 2311, inspectionComplete: false,
  currentRenderingAccepted: false, selectedForExport: false, canonicalPublication: false }));
