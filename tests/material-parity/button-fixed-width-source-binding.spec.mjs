import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectButtonFixedWidthInputs, validateButtonFixedWidthInputs } from './button-fixed-width-source-binding.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectButtonFixedWidthInputs(raw, { parityPath });

test('compact button width binding retains all 600 authoring differences including scalar-matching core cases', () => {
  assert.equal(evidence.binding.status, 'bound');
  assert.equal(evidence.captures.length, 2311);
  assert.equal(evidence.captures.filter(c => !c.selectedOwners.length).length, 1831);
  assert.equal(evidence.observations.length, 600); assert.equal(evidence.groups.length, 9);
  assert.equal(evidence.groups.reduce((n, g) => n + g.occurrences, 0), 600);
  const durable = JSON.parse(readFileSync('docs/material-button-fixed-width-audit.json'));
  assert.deepEqual(evidence.observations.map(o => [o.case, o.family, o.state, o.proof]),
    durable.observations.map(o => [o.case, o.family, o.state, o.proof]));
  assert.ok(evidence.captures.every(c => !Object.hasOwn(c, 'styleInputs')));
  assert.ok(evidence.observations.every(o => !Object.hasOwn(o, 'input')));
  const selected = evidence.captures.flatMap(c => c.selectedOwners);
  assert.equal(selected.length, 600);
  for (const o of evidence.observations) assert.match(o.inputSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(validateButtonFixedWidthInputs(JSON.parse(JSON.stringify(evidence))), []);
  const core = evidence.groups.find(g => g.element === 'core-primary');
  assert.equal(core.occurrences, 52); assert.equal(core.referenceAuthoredWidth, '<omitted>');
  assert.equal(core.referenceComputedWidth, '212.234px'); assert.equal(core.candidateAuthoredWidth, '212.234375px');
  for (const g of evidence.groups) for (const flag of ['inputEquivalent', 'candidateUsedLayoutVerified',
    'originalRasterCauseProven', 'structuralEquivalenceVerified', 'renderingEquivalent']) assert.equal(g[flag], false);
  // Arithmetic control only, not a production-normalizer test or permission to
  // discard core authoring coverage when the scalar discrepancy list omits it.
  const rounded = value => Math.round(parseFloat(value) * 1000) / 1000;
  const scalarDifferences = evidence.groups.filter(g => rounded(g.referenceComputedWidth) !== rounded(g.candidateLocalWidth));
  assert.equal(scalarDifferences.length, 8);
  assert.equal(scalarDifferences.reduce((n, g) => n + g.occurrences, 0), 548);
});

test('compact button width binding rejects changed caller population before deriving proof', () => {
  assert.equal(collectButtonFixedWidthInputs(raw).binding.status, 'unbound');
  assert.equal(collectButtonFixedWidthInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid');
  const missing = { ...raw, results: raw.results.slice(1) };
  const duplicate = { ...raw, interactions: [...raw.interactions, raw.interactions[0]] };
  const index = raw.results.findIndex(e => e.family === 'core');
  const changed = { ...raw, results: [...raw.results] }, removed = { ...raw, results: [...raw.results] };
  changed.results[index] = structuredClone(changed.results[index]);
  changed.results[index].styleInputs.find(i => i.id === 'core-primary').astylar.width = '212.234px';
  removed.results[index] = structuredClone(removed.results[index]);
  removed.results[index].styleInputs = removed.results[index].styleInputs.filter(i => i.id !== 'core-primary');
  for (const report of [missing, duplicate, changed, removed]) {
    const result = collectButtonFixedWidthInputs(report, { parityPath });
    assert.equal(result.binding.status, 'invalid');
    assert.deepEqual([result.captures, result.observations, result.groups], [[], [], []]);
  }
});

test('compact button width replay rejects omitted matching groups negative cases changed hashes and false claims', () => {
  const mutations = [
    e => { e.groups = e.groups.filter(g => g.element !== 'core-primary'); },
    e => { e.captures.splice(e.captures.findIndex(c => !c.selectedOwners.length), 1); },
    e => { e.observations.pop(); },
    e => { e.observations[0].inputSha256 = '0'.repeat(64); },
    e => { e.captures.find(c => c.selectedOwners.length).selectedOwners[0].inputSha256 = '0'.repeat(64); },
    e => { e.observations[0].proof.candidateRules[0].width = 'auto'; },
    e => { e.groups[0].reviewedCases[1] = e.groups[0].reviewedCases[0]; },
    e => { e.groups[0].states = []; },
    e => { e.binding.sha256 = '0'.repeat(64); },
  ];
  for (const flag of ['inputEquivalent', 'candidateUsedLayoutVerified', 'originalRasterCauseProven',
    'structuralEquivalenceVerified', 'renderingEquivalent'])
    mutations.push(e => { e.groups[0][flag] = true; e.observations[0].proof[flag] = true; });
  for (const [index, mutate] of mutations.entries()) {
    const copy = structuredClone(evidence); mutate(copy);
    assert.ok(validateButtonFixedWidthInputs(copy).length, `replay negative ${index}`);
  }
});
