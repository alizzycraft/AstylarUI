import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { collectButtonHostRequestInputs, classifyButtonHostRequestInput, buttonHostRequestAttribution,
  validateButtonHostRequestInputs, validateButtonHostRequestClassifications } from './button-host-request-source-binding.mjs';
import { buttonHostRequests } from './button-host-request-evidence.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectButtonHostRequestInputs(raw, { parityPath });
// Direct captured properties only: this is source binding, not a production
// normalization or existing-classification precedence test.
const canonical = v => v;
const equivalent = (_p, a, b) => a === b;
function rowsOf(source) {
  const rows = new Map();
  for (const o of source.observations) for (const property of Object.keys(buttonHostRequests)) {
    const r = canonical(o.input.reference)[property], a = canonical(o.input.astylar)[property];
    const c = classifyButtonHostRequestInput(o.input, property, r, a, o, canonical); assert.ok(c);
    const key = JSON.stringify([o.family, o.element, property, r, a]);
    if (!rows.has(key)) rows.set(key, { family: o.family, element: o.element, property,
      reference: r, astylar: a, classification: c.classification, attribution: c.attribution,
      recommendedOwner: c.owner, justification: c.justification, reviewEvidence: c.reviewEvidence,
      reviewedCases: [], cases: [], states: [], occurrences: 0 });
    const row = rows.get(key); row.reviewedCases.push(o.case); row.occurrences++;
    if (row.cases.length < 12) row.cases.push(o.case);
    if (!row.states.includes(o.state)) row.states.push(o.state);
  }
  return [...rows.values()];
}

test('button host request binding independently replays 2311 cases and 600 original owners', () => {
  assert.equal(evidence.binding.status, 'bound');
  assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 600);
  assert.equal(evidence.captures.filter(c => !c.styleInputs.length).length, 1831);
  const durable = JSON.parse(readFileSync('docs/material-button-host-request-audit.json'));
  assert.deepEqual(evidence.observations.map(o => [o.case, o.family, o.state, o.proof]),
    durable.observations.map(o => [o.case, o.family, o.state, o.proof]));
  assert.deepEqual(validateButtonHostRequestInputs(evidence), []);
  const rows = rowsOf(evidence); assert.equal(rows.length, 27);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 1800);
  assert.deepEqual(validateButtonHostRequestClassifications(evidence, rows, canonical, equivalent), []);
  assert.ok(rows.every(r => r.attribution === buttonHostRequestAttribution));
  const values = evidence.observations.flatMap(o => o.proof.properties);
  assert.equal(values.filter(p => p.candidateOwnStageAbsent).length, 1748);
  assert.equal(values.filter(p => p.candidateLocal === 'absolute').length, 52);
  assert.ok(values.filter(p => p.candidateOwnStageAbsent).every(p => p.candidateLocal === null));
  // JSON omission of raw undefined must not be misread as an authored null/default.
  assert.deepEqual(validateButtonHostRequestClassifications(evidence,
    JSON.parse(JSON.stringify(rows)), canonical, equivalent), []);
});

test('button host request binding rejects detached populations changed values and missing owners', () => {
  assert.equal(collectButtonHostRequestInputs(raw).binding.status, 'unbound');
  const missing = { ...raw, results: raw.results.slice(1) };
  const duplicate = { ...raw, interactions: [...raw.interactions, raw.interactions[0]] };
  const changed = { ...raw, results: [...raw.results] }, removed = { ...raw, results: [...raw.results] };
  const index = raw.results.findIndex(e => e.family === 'button');
  changed.results[index] = structuredClone(changed.results[index]);
  changed.results[index].styleInputs.find(i => i.id === 'button-primary').astylar.position = 'relative';
  removed.results[index] = structuredClone(removed.results[index]);
  removed.results[index].styleInputs = removed.results[index].styleInputs.filter(i => i.id !== 'button-primary');
  for (const r of [missing, duplicate, changed, removed])
    assert.equal(collectButtonHostRequestInputs(r, { parityPath }).binding.status, 'invalid');
  assert.equal(collectButtonHostRequestInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid');
});

test('button host request source replay rejects lost negatives altered source rules and layout claims', () => {
  for (const mutate of [e => { e.captures.splice(e.captures.findIndex(c => !c.styleInputs.length), 1); },
    e => { e.observations.pop(); }, e => { e.observations[0].proof.referenceRules[0].requests = {}; },
    e => { e.observations[0].proof.candidateUsedLayoutVerified = true; },
    e => { e.binding.sha256 = '0'.repeat(64); }]) {
    const copy = structuredClone(evidence); mutate(copy);
    assert.ok(validateButtonHostRequestInputs(copy).length);
  }
});

test('button host request classification rejects missing coverage forged composition and equivalence', () => {
  const rows = rowsOf(evidence);
  const mutations = [rs => rs.pop(), rs => rs[0].reviewedCases.pop(),
    rs => { rs[0].states = []; }, rs => { rs[0].astylar = 'relative'; },
    rs => { rs[0].reviewEvidence.renderingEquivalent = true; },
    rs => { rs[0].reviewEvidence.referenceLabel.ownText = 'invented'; },
    rs => { rs[0].recommendedOwner = 'invented'; },
    rs => { rs[0].reviewedCases[1] = rs[0].reviewedCases[0]; },
    rs => { rs[0].justification = 'missing min-width is always equivalent to zero'; },
    rs => { rs[0].classification = 'equivalent-representation'; },
    rs => { rs[0].family = 'other'; }, rs => { rs[0].element = 'other-button'; },
    rs => { rs[0].occurrences++; }];
  for (const mutate of mutations) {
    const copy = structuredClone(rows); mutate(copy);
    assert.ok(validateButtonHostRequestClassifications(evidence, copy, canonical, equivalent).length);
  }
  const o = evidence.observations.find(o => o.element !== 'core-primary'), r = o.input.reference.position, a = o.input.astylar.position;
  assert.equal(classifyButtonHostRequestInput(o.input, 'display', r, a, o, canonical), undefined);
  assert.equal(classifyButtonHostRequestInput(o.input, 'position', r, 'relative', o, canonical), undefined);
  for (const flag of ['inputEquivalent', 'candidateUsedLayoutVerified', 'originalRasterCauseProven', 'structuralEquivalenceVerified', 'renderingEquivalent']) {
    const copy = structuredClone(o); copy.proof[flag] = true;
    assert.equal(classifyButtonHostRequestInput(copy.input, 'position', r, a, copy, canonical), undefined);
  }
  for (const substitute of [null, 'static', 'relative', 0]) {
    const invented = structuredClone(o); invented.input.astylar.position = substitute;
    invented.proof.properties.find(p => p.property === 'position').candidateLocal = substitute;
    invented.proof.properties.find(p => p.property === 'position').candidateOwnStageAbsent = false;
    assert.equal(classifyButtonHostRequestInput(invented.input, 'position', r, substitute, invented, canonical), undefined);
  }
  const core = evidence.observations.find(o => o.element === 'core-primary');
  assert.ok(classifyButtonHostRequestInput(core.input, 'position', 'relative', 'absolute', core, canonical));
  const forged = structuredClone(core);
  forged.proof.properties.find(p => p.property === 'position').candidateOwnStageAbsent = true;
  assert.equal(classifyButtonHostRequestInput(forged.input, 'position', 'relative', 'absolute', forged, canonical), undefined);
  const badLabel = structuredClone(o); badLabel.proof.referenceLabel.ownText = 'different';
  assert.equal(classifyButtonHostRequestInput(badLabel.input, 'position', r, a, badLabel, canonical), undefined);
});

test('button host request diagnostic selection retains source cases without inventing missing scalar owners', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/button-host-request-negative-'));
  try {
    const entry = raw.results.find(e => e.family === 'button');
    const diagnostic = { results: [{ ...entry, styleInputs: entry.styleInputs.filter(i => i.id === 'button-root') }], interactions: [] };
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(diagnostic));
    const result = collectButtonHostRequestInputs(diagnostic, { parityPath: file });
    assert.equal(result.binding.status, 'bound'); assert.equal(result.captures.length, 1);
    assert.deepEqual(result.observations, []); assert.deepEqual(validateButtonHostRequestInputs(result), []);
    assert.deepEqual(validateButtonHostRequestClassifications(result, [], canonical, equivalent), []);
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
});
