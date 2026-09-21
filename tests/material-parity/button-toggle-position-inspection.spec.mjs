import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectTogglePositionInspection, proveTogglePositionInspection } from './button-toggle-position-inspection.mjs';
test('toggle inspection covers all three position owners across 68 paired states', () => {
  assert.deepEqual(collectTogglePositionInspection(), JSON.parse(readFileSync('docs/material-button-toggle-position-inspection.json')));
});
test('toggle proof rejects changed clipping, layers, state and candidate positioning', () => {
  const o = collectTogglePositionInspection().observations[0];
  const pick = (t, id) => t.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const mutate of [
    ([r]) => { r.styles[pick(r, 'button-toggle-primary').style].overflowX = 'visible'; },
    ([r]) => { const n = r.nodes.find(n => n.attributes?.class === 'mat-button-toggle-focus-overlay'); r.styles[n.style].position = 'static'; },
    ([, a]) => { pick(a, 'button-toggle-two').authored.ariaChecked = false; },
    ([, a]) => { pick(a, 'button-toggle-one').interactionResolvedStyle.position = 'relative'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveTogglePositionInspection(...trees));
  }
});
