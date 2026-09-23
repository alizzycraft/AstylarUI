import assert from 'node:assert/strict';
import test from 'node:test';
import { withAuditScratch } from './audit-scratch.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { classifyButtonBoxSizingInput as classify, buttonBoxSizingAttribution } from './button-box-sizing-classification.mjs';
import { validateButtonBoxSizingClassifications } from './button-box-sizing-coverage.mjs';
import { collectButtonBoxSizingInputs, validateButtonBoxSizingInputs } from './button-box-sizing-source-binding.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const evidence = JSON.parse(readFileSync('docs/material-button-box-sizing-source-binding.json')).evidence;
const bytes = readFileSync(evidence.binding.file); assert.equal(hash(bytes), evidence.binding.sha256);
const raw = JSON.parse(bytes), inputs = new Map();
const keyOf = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]])
  for (const e of entries) for (const input of selectedButtonInputs(e)) inputs.set(JSON.stringify([keyOf(kind, e), input.id]), input);
const inputOf = o => inputs.get(JSON.stringify([o.case, o.proof.element]));
const join = (o, input = inputOf(o), property = 'boxSizing', r = input.reference.boxSizing, a = input.astylar.boxSizing) =>
  classify(input, property, r, a, o);
function rowsOf(ledger) {
  const groups = new Map();
  for (const o of ledger.observations) {
    const c = join(o); assert.ok(c);
    const key = JSON.stringify([o.family, o.proof.element]);
    if (!groups.has(key)) groups.set(key, { family: o.family, element: o.proof.element,
      property: 'boxSizing', reference: 'border-box', astylar: undefined,
      classification: c.classification, attribution: c.attribution, recommendedOwner: c.owner,
      justification: c.justification, reviewEvidence: c.reviewEvidence, reviewedCases: [], occurrences: 0, cases: [], states: [] });
    const row = groups.get(key); row.reviewedCases.push(o.case); row.occurrences++;
    if (row.cases.length < 12) row.cases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  return [...groups.values()].sort((a, b) => a.family.localeCompare(b.family) ||
    a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

test('button box sizing classification retains all 108 measured and 492 unmeasured original observations', () => {
  assert.deepEqual(validateButtonBoxSizingInputs(evidence), []);
  const rows = rowsOf(evidence); assert.equal(rows.length, 9);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 600);
  assert.deepEqual(validateButtonBoxSizingClassifications(evidence, JSON.parse(JSON.stringify(rows))), []);
  let measured = 0, gaps = 0;
  for (const o of evidence.observations) {
    const c = join(o), p = c.reviewEvidence;
    assert.equal(c.attribution, buttonBoxSizingAttribution); assert.equal(c.classification, 'parity-harness-defect');
    assert.deepEqual(p.geometry, o.proof.geometry); assert.equal(p.geometryGap, o.proof.geometryGap);
    assert.equal(p.geometryAppliesOnlyToThisCase, true);
    for (const flag of ['computedCandidateVerified', 'interactionGeometryVerified', 'fullLayoutVerified',
      'wholeElementInputEquivalent', 'widthAuthoringEquivalent', 'inputEquivalent', 'renderingEquivalent']) assert.equal(p[flag], false);
    if (p.observedDeclaredBorderBox) measured++; else gaps++;
  }
  assert.equal(measured, 108); assert.equal(gaps, 492);
});

test('button box sizing scalar classification rejects unrelated properties defaults substitutions and inflated claims', () => {
  const o = evidence.observations[0], input = inputOf(o);
  assert.equal(join(o, input, 'width'), undefined);
  assert.equal(join(o, input, 'boxSizing', 'content-box'), undefined);
  assert.equal(join(o, input, 'boxSizing', 'border-box', 'border-box'), undefined);
  const mutations = [
    v => { v.inputSha256 = '0'.repeat(64); }, v => { v.proof.element = 'foreign'; },
    v => { v.proof.source = 'mesh-guess'; }, v => { v.proof.revision = -1; },
    v => { v.proof.referenceRule.request['box-sizing'].value = 'content-box'; },
    v => { v.proof.candidateOwnStageAbsent = false; }, v => { v.proof.candidateAuthoredBoxSizing = 'border-box'; },
    v => { v.proof.candidateAuthoredWidth = 'auto'; }, v => { v.proof.referenceAuthoredWidth = '141px'; },
    v => { v.proof.candidateLocalSize.width += 48; }, v => { v.proof.candidateLocalPadding = '0'; },
    v => { v.proof.geometry = null; }, v => { v.proof.observedDeclaredBorderBox = false; },
    v => { v.proof.geometryGap = 'invented'; }, v => { v.state = 'hover'; },
    v => { v.proof.widthAuthoringEquivalent = true; }, v => { v.proof.inputEquivalent = true; },
    v => { v.proof.renderingEquivalent = true; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const v = structuredClone(o); mutate(v); assert.equal(join(v, input), undefined, `scalar control ${i}`);
  }
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) {
    const i = structuredClone(input); i[stage].boxSizing = 'border-box';
    const v = structuredClone(o); v.inputSha256 = hash(JSON.stringify(i));
    assert.equal(join(v, i), undefined, 'a recomputed input hash cannot convert an explicit value to omission');
  }
  const interaction = evidence.observations.find(v => !v.proof.observedDeclaredBorderBox);
  for (const mutate of [v => { v.proof.geometry = o.proof.geometry; },
    v => { v.proof.observedDeclaredBorderBox = true; }, v => { v.proof.geometryGap = null; }]) {
    const v = structuredClone(interaction); mutate(v); assert.equal(join(v, inputOf(interaction)), undefined);
  }
});

test('button box sizing coverage rejects lost states forged measurements attribution escapes and expanded claims', () => withAuditScratch('button-box-sizing-classification-control-', directory => {
  // Independent original-source replay above is full scope. These mutations
  // use a three-case diagnostic capture to avoid reparsing the 117MB full
  // source for each forged receipt; original tree ownership remains intact.
  const small = { results: [raw.results.find(e => e.family === 'button' && e.profile === 'light'),
    raw.results.find(e => selectedButtonInputs(e).length === 0)],
  interactions: [raw.interactions.find(e => e.family === 'button' && e.profile === 'light')] };
  const parityPath = path.join(directory, 'capture.json'); writeFileSync(parityPath, JSON.stringify(small));
  const ledger = collectButtonBoxSizingInputs(small, { parityPath }); assert.equal(ledger.binding.status, 'bound');
  const rows = rowsOf(ledger); assert.equal(rows.length, 3);
  assert.deepEqual(validateButtonBoxSizingClassifications(ledger, rows), []);
  const mutations = [
    r => { r.pop(); }, r => { r[0].attribution = 'unresolved'; }, r => { r[0].reviewedCases.pop(); },
    r => { r[0].cases = []; }, r => { r[0].states = []; }, r => { r[0].occurrences++; },
    r => { r[0].astylar = 'border-box'; }, r => { r[0].classification = 'equivalent-representation'; },
    r => { r[0].recommendedOwner = 'fixture styling'; }, r => { r[0].justification = 'all states are equivalent'; },
    r => { r[0].reviewEvidence.geometry.actual.left += 7; },
  ];
  for (const flag of ['computedCandidateVerified', 'interactionGeometryVerified', 'fullLayoutVerified',
    'wholeElementInputEquivalent', 'widthAuthoringEquivalent', 'inputEquivalent', 'renderingEquivalent'])
    mutations.push(r => { r[0].reviewEvidence[flag] = true; });
  for (const [i, mutate] of mutations.entries()) {
    const r = structuredClone(rows); mutate(r); assert.ok(validateButtonBoxSizingClassifications(ledger, r).length, `row control ${i}`);
  }
  const ledgerMutations = [
    v => { v.observations = v.observations.filter(o => o.proof.observedDeclaredBorderBox); },
    v => { v.observations[1] = v.observations[0]; }, v => { v.observations[0].profile = 'other'; },
    v => { v.observations[0].proof.geometry.actual.left += 7; v.observations[0].proof.geometry.actual.right += 7; },
    v => { v.observations.find(o => !o.proof.observedDeclaredBorderBox).proof.geometry = v.observations[0].proof.geometry; },
    v => { v.binding.sha256 = '0'.repeat(64); }, v => { v.binding.file = 'package.json'; },
  ];
  for (const [i, mutate] of ledgerMutations.entries()) {
    const v = structuredClone(ledger); mutate(v); assert.ok(validateButtonBoxSizingClassifications(v, rows).length, `ledger control ${i}`);
  }
  console.log(JSON.stringify({ rowControls: mutations.length, ledgerControls: ledgerMutations.length,
    temporaryDiagnosticCapture: parityPath }));
}));
