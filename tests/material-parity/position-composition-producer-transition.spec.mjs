import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restorePositionProducer } from './position-composition-producer-transition.mjs';

test('position producer integration preserves every prior byte outside the exact added boundary', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const prior = execFileSync('git', ['show', 'e62e846:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePositionProducer(current).restoredSource, prior);
  const beforeFollowup = execFileSync('git', ['show', 'e8c7d25:' + file], { encoding: 'utf8', maxBuffer: 4000000 }).replaceAll('\r\n', '\n');
  assert.equal(restorePositionProducer(current, { followupOnly: true }).restoredSource, beforeFollowup);
  assert.throws(() => restorePositionProducer(beforeFollowup, { followupOnly: true }));
  for (const mutated of [
    current + '\n// unrelated change\n',
    current.replace('applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs)', 'visibilityReviewedDiscrepancies'),
    current.replace('    positionAuditInputs,', '    positionAuditInputs: {},'),
    current.replace('[positionCompositionAttribution], validatePositionAuditInputs', '[], validatePositionAuditInputs'),
    current.replace('function reviewedButtonPaintInput(', 'function differentPaintInput('),
    current.replace("    'docs/material-position-input-population.json',\n", ''),
    current.replace('applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs)', 'positionReviewedDiscrepancies'),
    current.replace('    positionFollowupAuditInputs,', '    positionFollowupAuditInputs: {},'),
    current.replace('[positionFollowupAttribution], validatePositionFollowupAuditInputs', '[], validatePositionFollowupAuditInputs'),
    current.replace("    'tests/material-parity/position-followup-review.mjs',\n", ''),
    current.replace('applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs)', 'positionFollowupDiscrepancies'),
    current.replace('    chipPaintAuditInputs,', '    chipPaintAuditInputs: {},'),
    current.replace("    'docs/material-chip-paint-review.json',\n", ''),
  ]) {
    assert.notEqual(mutated, current);
    assert.throws(() => restorePositionProducer(mutated));
  }
});
