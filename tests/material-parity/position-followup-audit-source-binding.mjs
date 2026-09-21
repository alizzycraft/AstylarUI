import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { collectPositionFollowupReview, applyPositionFollowupReview,
  validatePositionFollowupRows, positionFollowupAttribution } from './position-followup-review.mjs';
export { positionFollowupAttribution };
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
function prepare(report) {
  const bytes = readFileSync(capture.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), capture.sha256);
  assert.equal(bindOwnerCaretCaptureSubset(report, JSON.parse(bytes)).coverage.complete, true,
    'followup classification requires complete unchanged original capture');
  const review = collectPositionFollowupReview();
  return { schemaVersion: 1, binding: { status: 'bound', capture }, review,
    observations: review.groups.flatMap(g => g.reviewedCases.map(caseKey => ({
      case: caseKey, family: g.family, element: g.element, property: g.property }))),
    inputEquivalent: false, renderingEquivalent: false };
}
export function collectPositionFollowupAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, observations: [] };
  if (!parityPath) return empty;
  try {
    assert.equal(realpathSync(root), realpathSync(process.cwd()));
    const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
    const target = realpathSync(path.resolve(root, parityPath)), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    const supplied = JSON.parse(readFileSync(target));
    assert.equal(bindOwnerCaretCaptureSubset(report, supplied).coverage.complete, true);
    return prepare(supplied);
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}
export function validatePositionFollowupAuditInputs(evidence) {
  try { assert.deepEqual(evidence, prepare(JSON.parse(readFileSync(capture.file)))); }
  catch (error) { return [`followup position replay failed: ${error}`]; }
  return [];
}
export function validatePositionFollowupAuditClassifications(evidence, rows) {
  try { assert.equal(evidence.binding.status, 'bound'); validatePositionFollowupRows(rows, evidence.review); }
  catch (error) { return [`followup position coverage failed: ${error}`]; }
  return [];
}
export function applyPositionFollowupAuditRows(rows, evidence) {
  if (evidence?.binding?.status !== 'bound') {
    assert.ok(!rows.some(row => row.attribution === positionFollowupAttribution)); return rows;
  }
  assert.deepEqual(validatePositionFollowupAuditInputs(evidence), []);
  const output = applyPositionFollowupReview(rows, evidence.review);
  assert.deepEqual(validatePositionFollowupAuditClassifications(evidence, output), []); return output;
}
