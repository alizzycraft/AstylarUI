import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createTableLabelReviewReader, tableLabelPaintReview } from './table-label-case-review-source.mjs';

test('table label successor reader preserves accepted cases and authenticates all evidence without promotion', () => {
  const root = process.cwd(), read = fs.readFileSync;
  const pointer = read('artifacts/material-parity/working-audit/current.json');
  assert.throws(() => createTableLabelReviewReader({ root, read, reviewSha256: '0'.repeat(64) }));
  const file = `artifacts/material-parity/working-audit/proposals/${tableLabelPaintReview}.json`;
  const review = JSON.parse(read(file)).review;
  const reader = createTableLabelReviewReader({ root, read, reviewSha256: tableLabelPaintReview });
  assert.equal(reader.sourceApplicability.completePredecessorRecovered, true);
  assert.equal(reader.sourceApplicability.addedChildren, 40);
  const loaded = loadCaseObligationReview(file, tableLabelPaintReview, review.groups.map(g => g.case), { read: reader.read });
  assert.equal(loaded.cases.length, 2311);
  assert.equal(loaded.evidenceFingerprints.length, 16347);
  assert.deepEqual(loaded.unjoinedCases, []);
  assert.equal(loaded.inspectionComplete, false);
  assert.equal(loaded.currentRenderingAccepted, false);
  assert.ok(loaded.cases.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  assert.equal(loaded.cases.filter(g => g.obligations.localPaint?.retainedTableLabelPaint).length, 40);
  const wrong = (file, encoding) => {
    const bytes = read(file);
    const result = String(file).endsWith('table-retained-label-paint.spec.mjs')
      ? Buffer.concat([bytes, Buffer.from('\n// drift')]) : bytes;
    return encoding ? result.toString(encoding) : result;
  };
  assert.throws(() => createTableLabelReviewReader({ root, read: wrong, reviewSha256: tableLabelPaintReview }));
  assert.deepEqual(read('artifacts/material-parity/working-audit/current.json'), pointer);
  console.log(JSON.stringify({ proof: 'table-label-successor-reader', cases: 2311, dependencies: 16347,
    addedChildren: 40, completePredecessorRecovered: true, selectedForExport: false,
    canonicalPublication: false, currentRenderingAccepted: false }));
});
