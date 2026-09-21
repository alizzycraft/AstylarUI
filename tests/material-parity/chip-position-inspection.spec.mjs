import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectChipPositionInspection, proveChipPositionInspection } from './chip-position-inspection.mjs';
test('chips retain three complete source-backed owner groups across 76 states', () => {
  assert.deepEqual(collectChipPositionInspection(), JSON.parse(readFileSync('docs/material-chip-position-inspection.json')));
});
test('chip inspection rejects altered wrapper, selection, position, graphic and sizing', () => {
  const o = collectChipPositionInspection().observations[0];
  const pick = (t, id) => t.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
  for (const mutate of [
    ([r]) => { pick(r, 'chip-0').parent = 'unrelated'; },
    ([, a]) => { pick(a, 'chip-0').authored.ariaSelected = false; },
    ([, a]) => { pick(a, 'chip-0').normalResolvedStyle.position = 'static'; },
    ([, a]) => { pick(a, 'chip-1').resolvedStyle.width = 'auto'; },
    ([r]) => { const n = r.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mdc-evolution-chip__graphic')); r.styles[n.style].position = 'static'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(o.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveChipPositionInspection(...trees));
  }
});
