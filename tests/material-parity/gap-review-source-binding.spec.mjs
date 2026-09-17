import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bindGapReviewPopulation, collectGapReviewInputs, gapReviewClassificationContexts,
  selectGapReviewPopulation, validateGapReviewInputs } from './gap-review-source-binding.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const report = JSON.parse(readFileSync(parityPath));
const proof = JSON.parse(readFileSync('docs/material-gap-review-membership.json'));
const population = selectGapReviewPopulation(report, proof);

test('gap review source binding independently replays all original memberships without upgrading unresolved motion', () => {
  const evidence = collectGapReviewInputs(report, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.captures.length, 2311);
  assert.equal(evidence.captures.filter(c => c.selectedOwners.length).length, 676);
  assert.equal(evidence.groups.length, 38); assert.equal(evidence.observations.length, 1902);
  assert.deepEqual(evidence.coverage, { expectedObservations: 1902, reviewedObservations: 1902,
    attributableObservations: 1838, unresolvedObservations: 64, missing: [], complete: true });
  assert.deepEqual(validateGapReviewInputs(evidence), []);
  const changed = structuredClone(evidence); changed.observations.pop();
  assert.ok(validateGapReviewInputs(changed).some(e => /differs from complete source replay/.test(e)));
  const contexts = gapReviewClassificationContexts(evidence); assert.equal(contexts.size, 1902);
  for (const o of evidence.observations) {
    const c = contexts.get(JSON.stringify([o.case, o.element, o.property]));
    assert.equal(c.observation.inputSha256, o.inputSha256); assert.equal(c.group.element, o.element);
    assert.equal(c.group.property, o.property); assert.deepEqual(c.inputTrees, o.inputTrees);
  }
  const partial = { ...evidence, coverage: { ...evidence.coverage, complete: false } };
  assert.ok(validateGapReviewInputs(partial).some(e => /complete proof population missing/.test(e)));
});

test('gap review source population rejects altered original scalars trees and identities and retains missing coverage', () => {
  const selected = population.filter(e => e.styleInputs.length);
  const mutations = [
    x => { x[0].styleInputs[0].astylar.gap = '8px'; },
    x => { x[0].styleInputs[0].astylar.color = '#123456'; },
    x => { x[0].styleInputs[0].reference.rowGap = '0px'; },
    x => { x[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    x => { x[0].inputTrees.astylar.file += '.wrong'; },
    x => { x[0].styleInputs.push(structuredClone(x[0].styleInputs[0])); },
    x => { x.push(structuredClone(x[0])); },
    x => { x[0].state = 'uncaptured-state'; },
    x => { x[0].styleInputs[0].id = 'unknown-owner'; },
    x => { x[0].family = 'wrong-family'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const changed = structuredClone(selected); mutate(changed);
    assert.throws(() => bindGapReviewPopulation(changed, proof), `mutation ${index}`);
  }
  const missing = structuredClone(selected); missing[0].styleInputs.pop();
  const partial = bindGapReviewPopulation(missing, proof);
  assert.equal(partial.coverage.complete, false); assert.equal(partial.coverage.missing.length, 2);
  assert.equal(partial.coverage.reviewedObservations, 1900);
  assert.equal(collectGapReviewInputs(report).binding.status, 'unbound');
  assert.deepEqual(validateGapReviewInputs(undefined), ['gap review lacks original source binding']);
});
