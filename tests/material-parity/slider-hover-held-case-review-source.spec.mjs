import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { restoreSliderHoverHeldBenchmark, createSliderHoverHeldReviewReader, restoreSliderHoverHeldExportSource, sliderHoverHeldReview } from './slider-hover-held-case-review-source.mjs';

test('slider hover-held selection preserves older invocations and routes only the exact successor', () => {
  const launcher = 'scripts/export-material-input-audit-current-ancestry.mjs';
  const launch = flags => spawnSync(process.execPath, [launcher, '--dry-run', ...flags], { encoding: 'utf8', windowsHide: true });
  const selected = launch(['--slider-hover-held']); assert.equal(selected.status, 0, selected.stderr);
  const invocation = JSON.parse(selected.stdout);
  assert.ok(invocation.args.includes(`--case-obligation-review-sha256=${sliderHoverHeldReview}`));
  assert.ok(invocation.args.includes(`--case-obligation-review=artifacts/material-parity/working-audit/proposals/${sliderHoverHeldReview}.json`));
  // --check and --dry-run remain mutually exclusive,as in older invocations.
  const check = launch(['--slider-hover-held', '--check']); assert.notEqual(check.status, 0);
  assert.match(check.stderr, /Usage:/);
  for (const flag of ['--static-ax', '--card-inputs', '--expansion-semantics', '--stepper-inputs', '--tabs-menu-sheet',
    '--static-semantic-inputs', '--popup-depth-inputs', '--scrollbar-paint', '--table-label-paint', '--radio-caret-paint', '--retained-focus']) {
    const older = launch([flag]); assert.equal(older.status, 0, older.stderr);
    assert.ok(!older.stdout.includes(sliderHoverHeldReview));
    const combined = launch([flag, '--slider-hover-held']); assert.notEqual(combined.status, 0);
    assert.match(combined.stderr, /Choose one case-review supplement/);
  }
  const ordinary = launch([]); assert.equal(ordinary.status, 0); assert.ok(!ordinary.stdout.includes(sliderHoverHeldReview));
  const runner = readFileSync('scripts/run-material-input-audit.mjs', 'utf8');
  const ast = ts.createSourceFile('runner.mjs', runner, 99, true), declarations = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'effectiveReaderFactory') declarations.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(declarations.length, 1);
  const choose = new Function('options', 'sliderHoverHeldReview', 'createSliderHoverHeldReviewReader', 'finalReaderFactory',
    `return ${declarations[0].initializer.getText(ast)};`);
  const older = () => {};
  assert.equal(choose({ caseObligationReviewSha256: sliderHoverHeldReview }, sliderHoverHeldReview, createSliderHoverHeldReviewReader, older), createSliderHoverHeldReviewReader);
  assert.equal(choose({ caseObligationReviewSha256: '0'.repeat(64) }, sliderHoverHeldReview, createSliderHoverHeldReviewReader, older), older);
  for (const [file, kind] of [['scripts/run-material-input-audit.mjs', 'runner'], [launcher, 'launcher']]) {
    const source = readFileSync(file, 'utf8');
    assert.ok(restoreSliderHoverHeldExportSource(source, kind).length > 0);
    assert.throws(() => restoreSliderHoverHeldExportSource(source + '\n// unreviewed drift\n', kind));
  }
});

test('slider hover-held source boundary recovers the complete prior benchmark and rejects drift', () => {
  const current = readFileSync('tests/material-parity/benchmark-config.spec.mjs');
  const prior = restoreSliderHoverHeldBenchmark(current);
  assert.equal(createHash('sha256').update(prior).digest('hex'),
    '31f2cb8ec0aa6299e4854d07b70f8031e0e646a2a39812841e984e5a7098ab57');
  assert.throws(() => restoreSliderHoverHeldBenchmark(Buffer.concat([current, Buffer.from('\n// unreviewed drift\n')])));
  assert.throws(() => restoreSliderHoverHeldBenchmark(prior));
  assert.throws(() => createSliderHoverHeldReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: '0'.repeat(64) }));
});
