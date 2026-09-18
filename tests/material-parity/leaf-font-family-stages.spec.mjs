import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectLeafFontFamily, inspectLeafFontFamily, leafFontFamilyTargets }
  from '../../scripts/audit-material-leaf-font-family-stages.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

test('plain text family evidence replays every original selected state and retains the local omission', () => {
  const report = collectLeafFontFamily();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-leaf-font-family-stages.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 152);
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/leaf-font-family-stages.spec.mjs'));
  for (const f of report.findings) {
    const p = f.proof;
    assert.equal(p.classification, 'parity-harness-defect');
    assert.equal(p.authoredFamilyInheritanceMatches, true); assert.equal(p.retainedFontFamilyMatches, true);
    assert.equal(p.candidateLocalFontFamily, '<omitted>');
    assert.equal(p.retainedText.style.fontFamily, p.referenceComputedFontFamily);
    for (const flag of ['physicalFontSelectionVerified', 'wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p[flag], false);
  }
});

test('all leaf owners reject changed family ancestry declarations retained text and scalar evidence in all profiles', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  let seeds = 0, controls = 0;
  for (const [id, family] of Object.entries(leafFontFamilyTargets)) for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const e = original.results.find(e => e.family === family && e.profile === profile && e.viewport.id === 'desktop'); assert.ok(e);
    const input = e.styleInputs.find(i => i.id === id); assert.ok(input);
    const reference = JSON.parse(readFileSync(e.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(e.inputTrees.astylar.file));
    const r = t => t.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === id);
    const a = t => t.nodes.find(n => n.authored?.id === id);
    const rf = t => t.nodes.find(n => n.key === 'frame');
    const frameRule = t => t.rules[rf(t).rules.find(i => t.rules[i].declarations['font-family'])];
    const pageRule = t => t.rules.find(r => r.selector === '#page');
    const before = JSON.stringify([input, reference, candidate]);
    assert.equal(inspectLeafFontFamily(family, input, reference, candidate).retainedFontFamilyMatches, true); seeds++;
    const changes = [
      (i, t) => { frameRule(t).declarations['font-family'].value = 'Arial'; },
      (i, t) => { frameRule(t).declarations['font-family'].important = true; },
      (i, t) => { frameRule(t).active = false; },
      (i, t) => { r(t).inline['font-family'] = { value: 'inherit', important: false }; },
      (i, t) => { r(t).attributes.style = 'font-family: inherit'; },
      (i, t) => { t.styles[r(t).style].fontFamily = 'Arial'; },
      (i, t) => { t.styles[rf(t).style].fontFamily = 'Arial'; },
      (i, t) => { r(t).parent = 'frame'; },
      (i, t) => { t.nodes.push(structuredClone(r(t))); },
      (i, t) => { r(t).ownText = 'unexpected'; },
      (i, t) => { t.errors.push('incomplete'); },
      (i, t) => { t.nodes.find(n => n.key === r(t).parent).inline.all = { value: 'initial', important: false }; },
      (i, _r, t) => { a(t).normalResolvedStyle.fontFamily = 'Roboto'; },
      (i, _r, t) => { a(t).interactionResolvedStyle.fontFamily = 'Roboto'; },
      (i, _r, t) => { a(t).resolvedStyle.fontFamily = 'Roboto'; },
      (i, _r, t) => { pageRule(t).fontFamily = 'Arial'; },
      (i, _r, t) => { t.rules.push({ selector: '#' + id, fontFamily: 'inherit' }); },
      (i, _r, t) => { t.rules.push({ selector: 'div[data-family]', fontFamily: 'Roboto' }); },
      (i, _r, t) => { t.rules.push({ selector: '#page', font: '16px Arial' }); },
      (i, _r, t) => { t.rules.push({ selector: '#page', all: 'initial' }); },
      (i, _r, t) => { t.rules.push({ selector: '#' + id, transitionProperty: 'all' }); },
      (i, _r, t) => { a(t).authored.style = { fontFamily: 'Roboto' }; },
      (i, _r, t) => { a(t).authored.attributes = { style: 'font-family: Roboto' }; },
      (i, _r, t) => { a(t).retainedText.style.fontFamily = 'Arial'; },
      (i, _r, t) => { a(t).retainedText.source = 'plugin'; },
      (i, _r, t) => { delete a(t).retainedText; },
      (i, _r, t) => { a(t).parent = 'root'; },
      (i, _r, t) => { t.resolvedStyleSource = 'synthesized'; },
      i => { i.astylarResolvedStyleEvidenceVersion = 1; },
      i => { i.reference.fontFamily = 'Arial'; },
      i => { i.astylar.fontFamily = 'Roboto'; },
      i => { i.astylarNormalResolvedStyle.fontFamily = 'Roboto'; },
      i => { i.astylarInteractionResolvedStyle.fontFamily = 'Roboto'; },
      i => { i.referenceAuthored.push({ selector: '#' + id, declarations: { 'font-family': { value: 'inherit', important: false } } }); },
      i => { i.astylarAuthored.push({ selector: '#' + id, declarations: { fontFamily: 'inherit' } }); },
    ];
    for (const [index, mutate] of changes.entries()) {
      const args = structuredClone([input, reference, candidate]); mutate(...args);
      assert.throws(() => inspectLeafFontFamily(family, ...args), `${id}/${profile}/${index}`); controls++;
    }
    assert.equal(JSON.stringify([input, reference, candidate]), before);
  }
  assert.equal(seeds, 16); assert.equal(controls, 560);
});

test('stepper text cannot be included in a shared page-family inheritance proof', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const e = original.results.find(e => e.family === 'stepper' && e.profile === 'light' && e.viewport.id === 'desktop');
  const input = e.styleInputs.find(i => i.id === 'stepper-content');
  assert.equal(input.reference.fontFamily, 'Roboto');
  assert.throws(() => inspectLeafFontFamily('stepper', input,
    JSON.parse(readFileSync(e.inputTrees.reference.file)), JSON.parse(readFileSync(e.inputTrees.astylar.file))));
});
