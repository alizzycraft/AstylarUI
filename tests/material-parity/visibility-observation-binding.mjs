import assert from 'node:assert/strict';
import { collectVisibilityObservationStages, classifyVisibilityObservationStage } from './visibility-observation-stage.mjs';

// Do not trust serialized proof just because its counts or local digest match.
// Rederive from authenticated population and complete raw tree receipts first.
// Callers receive a closure, not a mutable map of trusted observation contexts.
export function bindVisibilityObservationStages(prepared) {
  const rederived = collectVisibilityObservationStages();
  assert.deepEqual(prepared, rederived, 'visibility preparation differs from authenticated source replay');
  const contexts = new Map();
  for (const group of rederived.reviewed) for (const observation of group.observations) {
    const key = JSON.stringify([observation.case, group.element]);
    assert.ok(!contexts.has(key), 'duplicate visibility observation context');
    contexts.set(key, observation);
  }
  assert.equal(contexts.size, rederived.counts.reviewedObservations);
  return {
    counts: structuredClone(rederived.counts),
    classify(caseId, input, property, reference, candidate) {
      const observation = contexts.get(JSON.stringify([caseId, input?.id]));
      return classifyVisibilityObservationStage(input, property, reference, candidate, observation);
    },
  };
}
