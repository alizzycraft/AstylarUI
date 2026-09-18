import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectRangeFontReset, inspectRangeFontReset } from '../../scripts/audit-material-range-font-reset.mjs';

test('all original range inputs retain omitted size reset including numerically matching themes', () => {
  const report = collectRangeFontReset();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-range-font-reset.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 156);
  assert.deepEqual(report.counts, { unequal: 76, matching: 80 });
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
  for (const finding of report.findings) {
    assert.equal(finding.proof.classification, 'application-plugin-authoring-defect');
    for (const flag of ['inputEquivalent', 'rendererCauseProven', 'renderingEquivalent', 'visibleTextVerified'])
      assert.equal(finding.proof[flag], false);
  }
});

test('range reset review rejects authored competing requests and changed captured owners or stages', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const entry = original.interactions.find(e => e.family === 'slider' && e.profile === 'contrast' &&
    e.viewport.id === 'desktop-dpr1' && e.state === 'focus');
  for (const id of ['slider-start', 'slider-primary']) {
    const i = entry.styleInputs.find(i => i.id === id);
    const r = JSON.parse(readFileSync(entry.inputTrees.reference.file)), a = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    const rn = t => t.nodes.find(n => n.attributes?.id === id), an = t => t.nodes.find(n => n.authored?.id === id);
    const reset = t => t.rules.find(r => r.selector === 'button, input, select');
    const before = JSON.stringify([i, r, a]);
    assert.equal(inspectRangeFontReset(i, r, a).referenceFontSize, '14.4px');
    const changes = [
      (i, r) => { reset(r).declarations['font-size'].value = '16px'; },
      (i, r) => { reset(r).active = false; },
      (i, r) => { reset(r).declarations.font = { value: '16px Arial' }; },
      (i, r) => { rn(r).inline['font-size'] = { value: 'inherit' }; },
      (i, r) => { r.styles[rn(r).style].fontSize = '16px'; },
      (i, r) => { rn(r).attributes.type = 'text'; },
      (i, _r, a) => { reset(a).fontSize = 'inherit'; },
      (i, _r, a) => { a.rules.push({ selector: '.range-layer:hover', fontSize: '14.4px' }); },
      (i, _r, a) => { a.rules.push({ selector: '[type=range]', fontSize: '14.4px' }); },
      (i, _r, a) => { a.rules.push({ selector: '*', all: 'initial' }); },
      (i, _r, a) => { a.rules.push({ selector: 'input', font: 'inherit' }); },
      (i, _r, a) => { a.rules.find(r => r.selector === '.material-table td').selector = '.material-table input'; },
      (i, _r, a) => { an(a).authored.style = { fontSize: 'inherit' }; },
      (i, _r, a) => { an(a).authored.inputType = 'text'; },
      (i, _r, a) => { an(a).normalResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).interactionResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).resolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).retainedText = { source: 'core-text-registry', style: { fontSize: '16px' } }; },
      (i, _r, a) => { an(a).parent = an(a).key; },
      (i, _r, a) => { a.nodes.push(structuredClone(an(a))); },
      (i, _r, a) => { a.resolvedStyleSource = 'inferred'; },
      i => { i.reference.fontSize = '16px'; },
      i => { i.astylar.fontSize = '14.4px'; },
    ];
    for (const mutate of changes) {
      const cloned = structuredClone([i, r, a]); mutate(...cloned);
      assert.throws(() => inspectRangeFontReset(...cloned));
    }
    assert.equal(JSON.stringify([i, r, a]), before);
  }
});
