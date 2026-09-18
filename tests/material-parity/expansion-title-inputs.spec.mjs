import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectExpansionTitleInputs, inspectExpansionTitleInput } from '../../scripts/audit-material-expansion-title-inputs.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

test('every expansion title retains its component token omission or compact descendant-only override', () => {
  const report = collectExpansionTitleInputs();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-expansion-title-inputs.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 68);
  assert.deepEqual(report.counts, { localOmission: 51, compactLocalOverride: 17, retainedSizeMatches: 51, retainedSizeDiffers: 17 });
  for (const f of report.findings) {
    const p = f.proof;
    assert.equal(p.classification, 'application-plugin-authoring-defect');
    for (const flag of ['sameInheritanceScope', 'inputEquivalent', 'rendererCauseProven', 'renderingEquivalent']) assert.equal(p[flag], false);
    assert.equal(p.referenceComputedFontSize, '16px');
    assert.equal(p.retainedText.style.fontSize, f.profile === 'custom' ? '18.4px' : '16px');
    assert.equal(p.candidateLocalFontSize, f.profile === 'contrast' ? '16px' : '<omitted>');
  }
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/expansion-title-inputs.spec.mjs'));
});

test('all four expansion profiles reject changed scope, values, ancestry, requests, and retained evidence', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  let executions = 0;
  for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const e = original.results.find(e => e.family === 'expansion' && e.profile === profile && e.viewport.id === 'desktop');
    const input = e.styleInputs.find(i => i.id === 'expansion-title');
    const reference = JSON.parse(readFileSync(e.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(e.inputTrees.astylar.file));
    const rn = tree => tree.nodes.find(n => n.attributes?.id === 'expansion-title');
    const an = tree => tree.nodes.find(n => n.authored?.id === 'expansion-title');
    const header = tree => tree.nodes.find(n => n.type === 'mat-expansion-panel-header');
    const sizeRule = tree => tree.rules[header(tree).rules.find(i => tree.rules[i].declarations['font-size'])];
    const before = JSON.stringify([input, reference, candidate]);
    inspectExpansionTitleInput(input, reference, candidate);
    const changes = [
      (_i, r) => { rn(r).ownText = 'changed'; },
      (_i, r) => { rn(r).parent = 'frame'; },
      (_i, r) => { r.nodes.push(structuredClone(rn(r))); },
      (_i, r) => { rn(r).inline['font-size'] = { value: '16px' }; },
      (_i, r) => { sizeRule(r).active = false; },
      (_i, r) => { sizeRule(r).declarations['font-size'].value = '16px'; },
      (_i, r) => { sizeRule(r).conditions.push({ media: 'screen' }); },
      (_i, r) => { r.styles[header(r).style].fontSize = '99px'; },
      (_i, _r, a) => { an(a).authored.style = { fontSize: '16px' }; },
      (_i, _r, a) => { an(a).authored.textContent = 'changed'; },
      (_i, _r, a) => { an(a).parent = an(a).key; },
      (_i, _r, a) => { an(a).normalResolvedStyle.fontSize = '99px'; },
      (_i, _r, a) => { an(a).interactionResolvedStyle.fontSize = '99px'; },
      (_i, _r, a) => { an(a).resolvedStyle.fontSize = '99px'; },
      (_i, _r, a) => { an(a).retainedText.style.fontSize = '99px'; },
      (_i, _r, a) => { an(a).retainedText.source = 'synthesized'; },
      (_i, _r, a) => { a.rules.push({ selector: '.expansion-trigger', fontSize: '16px' }); },
      (_i, _r, a) => { a.rules.push({ selector: '.expansion-title', all: 'initial' }); },
      (_i, _r, a) => { a.rules.push({ selector: 'span[data-x]', fontSize: '16px' }); },
      (_i, _r, a) => { a.rules.push({ selector: '#expansion-title', animation: 'font-size-change' }); },
      (_i, _r, a) => { a.rules.push({ selector: '.unknown', nested: { fontSize: '16px' } }); },
      (_i, _r, a) => { a.rules.find(r => r.selector === '#page').fontSize = '99px'; },
      (_i, _r, a) => { a.resolvedStyleSource = 'synthesized'; },
      (_i, _r, a) => { a.errors.push('capture error'); },
      i => { i.reference.fontSize = '99px'; },
      i => { i.astylar.fontSize = '99px'; },
      i => { i.astylarResolvedStyleEvidenceVersion = 1; },
    ];
    for (const [index, mutate] of changes.entries()) {
      const args = structuredClone([input, reference, candidate]); mutate(...args);
      assert.throws(() => inspectExpansionTitleInput(...args), `${profile} negative control ${index}`); executions++;
    }
    assert.equal(JSON.stringify([input, reference, candidate]), before);
  }
  assert.equal(executions, 108);
});
