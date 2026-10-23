import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createRadioCaretReviewReader, radioCaretPaintReview } from './radio-caret-case-review-source.mjs';

test('Radio caret reader conserves complete predecessors and authenticates partial evidence', () => {
  const root = process.cwd();
  const file = `artifacts/material-parity/working-audit/proposals/${radioCaretPaintReview}.json`;
  const envelope = JSON.parse(readFileSync(file));
  const reader = createRadioCaretReviewReader({ root, read: readFileSync, reviewSha256: radioCaretPaintReview });
  assert.equal(reader.sourceApplicability.completePredecessorsRecovered, true);
  const review = loadCaseObligationReview(file, radioCaretPaintReview, envelope.review.groups.map(g => g.case),
    { root, read: reader.read });
  assert.equal(review.cases.length, 2311);
  assert.equal(review.evidenceFingerprints.length, 17481);
  assert.equal(review.inspectionComplete, false);
  assert.equal(review.currentRenderingAccepted, false);
  assert.ok(review.cases.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  assert.throws(() => createRadioCaretReviewReader({ root, read: readFileSync, reviewSha256: '0'.repeat(64) }));
  const altered = structuredClone(envelope);
  altered.review.groups.find(g => g.obligations.localPaint.retainedConfiguredCaretTemporalPaint)
    .obligations.localPaint.retainedConfiguredCaretTemporalPaint.acceptance = true;
  assert.throws(() => createRadioCaretReviewReader({ root, reviewSha256: radioCaretPaintReview,
    read: name => path.resolve(name) === path.resolve(file) ? Buffer.from(JSON.stringify(altered)) : readFileSync(name) }));
});
