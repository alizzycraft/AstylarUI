import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { joinSliderStateInputs, sliderStatePredecessor } from '../../scripts/join-material-slider-state-inputs.mjs';
import { createSliderHoverHeldReviewReader } from './slider-hover-held-case-review-source.mjs';

export const sliderStateInputReview = 'c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function createSliderStateInputReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, sliderStateInputReview);
  const envelope = JSON.parse(read(path.resolve(root,
    `artifacts/material-parity/working-audit/proposals/${reviewSha256}.json`)));
  assert.equal(envelope.status, 'proposal-not-canonical');
  assert.equal(envelope.sha256, reviewSha256);
  assert.equal(hash(JSON.stringify(envelope.review)), reviewSha256);
  const predecessor = JSON.parse(read(path.resolve(root,
    `artifacts/material-parity/working-audit/proposals/${sliderStatePredecessor}.json`)));
  assert.equal(predecessor.sha256, sliderStatePredecessor);
  const expected = joinSliderStateInputs(predecessor.review, (file, ...options) => read(path.resolve(root, file), ...options));
  assert.equal(hash(JSON.stringify(expected)), reviewSha256,
    'Whole successor must equal the authenticated bounded join,not merely its counts');
  const prior = createSliderHoverHeldReviewReader({ root, read, reviewSha256: sliderStatePredecessor });
  return { read: prior.read, sourceApplicability: {
    mode: 'exact-slider-state-input-successor', reviewSha256, cases: 16, children: 52,
    completePredecessorRecovered: true, predecessorApplicability: prior.sourceApplicability,
    boundary: 'Only scoped input,pointer/hover ownership,historical material and four light interior records. No whole-case,current rendering,programmatic/keyboard focus or equal-input paint acceptance.',
  } };
}
