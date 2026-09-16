import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectOwnerGapInputs, validateOwnerGapInputs } from './owner-gap-source-binding.mjs';
import { classifyOwnerGapInput as classify, ownerGapAttribution } from './owner-gap-classification.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const before = canonicalFiles.map(file => hash(readFileSync(file)));
const raw = JSON.parse(readFileSync(parityPath));
const evidence = collectOwnerGapInputs(raw, { parityPath });
const cases = new Map();
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries)
  cases.set(`${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`, entry);
const inputOf = o => cases.get(o.case).styleInputs.find(input => input.id === o.proof.element);
const join = (o, input = inputOf(o), property = o.proof.property, reference = input.reference[property], candidate = input.astylar[property]) =>
  classify(input, property, reference, candidate, o);

test('gap source ledger retains the complete original population including shorthand and capture gaps', () => {
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.captures.length, 2311);
  assert.equal(evidence.observations.length, 13876);
  assert.equal(evidence.groups.length, 234);
  assert.equal(evidence.observations.filter(o => !o.proof.issues.length).length, 6320);
  assert.equal(evidence.observations.filter(o => o.proof.issues.length).length, 7556);
  assert.equal(evidence.groups.filter(g => !g.gapCases.length).length, 108);
  assert.deepEqual(validateOwnerGapInputs(JSON.parse(JSON.stringify(evidence))), []);
});

test('gap ledger reproduces all 162 canonical survey memberships and every original proof digest', () => {
  const survey = JSON.parse(readFileSync('docs/material-owner-gap-input-survey.json'));
  const joinReport = JSON.parse(readFileSync('docs/material-owner-gap-canonical-join.json'));
  assert.equal(evidence.binding.sha256, survey.capture.sha256);
  let count = 0;
  for (const group of survey.groups) {
    const observations = evidence.observations.filter(o => o.family === group.family && o.proof.element === group.element && o.proof.property === group.property);
    assert.deepEqual(observations.map(o => o.case), group.originalCases);
    const digest = createHash('sha256');
    for (const o of observations) digest.update(JSON.stringify({ case: o.case, proof: o.proof }) + '\n');
    assert.equal(digest.digest('hex'), group.proofSha256);
    const bound = joinReport.rows.find(row => row.family === group.family && row.element === group.element && row.property === group.property);
    assert.deepEqual(observations.map(o => [o.case, o.inputSha256]), bound.observations.map(o => [o.case, o.inputSha256]));
    count += observations.length;
  }
  assert.equal(count, 9254);
  assert.equal(evidence.observations.length - count, 4622, 'unfiltered ledger must retain already-reviewed root observations');
});

test('gap classification explains only verified observation-stage differences without synthesizing values', () => {
  let positive = 0, gaps = 0;
  for (const o of evidence.observations) {
    const c = join(o);
    if (o.proof.issues.length) { assert.equal(c, undefined); gaps++; continue; }
    positive++;
    assert.equal(c.attribution, ownerGapAttribution);
    assert.equal(c.classification, 'parity-harness-defect');
    assert.equal(c.reviewEvidence.case, o.case);
    for (const flag of ['computedCandidateVerified', 'renderingEquivalent', 'inputEquivalent', 'wholeElementInputEquivalent', 'usedGapVerified'])
      assert.equal(c.reviewEvidence[flag], false);
  }
  assert.equal(positive, 6320); assert.equal(gaps, 7556);
});

test('gap scalar join rejects altered owners, stages, requests, provenance and equivalence claims', () => {
  const o = evidence.observations.find(o => !o.proof.issues.length), input = inputOf(o);
  assert.equal(join(o, input, 'display'), undefined);
  assert.equal(join(o, input, o.proof.property, 'normal', '0'), undefined);
  assert.equal(join(o, input, o.proof.property, '0'), undefined);
  const mutations = [
    v => { v.inputSha256 = '0'.repeat(64); },
    v => { v.proof.element = 'other'; },
    v => { v.proof.property = 'gridAutoColumns'; },
    v => { v.proof.issues.push({ reason: 'owner-mapping' }); },
    v => { v.proof.source = 'paint'; },
    v => { v.proof.revision = -1; },
    v => { v.proof.mapping = 'guessed-wrapper'; },
    v => { v.proof.referenceNode = ''; },
    v => { v.proof.formatting.reference = 'invented'; },
    v => { v.proof.formatting.astylar = 'invented'; },
    v => { v.proof.disposition = 'requires-specific-review'; },
    v => { v.proof.computedCandidateVerified = true; },
    v => { v.proof.renderingEquivalent = true; },
    v => { v.proof.inputEquivalent = true; },
    v => { v.proof.requests.reference.push({ source: '*', declarations: { all: 'inherit' } }); },
    v => { v.proof.requests.astylar.push({ source: '*', declarations: { gap: '0' } }); },
    v => { v.proof.candidateStages.resolvedStyle.gap = '0'; },
    v => { delete v.proof.candidateStages.normalResolvedStyle; },
  ];
  for (const mutate of mutations) { const changed = structuredClone(o); mutate(changed); assert.equal(join(changed, input), undefined); }
  let stageControls = 0;
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    for (const property of ['gap', 'columnGap', 'rowGap', 'grid-gap', 'all', 'transitionProperty']) {
      const changed = structuredClone(input); changed[stage][property] = '0';
      const observation = structuredClone(o); observation.inputSha256 = hash(JSON.stringify(changed));
      assert.equal(join(observation, changed), undefined); stageControls++;
    }
  assert.equal(stageControls, 18); assert.equal(mutations.length, 18);
});

test('gap source binding rejects changed caller population, scalar values and capture descriptors', () => {
  assert.equal(collectOwnerGapInputs(raw).binding.status, 'unbound');
  assert.equal(collectOwnerGapInputs(raw, { parityPath: 'package.json' }).binding.status, 'invalid');
  const index = raw.results.findIndex(e => e.styleInputs.some(i => i.reference?.columnGap === 'normal'));
  for (const mutate of [
    e => { e.styleInputs = []; },
    e => { e.styleInputs.push(structuredClone(e.styleInputs.find(i => i.reference?.columnGap === 'normal'))); },
    e => { e.styleInputs.find(i => i.reference?.columnGap === 'normal').reference.columnGap = '0'; },
    e => { e.styleInputs.find(i => i.reference?.columnGap === 'normal').astylar.columnGap = 'normal'; },
    e => { e.styleInputs.find(i => i.reference?.columnGap === 'normal').astylarNormalResolvedStyle.color = '#123456'; },
    e => { e.inputTrees.astylar.sha256 = '0'.repeat(64); },
    e => { e.inputTrees.reference.file = 'package.json'; },
  ]) {
    const report = { ...raw, results: [...raw.results] };
    report.results[index] = structuredClone(raw.results[index]); mutate(report.results[index]);
    const result = collectOwnerGapInputs(report, { parityPath });
    assert.equal(result.binding.status, 'invalid'); assert.deepEqual([result.captures, result.observations, result.groups], [[], [], []]);
    assert.ok(result.binding.error.length < 400);
  }
  for (const report of [{ ...raw, results: raw.results.slice(1) },
    { ...raw, interactions: [...raw.interactions, raw.interactions[0]] }])
    assert.equal(collectOwnerGapInputs(report, { parityPath }).binding.status, 'invalid');
});

test('gap original replay rejects dropped review gaps and forged findings even with unchanged source digest', () => {
  const mutations = [
    e => { e.captures.pop(); },
    e => { e.observations.splice(e.observations.findIndex(o => o.proof.issues.length), 1); },
    e => { e.observations[0].inputSha256 = '0'.repeat(64); },
    e => { const p = e.observations.find(o => o.proof.issues.length).proof; p.issues = []; p.disposition = 'captured-normal-versus-local-omission'; },
    e => { e.groups.find(g => g.gapCases.length).gapCases = []; },
    e => { e.observations.find(o => !o.proof.issues.length).proof.computedCandidateVerified = true; },
    e => { e.observations.find(o => !o.proof.issues.length).proof.mapping = 'guessed-wrapper'; },
    e => { e.binding.sha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateOwnerGapInputs(changed).length);
  }
  assert.equal(mutations.length, 8);
  assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before);
});
