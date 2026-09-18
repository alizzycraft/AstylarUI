import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectButtonHoverComposition, inspectButtonHoverComposition } from '../../scripts/audit-material-button-hover-composition.mjs';

const directory = 'artifacts/material-parity/current-ancestry-audit/interactions/button/light/desktop-dpr1/hover/';
const reference = JSON.parse(readFileSync(directory + 'reference-input-tree.json'));
const candidate = JSON.parse(readFileSync(directory + 'astylar-input-tree.json'));
const host = t => t.nodes.find(n => n.authored?.id === 'button-primary');
const layer = t => t.nodes.find(n => n.attributes?.class?.split(/\s+/).includes('mat-mdc-button-persistent-ripple'));
const mix = (...args) => { assert.deepEqual(args, ['#6750a4', '#ffffff', .08]); return '#735eab'; };

test('all original unequal primary button backgrounds retain unequal paint composition', () => {
  const report = collectButtonHoverComposition();
  assert.equal(report.cases, 24);
  assert.equal(report.originalCasesScanned, 2311);
  assert.equal(report.primaryCases, 60);
  assert.equal(report.equalBackgroundCasesRetained, 36);
  for (const state of ['hover', 'held', 'activate']) assert.equal(report.observations.filter(o => o.state === state).length, 8);
  assert.equal(report.canonicalAttributionChanged, false);
  assert.equal(report.inputEquivalent, false);
  for (const row of report.observations) {
    assert.equal(row.proof.classification, 'application-plugin-authoring-defect');
    assert.equal(row.proof.renderedCompositeVerified, false);
    assert.equal(row.proof.rendererCauseProven, false);
  }
});

test('hover composition rejects changed ownership, requests, stages and structures', () => {
  const original = JSON.stringify([reference, candidate]);
  assert.equal(inspectButtonHoverComposition(reference, candidate, mix).flattenedColor, '#735eab');
  const mutations = [
    (r, a) => { a.nodes.push(structuredClone(host(a))); },
    (r, a) => { host(a).authored.type = 'div'; },
    r => { layer(r).parent = 'different-owner'; },
    r => { layer(r).pseudoElements[0].generated = false; },
    r => { r.styles[layer(r).pseudoElements[0].style].opacity = '0.12'; },
    r => { r.styles[layer(r).pseudoElements[0].style].backgroundColor = 'rgb(0, 0, 0)'; },
    r => { const rule = r.rules.find(r => r.selector === '.mat-mdc-unelevated-button:hover > .mat-mdc-button-persistent-ripple::before'); rule.declarations.opacity.value = '0.08'; },
    (r, a) => { host(a).normalResolvedStyle.background = '#ffffff'; },
    (r, a) => { host(a).interactionResolvedStyle.background = '#000000'; },
    (r, a) => { host(a).resolvedStyle.background = '#000000'; },
    (r, a) => { a.nodes.push({ key: 'new-layer', parent: host(a).key, authored: { type: 'span' } }); },
    (r, a) => { a.resolvedStyleSource = 'fabricated'; },
    (r, a) => { a.rules.find(r => r.selector === '.material-button:hover').background = '#000000'; },
    r => { r.rules.find(r => r.selector === '.mat-mdc-unelevated-button:not(:disabled)').declarations['background-color'].value = '#6750a4'; },
  ];
  for (const mutate of mutations) {
    const [r, a] = structuredClone([reference, candidate]); mutate(r, a);
    assert.throws(() => inspectButtonHoverComposition(r, a, mix));
  }
  assert.equal(JSON.stringify([reference, candidate]), original);
});

test('held and post-activation paint boundaries are not substituted for hover', () => {
  const read = (side, state) => JSON.parse(readFileSync(directory.replace('/hover/', `/${state}/`) + side + '-input-tree.json'));
  const heldReference = read('reference', 'held'), heldCandidate = read('astylar', 'held');
  const heldMix = (...args) => { assert.deepEqual(args, ['#6750a4', '#ffffff', .12]); return '#7965af'; };
  const proof = inspectButtonHoverComposition(heldReference, heldCandidate, heldMix, 'held');
  assert.equal(proof.referenceLayerOpacity, '0.12');
  assert.equal(proof.candidateRule.selector, '.material-button:active');
  assert.equal(inspectButtonHoverComposition(read('reference', 'activate'), read('astylar', 'activate'), mix, 'activate').state, 'activate');
  assert.throws(() => inspectButtonHoverComposition(heldReference, heldCandidate, mix, 'hover'));
  assert.throws(() => inspectButtonHoverComposition(reference, candidate, heldMix, 'held'));
  assert.throws(() => inspectButtonHoverComposition(reference, candidate, mix, 'focus'));
});
