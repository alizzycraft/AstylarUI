import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { collectContainerFontStages, inspectContainerFontStages, containerFontStageTargets, planContainerFontStages } from '../../scripts/audit-material-container-font-stages.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const expected = { 'badge-primary': 52, 'button-toggle-primary': 68, 'card-primary': 52, 'checkbox-primary': 68,
  'chips-primary': 76, 'divider-primary': 24, 'expansion-primary': 68, 'grid-list-primary': 52, 'radio-primary': 68,
  'sidenav-primary': 62, 'slide-toggle-primary': 68, 'sort-primary': 60, 'stepper-primary': 68, 'tabs-primary': 70,
  'tree-primary': 52, 'grid-tile-one': 52, 'grid-tile-two': 52 };

test('all original non-own-text container font omissions retain corresponding authored inheritance requests', () => {
  const report = collectContainerFontStages();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-container-font-stages.json')));
  assert.equal(report.originalCasesScanned, 2311); assert.equal(report.observations, 1012); assert.deepEqual(report.counts, expected);
  for (const finding of report.findings) {
    assert.equal(finding.proof.authoredSizeInheritanceMatches, true);
    assert.equal(finding.proof.candidateLocalFontSize, '<omitted>');
    assert.equal(finding.proof.classification, 'parity-harness-defect');
    for (const flag of ['computedCandidateVerified', 'wholeElementInputEquivalent', 'rendererCauseProven', 'renderingEquivalent', 'descendantTypographyVerified'])
      assert.equal(finding.proof[flag], false);
  }
  assert.equal(report.canonicalAttributionChanged, false); assert.equal(report.rendererChanged, false);
});

test('every container owner rejects changed ownership ancestry font requests or inspection stages', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  let executions = 0;
  for (const [id, { family }] of Object.entries(containerFontStageTargets)) {
    const entry = original.results.find(e => e.family === family && e.profile === 'contrast' && e.viewport.id === 'desktop');
    const input = entry.styleInputs.find(i => i.id === id);
    const reference = JSON.parse(readFileSync(entry.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(entry.inputTrees.astylar.file));
    const rn = tree => tree.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === id);
    const an = tree => tree.nodes.find(n => n.authored?.id === id);
    const frame = tree => tree.nodes.find(n => n.key === 'frame');
    const page = tree => tree.nodes.find(n => n.authored?.id === 'page');
    const before = digest([input, reference, candidate]);
    assert.equal(inspectContainerFontStages(family, input, reference, candidate).referenceComputedFontSize, '14.4px');
    const changes = [
      (_i, r) => { rn(r).ownText = 'own text'; },
      (_i, _r, a) => { an(a).authored.textContent = ''; },
      (_i, _r, a) => { an(a).retainedText = { style: { fontSize: '14.4px' } }; },
      (_i, _r, a) => { an(a).paintedControlText = {}; },
      (_i, r) => { rn(r).inline['font-size'] = { value: '14.4px' }; },
      (_i, r) => { r.nodes.find(n => n.key === rn(r).parent).inline.font = { value: '14.4px Arial' }; },
      (_i, r) => { r.rules.push({ active: true, selector: '*', declarations: { 'font-size': { value: '14.4px' } } }); rn(r).rules.push(r.rules.length - 1); },
      (_i, r) => { r.styles[rn(r).style].fontSize = '99px'; },
      (_i, r) => { frame(r).inline['--scale'].value = '1'; },
      (_i, r) => { rn(r).type = 'button'; },
      (_i, r) => { rn(r).parent = rn(r).key; },
      (_i, r) => { r.nodes.push(structuredClone(rn(r))); },
      (_i, _r, a) => { an(a).authored.style = { fontSize: '14.4px' }; },
      (_i, _r, a) => { an(a).authored.attributes = { style: 'font-size:14.4px' }; },
      (_i, _r, a) => { a.nodes.find(n => n.key === an(a).parent).authored.style = { fontSize: '14.4px' }; },
      (_i, _r, a) => { an(a).normalResolvedStyle.fontSize = '14.4px'; },
      (_i, _r, a) => { an(a).interactionResolvedStyle.fontSize = '14.4px'; },
      (_i, _r, a) => { an(a).resolvedStyle.fontSize = '14.4px'; },
      (_i, _r, a) => { page(a).resolvedStyle.fontSize = '16px'; },
      (_i, _r, a) => { a.rules.push({ selector: '*', fontSize: '14.4px' }); },
      (_i, _r, a) => { a.rules.push({ selector: '[data-extra]', fontSize: '14.4px' }); },
      (_i, _r, a) => { a.rules.push({ selector: '#' + id, all: 'initial' }); },
      (_i, _r, a) => { an(a).parent = an(a).key; },
      (_i, _r, a) => { a.nodes.push(structuredClone(an(a))); },
      (_i, _r, a) => { a.resolvedStyleSource = 'inferred'; },
      i => { i.astylar.fontSize = '14.4px'; },
      i => { i.reference.fontSize = '16px'; },
      i => { i.astylarStructure.ownText = 'own text'; },
      (_i, r) => { r.errors.push('missing rule evidence'); },
    ];
    for (const mutate of changes) {
      const values = structuredClone([input, reference, candidate]); mutate(...values);
      assert.throws(() => inspectContainerFontStages(family, ...values)); executions++;
    }
    assert.equal(digest([input, reference, candidate]), before);
  }
  assert.equal(executions, 493);
});

test('container stage plan independently replays source proofs and authenticates the complete frozen canonical payload', () => {
  const receipt = JSON.parse(execFileSync(process.execPath,
    ['--max-old-space-size=512', 'scripts/audit-material-container-font-stages.mjs', '--plan', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.proposedGroups, 51); assert.equal(receipt.proposedObservations, 1012);
  assert.equal(receipt.otherCompleteRows, 8288); assert.equal(receipt.baselineUnresolved, 2160);
  assert.equal(receipt.canonicalAttributionChanged, false);
});

test('container stage join rejects incomplete altered or overclaimed coverage', () => {
  const proof = JSON.parse(readFileSync('docs/material-container-font-stages.json'));
  const original = JSON.parse(readFileSync(proof.originalCapture.file));
  const saved = JSON.parse(readFileSync('docs/material-container-font-stage-plan.json'));
  const normalize = bindOwnerCaretNormalization(readFileSync(saved.productionNormalization.module, 'utf8'), saved.productionNormalization);
  // Only rejection tests use these projections. The preceding CLI checks the
  // complete authenticated canonical data and every source tree independently.
  const rows = saved.findings.map(g => ({ ...Object.fromEntries(
    ['family', 'element', 'property', 'reference', 'occurrences', 'cases', 'states'].map(k => [k, g[k]])), attribution: 'unresolved' }));
  const before = digest([proof, original, rows]);
  assert.equal(planContainerFontStages(proof, original, rows, normalize).proposedObservations, 1012);
  const changes = [
    p => { p.findings.pop(); }, p => { p.findings[1] = p.findings[0]; },
    p => { p.findings[0].originalInputSha256 = 'changed'; }, p => { p.findings[0].inputTrees.reference.sha256 = 'changed'; },
    p => { p.findings[0].viewport.width++; }, p => { p.findings[0].proof.authoredSizeInheritanceMatches = false; },
    p => { p.findings[0].proof.computedCandidateVerified = true; }, p => { p.findings[0].proof.renderingEquivalent = true; },
    p => { p.findings[0].proof.descendantTypographyVerified = true; }, p => { p.findings[0].proof.rendererCauseProven = true; },
    p => { p.findings[0].proof.referenceComputedFontSize = '99px'; },
    (_p, o) => { o.results = o.results.filter(e => e.family !== 'grid-list'); },
    (_p, _o, r) => { r.pop(); }, (_p, _o, r) => { r.push(structuredClone(r[0])); },
    (_p, _o, r) => { r[0].astylar = r[0].reference; }, (_p, _o, r) => { r[0].occurrences--; },
    (_p, _o, r) => { r[0].cases.reverse(); }, (_p, _o, r) => { r[0].states = ['invented']; },
    (_p, _o, r) => { r[0].attribution = 'previous-review'; },
  ];
  for (const mutate of changes) {
    const p = { ...proof, findings: [...proof.findings] }; p.findings[0] = structuredClone(p.findings[0]);
    const o = { ...original, results: [...original.results], interactions: [...original.interactions] }, r = structuredClone(rows);
    mutate(p, o, r); assert.throws(() => planContainerFontStages(p, o, r, normalize));
  }
  assert.equal(digest([proof, original, rows]), before);
});
