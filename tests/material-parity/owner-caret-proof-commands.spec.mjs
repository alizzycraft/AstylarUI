import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Register the previously standalone, complete-source proofs in automatic
// harness discovery. Each command retains its original mutation controls and
// canonical-file conservation checks; these are not mocked summaries.
const root = fileURLToPath(new URL('../../', import.meta.url));
function run(script) {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  return JSON.parse(execFileSync(process.execPath, [script], {
    cwd: root, env, encoding: 'utf8', maxBuffer: 1024 * 1024,
  }));
}

test('owner caret planned coverage command retains all source members and rejection controls', () => {
  const result = run('scripts/check-material-owner-caret-coverage.mjs');
  assert.deepEqual([result.originalCasesScanned, result.reviewedGroups, result.reviewedObservations,
    result.pendingGroups, result.pendingObservations], [2311, 118, 3154, 27, 896]);
  assert.equal(result.negativeControls, 17); assert.equal(result.positiveControls, 3);
  assert.equal(result.fullOriginalAttributionReplayMatches, true);
  assert.equal(result.canonicalUnchanged, true);
});

test('owner caret source command authenticates the complete original replay and classifications', () => {
  const result = run('scripts/check-material-owner-caret-source-binding.mjs');
  assert.deepEqual([result.originalCases, result.selectedCases, result.observations,
    result.reviewedGroups, result.reviewedObservations, result.retainedObservations], [2311, 1734, 4050, 118, 3154, 896]);
  assert.equal(result.negativeControls, 13);
  assert.equal(result.completeBindingReplayMatches, true);
  assert.equal(result.producedCoverageMatches, true); assert.equal(result.canonicalUnchanged, true);
});

test('owner caret subset command retains missing populations and rejects forged completeness', () => {
  const result = run('scripts/check-material-owner-caret-subset-binding.mjs');
  assert.deepEqual([result.originalCases, result.originalInputs, result.originalObservations], [2311, 6946, 4050]);
  assert.deepEqual([result.subsetCases, result.subsetInputs, result.subsetObservations,
    result.reviewedSubsetObservations, result.pendingSubsetObservations], [4, 4, 4, 2, 2]);
  assert.deepEqual([result.missingCases, result.missingInputs, result.missingObservations], [2307, 6942, 4046]);
  assert.equal(result.negativeControls, 15);
  assert.equal(result.partialReplayMatches, true); assert.equal(result.completeCoveragePreserved, true);
  assert.equal(result.inputEquivalent, false); assert.equal(result.renderingEquivalent, false);
});
