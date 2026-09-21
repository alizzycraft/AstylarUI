import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectVisibilityAncestry, resolveVisibilityOwner, visibilityOwnerChain } from '../../scripts/audit-material-visibility-ancestry.mjs';

test('all 668 visibility observations retain authenticated owner ancestry', () => {
  const report = collectVisibilityAncestry();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-visibility-ancestry.json')));
  assert.deepEqual(report.counts, { groups: 17, observations: 668, authenticatedTrees: 646 });
  for (const g of report.groups) {
    assert.equal(g.counts.referenceVisibilityRuleOwners, ['tabs', 'stepper'].includes(g.family) ? g.counts.observations : 0);
    assert.equal(g.counts.referenceHiddenAncestors, 0);
    assert.equal(g.counts.candidateExplicitVisibility, 0);
    for (const o of g.observations) {
      assert.ok(o.chains.reference.every(n => n.visibility.present && n.visibility.value === 'visible'));
      assert.ok(o.chains.astylar.every(n => n.visibilityNotCaptured || !n.visibility.present));
    }
  }
  assert.equal(report.canonicalAttributionChanged, false);
});

test('owner chains reject structural corruption and retain inline declarations', () => {
  const tree = { nodes: [
    { key: 'child', parent: 'parent', type: 'div', style: 0, rules: [], inline: { visibility: { value: 'visible' } } },
    { key: 'parent', parent: null, type: 'div', style: 0, rules: [] },
  ], styles: [{ visibility: 'visible' }], rules: [] };
  assert.deepEqual(visibilityOwnerChain(tree, 'child', 'reference')[0].inlineVisibility, { value: 'visible' });
  for (const mutate of [t => t.nodes.pop(), t => t.nodes.push({ ...t.nodes[0] }),
    t => { t.nodes[1].parent = 'child'; }, t => { t.nodes[0].style = 10; },
    t => { t.nodes[0].rules.push(10); }]) {
    const changed = structuredClone(tree); mutate(changed);
    assert.throws(() => visibilityOwnerChain(changed, 'child', 'reference'));
  }
});

test('visibility owner selection rejects ambiguous owners and unknown aliases', () => {
  const tree = { errors: [], nodes: [{ key: 'owner', attributes: { id: 'chip-0' } }] };
  assert.equal(resolveVisibilityOwner(tree, 'chips', 'chip-0').key, 'owner');
  assert.throws(() => resolveVisibilityOwner(tree, 'chips', 'unreviewed'));
  tree.nodes.push({ key: 'duplicate', attributes: { id: 'chip-0' } });
  assert.throws(() => resolveVisibilityOwner(tree, 'chips', 'chip-0'));
  tree.nodes.pop(); tree.errors.push('capture failed');
  assert.throws(() => resolveVisibilityOwner(tree, 'chips', 'chip-0'));
});
