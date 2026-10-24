import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createSliderStateInputReviewReader, sliderStateInputReview } from './slider-state-input-review-source.mjs';

test('Slider state-input successor authenticates the whole review and every evidence dependency', () => {
  const root = process.cwd(), read = readFileSync;
  const file = `artifacts/material-parity/working-audit/proposals/${sliderStateInputReview}.json`;
  const envelope = JSON.parse(read(file));
  const reader = createSliderStateInputReviewReader({ root, read, reviewSha256: sliderStateInputReview });
  const loaded = loadCaseObligationReview(file, sliderStateInputReview,
    envelope.review.groups.map(group => group.case), { root, read: reader.read });
  assert.equal(loaded.cases.length, 2311);
  assert.equal(loaded.evidenceFingerprints.length, 17552);
  assert.equal(reader.sourceApplicability.children, 52);
  assert.ok(loaded.cases.every(group => group.inspection === 'partial' && group.currentRendering === 'unverified'));
  assert.throws(() => createSliderStateInputReviewReader({ root, read, reviewSha256: '0'.repeat(64) }));
  assert.throws(() => createSliderStateInputReviewReader({ root, reviewSha256: sliderStateInputReview,
    read: (file, ...options) => file.endsWith('slider-retained-state-layer.spec.mjs')
      ? Buffer.from('unreviewed source drift') : read(file, ...options) }));
});
