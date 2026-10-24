import assert from 'node:assert/strict';
import path from 'node:path';
import { createDividerOwnerFrameReviewReader, dividerOwnerFrameReview } from './divider-owner-frame-review-source.mjs';
import { joinMenuCompositeEvidence } from '../../scripts/join-material-menu-composite-evidence.mjs';
import { joinMenuAXEvidence } from '../../scripts/join-material-menu-ax-evidence.mjs';
import { joinMenuSemanticBoundaries } from '../../scripts/join-material-menu-semantic-boundaries.mjs';
import { joinSelectReadonlyEvidence } from '../../scripts/join-material-select-readonly-evidence.mjs';
import { joinDisabledControlEvidence } from '../../scripts/join-material-disabled-control-evidence.mjs';
import { createMenuHistoricalRead } from './menu-select-disabled-registration.mjs';

export const menuSelectDisabledReview = 'd00beaa884a5639f4294c5b81f4c49e1ec0c9cd1072fc77d4f7041fc6ff9bd3d';
export function createMenuSelectDisabledReviewReader({ root, read, reviewSha256, ownerFrameReader }) {
  assert.equal(reviewSha256, menuSelectDisabledReview);
  const historicalRead = createMenuHistoricalRead({ root, read });
  const prior = ownerFrameReader ?? createDividerOwnerFrameReviewReader({ root, read: historicalRead, reviewSha256: dividerOwnerFrameReview });
  const predecessor = JSON.parse(prior.read(`artifacts/material-parity/working-audit/proposals/${dividerOwnerFrameReview}.json`)).review;
  const readLocal = file => historicalRead(path.resolve(root, file));
  const composite = joinMenuCompositeEvidence(predecessor, readLocal);
  const ax = joinMenuAXEvidence(composite.review, readLocal);
  const semantic = joinMenuSemanticBoundaries(ax.review, readLocal);
  const readonly = joinSelectReadonlyEvidence(semantic.review, readLocal);
  const disabled = joinDisabledControlEvidence(readonly.review, readLocal);
  assert.equal(disabled.sha256, menuSelectDisabledReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${menuSelectDisabledReview}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: disabled.sha256, review: disabled.review }));
  return {
    read(name, options) {
      if (path.resolve(root, name) !== file) return prior.read(name, options);
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
    },
    sourceApplicability: { mode: 'exact-pending-menu-select-disabled-successor', reviewSha256,
      addedChildren: composite.addedChildren + ax.addedChildren + semantic.addedChildren + readonly.addedChildren + disabled.addedChildren,
      predecessorApplicability: prior.sourceApplicability,
      boundary: 'Pending retained observations only;no canonical publication,current rendering,whole-case closure or changed acceptance criteria. Every predecessor status and remaining task preserves.' },
  };
}
