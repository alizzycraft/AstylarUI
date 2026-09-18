import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectTabPanelInputs, inspectTabPanelInput } from '../../scripts/audit-material-tab-panel-inputs.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

test('all original tab panel cases preserve private typography ownership despite matching size numbers', () => {
  const report = collectTabPanelInputs();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-tab-panel-inputs.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 70);
  assert.deepEqual(report.counts, { overview: 52, activity: 18, numericDataSizeMatches: 70, customBaselineOffsets: 17 });
  for (const { proof: p } of report.findings) {
    assert.equal(p.classification, 'application-plugin-authoring-defect');
    assert.equal(p.candidateLocalFontSize, '<omitted>');
    assert.equal(`${p.privateData['font-size']}px`, p.referenceComputedFontSize);
    for (const flag of ['inputEquivalent', 'rendererCauseProven', 'renderingEquivalent', 'perCasePaintVerified']) assert.equal(p[flag], false);
  }
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
  assert.equal(report.existingRuntimeEvidence.rerunByThisCollector, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/tab-panel-inputs.spec.mjs'));
});

test('both tab contents in all profiles reject forged text, CSS stages, private inputs and ownership evidence', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  let executions = 0;
  for (const profile of ['light', 'dark', 'contrast', 'custom']) for (const content of ['Overview content', 'Activity content']) {
    const e = [...original.results, ...original.interactions].find(e => e.family === 'tabs' && e.profile === profile &&
      e.styleInputs.find(i => i.id === 'tab-panel')?.referenceStructure.text === content);
    const input = e.styleInputs.find(i => i.id === 'tab-panel');
    const reference = JSON.parse(readFileSync(e.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(e.inputTrees.astylar.file));
    const rn = tree => tree.nodes.find(n => n.attributes?.['data-parity-id'] === 'tab-panel');
    const an = tree => tree.nodes.find(n => n.authored?.id === 'tab-panel');
    inspectTabPanelInput(input, reference, candidate);
    const before = JSON.stringify([input, reference, candidate]);
    const changes = [
      (_i, r) => { rn(r).ownText = 'changed'; },
      (_i, r) => { rn(r).inline['font-size'] = { value: '16px' }; },
      (_i, r) => { rn(r).parent = 'frame'; },
      (_i, r) => { r.nodes.push(structuredClone(rn(r))); },
      (_i, r) => { r.styles[rn(r).style].fontSize = '99px'; },
      (_i, r) => { r.nodes.find(n => n.type === 'mat-tab-body' && n.attributes['aria-hidden'] === 'false').attributes['aria-hidden'] = 'true'; },
      (_i, _r, a) => { an(a).authored.textContent = content; },
      (_i, _r, a) => { an(a).authored.type = 'span'; },
      (_i, _r, a) => { an(a).authored.ariaLabel = 'changed'; },
      (_i, _r, a) => { an(a).retainedText = { style: { fontSize: '16px' } }; },
      (_i, _r, a) => { an(a).paintedControlText = {}; },
      (_i, _r, a) => { an(a).authored.data.selected = !an(a).authored.data.selected; },
      (_i, _r, a) => { an(a).authored.data.phase = 0; },
      (_i, _r, a) => { an(a).authored.data['font-size'] = 99; },
      (_i, _r, a) => { an(a).authored.data['baseline-offset'] = 99; },
      (_i, _r, a) => { an(a).authored.data['text-color'] = 'invalid'; },
      (_i, _r, a) => { an(a).authored.style = { fontSize: '16px' }; },
      (_i, _r, a) => { an(a).normalResolvedStyle.fontSize = '16px'; },
      (_i, _r, a) => { an(a).interactionResolvedStyle.fontSize = '16px'; },
      (_i, _r, a) => { an(a).resolvedStyle.fontSize = '16px'; },
      (_i, _r, a) => { a.rules.push({ selector: '.tab-panel', all: 'initial' }); },
      (_i, _r, a) => { a.rules.push({ selector: 'span[data-x]', fontSize: '16px' }); },
      (_i, _r, a) => { a.rules.push({ selector: '.tab-panel', animation: 'font-size-change' }); },
      (_i, _r, a) => { a.rules.find(r => r.selector === '#page').fontSize = '99px'; },
      (_i, _r, a) => { a.resolvedStyleSource = 'synthesized'; },
      i => { i.reference.fontSize = '99px'; },
      i => { i.astylar.fontSize = '16px'; },
    ];
    for (const [index, mutate] of changes.entries()) {
      const args = structuredClone([input, reference, candidate]); mutate(...args);
      assert.throws(() => inspectTabPanelInput(...args), `${profile}/${content} negative control ${index}`); executions++;
    }
    assert.equal(JSON.stringify([input, reference, candidate]), before);
  }
  assert.equal(executions, 216);
});
