import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { collectButtonHoverComposition, inspectButtonHoverComposition } from '../../scripts/audit-material-button-hover-composition.mjs';
import { planButtonPaintAttribution } from '../../scripts/audit-material-button-paint-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

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

test('planned paint attribution replays complete original proof and frozen canonical parent', () => {
  const stdout = execFileSync(process.execPath,
    ['--max-old-space-size=512', 'scripts/audit-material-button-paint-attribution.mjs', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const receipt = JSON.parse(stdout);
  assert.equal(receipt.proposedGroups, 8); assert.equal(receipt.proposedObservations, 24);
  assert.equal(receipt.otherCompleteRows, 8331); assert.equal(receipt.baselineUnresolved, 2160);
  assert.equal(receipt.canonicalAttributionChanged, false);
});

test('planned paint join rejects incomplete populations and changed canonical identity without modifying inputs', () => {
  const proof = collectButtonHoverComposition();
  const original = JSON.parse(readFileSync(proof.originalCapture.file));
  const saved = JSON.parse(readFileSync('docs/material-button-paint-attribution-plan.json'));
  const normalize = bindOwnerCaretNormalization(readFileSync(saved.productionNormalization.module, 'utf8'), saved.productionNormalization);
  // Small row projections exercise the join's negative controls. The preceding
  // CLI test independently authenticates the full original canonical payload.
  const rows = saved.findings.map(g => Object.fromEntries(
    ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'].map(k => [k, g[k]])));
  for (const row of rows) row.attribution = 'unresolved';
  const before = JSON.stringify([proof, original, rows]);
  const projected = planButtonPaintAttribution(proof, original, rows, normalize);
  assert.equal(projected.proposedGroups, 8); assert.equal(projected.proposedObservations, 24);
  const changes = [
    p => { p.observations.pop(); },
    p => { p.observations[1] = structuredClone(p.observations[0]); },
    p => { p.observations[0].originalInputSha256 = 'changed'; },
    p => { p.observations[0].inputTrees.reference.sha256 = 'changed'; },
    p => { p.observations[0].viewport.width++; },
    p => { p.observations[0].proof.state = 'focus'; },
    p => { p.observations[0].proof.inputEquivalent = true; },
    p => { p.observations[0].proof.rendererCauseProven = true; },
    p => { p.equalBackgroundCasesRetained--; },
    (_p, o) => { o.interactions = o.interactions.filter(e => !(e.family === 'button' && e.state === 'held')); },
    (_p, _o, r) => { r.pop(); },
    (_p, _o, r) => { r.push(structuredClone(r[0])); },
    (_p, _o, r) => { r[0].reference = 'rgba(0,0,0,1)'; },
    (_p, _o, r) => { r[0].astylar = r[0].reference; },
    (_p, _o, r) => { r[0].occurrences--; },
    (_p, _o, r) => { r[0].cases.reverse(); },
    (_p, _o, r) => { r[0].states = ['hover']; },
    (_p, _o, r) => { r[0].attribution = 'already-reviewed'; },
  ];
  for (const mutate of changes) {
    const p = structuredClone(proof), r = structuredClone(rows);
    // These controls only replace/filter the original arrays, never mutate a
    // captured entry. Avoid eighteen deep copies of the 117 MB capture.
    const o = { ...original, results: [...original.results], interactions: [...original.interactions] };
    mutate(p, o, r);
    assert.throws(() => planButtonPaintAttribution(p, o, r, normalize));
  }
  assert.equal(JSON.stringify([proof, original, rows]), before);
});
