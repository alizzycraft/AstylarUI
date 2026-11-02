import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createCaptureAvailabilityReviewReader } from './join-material-capture-availability.mjs';
import { createDividerConsumerRegistrationHistoricalRead } from '../tests/material-parity/divider-consumer-registration.mjs';

// A bounded successor over the accepted case ledger, not a new audit collector.
const hash = b => createHash('sha256').update(b).digest('hex');
export const dividerConsumerPredecessor = '24210a77ef405c0533ee5d8e407b69160cfb33b12ec7e5d4480084dd6210c1dc';
const child = 'retainedOutsideOwnerConsumerInputs';
const base = 'artifacts/material-parity/';
const records = [
  [base + 'divider-outside-owner-transform-routing-20261102.log', 'beae96174a40a72f59e4c219b24bf6a8eb18b0fcd8db5fc021b4dc75ff6fedde'],
  [base + 'divider-line-box-context-reuse-corrected-20261102.log', '449c148b3ea8f5e43b61638fa1d6e822f2709a08f87cce05ac0b5fe9ea3ceabd'],
];
export function createDividerConsumerReviewReader({ root = process.cwd(), read = fs.readFileSync, reviewSha256 } = {}) {
  read = createDividerConsumerRegistrationHistoricalRead({ root, read });
  const indexFile = path.resolve(root, 'artifacts/material-parity/working-audit/5e770758fa29941badd1003f008c86cca288884c4e62815e3fef9490dc8f3491/index.json');
  const indexBytes = read(indexFile);
  assert.equal(hash(indexBytes), '2090dfe307032486226a09d1c6da8c32084e27c40e2ef0e49ae5ded76c4a6ec3');
  const inspection = JSON.parse(indexBytes).metadata.coverage.inspectionEvidence;
  const parent = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical',
    ...(inspection.schemaVersion === 2 ? { inspectionSchemaVersion: 2 } : {}),
    scope: inspection.scope, groups: inspection.cases };
  assert.equal(hash(JSON.stringify(parent)), '2f609608195c66b94a965508eb7d59e1aa7d94b7bf33ba24e61566b550f737d1');
  const joined = joinDividerConsumerInputs(parent.groups, name => read(path.resolve(root, name)));
  const review = { ...parent, groups: joined.cases }, sha256 = hash(JSON.stringify(review));
  if (reviewSha256 !== undefined) assert.equal(reviewSha256, sha256, 'Only exact successor digest selects this reader');
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256, review }));
  const ownerSource = path.resolve(root, 'scripts/check-divider-owner-coverage.mjs');
  const oldOwnerSource = execFileSync('git', ['show', '5ecb14b1:scripts/check-divider-owner-coverage.mjs'], { cwd: root });
  assert.equal(hash(oldOwnerSource), '0d4ed653d46fe241ef20a0009bcc84b821464284d1cef870da363dc30bcf8f14');
  const priorRead = (name, options) => {
    if (path.resolve(root, name) === ownerSource) {
      assert.equal(hash(read(ownerSource)), 'c3da659604419f1436ae8052059caf4469e11a1915978a79620987c490396ee5');
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? oldOwnerSource.toString(encoding) : Buffer.from(oldOwnerSource);
    }
    return read(path.resolve(root, name), options);
  };
  const prior = createCaptureAvailabilityReviewReader({ root, read: priorRead });
  assert.equal(prior.sha256, inspection.reviewSha256);
  const expected = new Map(inspection.evidenceFingerprints.map(r => [path.resolve(root, r.file), r.sha256]));
  for (const row of joined.cases.filter(r => r.family === 'divider'))
    for (const r of row.obligations.inputStyleStructure[child].evidence) {
      const name = path.resolve(root, r.file);
      if (expected.has(name)) assert.equal(expected.get(name), r.sha256, 'Conflicting dependency generation');
      expected.set(name, r.sha256);
    }
  return { file, sha256, changed: joined.changed, read(name, options) {
    const absolute = path.resolve(root, name);
    if (absolute !== file) {
      const sha = expected.get(absolute), current = sha ? read(absolute) : undefined;
      let selected;
      if (sha && hash(current) === sha) selected = current;
      else {
        selected = prior.read(absolute);
        if (sha) assert.equal(hash(selected), sha, `Unreconciled dependency generation: ${name}`);
      }
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? selected.toString(encoding) : Buffer.from(selected);
    }
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }, sourceApplicability: { mode: 'pending-divider-consumer-case-join',
    predecessorReview: inspection.reviewSha256, acceptedIndexSha256: hash(indexBytes),
    predecessorApplicability: prior.sourceApplicability,
    boundary: 'Exact accepted parent case ledger plus receipt-bound consumer children. Existing historical reader only;not source-registry/export selection,current rendering or case closure.' } };
}
export function restoreDividerConsumerInputs(cases) {
  return cases.map(row => {
    if (!row.obligations.inputStyleStructure[child]) return row;
    const inputStyleStructure = { ...row.obligations.inputStyleStructure };
    delete inputStyleStructure[child];
    return { ...row, obligations: { ...row.obligations, inputStyleStructure } };
  });
}
export function joinDividerConsumerInputs(cases, read = fs.readFileSync) {
  assert.equal(hash(JSON.stringify(cases)), dividerConsumerPredecessor, 'Exact accepted parent ledger required');
  const receipts = [];
  const bind = r => { assert.equal(hash(read(r.file)), r.sha256, r.file); receipts.push(r); };
  for (const file of ['scripts/join-material-divider-consumer-inputs.mjs', 'tests/material-parity/divider-consumer-input-join.spec.mjs'])
    bind({ file, sha256: hash(read(file)) });
  const load = ([file, sha256]) => {
    bind({ file, sha256 });
    const bytes = read(file), text = (bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le') : bytes.toString()).replace(/^\ufeff/, '');
    return JSON.parse(text.slice(text.indexOf('{')));
  };
  const [consumer, topology] = records.map(load);
  for (const r of [consumer.producer, consumer.previous, consumer.sourceMap, topology.report, topology.collector]) bind(r);
  assert.equal(hash(read(topology.producer.file)), topology.producer.sha256);
  bind({ file: base + 'divider-consumer-check-divider-owner-coverage-20261102.mjs', sha256: topology.producer.sha256 });
  const sourceMap = JSON.parse(read(consumer.sourceMap.file));
  for (const r of consumer.sources) {
    const bytes = read(r.current.file);
    assert.equal(hash(bytes.toString().replaceAll('\r\n', '\n')), r.current.sha256);
    receipts.push({ file: r.current.file, sha256: hash(bytes) });
    const index = sourceMap.sources.indexOf(r.captured.module); assert.ok(index >= 0);
    assert.equal(hash(sourceMap.sourcesContent[index]), r.captured.sha256);
  }
  assert.equal(consumer.inspectionPromoted, false); assert.equal(consumer.currentRenderingAccepted, false);
  assert.equal(consumer.constraintOwnerPairs, 120); assert.equal(consumer.ownTransformInputs.length, 120);
  assert.equal(topology.textTopology.recordedTextLeaves, 96);
  const original = load([consumer.previous.file, consumer.previous.sha256]);
  for (const r of original.treeReceipts) bind(r);
  const observations = new Map(topology.observations.map(r => [r.case, r]));
  assert.equal(observations.size, 24);
  let changed = 0;
  const joined = cases.map(row => {
    if (row.family !== 'divider') return row;
    assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
    const observation = observations.get(row.case); assert.ok(observation);
    assert.deepEqual(observation.evidence, row.evidence.pairedTrees);
    assert.equal(row.obligations.inputStyleStructure[child], undefined);
    const transforms = consumer.ownTransformInputs.filter(r => r.referenceTree.file === observation.evidence.reference.file &&
      r.referenceTree.sha256 === observation.evidence.reference.sha256);
    assert.equal(transforms.length, 5);
    assert.deepEqual(transforms.map(r => r.id), ['page', 'eyebrow', 'title', 'divider-above-row', 'divider-below-row']);
    const viewport = row.case.split('/')[1];
    const lineContexts = topology.retainedNaturalLineBoxes.lineBoxContextReuse.filter(r =>
      r.profile === row.case.split('@')[1].split('/')[0] && r.viewport === viewport);
    assert.equal(lineContexts.length, 1);
    changed++;
    return { ...row, obligations: { ...row.obligations, inputStyleStructure: {
      ...row.obligations.inputStyleStructure, [child]: {
        disposition: 'inspected-bounded-consumer-routing', ownTransformInputs: transforms,
        sourceExecutedControls: { position: consumer.positionControls, meshFlags: consumer.meshControls,
          constraints: consumer.constraintControls, containerDispatch: consumer.containerInputRouting.containerDispatchControls,
          transformParser: consumer.transformParserControls, percentageHeight: consumer.percentageHeightRouting },
        recordedTextTopology: topology.textTopology, naturalLineBoxInputContext: lineContexts[0],
        minimumHeightScope: consumer.minimumHeightInputs.boundary,
        transformScope: consumer.ownTransformBoundary,
        evidence: receipts,
        boundary: 'Standalone retained input/source-method evidence only. No parent gap/status removal,full layout execution,current rendering,default/origin normalization or whole-case closure. Historical public maximum-none proof remains separate,not a new failure of these owners.',
      },
    } } };
  });
  assert.equal(changed, 24);
  assert.equal(hash(JSON.stringify(restoreDividerConsumerInputs(joined))), dividerConsumerPredecessor);
  return { cases: joined, changed, sha256: hash(JSON.stringify(joined)), canonicalPublished: false };
}
