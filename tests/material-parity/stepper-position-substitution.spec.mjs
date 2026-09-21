import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectStepperPositionSubstitution, proveStepperPositionSubstitution } from '../../scripts/audit-material-stepper-position-substitution.mjs';
test('all stepper position cases preserve the alternative header layout evidence', () => {
  const report = collectStepperPositionSubstitution();
  assert.equal(new Set(report.observations.map(o => o.case)).size, 68);
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-stepper-position-substitution.json')));
});
test('stepper proof rejects altered flex, border, header and positioning evidence', () => {
  const o = collectStepperPositionSubstitution().observations[0];
  const find = (t, id) => t.nodes.find(n => n.authored?.id === id);
  const line = t => t.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mat-stepper-horizontal-line'));
  for (const mutate of [
    ([r]) => { r.styles[line(r).style].flexGrow = '0'; },
    ([r]) => { r.styles[line(r).style].borderTopWidth = '0px'; },
    ([, a]) => { find(a, 'step-details').normalResolvedStyle.position = 'relative'; },
    ([, a]) => { find(a, 'step-review').resolvedStyle.width = 'auto'; },
    ([, a]) => { find(a, 'step-connector').parent = find(a, 'stepper-primary').key; },
    ([, a]) => { find(a, 'step-connector').resolvedStyle.width = '100%'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveStepperPositionSubstitution(...trees));
  }
});
