import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectRootFlowHeightInputs, classifyRootFlowHeightInput, rootFlowHeightAttribution,
  validateRootFlowHeightInputs, validateRootFlowHeightClassifications } from './root-flow-height-source-binding.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const original = JSON.parse(readFileSync(parityPath));
const evidence = collectRootFlowHeightInputs(original, { parityPath });
// These callbacks exercise source binding, not the production normalizer.
// Explicitly expand only the captured two equal gap axes for this local proof.
const canonical = v => ({ ...v, ...(v.gap === '16px' ? { rowGap: '16px', columnGap: '16px' } : {}) });
const equivalent = (_p, a, b) => a === b;
function rowsOf(source) {
  const rows = new Map();
  for (const o of source.observations) for (const p of o.proof.properties) {
    const r = canonical(o.input.reference)[p.property], a = canonical(o.input.astylar)[p.property];
    const c = classifyRootFlowHeightInput(o.input, p.property, r, a, o, canonical);
    if (!o.proof.heightOverrides.length) { assert.equal(c, undefined); continue; }
    assert.ok(c); const key = JSON.stringify([o.family, p.property]);
    if (!rows.has(key)) rows.set(key, { family: o.family, element: o.element, property: p.property,
      reference: r, astylar: a, classification: c.classification, attribution: c.attribution,
      recommendedOwner: c.owner, justification: c.justification, reviewEvidence: c.reviewEvidence,
      reviewedCases: [], cases: [], states: [], occurrences: 0 });
    const row = rows.get(key); row.reviewedCases.push(o.case); row.occurrences++;
    if (row.cases.length < 12) row.cases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  return [...rows.values()];
}

test('root flow height binding replays all 164 originals and keeps 26 single-rule controls separate', () => {
  assert.equal(evidence.binding.status, 'bound');
  assert.equal(evidence.captures.length, 164); assert.equal(evidence.observations.length, 164);
  const durable = JSON.parse(readFileSync('docs/material-root-flow-height-overrides.json'));
  assert.deepEqual(evidence.observations.map(o => [o.case, o.family, o.state, o.proof]),
    durable.observations.map(o => [o.case, o.family, o.state, o.proof]));
  assert.deepEqual(validateRootFlowHeightInputs(evidence), []);
  assert.equal(evidence.observations.filter(o => !o.proof.heightOverrides.length).length, 26);
  const rows = rowsOf(evidence); assert.equal(rows.length, 9);
  assert.equal(rows.reduce((sum, r) => sum + r.occurrences, 0), 414);
  assert.deepEqual(validateRootFlowHeightClassifications(evidence, rows, canonical, equivalent), []);
  assert.ok(rows.every(r => r.attribution === rootFlowHeightAttribution));
});

test('root flow height binding rejects changed populations and original scalar evidence', () => {
  assert.equal(collectRootFlowHeightInputs(original).binding.status, 'unbound');
  const index = original.results.findIndex(e => e.family === 'button');
  const removed = { ...original, results: original.results.filter((_e, i) => i !== index) };
  const duplicate = { ...original, results: [...original.results, original.results[index]] };
  const changed = { ...original, results: [...original.results] };
  changed.results[index] = structuredClone(changed.results[index]);
  changed.results[index].styleInputs.find(i => i.id === 'button-root').astylar.gap = '8px';
  const missingScalar = { ...original, results: [...original.results] };
  missingScalar.results[index] = { ...original.results[index], styleInputs: original.results[index].styleInputs.filter(i => i.id !== 'button-root') };
  for (const r of [removed, duplicate, changed, missingScalar])
    assert.equal(collectRootFlowHeightInputs(r, { parityPath }).binding.status, 'invalid');
  assert.equal(collectRootFlowHeightInputs(original, { parityPath: 'package.json' }).binding.status, 'invalid');
});

test('root flow height source replay rejects lost controls altered overrides and unsupported claims', () => {
  for (const mutate of [e => { const i = e.observations.findIndex(o => !o.proof.heightOverrides.length); e.observations.splice(i, 1); },
    e => { e.observations[0].proof.heightOverrides[0].height = '999px'; },
    e => { e.observations[0].proof.heightBehaviorVerified = true; },
    e => { e.binding.sha256 = '0'.repeat(64); }]) {
    const copy = structuredClone(evidence); mutate(copy);
    assert.ok(validateRootFlowHeightInputs(copy).length);
  }
});

test('root flow height classification rejects incomplete coverage invented values and control reclassification', () => {
  const rows = rowsOf(evidence);
  const mutations = [rs => rs.pop(), rs => rs[0].reviewedCases.pop(), rs => { rs[0].states = []; },
    rs => { rs[0].astylar = '8px'; }, rs => { rs[0].reviewEvidence.heightBehaviorVerified = true; },
    rs => { rs[0].recommendedOwner = 'invented'; }, rs => { rs[0].reviewedCases[1] = rs[0].reviewedCases[0]; },
    rs => { rs[0].justification = 'different claim'; }, rs => { rs[0].classification = 'equivalent-representation'; },
    rs => { rs[0].family = 'other'; }, rs => { rs[0].occurrences++; },
    rs => { rs[0].reviewEvidence.heightOverrides = []; }];
  for (const mutate of mutations) {
    const copy = structuredClone(rows); mutate(copy);
    assert.ok(validateRootFlowHeightClassifications(evidence, copy, canonical, equivalent).length);
  }
  const o = evidence.observations.find(o => o.proof.heightOverrides.length);
  for (const flag of ['inputEquivalent', 'heightBehaviorVerified', 'originalRasterCauseProven', 'renderingEquivalent']) {
    const copy = structuredClone(o); copy.proof[flag] = true;
    assert.equal(classifyRootFlowHeightInput(copy.input, 'rowGap', 'normal', '16px', copy, canonical), undefined);
  }
  assert.equal(classifyRootFlowHeightInput(o.input, 'height', o.input.reference.height, o.input.astylar.height, o, canonical), undefined);
  const single = evidence.observations.find(o => !o.proof.heightOverrides.length);
  assert.equal(classifyRootFlowHeightInput(single.input, 'rowGap', 'normal', '16px', single, canonical), undefined);
});
