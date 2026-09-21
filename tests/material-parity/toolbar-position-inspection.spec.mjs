import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectToolbarPositionInspection, proveToolbarPositionInspection } from './toolbar-position-inspection.mjs';
test('all 52 toolbar cases retain authenticated spacing and position evidence', () => {
  assert.deepEqual(collectToolbarPositionInspection(), JSON.parse(readFileSync('docs/material-toolbar-position-inspection.json')));
});
test('toolbar inspection rejects changed ownership, spacer, padding, positioning and width', () => {
  const o = collectToolbarPositionInspection().observations[0];
  const pick = (t, id) => t.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const mutate of [
    ([r]) => { pick(r, 'toolbar-title').parent = 'unrelated'; },
    ([r]) => { const n = r.nodes.find(n => n.attributes?.class === 'spacer'); r.styles[n.style].flexGrow = '0'; },
    ([r]) => { r.styles[pick(r, 'toolbar-primary').style].padding = '0px'; },
    ([, a]) => { pick(a, 'toolbar-action').normalResolvedStyle.position = 'absolute'; },
    ([, a]) => { pick(a, 'toolbar-title').resolvedStyle.width = 'auto'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveToolbarPositionInspection(...trees));
  }
});
