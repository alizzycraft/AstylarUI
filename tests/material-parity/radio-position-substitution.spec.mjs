import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectRadioPositionSubstitution, proveRadioPositionSubstitution } from './radio-position-substitution.mjs';
test('all 68 radio cases retain original inline-to-absolute placement differences', () => {
  assert.deepEqual(collectRadioPositionSubstitution(), JSON.parse(readFileSync('docs/material-radio-position-substitution.json')));
});
test('radio placement proof rejects altered flow, ownership, stage and offsets', () => {
  const o = collectRadioPositionSubstitution().observations[0];
  const pick = (t, id) => t.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const mutate of [
    ([r]) => { r.styles[pick(r, 'radio-primary').style].display = 'flex'; },
    ([, a]) => { pick(a, 'radio-solo').parent = 'unrelated'; },
    ([, a]) => { pick(a, 'radio-team').normalResolvedStyle.position = 'static'; },
    ([, a]) => { pick(a, 'radio-team').resolvedStyle.left = '74px'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveRadioPositionSubstitution(...trees));
  }
});
