import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { restoreRadioCaretExportSource } from './static-semantic-registration.mjs';
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

test('Radio caret selection preserves old launcher and runner bytes and rejects combined supplements', () => {
  const launch = args => spawnSync(process.execPath,
    ['scripts/export-material-input-audit-current-ancestry.mjs', '--dry-run', ...args],
    { encoding: 'utf8', windowsHide: true });
  const selected = launch(['--radio-caret-paint']);
  assert.equal(selected.status, 0, selected.stderr);
  const invocation = JSON.parse(selected.stdout);
  assert.ok(invocation.args.includes(`--case-obligation-review-sha256=${radioCaretPaintReview}`));
  assert.ok(invocation.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${radioCaretPaintReview}.json`));
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet',
    '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint']) {
    const old = launch([flag]); assert.equal(old.status, 0, old.stderr);
    assert.ok(!old.stdout.includes(radioCaretPaintReview));
    const combined = launch([flag, '--radio-caret-paint']);
    assert.notEqual(combined.status, 0);
    assert.match(combined.stderr, /Choose one case-review supplement/);
  }
  const defaultSelection = launch([]); assert.equal(defaultSelection.status, 0);
  assert.ok(!defaultSelection.stdout.includes(radioCaretPaintReview));
  const runner = readFileSync('scripts/run-material-input-audit.mjs', 'utf8');
  const ast = ts.createSourceFile('runner.mjs', runner, 99, true), declarations = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'selectedReaderFactory') declarations.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(declarations.length, 1);
  const select = new Function('options', 'radioCaretPaintReview', 'createRadioCaretReviewReader', 'readerFactory',
    `return ${declarations[0].initializer.getText(ast)};`);
  const priorFactory = () => {};
  assert.equal(select({caseObligationReviewSha256:radioCaretPaintReview},radioCaretPaintReview,createRadioCaretReviewReader,priorFactory),createRadioCaretReviewReader);
  assert.equal(select({caseObligationReviewSha256:'0'.repeat(64)},radioCaretPaintReview,createRadioCaretReviewReader,priorFactory),priorFactory);
  for (const [file, kind] of [['scripts/run-material-input-audit.mjs', 'runner'],
    ['scripts/export-material-input-audit-current-ancestry.mjs', 'launcher']]) {
    const source = readFileSync(file, 'utf8');
    restoreRadioCaretExportSource(source, kind);
    assert.throws(() => restoreRadioCaretExportSource(source + '\n// unreviewed drift\n', kind));
  }
});
