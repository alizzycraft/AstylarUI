import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectStaticPositionObservations, proveStaticPositionObservation } from './static-position-observation.mjs';
test('seven same-type populations retain mixed-stage position evidence without computed-value claims', () => {
  assert.deepEqual(collectStaticPositionObservations(), JSON.parse(readFileSync('docs/material-static-position-observation.json')));
});
test('static-position review rejects explicit requests, reset rules, missing stages and changed owner types', () => {
  const entry = collectStaticPositionObservations().reviewed[0].observations[0];
  const node = t => t.nodes.find(n => (n.attributes?.id ?? n.authored?.id) === 'badge-label');
  for (const mutate of [
    ([r]) => { node(r).inline.position = 'static'; },
    ([r]) => { node(r).inline.all = 'initial'; },
    ([r]) => { r.styles[node(r).style].position = 'relative'; },
    ([, a]) => { node(a).normalResolvedStyle.position = 'static'; },
    ([, a]) => { delete node(a).interactionResolvedStyle; },
    ([, a]) => { node(a).authored.type = 'div'; },
    ([, a]) => { a.rules.push({ selector: '#badge-label', all: 'initial' }); },
    ([, a]) => { a.resolvedStyleSource = 'guessed'; },
  ]) {
    const trees = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(entry.inputTrees[s].file)));
    mutate(trees); assert.throws(() => proveStaticPositionObservation(...trees, 'badge-label'));
  }
});
