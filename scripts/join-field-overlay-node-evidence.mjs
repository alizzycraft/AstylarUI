import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { getHeapStatistics } from 'node:v8';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, tabsMenuSheetReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
assert.ok(getHeapStatistics().heap_size_limit >= 3 * 1024 ** 3,
  'Join requires an explicit >=3GiB V8 heap;wait for cold verification to finish,then run node --max-old-space-size=4096 scripts/join-field-overlay-node-evidence.mjs');
const base = 'artifacts/material-parity/working-audit', predecessor = tabsMenuSheetReview;
assert.equal(predecessor, '7eb107dec98a464f2c859c3c6f205d678719649b890c586bb52ce2d1d59640b4');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const pointerFile = `${base}/current.json`, pointer = readFileSync(pointerFile);
const producer = receipt('scripts/join-field-overlay-node-evidence.mjs');
const groups = new Map(review.groups.map(r => [r.case, r])); assert.equal(groups.size, 2311);
const changes = [], counts = {}, verifications = [];
const batches = [
  ['basic-field', 'basic-field-recorded-node-accounting', 152, 608],
  ['choice-field', 'choice-field-recorded-node-accounting-final', 204, 816],
  ['timepicker', 'timepicker-recorded-node-accounting', 110, 440],
  ['datepicker', 'datepicker-recorded-node-accounting-final', 111, 444],
  ['bottom-sheet', 'bottom-sheet-recorded-node-accounting', 63, 252],
  ['dialog', 'dialog-recorded-node-accounting', 78, 312],
  ['snackbar', 'snackbar-recorded-node-accounting', 71, 284],
  ['tooltip', 'tooltip-recorded-node-accounting', 62, 248],
];
for (const [batch, name, expected, negatives] of batches) {
  const file = `artifacts/material-parity/${name}-20261022.log`, bytes = readFileSync(file), result = JSON.parse(bytes);
  assert.equal(hash(readFileSync(result.producer.file)), result.producer.sha256);
  assert.deepEqual(execFileSync(process.execPath, [result.producer.file], { maxBuffer: 16000000 }), bytes);
  assert.equal(result.observations.length, expected); assert.equal(result.negativeControlsRejected, negatives);
  assert.equal(result.canonicalPublication, false); assert.equal(result.inspectionComplete, false); assert.equal(result.renderingAccepted, false);
  assert.equal(result.review.reviewSha256, 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069');
  const verification = receipt(file); verifications.push(verification);
  const applicable = batch === 'basic-field' ? ['form-field', 'input'] : batch === 'choice-field' ? ['autocomplete', 'select'] : [batch === 'snackbar' ? 'snack-bar' : batch];
  const key = 'retainedCompleteElementAccounting';
  for (const row of result.observations) {
    const group = groups.get(row.case); assert.ok(group && applicable.includes(group.family));
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    assert.deepEqual(group.evidence.pairedTrees, row.evidence);
    const owner = group.obligations.inputStyleStructure; assert.equal(owner[key], undefined);
    owner[key] = { disposition: 'inspected-retained-element-owner-membership-not-full-input-equivalence',
      observation: row, evidence: { verifier: result.producer, verification, producer,
        ...(result.reusedStructureProof ? { reusedStructureProof: result.reusedStructureProof } : {}),
        ...(result.reusedProofs ? { reusedProofs: result.reusedProofs } : {}) }, boundary: result.boundary };
    changes.push([owner, key]); counts[group.family] = (counts[group.family] ?? 0) + 1;
  }
}
assert.equal(changes.length, 851); assert.equal(Object.keys(counts).length, 10);
const proposal = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, review.groups.map(r => r.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [owner, key] of changes) delete owner[key];
assert.equal(hash(JSON.stringify(review)), predecessor); assert.deepEqual(readFileSync(pointerFile), pointer);
console.log(JSON.stringify({ producer, predecessor, proposal, verifications, counts, addedChildren: changes.length,
  validatedDependencies: loaded.evidenceFingerprints.length, completePredecessorRecovered: true, acceptedPointerUnchanged: true,
  selectedForExport: false, canonicalPublication: false, inspectionComplete: false, currentRenderingAccepted: false,
  boundary: 'Coherent proposal for already verified retained element membership only. Existing remaining-work lists,findings,statuses and acceptance criteria preserved;no frozen producer/source registration changed. Additional pending AX/name proofs remain separate.' }));
