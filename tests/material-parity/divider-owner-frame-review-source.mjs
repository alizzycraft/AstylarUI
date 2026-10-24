import assert from 'node:assert/strict';
import path from 'node:path';
import { createDividerComputedPaintReviewReader, dividerComputedPaintReview } from './divider-computed-paint-review-source.mjs';
import { joinDividerOwnerFrameEvidence } from '../../scripts/join-material-divider-owner-frame-evidence.mjs';

export const dividerOwnerFrameReview = '94f1a93d5881bafd8f79fad0ccd52e20d0325bed06eb64dc1e1adbd315241cc4';
export function createDividerOwnerFrameReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, dividerOwnerFrameReview);
  const prior = createDividerComputedPaintReviewReader({ root, read, reviewSha256: dividerComputedPaintReview });
  const predecessor = JSON.parse(prior.read(`artifacts/material-parity/working-audit/proposals/${dividerComputedPaintReview}.json`)).review;
  const result = joinDividerOwnerFrameEvidence(predecessor, file => read(path.resolve(root, file)));
  assert.equal(result.sha256, dividerOwnerFrameReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${dividerOwnerFrameReview}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: result.sha256, review: result.review }));
  return {
    read(name, options) {
      if (path.resolve(root, name) !== file) return prior.read(name, options);
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
    },
    sourceApplicability: { mode: 'exact-divider-owner-frame-successor', reviewSha256,
      cases: result.cases, desktopDpr1Aliases: result.alignedCases, addedChildren: result.addedChildren,
      predecessorApplicability: prior.sourceApplicability,
      boundary: 'Existing retained owner review plus supplementary frame/alignment observations,not original action replay. Every prior status,remaining task and acceptance gate preserves;not canonical publication or rendering acceptance.' },
  };
}
