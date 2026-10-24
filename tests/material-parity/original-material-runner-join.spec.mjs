import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { restoreOriginalRunnerExportSource } from './pending-evidence-registration.mjs';
import { joinOriginalRunnerSource, restoreMissingOriginalRunner, originalRunnerPredecessor } from '../../scripts/join-material-original-runner-source.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';
import { createOriginalRunnerReviewReader, originalRunnerReview } from './original-material-runner-review-source.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(`artifacts/material-parity/working-audit/proposals/${originalRunnerPredecessor}.json`);
assert.equal(hash(bytes), 'ed7ecfea82fef0406fc9e0430a2df16a7db4555d2fdd074568c96cb5f3b39868');
const predecessor = JSON.parse(bytes).review;
test('original runner recovery reconciles only 9016 source conditions and conserves complete predecessor', () => {
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const launch = flags => spawnSync(process.execPath, [launcher, '--dry-run', ...flags], { encoding: 'utf8', windowsHide: true });
  const selected = launch(['--original-runner-recovery']);
  assert.equal(selected.status, 0, selected.stderr);
  const args = JSON.parse(selected.stdout).args;
  assert.ok(args.includes(`--case-obligation-review-sha256=${originalRunnerReview}`));
  assert.ok(args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${originalRunnerReview}.json`));
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet',
    '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint',
    '--retained-focus', '--slider-hover-held', '--slider-state-inputs']) {
    const older = launch([flag]); assert.equal(older.status, 0, older.stderr);
    assert.ok(!older.stdout.includes(originalRunnerReview));
    const conflict = launch([flag, '--original-runner-recovery']); assert.notEqual(conflict.status, 0);
    assert.match(conflict.stderr, /Choose one case-review supplement/);
  }
  assert.equal(launch([]).status, 0);
  for (const [file, kind] of [['scripts/run-material-input-audit.mjs', 'runner'], [launcher, 'launcher']]) {
    const source = readFileSync(file);
    restoreOriginalRunnerExportSource(source, kind);
    assert.throws(() => restoreOriginalRunnerExportSource(Buffer.concat([source, Buffer.from('\n// drift')]), kind));
  }
  const source = readFileSync('scripts/run-material-input-audit.mjs', 'utf8');
  const ast = ts.createSourceFile('runner.mjs', source, 99, true), owners = [];
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'recoveredReaderFactory') owners.push(node); ts.forEachChild(node, visit); };
  visit(ast); assert.equal(owners.length, 1);
  const choose = new Function('options', 'originalRunnerReview', 'createOriginalRunnerReviewReader', 'currentReaderFactory', `return ${owners[0].initializer.getText(ast)};`);
  const old = () => {};
  assert.equal(choose({ caseObligationReviewSha256: originalRunnerReview }, originalRunnerReview, createOriginalRunnerReviewReader, old), createOriginalRunnerReviewReader);
  assert.equal(choose({ caseObligationReviewSha256: '0'.repeat(64) }, originalRunnerReview, createOriginalRunnerReviewReader, old), old);
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
  const reader = createOriginalRunnerReviewReader({ root, read: readFileSync, reviewSha256: originalRunnerReview });
  const reviewFile = `artifacts/material-parity/working-audit/proposals/${originalRunnerReview}.json`;
  assert.equal(path.isAbsolute(reviewFile), false);
  assert.ok(Buffer.isBuffer(reader.read(reviewFile, {})));
  assert.ok(Buffer.isBuffer(reader.read(reviewFile, { encoding: null })));
  const loaded = loadCaseObligationReview(reviewFile, originalRunnerReview, predecessor.groups.map(g => g.case), { root, read: reader.read });
  assert.equal(loaded.cases.length, 2311); assert.equal(loaded.evidenceFingerprints.length, 17555);
  assert.ok(loaded.cases.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  assert.equal(reader.sourceApplicability.sourceConditionsReconciled, 9016);
  assert.throws(() => createOriginalRunnerReviewReader({ root, read: readFileSync, reviewSha256: '0'.repeat(64) }));
});
