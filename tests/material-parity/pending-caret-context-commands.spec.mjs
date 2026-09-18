import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
function run(script) {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  return JSON.parse(execFileSync(process.execPath, [script], {
    cwd: root, env, encoding: 'utf8', maxBuffer: 1024 * 1024,
  }));
}

test('pending tooltip context retains complete replay and historical/current source rejection controls', () => {
  const r = run('scripts/check-material-tooltip-caret-context.mjs');
  assert.deepEqual([r.cases, r.originalScalarChecks, r.rootProperties], [18, 1602, 3816]);
  assert.equal(r.negativeControls, 34); assert.equal(r.parentSourceRejectionControls, 4);
  assert.equal(r.changedObservationControls, 2); assert.equal(r.savedReportMatches, true);
  assert.equal(r.evidenceFilesWritten, false);
});

test('pending overlay context uses the real on-disk reader without losing declarations or source population', () => {
  const r = run('scripts/check-material-overlay-caret-context.mjs');
  assert.deepEqual([r.groups, r.cases, r.observations, r.originalScalarChecks], [13, 109, 378, 33642]);
  assert.deepEqual([r.scalarRuleGapObservations, r.motionRequestObservations, r.directCaretOrResetObservations], [59, 210, 0]);
  assert.equal(r.negativeControls, 15); assert.equal(r.changedEvidenceControls, 13);
  assert.equal(r.conservationControls, 12); assert.equal(r.sourceReplayMatchesSaved, true);
  assert.equal(r.onDiskLegacyReaderPasses, true); assert.equal(r.filesWritten, false);
});
