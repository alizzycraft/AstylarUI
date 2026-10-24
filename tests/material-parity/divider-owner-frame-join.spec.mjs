import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { dividerComputedPaintReview } from './divider-computed-paint-review-source.mjs';
import { createDividerOwnerFrameReviewReader, dividerOwnerFrameReview } from './divider-owner-frame-review-source.mjs';
import { restoreDividerOwnerFrameEvidence, joinDividerOwnerFrameEvidence } from '../../scripts/join-material-divider-owner-frame-evidence.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { spawnSync } from 'node:child_process';

test('owner/frame retained checks replay without browser or canonical rebuild', () => {
  for (const args of [
    ['scripts/check-divider-inline-alignment-reads.mjs'],
    ['scripts/check-divider-owner-coverage.mjs'],
    ['scripts/check-divider-alignment-inputs.mjs', 'artifacts/material-parity/divider-alignment-inputs-public-updates-20261024.log'],
    ['scripts/check-divider-frame-sizes.mjs', 'artifacts/material-parity/divider-frame-sizes-20261024.log'],
  ]) {
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 4_000_000 });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(JSON.parse(result.stdout).producer);
  }
});

test('Divider owner/frame evidence conserves complete predecessor and exact physical applicability', () => {
  const root = process.cwd(), reader = createDividerOwnerFrameReviewReader({ root, read: readFileSync, reviewSha256: dividerOwnerFrameReview });
  const file = `artifacts/material-parity/working-audit/proposals/${dividerOwnerFrameReview}.json`;
  const review = JSON.parse(reader.read(file)).review;
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(review), dividerOwnerFrameReview);
  const restored = restoreDividerOwnerFrameEvidence(review);
  assert.equal(hash(restored), dividerComputedPaintReview);
  assert.equal(review.groups.length, 2311);
  assert.ok(review.groups.every(group => group.inspection === 'partial' && group.currentRendering === 'unverified'));
  let cases = 0, desktop = 0;
  for (const group of review.groups.filter(group => group.family === 'divider')) {
    const input = group.obligations.inputStyleStructure; cases++;
    assert.equal(input.retainedRemainingOwnerReview.frameBoxInputs.classification, 'application-plugin-authoring-defect');
    assert.equal(input.actualFrameExtentObservation.originalCaseKind, group.case.startsWith('static:') ? 'static' : 'interaction');
    if (input.actualInlineAlignmentInputSensitivity) {
      desktop++;
      assert.match(group.case, /\/(?:desktop|desktop-dpr1)(?:\/inspect)?$/);
      assert.equal(input.actualInlineAlignmentInputSensitivity.cohort.deviceScaleFactor, 1);
    } else assert.doesNotMatch(group.case, /\/(?:desktop|desktop-dpr1)(?:\/inspect)?$/);
  }
  assert.equal(cases, 24); assert.equal(desktop, 8);
  assert.throws(() => joinDividerOwnerFrameEvidence(restored, name => name.endsWith('divider-frame-box-inputs-final-20261024.log')
    ? Buffer.from('forged owner evidence') : readFileSync(name)));
  assert.throws(() => createDividerOwnerFrameReviewReader({ root, read: readFileSync, reviewSha256: '0'.repeat(64) }));
  const loaded = loadCaseObligationReview(file, dividerOwnerFrameReview, review.groups.map(group => group.case), { root, read: reader.read });
  assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
  console.log(JSON.stringify({ successor: dividerOwnerFrameReview, cases, desktopDpr1Aliases: desktop,
    addedChildren: reader.sourceApplicability.addedChildren, dependencies: loaded.evidenceFingerprints.length,
    completePredecessorRecovered: true, saved: false, canonicalPublished: false }));
});
