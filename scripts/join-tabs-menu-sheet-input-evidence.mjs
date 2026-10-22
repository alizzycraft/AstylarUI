import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, stepperInputsReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
const base = 'artifacts/material-parity/working-audit', predecessor = stepperInputsReview;
assert.equal(predecessor, 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const pointer = readFileSync(`${base}/current.json`), producer = receipt('scripts/join-tabs-menu-sheet-input-evidence.mjs');
const sourceReview = receipt(`${base}/proposals/4eb7698c523610a095b209c497274bdad32fefc4972934bde73980da28b9d5d5.json`);
const groups = new Map(review.groups.map(group => [group.case, group]));
assert.equal(groups.size, 2311);
const changes = [], counts = {};
function replay(script, file) {
  const bytes = execFileSync(process.execPath, [script], { maxBuffer: 4000000 });
  assert.deepEqual(bytes, readFileSync(file)); return JSON.parse(bytes);
}
function add(group, obligation, key, value) {
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  const owner = group.obligations[obligation]; assert.equal(owner[key], undefined);
  owner[key] = value; changes.push([owner, key]);
}
for (const [family, expected, negatives, file] of [
  ['tabs', 70, 280, 'artifacts/material-parity/tabs-recorded-node-accounting-20261022.log'],
  ['menu', 94, 376, 'artifacts/material-parity/menu-recorded-node-accounting-retry-20261022.log'],
]) {
  const result = replay(`scripts/check-${family}-recorded-nodes.mjs`, file);
  assert.equal(result.cases, expected); assert.equal(result.negativeControlsRejected, negatives);
  for (const row of result.observations) {
    const group = groups.get(row.case); assert.equal(group.family, family);
    assert.deepEqual(group.evidence.pairedTrees, row.evidence);
    add(group, 'inputStyleStructure', family === 'tabs' ? 'recordedTabsNodeAccounting' : 'recordedMenuNodeAccounting', {
      disposition: 'inspected-recorded-node-accounting', groups: row.groups,
      evidence: { pairedTrees: row.evidence, verifier: result.producer, verification: receipt(file), producer }, boundary: result.boundary });
  }
  counts[family] = expected;
}
const sheetFile = 'artifacts/material-parity/bottom-sheet-action-presence-20261022.log';
const sheet = JSON.parse(readFileSync(sheetFile));
assert.deepEqual(execFileSync(process.execPath, sheet.producerArgs, { maxBuffer: 4000000 }), readFileSync(sheetFile));
assert.equal(sheet.openPairs, 25); assert.equal(sheet.negativeControlsRejected, 50);
for (const row of sheet.observations) {
  const group = groups.get(row.case); assert.equal(group.family, 'bottom-sheet');
  assert.deepEqual(group.evidence.pairedTrees, row.evidence);
  add(group, 'inputStyleStructure', 'recordedBottomSheetActionPresence', {
    disposition: 'inspected-authored-action-presence-not-visibility', reference: row.reference,
    candidate: row.candidate, panels: row.panels,
    evidence: { pairedTrees: row.evidence, verification: receipt(sheetFile), producer }, boundary: sheet.boundary });
}
const axFile = 'artifacts/material-parity/tabs-static-ax-review-20261022.log';
const ax = replay('scripts/check-tabs-static-ax.mjs', axFile), capture = JSON.parse(readFileSync(ax.report.file));
const captureProducer = { ...capture.provenance.producer, file: path.relative(process.cwd(), capture.provenance.producer.file).replaceAll('\\', '/') };
assert.ok(!path.isAbsolute(captureProducer.file) && !captureProducer.file.startsWith('../'));
assert.equal(hash(readFileSync(captureProducer.file)), captureProducer.sha256);
const pairs = new Map();
for (const row of ax.observations) {
  const key = `static:tabs@${row.profile}/${row.viewport.id}`, pair = pairs.get(key) ?? [];
  pair.push(row); pairs.set(key, pair);
}
assert.equal(pairs.size, 12);
for (const [key, pair] of pairs) {
  assert.equal(pair.length, 2); assert.deepEqual(pair.map(row => row.mode).sort(), ['astylar', 'reference']);
  assert.deepEqual(pair[0].viewport, pair[1].viewport);
  const group = groups.get(key); assert.equal(group.family, 'tabs');
  add(group, 'semantics', 'currentStaticActualAx', {
    disposition: 'inspected-static-tab-panel-relationship-and-name-differences',
    observations: pair.map(row => ({ mode: row.mode, result: row.result })),
    evidence: { actualAxCaptures: pair.map(row => ({ file: row.file, sha256: row.sha256 })),
      verifier: ax.producer, verification: receipt(axFile), capture: ax.report, captureProducer,
      checkpoint: capture.provenance.checkpoint, sourceBindingReuse: ax.sourceBindingReuse, producer, pendingSourceReview: sourceReview },
    boundary: ax.boundary });
}
assert.equal(changes.length, 201);
const proposal = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, review.groups.map(group => group.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [owner, key] of changes) delete owner[key];
assert.equal(hash(JSON.stringify(review)), predecessor); assert.deepEqual(readFileSync(`${base}/current.json`), pointer);
console.log(JSON.stringify({ producer, predecessor, proposal, recordedNodeCases: counts, bottomSheetPresenceCases: 25,
  actualAxCases: 12, addedChildren: changes.length, validatedDependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, acceptedPointerUnchanged: true, selectedForExport: false,
  inspectionComplete: false, currentRenderingAccepted: false, canonicalPublication: false }));
