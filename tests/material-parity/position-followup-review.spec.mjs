import assert from 'node:assert/strict';
import test from 'node:test';
import { withAuditEvidenceSession } from './audit-evidence-session.mjs';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectPositionFollowupReview, validatePositionFollowupReview,
  applyPositionFollowupReview, validatePositionFollowupRows } from './position-followup-review.mjs';
test('followup replays fourteen complete proofs without promoting unresolved inspections', () => withAuditEvidenceSession(() => {
  const review = collectPositionFollowupReview();
  assert.deepEqual(review.counts, { groups: 14, observations: 768 });
  assert.equal(review.groups.filter(g => g.classification === 'parity-harness-defect').length, 7);
  assert.ok(review.groups.every(g => !['sort-primary', 'toolbar-primary', 'button-toggle-primary'].includes(g.element)));
  assert.equal(Object.hasOwn(review.groups.find(g => g.element === 'badge-label'), 'astylar'), false);
  for (const mutate of [r => r.groups.pop(), r => r.groups.reverse(),
    r => { r.groups[0].classification = 'equivalent-representation'; },
    r => { r.groups[0].reviewedCases.pop(); }, r => { r.sources[0].sha256 = 'forged'; }]) {
    const changed = structuredClone(review); mutate(changed); assert.throws(() => validatePositionFollowupReview(changed));
  }
}));
