import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectTabPositionSubstitution, proveTabPositionSubstitution, proveTabControlStage } from '../../scripts/audit-material-tab-position-substitution.mjs';

test('all 140 tab labels compare a different box while three control stages agree', () => {
  const observations = collectTabPositionSubstitution().observations;
  const heights = {}, properties = ['height', 'boxSizing', 'flexShrink'];
  let count = 0, first;
  for (const observation of observations) {
    const trees = ['reference', 'astylar'].map(side => JSON.parse(readFileSync(observation.inputTrees[side].file)));
    first ??= trees;
    for (const id of ['tab-overview', 'tab-activity']) {
      const proof = proveTabControlStage(...trees, id);
      assert.deepEqual(proof.attributableProperties, properties);
      assert.equal(proof.inputEquivalent, false);
      assert.equal(proof.rendererCauseProven, false);
      heights[proof.controlValues.height] = (heights[proof.controlValues.height] ?? 0) + 1;
      count++;
    }
  }
  assert.equal(count, 140);
  assert.deepEqual(heights, { '48px': 72, '32px': 34, '40px': 34 });
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    for (const property of properties) {
      const trees = structuredClone(first);
      trees[1].nodes.find(n => n.authored?.id === 'tab-overview')[stage][property] = 'forged';
      assert.throws(() => proveTabControlStage(...trees, 'tab-overview'));
    }
  }
  for (const mutate of [
    ([r]) => { const n = r.nodes.find(n => n.attributes?.id === 'tab-overview'); n.parent = n.key; },
    ([r]) => { r.nodes.push(structuredClone(r.nodes.find(n => n.attributes?.id === 'tab-overview'))); },
    ([, a]) => { a.nodes.find(n => n.authored?.id === 'tab-overview').authored.role = 'button'; },
    ([r]) => { r.errors.push('capture failed'); },
  ]) {
    const trees = structuredClone(first); mutate(trees);
    assert.throws(() => proveTabControlStage(...trees, 'tab-overview'));
  }
});
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
