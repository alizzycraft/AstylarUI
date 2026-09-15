import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectRootShadowInputs, classifyRootShadowInput, rootShadowAttribution,
  validateRootShadowInputs, validateRootShadowClassifications } from './root-shadow-source-binding.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectRootShadowInputs(raw, { parityPath });
// Binding proof only. Production normalization, precedence and complete-row
// conservation must be tested separately before canonical integration.
const canonical = v => ({ ...v }), equivalent = (_p, a, b) => a === b;
function rowsOf(source) {
  const rows = new Map();
  for (const o of source.observations) {
    const r = o.input.reference.boxShadow, a = o.input.astylar.boxShadow;
    const c = classifyRootShadowInput(o.input, 'boxShadow', r, a, o, canonical); assert.ok(c);
    if (!rows.has(o.family)) rows.set(o.family, { family: o.family, element: o.element, property: 'boxShadow',
      reference: r, astylar: a, classification: c.classification, attribution: c.attribution,
      recommendedOwner: c.owner, justification: c.justification, reviewEvidence: c.reviewEvidence,
      reviewedCases: [], cases: [], states: [], occurrences: 0 });
    const row = rows.get(o.family); row.reviewedCases.push(o.case); row.occurrences++;
    if (row.cases.length < 12) row.cases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  return [...rows.values()];
}

test('root shadow source binding retains every original case and every independently reviewed proof', () => {
  assert.equal(evidence.binding.status, 'bound');
  assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 2311);
  const durable = JSON.parse(readFileSync('docs/material-root-shadow-input-audit.json'));
  assert.deepEqual(evidence.observations.map(o => [o.case, o.family, o.state, o.proof]),
    durable.observations.map(o => [o.case, o.family, o.state, o.proof]));
  assert.deepEqual(validateRootShadowInputs(evidence), []);
  const rows = rowsOf(evidence); assert.equal(rows.length, 36);
  assert.equal(rows.reduce((sum, r) => sum + r.occurrences, 0), 2311);
  assert.deepEqual(validateRootShadowClassifications(evidence, rows, canonical, equivalent), []);
  for (const row of rows) assert.equal(row.attribution, rootShadowAttribution);
});

test('root shadow source binding rejects selected populations and changed input owners', () => {
  assert.equal(collectRootShadowInputs(raw).binding.status, 'unbound');
  const missing = { ...raw, results: raw.results.slice(1) };
  const duplicated = { ...raw, interactions: [...raw.interactions, raw.interactions[0]] };
  const changed = { ...raw, results: [...raw.results] };
  changed.results[0] = structuredClone(changed.results[0]);
  changed.results[0].styleInputs.find(i => i.id === changed.results[0].family + '-root').reference.boxShadow = 'none';
  for (const report of [missing, duplicated, changed])
    assert.equal(collectRootShadowInputs(report, { parityPath }).binding.status, 'invalid');
  assert.equal(collectRootShadowInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid');
});

test('root shadow replay rejects lost evidence changed traces and unsupported raster claims', () => {
  for (const mutate of [e => { e.observations.pop(); e.captures.pop(); },
    e => { e.observations[0].proof.candidateRule.request = 'none'; },
    e => { e.observations[0].proof.renderingEquivalent = true; },
    e => { e.binding.sha256 = '0'.repeat(64); }]) {
    const copy = structuredClone(evidence); mutate(copy);
    assert.ok(validateRootShadowInputs(copy).length);
  }
});

test('root shadow classification rejects incomplete coverage changed identity values and claims', () => {
  const rows = rowsOf(evidence);
  const mutations = [rs => rs.pop(), rs => rs[0].reviewedCases.pop(),
    rs => { rs[0].states = []; }, rs => { rs[0].astylar = 'none'; },
    rs => { rs[0].reviewEvidence.renderingEquivalent = true; },
    rs => { rs[0].recommendedOwner = 'invented'; },
    rs => { rs[0].reviewedCases[1] = rs[0].reviewedCases[0]; },
    rs => { rs[0].justification = 'different claim'; },
    rs => { rs[0].classification = 'equivalent-representation'; },
    rs => { rs[0].family = 'other'; }, rs => { rs[0].element = 'other-root'; },
    rs => { rs[0].occurrences++; }];
  for (const mutate of mutations) {
    const copy = structuredClone(rows); mutate(copy);
    assert.ok(validateRootShadowClassifications(evidence, copy, canonical, equivalent).length);
  }
  const o = evidence.observations[0], r = o.input.reference.boxShadow, a = o.input.astylar.boxShadow;
  assert.equal(classifyRootShadowInput(o.input, 'color', r, a, o, canonical), undefined);
  assert.equal(classifyRootShadowInput(o.input, 'boxShadow', r, 'none', o, canonical), undefined);
  for (const flag of ['inputEquivalent', 'originalRasterCauseProven', 'candidateUsedPaintVerified', 'renderingEquivalent']) {
    const copy = structuredClone(o); copy.proof[flag] = true;
    assert.equal(classifyRootShadowInput(copy.input, 'boxShadow', r, a, copy, canonical), undefined);
  }
});
