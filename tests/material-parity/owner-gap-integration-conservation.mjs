import assert from 'node:assert/strict';
import { ownerGapAttribution } from './owner-gap-classification.mjs';
import { validateOwnerGapClassifications } from './owner-gap-coverage.mjs';
import { explicitGapAttribution } from './explicit-gap-classification.mjs';
import { validateExplicitGapInputs } from './explicit-gap-source-binding.mjs';
import { validateExplicitGapClassifications } from './explicit-gap-coverage.mjs';
import { gapReviewAttributions } from './gap-review-classification.mjs';
import { validateGapReviewInputs } from './gap-review-source-binding.mjs';
import { validateGapReviewClassifications } from './gap-review-coverage.mjs';

export const gapScalarProjection = row => [row.family, row.element, row.property, row.reference,
  row.astylar, row.occurrences, row.cases, row.states];

// Historical integration tests must verify the exact later gap classification
// before excluding it from their unrelated-row comparison. Never exempt a whole
// property, family, or arbitrary attribution string without source coverage.
export function assertLaterGapClassifications(audit, previous, options = {}) {
  assert.equal(audit.ownerGapInputs?.binding?.status, 'bound');
  assert.deepEqual(validateOwnerGapClassifications(audit.ownerGapInputs, audit.discrepancies, options), []);
  const added = audit.discrepancies.filter(row => row.attribution === ownerGapAttribution);
  const before = new Map(previous.discrepancies.map(row => [JSON.stringify(gapScalarProjection(row)), row]));
  assert.equal(before.size, previous.discrepancies.length);
  const signatures = new Set();
  for (const row of added) {
    const key = JSON.stringify(gapScalarProjection(row)), prior = before.get(key);
    assert.ok(prior, 'later gap classification must retain its complete prior scalar row');
    assert.equal(prior.attribution, 'unresolved');
    assert.equal(row.classification, 'parity-harness-defect');
    assert.deepEqual(row.referenceAuthoredExamples, prior.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, prior.astylarAuthoredExamples);
    for (const flag of ['computedCandidateVerified', 'renderingEquivalent', 'inputEquivalent',
      'wholeElementInputEquivalent', 'usedGapVerified']) assert.equal(row.reviewEvidence[flag], false);
    signatures.add(key);
  }
  assert.equal(signatures.size, added.length);
  // Explicit spacing is a separate, later authoring finding, not a widening of
  // the normal/local-omission classifier. Authenticate its full proof and exact
  // selected source population before accounting for it in historical tests.
  assert.equal(audit.explicitGapInputs?.binding?.status, 'bound');
  const diagnostic = { ...options, requireComplete: false };
  assert.deepEqual(validateExplicitGapClassifications(audit.explicitGapInputs, audit.discrepancies, diagnostic), []);
  assert.deepEqual(validateExplicitGapInputs(audit.explicitGapInputs, diagnostic), []);
  const explicit = audit.discrepancies.filter(row => row.attribution === explicitGapAttribution);
  for (const row of explicit) {
    const key = JSON.stringify(gapScalarProjection(row)), prior = before.get(key);
    assert.ok(prior, 'explicit gap classification must retain its complete prior scalar row');
    assert.equal(prior.attribution, 'unresolved');
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.deepEqual(row.referenceAuthoredExamples, prior.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, prior.astylarAuthoredExamples);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'usedGapVerified', 'rendererCauseProven'])
      assert.equal(row.reviewEvidence[flag], false);
    assert.ok(!signatures.has(key), 'explicit and normal-gap attribution populations must be disjoint');
    signatures.add(key);
  }
  assert.equal(signatures.size, added.length + explicit.length);
  // Later capture/motion findings have their own original-source binding. An
  // attribution name alone is not permission to exempt a historical row.
  assert.equal(audit.gapReviewInputs?.binding?.status, 'bound');
  assert.deepEqual(validateGapReviewClassifications(audit.gapReviewInputs, audit.discrepancies, diagnostic), []);
  assert.deepEqual(validateGapReviewInputs(audit.gapReviewInputs, diagnostic), []);
  const reviewed = audit.discrepancies.filter(row => Object.values(gapReviewAttributions).includes(row.attribution));
  for (const row of reviewed) {
    const key = JSON.stringify(gapScalarProjection(row)), prior = before.get(key);
    assert.ok(prior, 'reviewed gap classification must retain its complete prior scalar row');
    assert.equal(prior.attribution, 'unresolved');
    assert.equal(row.classification, 'parity-harness-defect');
    assert.deepEqual(row.referenceAuthoredExamples, prior.referenceAuthoredExamples);
    assert.deepEqual(row.astylarAuthoredExamples, prior.astylarAuthoredExamples);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'computedCandidateVerified',
      'usedGapVerified', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(row.reviewEvidence[flag], false);
    assert.ok(!signatures.has(key), 'reviewed, explicit and normal-gap populations must be disjoint');
    signatures.add(key);
  }
  assert.equal(signatures.size, added.length + explicit.length + reviewed.length);
  return signatures;
}
