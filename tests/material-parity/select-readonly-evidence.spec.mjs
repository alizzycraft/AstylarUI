import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDividerOwnerFrameReviewReader, dividerOwnerFrameReview } from './divider-owner-frame-review-source.mjs';
import { joinMenuCompositeEvidence } from '../../scripts/join-material-menu-composite-evidence.mjs';
import { joinMenuAXEvidence } from '../../scripts/join-material-menu-ax-evidence.mjs';
import { joinMenuSemanticBoundaries } from '../../scripts/join-material-menu-semantic-boundaries.mjs';
import { joinSelectReadonlyEvidence, restoreSelectReadonlyEvidence, selectReadonlyPredecessor } from '../../scripts/join-material-select-readonly-evidence.mjs';

test('exact Select supplementary readonly evidence preserves all parent obligations and rejects forged receipts', () => {
  const reader = createDividerOwnerFrameReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: dividerOwnerFrameReview });
  const original = JSON.parse(reader.read(`artifacts/material-parity/working-audit/proposals/${dividerOwnerFrameReview}.json`)).review;
  const predecessor = joinMenuSemanticBoundaries(joinMenuAXEvidence(joinMenuCompositeEvidence(original).review).review).review;
  const hash = r => createHash('sha256').update(JSON.stringify(r)).digest('hex');
  assert.equal(hash(predecessor), selectReadonlyPredecessor);
  const joined = joinSelectReadonlyEvidence(predecessor);
  assert.equal(joined.cases, 1); assert.equal(joined.review.groups.length, 2311);
  assert.equal(hash(predecessor), selectReadonlyPredecessor);
  assert.equal(hash(restoreSelectReadonlyEvidence(joined.review)), selectReadonlyPredecessor);
  let changed = 0;
  joined.review.groups.forEach((group, index) => {
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    if (group === predecessor.groups[index]) return;
    changed++;
    assert.equal(group.case, 'interaction:select@light/desktop-dpr1/focus');
    const after = { ...group.obligations.authoredEditing }; delete after.supplementarySelectReadonlyHost;
    assert.deepEqual(after, predecessor.groups[index].obligations.authoredEditing);
    assert.match(group.obligations.authoredEditing.supplementarySelectReadonlyHost.boundary, /not original editing replay/);
  });
  assert.equal(changed, 1);
  assert.throws(() => joinSelectReadonlyEvidence(predecessor, file => file.endsWith('latest-report.json') ? Buffer.from('forged') : readFileSync(file)));
  assert.throws(() => joinSelectReadonlyEvidence(joined.review));
  console.log(JSON.stringify({ cases: joined.cases, reviewSha256: joined.sha256, predecessor: selectReadonlyPredecessor, boundary: 'Pending virtual join only; no canonical publication or case closure.' }));
});
