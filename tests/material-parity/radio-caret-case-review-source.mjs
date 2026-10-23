import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createTableLabelReviewReader, tableLabelPaintReview } from './table-label-case-review-source.mjs';

export const radioCaretPaintReview = '6889b546f95572c1df93b4c598634b3ad3565553bc69a99ff2a9e1c6b791590c';
const radioReview = '00deb2bd42bed77e96afd0d22234456450044792b0faa84a5660d7dd4045a826';
const hash = value => createHash('sha256').update(value).digest('hex');

// This adapter adds no replacement source bytes: it proves complete predecessor
// recovery before delegating historical receipts to the existing Table reader.
export function createRadioCaretReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, radioCaretPaintReview, 'Unknown Radio/caret review');
  const load = digest => {
    const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${digest}.json`);
    const envelope = JSON.parse(read(file));
    assert.equal(envelope.sha256, digest);
    assert.equal(hash(JSON.stringify(envelope.review)), digest);
    return envelope.review;
  };
  const current = load(reviewSha256), radio = load(radioReview);
  const originalCases = new Map(radio.groups.map(group => [group.case, group]));
  let caretChildren = 0, caretDispositions = 0;
  for (const group of current.groups) {
    const paint = group.obligations.localPaint;
    const child = paint?.retainedConfiguredCaretTemporalPaint;
    if (!child) continue;
    assert.match(group.case, /^interaction:(form-field|input|autocomplete|datepicker|timepicker)@(light|dark|contrast|custom)\/desktop-dpr[12]\/focus$/);
    assert.equal(group.inspection, 'partial');
    assert.equal(group.currentRendering, 'unverified');
    assert.equal(child.case, group.case);
    assert.equal(child.acceptance, false);
    assert.equal(child.disposition, 'recorded-provenance-incomplete');
    assert.equal(child.observations.length, 6);
    assert.deepEqual(child.observations.map(row => row.sample), [0, 1, 2, 3, 4, 5]);
    assert.equal(child.remaining.length, 2);
    assert.match(child.provenanceBoundary, /unavailable/);
    const before = originalCases.get(group.case).obligations.localPaint.disposition;
    assert.equal(paint.disposition, 'partial');
    if (before === 'evidence-join-pending') caretDispositions++;
    delete paint.retainedConfiguredCaretTemporalPaint;
    paint.disposition = before;
    caretChildren++;
  }
  assert.equal(caretChildren, 40);
  assert.equal(caretDispositions, 16);
  assert.equal(hash(JSON.stringify(current)), radioReview, 'Complete Radio predecessor must conserve');
  let regions = 0, gaps = 0;
  for (const group of current.groups) {
    const paint = group.obligations.localPaint;
    if (paint?.retainedRadioLabelRegionPaint) {
      assert.equal(group.family, 'radio');
      assert.ok(group.case.startsWith('interaction:radio@'));
      assert.equal(paint.disposition, 'partial');
      assert.equal(group.inspection, 'partial');
      assert.equal(group.currentRendering, 'unverified');
      delete paint.retainedRadioLabelRegionPaint;
      paint.disposition = 'evidence-join-pending';
      regions++;
    }
    if (paint?.retainedRadioLabelBoundsGap) {
      assert.equal(group.family, 'radio');
      assert.ok(group.case.startsWith('static:radio@'));
      assert.equal(paint.disposition, 'evidence-join-pending');
      delete paint.retainedRadioLabelBoundsGap;
      gaps++;
    }
  }
  assert.equal(regions, 56);
  assert.equal(gaps, 12);
  assert.equal(hash(JSON.stringify(current)), tableLabelPaintReview, 'Complete Table predecessor must conserve');
  const base = createTableLabelReviewReader({ root, read, reviewSha256: tableLabelPaintReview });
  return { read: base.read, sourceApplicability: {
    mode: 'exact-radio-caret-successor-historical-dependency', reviewSha256,
    predecessorReviews: [radioReview, tableLabelPaintReview], completePredecessorsRecovered: true,
    caretChildren, caretDispositions, radioRegions: regions, radioStaticBoundsGaps: gaps,
    predecessorApplicability: base.sourceApplicability,
    boundary: 'Recorded original Radio regions and provenance-incomplete caret observations only; no source receipt replacement,current rendering acceptance or case closure.',
  } };
}
