import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPanelStateOwnership, inspectPanelState } from '../../scripts/audit-material-panel-state-ownership.mjs';

test('all tab and stepper captures bind active text and unequal retained state owners', () => {
  const report = collectPanelStateOwnership();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-panel-state-ownership.json')));
  assert.deepEqual(report.counts, { observations: 138, tabs: 70, stepper: 68 });
  assert.equal(new Set(report.observations.map(o => o.case)).size, 138);
  assert.ok(report.observations.every(o => o.classification === 'application-plugin-authoring-defect'
    && o.selectedTextMatches && !o.equivalentStateOwnerStructure));
  assert.equal(report.liveAnimationTested, false);
  assert.equal(report.canonicalAttributionChanged, false);
});

test('state-owner proof rejects broken content, linkage, hidden-state or benchmark assumptions', () => {
  const population = JSON.parse(readFileSync('docs/material-visibility-input-population.json'));
  for (const family of ['tabs', 'stepper']) {
    const source = population.groups.find(g => g.family === family).observations[0];
    const reference = JSON.parse(readFileSync(source.inputTrees.reference.file));
    const candidate = JSON.parse(readFileSync(source.inputTrees.astylar.file));
    const panel = t => t.nodes.find(n => n.attributes?.role === 'tabpanel');
    const inactive = t => t.nodes.find(n => n.attributes?.role === 'tabpanel' && Object.hasOwn(n.attributes, 'inert'));
    const target = t => t.nodes.find(n => n.authored?.role === 'tabpanel');
    inspectPanelState(reference, candidate, family);
    for (const mutate of [
      (r, a) => a.nodes.push(structuredClone(target(a))),
      r => { delete inactive(r).attributes.inert; },
      r => { panel(r).attributes['aria-labelledby'] = 'missing'; },
      r => { panel(r).style = 99999; },
      r => { r.errors.push('bad capture'); },
      (r, a) => { target(a).authored.id = 'other'; },
      (r, a) => { if (family === 'tabs') target(a).authored.data.phase = 0.5;
        else target(a).authored.textContent = 'Wrong content'; },
    ]) {
      const r = structuredClone(reference), a = structuredClone(candidate); mutate(r, a);
      assert.throws(() => inspectPanelState(r, a, family));
    }
  }
});
