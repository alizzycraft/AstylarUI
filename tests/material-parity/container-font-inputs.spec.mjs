import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectContainerFontInputs, inspectContainerFontInputs } from '../../scripts/audit-material-container-font-inputs.mjs';

test('all list/table containers preserve fixed-font authoring even at matching numeric scale', () => {
  const actual = collectContainerFontInputs();
  assert.deepEqual(actual, JSON.parse(readFileSync('docs/material-container-font-inputs.json')));
  assert.equal(actual.originalCasesScanned, 2311); assert.equal(actual.observations, 104);
  for (const counts of Object.values(actual.counts))
    assert.deepEqual(counts, { cases: 52, unequalScalars: 26, matchingScalars: 26 });
  assert.equal(actual.findings.filter(o => o.proof.scalarMatches).length, 52);
  assert.equal(actual.canonicalAttributionChanged, false);
  for (const o of actual.findings) {
    assert.equal(o.proof.classification, 'application-plugin-authoring-defect');
    for (const flag of ['inputEquivalent', 'wholeContainerInputEquivalent', 'rendererCauseProven',
      'descendantTextVerified', 'renderingEquivalent']) assert.equal(o.proof[flag], false);
  }
  assert.match(actual.history.tableChange.before, /fontSize: '14px'/);
  assert.match(actual.history.tableChange.after, /fontSize: '16px'/);
});

test('container font proof rejects changed inheritance requests ownership and style stages', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  for (const family of ['list', 'table']) {
    const entry = original.results.find(e => e.family === family && e.profile === 'contrast' && e.viewport.id === 'desktop');
    const input = entry.styleInputs.find(i => i.id === family + '-primary');
    const r = JSON.parse(readFileSync(entry.inputTrees.reference.file)), a = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    const reference = tree => tree.nodes.find(n => n.attributes?.id === input.id);
    const candidate = tree => tree.nodes.find(n => n.authored?.id === input.id);
    const frame = tree => tree.nodes.find(n => n.key === 'frame');
    const before = JSON.stringify([input, r, a]);
    const proof = inspectContainerFontInputs(family, input, r, a);
    assert.equal(proof.referenceFontSize, '14.4px'); assert.equal(proof.candidateFontSize, '16px');
    const changes = [
      (i, r) => { reference(r).inline['font-size'] = { value: '16px' }; },
      (i, r) => { reference(r).inline.all = { value: 'initial' }; },
      (i, r) => { r.nodes.find(n => n.key === reference(r).parent).inline.font = { value: '16px Arial' }; },
      (i, r) => { frame(r).inline['--scale'].value = '1'; },
      (i, r) => { r.rules[frame(r).rules.find(index => r.rules[index].declarations['font-size'])].active = false; },
      (i, r) => { r.rules[frame(r).rules.find(index => r.rules[index].declarations['font-size'])].declarations['font-size'].value = '14.4px'; },
      (i, r) => { r.styles[reference(r).style].fontSize = '16px'; },
      (i, _r, a) => { a.rules.find(rule => rule.selector === '.material-' + family).fontSize = 'inherit'; },
      (i, _r, a) => { a.rules.find(rule => rule.selector === '#page').fontSize = '16px'; },
      (i, _r, a) => { candidate(a).normalResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { candidate(a).interactionResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { candidate(a).resolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { candidate(a).authored.style = { fontSize: '16px' }; },
      (i, _r, a) => { candidate(a).parent = 'root'; },
      (i, _r, a) => { a.nodes.push(structuredClone(candidate(a))); },
      (i, _r, a) => { a.resolvedStyleSource = 'synthesized'; },
      i => { i.reference.fontSize = '16px'; },
      i => { i.astylar.fontSize = '14.4px'; },
    ];
    for (const mutate of changes) {
      const cloned = structuredClone([input, r, a]); mutate(...cloned);
      assert.throws(() => inspectContainerFontInputs(family, ...cloned));
    }
    assert.equal(JSON.stringify([input, r, a]), before);
  }
});
