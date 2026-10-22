import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, expansionSemanticsReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
const base = 'artifacts/material-parity/working-audit', predecessor = expansionSemanticsReview;
assert.equal(predecessor, '5caa57e5f2254471d9d082ff0831db36704f73997b41ae48aa4b4064b45c4c99');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const groups = new Map(review.groups.map(g => [g.case, g])); assert.equal(groups.size, 2311);
const pointer = readFileSync(`${base}/current.json`), producer = receipt('scripts/join-stepper-expansion-input-evidence.mjs');
const pendingSourceReview = receipt(`${base}/proposals/5d5c15f9532ea5446bad81e49280432e9393cf83db986f21cc5aac048d24ddd9.json`);
function replay(script, file) {
  const bytes = execFileSync(process.execPath, [script], { maxBuffer: 4000000 });
  assert.deepEqual(bytes, readFileSync(file)); return JSON.parse(bytes);
}
const changes = [], counts = {};
for (const family of ['expansion', 'stepper']) {
  const script = `scripts/check-${family}-recorded-nodes.mjs`;
  const file = `artifacts/material-parity/${family}-recorded-node-accounting-20261022.log`;
  const result = replay(script, file); assert.equal(result.cases, 68);
  assert.equal(result.negativeControlsRejected, family === 'expansion' ? 280 : 272);
  const key = family === 'expansion' ? 'recordedExpansionNodeAccounting' : 'recordedStepperNodeAccounting';
  for (const row of result.observations) {
    const group = groups.get(row.case); assert.equal(group.family, family);
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    assert.deepEqual(group.evidence.pairedTrees, row.evidence);
    const owner = group.obligations.inputStyleStructure; assert.equal(owner[key], undefined);
    owner[key] = { disposition: 'inspected-recorded-node-accounting', groups: row.groups,
      evidence: { pairedTrees: row.evidence, verifier: result.producer, verification: receipt(file), producer },
      boundary: result.boundary };
    changes.push([owner, key]); counts[family] = (counts[family] ?? 0) + 1;
  }
}
const axFile = 'artifacts/material-parity/stepper-static-ax-review-20261022.log';
const ax = replay('scripts/check-stepper-static-ax.mjs', axFile);
const capture = JSON.parse(readFileSync(ax.report.file)), pairs = new Map();
const captureProducer = { ...capture.provenance.producer,
  file: path.relative(process.cwd(), capture.provenance.producer.file).replaceAll('\\', '/') };
assert.ok(!path.isAbsolute(captureProducer.file) && !captureProducer.file.startsWith('../'));
assert.equal(hash(readFileSync(captureProducer.file)), captureProducer.sha256);
for (const row of ax.observations) {
  const key = `static:stepper@${row.profile}/${row.viewport.id}`, pair = pairs.get(key) ?? [];
  pair.push(row); pairs.set(key, pair);
}
assert.equal(pairs.size, 12);
for (const [key, pair] of pairs) {
  assert.equal(pair.length, 2); assert.deepEqual(pair.map(r => r.mode).sort(), ['astylar', 'reference']);
  assert.deepEqual(pair[0].viewport, pair[1].viewport);
  const group = groups.get(key); assert.equal(group.family, 'stepper');
  const owner = group.obligations.semantics; assert.equal(owner.currentStaticActualAx, undefined);
  owner.currentStaticActualAx = { disposition: 'inspected-static-tab-panel-relationship-and-name-differences',
    observations: pair.map(row => ({ mode: row.mode, result: row.result })),
    evidence: { actualAxCaptures: pair.map(row => ({ file: row.file, sha256: row.sha256 })),
      verification: receipt(axFile), verifier: ax.producer, capture: ax.report, captureProducer,
      checkpoint: capture.provenance.checkpoint, sourceBindingReuse: ax.sourceBindingReuse,
      producer, pendingSourceReview },
    boundary: 'Pinned static actual AX/backend DOM only. Authored relationship omissions and existing accessibility-only hiding support gap remain distinct. Not interactive updates,AT traversal,paint,current rendering or case closure.' };
  changes.push([owner, 'currentStaticActualAx']);
}
assert.deepEqual(counts, { expansion: 68, stepper: 68 }); assert.equal(changes.length, 148);
const proposal = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, review.groups.map(g => g.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [object, key] of changes) delete object[key];
assert.equal(hash(JSON.stringify(review)), predecessor); assert.deepEqual(readFileSync(`${base}/current.json`), pointer);
console.log(JSON.stringify({ producer, predecessor, proposal, recordedNodeCases: counts, actualAxCases: 12,
  addedChildren: changes.length, validatedDependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, acceptedPointerUnchanged: true, inspectionComplete: false,
  currentRenderingAccepted: false, selectedForExport: false, canonicalPublication: false }));
