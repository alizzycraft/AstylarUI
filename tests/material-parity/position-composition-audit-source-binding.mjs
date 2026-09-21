import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { collectPositionCompositionReview, applyPositionCompositionReview,
  validatePositionCompositionRows, positionCompositionAttribution } from './position-composition-review.mjs';

export { positionCompositionAttribution };
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };

function prepare(report) {
  const bytes = readFileSync(capture.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), capture.sha256);
  assert.equal(bindOwnerCaretCaptureSubset(report, JSON.parse(bytes)).coverage.complete, true,
    'position review requires complete unchanged original capture');
  const review = collectPositionCompositionReview();
  return { schemaVersion: 1, binding: { status: 'bound', capture }, review,
    observations: review.groups.flatMap(group => group.reviewedCases.map(caseKey => ({
      case: caseKey, family: group.family, element: group.element, property: group.property }))),
    inputEquivalent: false, renderingEquivalent: false };
}

export function collectPositionAuditInputs(report, { root = process.cwd(), parityPath } = {}) {
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

export function validatePositionAuditInputs(evidence) {
  try { assert.deepEqual(evidence, prepare(JSON.parse(readFileSync(capture.file)))); }
  catch (error) { return [`position evidence replay failed: ${error}`]; }
  return [];
}

export function validatePositionAuditClassifications(evidence, rows) {
  try {
    assert.equal(evidence.binding.status, 'bound');
    validatePositionCompositionRows(rows, evidence.review);
  } catch (error) { return [`position classification coverage failed: ${error}`]; }
  return [];
}

export function applyPositionAuditRows(rows, evidence) {
  if (evidence?.binding?.status !== 'bound') {
    assert.ok(!rows.some(row => row.attribution === positionCompositionAttribution));
    return rows;
  }
  assert.deepEqual(validatePositionAuditInputs(evidence), []);
  const output = applyPositionCompositionReview(rows, evidence.review);
  assert.deepEqual(validatePositionAuditClassifications(evidence, output), []);
  return output;
}
