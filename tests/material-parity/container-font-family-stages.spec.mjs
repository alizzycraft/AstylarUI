import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectContainerFontFamily, inspectContainerFontFamily, containerFontFamilyTargets }
  from '../../scripts/audit-material-container-font-family-stages.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

test('container family stage proof independently replays all original owners without claiming computed parity', () => {
  const report = collectContainerFontFamily();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-container-font-family-stages.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 1082);
  assert.equal(Object.keys(report.counts).length, 20); assert.equal(report.counts['stepper-primary'], undefined);
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/container-font-family-stages.spec.mjs'));
  const transitions = [];
  for (const o of report.findings) {
    const p = o.proof;
    assert.equal(p.classification, 'parity-harness-defect'); assert.equal(p.authoredFamilyInheritanceMatches, true);
    for (const flag of ['computedCandidateVerified', 'wholeElementInputEquivalent', 'rendererCauseProven', 'renderingEquivalent', 'descendantTypographyVerified']) assert.equal(p[flag], false);
    for (const n of p.referencePath) for (const motion of n.nonFamilyMotionRequests) {
      assert.equal(motion.resolvedMotionVerified, false); transitions.push({ family: o.family, motion });
    }
  }
  assert.equal(transitions.length, 60);
  assert.ok(transitions.every(t => ['progress-bar', 'progress-spinner'].includes(t.family)));
});

test('every mapped container rejects altered family requests stages ancestors and motion across profiles', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  let controls = 0, seeds = 0;
  for (const [id, target] of Object.entries(containerFontFamilyTargets)) for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const e = original.results.find(e => e.family === target.family && e.profile === profile && e.viewport.id === 'desktop'); assert.ok(e);
    const input = e.styleInputs.find(i => i.id === id); assert.ok(input);
    const reference = JSON.parse(readFileSync(e.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(e.inputTrees.astylar.file));
    const r = t => t.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === id);
    const a = t => t.nodes.find(n => n.authored?.id === id);
    const rf = t => t.nodes.find(n => n.key === 'frame');
    const frameRule = t => t.rules[rf(t).rules.find(i => t.rules[i].declarations['font-family'])];
    const pageRule = t => t.rules.find(r => r.selector === '#page');
    const before = JSON.stringify([input, reference, candidate]);
    assert.equal(inspectContainerFontFamily(target.family, input, reference, candidate).authoredFamilyInheritanceMatches, true); seeds++;
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
      (i, _r, t) => { a(t).retainedText = { font: 'Roboto' }; },
      (i, _r, t) => { a(t).parent = 'root'; },
      (i, _r, t) => { t.resolvedStyleSource = 'synthesized'; },
      i => { i.astylarResolvedStyleEvidenceVersion = 1; },
      i => { i.reference.fontFamily = 'Arial'; },
      i => { i.astylar.fontFamily = 'Roboto'; },
      i => { i.astylarNormalResolvedStyle.fontFamily = 'Roboto'; },
      i => { i.astylarInteractionResolvedStyle.fontFamily = 'Roboto'; },
    ];
    for (const [index, mutate] of changes.entries()) {
      const args = structuredClone([input, reference, candidate]); mutate(...args);
      assert.throws(() => inspectContainerFontFamily(target.family, ...args), `${id}/${profile}/${index}`); controls++;
    }
    if (target.family.startsWith('progress-')) {
      const transition = t => t.rules[r(t).rules.find(i => t.rules[i].declarations['transition-property'])];
      const motionChanges = [
        t => { transition(t).declarations['transition-property'].value = 'font-family'; },
        t => { transition(t).declarations['transition-property'].value = 'all'; },
        t => { transition(t).declarations['transition-property'].value = ''; },
        t => { transition(t).cssText = 'transition: opacity var(--duration);'; },
        t => { transition(t).declarations['animation-name'] = { value: 'font-change', important: false }; },
      ];
      for (const [index, mutate] of motionChanges.entries()) {
        const args = structuredClone([input, reference, candidate]); mutate(args[1]);
        assert.throws(() => inspectContainerFontFamily(target.family, ...args), `${id}/${profile}/motion/${index}`); controls++;
      }
    }
    assert.equal(JSON.stringify([input, reference, candidate]), before);
  }
  assert.equal(seeds, 80); assert.equal(controls, 2440);
});

test('stepper component token cannot be reclassified as shared page family inheritance', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const e = original.results.find(e => e.family === 'stepper' && e.profile === 'light' && e.viewport.id === 'desktop');
  const input = e.styleInputs.find(i => i.id === 'stepper-primary');
  assert.throws(() => inspectContainerFontFamily('stepper', input,
    JSON.parse(readFileSync(e.inputTrees.reference.file)), JSON.parse(readFileSync(e.inputTrees.astylar.file))));
});
