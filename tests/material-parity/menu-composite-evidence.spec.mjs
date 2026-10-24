import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createDividerOwnerFrameReviewReader, dividerOwnerFrameReview } from './divider-owner-frame-review-source.mjs';
import { joinMenuCompositeEvidence, restoreMenuCompositeEvidence } from '../../scripts/join-material-menu-composite-evidence.mjs';

test('Menu retained composite join preserves exact predecessor, scope and unresolved status', () => {
  const reader = createDividerOwnerFrameReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: dividerOwnerFrameReview });
  const predecessor = JSON.parse(reader.read(`artifacts/material-parity/working-audit/proposals/${dividerOwnerFrameReview}.json`)).review;
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const before = hash(predecessor);
  const joined = joinMenuCompositeEvidence(predecessor);
  assert.equal(joined.sha256, '169d465544c70efebc3e805b4c0f70cedbf39fae5eff08ed84241da74455ccee');
  assert.equal(hash(predecessor), before);
  assert.equal(hash(restoreMenuCompositeEvidence(joined.review)), dividerOwnerFrameReview);
  assert.equal(joined.review.groups.length, 2311);
  let changed = 0;
  joined.review.groups.forEach((group, index) => {
    assert.equal(group.inspection, 'partial');
    assert.equal(group.currentRendering, 'unverified');
    if (group === predecessor.groups[index]) return;
    changed++;
    assert.match(group.case, /^interaction:menu@[^/]+\/desktop-dpr[12]\/open-hover-content$/);
    const child = group.obligations.authoredActivation.supplementaryMenuCompositeBehavior;
    assert.equal(child.classification, 'application-plugin-authoring-defect');
    assert.match(child.boundary, /NOT configured open-hover-content action replay/);
    for (const side of ['astylar', 'reference']) {
      assert.equal(child.observations.pointerAndEscape[side].length, 7);
      assert.equal(child.observations.navigation[side].length, 11);
      assert.equal(child.observations.matchedItemKeys[side].length, 7);
    }
  });
  assert.equal(changed, 8);
  for (const suffix of ['menu-actions-reset-20261008/latest-report.json', 'menu-retained-theme-input-witnesses-20261024.log']) {
    assert.throws(() => joinMenuCompositeEvidence(predecessor, file => file.endsWith(suffix) ? Buffer.from('forged') : readFileSync(file)));
  }
  assert.throws(() => joinMenuCompositeEvidence(joined.review));
});
