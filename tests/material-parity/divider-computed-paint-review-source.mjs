import assert from 'node:assert/strict';
import path from 'node:path';
import { createOriginalRunnerReviewReader, originalRunnerReview } from './original-material-runner-review-source.mjs';
import { joinDividerComputedPaint } from '../../scripts/join-material-divider-computed-paint.mjs';

export const dividerComputedPaintReview = 'abdd4f47d8681dbdbedd24a5e954b7ad3063261150a9758dffcdce460155898a';
export function createDividerComputedPaintReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, dividerComputedPaintReview);
  const prior = createOriginalRunnerReviewReader({ root, read, reviewSha256: originalRunnerReview });
  const predecessor = JSON.parse(prior.read(`artifacts/material-parity/working-audit/proposals/${originalRunnerReview}.json`)).review;
  const result = joinDividerComputedPaint(predecessor, file => read(path.resolve(root, file)));
  assert.equal(result.sha256, dividerComputedPaintReview);
  const virtualFile = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${dividerComputedPaintReview}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: result.sha256, review: result.review }));
  return {
    read(file, options) {
      if (path.resolve(root, file) !== virtualFile) return prior.read(file, options);
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
    },
    sourceApplicability: { mode: 'exact-divider-computed-paint-successor', reviewSha256,
      cases: result.cases, addedChildren: result.addedChildren, completePredecessorRecovered: true,
      predecessorApplicability: prior.sourceApplicability,
      boundary: 'Bounded retained DOM paint observations only;all original case dispositions,remaining tasks and final gates preserve. No canonical/current rendering acceptance.' },
  };
}
