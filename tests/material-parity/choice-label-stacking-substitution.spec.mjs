import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectChoiceLabelStacking, proveChoiceLabelStacking } from './choice-label-stacking-substitution.mjs';
test('all 204 choice-label observations preserve stacking and control ownership differences', () => {
  assert.deepEqual(collectChoiceLabelStacking(), JSON.parse(readFileSync('docs/material-choice-label-stacking-substitution.json')));
});
test('choice-label proof rejects changed label association, z-order, insets and layer ownership', () => {
  const g = collectChoiceLabelStacking().groups[0], o = g.observations[0];
  const pick = (t, id) => t.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const mutate of [
    ([r]) => { r.nodes.find(n => n.key === pick(r, g.element).parent).attributes.for = 'missing'; },
    ([r]) => { r.styles[pick(r, g.element).style].zIndex = '2'; },
    ([, a]) => { pick(a, g.element).normalResolvedStyle.top = '0'; },
    ([, a]) => { pick(a, 'checkbox-state-layer').parent = 'unrelated'; },
    ([, a]) => { pick(a, 'checkbox-state-layer').interactionResolvedStyle.zIndex = '1'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveChoiceLabelStacking(...trees, g.element));
  }
});
