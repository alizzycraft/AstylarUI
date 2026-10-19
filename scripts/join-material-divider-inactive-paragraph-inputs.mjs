import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, dividerReviewedBoundariesReview } from '../tests/material-parity/text-backing-case-review-source.mjs';

// One bounded join into the existing proposal/receipt machinery, not a new
// classification framework or a promotion of the parent inspection obligation.
const base = 'artifacts/material-parity/working-audit';
const predecessor = dividerReviewedBoundariesReview;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const readProof = (file, expected) => {
  const bytes = readFileSync(file); assert.equal(hash(bytes), expected);
  return JSON.parse(bytes);
};
const gridFile = 'artifacts/material-parity/divider-paragraph-grid-track-applicability-20261019.log';
const originFile = 'artifacts/material-parity/divider-paragraph-transform-origin-applicability-20261019.log';
const grid = readProof(gridFile, '3cf0e40c9c1f706676eab4f0d865999e8e2a47b5dacfcd520ab220d7e53d9999');
const origin = readProof(originFile, 'a82a2af4fdb9aaf133e86cc0c422ba288bb0f7972084015787efa09061a37cb9');
const proposalFile = `${base}/proposals/${predecessor}.json`;
const bytes = readFileSync(proposalFile);
assert.equal(hash(bytes), '17a4de341fb0af5ab613879f96e089deda7c0044ff4396d5a59d3fa1378f8a70');
const review = JSON.parse(bytes).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
for (const proof of [grid, origin]) {
  assert.equal(proof.cases, 24); assert.equal(proof.paragraphPairs, 48);
  assert.equal(proof.propertySlots, 96);
  for (const item of [proof.source, proof.installed, proof.map, ...proof.treeReceipts])
    assert.deepEqual(receipt(item.file), item);
}
assert.equal(grid.positiveDisplayControls, 3); assert.equal(grid.negativeDisplayControls, 4);
assert.equal(grid.changedGateControlDiffers, true);
assert.equal(origin.activeParserControls, 3); assert.equal(origin.inactiveParserControls, 4);
assert.equal(origin.transformedOwnerExcluded, true);
const validateRows = (caseId, pairedTrees, gridRows, originRows) => {
  assert.equal(gridRows.length, 4); assert.equal(originRows.length, 2);
  const owners = new Set(originRows.map(row => row.target));
  assert.deepEqual([...owners].sort(), ['divider-above', 'divider-below']);
  for (const row of gridRows) {
    assert.equal(row.case, caseId); assert.ok(owners.has(row.target));
    assert.ok(['gridTemplateColumns', 'gridTemplateRows'].includes(row.property));
    assert.equal(row.referenceDisplay, 'block'); assert.equal(row.astylarDisplay, 'block');
    assert.equal(row.reference, 'none'); assert.equal(row.astylar, null);
    assert.equal(row.classification, 'context-inactive-grid-track-input');
    const originRow = originRows.find(item => item.target === row.target);
    assert.equal(row.referenceKey, originRow.referenceKey); assert.equal(row.astylarKey, originRow.astylarKey);
  }
  assert.equal(new Set(gridRows.map(row => row.target + ':' + row.property)).size, 4);
  for (const row of originRows) {
    assert.equal(row.case, caseId); assert.equal(row.referenceTransform, 'none');
    assert.equal(row.astylarTransform, null); assert.equal(row.astylarOrigin, null);
    assert.deepEqual(row.referenceOrigin.split(' ').map(parseFloat), row.referenceComputedCenter);
    assert.equal(row.classification, 'inactive-own-transform-origin-on-recorded-untransformed-paragraph');
  }
  for (const tree of Object.values(pairedTrees))
    for (const proof of [grid, origin]) assert.ok(proof.treeReceipts.some(item => item.file === tree.file && item.sha256 === tree.sha256));
};
const join = receipt('scripts/join-material-divider-inactive-paragraph-inputs.mjs');
const changed = []; let controls = 0;
for (const group of review.groups.filter(group => group.family === 'divider')) {
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  const gridRows = grid.rows.filter(row => row.case === group.case);
  const originRows = origin.rows.filter(row => row.case === group.case);
  validateRows(group.case, group.evidence.pairedTrees, gridRows, originRows);
  for (const mutate of [
    rows => rows.pop(), rows => { rows[0].referenceDisplay = 'grid'; },
    rows => { rows[0].astylar = '1fr'; }, rows => { rows[0].case += '-wrong'; },
  ]) { const altered = structuredClone(gridRows); mutate(altered);
    assert.throws(() => validateRows(group.case, group.evidence.pairedTrees, altered, originRows)); controls++; }
  const transformed = structuredClone(originRows); transformed[0].referenceTransform = 'rotate(10deg)';
  assert.throws(() => validateRows(group.case, group.evidence.pairedTrees, gridRows, transformed)); controls++;
  const owner = group.obligations.inputStyleStructure;
  assert.equal(owner.retainedInactiveParagraphInputs, undefined);
  owner.retainedInactiveParagraphInputs = {
    disposition: 'inspected-recorded-property-applicability', gridTracks: gridRows, ownTransformOrigins: originRows,
    conclusion: 'These exact block paragraph grid tracks and untransformed own origins are inactive formatting inputs; absent candidate values remain recorded,not default-normalized.',
    evidence: { grid: receipt(gridFile), transform: receipt(originFile), join,
      sources: [grid.source, grid.installed, grid.map, origin.source, origin.installed] },
    boundary: '192 property slots only;not parent grid placement,alignment/gaps,ancestor transforms,complete line boxes,live/current rendering or inspection closure.',
  };
  changed.push(owner);
}
assert.equal(changed.length, 24); assert.equal(controls, 120);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(group => group.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.currentRenderingAccepted, false);
assert.equal(loaded.inspectionComplete, false);
for (const owner of changed) delete owner.retainedInactiveParagraphInputs;
assert.equal(hash(JSON.stringify(review)), predecessor, 'Complete predecessor must recover after only24 child removals');
console.log(JSON.stringify({ predecessor, proposed, addedChildren: 24, propertySlots: 192,
  rejectedControls: controls, validatedDependencies: loaded.evidenceFingerprints.length,
  cases: loaded.cases.length, completePredecessorRecovered: true,
  scope: 'Queued additive evidence only. No original remaining work,status,classifications or acceptance criteria changed;not selected/exported/canonical.' }));
