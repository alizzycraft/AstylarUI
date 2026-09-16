import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { classifyOwnerGridInitialInput as classify, ownerGridInitialAttribution } from './owner-grid-initial-classification.mjs';

const survey = JSON.parse(readFileSync('docs/material-owner-grid-initial-survey.json'));
const bytes = readFileSync(survey.capture.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), survey.capture.sha256);
const original = JSON.parse(bytes), cases = new Map();
for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries)
  cases.set(`${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`, entry);
const inputOf = o => cases.get(o.case).styleInputs.find(i => i.id === o.proof.element);
const join = (o, input = inputOf(o), property = o.proof.property, r = input.reference[property], a = input.astylar[property]) =>
  classify(input, property, r, a, o);

test('grid observation-stage scalar joins preserve every original positive and negative survey outcome', () => {
  let positive = 0, gaps = 0;
  for (const o of survey.evidence) {
    const c = join(o);
    if (o.proof.issues.length) { assert.equal(c, undefined); gaps++; continue; }
    positive++;
    assert.equal(c.attribution, ownerGridInitialAttribution);
    assert.equal(c.classification, 'parity-harness-defect');
    assert.equal(c.reviewEvidence.case, o.case); assert.equal(c.reviewEvidence.inputSha256, o.inputSha256);
    for (const flag of ['computedCandidateVerified', 'gridLayoutEquivalent', 'renderingEquivalent', 'wholeElementInputEquivalent'])
      assert.equal(c.reviewEvidence[flag], false);
  }
  assert.equal(positive, 10968); assert.equal(gaps, 2856);
});

test('grid scalar classification rejects detached properties, normalized guesses, forged stages and expanded claims', () => {
  const o = survey.evidence.find(o => !o.proof.issues.length), input = inputOf(o);
  assert.equal(join(o, input, 'display'), undefined);
  assert.equal(join(o, input, o.proof.property, 'none', 'none'), undefined);
  assert.equal(join(o, input, o.proof.property, '100px'), undefined);
  for (const mutate of [
    v => { v.inputSha256 = '0'.repeat(64); },
    v => { v.proof.element = 'other'; },
    v => { v.proof.property = 'gridAutoColumns'; },
    v => { v.proof.issues.push({ reason: 'owner-mapping' }); },
    v => { v.proof.source = 'paint'; },
    v => { v.proof.revision = -1; },
    v => { v.proof.mapping = 'guessed-wrapper'; },
    v => { v.proof.referenceType = 'invented'; },
    v => { v.proof.candidateType = 'invented'; },
    v => { v.proof.candidateLocalDisplay = 'invented'; },
    v => { v.proof.disposition = 'requires-specific-review'; },
    v => { v.proof.computedCandidateVerified = true; },
    v => { v.proof.gridLayoutEquivalent = true; },
    v => { v.proof.renderingEquivalent = true; },
  ]) { const changed = structuredClone(o); mutate(changed); assert.equal(join(changed, input), undefined); }
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) {
    const changed = structuredClone(input); changed[stage][o.proof.property] = 'none';
    // Even an attacker who recomputes the detached scalar digest cannot turn
    // an explicit declaration into a valid omission observation.
    const observation = structuredClone(o);
    observation.inputSha256 = createHash('sha256').update(JSON.stringify(changed)).digest('hex');
    assert.equal(join(observation, changed), undefined);
  }
});
