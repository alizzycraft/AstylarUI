// Join already inspected endpoint inputs, not a new capture or case closure.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, staticSemanticInputsReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const base = 'artifacts/material-parity/working-audit', predecessor = staticSemanticInputsReview;
const review = JSON.parse(fs.readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const pointer = fs.readFileSync(`${base}/current.json`);
const verification = receipt('artifacts/material-parity/popup-depth-endpoint-input-20261022.log');
assert.equal(verification.sha256, '98ef1419a57ee172ad855f0c759f81d410966cfdffe8aba04fea0b43f8faf927');
const parse = text => {
  // Node's TAP reporter splits a large console record at64KiB. Reassemble
  // contiguous comment chunks;never alter the retained log or its receipt.
  const lines = text.split(/\r?\n/), starts = lines.flatMap((line,index) =>
    line.startsWith('# {"proof":"retained-popup-root-depth-input-applicability"') ? [index] : []);
  assert.equal(starts.length, 1);
  const chunks = []; let index = starts[0];
  while (lines[index]?.startsWith('# ') && !lines[index].startsWith('# Subtest:')) chunks.push(lines[index++].slice(2));
  return JSON.parse(chunks.join(''));
};
const inspected = parse(fs.readFileSync(verification.file, 'utf8'));
const replay = execFileSync(process.execPath, ['--test', '--test-name-pattern=retained tooltip and snackbar endpoints',
  'tests/material-parity/tooltip-position-composition.spec.mjs'], { encoding: 'utf8', maxBuffer: 16000000 });
assert.match(replay, /# pass 1\r?\n/); assert.match(replay, /# fail 0\r?\n/);
assert.deepEqual(parse(replay), inspected);
assert.equal(inspected.predecessorReview, predecessor);
assert.equal(inspected.negativeControlsRejected, 300);
assert.equal(inspected.currentRenderingAccepted, false);
const definition = sourceAuditDefinitions.find(d => d.id === 'core-root-paint-depth-crosses-viewport-camera');
assert.equal(definition?.classification, 'confirmed-core-renderer-defect');
for (const entry of definition.evidence) assert.equal(receipt(entry.file).sha256, entry.sha256);
const producer = receipt('scripts/join-popup-depth-input-evidence.mjs');
const verifier = receipt('tests/material-parity/tooltip-position-composition.spec.mjs');
const groups = new Map(review.groups.map(g => [g.case, g])); assert.equal(groups.size, 2311);
const changes = [], counts = {}; const child = 'retainedPopupDepthInputApplicability';
for (const observation of inspected.observations) {
  const group = groups.get(observation.case); assert.ok(group);
  assert.equal(group.family, observation.family);
  assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
  assert.deepEqual(group.evidence.pairedTrees.astylar, observation.inputTree);
  assert.equal(receipt(observation.inputTree.file).sha256, observation.inputTree.sha256);
  const owner = group.obligations.localPaint; assert.ok(owner); assert.equal(owner[child], undefined);
  const present = observation.result.popup === 'present';
  if (present) {
    assert.equal(observation.result.syntheticRootStyleUnobserved, true);
    assert.equal(observation.result.highZWithNoRecordedStackingAncestor, true);
  } else assert.equal(observation.result.highZWithNoRecordedStackingAncestor, false);
  owner[child] = {
    disposition: 'inspected-retained-popup-input-presence-not-case-paint-or-runtime-depth',
    observation,
    sharedMechanism: { definitionId: definition.id, classification: definition.classification,
      applicableToCaseRuntimeProven: false, evidence: definition.evidence },
    evidence: { producer, verifier, verification, inputTree: observation.inputTree },
    remaining: present
      ? ['Synthetic root style and actual stacking-context participation', 'Final world depth/camera and visible paint in this case', 'Current rendering and complete case inspection']
      : ['Opening/action-boundary behavior is not established by absent endpoint popup', 'Current rendering and complete case inspection'],
    boundary: inspected.boundary,
  };
  changes.push(owner); const key = `${group.family}:${observation.result.popup}`;
  counts[key] = (counts[key] ?? 0) + 1;
}
assert.equal(changes.length, 133); assert.deepEqual(counts, inspected.counts);
const proposal = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: fs.readFileSync, reviewSha256: predecessor });
// The predecessor owns the pre-short-boundary producer receipt. Authenticate
// both complete sources and read only that historical dependency as captured.
const logicalProducer = 'scripts/audit-material-tooltip-applied-theme-ownership.mjs';
assert.equal(receipt(logicalProducer).sha256, '98347c3b5ef0fa585747c399bcac78ed9fafbfb804fab56c993f2a1d819d0613');
const retainedProducer = execFileSync('git', ['show', `9f7dc468:${logicalProducer}`]);
assert.equal(hash(retainedProducer), 'ee4f273b041dec7f2dd0e242e4441b6cc6690b72d7a27d01270682c98e30d10a');
const read = (file, encoding) => path.resolve(file) === path.resolve(logicalProducer)
  ? (encoding ? retainedProducer.toString(encoding) : retainedProducer) : reader.read(file, encoding);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, review.groups.map(g => g.case), { read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const owner of changes) delete owner[child];
assert.equal(hash(JSON.stringify(review)), predecessor);
assert.deepEqual(fs.readFileSync(`${base}/current.json`), pointer);
console.log(JSON.stringify({ producer, predecessor, proposal, counts, addedChildren: changes.length,
  completePredecessorRecovered: true, validatedDependencies: loaded.evidenceFingerprints.length,
  acceptedPointerUnchanged: true, selectedForExport: false, canonicalPublication: false,
  inspectionComplete: false, currentRenderingAccepted: false }));
