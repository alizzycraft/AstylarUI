import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectButtonStatePaint, observeButtonStatePaint } from '../../scripts/audit-material-button-state-paint.mjs';

test('button state paint survey replays all shared hosts without claiming composition equivalence', () => {
  const report = collectButtonStatePaint();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-button-state-paint-survey.json')));
  assert.equal(report.cases, 114); assert.equal(report.owners, 146);
  assert.equal(report.activeLayerOwners, 114); assert.equal(report.inactiveLayerOwners, 32);
  assert.ok(report.observations.every(o => !o.inputEquivalent && !o.renderingEquivalent && !o.rendererCauseProven));
  assert.deepEqual([...new Set(report.observations.map(o => o.family))].sort(),
    ['bottom-sheet', 'button', 'core', 'dialog', 'menu', 'snack-bar', 'tooltip']);
  assert.equal(report.observations.filter(o => o.reference.pseudo.opacity === '0.12' &&
    o.candidate.effective.background === o.candidate.sharedStateRules.find(r => r.selector === '.material-button:hover')?.background).length, 17);
});

test('button paint observations reject identity stage and generated-layer corruption', () => {
  const report = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const originalItem = report.interactions.find(c => c.family === 'button' && c.profile === 'light' &&
    c.viewport.id === 'desktop-dpr1' && c.state === 'hover');
  const originalReference = JSON.parse(readFileSync(originalItem.inputTrees.reference.file));
  const originalCandidate = JSON.parse(readFileSync(originalItem.inputTrees.astylar.file));
  const run = mutate => {
    const item = structuredClone(originalItem), reference = structuredClone(originalReference), candidate = structuredClone(originalCandidate);
    const node = candidate.nodes.find(n => n.authored?.id === 'button-primary');
    const host = reference.nodes.find(n => n.attributes?.id === node.authored.id);
    const layer = reference.nodes.find(n => n.parent === host.key && n.attributes?.class?.includes('persistent-ripple'));
    mutate({ item, reference, candidate, node, host, layer });
    return observeButtonStatePaint(item, node, reference, candidate);
  };
  assert.equal(run(() => {}).reference.pseudo.opacity, '0.08');
  const mutations = [
    ({ item }) => { item.styleInputs = item.styleInputs.filter(i => i.id !== 'button-primary'); },
    ({ item }) => { item.styleInputs.push(item.styleInputs.find(i => i.id === 'button-primary')); },
    ({ reference, host }) => { reference.nodes.push(host); },
    ({ host }) => { host.attributes.id = 'wrong'; },
    ({ layer }) => { layer.parent = 'detached'; },
    ({ layer }) => { layer.pseudoElements[0].generated = false; },
    ({ reference, layer }) => { reference.styles[layer.pseudoElements[0].style].opacity = '0.6'; },
    ({ reference, host }) => { reference.styles[host.style].backgroundColor = 'red'; },
    ({ candidate }) => { candidate.resolvedStyleEvidenceVersion = 1; },
    ({ candidate }) => { candidate.resolvedStyleSource = 'guessed'; },
    ...['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'].map(stage =>
      ({ node }) => { node[stage].background = 'red'; }),
    ({ candidate, node }) => { candidate.nodes.push({ key: node.key + '/0', parent: node.key, authored: { type: 'span' } }); },
  ];
  for (const mutate of mutations) assert.throws(() => run(mutate));
  assert.equal(mutations.length, 14);
  assert.throws(() => collectButtonStatePaint({ read: () => Buffer.from('{}') }));
});
