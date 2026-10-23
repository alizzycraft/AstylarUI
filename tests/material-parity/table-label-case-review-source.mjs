import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createPopupDepthReviewReader, scrollbarPaintInputsReview } from './popup-depth-case-review-source.mjs';

export const tableLabelPaintReview = '075fa58b82b7cf4f04d7496cefaec3e444b7136fed154e255ac192addea36c7a';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Exact pending successor only. Preserve the accepted reader and original
// receipt bytes; adopting evidence does not accept current rendering.
export function createTableLabelReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, tableLabelPaintReview, 'Unknown table label review');
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${reviewSha256}.json`);
  const envelope = JSON.parse(read(file));
  assert.equal(envelope.sha256, reviewSha256);
  assert.equal(hash(JSON.stringify(envelope.review)), reviewSha256);
  const cases = new Set();
  for (const group of envelope.review.groups) {
    const paint = group.obligations.localPaint;
    const child = paint?.retainedTableLabelPaint;
    if (!child) continue;
    assert.equal(group.family, 'table');
    assert.match(group.case, /^interaction:table@(light|dark|contrast|custom)\/desktop-dpr[12]\/(focus|hover|held|activate|activate-leave)$/);
    assert.equal(group.inspection, 'partial');
    assert.equal(group.currentRendering, 'unverified');
    assert.equal(paint.disposition, 'partial');
    assert.equal(child.observation.case, group.case);
    assert.equal(child.observation.acceptance, false);
    assert.equal(child.existingFindingId, 'fixture-table-font-increased-during-renderer-fix');
    assert.equal(child.classification, 'application-plugin-authoring-defect');
    assert.equal(child.standardPhase.length, 3);
    assert.equal(child.remaining.length, 2);
    assert.ok(!cases.has(group.case)); cases.add(group.case);
    delete paint.retainedTableLabelPaint;
    paint.disposition = 'evidence-join-pending';
  }
  assert.equal(cases.size, 40);
  assert.equal(hash(JSON.stringify(envelope.review)), scrollbarPaintInputsReview,
    'Complete accepted scrollbar predecessor and remaining work must conserve');
  const verifier = 'tests/material-parity/table-retained-label-paint.spec.mjs';
  const verifierSha256 = '9d366b8d45849c8e754be27cf7bfb3fab33013746af5ab1f1b0e041f9467f62f';
  assert.equal(hash(read(path.resolve(root, verifier))), verifierSha256);
  const base = createPopupDepthReviewReader({ root, read, reviewSha256: scrollbarPaintInputsReview });
  return {
    read: base.read,
    sourceApplicability: {
      mode: 'exact-table-label-paint-successor-historical-dependency', reviewSha256,
      predecessorReview: scrollbarPaintInputsReview, completePredecessorRecovered: true,
      addedChildren: cases.size,
      source: { file: verifier, sha256: verifierSha256 },
      predecessorApplicability: base.sourceApplicability,
      boundary: 'Forty retained label-strip children and only their pending-to-partial paint dispositions. No prior case,remaining work,source receipt or rendering acceptance changed.',
    },
  };
}
