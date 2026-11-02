import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { joinDividerConsumerInputs, restoreDividerConsumerInputs, dividerConsumerPredecessor } from '../../scripts/join-material-divider-consumer-inputs.mjs';

test('Divider consumer batch joins exact accepted parents and preserves every gap and status', () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const pointer = JSON.parse(fs.readFileSync('artifacts/material-parity/working-audit/current.json'));
  assert.equal(pointer.generation, '5e770758fa29941badd1003f008c86cca288884c4e62815e3fef9490dc8f3491');
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${pointer.generation}/index.json`);
  assert.equal(hash(bytes), pointer.indexSha256);
  const parents = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  assert.equal(parents.length, 2311); assert.equal(hash(JSON.stringify(parents)), dividerConsumerPredecessor);
  const joined = joinDividerConsumerInputs(parents);
  const emittedReceipts = new Map();
  for (const row of joined.cases.filter(r => r.family === 'divider'))
    for (const r of row.obligations.inputStyleStructure.retainedOutsideOwnerConsumerInputs.evidence) {
      if (emittedReceipts.has(r.file)) assert.equal(emittedReceipts.get(r.file), r.sha256);
      emittedReceipts.set(r.file, r.sha256);
    }
  for (const [file, sha256] of emittedReceipts) assert.equal(hash(fs.readFileSync(file)), sha256);
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
  assert.throws(() => joinDividerConsumerInputs(joined.cases));
  for (const suffix of ['divider-outside-owner-transform-routing-20261102.log', 'divider-line-box-context-reuse-corrected-20261102.log', 'scripts/check-divider-omitted-owner-consumers.mjs'])
    assert.throws(() => joinDividerConsumerInputs(parents, name => String(name).endsWith(suffix) ? Buffer.from('forged') : fs.readFileSync(name)));
  console.log(JSON.stringify({ predecessor: dividerConsumerPredecessor, successor: joined.sha256,
    cases: parents.length, changed: joined.changed, emittedRawReceipts: emittedReceipts.size, restoredExactly: true, rejectedControls: 4,
    canonicalPublished: false, inspectionPromoted: false, currentRenderingAccepted: false }));
});
