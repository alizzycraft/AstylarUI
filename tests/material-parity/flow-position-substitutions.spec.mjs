import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectFlowPositionSubstitutions, proveFlowPositionSubstitution } from '../../scripts/audit-material-flow-position-substitutions.mjs';
test('complete divider and switch populations retain non-equivalent flow requests', () => {
  const report = collectFlowPositionSubstitutions();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-flow-position-substitutions.json')));
  assert.deepEqual(report.counts, { groups: 3, scalarObservations: 160 });
});
test('flow proof rejects changed label position, reference context and divider paint model', () => {
  const load = family => ['reference', 'astylar'].map(side => JSON.parse(readFileSync(
    `artifacts/material-parity/current-ancestry-audit/${family}/light/desktop/${side}-input-tree.json`)));
  const find = (tree, id) => tree.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const [family, id, mutate] of [
    ['divider', 'divider-primary', ([r]) => { r.styles[find(r, 'divider-primary').style].height = '1px'; }],
    ['divider', 'divider-primary', ([, a]) => { find(a, 'divider-primary').resolvedStyle.borderWidth = '1px'; }],
    ['slide-toggle', 'slide-toggle-label', ([, a]) => { find(a, 'slide-toggle-label').normalResolvedStyle.position = 'static'; }],
    ['slide-toggle', 'slide-toggle-label', ([, a]) => { find(a, 'slide-toggle-label').resolvedStyle.top = '7px'; }],
    ['slide-toggle', 'slide-toggle-primary', ([r]) => { const label = find(r, 'slide-toggle-label');
      r.nodes.find(n => n.key === label.parent).type = 'div'; }],
  ]) { const args = load(family); mutate(args); assert.throws(() => proveFlowPositionSubstitution(...args, id)); }
});
