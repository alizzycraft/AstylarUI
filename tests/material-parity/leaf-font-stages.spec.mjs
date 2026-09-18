import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { collectLeafFontStages, inspectLeafFontStages } from '../../scripts/audit-material-leaf-font-stages.mjs';
import { planLeafFontAttribution } from '../../scripts/audit-material-leaf-font-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

test('all original selected plain-text font omissions retain matching inherited text inputs', () => {
  const actual = collectLeafFontStages();
  assert.deepEqual(actual, JSON.parse(readFileSync('docs/material-leaf-font-stages.json')));
  assert.equal(actual.originalCasesScanned, 2311); assert.equal(actual.observations, 220);
  for (const finding of actual.findings) {
    assert.equal(finding.proof.retainedFontSizeMatches, true);
    assert.equal(finding.proof.candidateLocalFontSize, '<omitted>');
    for (const flag of ['wholeElementInputEquivalent', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(finding.proof[flag], false);
  }
  assert.equal(actual.canonicalAttributionChanged, false);
});

test('planned font attribution independently replays source trees and complete frozen canonical payload', () => {
  const receipt = JSON.parse(execFileSync(process.execPath,
    ['--max-old-space-size=512', 'scripts/audit-material-leaf-font-attribution.mjs', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.proposedGroups, 15); assert.equal(receipt.proposedObservations, 152);
  assert.equal(receipt.preservedStaticGroups, 15); assert.equal(receipt.preservedStaticObservations, 68);
  assert.equal(receipt.otherCompleteRows, 8324); assert.equal(receipt.baselineUnresolved, 2160);
  assert.equal(receipt.canonicalAttributionChanged, false);
});

test('planned font join rejects incomplete evidence and preserves previously classified static groups', () => {
  const proof = collectLeafFontStages(), original = JSON.parse(readFileSync(proof.originalCapture.file));
  const saved = JSON.parse(readFileSync('docs/material-leaf-font-attribution-plan.json'));
  const normalize = bindOwnerCaretNormalization(readFileSync(saved.productionNormalization.module, 'utf8'), saved.productionNormalization);
  // Pure small projections test join rejection; the preceding CLI authenticates
  // all rows and tree sources rather than trusting this projection as evidence.
  const rows = [...saved.proposed, ...saved.preservedStatic].map(g => ({
    ...Object.fromEntries(['family', 'element', 'property', 'reference', 'occurrences', 'cases', 'states'].map(k => [k, g[k]])),
    attribution: g.previousAttribution }));
  const before = JSON.stringify([proof, original, rows]);
  assert.equal(planLeafFontAttribution(proof, original, rows, normalize).proposedObservations, 152);
  const changes = [
    p => { p.findings.pop(); },
    p => { p.findings[1] = structuredClone(p.findings[0]); },
    p => { p.findings[0].originalInputSha256 = 'changed'; },
    p => { p.findings[0].inputTrees.reference.sha256 = 'changed'; },
    p => { p.findings[0].viewport.width++; },
    p => { p.findings[0].proof.retainedFontSizeMatches = false; },
    p => { p.findings[0].proof.retainedText.style.fontSize = '99px'; },
    p => { p.findings[0].proof.rendererCauseProven = true; },
    p => { p.findings[0].proof.renderingEquivalent = true; },
    p => { p.findings[0].proof.wholeElementInputEquivalent = true; },
    p => { p.findings[0].proof.text = 'changed'; },
    (_p, o) => { o.interactions = o.interactions.filter(e => e.family !== 'stepper'); },
    (_p, o) => { o.results = o.results.filter(e => e.family !== 'divider'); },
    (_p, _o, r) => { r.pop(); },
    (_p, _o, r) => { r.push(structuredClone(r[0])); },
    (_p, _o, r) => { r[0].reference = '99px'; },
    (_p, _o, r) => { r[0].astylar = r[0].reference; },
    (_p, _o, r) => { r[0].occurrences--; },
    (_p, _o, r) => { r[0].cases.reverse(); },
    (_p, _o, r) => { r[0].states = ['static']; },
    (_p, _o, r) => { r[0].attribution = 'already-reviewed'; },
    (_p, _o, r) => { r.at(-1).attribution = 'unresolved'; },
  ];
  for (const mutate of changes) {
    const p = structuredClone(proof), r = structuredClone(rows);
    const o = { ...original, results: [...original.results], interactions: [...original.interactions] };
    mutate(p, o, r); assert.throws(() => planLeafFontAttribution(p, o, r, normalize));
  }
  assert.equal(JSON.stringify([proof, original, rows]), before);
});

test('leaf font stage proof rejects altered ownership text inheritance and retained evidence', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  for (const [family, id] of [['badge', 'badge-label'], ['card', 'card-copy'], ['divider', 'divider-above'],
    ['divider', 'divider-below'], ['stepper', 'stepper-content']]) {
    const entry = original.interactions.find(e => e.family === family && e.profile === 'contrast' && e.viewport.id === 'desktop-dpr1');
    const input = entry.styleInputs.find(i => i.id === id);
    const r = JSON.parse(readFileSync(entry.inputTrees.reference.file)), a = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    const rn = tree => tree.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === id &&
      tree.styles[n.style].visibility !== 'hidden');
    const an = tree => tree.nodes.find(n => n.authored?.id === id);
    const frame = tree => tree.nodes.find(n => n.key === 'frame');
    const before = JSON.stringify([input, r, a]);
    assert.equal(inspectLeafFontStages(family, input, r, a).referenceComputedFontSize, '14.4px');
    const changes = [
      (i, r) => { rn(r).inline['font-size'] = { value: '16px' }; },
      (i, r) => { rn(r).inline.all = { value: 'initial' }; },
      (i, r) => { r.nodes.find(n => n.key === rn(r).parent).inline.font = { value: '14.4px Arial' }; },
      (i, r) => { frame(r).inline['--scale'].value = '1'; },
      (i, r) => { r.styles[rn(r).style].fontSize = '16px'; },
      (i, r) => { rn(r).ownText = 'other'; },
      (i, r) => { r.styles[rn(r).style].visibility = 'hidden'; },
      (i, r) => { r.nodes.push({ key: 'extra', parent: rn(r).key }); },
      (i, _r, a) => { an(a).retainedText.style.fontSize = '16px'; },
      (i, _r, a) => { an(a).retainedText.source = 'inferred'; },
      (i, _r, a) => { delete an(a).retainedText; },
      (i, _r, a) => { an(a).normalResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).interactionResolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).resolvedStyle.fontSize = '14.4px'; },
      (i, _r, a) => { an(a).authored.style = { fontSize: '14.4px' }; },
      (i, _r, a) => { an(a).parent = an(a).key; },
      (i, _r, a) => { a.nodes.push(structuredClone(an(a))); },
      (i, _r, a) => { a.nodes.push({ key: 'extra', parent: an(a).key }); },
      (i, _r, a) => { a.nodes.find(n => n.authored?.id === 'page').resolvedStyle.fontSize = '16px'; },
      (i, _r, a) => { a.resolvedStyleSource = 'synthesized'; },
      i => { i.astylar.fontSize = '14.4px'; },
      i => { i.reference.fontSize = '16px'; },
      i => { i.astylarStructure.ownText = 'other'; },
    ];
    for (const mutate of changes) {
      const cloned = structuredClone([input, r, a]); mutate(...cloned);
      assert.throws(() => inspectLeafFontStages(family, ...cloned));
    }
    assert.equal(JSON.stringify([input, r, a]), before);
  }
});
