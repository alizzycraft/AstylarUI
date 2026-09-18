import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectSliderDisabledInputs, inspectSliderDisabledInputs } from '../../scripts/audit-material-slider-disabled-inputs.mjs';

test('all original disabled slider visual inputs omit the reference disabled opacity', () => {
  const actual = collectSliderDisabledInputs();
  assert.deepEqual(actual, JSON.parse(readFileSync('docs/material-slider-disabled-inputs.json')));
  assert.equal(actual.observations.length, 8); assert.equal(actual.sliderCases, 78);
  assert.equal(actual.matchingOpacityCases, 70); assert.equal(actual.originalCasesScanned, 2311);
  assert.equal(actual.canonicalAttributionChanged, false);
  for (const o of actual.observations) {
    assert.equal(o.proof.classification, 'application-plugin-authoring-defect');
    for (const flag of ['inputEquivalent', 'rendererCauseProven', 'renderedOpacityVerified']) assert.equal(o.proof[flag], false);
    assert.equal(o.proof.referenceOpacity, '0.38'); assert.equal(o.proof.candidateOpacity, '1.0');
  }
});

test('disabled opacity proof rejects changed sources states requests and ancestry', () => {
  const directory = 'artifacts/material-parity/current-ancestry-audit/interactions/slider/light/desktop-dpr1/disabled/';
  const r = JSON.parse(readFileSync(directory + 'reference-input-tree.json'));
  const a = JSON.parse(readFileSync(directory + 'astylar-input-tree.json'));
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const input = original.interactions.find(e => e.family === 'slider' && e.profile === 'light' &&
    e.viewport.id === 'desktop-dpr1' && e.state === 'disabled').styleInputs.find(i => i.id === 'slider-visual');
  const visual = t => t.nodes.find(n => n.authored?.id === 'slider-visual');
  const reference = t => t.nodes.find(n => n.attributes?.['data-parity-id'] === 'slider-visual');
  const before = JSON.stringify([input, r, a]);
  inspectSliderDisabledInputs(input, r, a);
  const mutations = [
    (i, _r, a) => { a.resolvedStyleSource = 'synthesized'; },
    (i, r) => { reference(r).attributes.class = 'mat-mdc-slider'; },
    (i, r) => { r.styles[reference(r).style].opacity = '1'; },
    (i, r) => { r.rules.find(rule => rule.selector === '.mat-mdc-slider.mdc-slider--disabled').active = false; },
    (i, _r, a) => { visual(a).authored.disabled = true; },
    (i, _r, a) => { visual(a).authored.data.opacity = .38; },
    (i, _r, a) => { visual(a).authored.data.disabled = true; },
    (i, _r, a) => { a.nodes.push({ key: 'extra', parent: visual(a).key, authored: { type: 'span' } }); },
    (i, _r, a) => { a.rules.push({ selector: '.range-plugin-layer', opacity: '.38' }); },
    (i, _r, a) => { a.rules.push({ selector: '*', all: 'initial' }); },
    (i, _r, a) => { visual(a).authored.style = { opacity: '.38' }; },
    (i, _r, a) => { a.nodes.find(n => n.authored?.id === 'slider-pair').resolvedStyle.opacity = '.38'; },
    (i, _r, a) => { visual(a).normalResolvedStyle.opacity = '.38'; },
    (i, _r, a) => { a.nodes.find(n => n.authored?.id === 'slider-start').authored.disabled = false; },
    (i, r) => { delete r.nodes.find(n => n.attributes?.id === 'slider-primary').attributes.disabled; },
    (i, _r, a) => { a.nodes.find(n => n.authored?.id === 'slider-start').parent = 'wrong-owner'; },
    i => { i.astylar.opacity = '.38'; },
    i => { i.astylarInteractionResolvedStyle.opacity = '.38'; },
  ];
  for (const mutate of mutations) {
    const cloned = structuredClone([input, r, a]); mutate(...cloned);
    assert.throws(() => inspectSliderDisabledInputs(...cloned));
  }
  assert.equal(JSON.stringify([input, r, a]), before);
});
