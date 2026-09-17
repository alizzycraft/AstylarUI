import assert from 'node:assert/strict';
import { ownerGapAttribution } from './owner-gap-classification.mjs';
import { validateOwnerGapClassifications } from './owner-gap-coverage.mjs';

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
  return signatures;
}
