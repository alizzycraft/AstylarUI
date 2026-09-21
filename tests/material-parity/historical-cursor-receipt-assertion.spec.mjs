import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cursorArtifactRoot, validateCursorEvidence } from './public-cursor-defaults-evidence.mjs';
import { assertHistoricalCursorReceipt } from './historical-cursor-receipt-assertion.mjs';

const file = 'docs/material-public-cursor-defaults-audit.json';
const result = validateCursorEvidence(JSON.parse(readFileSync(`${cursorArtifactRoot}/latest-report.json`)));
test('historical cursor receipts retain raw provenance and every current evidence field', () => {
  const before = readFileSync(file), original = JSON.stringify(result);
  const proof = assertHistoricalCursorReceipt(result);
  assert.equal(proof.receipts.length, 4); assert.equal(proof.allOtherEvidenceConserved, true);
  assert.deepEqual(readFileSync(file), before); assert.equal(JSON.stringify(result), original);
});
test('receipt reconciliation rejects changes to evidence, source identity, and raw hashes', () => {
  for (const mutate of [
    r => { r.cases--; },
    r => { r.sourceProof.controls[0].result = 'wait'; },
    r => { r.sourceProof.witnesses[0].sha256 = '0'.repeat(64); },
    r => { r.sourceProof.witnesses[0].projectionSha256 = '0'.repeat(64); },
    r => { r.sourceProof.witnesses[0].installedSha256 = '0'.repeat(64); },
    r => { r.sourceProof.witnesses.push(r.sourceProof.witnesses[0]); },
  ]) {
    const changed = structuredClone(result); mutate(changed);
    assert.throws(() => assertHistoricalCursorReceipt(changed));
  }
  assert.throws(() => assertHistoricalCursorReceipt(result, { read: name =>
    name.endsWith('browser-defaults.ts') ? Buffer.from(readFileSync(name, 'utf8') + '\n// changed source\n') : readFileSync(name) }));
  assert.throws(() => assertHistoricalCursorReceipt(result, { read: name =>
    name === file ? Buffer.from('{}') : readFileSync(name) }));
});
