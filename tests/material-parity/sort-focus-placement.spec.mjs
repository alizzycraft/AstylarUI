import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectSortFocusPlacement, proveSortFocusPlacement } from '../../scripts/audit-material-sort-focus-placement.mjs';

test('sort placement review replays the full 60-case population and checked evidence', () => {
  const actual = collectSortFocusPlacement();
  assert.deepEqual(actual, JSON.parse(readFileSync('docs/material-sort-focus-placement.json')));
  assert.deepEqual(actual.counts, { observations: 60, focus: 8 });
});

test('sort focus proof rejects changed border, ancestry, paint and state evidence', () => {
  const report = collectSortFocusPlacement(), entry = report.observations.find(o => o.focused);
  const load = () => ['reference', 'astylar'].map(side => JSON.parse(readFileSync(entry.inputTrees[side].file)));
  const find = (t, id) => t.nodes.find(n => (n.attributes?.id ?? n.authored?.id) === id);
  const owner = t => t.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mat-sort-header-container'));
  for (const mutate of [
    ([r]) => { r.styles[owner(r).style].borderBottomWidth = '0px'; },
    ([r]) => { r.styles[owner(r).style].borderBottomStyle = 'dashed'; },
    ([r]) => { owner(r).parent = find(r, 'sort-primary').key; },
    ([, a]) => { find(a, 'sort-primary').normalResolvedStyle.position = 'static'; },
    ([, a]) => { find(a, 'sort-focus-line').resolvedStyle.position = 'relative'; },
    ([, a]) => { find(a, 'sort-focus-line').resolvedStyle.top = '0px'; },
    ([, a]) => { find(a, 'sort-focus-line').parent = find(a, 'sort-trigger').key; },
    ([, a]) => { a.nodes.push(structuredClone(find(a, 'sort-focus-line'))); },
    ([r]) => { r.errors.push('capture failed'); },
  ]) {
    const trees = load(); mutate(trees);
    assert.throws(() => proveSortFocusPlacement(...trees, entry.case));
  }
  assert.throws(() => proveSortFocusPlacement(...load(), entry.case.replace('/focus', '/hover')));
});
