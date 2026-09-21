import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectVisibilityPopulation, verifyVisibilityMembers, traceVisibilityAncestry } from '../../scripts/audit-material-visibility-population.mjs';

test('visibility population binds all remaining groups and state-owner ancestry to original capture', async () => {
  const report = await collectVisibilityPopulation();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-visibility-input-population.json')));
  assert.deepEqual(report.counts, { groups: 17, observations: 668 });
  assert.equal(report.groups.flatMap(g => g.observations).filter(o => o.ancestry).length, 138);
  assert.equal(report.canonicalAttributionChanged, false);
  assert.equal(report.rendererCauseProven, false);
  assert.equal(report.renderingEquivalent, false);
});

test('visibility membership rejects dropped, duplicated, reordered and invented-value observations', () => {
  const row = { family: 'tabs', reference: 'visible', occurrences: 2,
    cases: ['static:tabs@light/desktop', 'interaction:tabs@light/desktop/activate'], states: ['static', 'activate'] };
  const members = row.cases.map((id, i) => ({ case: id, state: row.states[i],
    reference: { present: true, value: 'visible' }, candidate: { present: false, value: null } }));
  verifyVisibilityMembers(row, members);
  for (const mutate of [m => m.pop(), m => { m[1] = m[0]; }, m => m.reverse(),
    m => { m[0].state = 'other'; }, m => { m[0].reference.value = 'hidden'; },
    m => { m[0].candidate.value = 'visible'; }, m => { m[0].candidate.present = true; }]) {
    const changed = structuredClone(members); mutate(changed);
    assert.throws(() => verifyVisibilityMembers(row, changed));
  }
});

test('ancestry trace retains competing active rules and rejects broken or ambiguous paths', () => {
  const tree = { styles: [{ visibility: 'visible' }], rules: [
    { active: true, declarations: { visibility: { value: 'hidden' } } },
    { active: true, declarations: { visibility: { value: 'visible' } } },
  ], nodes: [
    { key: 'text', parent: 'host', type: 'span', attributes: { 'data-parity-id': 'tab-panel' }, style: 0, rules: [] },
    { key: 'host', parent: null, type: 'div', style: 0, rules: [0, 1] },
  ] };
  const chain = traceVisibilityAncestry(tree, 'reference', 'tab-panel');
  assert.deepEqual(chain[1].rules, tree.rules);
  const hiddenDuplicate = structuredClone(tree);
  hiddenDuplicate.styles.push({ visibility: 'hidden' });
  hiddenDuplicate.nodes.unshift({ ...structuredClone(tree.nodes[0]), key: 'hidden-text', style: 1 });
  assert.deepEqual(traceVisibilityAncestry(hiddenDuplicate, 'reference', 'tab-panel'), chain);
  const candidate = { nodes: [
    { key: 'text', parent: 'root', authored: { id: 'tab-panel', type: 'span' }, resolvedStyle: {} },
    { key: 'root', parent: null, authored: {} },
  ] };
  assert.equal(traceVisibilityAncestry(candidate, 'astylar', 'tab-panel')[1].visibilityNotCaptured, true);
  candidate.nodes[1].authored.id = 'unexpected';
  assert.throws(() => traceVisibilityAncestry(candidate, 'astylar', 'tab-panel'));
  for (const mutate of [t => t.nodes.pop(), t => t.nodes.push(structuredClone(t.nodes[0])),
    t => { t.nodes[1].parent = 'text'; }, t => { t.nodes[1].rules.push(9); },
    t => { t.nodes[1].style = 9; }]) {
    const changed = structuredClone(tree); mutate(changed);
    assert.throws(() => traceVisibilityAncestry(changed, 'reference', 'tab-panel'));
  }
});
