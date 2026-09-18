import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectLeafFontStages, inspectLeafFontStages } from '../../scripts/audit-material-leaf-font-stages.mjs';

test('all original selected plain-text font omissions retain matching inherited text inputs', () => {
  const actual = collectLeafFontStages();
  assert.deepEqual(actual, JSON.parse(readFileSync('docs/material-leaf-font-stages.json')));
  assert.equal(actual.originalCasesScanned, 2311); assert.equal(actual.observations, 220);
  for (const finding of actual.findings) {
    assert.equal(finding.proof.retainedFontSizeMatches, true);
    assert.equal(finding.proof.candidateLocalFontSize, '<omitted>');
    for (const flag of ['wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(finding.proof[flag], false);
  }
  assert.equal(actual.canonicalAttributionChanged, false);
});

test('leaf font stage proof rejects altered ownership text inheritance and retained evidence', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  for (const [family, id] of [['badge', 'badge-label'], ['card', 'card-copy'], ['divider', 'divider-above'],
    ['divider', 'divider-below'], ['stepper', 'stepper-content']]) {
    const entry = original.interactions.find(e => e.family === family && e.profile === 'contrast' && e.viewport.id === 'desktop-dpr1');
    const input = entry.styleInputs.find(i => i.id === id);
    const r = JSON.parse(readFileSync(entry.inputTrees.reference.file)), a = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    const rn = tree => tree.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === id &&
      tree.styles[n.style].visibility !== 'hidden');
    const an = tree => tree.nodes.find(n => n.authored?.id === id);
    const frame = tree => tree.nodes.find(n => n.key === 'frame');
    const before = JSON.stringify([input, r, a]);
    assert.equal(inspectLeafFontStages(family, input, r, a).referenceComputedFontSize, '14.4px');
    const changes = [
      (i, r) => { rn(r).inline['font-size'] = { value: '16px' }; },
      (i, r) => { rn(r).inline.all = { value: 'initial' }; },
      (i, r) => { r.nodes.find(n => n.key === rn(r).parent).inline.font = { value: '14.4px Arial' }; },
      (i, r) => { frame(r).inline['--scale'].value = '1'; },
      (i, r) => { r.styles[rn(r).style].fontSize = '16px'; },
      (i, r) => { rn(r).ownText = 'other'; },
      (i, r) => { r.styles[rn(r).style].visibility = 'hidden'; },
      (i, r) => { r.nodes.push({ key: 'extra', parent: rn(r).key }); },
      (i, _r, a) => { an(a).retainedText.style.fontSize = '16px'; },
      (i, _r, a) => { an(a).retainedText.source = 'inferred'; },
      (i, _r, a) => { delete an(a).retainedText; },
      (i, _r, a) => { an(a).normalResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).interactionResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).resolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).authored.style = { fontSize: '14.4px' }; },
      (i, _r, a) => { an(a).parent = an(a).key; },
      (i, _r, a) => { a.nodes.push(structuredClone(an(a))); },
      (i, _r, a) => { a.nodes.push({ key: 'extra', parent: an(a).key }); },
      (i, _r, a) => { a.nodes.find(n => n.authored?.id === 'page').resolvedStyle.fontSize = '16px'; },
      (i, _r, a) => { a.resolvedStyleSource = 'synthesized'; },
      i => { i.astylar.fontSize = '14.4px'; },
      i => { i.reference.fontSize = '16px'; },
      i => { i.astylarStructure.ownText = 'other'; },
    ];
    for (const mutate of changes) {
      const cloned = structuredClone([input, r, a]); mutate(...cloned);
      assert.throws(() => inspectLeafFontStages(family, ...cloned));
    }
    assert.equal(JSON.stringify([input, r, a]), before);
  }
});
