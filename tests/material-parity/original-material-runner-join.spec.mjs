import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import path from 'node:path';
import { joinOriginalRunnerSource, restoreMissingOriginalRunner, originalRunnerPredecessor } from '../../scripts/join-material-original-runner-source.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createSliderStateInputReviewReader } from './slider-state-input-review-source.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(`artifacts/material-parity/working-audit/proposals/${originalRunnerPredecessor}.json`);
assert.equal(hash(bytes), 'ed7ecfea82fef0406fc9e0430a2df16a7db4555d2fdd074568c96cb5f3b39868');
const predecessor = JSON.parse(bytes).review;
test('original runner recovery reconciles only 9016 source conditions and conserves complete predecessor', () => {
  const result = joinOriginalRunnerSource(predecessor);
  assert.equal(result.records, 9016); assert.equal(result.cases, 2311);
  assert.equal(result.sha256, '7dfee06dc72de1cc4a7d94f1d10594ec0b7d703a7a151e35ae803eadadc51385');
  assert.equal(hash(JSON.stringify(restoreMissingOriginalRunner(result.review))), originalRunnerPredecessor);
  assert.deepEqual(result.review.groups.map(g => [g.case, g.inspection, g.currentRendering]),
    predecessor.groups.map(g => [g.case, g.inspection, g.currentRendering]));
  assert.ok(result.review.groups.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
});
test('corrupt encoded original source cannot reconcile a valid predecessor or mutate its statuses', () => {
  assert.throws(() => joinOriginalRunnerSource(predecessor, file => file.endsWith('material-original-runner-e01.mjs.gz.b64')
    ? Buffer.from('not-the-original-source') : readFileSync(file)));
  assert.equal(hash(JSON.stringify(predecessor)), originalRunnerPredecessor);
});

test('original source successor validates through the existing complete case/dependency reader without a duplicate proposal', () => {
  const root = process.cwd();
  const prior = createSliderStateInputReviewReader({ root, read: readFileSync, reviewSha256: originalRunnerPredecessor });
  const result = joinOriginalRunnerSource(predecessor);
  const reviewFile = `artifacts/material-parity/working-audit/proposals/${result.sha256}.json`;
  assert.equal(path.isAbsolute(reviewFile), false);
  const virtualFile = path.resolve(root, reviewFile);
  const virtualBytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: result.sha256, review: result.review }));
  const read = (file, options) => {
    if (path.resolve(file) !== virtualFile) return prior.read(file, options);
    return options ? virtualBytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : virtualBytes;
  };
  const loaded = loadCaseObligationReview(reviewFile, result.sha256, predecessor.groups.map(g => g.case), { root, read });
  assert.equal(loaded.cases.length, 2311); assert.equal(loaded.evidenceFingerprints.length, 17555);
  assert.ok(loaded.cases.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
});
