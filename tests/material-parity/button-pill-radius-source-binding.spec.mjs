import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { collectButtonPillRadiusInputs, classifyButtonPillRadiusInput, buttonPillRadiusAttribution,
  validateButtonPillRadiusInputs, validateButtonPillRadiusClassifications } from './button-pill-radius-source-binding.mjs';
import { buttonRadiusProperties } from './button-pill-radius-evidence.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectButtonPillRadiusInputs(raw, { parityPath });
// This callback expands only the captured uniform radius shorthand. It is not
// the production normalizer; production precedence and conservation are pending.
const canonical = v => ({ ...v, ...(v.borderRadius ? Object.fromEntries(buttonRadiusProperties.map(p => [p, v.borderRadius])) : {}) });
const equivalent = (_p, a, b) => a === b;
function rowsOf(source) {
  const rows = new Map();
  for (const o of source.observations) for (const property of buttonRadiusProperties) {
    const r = canonical(o.input.reference)[property], a = canonical(o.input.astylar)[property];
    const c = classifyButtonPillRadiusInput(o.input, property, r, a, o, canonical); assert.ok(c);
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

test('button pill binding independently replays all cases and all 600 reviewed owners', () => {
  assert.equal(evidence.binding.status, 'bound');
  assert.equal(evidence.captures.length, 2311); assert.equal(evidence.observations.length, 600);
  assert.equal(evidence.captures.filter(c => !c.styleInputs.length).length, 1831);
  const durable = JSON.parse(readFileSync('docs/material-button-pill-radius-audit.json'));
  assert.deepEqual(evidence.observations.map(o => [o.case, o.family, o.state, o.proof]),
    durable.observations.map(o => [o.case, o.family, o.state, o.proof]));
  assert.deepEqual(validateButtonPillRadiusInputs(evidence), []);
  const rows = rowsOf(evidence); assert.equal(rows.length, 108);
  assert.equal(rows.reduce((n, r) => n + r.occurrences, 0), 2400);
  assert.deepEqual(validateButtonPillRadiusClassifications(evidence, rows, canonical, equivalent), []);
  assert.ok(rows.every(r => r.attribution === buttonPillRadiusAttribution));
});

test('button pill binding rejects detached populations values and missing owners', () => {
  assert.equal(collectButtonPillRadiusInputs(raw).binding.status, 'unbound');
  const missing = { ...raw, results: raw.results.slice(1) };
  const duplicate = { ...raw, interactions: [...raw.interactions, raw.interactions[0]] };
  const changed = { ...raw, results: [...raw.results] }, removed = { ...raw, results: [...raw.results] };
  const index = raw.results.findIndex(e => e.family === 'button');
  changed.results[index] = structuredClone(changed.results[index]);
  changed.results[index].styleInputs.find(i => i.id === 'button-primary').astylar.borderRadius = '9999px';
  removed.results[index] = structuredClone(removed.results[index]);
  removed.results[index].styleInputs = removed.results[index].styleInputs.filter(i => i.id !== 'button-primary');
  for (const r of [missing, duplicate, changed, removed])
    assert.equal(collectButtonPillRadiusInputs(r, { parityPath }).binding.status, 'invalid');
  assert.equal(collectButtonPillRadiusInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid');
});

test('button pill source replay rejects removed negatives and changed source evidence', () => {
  for (const mutate of [e => { e.captures.splice(e.captures.findIndex(c => !c.styleInputs.length), 1); },
    e => { e.observations.pop(); }, e => { e.observations[0].proof.referenceRule.cssText = ''; },
    e => { e.observations[0].proof.candidateUsedPaintVerified = true; },
    e => { e.binding.sha256 = '0'.repeat(64); }]) {
    const copy = structuredClone(evidence); mutate(copy);
    assert.ok(validateButtonPillRadiusInputs(copy).length);
  }
});

test('button pill classification rejects incomplete coverage and unsupported equivalence claims', () => {
  const rows = rowsOf(evidence);
  const mutations = [rs => rs.pop(), rs => rs[0].reviewedCases.pop(),
    rs => { rs[0].states = []; }, rs => { rs[0].astylar = '9999px'; },
    rs => { rs[0].reviewEvidence.renderingEquivalent = true; },
    rs => { rs[0].reviewEvidence.currentBrowserShapeMayCoincide = false; },
    rs => { rs[0].recommendedOwner = 'invented'; },
    rs => { rs[0].reviewedCases[1] = rs[0].reviewedCases[0]; },
    rs => { rs[0].justification = 'equivalent because current height constrains corners'; },
    rs => { rs[0].classification = 'equivalent-representation'; },
    rs => { rs[0].family = 'other'; }, rs => { rs[0].element = 'other-button'; },
    rs => { rs[0].occurrences++; }];
  for (const mutate of mutations) {
    const copy = structuredClone(rows); mutate(copy);
    assert.ok(validateButtonPillRadiusClassifications(evidence, copy, canonical, equivalent).length);
  }
  const o = evidence.observations[0], property = buttonRadiusProperties[0];
  const r = canonical(o.input.reference)[property], a = canonical(o.input.astylar)[property];
  assert.equal(classifyButtonPillRadiusInput(o.input, 'height', r, a, o, canonical), undefined);
  assert.equal(classifyButtonPillRadiusInput(o.input, property, r, '9999px', o, canonical), undefined);
  for (const flag of ['authoredIntentEquivalent', 'candidateUsedPaintVerified', 'originalRasterCauseProven', 'renderingEquivalent']) {
    const copy = structuredClone(o); copy.proof[flag] = true;
    assert.equal(classifyButtonPillRadiusInput(copy.input, property, r, a, copy, canonical), undefined);
  }
});

test('button pill diagnostic selection retains cases without inventing omitted scalar owners', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/button-pill-negative-'));
  try {
    const entry = raw.results.find(e => e.family === 'button');
    const diagnostic = { results: [{ ...entry, styleInputs: entry.styleInputs.filter(i => i.id === 'button-root') }], interactions: [] };
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(diagnostic));
    const result = collectButtonPillRadiusInputs(diagnostic, { parityPath: file });
    assert.equal(result.binding.status, 'bound'); assert.equal(result.captures.length, 1);
    assert.deepEqual(result.observations, []); assert.deepEqual(validateButtonPillRadiusInputs(result), []);
    assert.deepEqual(validateButtonPillRadiusClassifications(result, [], canonical, equivalent), []);
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
});
