import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectOwnerGridInitialInputs, validateOwnerGridInitialInputs } from './owner-grid-initial-source-binding.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectOwnerGridInitialInputs(raw, { parityPath });

test('owner grid source binding retains every original case, positive witness and review gap', () => {
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  const durable = JSON.parse(readFileSync('docs/material-owner-grid-initial-survey.json'));
  assert.deepEqual(evidence.captures, durable.captures);
  assert.deepEqual(evidence.observations, durable.evidence);
  assert.deepEqual(evidence.groups, durable.groups);
  assert.equal(evidence.captures.length, 2311);
  assert.equal(evidence.observations.length, 13824);
  assert.equal(evidence.groups.length, 233);
  assert.equal(evidence.observations.filter(o => !o.proof.issues.length).length, 10968);
  assert.equal(evidence.observations.filter(o => o.proof.issues.length).length, 2856);
  for (const o of evidence.observations) for (const flag of ['computedCandidateVerified', 'gridLayoutEquivalent', 'renderingEquivalent'])
    assert.equal(o.proof[flag], false);
  assert.deepEqual(validateOwnerGridInitialInputs(JSON.parse(JSON.stringify(evidence))), []);
});

test('owner grid source binding rejects changed caller eligibility, values, identity, tree descriptors and case population', () => {
  assert.equal(collectOwnerGridInitialInputs(raw).binding.status, 'unbound');
  assert.equal(collectOwnerGridInitialInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid');
  const original = raw.results.findIndex(e => e.styleInputs.some(i => i.reference?.gridTemplateColumns === 'none' &&
    i.astylar && !Object.hasOwn(i.astylar, 'gridTemplateColumns')));
  for (const mutate of [
    e => { e.styleInputs = []; },
    e => { e.styleInputs.push(structuredClone(e.styleInputs[0])); },
    e => { const i = e.styleInputs.find(i => i.reference?.gridTemplateColumns === 'none'); i.reference.gridTemplateColumns = '1fr'; },
    e => { const i = e.styleInputs.find(i => i.reference?.gridTemplateColumns === 'none'); i.astylar.gridTemplateColumns = 'none'; },
    e => { const i = e.styleInputs.find(i => i.reference?.gridTemplateColumns === 'none'); i.astylarNormalResolvedStyle.color = '#123456'; },
    e => { e.inputTrees.astylar.sha256 = '0'.repeat(64); },
    e => { e.inputTrees.reference.file = 'package.json'; },
  ]) {
    const report = { ...raw, results: [...raw.results] };
    report.results[original] = structuredClone(raw.results[original]); mutate(report.results[original]);
    const result = collectOwnerGridInitialInputs(report, { parityPath });
    assert.equal(result.binding.status, 'invalid'); assert.deepEqual([result.captures, result.observations, result.groups], [[], [], []]);
    assert.ok(result.binding.error.length < 400, 'population mismatch must not stringify complete captured reports');
  }
  for (const report of [{ ...raw, results: raw.results.slice(1) },
    { ...raw, interactions: [...raw.interactions, raw.interactions[0]] }])
    assert.equal(collectOwnerGridInitialInputs(report, { parityPath }).binding.status, 'invalid');
});

test('owner grid original replay rejects dropped gaps, forged conclusions, altered provenance and incomplete groups', () => {
  for (const mutate of [
    e => { e.captures.pop(); },
    e => { e.observations.splice(e.observations.findIndex(o => o.proof.issues.length), 1); },
    e => { e.observations[0].inputSha256 = '0'.repeat(64); },
    e => { e.observations.find(o => o.proof.issues.length).proof.issues = []; },
    e => { e.groups.find(g => g.gapCases.length).gapCases = []; },
    e => { e.groups[0].reviewedCases.push(e.groups[0].reviewedCases[0]); },
    e => { e.observations[0].proof.computedCandidateVerified = true; },
    e => { e.observations[0].proof.gridLayoutEquivalent = true; },
    e => { e.observations[0].proof.renderingEquivalent = true; },
    e => { e.binding.sha256 = '0'.repeat(64); },
  ]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateOwnerGridInitialInputs(changed).length);
  }
});
