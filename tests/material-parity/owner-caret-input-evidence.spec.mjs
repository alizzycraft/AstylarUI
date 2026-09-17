import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { inspectOwnerCaretInput } from './owner-caret-input-evidence.mjs';
import { bindOwnerCaretMembership } from './owner-caret-canonical-membership.mjs';

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
  // Re-execute the pinned generator, including complete original canonical-row
  // membership. Only its enclosing audit-module receipt may differ; exact
  // executed normalization, all other sources and all report fields are checked.
  // Keep the original generator and survey immutable, not rewritten as current.
  const result = JSON.parse(execFileSync(process.execPath, ['scripts/diagnose-material-caret-survey-receipt.mjs'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }).trim());
  const countFields = ['groups', 'originalCases', 'observations', 'canonicalOccurrences',
    'exactCountGroups', 'fullyReviewedLocalOmissionGroups', 'canonicalIntegration', 'canonicalUnchanged'];
  assert.deepEqual(Object.fromEntries(countFields.map(k => [k, result[k]])),
    { groups: 145, originalCases: 1734, observations: 4050, canonicalOccurrences: 4050,
    exactCountGroups: 145, fullyReviewedLocalOmissionGroups: 86, canonicalIntegration: false, canonicalUnchanged: true });
  assert.equal(result.completeOriginalGeneratorReplayed, true);
  assert.equal(result.nonReceiptEvidenceUnchanged, true); assert.equal(result.surveyUnchanged, true);
  assert.equal(result.normalizationFunctions, 7); assert.equal(result.canonicalIntegrationVerified, false);
  const survey = JSON.parse(readFileSync('docs/material-owner-caret-input-survey.json'));
  assert.equal(survey.groups.filter(g => g.everyObservationHasCapturedLocalOmissionEvidence)
    .reduce((n, g) => n + g.observations.length, 0), 2358);
  const slider = survey.groups.filter(g => g.family === 'slider' && ['slider-start', 'slider-primary'].includes(g.element));
  assert.equal(slider.length, 4); assert.equal(slider.reduce((n, g) => n + g.observations.length, 0), 156);
  assert.ok(slider.every(g => g.observations.every(o => o.reasons.includes('editable-or-input-owner-needs-separate-proof'))));
  assert.equal(survey.descendantCaretVerified, false); assert.equal(survey.inputEquivalent, false);
  assert.equal(survey.membership.groups, 145); assert.equal(survey.membership.originalCasesScanned, 2311);
  assert.equal(survey.membership.observations, 4050);
  assert.equal(survey.membership.selectedCaseCount, survey.cases.length);
  assert.equal(survey.membership.selectedCasesSha256, hash(JSON.stringify(survey.cases)));
  assert.equal(survey.membership.memberships.filter(g => g.observations > 12).length > 0, true);
  for (const flag of ['inputEquivalent', 'computedCandidateVerified', 'renderingEquivalent', 'rendererCauseProven'])
    assert.equal(survey.membership[flag], false);
});

test('caret membership rejects equal-count substitutions beyond the canonical sample and altered raw provenance', () => {
  const input = { id: 'label', reference: { caretColor: 'rgb(1, 2, 3)', color: 'rgb(1, 2, 3)' }, astylar: {} };
  const original = { results: Array.from({ length: 14 }, (_, i) => ({ family: 'example', profile: 'light',
    viewport: { id: `v${i}` }, inputTrees: { reference: { sha256: `r${i}` }, astylar: { sha256: `a${i}` } },
    styleInputs: [structuredClone(input)] })), interactions: [] };
  original.interactions.push({ ...structuredClone(original.results[0]), state: 'hover' });
  const observations = [...original.results, ...original.interactions].map(e => ({
    case: `${e.state ? 'interaction' : 'static'}:example@light/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
    inputSha256: hash(JSON.stringify(e.styleInputs[0])), inputTrees: structuredClone(e.inputTrees),
    referenceRaw: input.reference.caretColor, referenceColorRaw: input.reference.color, candidateRaw: '<omitted>' }));
  const row = { family: 'example', element: 'label', property: 'caretColor', reference: input.reference.caretColor,
    attribution: 'unresolved', classification: 'unresolved', occurrences: observations.length,
    cases: observations.slice(0, 12).map(o => o.case), states: ['static', 'hover'] };
  const group = { family: row.family, element: row.element, property: row.property, reference: row.reference,
    candidate: '<omitted>', canonicalRowSha256: hash(JSON.stringify(row)), canonicalOccurrences: observations.length,
    originalCountMatchesCanonical: true, observations };
  const base = { groups: [group], rows: [row], original };
  const bind = x => bindOwnerCaretMembership(x.groups, x.rows, x.original, style => style);
  const before = JSON.stringify(base), result = bind(base);
  assert.equal(result.observations, 15); assert.equal(result.originalCasesScanned, 15);
  assert.equal(result.memberships[0].canonicalSample.length, 12); assert.equal(JSON.stringify(base), before);
  const mutations = [
    x => { x.groups.pop(); },
    x => { x.groups.push(structuredClone(x.groups[0])); x.rows.push(structuredClone(x.rows[0])); },
    x => { x.groups[0].observations[13].case = x.groups[0].observations[12].case; },
    x => { [x.groups[0].observations[12], x.groups[0].observations[13]] = [x.groups[0].observations[13], x.groups[0].observations[12]]; },
    x => { x.groups[0].observations[13].inputSha256 = '0'.repeat(64); },
    x => { x.groups[0].observations[13].inputTrees.astylar.sha256 = 'changed'; },
    x => { x.groups[0].observations[13].referenceRaw = 'red'; },
    x => { x.groups[0].observations[13].referenceColorRaw = 'red'; },
    x => { x.groups[0].observations[13].candidateRaw = 'auto'; },
    x => { x.groups[0].canonicalRowSha256 = '0'.repeat(64); },
    x => { x.rows[0].cases.reverse(); x.groups[0].canonicalRowSha256 = hash(JSON.stringify(x.rows[0])); },
    x => { x.rows[0].states.pop(); x.groups[0].canonicalRowSha256 = hash(JSON.stringify(x.rows[0])); },
    x => { x.rows[0].attribution = 'equivalent'; },
    x => { x.rows[0].astylar = '<omitted>'; },
    x => { x.original.results.push(structuredClone(x.original.results[0])); },
    x => { x.original.results[0].styleInputs.push(structuredClone(x.original.results[0].styleInputs[0])); },
    x => { x.original.results[13].styleInputs[0].astylar.caretColor = '<omitted>'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const x = structuredClone(base); mutate(x); assert.throws(() => bind(x), `mutation ${i}`);
  }
});
