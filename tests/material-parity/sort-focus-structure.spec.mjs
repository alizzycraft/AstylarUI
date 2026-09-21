import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectSortFocusStructure, inspectSortTrees } from '../../scripts/audit-material-sort-focus-structure.mjs';

test('sort focus structure replays all authenticated source trees without equating paint substitutes', () => {
  const report = collectSortFocusStructure();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-sort-focus-structure.json')));
  assert.deepEqual(report.counts, { observations: 60, referenceBorder: 8, candidateSeparateLine: 8 });
  assert.equal(report.rendererDefectProven, false);
  assert.equal(report.canonicalAttributionChanged, false);
  for (const observation of report.observations) {
    assert.equal(observation.referenceBorderPresent, observation.candidateSeparateLinePresent);
    if (observation.candidateSeparateLinePresent) {
      assert.equal(observation.reference.style.borderBottomWidth, '1px');
      assert.equal(observation.candidate.trigger.borderWidth, '0');
      assert.equal(observation.candidate.line.top, observation.candidate.host.height);
    }
  }
});

test('sort structure proof rejects missing or ambiguous paint ownership', () => {
  const prefix = 'artifacts/material-parity/current-ancestry-audit/interactions/sort/light/desktop-dpr1/focus/';
  const reference = JSON.parse(readFileSync(prefix + 'reference-input-tree.json'));
  const candidate = JSON.parse(readFileSync(prefix + 'astylar-input-tree.json'));
  for (const mutate of [
    tree => tree.nodes.find(n => n.authored?.id === 'sort-focus-line').parent = 'wrong-owner',
    tree => tree.nodes.find(n => n.authored?.id === 'sort-focus-line').resolvedStyle.position = 'static',
    tree => tree.nodes.push(structuredClone(tree.nodes.find(n => n.authored?.id === 'sort-focus-line'))),
    tree => tree.nodes = tree.nodes.filter(n => n.authored?.id !== 'sort-trigger'),
  ]) {
    const changed = structuredClone(candidate); mutate(changed);
    assert.throws(() => inspectSortTrees(reference, changed));
  }
  const changed = structuredClone(reference);
  changed.nodes.push(structuredClone(changed.nodes.find(n => n.attributes?.class?.startsWith('mat-sort-header-container'))));
  assert.throws(() => inspectSortTrees(changed, candidate));
});
