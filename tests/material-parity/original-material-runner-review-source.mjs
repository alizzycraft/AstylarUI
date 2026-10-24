import assert from 'node:assert/strict';
import path from 'node:path';
import { joinOriginalRunnerSource, originalRunnerPredecessor } from '../../scripts/join-material-original-runner-source.mjs';
import { createSliderStateInputReviewReader } from './slider-state-input-review-source.mjs';

export const originalRunnerReview = '7dfee06dc72de1cc4a7d94f1d10594ec0b7d703a7a151e35ae803eadadc51385';

// An exact derived proposal,not a fallback for a missing arbitrary review.
// Keep the existing loader responsible for all case/dependency authentication.
export function createOriginalRunnerReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, originalRunnerReview);
  const prior = createSliderStateInputReviewReader({ root, read, reviewSha256: originalRunnerPredecessor });
  const predecessor = JSON.parse(read(path.resolve(root,
    `artifacts/material-parity/working-audit/proposals/${originalRunnerPredecessor}.json`)));
  assert.equal(predecessor.status, 'proposal-not-canonical');
  assert.equal(predecessor.sha256, originalRunnerPredecessor);
  const result = joinOriginalRunnerSource(predecessor.review, file => read(path.resolve(root, file)));
  assert.equal(result.sha256, originalRunnerReview);
  const virtualFile = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${originalRunnerReview}.json`);
  const virtualBytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: result.sha256, review: result.review }));
  return {
    read(file, options) {
      if (path.resolve(root, file) !== virtualFile) return prior.read(file, options);
      const encoding = typeof options === 'string' ? options : options?.encoding;
      // Match readFileSync's Buffer contract when no encoding is requested.
      return encoding ? virtualBytes.toString(encoding) : Buffer.from(virtualBytes);
    },
    sourceApplicability: {
      mode: 'exact-recovered-original-runner-successor', reviewSha256,
      cases: result.cases, sourceConditionsReconciled: result.records,
      completePredecessorRecovered: true, predecessorApplicability: prior.sourceApplicability,
      boundary: 'Original source authentication only. All observations,partial case dispositions,current-rendering uncertainty and original acceptance gates preserve.',
    },
  };
}
