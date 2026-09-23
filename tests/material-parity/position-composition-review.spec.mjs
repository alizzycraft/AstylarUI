import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectPositionCompositionReview, validatePositionCompositionReview, applyPositionCompositionReview,
  validatePositionCompositionRows } from './position-composition-review.mjs';
test('position batch replays all six source-backed groups without inventing candidate defaults', () => {
  const review = collectPositionCompositionReview();
  validatePositionCompositionReview(review);
  assert.deepEqual(review.counts, { groups: 6, observations: 316 });
  const root = review.groups.find(g => g.element === 'grid-list-primary');
  assert.equal(Object.hasOwn(root, 'astylar'), false);
  assert.ok(review.groups.every(g => g.reviewEvidence.inputEquivalent === false && g.reviewEvidence.rendererCauseProven === false));
});
test('position batch rejects altered classifications, coverage, sources and fabricated prior rows', () => {
  const original = collectPositionCompositionReview();
  for (const mutate of [
    r => r.groups.pop(), r => r.groups.reverse(), r => { r.groups[0].classification = 'equivalent-representation'; },
    r => { r.groups[0].reviewedCases.pop(); }, r => { r.groups[0].astylar = 'static'; },
    r => { r.sources[0].sha256 = 'forged'; }, r => { r.groups[0].reviewEvidence.rendererCauseProven = true; },
  ]) { const changed = structuredClone(original); mutate(changed); assert.throws(() => validatePositionCompositionReview(changed)); }
  assert.throws(() => applyPositionCompositionReview([], original));
  assert.throws(() => applyPositionCompositionReview(original.groups.map(g => ({ ...g, attribution: 'unresolved' })), original),
    /complete original position row changed/);
});
