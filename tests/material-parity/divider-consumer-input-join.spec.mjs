import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { joinDividerConsumerInputs, restoreDividerConsumerInputs, dividerConsumerPredecessor, createDividerConsumerReviewReader } from '../../scripts/join-material-divider-consumer-inputs.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createDividerConsumerRegistrationHistoricalRead } from './divider-consumer-registration.mjs';

test('Divider consumer batch joins exact accepted parents and preserves every gap and status', () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const pointer = JSON.parse(fs.readFileSync('artifacts/material-parity/working-audit/current.json'));
  assert.equal(pointer.generation, '5e770758fa29941badd1003f008c86cca288884c4e62815e3fef9490dc8f3491');
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${pointer.generation}/index.json`);
  assert.equal(hash(bytes), pointer.indexSha256);
  const parents = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  assert.equal(parents.length, 2311); assert.equal(hash(JSON.stringify(parents)), dividerConsumerPredecessor);
  const evidenceRead = createDividerConsumerRegistrationHistoricalRead({ root: process.cwd(), read: fs.readFileSync });
  const joined = joinDividerConsumerInputs(parents, evidenceRead);
  const emittedReceipts = new Map();
  for (const row of joined.cases.filter(r => r.family === 'divider'))
    for (const r of row.obligations.inputStyleStructure.retainedOutsideOwnerConsumerInputs.evidence) {
      if (emittedReceipts.has(r.file)) assert.equal(emittedReceipts.get(r.file), r.sha256);
      emittedReceipts.set(r.file, r.sha256);
    }
  for (const [file, sha256] of emittedReceipts) assert.equal(hash(evidenceRead(file)), sha256);
  assert.equal(joined.changed, 24); assert.equal(joined.canonicalPublished, false);
  assert.deepEqual(restoreDividerConsumerInputs(joined.cases), parents);
  assert.equal(hash(JSON.stringify(parents)), dividerConsumerPredecessor);
  for (let i = 0; i < parents.length; i++) {
    if (parents[i].family !== 'divider') { assert.equal(joined.cases[i], parents[i]); continue; }
    assert.equal(joined.cases[i].inspection, parents[i].inspection);
    assert.equal(joined.cases[i].currentRendering, parents[i].currentRendering);
    assert.deepEqual(joined.cases[i].obligations.inputStyleStructure.remaining, parents[i].obligations.inputStyleStructure.remaining);
    const child = joined.cases[i].obligations.inputStyleStructure.retainedOutsideOwnerConsumerInputs;
    assert.equal(child.ownTransformInputs.length, 5); assert.equal(child.sourceExecutedControls.containerDispatch, 32);
  }
  assert.throws(() => joinDividerConsumerInputs(joined.cases, evidenceRead));
  for (const suffix of ['divider-outside-owner-transform-routing-20261102.log', 'divider-line-box-context-reuse-corrected-20261102.log', 'scripts/check-divider-omitted-owner-consumers.mjs'])
    assert.throws(() => joinDividerConsumerInputs(parents, name => String(name).endsWith(suffix) ? Buffer.from('forged') : evidenceRead(name)));
  console.log(JSON.stringify({ predecessor: dividerConsumerPredecessor, successor: joined.sha256,
    cases: parents.length, changed: joined.changed, emittedScopedReceipts: emittedReceipts.size, restoredExactly: true, rejectedControls: 4,
    canonicalPublished: false, inspectionPromoted: false, currentRenderingAccepted: false }));
});

test('Divider consumer review passes the existing complete receipt loader without promoting cases', () => {
  const reader = createDividerConsumerReviewReader();
  const envelope = JSON.parse(reader.read(reader.file));
  assert.equal(envelope.sha256, reader.sha256);
  console.log(JSON.stringify({ phase: 'consumer-review-constructed', review: reader.sha256, cases: envelope.review.groups.length }));
  const loaded = loadCaseObligationReview(
    `artifacts/material-parity/working-audit/proposals/${reader.sha256}.json`, reader.sha256,
    envelope.review.groups.map(r => r.case), { root: process.cwd(), read: reader.read });
  assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
  assert.equal(loaded.currentRenderingAccepted, false);
  assert.ok(loaded.cases.every(r => r.inspection === 'partial' && r.currentRendering === 'unverified'));
  console.log(JSON.stringify({ phase: 'consumer-review-validated', review: reader.sha256,
    dependencies: loaded.evidenceFingerprints.length, inspectionComplete: loaded.inspectionComplete,
    currentRenderingAccepted: loaded.currentRenderingAccepted }));
});
