import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { prepareRootBackgroundClassifications, rootBackgroundClassificationContexts,
  classifyRootBackgroundInput, rootBackgroundAttribution } from './root-background-classification-preparation.mjs';

test('all root background source proofs bind precise unequal values to exact original cases', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const evidence = prepareRootBackgroundClassifications(original);
  const contexts = rootBackgroundClassificationContexts(evidence);
  assert.equal(contexts.size, 2311); assert.equal(evidence.groups.length, 144);
  assert.equal(evidence.canonicalIntegration, false);
  assert.equal(evidence.canonicalCoverageProven, false);
  let reviewed = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      const input = entry.styleInputs.find(input => input.id === entry.family + '-root');
      const observation = contexts.get(JSON.stringify([key, input.id, 'backgroundColor']));
      assert.ok(observation);
      const classify = (value = input, property = 'backgroundColor', reference = observation.reference,
        candidate = observation.astylar) => classifyRootBackgroundInput(value, property, reference, candidate, observation);
      const result = classify();
      assert.equal(result.attribution, rootBackgroundAttribution);
      assert.equal(result.classification, 'application-plugin-authoring-defect');
      assert.equal(result.reviewEvidence.rendererCauseProven, false);
      assert.notEqual(observation.reference, observation.astylar);
      assert.throws(() => classify(input, 'color'));
      assert.throws(() => classify(input, 'backgroundColor', observation.astylar));
      assert.throws(() => classify(input, 'backgroundColor', observation.reference, '#ffffff'));
      assert.throws(() => classify({ ...input, id: 'unrelated-root' }));
      assert.throws(() => classify({ ...input, astylar: { ...input.astylar, background: '#ffffff' } }));
      assert.equal(classifyRootBackgroundInput(input, 'backgroundColor', observation.reference,
        observation.astylar, undefined), undefined);
      reviewed++;
    }
  }
  assert.equal(reviewed, 2311);
  assert.equal(rootBackgroundClassificationContexts({ ...evidence, binding: { status: 'unbound' } }).size, 0);
  assert.throws(() => rootBackgroundClassificationContexts({ ...evidence,
    observations: [...evidence.observations, evidence.observations[0]] }));
});
