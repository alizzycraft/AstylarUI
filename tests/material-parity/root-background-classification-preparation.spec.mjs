import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { prepareRootBackgroundClassifications, rootBackgroundClassificationContexts,
  classifyRootBackgroundInput, rootBackgroundAttribution, validateRootBackgroundEvidence,
  validateRootBackgroundClassifications } from './root-background-classification-preparation.mjs';

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
  assert.deepEqual(validateRootBackgroundEvidence(evidence), []);
  assert.deepEqual(validateRootBackgroundClassifications(evidence, evidence.groups), []);
  assert.deepEqual(validateRootBackgroundClassifications(evidence,
    [...evidence.groups].reverse().concat({ attribution: 'unrelated' })), []);
  const controls = [
    rows => rows.pop(),
    rows => rows.push(structuredClone(rows[0])),
    rows => { rows[0].reference = rows[0].astylar; },
    rows => { rows[0].occurrences++; },
    rows => { rows[0].reviewedCases[0] = 'unreviewed-case'; },
    rows => { rows[0].cases.pop(); },
    rows => { rows[0].states = []; },
    rows => { rows[0].classification = 'equivalent'; },
    rows => { rows[0].recommendedOwner = 'renderer'; },
    rows => { rows[0].reviewEvidence.rendererCauseProven = true; },
    rows => { rows[0].attribution = 'unresolved'; },
  ];
  for (const mutate of controls) {
    const rows = structuredClone(evidence.groups); mutate(rows);
    assert.equal(validateRootBackgroundClassifications(evidence, rows).length, 1);
  }
  assert.equal(validateRootBackgroundClassifications({ ...evidence,
    binding: { status: 'unbound' } }, evidence.groups).length, 1);
  // A forged claim can remain internally consistent; only independent source
  // replay can reject it. Exercise that distinction explicitly.
  const forged = structuredClone(evidence);
  forged.groups[0].reviewEvidence.rendererCauseProven = true;
  assert.deepEqual(validateRootBackgroundClassifications(forged, forged.groups), []);
  assert.equal(validateRootBackgroundEvidence(forged).length, 1);
});
