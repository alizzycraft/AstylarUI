import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bindPendingMotionCapture, loadPendingMotionCapture, recordPendingMotionCapture }
  from '../../scripts/bind-material-pending-motion-capture.mjs';

const evidence = await loadPendingMotionCapture();

test('pending motion capture binding retains all original memberships without inventing resolved motion', () => {
  const report = recordPendingMotionCapture(evidence);
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-pending-motion-capture-binding.json')));
  assert.deepEqual(report.counts, { groups: 2, cases: 32, propertyObservations: 64, browserControls: 6 });
  for (const row of report.rows) {
    assert.equal(row.originalMotionDisposition, 'requires-review'); assert.equal(row.priorAttribution, 'unresolved');
    assert.equal(row.classification, 'parity-harness-defect');
    for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'usedGapVerified',
      'originalResolvedMotionVerified', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(row[flag], false);
    assert.ok(row.observations.every(o => o.scalarRetainsCssText === false && o.capturedFullRuleText.includes('var(')));
  }
});

test('pending motion binding rejects changed original identities memberships text longhands and claims', () => {
  const pending = x => x.membership.rows.find(r => r.reviewDisposition === 'requires-review');
  const mutations = [
    x => { x.cssom.originalDialogCases.pop(); },
    x => { x.cssom.originalDialogCases[0] = structuredClone(x.cssom.originalDialogCases[1]); },
    x => { x.cssom.originalDialogCases.reverse(); },
    x => { x.cssom.originalDialogCases[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    x => { x.cssom.originalDialogCases[0].scalarRetainsCssText = true; },
    x => { x.cssom.originalDialogCases[0].cssText = 'transition: none'; },
    x => { delete x.cssom.originalDialogCases[0].longhands['transition-duration']; },
    x => { x.cssom.originalDialogCases[0].longhands['transition-property'].value = 'none'; },
    x => { x.cssom.originalDialogCases[0].longhands['transition-property'].important = true; },
    x => { x.cssom.cases.pop(); }, x => { x.cssom.assertionsPassed = false; },
    x => { pending(x).observations.pop(); }, x => { pending(x).observations[0].candidateRaw = '0px'; },
    x => { pending(x).observations[0].review.reasons = []; },
    x => { pending(x).element = 'dialog-actions'; }, x => { pending(x).inputEquivalent = true; },
    x => { x.membership.canonicalIntegration = true; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.throws(() => bindPendingMotionCapture(changed.membership, changed.cssom), `mutation ${index}`);
  }
});
