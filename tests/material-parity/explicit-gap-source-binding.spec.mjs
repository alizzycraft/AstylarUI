import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bindExplicitGapPopulation, collectExplicitGapInputs, explicitGapClassificationContexts,
  selectExplicitGapPopulation, validateExplicitGapInputs } from './explicit-gap-source-binding.mjs';

const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const report = JSON.parse(readFileSync(parityPath));
const proof = JSON.parse(readFileSync('docs/material-explicit-gap-canonical-binding.json'));
const population = selectExplicitGapPopulation(report, proof);

test('replays existing complete composition proof and binds every original explicit-gap observation', () => {
  const evidence = collectExplicitGapInputs(report, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.equal(evidence.captures.length, 2311);
  assert.equal(evidence.captures.filter(c => c.selectedOwners.length).length, 296);
  assert.equal(evidence.captures.reduce((n, c) => n + c.selectedOwners.length, 0), 516);
  assert.equal(evidence.groups.length, 16); assert.equal(evidence.observations.length, 1032);
  assert.deepEqual(evidence.coverage, { expectedObservations: 1032, reviewedObservations: 1032, missing: [], complete: true });
  assert.equal(evidence.binding.verifier.result.negativeControls, 40);
  assert.deepEqual(validateExplicitGapInputs(evidence), []);
  const incomplete = structuredClone(evidence); incomplete.observations.pop();
  assert.ok(validateExplicitGapInputs(incomplete).some(e => /differs from complete source replay/.test(e)));
  const partialClaim = { ...evidence, coverage: { ...evidence.coverage, complete: false } };
  assert.ok(validateExplicitGapInputs(partialClaim).some(e => /complete proof population missing/.test(e)));
  const contexts = explicitGapClassificationContexts(evidence);
  assert.equal(contexts.size, 1032);
  for (const observation of evidence.observations) {
    const context = contexts.get(JSON.stringify([observation.case, observation.element, observation.property]));
    assert.equal(context.observation.inputSha256, observation.inputSha256);
    assert.equal(context.group.element, observation.element);
    assert.equal(context.group.property, observation.property);
    assert.deepEqual(context.inputTrees, observation.inputTrees);
  }
});

test('source population rejects changed scalar, tree, identity and membership evidence', () => {
  const selected = population.filter(e => e.styleInputs.length);
  const mutations = [
    x => { x[0].styleInputs[0].astylar.gap = '99px'; },
    x => { x[0].styleInputs[0].astylar.color = '#123456'; },
    x => { x[0].styleInputs[0].reference.columnGap = '0px'; },
    x => { x[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    x => { x[0].inputTrees.astylar.file += '.wrong'; },
    x => { x[0].styleInputs.push(structuredClone(x[0].styleInputs[0])); },
    x => { x.push(structuredClone(x[0])); },
    x => { x[0].state = 'uncaptured-state'; },
    x => { x[0].styleInputs[0].id = 'unknown-owner'; },
    x => { x[0].family = 'wrong-family'; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const x = structuredClone(selected); mutate(x);
    assert.throws(() => bindExplicitGapPopulation(x, proof), `mutation ${index}`);
  }
  assert.equal(collectExplicitGapInputs(report).binding.status, 'unbound');
  assert.deepEqual(validateExplicitGapInputs(undefined), ['explicit gap lacks original source binding']);
  const missingOwner = structuredClone(selected); missingOwner[0].styleInputs.pop();
  const partial = bindExplicitGapPopulation(missingOwner, proof);
  assert.equal(partial.coverage.complete, false);
  assert.equal(partial.coverage.missing.length, 2);
  assert.equal(partial.coverage.expectedObservations, 1032);
  assert.equal(partial.coverage.reviewedObservations, 1030);
});
