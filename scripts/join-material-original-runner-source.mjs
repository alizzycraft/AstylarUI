import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const originalRunnerPredecessor = 'c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823';
const target = 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0';
const hash = b => createHash('sha256').update(b).digest('hex');
const missing = 'missing-original-bytes-not-a-readable-receipt';
const recovered = 'complete-original-source-authenticated';
function transform(value, replace) {
  if (Array.isArray(value)) return value.map(v => transform(v, replace));
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    const result = replace(key, child, value);
    if (result) output[result.key] = result.value;
    else output[key] = transform(child, replace);
  }
  return output;
}
export function restoreMissingOriginalRunner(review) {
  return transform(review, (key, child) => {
    if (key !== 'originalActionSource' || child.disposition !== recovered) return;
    const { sourceEvidence, ...original } = child;
    assert.ok(sourceEvidence); return { key: 'unavailableActionSource', value: { ...original, disposition: missing } };
  });
}
export function joinOriginalRunnerSource(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), originalRunnerPredecessor);
  const receipt = file => { const bytes = read(file); return { bytes, receipt: { file, sha256: hash(bytes) } }; };
  const source = receipt('docs/evidence/material-original-runner-e01.mjs.gz.b64');
  const gzip = Buffer.from(source.bytes.toString().replace(/\s/g, ''), 'base64');
  assert.equal(hash(gzip), 'e4922400a7ee2d64bb531a93a2b490b7478636f45d77dc4d5d854b5321949a85');
  const decoded = gunzipSync(gzip); assert.equal(decoded.length, 96666); assert.equal(hash(decoded), target);
  const capture = receipt('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(capture.receipt.sha256, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const original = JSON.parse(capture.bytes).captureProvenance.harnessFiles.filter(r => r.file === 'tests/material-parity/run-material-parity.mjs');
  assert.equal(original.length, 1); assert.equal(original[0].sha256, target);
  const proof = receipt('tests/material-parity/original-material-runner-source.spec.mjs');
  assert.equal(proof.receipt.sha256, 'd362fd02e63c5a135d7688377281eb4ef88505cd13f7cd5ff34c629cbff7260e');
  const producer = receipt('scripts/join-material-original-runner-source.mjs');
  const evidence = { encoding: 'base64+gzip', encodedSource: source.receipt, decodedBytes: decoded.length,
    proof: proof.receipt, capture: capture.receipt, producer: producer.receipt,
    boundary: 'Original producer source only; observations,all prior dispositions and remaining limitations preserve.' };
  let records = 0; const cases = new Set();
  const groups = predecessor.groups.map(group => {
    const result = transform(group, (key, child, parent) => {
      if (key !== 'unavailableActionSource') return;
      assert.equal(parent.originalActionSource, undefined); assert.equal(child.disposition, missing);
      assert.equal(child.originalLogicalFile, 'tests/material-parity/run-material-parity.mjs'); assert.equal(child.capturedSha256, target);
      records++; cases.add(group.case);
      return { key: 'originalActionSource', value: { ...child, disposition: recovered, sourceEvidence: evidence } };
    });
    assert.equal(result.inspection, group.inspection); assert.equal(result.currentRendering, group.currentRendering); return result;
  });
  assert.equal(records, 9016); assert.equal(cases.size, 2311);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreMissingOriginalRunner(review))), originalRunnerPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), records, cases: cases.size };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.deepEqual(process.argv.slice(2), ['--dry-run'], 'This bounded join does not save a duplicate full proposal or publish canonical evidence.');
  const envelope = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${originalRunnerPredecessor}.json`));
  assert.equal(envelope.sha256, originalRunnerPredecessor);
  const result = joinOriginalRunnerSource(envelope.review);
  console.log(JSON.stringify({ sha256: result.sha256, sourceConditionsReconciled: result.records, cases: result.cases,
    predecessorRecovers: true, caseDispositionsChanged: 0, saved: false, canonicalPublished: false }));
}
