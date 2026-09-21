import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectGridPositionSubstitution, proveGridPositionSubstitution } from '../../scripts/audit-material-grid-position-substitution.mjs';
test('all 52 grid compositions retain the authored positioning substitution', () => {
  const report = collectGridPositionSubstitution();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-grid-position-substitution.json')));
  assert.deepEqual(report.counts, { groups: 3, scalarObservations: 156, completeTreePairs: 52 });
  assert.ok(report.observations.every(o => o.proof.rendererCauseProven === false));
});
test('grid substitution proof rejects changed positioning, gutter, stages and owner membership', () => {
  const dir = 'artifacts/material-parity/current-ancestry-audit/grid-list/light/desktop/';
  const original = ['reference', 'astylar'].map(s => JSON.parse(readFileSync(`${dir}${s}-input-tree.json`)));
  const refTile = t => t.nodes.find(n => n.attributes?.id === 'grid-tile-one');
  const astTile = t => t.nodes.find(n => n.authored?.id === 'grid-tile-one');
  const astRoot = t => t.nodes.find(n => n.authored?.id === 'grid-list-primary');
  for (const mutate of [
    ([r]) => { r.styles[refTile(r).style].position = 'relative'; },
    ([r]) => { refTile(r).inline.width.value = '50%'; },
    ([, a]) => { astRoot(a).resolvedStyle.gap = '1px'; },
    ([, a]) => { astRoot(a).resolvedStyle.position = 'static'; },
    ([, a]) => { astTile(a).normalResolvedStyle.position = 'absolute'; },
    ([, a]) => { astTile(a).parent = null; },
    ([, a]) => { a.nodes.push(structuredClone(astTile(a))); },
  ]) {
    const args = structuredClone(original); mutate(args); assert.throws(() => proveGridPositionSubstitution(...args));
  }
});
