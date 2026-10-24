import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { createOriginalRunnerReviewReader, originalRunnerReview } from './original-material-runner-review-source.mjs';
import { joinDividerComputedPaint, restoreDividerComputedPaint } from '../../scripts/join-material-divider-computed-paint.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';

test('Divider computed paint adds only bounded evidence and preserves complete predecessor and all case statuses', () => {
  const root = process.cwd(), prior = createOriginalRunnerReviewReader({ root, read: readFileSync, reviewSha256: originalRunnerReview });
  const predecessor = JSON.parse(prior.read(`artifacts/material-parity/working-audit/proposals/${originalRunnerReview}.json`)).review;
  const result = joinDividerComputedPaint(predecessor);
  assert.equal(result.cases, 24); assert.equal(result.addedChildren, 48);
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(restoreDividerComputedPaint(result.review)), originalRunnerReview);
  assert.deepEqual(result.review.groups.map(group => [group.case, group.inspection, group.currentRendering]),
    predecessor.groups.map(group => [group.case, group.inspection, group.currentRendering]));
  assert.ok(result.review.groups.every(group => group.inspection === 'partial' && group.currentRendering === 'unverified'));
  assert.throws(() => joinDividerComputedPaint(predecessor, file => file.endsWith('divider-computed-paint-context-20261024.log') ? Buffer.from('forged capture') : readFileSync(file)));
  const file = `artifacts/material-parity/working-audit/proposals/${result.sha256}.json`, absolute = path.resolve(root, file);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: result.sha256, review: result.review }));
  const read = (name, options) => {
    if (path.resolve(root, name) !== absolute) return prior.read(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  };
  const loaded = loadCaseObligationReview(file, result.sha256, predecessor.groups.map(group => group.case), { root, read });
  assert.equal(loaded.cases.length, 2311); assert.ok(loaded.evidenceFingerprints.length > 17555);
  assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
  console.log(JSON.stringify({ successor: result.sha256, cases: result.cases, addedChildren: result.addedChildren,
    completeCases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length, saved: false, canonicalPublished: false }));
});
