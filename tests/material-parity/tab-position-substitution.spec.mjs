import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectTabPositionSubstitution, proveTabPositionSubstitution } from '../../scripts/audit-material-tab-position-substitution.mjs';
test('all 70 tab cases retain the border-to-positioned-strip substitution', () => {
  assert.deepEqual(collectTabPositionSubstitution(), JSON.parse(readFileSync('docs/material-tab-position-substitution.json')));
});
test('tab proof rejects changed border ownership, positioning and calibrated width evidence', () => {
  const o = collectTabPositionSubstitution().observations[0];
  const find = (t, id) => t.nodes.find(n => (n.attributes?.id ?? n.authored?.id) === id);
  const base = t => t.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mat-mdc-tab-label-container'));
  for (const mutate of [
    ([r]) => { r.styles[base(r).style].borderBottomWidth = '0px'; },
    ([r]) => { base(r).parent = find(r, 'tabs-primary').key; },
    ([, a]) => { find(a, 'tabs-primary').interactionResolvedStyle.position = 'static'; },
    ([, a]) => { find(a, 'tab-baseline').normalResolvedStyle.position = 'relative'; },
    ([, a]) => { find(a, 'tab-indicator').parent = find(a, 'tabs-list').key; },
    ([, a]) => { find(a, 'tab-indicator').resolvedStyle.width = '50%'; },
    ([r]) => { r.errors.push('failed capture'); },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveTabPositionSubstitution(...trees));
  }
});
