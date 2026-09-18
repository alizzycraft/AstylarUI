import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectOverlayFontInputs, inspectOverlayFontInput, overlayFontTargets } from '../../scripts/audit-material-overlay-font-inputs.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

test('all original overlay font owners preserve different ancestry missing container tokens and rule gaps', () => {
  const report = collectOverlayFontInputs();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-overlay-font-inputs.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 182); assert.equal(report.contextCases, 91);
  assert.equal(report.counts.matchingPageSizes, 94); assert.equal(report.counts.differingPageSizes, 88);
  assert.equal(report.counts.scalarRuleGapsPreserved, 59);
  for (const f of report.findings) {
    assert.equal(f.proof.classification, 'application-plugin-authoring-defect');
    for (const flag of ['inputEquivalent', 'candidateComputedFontSizeVerified', 'rendererCauseProven', 'renderingEquivalent']) assert.equal(f.proof[flag], false);
    assert.equal(f.proof.candidateLocalFontSize, '<omitted>'); assert.equal(f.proof.referenceComputedFontSize, '16px');
  }
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
  assert.equal(report.referenceContext.originalCandidateReplayed, false);
  assert.equal(report.referenceContext.historicalAncestorsReconstructed, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/overlay-font-inputs.spec.mjs'));
});

test('every overlay owner and profile rejects altered context identity declarations and local stages', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const report = JSON.parse(readFileSync('docs/material-overlay-font-inputs.json'));
  let executions = 0;
  for (const [id, target] of Object.entries(overlayFontTargets)) for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const e = original.interactions.find(e => e.family === target.family && e.profile === profile && e.styleInputs.some(i => i.id === id));
    const input = e.styleInputs.find(i => i.id === id);
    const reference = JSON.parse(readFileSync(e.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(e.inputTrees.astylar.file));
    const key = `interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}`;
    const saved = report.findings.find(f => f.case === key && f.element === id);
    const context = { case: key, family: e.family, profile: e.profile, state: e.state, viewport: structuredClone(e.viewport),
      referenceAncestorContext: saved.proof.replayedReferenceExternalContext };
    const rn = tree => tree.nodes.find(n => n.key === saved.proof.mapping.referenceNode);
    const an = tree => tree.nodes.find(n => n.authored?.id === id);
    inspectOverlayFontInput(e, input, reference, candidate, context);
    const before = JSON.stringify([e, input, reference, candidate, context]);
    const changes = [
      (e) => { e.profile = 'invented'; },
      (_e, _i, _r, _a, c) => { c.case = 'invented'; },
      (_e, _i, _r, _a, c) => { c.viewport.width++; },
      (_e, _i, _r, _a, c) => { c.referenceAncestorContext[1].fontSize = '99px'; },
      (_e, _i, _r, _a, c) => { c.referenceAncestorContext.pop(); },
      (_e, _i, r) => { rn(r).ownText = 'text'; },
      (_e, _i, r) => { rn(r).inline['font-size'] = { value: '16px' }; },
      (_e, _i, r) => { r.styles[rn(r).style].fontSize = '99px'; },
      (_e, _i, r) => { r.nodes.push(structuredClone(rn(r))); },
      (_e, _i, r) => { rn(r).parent = 'frame'; },
      (_e, _i, r) => { r.nodes.find(n => n.key === 'frame').inline['--scale'].value = '99'; },
      (_e, _i, _r, a) => { an(a).authored.textContent = 'text'; },
      (_e, _i, _r, a) => { an(a).retainedText = {}; },
      (_e, _i, _r, a) => { an(a).authored.style = { fontSize: '16px' }; },
      (_e, _i, _r, a) => { an(a).normalResolvedStyle.fontSize = '16px'; },
      (_e, _i, _r, a) => { an(a).interactionResolvedStyle.fontSize = '16px'; },
      (_e, _i, _r, a) => { an(a).resolvedStyle.fontSize = '16px'; },
      (_e, _i, _r, a) => { a.rules.push({ selector: '#' + id, fontSize: '16px' }); },
      (_e, _i, _r, a) => { a.rules.push({ selector: '#' + id, all: 'initial' }); },
      (_e, _i, _r, a) => { a.rules.push({ selector: 'div[data-x]', fontSize: '16px' }); },
      (_e, _i, _r, a) => { a.rules.push({ selector: '#' + id, animation: 'font-size-change' }); },
      (_e, _i, _r, a) => { a.rules.find(r => r.selector === '#page').fontSize = '99px'; },
      (_e, _i, _r, a) => { a.resolvedStyleSource = 'synthesized'; },
      (_e, _i, _r, a) => { a.errors.push('capture error'); },
      (_e, i) => { i.reference.fontSize = '99px'; },
      (_e, i) => { i.astylar.fontSize = '16px'; },
    ];
    for (const [index, mutate] of changes.entries()) {
      const args = structuredClone([e, input, reference, candidate, context]); mutate(...args);
      assert.throws(() => inspectOverlayFontInput(...args), `${id}/${profile} negative control ${index}`); executions++;
    }
    assert.equal(JSON.stringify([e, input, reference, candidate, context]), before);
  }
  assert.equal(executions, 624);
});
