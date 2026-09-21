import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { alignmentSurveyBaseline, verifyAlignmentAuditProjection, verifyAlignmentCollectorProjection } from './alignment-survey-conservation.mjs';

const target = 'docs/material-explicit-cursor-inputs.json';
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const helperFile = 'scripts/audit-material-vertical-align-population.mjs';
const lf = bytes => bytes.toString().replaceAll('\r\n', '\n');
const hash = bytes => createHash('sha256').update(lf(bytes)).digest('hex');

// Keep the historical report immutable; only authenticated source receipts are
// projected back in a copy. Every observation and every other receipt must match.
export function assertExplicitCursorCensusConserved(replay, { read = readFileSync } = {}) {
  const savedBytes = read(target);
  assert.equal(hash(savedBytes), 'e6b98e2580716e8c5d597bb244ff575571604d8df8be5de5cdf9ac3dd5b637c2');
  const saved = JSON.parse(savedBytes), projected = structuredClone(replay), receipts = [];
  for (const file of [moduleFile, helperFile]) {
    const historical = execFileSync('git', ['show', `${alignmentSurveyBaseline}:${file}`], { maxBuffer: 8 * 1024 * 1024 });
    const current = read(file);
    if (file === moduleFile) verifyAlignmentAuditProjection(historical, current);
    else verifyAlignmentCollectorProjection('docs/material-vertical-align-population.json', historical, current);
    const oldRows = saved.sourceFingerprints.filter(row => row.file === file);
    const newRows = projected.sourceFingerprints.filter(row => row.file === file);
    assert.equal(oldRows.length, 1); assert.equal(newRows.length, 1);
    assert.equal(oldRows[0].sha256, hash(historical));
    assert.equal(newRows[0].sha256, hash(current));
    receipts.push({ file, historical: oldRows[0].sha256, current: newRows[0].sha256 });
    newRows[0].sha256 = oldRows[0].sha256;
  }
  assert.deepEqual(projected, saved, 'cursor evidence differs beyond authenticated source projections');
  return { receipts, allOtherEvidenceConserved: true, savedReportsRewritten: false };
}
