import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { originalRunnerReview } from './original-material-runner-review-source.mjs';
import { createDividerComputedPaintReviewReader, dividerComputedPaintReview } from './divider-computed-paint-review-source.mjs';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { restoreOriginalRunnerExportSource } from './pending-evidence-registration.mjs';
import { joinDividerComputedPaint, restoreDividerComputedPaint } from '../../scripts/join-material-divider-computed-paint.mjs';
import { loadCaseObligationReview } from '../../scripts/audit-findings-store.mjs';

test('Divider computed paint adds only bounded evidence and preserves complete predecessor and all case statuses', () => {
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const launch = flags => spawnSync(process.execPath, [launcher, '--dry-run', ...flags], { encoding: 'utf8', windowsHide: true });
  const selected = launch(['--divider-computed-paint']); assert.equal(selected.status, 0, selected.stderr);
  const args = JSON.parse(selected.stdout).args;
  assert.ok(args.includes(`--case-obligation-review-sha256=${dividerComputedPaintReview}`));
  assert.ok(args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${dividerComputedPaintReview}.json`));
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet',
    '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint',
    '--retained-focus', '--slider-hover-held', '--slider-state-inputs', '--original-runner-recovery']) {
    const older = launch([flag]); assert.equal(older.status, 0, older.stderr); assert.ok(!older.stdout.includes(dividerComputedPaintReview));
    const conflict = launch([flag, '--divider-computed-paint']); assert.notEqual(conflict.status, 0); assert.match(conflict.stderr, /Choose one case-review supplement/);
  }
  const ordinary = launch([]); assert.equal(ordinary.status, 0, ordinary.stderr); assert.ok(!ordinary.stdout.includes(dividerComputedPaintReview));
  for (const [file, kind] of [['scripts/run-material-input-audit.mjs', 'runner'], [launcher, 'launcher']]) {
    restoreOriginalRunnerExportSource(readFileSync(file), kind);
    assert.throws(() => restoreOriginalRunnerExportSource(Buffer.concat([readFileSync(file), Buffer.from('\n// drift')]), kind));
  }
  const source = readFileSync('scripts/run-material-input-audit.mjs', 'utf8'), ast = ts.createSourceFile('runner.mjs', source, 99, true), owners = [];
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'paintReaderFactory') owners.push(node); ts.forEachChild(node, visit); };
  visit(ast); assert.equal(owners.length, 1);
  const choose = new Function('options', 'dividerComputedPaintReview', 'createDividerComputedPaintReviewReader', 'recoveredReaderFactory', `return ${owners[0].initializer.getText(ast)};`);
  const old = () => {};
  assert.equal(choose({ caseObligationReviewSha256: dividerComputedPaintReview }, dividerComputedPaintReview, createDividerComputedPaintReviewReader, old), createDividerComputedPaintReviewReader);
  assert.equal(choose({ caseObligationReviewSha256: '0'.repeat(64) }, dividerComputedPaintReview, createDividerComputedPaintReviewReader, old), old);
  const root = process.cwd(), prior = createDividerComputedPaintReviewReader({ root, read: readFileSync, reviewSha256: dividerComputedPaintReview });
  const predecessor = JSON.parse(prior.read(`artifacts/material-parity/working-audit/proposals/${originalRunnerReview}.json`)).review;
  const result = joinDividerComputedPaint(predecessor);
  assert.equal(result.sha256, dividerComputedPaintReview);
  assert.equal(result.cases, 24); assert.equal(result.addedChildren, 48);
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(restoreDividerComputedPaint(result.review)), originalRunnerReview);
  assert.deepEqual(result.review.groups.map(group => [group.case, group.inspection, group.currentRendering]),
    predecessor.groups.map(group => [group.case, group.inspection, group.currentRendering]));
  assert.ok(result.review.groups.every(group => group.inspection === 'partial' && group.currentRendering === 'unverified'));
  assert.throws(() => joinDividerComputedPaint(predecessor, file => file.endsWith('divider-computed-paint-context-20261024.log') ? Buffer.from('forged capture') : readFileSync(file)));
  const file = `artifacts/material-parity/working-audit/proposals/${result.sha256}.json`;
  const loaded = loadCaseObligationReview(file, result.sha256, predecessor.groups.map(group => group.case), { root, read: prior.read });
  assert.equal(loaded.cases.length, 2311); assert.equal(loaded.evidenceFingerprints.length, 17562);
  assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
  console.log(JSON.stringify({ successor: result.sha256, cases: result.cases, addedChildren: result.addedChildren,
    completeCases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length, saved: false, canonicalPublished: false }));
});
