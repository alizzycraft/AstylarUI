import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { inspectOwnerCaretInput } from './owner-caret-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), entry = raw.results.find(e => e.family === 'badge' && e.profile === 'light' && e.viewport.id === 'desktop');
const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
  const b = readFileSync(entry.inputTrees[side].file); assert.equal(hash(b), entry.inputTrees[side].sha256);
  return [side, JSON.parse(b)];
}));
const base = { input: entry.styleInputs.find(i => i.id === 'badge-label'), ...trees };
const inspect = x => inspectOwnerCaretInput(x.input, x.reference, x.astylar, { family: 'badge' });
const referenceOwner = x => x.reference.nodes.find(n => n.attributes?.id === x.input.id);
const candidateOwner = x => x.astylar.nodes.find(n => n.authored?.id === x.input.id);

test('owner caret survey preserves original values and captured ancestry without equating caret paint', () => {
  const before = JSON.stringify(base), proof = inspect(base);
  assert.equal(proof.disposition, 'captured-caret-computed-versus-local-omission');
  assert.deepEqual(proof.issues, []); assert.equal(proof.referencePath.length, 4); assert.equal(proof.candidatePath.length, 5);
  assert.equal(proof.referenceComputedCaret, 'rgb(29, 27, 32)'); assert.equal(proof.candidateLocalCaret, '<omitted>');
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified', 'renderingEquivalent', 'rendererCauseProven'])
    assert.equal(proof[flag], false);
  assert.equal(JSON.stringify(base), before);
});

test('owner caret survey retains ancestor overrides motion unknown selectors and broken evidence as review cases', () => {
  const mutations = [
    ['incomplete-provenance', x => { x.astylar.resolvedStyleSource = 'invented'; }],
    ['incomplete-provenance', x => { x.reference.errors.push('missing stylesheet'); }],
    ['duplicate-tree-key', x => { x.reference.nodes.push(structuredClone(x.reference.nodes[0])); }],
    ['owner-mapping', x => { referenceOwner(x).attributes.id = 'other'; }],
    ['owner-mapping', x => { x.astylar.nodes.push({ ...structuredClone(candidateOwner(x)), key: 'duplicate-id' }); }],
    ['scalar-tree-disagreement', x => { x.input.reference.width = '999px'; }],
    ['scalar-tree-disagreement', x => { x.input.astylar.color = 'red'; }],
    ['scalar-authored-rule-gap', x => { x.input.referenceAuthored.push({ selector: '*', declarations: { color: { value: 'red', important: false } } }); }],
    ['incomplete-surface-ancestry', x => { referenceOwner(x).parent = 'missing'; }],
    ['incomplete-surface-ancestry', x => { candidateOwner(x).parent = candidateOwner(x).key; }],
    ['unreviewed-captured-root-context', x => { x.reference.nodes[0].type = 'body'; }],
    ['authored-caret-reset-or-motion-request', x => { x.reference.nodes[0].inline['caret-color'] = { value: 'red', important: false }; }],
    ['authored-caret-reset-or-motion-request', x => { x.reference.nodes[0].inline.caret = { value: 'auto', important: false }; }],
    ['authored-caret-reset-or-motion-request', x => { x.astylar.rules.push({ selector: '#page', caretColor: 'red' }); }],
    ['authored-caret-reset-or-motion-request', x => { x.astylar.rules.push({ selector: ':is(.unknown)', caretColor: 'red' }); }],
    ['authored-caret-reset-or-motion-request', x => { x.astylar.rules.push({ selector: '#page', all: 'initial' }); }],
    ['authored-caret-reset-or-motion-request', x => { x.astylar.rules.push({ selector: '#page', transition: 'color 1s' }); }],
    ['candidate-local-caret-reset-or-motion-value', x => { x.astylar.nodes.find(n => n.authored?.id === 'page').normalResolvedStyle.caretColor = 'red'; }],
    ['missing-candidate-stage', x => { delete x.astylar.nodes.find(n => n.authored?.id === 'page').interactionResolvedStyle; }],
    ['unparsed-style-attribute', x => { x.reference.nodes[0].attributes.style = 'c\\61ret-color:red'; }],
    ['relevant-style-attribute', x => { x.reference.nodes[0].attributes.style = 'caret-color:red'; }],
    ['editable-or-input-owner-needs-separate-proof', x => { x.reference.nodes[0].attributes.contenteditable = 'true'; }],
    ['editable-or-input-owner-needs-separate-proof', x => { candidateOwner(x).authored.attributes = { contenteditable: '' }; }],
    ['reference-caret-differs-from-text-color', x => {
      x.input.reference.caretColor = 'rgb(255, 0, 0)'; x.reference.styles[referenceOwner(x).style].caretColor = 'rgb(255, 0, 0)';
    }],
  ];
  for (const [reason, mutate] of mutations) {
    const x = structuredClone(base); mutate(x); const proof = inspect(x);
    assert.equal(proof.disposition, 'requires-specific-review', reason);
    assert.ok(proof.issues.some(i => i.reason === reason), `${reason}: ${JSON.stringify(proof.issues)}`);
    assert.equal(proof.computedCandidateVerified, false); assert.equal(proof.inputEquivalent, false);
  }
});

test('generated badge caret keeps explicit transition declarations and original full rule text', () => {
  const input = entry.styleInputs.find(i => i.id === 'badge-count');
  const proof = inspectOwnerCaretInput(input, trees.reference, trees.astylar, { family: 'badge' });
  assert.equal(proof.mapping, 'existing-generated-owner-proof'); assert.equal(proof.generatedIdentity.checkedReferenceProperties, 89);
  assert.equal(proof.disposition, 'requires-specific-review');
  assert.ok(proof.requests.reference.some(r => r.cssText.includes('transition: transform 200ms')));
  assert.ok(proof.requests.reference.some(r => r.cssText === 'transition: none;'));
  assert.equal(proof.referenceComputedCaret, 'rgb(255, 255, 255)');
  assert.equal(proof.candidateLocalCaret, '<omitted>'); assert.equal(proof.computedCandidateVerified, false);
});

test('owner caret survey replays every original case without changing canonical classifications', () => {
  const result = JSON.parse(execFileSync(process.execPath, ['scripts/audit-material-owner-caret-inputs.mjs', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim());
  assert.deepEqual(result, { groups: 145, originalCases: 1734, observations: 4050, canonicalOccurrences: 4050,
    exactCountGroups: 145, fullyReviewedLocalOmissionGroups: 86, canonicalIntegration: false, canonicalUnchanged: true });
  const survey = JSON.parse(readFileSync('docs/material-owner-caret-input-survey.json'));
  assert.equal(survey.groups.filter(g => g.everyObservationHasCapturedLocalOmissionEvidence)
    .reduce((n, g) => n + g.observations.length, 0), 2358);
  const slider = survey.groups.filter(g => g.family === 'slider' && ['slider-start', 'slider-primary'].includes(g.element));
  assert.equal(slider.length, 4); assert.equal(slider.reduce((n, g) => n + g.observations.length, 0), 156);
  assert.ok(slider.every(g => g.observations.every(o => o.reasons.includes('editable-or-input-owner-needs-separate-proof'))));
  assert.equal(survey.descendantCaretVerified, false); assert.equal(survey.inputEquivalent, false);
});
